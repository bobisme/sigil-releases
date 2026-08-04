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

## `[[scenarios]]`

Where scenario source lives. Optional — with no entry, sigil looks in
`scenarios/` at the project root. Note the double brackets: this is an array of
tables, so a monorepo can declare several roots.

```toml
[[scenarios]]
path = "scenarios"                  # holds one subdirectory per service

[[scenarios]]
path = "services/api/scenarios"     # IS the api service's scenarios
service = "api"                     # …because `service` is set
```

| Key | Required | Meaning |
|---|---|---|
| `path` | yes | Directory, relative to the project root (the directory containing `.sigil/`). |
| `service` | no | When set, this directory *is* that service's scenarios, with no service-name level. When absent, it holds one subdirectory per service. |

Discovery reads every root. Writes — `sigil init`, generation staging,
promotion — go to the first entry.

:::caution[Changed in 0.27.0]
This replaced a `[scenarios]` table with `root` and `key` keys. The old form is
not an error, it is simply ignored, so a project still carrying it silently
falls back to `scenarios/`. Holdout recipients moved to [`[keys]`](#keys).
:::

## `[keys]`

age recipients for encrypted holdout scenarios. Every `.lua.age` holdout is
encrypted to every recipient listed here.

```toml
[keys]
ci       = "age1..."
reviewer = "age1..."
```

Manage with `sigil keys add <name> <age1...>` or `sigil keys add-self`; either
creates the table if absent. After adding a recipient, run `sigil keys rotate`
as a current key-holder to re-seal existing holdouts to it.

Promoting a scenario to holdout **fails closed** when no recipients are
configured: an unencrypted holdout would be indistinguishable from a visible
scenario.

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

## Environment variables in scenarios

`sigil.env("KEY")` reads from a strict per-key allowlist — anything not named is
invisible to the scenario and returns nil.

The allowlist is populated by `sigil run --env` (repeatable, docker-style):

```sh
sigil run scenarios/ --env TEST_API_KEY=abc123   # explicit value
sigil run scenarios/ --env ALICE_PASSWORD        # pass through from sigil's own
                                                 # environment — keeps secrets
                                                 # off the command line
```

:::caution[Not yet available in `sigil eval`]
There is no config-file equivalent. Earlier versions of this page documented a
`[scenarios.env]` table; it was never implemented, and `sigil eval` currently
passes an empty allowlist, so `sigil.env()` returns nil for every key under
`eval`. Scenarios that need credentials during a full evaluation should read
them through the deployed service's own environment (`[deploy]`) rather than
`sigil.env()`. Tracked as bn-3g11.
:::

## `[eval]`

```toml
[eval]
allowed_origins = ["http://127.0.0.1:9090"]   # extra origins scenarios may reach
```

Endpoint pinning confines scenario HTTP to the deployed service's origin by default — a holdout or contract scenario cannot exfiltrate over an arbitrary `base_url`. `allowed_origins` adds extra origins that `sigil eval` / `sigil scenario run` / `sigil generate` may reach (typically sidecars like a metrics endpoint on another port). Entries must be bare origins (`scheme://host[:port]`, at most a trailing `/`); a malformed entry is a hard config error at load (fail-closed). The deployed service's own origin is always allowed and need not be listed. (`sigil run`, which has no project config, pins to `--endpoint` and ignores this list; use its `--allow-cross-origin` flag instead.)
