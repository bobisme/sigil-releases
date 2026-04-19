---
title: Writing Scenarios
description: The Lua scenario DSL — expect, invariant, judge, intent, browser.
---

Scenarios are plain Lua files that return a table. `sigil`, `expect`, and `invariant` are pre-injected globals — do **not** `require('sigil')`, it will error.

## File layout

```
.sigil/scenarios/<service>/
  visible/
    auth/
      login.lua
      logout.lua
    billing/
      checkout.lua
  holdout/
    auth/
      password-reset.lua.age     # age-encrypted
  lib/
    auth.lua                      # shared helpers — require('lib.auth')
```

Scenario ID is derived from the file path (`visible/auth/login.lua` → `auth/login`). Never declare it in the file.

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

The `policy.capabilities` field is static metadata. `sigil scenario lint` rejects scenarios that use a capability they didn't declare:

| Capability | Grants access to |
|------------|------------------|
| `http` | `sigil.get/post/put/patch/delete` |
| `judge` | `sigil.judge` |
| `intent` | `sigil.intent` |
| `property` | `invariant` |
| `exec` | `sigil.exec` |
| `browser` | `sigil.browser.*` |
| `db` | `sigil.db` (Phase C+) |

## Sandbox rules

- Lua 5.4 via `mlua`, `sandbox(true)` enabled.
- `math.random` / `math.randomseed` neutered — use `sigil.gen.*`.
- `load`, `loadstring`, `loadfile` disabled.
- `require('sigil')` → error (it is a pre-injected global).
- `require('lib.X')` resolves only inside `.sigil/scenarios/<service>/lib/`.

## Editor support

Run `sigil generate-types` to emit `.sigil/types/sigil.lua` — a LuaLS type stub that gives you autocomplete, hover docs, and inline type errors in any LSP-aware editor.
