---
title: Configuration
description: sigil.toml reference.
---

Every project gets a `.sigil/sigil.toml` (or wherever you point `--config`). This page covers the sections you are most likely to touch; the **authoritative, complete reference is the published JSON Schema** — it is generated from sigil's own config types and drift-tested in CI, so it can never lag the binary:

- https://runsigil.com/schemas/sigil-config.schema.json (also `sigil schema config` on the command line)
- `sigil init` writes a `#:schema` line at the top of the generated file; editors with TOML schema support (Taplo, VS Code's Even Better TOML) then offer completion and flag unknown keys.

```toml
#:schema https://runsigil.com/schemas/sigil-config.schema.json
```

## Minimal example

```toml
#:schema https://runsigil.com/schemas/sigil-config.schema.json
default_service = "api"

[deploy]
backend      = "compose"
health_check = "/health"

[deploy.compose]
compose_template = "docker-compose.yml"

[judge]
provider = "ollama"
model    = "qwen3:14b"
```

## `default_service`

Top-level key: the service used when a command is not given `--service`. There is no `[service]` table.

## `[deploy]`

```toml
[deploy]
backend          = "compose"      # compose | container | kubernetes | process | external
health_check     = "/health"      # path polled for HTTP 200 once the environment is up
startup_timeout  = 300            # seconds: the backend's start command (compose up, docker run, kubectl apply)
health_timeout   = 60             # seconds: polling health_check for readiness
teardown_timeout = 600            # seconds: the backend's teardown command

[deploy.compose]
compose_template = "docker-compose.yml"   # required when backend = "compose"
```

A deploy has three bounded phases with three separate bounds; none covers another, and a deploy can take their sum in the worst case. `startup_timeout` is honored by the `compose`, `container`, and `kubernetes` backends (the `process` backend spawns and returns, so it warns if this is set); `health_timeout` alone bounds readiness — raising `startup_timeout` does not give a slow-booting service more time to come up. `teardown_timeout` is generous on purpose: cutting teardown short leaks containers, so expiry is a last resort, and when it happens sigil logs a greppable `SIGIL_TEARDOWN_LEAK` warning naming the environment to reclaim. Exceeding any bound tears the environment down and fails the operation — fail-closed, never a silent success.

Per-backend sub-tables: `[deploy.compose]`, `[deploy.container]`, `[deploy.kubernetes]`, `[deploy.process]`. `backend = "external"` uses pre-deployed services and requires `--pr-endpoint` / `--baseline-endpoint` on `sigil eval`. See the schema for every field.

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

## `[policy.<service>]`

Per-service decision policy, keyed by service name. The `mode` caps the decision independently of trust: only `auto` can ever ALLOW, so a clean evaluation in `shadow` or `advisory` returns REVIEW, and an unset mode renders as `unset` with the same REVIEW ceiling in both `sigil decide` and `sigil trust`.

```toml
[policy.api]
mode                = "advisory"    # shadow | advisory | auto
min_satisfaction    = 0.95
min_confidence      = 0.80
max_regression_rate = 0.05
window              = 10            # rolling window for trend analysis
max_human_override  = 0.10          # override rate that triggers escalation
trust_decay_days    = 7
never_auto          = ["security", "payment"]   # tags that block auto approval
```

## `[scenario]` — reset hooks and `sigil.env()`

The singular `[scenario]` table is unrelated to the plural `[[scenarios]]` array above: it holds per-scenario **reset hooks** and the **environment allowlist**.

### `[scenario.reset]`

HTTP requests the runner sends before each scenario to drop in-memory state on the service under test (rate-limit buckets, caches, sessions) so scenario N does not leak into scenario N+1. One hook against the deploy's primary URL, or several with the array-of-tables form, each optionally naming an `[eval] services` entry:

```toml
[scenario.reset]
method = "POST"
path   = "/__sigil_test_reset"        # relative; joined onto the target's origin
expected_status = 204                 # default: any 2xx

# or several, fired in declaration order — the first failure fails the scenario
[[scenario.reset]]
method = "POST"
path   = "/__sigil_test_reset"

[[scenario.reset]]
method  = "POST"
path    = "/__sigil_test_reset"
service = "twin-b"                    # must be declared in [eval] services
```

Paths stay relative per target, so a reset can never leave the pinned origin set; a `service` that `[eval] services` does not declare is a config error at load time. Hooks fire under `sigil scenario run` and under `sigil eval` — in eval each side (PR deploy, then baseline deploy) is reset before that side runs, and a failed reset fails that side's scenario without running its body (fail-closed, never ALLOW). Because a reset wipes state shared by the whole scenario set, `sigil eval` refuses hooks when `[eval] scenario_concurrency > 1` — set it to 1 or drop the hooks. `sigil run` reads no `sigil.toml`; it takes the same hooks from the command line — `--reset [NAME=]METHOD:/path` (repeatable) or `--resets-from <json>` (an array of entries with exactly these fields) — validated by the same rules. See [CLI → `sigil run`](/reference/cli/#sigil-run).

### `[scenario.env]` — environment variables in scenarios

`sigil.env("KEY")` reads from a **strict per-key allowlist** — anything not named is invisible to the scenario and returns nil, including variables set in sigil's own environment.

Under `sigil eval` the allowlist is `[scenario.env]` (singular — `[scenarios.env]` parses as a stray key on the first `[[scenarios]]` entry and does nothing):

```toml
[scenario.env]
API_VERSION    = "v2"                          # literal
ALICE_PASSWORD = { from = "ALICE_PASSWORD" }   # passthrough from sigil's process env
SERVICE_TOKEN  = { from = "CI_SERVICE_TOKEN" } # renamed passthrough
```

A passthrough whose source variable is unset is not inserted — `sigil.env(KEY)` returns nil and a warning names the key, because a silent `""` turns a missing credential into a login failure that reads like a product bug. It is read from the control snapshot, like everything else the eval consumes, so a PR cannot widen its own allowlist.

Under `sigil run` the allowlist is the repeatable `--env` flag (docker-style):

```sh
sigil run scenarios/ --env TEST_API_KEY=abc123   # explicit value
sigil run scenarios/ --env ALICE_PASSWORD        # pass through from sigil's own
                                                 # environment — keeps secrets
                                                 # off the command line
```

## `[eval]`

```toml
[eval]
runs_per_scenario     = 3                          # repetitions per scenario, for statistical confidence
confidence_level      = 0.95                       # statistical confidence target
pass_threshold        = 0.90                       # satisfaction threshold for ALLOW
progressive           = true                       # adaptive early stopping once confidence_level is reached
differential          = false                      # compare vs baseline (Phase D+)
budget_seconds        = 600                        # wall-clock budget for the whole eval
budget_tokens         = 50000                      # LLM token budget for the whole eval
max_eval_age          = "24h"                      # max age of a cached eval.complete before decide re-evaluates
scenario_concurrency  = 1                          # parallel scenarios; must be 1 when [scenario.reset] hooks are set
allowed_origins       = ["http://127.0.0.1:9090"]  # extra origins scenarios may reach
services              = { taxonomy = "http://twin-b:8080" }   # named services for sigil.service("taxonomy")
denied_capabilities   = ["exec"]                   # capabilities no scenario may declare or use
```

`runs_per_scenario`, `confidence_level`, and `pass_threshold` govern how many times each scenario repeats and what satisfaction rate counts as passing; `progressive` stops early once `confidence_level` is reached with fewer runs, and `differential` (Phase D+) additionally compares the PR run against the baseline run rather than judging the PR in isolation. `budget_seconds` / `budget_tokens` cap the whole eval, not a single scenario; exceeding either fails closed. `max_eval_age` bounds how long `sigil decide` may reuse a prior `eval.complete` record instead of requiring a fresh `sigil eval` — separate from `[ledger] max_staleness_for_allow`, which bounds ledger *sync* freshness rather than the eval's own age. See the schema for `stage_fail_rate_threshold`, `catastrophic_fail_rate`, `live_runners`, and `differential_eval`.

**Endpoint pinning** confines scenario HTTP to the deployed service's origin by default — a holdout or contract scenario cannot exfiltrate over an arbitrary `base_url`. `allowed_origins` adds extra origins that `sigil eval` / `sigil scenario run` / `sigil generate` may reach (typically sidecars like a metrics endpoint on another port). Entries must be bare origins (`scheme://host[:port]`, at most a trailing `/`); a malformed entry is a hard config error at load (fail-closed). The deployed service's own origin is always allowed and need not be listed. (`sigil run`, which has no project config, pins to `--endpoint` and ignores this list; use its `--allow-origin` / `--allow-cross-origin` flags instead.)

**`services`** declares named services reachable from Lua as `sigil.service("name")` — a second twin, say — with each origin validated like `allowed_origins` and folded into the pin set. The same map is what `[scenario.reset]` hooks with `service = "…"` target. The `sigil run` equivalents are `--endpoint name=url` and `--endpoints-from <json>`.

**`denied_capabilities`** is an operator-side denylist on top of the per-scenario `policy.capabilities` declaration. Nothing is denied by default; an unknown capability name is a hard config error. Enforcement is fail-closed at three layers: a scenario that declares or calls a denied capability fails lint (`E007`) before it executes, the runtime installs a denying stub for it regardless of what the scenario declared, and `sigil.intent` never exposes it as a tool. A blocked scenario reports `failure_class = "capability"`. The motivating case is `exec`: `sigil.exec` runs `sh -c` on the host running sigil, not inside the deployed container, so deny it wherever third-party or agent-authored scenarios run. The `sigil run` equivalent is the repeatable `--deny-capability <NAME>`.

## `[holdout]`

Controls what fraction of scenarios are withheld from the coding agent (the dark-factory holdout set) and how often the holdout set rotates.

```toml
[holdout]
percentage         = 25    # % of scenarios withheld as holdout (default)
rotation_interval  = "30d" # rotate which scenarios are held out every N days
```

## `[feedback]`

Shapes the lossy feedback `sigil eval` reports back to the coding agent — the isolation wall enforces that this can never leak holdout scenario content.

```toml
[feedback]
format               = "json"    # text | json
max_hint_length      = 200       # max characters per failure hint
include_status_codes = true      # include HTTP status codes in hints
include_step_names   = "opaque"  # opaque | step_N | full — opaque never leaks scenario names
include_timing       = false     # include step timings
```

## `[security]`

Optional SAST / secret / dependency scanning gates run alongside the eval. All fields are unset (scanning off) by default.

```toml
[security]
sast_tool      = "semgrep"
secret_scanner = "trufflehog"
dep_scanner    = "trivy"
sast_mode      = "advisory"           # disabled | advisory | required
secret_mode    = "required"
dep_mode       = "advisory"
block_on       = ["CRITICAL", "HIGH:auth", "HIGH:secrets"]
warn_on        = ["MEDIUM"]
sbom           = true
scanner_timeout_secs = 120            # per-scanner subprocess timeout
```

`sast_mode` / `secret_mode` / `dep_mode` (each defaulting to `advisory`) control whether a scanner's own execution failure is fail-closed: `required` treats a scanner that fails to run or parse as a hard gate failure, `advisory` surfaces its findings without blocking on tooling failure, and `disabled` skips it entirely regardless of `*_tool`.

## `[ledger]`

The git-backed (or SQLite) append-only record of every `eval.complete` and `eval.decision` event, and the freshness gate `sigil decide` enforces before any ALLOW.

```toml
[ledger]
backend                 = "git"      # git | sqlite
repo                    = ".sigil"   # ledger repository or db path
remote                  = "origin"   # git remote name
auto_sync               = true       # auto-sync ledger on eval
sync_retry              = 3          # retry count for sync failures
max_staleness_for_allow = "60s"      # max ledger sync age before an ALLOW is refused
```

`max_staleness_for_allow` is the **freshness gate**: `sigil decide` refuses to return ALLOW when the ledger has not synced within this window, regardless of how clean the underlying eval is (fail-closed — it downgrades to REVIEW or BLOCK, never ALLOW). It lives here, under `[ledger]`, not under a `[policy]` table.

## `[attestation]`

Optional in-toto supply-chain attestations over eval results (Phase G+). Disabled by default.

```toml
[attestation]
enabled              = false
signing_key          = "/path/to/key.pem"
format               = "in-toto"
trusted_public_keys  = ["<hex-encoded-ed25519-pubkey>"]
```

## `[observability]`

```toml
[observability]
log_level        = "info"    # trace | debug | info | warn | error
log_format       = "json"
trace_enabled    = false     # detailed execution traces
metrics_endpoint = "http://prometheus:9090/metrics"
```

## `[browser]`

Controls the in-process Chrome-for-Testing runner backing `sigil.browser.*` scenario calls.

```toml
[browser]
backend  = "native"   # native (the "cli" value is accepted for old configs but every call errors)
headless = true        # false launches a visible window
```

Override `headless` ad hoc without editing config: `SIGIL_BROWSER_HEADLESS=0` (or `false` / `no`) forces headful for one run; any other value, including unset, keeps the configured setting.

## `[risk]`

`[risk.path_rules]` classifies a PR's changed paths into risk tiers `r0`–`r3` (glob patterns, matched in that order) for policy and reporting.

```toml
[risk.path_rules]
r0 = ["**/*.md", "**/test/**", "**/*.test.*", ".github/**"]   # docs/tests
r1 = []                                                          # empty by default
r2 = ["**/api/**", "**/handlers/**", "**/models/**"]
r3 = ["**/migrations/**", "**/auth/**", "**/billing/**", "**/crypto/**"]   # highest risk
```

A PR's risk class is the highest tier any changed path matches (a path matching no rule at all classifies `r0`); migration files and `[policy.<service>] never_auto` domains always force `r3`, and total changed lines over 500 bump the class up one tier.
