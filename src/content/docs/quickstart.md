---
title: Quickstart
description: Gate your first agent-generated PR in under ten minutes.
---

Sigil sits between your coding agent and your merge queue. It deploys the PR and a baseline to ephemeral Docker environments, runs sealed Lua scenarios against both, and emits an auditable decision.

:::caution[Unreleased — private beta]
Sigil is not yet publicly released. To follow this quickstart you need a `sigil` binary, which currently means either being in the private beta or building from source. See [Installation](/installation/).
:::

## Prerequisites

- A `sigil` binary on your `PATH` — see [Installation](/installation/)
- Docker + docker compose
- A service with a `docker-compose.yml` you can point Sigil at
- At least one LLM provider configured for judge scenarios (Ollama, OpenAI, Anthropic, or OpenRouter)

## The full loop

```sh
# 1. initialize — creates sigil.toml and .sigil/ layout
sigil init --service api

# 2. write a scenario
mkdir -p .sigil/scenarios/api/visible/smoke
$EDITOR .sigil/scenarios/api/visible/smoke/health.lua

# 3. lint and type-check
sigil scenario lint
sigil generate-types                      # writes .sigil/types/sigil.lua for editor autocomplete

# 4. run eval against a PR ref and baseline
sigil eval pull/42/head --service api

# 5. decide — emits exit 0 (ALLOW) / 1 (REVIEW) / 2 (BLOCK)
sigil decide pull/42/head --service api
```

A minimal health-check scenario:

```lua
-- .sigil/scenarios/api/visible/smoke/health.lua
return {
  title    = "Service responds to /health",
  priority = "P0",
  policy   = { capabilities = {"http"} },

  run = function()
    local res = sigil.get("/health")
    expect(res.status == 200)
    expect(res.json.ok == true)
  end,
}
```

## What just happened

1. `sigil eval` resolved `pull/42/head` to a content-addressed image digest, then deployed a PR environment and a baseline environment side by side.
2. It decrypted the scenario bundle (visible + holdout) and executed each scenario against both environments.
3. It computed a baseline-relative satisfaction score and appended `eval.complete` + `eval.decision` events to the git-backed ledger.
4. `sigil decide` loaded the latest eval, checked trust level, ledger freshness, and invariants, then emitted the decision.

## Next steps

- Read [Dark Factory](/concepts/dark-factory/) to understand why the agent never sees holdout scenarios.
- Read [Trust Model](/concepts/trust-model/) to configure earned-autonomy thresholds.
- Read [Writing Scenarios](/guides/writing-scenarios/) for the full Lua DSL.
- Read [CI Integration](/guides/ci-integration/) to wire Sigil into GitHub status checks.
