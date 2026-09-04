---
title: Lua DSL Reference
description: Full reference for the sigil Lua scenario API.
---

This page is the authoritative reference for the sigil Lua API. Scenarios are Lua 5.4 files executed in an mlua sandbox.

## Pre-injected globals

| Name | Type | Purpose |
|------|------|---------|
| `sigil` | table | The main API surface. |
| `expect` | function | Power assertion with source-rewriting. |
| `invariant` | function | Property-based testing. |

Do **not** `require('sigil')` — it is a global, and requiring it is a hard error.

## `sigil.get/post/put/patch/delete(path, [body], [opts])`

**Requires capability**: `http`

```lua
local res = sigil.post("/api/login", {
  email = "alice@example.com",
  password = "hunter2",
}, {
  headers = { ["X-Request-Id"] = "req-123" },
  timeout_ms = 5000,
})
```

Returns:

```lua
{
  status  = 200,
  headers = { ["content-type"] = "application/json", ... },
  body    = "raw byte string body",
  json    = { ... },            -- parsed if content-type is application/json
  elapsed_ms = 47,
}
```

`body` preserves the exact wire bytes, including embedded NULs and invalid
UTF-8. When Sigil records internal JSON trace evidence, valid UTF-8 remains a
string and binary data becomes an explicit bounded `base64-preview` object
with byte count, BLAKE3 digest, and a preview-truncation flag. That projection
never changes the Lua value and is not exposed through lossy agent feedback.

## `sigil.exec(command, [opts])`

**Requires capability**: `exec`

```lua
local result = sigil.exec("redis-cli KEYS 'session:*'")
expect(result.status == 0)
```

Runs `sh -c <command>` on the **host running sigil** — not inside the deployed container — with the scenario's environment plus `SIGIL_ENV_URL`, `SIGIL_SCENARIO_ID`, and `SIGIL_SERVICE`. `command` is a single shell string; there is no separate argument array. `opts` accepts `cwd`, `env` (a `key = value` table merged over the scenario env), and `stdin`.

Returns `{ status, stdout, stderr, stdout_truncated, stderr_truncated }`. `status`
is the process exit code, or `-1` if the process could not be spawned, output
collection failed or timed out, or the process ended without a numeric exit
code. `stdin`, `stdout`, and `stderr` are exact Lua byte strings, including NUL
and invalid UTF-8. Stdout and stderr are drained concurrently; each retains its
first 1 MiB and sets its `*_truncated` flag if more bytes were discarded.
Internal JSON evidence uses the same explicit `base64-preview` projection
described for HTTP bodies. Each call starts its direct command in an isolated
process group and terminates processes that remain in that group when the
command returns, times out, or Sigil receives Ctrl+C. This is lifecycle cleanup,
not a containment boundary: a command that deliberately creates a new session
can leave the group. Deny the `exec` capability for scenarios that are not
trusted with host shell access.

## `sigil.env(name)`

