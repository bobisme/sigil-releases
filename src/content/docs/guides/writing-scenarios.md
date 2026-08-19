---
title: Writing Scenarios
description: The Lua scenario DSL — expect, invariant, judge, intent, browser.
---

Scenarios are plain Lua files that return a table. `sigil`, `expect`, and `invariant` are pre-injected globals — do **not** `require('sigil')`, it will error.

## File layout

Scenario source lives at the project root under `scenarios/<service>/`. `.sigil/`
holds only tool state — config, blobs, ledger, proofs.

```
scenarios/<service>/
  auth/
    login.lua                     # visible
    logout.lua                    # visible
    password-reset.lua.age        # holdout — age-encrypted
  billing/
    checkout.lua
    refund.staged.lua             # generated, awaiting `sigil scenario promote`
  lib/
    auth.lua                      # shared helpers — require('lib.auth')
```

**The file extension is the source of truth for visibility.** `foo.lua` is
visible, `foo.lua.age` is an age-encrypted holdout, `foo.staged.lua` is
generated output awaiting promotion (never in an eval set, never sealed).
There are no `visible/` or `holdout/` directories, so a plaintext file sitting
in a directory that claims it is a holdout — a leaked holdout — cannot be
represented. Promoting a visible scenario to a holdout is an encrypt in place:
same path, same id, and `git log --follow` still works.

`lib/` is the only reserved directory name.

Scenario ID is derived from the path under `scenarios/<service>/` with the
extension stripped (`auth/login.lua` → `auth/login`, `auth/login.lua.age` →
`auth/login`). Never declare it in the file — and note that a scenario keeps its
id when promoted to holdout.

:::note[Upgrading from 0.26 or earlier?]
Scenarios used to live in `.sigil/scenarios/<svc>/{visible,holdout,staging}/`.
Run `sigil migrate` to convert — dry-run by default, add `--apply` to write. It
uses `git mv` so history follows each file, and verifies the scenario-id set is
identical before and after. Ids are unchanged, so ledger history stays
comparable.
:::

### Multiple roots

By default sigil looks in `scenarios/`. A monorepo can colocate scenarios with
the service they exercise by declaring roots explicitly:

```toml
[[scenarios]]
path = "scenarios"                  # holds per-service subdirectories

[[scenarios]]
path = "services/api/scenarios"     # IS the api service's scenarios
service = "api"
```

Each root resolves its own `lib/`, so `services/api/scenarios/health.lua` reads
`services/api/scenarios/lib/` — not another service's helpers.

## Minimum scenario

```lua
return {
  priority = "P0",
  run = function()
    local res = sigil.get("/health")
    expect(res.status == 200)
  end,
}
```

## Full metadata

```lua
return {
  title     = "Login with valid and invalid credentials",  -- optional human label
  priority  = "P0",                                         -- required: P0/P1/P2
  tags      = {"auth", "login"},
  endpoints = {"POST /api/login"},
  budget    = { max_seconds = 30 },
  policy    = { capabilities = {"http", "judge"} },        -- linted statically
  run       = function() ... end,
}
```

## `expect(expr)` — power assertions

`expect()` is source-rewritten before execution. It captures both sides of comparisons and every step of dotted chain accesses, then renders an Ariadne code-frame diagnostic on failure with value labels.

```lua
expect(res.status == 200)
-- on failure:
-- expected res.status == 200
--          |          |   |
--          |          |   200
--          |          false
--          404
```

## `sigil.check(expr, label)` — advisory checks

`sigil.check` is the **nonfatal** counterpart to `expect`: the outcome is recorded but never fails the scenario or changes the exit code. Use it for soft signals and contract claims where you want to observe drift without blocking. The expression is evaluated defensively, so a check against a field that no longer exists records an evaluation error and the scenario keeps running.

```lua
sigil.check(res.status == 200, "status ok")
--- The payment id keeps the documented prefix.
sigil.check(res.json.id:match("^pay_"), "payment id shape")
```

Each check appears in the per-scenario `checks[]` array of `sigil run --json` as `{label, passed, severity, source, description, failure_kind, message}` — `description` is the lifted `---` comment above the call. A `---` block above an `expect` is lifted the same way (into `expects[]`). Check outcomes never affect `status` or `failure_class`; derive pass/fail from those, not from a check's `passed` flag.

## `invariant(name, opts)` — property testing

```lua
invariant("email normalization is idempotent", {
  cases = 100,
  for_all = { email = sigil.gen.email() },
  check = function(case)
    local a = sigil.post("/api/normalize", { email = case.email })
    local b = sigil.post("/api/normalize", { email = a.json.normalized })
    expect(a.json.normalized == b.json.normalized)
  end,
})
```

Seeds are derived deterministically: `BLAKE3(scenario_seed ‖ invariant_name ‖ case_index)`. On failure, Sigil shrinks the counterexample (ints toward 0, strings toward shorter).

