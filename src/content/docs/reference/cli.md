---
title: CLI Reference
description: All sigil subcommands.
---

Run `sigil --help` or `sigil <subcommand> --help` for up-to-date usage. This page is a tour of the common subcommands.

## Core

### `sigil eval`

```
sigil eval <pr-ref> --service <svc> [--failure-artifact <FILE>] [options]
```

Deploy PR + baseline, run scenarios against both, score, and append `eval.complete` to the ledger.

- `--failure-artifact <FILE>` — write a fixed-vocabulary **failure phase** as JSON on every terminal outcome, including runs that produce no eval report. Lets a caller tell a failed deploy leg from an undecryptable scenario set from an uncovered strict MUST from an internal evaluator error, without parsing stderr. Deploy phases name the leg and the stage, e.g. `deploy.baseline.health-wait`. The vocabulary is closed, and the artifact carries only that vocabulary plus config *field names* — never scenario ids, endpoints, rubric text, config values, or raw error strings, so it stays safe where holdout secrecy matters. Fail-closed on both sides: an unrecognized, malformed, or missing artifact never reads as success. `$SIGIL_FAILURE_ARTIFACT` is honored when the flag is absent. Each structured deployment failure also lists which config fields came from the working checkout, the control snapshot, a CLI flag, or the environment — field names and sources only.

### `sigil decide`

```
sigil decide <pr-ref> --service <svc>
```

Apply the threshold policy to the most recent eval for this PR and emit the decision. Exit 0 (ALLOW), 1 (REVIEW), 2 (BLOCK).

The **policy mode caps the decision independently of trust**: only `auto` can ever ALLOW, so a clean evaluation in `shadow` or `advisory` returns REVIEW. Since 0.28.0 the output says so rather than leaving you to infer it — the rationale carries `shadow_mode_cap` / `advisory_mode_cap` / `policy_mode_unset_cap`, and `--json` adds `policy_mode`, `mode_ceiling`, `mode_capped`, and the full `lattice`. A REVIEW that came from actual findings carries no cap code, so an operator can confirm a clean shadow run without opening a protected report.

### `sigil ci`

```
sigil ci owner/repo#42 --service <svc> [--comment] [--auto-merge] [--dry-run]
```

`eval` + `decide` + GitHub integration in one. See [CI Integration](/guides/ci-integration/).

## Scenarios

### `sigil run`

```
sigil run [PATHS...] [--filter <SUBSTR>] [--tag <T>] [--exclude-tag <T>] [--endpoint <URL|NAME=URL>] [--endpoints-from <PATH>] [--env KEY[=VALUE]] [--lib-dir <DIR>] [--allow-origin <URL>] [--allow-cross-origin] [--deny-capability <NAME>] [--json]
```