Reads from a **strict per-key allowlist**, never the ambient process environment; a key that is not on the allowlist returns `nil`. Under `sigil eval` the allowlist is `[scenario.env]` in `sigil.toml` (literal values or `{ from = "PROCESS_VAR" }` passthroughs, read from the control snapshot); under `sigil run` it is the repeatable `--env KEY[=VALUE]` flag. See [Configuration → `[scenario.env]`](/reference/configuration/#scenarioenv--environment-variables-in-scenarios).

## `sigil.gen.*`

Deterministic random-value generators. Every factory returns a lazy descriptor:

- `sigil.gen.int(min, max)`
- `sigil.gen.float(min, max)`
- `sigil.gen.bool()`
- `sigil.gen.uuid()`
- `sigil.gen.email({ domain = "example.com" })`
- `sigil.gen.string(min?, max?, charset?)`
- `sigil.gen.bytes(min, max?)`
- `sigil.gen.const(value)`
- `sigil.gen.one_of({ ... })`

Pass descriptors directly to `invariant.for_all`. To materialize one value in
ordinary `run()` code, sample explicitly:

```lua
local request_id = sigil.gen.sample(sigil.gen.uuid())
local email = sigil.gen.sample(sigil.gen.email({ domain = "example.com" }))
```

`sigil.gen.sample(generator)` uses a domain-separated per-scenario counter.
Successive calls are deterministic for the recorded root seed without changing
the invariant case stream; UUIDs are distinct across sample indices, while
other generators may legitimately repeat. Descriptors also support `:map(fn)`,
`:filter(predicate, max_attempts?)`, and `:list(min?, max?)` before sampling or
use in an invariant.

Direct runners accept `--seed <64-hex|auto>` and default to `auto`. The chosen
32-byte root seed is printed in human output and recorded as top-level
`rng_seed` in JSON. Replay reuses the recorded root unless given an exact
64-hex override. `math.random` and `math.randomseed` are neutered — all
randomness must go through `sigil.gen.*`.

## `expect(expr, [message])`

Power assertion. Source-rewritten at parse time: captures both sides of `==`/`~=`/`<`/`<=`/`>`/`>=` and every step of dotted chain accesses. The optional second argument — a string, or `{ message = "…" }` — is appended to the failure text as `message: …` and becomes the entry's `description` in the report's `expects[]` block when no `---` doc comment precedes the call (a `---` block wins when both exist). `message` is the only recognised key; anything else is ignored.

```lua
expect(res.json.user.email == "alice@example.com")
-- on failure, Ariadne renders:
--   res.json.user.email == "alice@example.com"
--   │   │    │    │     │  │
--   │   │    │    │     │  "alice@example.com"
--   │   │    │    │     false
--   │   │    │    "bob@example.com"
--   │   │    { email = "bob@example.com" }
--   │   { user = { email = "bob@example.com" } }
--   { json = { user = { email = "bob@example.com" } } }

expect(res.status == 200, "login should succeed for a seeded user")
```

## `sigil.log(message)` and `sigil.attach(name, value)`

`sigil.log` records a scenario-local byte string; `sigil.attach` records a named
value (any JSON-representable Lua value) as evidence. Under `sigil run` and
`sigil scenario run`, JSON reports carry `logs: [...]` in call order and
`attachments: { name = value }` with last write wins on every scenario entry.
Neither reaches `sigil eval`'s lossy feedback or the PR comment.

Valid UTF-8 logs remain JSON strings. Invalid UTF-8 becomes
`{encoding: "base64", byte_count, blake3, data_base64}`; the base64 contains
the complete input, and the digest uses the `blake3:<hex>` form. A cumulative
1 MiB per-scenario byte budget fails the exceeding call explicitly without
recording or truncating that entry. Human `sigil run` streams `log:` lines to
stderr as they happen, using the same binary object and escaping control
characters in UTF-8 text. Human reports print `attach:` lines after the scenario.

```lua
sigil.log("seeded 3 users")
sigil.attach("response_body", res.json)
```

## `invariant(name, opts)`

**Requires capability**: `property`

```lua
invariant("reverse is self-inverse", {
  cases   = 100,
  for_all = { s = sigil.gen.string(20) },
  check   = function(case)
    expect(reverse(reverse(case.s)) == case.s)
  end,
})
```

Options:

- `cases` — number of cases to run (default 100).
- `for_all` — named generators.
- `check(case)` — function called per case.
- `shrink` — disable shrinking with `shrink = false`.

Seeds: `BLAKE3(scenario_seed ‖ invariant_name ‖ case_index)`.

## `sigil.judge(response, opts)`

**Requires capability**: `judge`

The `---` doc comment block immediately above the call is the rubric.

```lua
--- The response is a JSON object containing exactly: {id, email, role}.
--- The role is one of: admin, user, guest.
--- Timestamps are ISO-8601 with timezone.
sigil.judge(res, {
  min_score = 0.8,
  rubric_id = "user-schema-v1",   -- optional — for rubric analytics
})
```

Options:

- `min_score` — required minimum score (0.0–1.0).
- `rubric_id` — optional tag for rubric analytics.
- `provider` — override the default `[judge]` provider for this call.

Returns `{ score, rationale, raw }`. Fails the scenario if `score < min_score`.

## `sigil.intent(opts)`

**Requires capability**: `intent`

The `---` doc comment block above the call is the objective.

```lua
--- Complete the checkout flow for a Pro plan, annual billing.
local result = sigil.intent({
  capabilities = { "browser", "http" },
  context      = { test_card = "4242424242424242" },
  capture      = {
    order_id   = "string: the order confirmation number",
    total_cents = "number: the final charged amount in cents",
  },
  max_steps = 20,
})
expect(result.completed)
expect(result.total_cents == 9900)
```

Options:

- `capabilities` — tools the intent can use.
- `context` — extra key-values injected into the LLM context.
- `capture` — fields to capture, with `type: description` format.
- `max_steps` — step budget.

Returns `{ completed, summary, steps, ... }` plus captured fields.

## `sigil.browser.*`

**Requires capability**: `browser`

Uses Sigil's in-process Chrome-for-Testing runner. Sessions isolate per
scenario; the base URL is prepended to relative paths. See
[browser configuration](/reference/configuration/#browser).

| Method | Purpose |
|--------|---------|
| `sigil.browser.open(url)` | Navigate. Returns nil. |
| `sigil.browser.click(selector)` | Click. Returns nil. |
| `sigil.browser.fill(selector, value)` | Fill input. Returns nil. |
| `sigil.browser.wait(opts)` | Wait for `{text}`, `{selector}`, or `{timeout_ms}`. |
| `sigil.browser.text(selector)` | Inner text (string). |
| `sigil.browser.html(selector)` | Inner HTML (string). |
| `sigil.browser.title()` | Page title (string). |
| `sigil.browser.url()` | Current URL (string). |
| `sigil.browser.screenshot(path)` | Write PNG. |
| `sigil.browser.eval(js)` | Evaluate JS, return result. |
| `sigil.browser.cookies()` | List cookies. |
| `sigil.browser.snapshot()` | Accessibility tree. |
| `sigil.browser.visible(selector)` | Bool: selector is visible. |

## WebAssembly plugins

A locked project plugin is loaded as a dotted Lua module:

```lua
local codec = require("wasm.codec")
local echoed = codec["echo-u32"](42)
expect(echoed == 42)
```

The scenario's strict policy declares the exact `wasm.<name>` capability, and
the project must contain a matching `[plugins.require]` entry plus valid
`.sigil/sigil.plugins.lock`. Installing bytes in the user cache is not enough.
Use `sigil plugin install NAME[@VERSION]` to acquire the verified bytes, then
`sigil plugin add NAME[@VERSION]` to adopt the dependency.

Plugin functions and WIT records, tuples, lists, options, results, flags,
enums, variants, constructors, resources, and resource methods map to bounded
Lua values. Each scenario/environment lane gets a fresh component instance and
resource table. A plugin failure is typed infrastructure evidence and can never
be scored as a behavioral pass.

The namespace is exact: `require("wasm.codec")` is valid;
`require("wasm:codec")` and `require("codec.wasm")` are not aliases. See
[Using WebAssembly Plugins](/guides/plugins/) for installation, project locks,
CI sync, host grants, updates, and removal.

## Scenario table

Return from every scenario file:

```lua
return {
  title     = "...",            -- optional, human label
  priority  = "P0"|"P1"|"P2",   -- required
  tags      = { "tag1", ... },
  endpoints = { "GET /foo" },
  budget    = { max_seconds = 30 },
  policy    = { capabilities = { ... } },   -- required
  run       = function() ... end,           -- required
}
```

An unknown key in this table, or inside `budget`/`policy`, is a lint warning (W008) with a near-miss hint — `timeout`, `timeout_ms`, `budget_ms` and friends point at `budget = { max_seconds = N }`, since the wall-time budget is the only time bound and those spellings were silently ignored before 0.31. `sigil run` prints W008 to stderr.

## Errors

- `require('sigil')` → error.
- `require('wasm.NAME')` without a project requirement, exact lock, or
  `wasm.NAME` capability → fail-closed plugin/capability error.
- Using a capability not in `policy.capabilities` → scenario aborts with a capability-mismatch error and the scenario is marked failed.
- `load`, `loadstring`, `loadfile` → unavailable.
- `math.random`, `math.randomseed` → no-ops.
- `os.execute`, `os.exit`, `io.*` → unavailable.
