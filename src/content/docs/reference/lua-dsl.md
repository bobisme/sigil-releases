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
  body    = "raw string body",
  json    = { ... },            -- parsed if content-type is application/json
  elapsed_ms = 47,
}
```

## `sigil.exec(command, [opts])`

**Requires capability**: `exec`

```lua
local result = sigil.exec("redis-cli KEYS 'session:*'")
expect(result.status == 0)
```

Runs `sh -c <command>` on the **host running sigil** — not inside the deployed container — with the scenario's environment plus `SIGIL_ENV_URL`, `SIGIL_SCENARIO_ID`, and `SIGIL_SERVICE`. `command` is a single shell string; there is no separate argument array. `opts` accepts `cwd`, `env` (a `key = value` table merged over the scenario env), and `stdin`.

Returns `{ status, stdout, stderr }`. `status` is the process exit code, or `-1` if the process could not be spawned or ran past the scenario's time budget.

## `sigil.env(name)`

Reads from a **strict per-key allowlist**, never the ambient process environment; a key that is not on the allowlist returns `nil`. Under `sigil eval` the allowlist is `[scenario.env]` in `sigil.toml` (literal values or `{ from = "PROCESS_VAR" }` passthroughs, read from the control snapshot); under `sigil run` it is the repeatable `--env KEY[=VALUE]` flag. See [Configuration → `[scenario.env]`](/reference/configuration/#scenarioenv--environment-variables-in-scenarios).

## `sigil.gen.*`

Deterministic random-value generators, seeded from the scenario seed.

- `sigil.gen.email()` — RFC-valid email
- `sigil.gen.uuid()` — random UUIDv4
- `sigil.gen.int(min, max)` — bounded integer
- `sigil.gen.string(len)` — printable string
- `sigil.gen.choice(list)` — element from a list
- `sigil.gen.date(start, end)` — ISO-8601 date in range

`math.random` and `math.randomseed` are neutered — all randomness must go through `sigil.gen.*`.

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

`sigil.log` records a scenario-local log line; `sigil.attach` records a named value (any JSON-representable Lua value) as evidence. Under `sigil run` and `sigil scenario run` both surface in the report: `--json` carries `logs: ["…"]` (call order) and `attachments: { name = value }` (last write wins) on every scenario entry, and the human output prints `log:` lines to stderr as they happen and `attach:` lines after the scenario. Neither reaches `sigil eval`'s lossy feedback or the PR comment.

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

Shells out to `agent-browser`. Automatic per-scenario session isolation; base URL is prepended to relative paths.

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
Use `sigil plugin add NAME` to adopt the dependency.

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