## `sigil.judge(response, opts)` — LLM judge

The `---` doc comment directly above the call becomes the rubric.

```lua
--- Response includes a valid session cookie that is HttpOnly and Secure.
--- The cookie expiration is between 1 hour and 30 days.
sigil.judge(res, { min_score = 0.8 })
```

Supports thinking models (falls back to the `reasoning` field when `content` is empty). Requires `[judge]` config with a provider.

## `sigil.intent(opts)` — agentic executor

```lua
--- Log in to the dashboard and find the organization name.
local result = sigil.intent({
  capabilities = { "browser" },
  context      = { api_key = "test-key-1" },
  capture      = { org_name = "string: the org name shown after login" },
  max_steps    = 15,
})
expect(result.completed)
expect(result.org_name == "default")
```

The LLM drives scenario tools (http, browser, exec) via tool-use to accomplish the `---` objective. Capture fields with type prefixes become part of the `complete` tool's schema.

## `sigil.browser.*` — first-class browser

Shells out to `agent-browser` with automatic session isolation per scenario ID.

```lua
sigil.browser.open("/login")
sigil.browser.fill("#email", "alice@example.com")
sigil.browser.fill("#password", sigil.env("ALICE_PASSWORD"))
sigil.browser.click("button[type=submit]")
sigil.browser.wait({ text = "Dashboard" })
expect(sigil.browser.url():match("/dashboard"))
```

Getters return strings; actions return nil or error. Key methods: `open`, `click`, `fill`, `wait`, `text`, `html`, `title`, `url`, `screenshot`, `eval`, `cookies`, `snapshot`, `visible`.

## Capabilities

The `policy.capabilities` field is static metadata. `sigil scenario lint` rejects scenarios that use a capability they didn't declare (E003), name a capability that doesn't exist (E005), or `require('lib.wraith')` without declaring `wraith` (E006):

| Capability | Grants access to |
|------------|------------------|
| `http` | `sigil.get/post/put/patch/delete` |
| `judge` | `sigil.judge` |
| `intent` | `sigil.intent` |
| `property` | `invariant` |
| `exec` | `sigil.exec` |
| `browser` | `sigil.browser.*` |
| `wraith` | `require('lib.wraith')` — the session/auth helper in wraith-generated contract scenarios |
| `db` | `sigil.db` (Phase C+) |

Declaring a capability is necessary but not always sufficient: an operator can deny one outright with `[eval] denied_capabilities` (or `sigil run --deny-capability`). A scenario that declares or calls a denied capability fails lint (E007) before it executes, and the runtime installs a denying stub regardless. `exec` is the usual target — `sigil.exec` runs on the host running sigil, not inside the deployed container. See [Configuration → `[eval]`](/reference/configuration/#eval).

## Sandbox rules

- Lua 5.4 via `mlua`, `sandbox(true)` enabled.
- `math.random` / `math.randomseed` neutered — use `sigil.gen.*`.
- `load`, `loadstring`, `loadfile` disabled.
- `require('sigil')` → error (it is a pre-injected global).
- `require('lib.X')` is the only permitted `require`, and traversal in the module
  name is rejected.

### Where `require('lib.X')` resolves

In a configured project (`sigil eval`, `sigil scenario run`, generation) it is
`<scenario root>/<service>/lib/X.lua`, where the scenario root is the
`[[scenarios]]` entry the scenario was discovered under.

Under `sigil run`, which takes paths and needs no `sigil.toml`, it is
`<anchor>/lib/X.lua` — the anchor being the path you named on the command line:
a directory argument itself, or a file argument's parent directory. That is the
same anchor the scenario id is measured against, so `lib/` sits at the top of
the tree you pointed at:

```sh
sigil run scenarios/                 # → scenarios/lib/X.lua, for every
                                     #   scenario under it, however nested
sigil run scenarios/contract.lua     # → scenarios/lib/X.lua
sigil run scenarios/api/contract.lua # → scenarios/api/lib/X.lua
```

Pass `--lib-dir <DIR>` to name the directory outright for every scenario in the
run.

:::caution[Embedding sigil as a runner]
If your tool stages a scenario tree into a temp directory and shells out to
`sigil run` — verifying a contract artifact, say — put `lib/` at the root of the
tree you pass, or name it with `--lib-dir`. Both are stable contracts. Do not
stage against whatever path a failing `require` happens to report: the fallback
sigil uses when it has neither is an internal detail, and it is *relative*, so
it resolves against sigil's working directory rather than your staged tree.
Fixed in 0.28.0.
:::

## Editor support

Run `sigil generate-types` to emit `.sigil/types/sigil.lua` — a LuaLS type stub that gives you autocomplete, hover docs, and inline type errors in any LSP-aware editor.
