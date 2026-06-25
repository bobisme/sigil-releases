---
title: The .wic Handoff — Sigil to Wraith
description: Author an intent contract in Sigil, package it as a signed .wic, and verify it provider-side with wraith — the full round trip.
---

Sigil and [wraith](https://wraith.cx) split a consumer/provider workflow across two tools. A **consumer** writes intent-contract scenarios in Sigil's Lua DSL; wraith packages those scenarios into a signed, digest-pinned `.wic` bundle; the **provider** verifies that `.wic` before trusting it and runs it against their service. This page walks the loop end to end: **author in Sigil → package as `.wic` → provider verifies with wraith.**

:::note[Two repos, one loop]
Authoring and running scenarios is Sigil. Packaging (`.wic`) and provider-side verification are wraith. Sigil has no `.wic` packaging command — that is wraith's job. The shared seam is the `lib/wraith.lua` helper and the `wraith` capability.
:::

## What a `.wic` is

A `.wic` is an **intent-contract bundle**: a zstd-compressed tar archive carrying everything a provider needs to verify a consumer's expectations against their service. Its canonical layout:

```
contract-manifest.json          # canonical-JSON manifest (the signature target)
scenarios/<name>.lua            # one or more contract scenarios
scenarios/lib/wraith.lua        # the canonical helper (digest-pinned in the manifest)
scenarios/lib/wraith_data.lua   # optional: evidence data module (excerpt/recording modes)
evidence/...                    # optional: evidence files (excerpt/recording modes)
```

### How it is digest-pinned

Every packaged file gets a **SHA-256** content digest. The leaves are sorted by path and folded into a single `tree_digest` over the canonical `path\0digest\n` encoding. The manifest records this tree, and when the package is signed, the Ed25519 signature covers `manifest ‖ tree_digest`. Three independent pins protect the bundle:

- **Tree digest** — a single tampered byte anywhere fails verification, naming the offending path.
- **Helper pin** — `scenarios/lib/wraith.lua` must digest-equal the wraith-generated canonical helper for the manifest's `wraith_helper_api` major. A custom or modified helper is rejected.
- **Artifact pins** — the manifest pins its `base` and `overlay` twin artifacts by `name@sha256:<hex>`, so the provider verifies against exactly the twin the contract was generated for.

## 1. Author the contract in Sigil

Contract scenarios are ordinary Sigil scenarios (see [Writing Scenarios](/guides/writing-scenarios/)), with one addition: they use the shared `lib/wraith.lua` helper and declare the `wraith` capability.

```lua
-- scenarios/checkout/refund.lua
return {
  title    = "Refund a captured payment",
  priority = "P0",
  policy   = { capabilities = { "http", "wraith" } },  -- must declare "wraith"

  run = function()
    local wraith = require("lib.wraith")               -- the session/auth helper

    local res = wraith.post("/api/refunds", {
      payment_id = "pay_123",
      amount     = 500,
    })

    expect(res.status == 200)
    expect(res.json.id:match("^re_"))
  end,
}
```

### The `lib/wraith.lua` helper and the `wraith` capability

`lib/wraith.lua` is the canonical helper wraith ships and pins into every `.wic`. It provides session-isolated, auth-aware HTTP wrappers and evidence accessors — `wraith.get/post/put/patch/delete`, `wraith.session_id()`, `wraith.unique(tag)`, `wraith.assert_matches(...)`, and (in evidence modes) `wraith.exchange(name)` / `wraith.replay(...)`.

Because providers review the declared capability surface at accept time, importing the helper without declaring it defeats that review. Sigil enforces this statically:

- `require('lib.wraith')` without `"wraith"` in `policy.capabilities` is lint error **E006**.
- `wraith` is a recognized capability (so it does not trip the unknown-capability error, E005).

Lint contract scenarios in place — no `.sigil/` project layout required:

```sh
sigil scenario lint-path scenarios/checkout/refund.lua
```

### Run it locally against your service

Use the vanilla runner — it needs no `.sigil/sigil.toml`, just paths and an endpoint:

```sh
sigil run scenarios/ --endpoint http://127.0.0.1:8080
```

#### Endpoint pinning

By default every `wraith.get/post/...` (and `sigil.get/post/...`) call is **pinned to the `--endpoint` origin** — scheme + host + port, with default-port normalization (`http`→80, `https`→443). A cross-origin `base_url` override, even one built at runtime by string concatenation, is a runtime error, and a 3xx whose `Location` points off the pinned origin is refused. This keeps a contract from being steered at a different host (for example the cloud metadata endpoint).

```lua
local ok  = wraith.get("/api/items")                                   -- same origin: allowed
local bad = wraith.get("/x", { base_url = "http://169.254.169.254" })  -- cross-origin: refused
```

Pass `--allow-cross-origin` to disable pinning for a first-party run. When a request is refused for crossing the pinned origin, Sigil marks the scenario with `failure_class = "pinning"` — a dedicated class so the provider side classifies it as a security gate rather than a generic crash.

## 2. Package the contract as a `.wic` (wraith)

Packaging is a wraith command. Stage the package layout (manifest at the root, scenarios under `scenarios/`, the canonical helper at `scenarios/lib/wraith.lua`), then:

```sh
# Sign with a base64 Ed25519 secret key (env var or --key <file>)
WRAITH_SIGN_KEY=$KEY_B64 wraith contract pack ./staged --output checkout-refund.wic
```

`pack` runs a PII scanner over the pre-archive tree, signs the manifest, and writes a **deterministic** archive — packing the same source with the same key yields a byte-identical `.wic`. A PII finding aborts with exit 3, naming the offending files; pass `--override-pii "<reason>"` to admit a finding knowingly (the reason is recorded in the manifest so the provider's accept gate can see it).

| `wraith contract pack` exit | Meaning |
|---|---|
| `0` | Package written |
| `1` | User error (missing source dir, missing/invalid manifest, bad key) |
| `3` | PII finding blocked the pack (no `--override-pii`) |
| `4` | I/O failure writing the package |

## 3. Verify the `.wic` provider-side (wraith)

A provider verifies in two stages: a **trust gate** over the bundle itself, then a **behavioral verify** that runs the scenarios against their service.

### Stage A — trust gate (`verify-package`)

This is the default-deny integrity gate. It runs **before any Lua executes**, so a tampered or untrusted package never reaches the runtime.

```sh
wraith contract verify-package checkout-refund.wic --trust-store ./trusted-signers
```

It checks, in order: the SHA-256 digest tree, the Ed25519 signature against your trusted keys, the helper pin, the evidence mode, and the declared capabilities (anything outside `{"http","wraith"}` needs `--allow-capability`).

| `verify-package` exit | Meaning |
|---|---|
| `0` | Package verified and admissible |
| `1` | User / compatibility error (bad input, unknown `wic_schema` / `wraith_helper_api` major — regenerate) |
| `3` | Security / integrity / policy gate (signature, digest, helper, evidence, or capability) |
| `4` | I/O failure reading the package |

### Stage B — behavioral verify (`verify`)

Once the bundle is trusted, run its scenarios. `verify` resolves the manifest's pinned `base`/`overlay` artifacts against locally-held packs (digest-checked — a mismatch fails before a server starts), composes the twin, serves it, runs the scenarios, and tears the server down.

```sh
wraith contract verify checkout-refund.wic \
  --base-pack base.wraith --overlay-pack ov.wraith
```

The exit code is the Sigil→wraith translation of the run:

| `verify` exit | Status | Meaning |
|---|---|---|
| `0` | passed | Every `expect()` held |
| `1` | no_scenarios | User / package-shape error (missing pack, malformed manifest, no scenarios matched) |
| `2` | failed | A contract `expect()` failed against target behavior |
| `3` | security_violation | Security / policy / provenance — digest mismatch, **endpoint pinning**, or lint |
| `4` | error | Runtime / tooling failure (compose, serve startup, crash, sigil missing) |

#### How `failure_class` maps to the exit code

wraith reads each scenario's `failure_class` from Sigil's JSON report and folds it into the verify exit code:

| Sigil `failure_class` | wraith exit | Status |
|---|---|---|
| (none — all passed) | `0` | passed |
| `assertion` (or unknown / absent on a failure) | `2` | failed |
| `crash` | `4` | error |
| `lint`, `security`, `policy`, `pinning`, `endpoint_pinning` | `3` | security_violation |

The `pinning` / `endpoint_pinning` class is what an endpoint-pinning refusal (above) becomes provider-side — it is treated as a security gate (exit 3), not a contract failure. Advisory `sigil.check` claims are informational and never change the exit code.

## The round trip, end to end

```sh
# ── Consumer (Sigil) ──────────────────────────────────────────────
# 1. Author scenarios/checkout/refund.lua (capabilities = {"http","wraith"})
# 2. Lint them in place
sigil scenario lint-path scenarios/checkout/refund.lua
# 3. Run locally against your own instance (origin-pinned by default)
sigil run scenarios/ --endpoint http://127.0.0.1:8080

# ── Package (wraith) ──────────────────────────────────────────────
# 4. Stage the layout, then pack into a signed, deterministic .wic
WRAITH_SIGN_KEY=$KEY_B64 wraith contract pack ./staged --output checkout-refund.wic

# ── Provider (wraith) ─────────────────────────────────────────────
# 5. Trust-gate the bundle BEFORE running any Lua (exit 3 on tamper/policy)
wraith contract verify-package checkout-refund.wic --trust-store ./trusted-signers
# 6. Run the scenarios against the pinned twin (exit reflects pass/fail)
wraith contract verify checkout-refund.wic \
  --base-pack base.wraith --overlay-pack ov.wraith
```

## Cross-references

- Wraith's provider-side documentation: see [wraith](https://wraith.cx) — `wraith contract verify-package`, `verify`, and CI integration (egress lockdown, results channel) live there.
- Sigil-side authoring: [Writing Scenarios](/guides/writing-scenarios/) for the DSL, capabilities (incl. `wraith`), and the E006 lint.
