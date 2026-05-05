---
title: "Sigil Quickstart: Gate an Agent PR"
description: Run Sigil against a pull request, compare it with a baseline, and emit an ALLOW, REVIEW, or BLOCK merge decision.
---

At the end of this quickstart, Sigil will evaluate a PR ref against a baseline and emit an auditable `ALLOW`, `REVIEW`, or `BLOCK` decision. In GitHub Actions, the same loop posts a status check that can protect your merge queue.

## Prerequisites

- A `sigil` binary on your `PATH`:

  ```sh
  curl -fsSL https://runsigil.com/install.sh | sh
  ```

- Docker and Docker Compose.
- A service with a `docker-compose.yml` that Sigil can deploy.
- At least one LLM provider configured for judge scenarios: Ollama, OpenAI, Anthropic, or OpenRouter.
- A PR ref or commit ref to evaluate, such as `pull/42/head`.

:::tip[No service ready?]
Use the fixture in `examples/fixture-service/` from the release repo to try the health-check flow against a known Docker Compose service.
:::

## 1. Initialize a service

```sh
sigil init --service api
```

This creates `sigil.toml` and the `.sigil/` directory layout for the `api` service.

## 2. Add a scenario

```sh
mkdir -p .sigil/scenarios/api/visible/smoke
$EDITOR .sigil/scenarios/api/visible/smoke/health.lua
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

## 3. Lint scenarios and generate editor types

```sh
sigil scenario lint
sigil generate-types
```

`generate-types` writes `.sigil/types/sigil.lua` for editor autocomplete and hover docs.

## 4. Evaluate a PR against a baseline

```sh
sigil eval pull/42/head --service api
```

Sigil deploys the PR and baseline side by side, decrypts the visible plus holdout scenario bundle, runs the scenarios against both environments, and writes `eval.complete` to the ledger.

Expected shape:

```txt
visible     1.00
holdout     0.82
overall     0.94
ledger      eval.complete eval_01HPXG5KQ7J9W4
```

## 5. Emit the merge decision

```sh
sigil decide pull/42/head --service api
```

Exit codes:

| Decision | Exit | Meaning |
|---|---:|---|
| `ALLOW` | 0 | Policy and trust gates passed. |
| `REVIEW` | 1 | Human review required. |
| `BLOCK` | 2 | Regression or policy failure. |

## GitHub status check path

Once the local loop works, wire the same command sequence into GitHub Actions:

```sh
sigil ci owner/repo#42 --service api --comment --auto-merge
```

Read [CI Integration](/guides/ci-integration/) for the full workflow, permissions, branch protection, and merge queue setup.

## Troubleshooting

| Symptom | Check |
|---|---|
| Docker deploy fails | Confirm `docker compose up` works without Sigil. |
| Scenario lint fails | Check capability declarations and Lua syntax. |
| Judge scenario fails before running | Confirm your `[judge]` provider config and keys. |
| `REVIEW` appears unexpectedly | Inspect the latest eval, threshold config, trust state, and ledger freshness. |
| Holdout key unavailable | Ensure CI has the service scenario key, such as `SIGIL_SCENARIOS_KEY`. |
| GitHub status does not post | Confirm token permissions include `statuses: write` and `pull-requests: write`. |

## Next steps

- Read [Writing Scenarios](/guides/writing-scenarios/) for the Lua DSL.
- Read [CI Integration](/guides/ci-integration/) to post GitHub checks.
- Read [Trust Model](/concepts/trust-model/) to configure earned-autonomy thresholds.
- Read [Dark Factory](/concepts/dark-factory/) to understand why the authoring agent never sees holdout scenarios.