Minimal scenario runner — runs `.lua` files directly without requiring `.sigil/sigil.toml`, the eval pipeline, or a ledger. Each positional is a file or a directory (recursive walk for `*.lua`, `lib/` skipped). `--filter` is substring-matched against scenario file path and `title` (repeatable, OR'd). `--tag` / `--exclude-tag` use the same semantics as `sigil scenario run` (exclude always wins). `--endpoint` is optional — surfaces a clear error at first HTTP call if a scenario needs one. Exit codes: `0` all passed, `1` some failed, `2` zero scenarios matched (pytest convention).

- `--env KEY[=VALUE]` (repeatable) — populate `sigil.env()`. `KEY=VALUE` sets a literal value (only the first `=` splits, so values may contain `=`); bare `KEY` passes the value through from sigil's own process environment, keeping secrets off the command line. Strict allowlist: only named keys are visible to the scenario; duplicates are last-wins.
- `--lib-dir <DIR>` — the directory `require('lib.<module>')` resolves inside, for every scenario in the run. Defaults to the **discovery anchor** joined with `lib`: a directory argument itself, or a file argument's parent — the same anchor the scenario id is derived from. Name it explicitly when staging a tree whose helpers do not sit there. Validated up front, so a missing directory aborts the invocation rather than surfacing as a require failure partway through the suite. See [Writing Scenarios](/guides/writing-scenarios/#where-requirelibx-resolves).
- `--endpoint <NAME=URL>` — declare a **named service** reachable from Lua as `sigil.service("name")`, alongside the bare-URL form that sets the primary base URL. Repeatable. Each named origin is validated up front and folded into the pin set, so a cross-service assertion (a second twin, say) stays inside pinning rather than needing it disabled.
- `--endpoints-from <PATH>` — load named services from a flat JSON object `{ "name": "http://host:port", ... }` (`-` reads stdin), so a tool that already knows the box's service map can feed sigil directly: `rig env --format json | sigil run scenarios/ --endpoint http://a:8080 --endpoints-from -`. Every key becomes a named service exactly as if `--endpoint name=url` had been passed — same origin validation, same pin set. The primary endpoint stays argv-only; a name declared in both the file and `--endpoint` is an error; a bad file, bad JSON, or bad origin aborts before any scenario runs.
- `--allow-origin <URL>` (repeatable) — allowlist one specific extra origin on top of `--endpoint`, keeping pinning enforced for everything else. Each value must be a bare `scheme://host[:port]`. Prefer this over `--allow-cross-origin` whenever the extra origins are known in advance.
- `--allow-cross-origin` — disable endpoint pinning. By default every HTTP call and redirect is confined to the `--endpoint` origin; a cross-origin `base_url` is a runtime error. This flag restores the old unconfined behavior — only use it for trusted scenarios (see the security note in `--help`).
- `--deny-capability <NAME>` (repeatable) — refuse to run scenarios that declare or use this capability. Nothing is denied by default; an unknown name aborts the invocation. Enforced fail-closed: a scenario that declares or calls a denied capability fails lint (`E007`) before it executes — reported with `failure_class = "capability"` — and the runtime installs a denying stub regardless of what the scenario declared. **`sigil.exec` runs `sh -c <command>` on the host running sigil, not inside any container**; pass `--deny-capability exec` when running third-party or agent-authored scenarios. Projects with a `sigil.toml` set the same list in `[eval] denied_capabilities`.
- `--json` — emit a machine-readable report on stdout instead of human output. Per-scenario entries: `{id, title?, status, duration_ms, failure_class?, checks, expects, error?, diagnostic?}`. `failure_class` is `"assertion"` (a behavior problem), `"crash"` (a tooling/scenario problem), `"pinning"` (an endpoint-pinning violation — a cross-origin `base_url` override or redirect blocked by the runtime origin gate), or `"capability"` (a capability denied by `--deny-capability` / `[eval] denied_capabilities`), omitted for passing scenarios.

For PR evaluation, scoring, ledger writes, baseline comparison, and decision policy use `sigil eval` instead.

### `sigil scenario lint` / `lint-path`

```
sigil scenario lint [--service <svc>]
sigil scenario lint-path <paths...> [--json]
```

`lint` parses + static-checks every scenario in a configured project (capabilities, metadata, sandbox-safety rules). `lint-path` lints arbitrary `.lua` files **without** a `.sigil/` project layout — the same rule set, with machine-readable findings under `--json` (`{file, code, severity, message, line, span}`). Exit `0` when clean, nonzero when any error-severity finding is present.

### `sigil scenario run`

```
sigil scenario run [SCENARIO_ID | --all] [--service <svc>] [--endpoint <URL>] [--format human|json] [--allow-cross-origin]
```

Run scenarios from a configured project. `--format json` emits the same report schema as `sigil run --json` (one schema across both runners). Endpoint pinning applies here too, with the project's `[eval] allowed_origins` allowlist permitting known sidecar origins.

### `sigil scenario generate`

```
sigil scenario generate --from <spec> --service <svc>
```

Five-input pipeline (spec, diff, bugs, traces, source) → LLM test plan → scenario code → three-stage validation (lint, parse, optional execution via `--verify`) with repair loop.

### `sigil generate-types`

```
sigil generate-types [--service <svc>]
```

Emit `.sigil/types/sigil.lua` — a LuaLS type stub that gives editor autocomplete for the full DSL.

## Ledger

### `sigil ledger list`

```
sigil ledger list [--service <svc>] [--kind <kind>] [--since <dur>]
```

### `sigil replay`

```
sigil replay <eval-id>
```

Re-execute an eval bit-for-bit from its reproducibility tuple and diff against the stored result.

### `sigil trust show`

```
sigil trust show --service <svc>
```

## Operations

### `sigil init`

```
sigil init --service <svc>
```

Scaffold `.sigil/` (config and tool state) plus `scenarios/<svc>/` at the project root. The generated `sigil.toml` starts with a `#:schema https://runsigil.com/schemas/sigil-config.schema.json` line so editors with TOML schema support offer completion and flag unknown keys.

### `sigil schema`

```
sigil schema config
```

Print the JSON Schema for `sigil.toml` — generated from sigil's own config types and drift-tested in CI, so it is the authoritative list of every section, key, default, and enum. The same document is published at https://runsigil.com/schemas/sigil-config.schema.json. Validate a config against it in CI, or `sigil schema config > schemas/sigil-config.schema.json` to vendor it.

### `sigil migrate`

```
sigil migrate [--apply]
```

Upgrade a project from the pre-0.27 layout — `.sigil/scenarios/<svc>/{visible,holdout,staging}/` — to `scenarios/<svc>/` with visibility carried by the file extension. **Dry-run by default**; add `--apply` to write.

Uses `git mv` so rename detection follows each file's history. Idempotent, and it verifies the scenario-id set is identical before and after, so a migration that would silently drop or rename a scenario aborts rather than reporting success. It refuses a dirty git worktree, refuses when both layouts are populated, and refuses to move an unencrypted file out of `holdout/` — in the new layout that name *means* visible, so migrating it would publish a holdout.

Scenario ids are unchanged, so ledger history stays comparable. Holdout set hashes do change once, at migration, because re-sealing yields new ciphertext; a `scenario.layout_migrated` ledger event is recorded so `replay` / `diff` can explain the discontinuity instead of presenting prior evals as corrupt.

:::note[Nothing to migrate?]
"Already migrated: no `.sigil/scenarios/` directory found" is also what you get if your project never owned a scenario tree — for instance a tool that embeds sigil as a runner over scenarios it stages itself. That is a correct answer to a different question; see [Embedding sigil as a runner](/guides/writing-scenarios/#where-requirelibx-resolves).
:::

### `sigil keys`

```
sigil keys add <name> <age1...> [--force]
sigil keys add-self [--force]
sigil keys rotate
```

Manage the age recipients that holdout scenarios are encrypted to (the [`[keys]`](/reference/configuration/#keys) table). `add` / `add-self` create the table when sigil.toml lacks one, and re-adding a name with the same recipient is a successful no-op that never prompts — safe to run repeatedly from headless provisioning. Re-adding a name with a *different* recipient confirms interactively, and fails closed without mutating sigil.toml when there is no terminal; `--force` replaces it non-interactively. After adding a recipient, run `rotate` as a current key-holder to re-seal existing holdouts to it.

### `sigil deploy` / `sigil teardown`

Manual ephemeral environment management. Mostly used for debugging.

### `sigil override`

```
sigil override <decision-id> --to <allow|review|block> --reason <text>
```

Record a human override. Appends `override.human` to the ledger.

## Hidden / advanced

### `sigil intent-mcp-server`

Internal MCP stdio server used when `provider = "claude-code"` in `[judge]`. Not usually invoked directly.
