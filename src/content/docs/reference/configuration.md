---
title: Configuration
description: sigil.toml reference.
---

Every service gets a `sigil.toml` at the repo root (or wherever you point `--config`). This page is the full reference.

## Minimal example

```toml
[service]
name = "api"

[deploy]
compose_file = "docker-compose.yml"
health_url   = "http://localhost:8080/health"

[judge]
provider = "ollama"
model    = "qwen3:14b"
```

## `[service]`

```toml
[service]
name    = "api"                      # service identifier (required)
baseline = "merge-base"              # merge-base | main | <ref>
```

## `[deploy]`

```toml
[deploy]
compose_file     = "docker-compose.yml"
health_url       = "http://localhost:8080/health"
health_timeout_s = 60
env_file         = ".env.test"
```

## `[scenarios]`

```toml
[scenarios]
root = ".sigil/scenarios"           # location of scenario files
key  = "age1..."                    # public age key for holdout encryption
```

## `[judge]`

See [Configuring Judges](/guides/configuring-judges/).

## `[generate]`

Optional override for scenario generation (`sigil scenario generate`):

```toml
[generate]
provider      = "anthropic"
model         = "claude-opus-4-7"
context_specs = ["docs/specs/auth.md", "docs/specs/billing.md"]
```

## `[ci]`

```toml
[ci]
status_context = "sigil/api"
comment        = true
auto_merge     = true
```

## `[policy]`

```toml
[policy]
max_staleness_for_allow_s = 60       # freshness gate
min_window_for_auto       = 50       # min evals before AUTO promotion
min_clean_allow_rate      = 0.98
cooldown_after_incident_h = 24
```

## `[policy.thresholds]`

Satisfaction score thresholds, per priority:

```toml
[policy.thresholds]
p0 = { allow = 0.95, review = 0.85 }   # below 0.85 -> BLOCK
p1 = { allow = 0.90, review = 0.75 }
p2 = { allow = 0.80, review = 0.60 }
```

## `[scenarios.env]`

Allow-list of env vars exposed to scenarios via `sigil.env()`:

```toml
[scenarios.env]
ALICE_PASSWORD = { from = "ALICE_PASSWORD" }      # pass through
TEST_API_KEY   = { from = "CI_TEST_API_KEY" }     # rename from another var
```

Anything not listed is invisible to scenarios.
