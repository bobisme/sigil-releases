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
sigil run [PATHS...] [--filter <SUBSTR>] [--tag <T>] [--exclude-tag <T>] [--endpoint <URL|NAME=URL>] [--endpoints-from <PATH>] [--env KEY[=VALUE]] [--lib-dir <DIR>] [--allow-origin <URL>] [--allow-cross-origin] [--deny-capability <NAME>] [--reset [NAME=]METHOD:/path] [--resets-from <PATH>] [--seed <64-hex|auto>] [--json]
```

Minimal scenario runner — runs `.lua` files directly without requiring `.sigil/sigil.toml`, the eval pipeline, or a ledger. Each positional is a file or a directory (recursive walk for `*.lua`, `lib/` skipped). `--filter` is substring-matched against scenario file path and `title` (repeatable, OR'd). `--tag` / `--exclude-tag` use the same semantics as `sigil scenario run` (exclude always wins). `--endpoint` is optional — surfaces a clear error at first HTTP call if a scenario needs one. Exit codes: `0` all passed, `1` some failed, `2` zero scenarios matched (pytest convention).

- `--env KEY[=VALUE]` (repeatable) — populate `sigil.env()`. `KEY=VALUE` sets a literal value (only the first `=` splits, so values may contain `=`); bare `KEY` passes the value through from sigil's own process environment, keeping secrets off the command line. Strict allowlist: only named keys are visible to the scenario; duplicates are last-wins. If a selected plugin operation needs a granted name that is absent, trusted human output names the exact `--env KEY` to add; JSON, eval feedback, and ledger evidence omit the name and value.
- `--lib-dir <DIR>` — the directory `require('lib.<module>')` resolves inside, for every scenario in the run. Defaults to the **discovery anchor** joined with `lib`: a directory argument itself, or a file argument's parent — the same anchor the scenario id is derived from. Name it explicitly when staging a tree whose helpers do not sit there. Validated up front, so a missing directory aborts the invocation rather than surfacing as a require failure partway through the suite. When a helper is missing at run time, the error names the anchor it was resolved from and suggests this flag if it was not already given. See [Writing Scenarios](/guides/writing-scenarios/#where-requirelibx-resolves).
- `--endpoint <NAME=URL>` — declare a named route, alongside the bare-URL form that sets the primary HTTP base URL. An HTTP(S) named route is reachable from Lua as `sigil.service("name")` and enters the HTTP origin pin set. A named non-HTTP route such as `--endpoint s2sql=mysql://127.0.0.1:3306` is available only to locked plugins: it never enters `sigil.service()`, the HTTP pin set, or reset targets, and the plugin grant still controls TLS. Repeatable and validated up front.
- `--endpoints-from <PATH>` — load a flat service map (`-` reads stdin), so a tool that already knows the box can feed sigil directly: `rig services --format json | sigil run scenarios/ --endpoints-from -`. Entries use the same HTTP-versus-plugin-only split as named `--endpoint` flags. Bare non-HTTP entries require an explicitly written port; a written scheme default such as `ws://host:80`, `wss://host:443`, or `ftp://host:21` counts as explicit. The primary endpoint stays argv-only; a name declared in both inputs is an error. A bad file, JSON value, or route aborts before any scenario runs and names the source path, offending key, and cause. A grant target resolves the exact map key, including dots: `singlestore-pipelines.sql:3306` resolves only `singlestore-pipelines.sql`, never the base `singlestore-pipelines`. The published URL port replaces the logical port, while a bare primary endpoint is never inferred as plugin authority.
- `--allow-origin <URL>` (repeatable) — allowlist one specific extra origin on top of the declared set, keeping pinning enforced for everything else. Each value must be a bare `scheme://host[:port]`. Prefer this over `--allow-cross-origin` whenever the extra origins are known in advance.
- `--allow-cross-origin` — disable endpoint pinning. By default every HTTP call and redirect is confined to the run's **declared origins** — the `--endpoint` origin (when a bare one is given), every named service origin, and every `--allow-origin` value; a cross-origin `base_url` is a runtime error. A run that declares only named services (no bare `--endpoint`) is pinned to exactly those service origins; only a run that declares no origins at all is unpinned. This flag restores the old unconfined behavior — only use it for trusted scenarios (see the security note in `--help`).
- `--reset [NAME=]METHOD:/path` (repeatable) — send an HTTP request before **every** scenario: `METHOD:/path` targets the primary `--endpoint`, `NAME=METHOD:/path` targets a named service declared with `--endpoint name=url` / `--endpoints-from`. Any 2xx is success. A hook targeting the primary needs a bare `--endpoint`; a `NAME` nobody declared is an error listing the declared names. All of it is validated before the first scenario runs, with the same rules as `[scenario.reset]`.
- `--resets-from <PATH>` — load reset hooks from a JSON array (`-` reads stdin) whose elements carry the same fields as a `[[scenario.reset]]` entry: `method`, `path`, `service`, `headers`, `body`, `expected_status` — for hooks that need headers, a body, or an exact status. Order is `--reset` flags in argv order, then file entries in file order. A hook that fails at run time fails that scenario **without executing its body**, reported with `failure_class = "crash"` (tooling, not behavior). Hooks only ever reach the primary or a declared service with a relative path, so they add no pinning surface.
- `--deny-capability <NAME>` (repeatable) — refuse to run scenarios that declare or use this capability. Nothing is denied by default; an unknown name aborts the invocation. Enforced fail-closed: a scenario that declares or calls a denied capability fails lint (`E007`) before it executes — reported with `failure_class = "capability"` — and the runtime installs a denying stub regardless of what the scenario declared. **`sigil.exec` runs `sh -c <command>` on the host running sigil, not inside any container**; pass `--deny-capability exec` when running third-party or agent-authored scenarios. Projects with a `sigil.toml` set the same list in `[eval] denied_capabilities`.
- `--seed <64-hex|auto>` — choose the 32-byte root for deterministic generators. `auto` is the default and uses fresh OS entropy; an exact 64-hex value reproduces the same per-scenario sample stream. Human output prints the chosen seed and JSON records it as top-level `rng_seed`.
- `--json` — emit a machine-readable report on stdout instead of human output. The top level includes `rng_seed`; per-scenario entries are `{id, title?, status, duration_ms, failure_class?, plugin_failure?, checks, expects, logs, attachments, error?, diagnostic?}` — `logs` is every `sigil.log` message in call order and `attachments` the `sigil.attach` name→value map (both always present, empty when unused). `failure_class` is `"assertion"` (a behavior problem, including an uncaught expectation in `require("lib.x")`), `"crash"` (a tooling/scenario problem), `"pinning"` (an endpoint-pinning violation — a cross-origin `base_url` override or redirect blocked by the runtime origin gate), `"capability"` (a capability denied by `--deny-capability` / `[eval] denied_capabilities`), or `"plugin_infrastructure"` (the plugin host could not make the requested behavior available), omitted for passing scenarios. An exact typed plugin-infrastructure failure always retains its fixed safe `error` and a bounded source-free `diagnostic`, and adds `plugin_failure = {code, stage, operation?, message}`; the optional operation is absent when none was recorded. The diagnostic uses only the closed error code and fixed operator summary rather than a Lua code frame, because source text could repeat a plugin identity, grant, route, or secret name. This bounded direct-run projection never contains plugin identity or version, routes, source chains, secret names, or secret values. It is not the agent-visible evaluation feedback schema, which keeps its coarse isolation-wall marker.

For PR evaluation, scoring, ledger writes, baseline comparison, and decision policy use `sigil eval` instead.

### `sigil scenario lint` / `lint-path`

```
sigil scenario lint [--service <svc>]
sigil scenario lint-path <paths...> [--json]
```

`lint` parses + static-checks every scenario in a configured project (capabilities, metadata, sandbox-safety rules). E009 requires a literal top-level `return { ... }`, because dynamically built metadata cannot be reviewed statically; the literal table may delegate its `run` field to a helper. `lint-path` lints arbitrary `.lua` files **without** a `.sigil/` project layout — the same rule set, with machine-readable findings under `--json` (`{file, code, severity, message, line, span}`). Exit `0` when clean, nonzero when any error-severity finding is present.

### `sigil scenario run`

```
sigil scenario run [SCENARIO_ID | --all] [--service <svc>] [--endpoint <URL>] [--seed <64-hex|auto>] [--format human|json] [--allow-cross-origin]
```

Run scenarios from a configured project. `--seed` and `--format json` use the same seed/report contract as `sigil run` (one schema across both runners). Endpoint pinning applies here too, with the project's `[eval] allowed_origins` allowlist permitting known sidecar origins. Locked network plugins resolve direct routes only from matching named `[eval] services`, never from the primary `--endpoint`.

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

## Plugins

Plugins are project dependencies, not global extensions. The per-user store is
an immutable byte cache; `[plugins.require]` plus
`.sigil/sigil.plugins.lock` is runtime authority. See [Using WebAssembly
Plugins](/guides/plugins/) for the complete workflow.

### `sigil plugin add` / `remove`

```sh
sigil plugin add NAME[@VERSION]
sigil plugin add github:OWNER/REPO@VERSION
sigil plugin remove NAME
```

`add` resolves and installs the requested release when necessary, creates a
minimal schema-linked `.sigil/sigil.toml` when the directory is not yet a
project, writes an exact formatting-preserving requirement, and transactionally
refreshes the lock and managed `.sigil/types/wasm/` stubs. `remove` deletes that
project requirement, lock entry, and managed stub while retaining cached package bytes.
A failed transaction restores the original config bytes.

### `sigil plugin lock` / `sync`

```sh
sigil plugin lock
sigil plugin lock --update NAME
sigil plugin sync
```

`lock` resolves `[plugins.require]` into exact source, version, digest, host-API,
and publisher-evidence records. It retains compatible entries and refuses a
source change unless `--update NAME` makes that change explicit. `sync` is the
CI operation: it installs only exact packages already approved by the lock and
never mutates the config, lock, stubs, or cache selection. A fresh clone does
not need `.sigil/types/wasm/` for sync or execution; those are editor aids, and
`sigil generate-types` can recreate them from the exact lock.

Remote plugin commands honor the standard proxy environment variables and,
in Sigil 0.32.6 or newer, the operating system TLS trust store. See
[Corporate proxies and TLS inspection](/guides/plugins/#corporate-proxies-and-tls-inspection)
for enterprise-network diagnostics.

### Store and inspection commands

```sh
sigil plugin install NAME[@VERSION]
sigil plugin list
sigil plugin list-remote [NAME]
sigil plugin info NAME[@VERSION]
sigil plugin verify NAME[@VERSION]
sigil plugin use NAME@VERSION
sigil plugin update [NAME]
sigil plugin uninstall NAME@VERSION --force
sigil plugin uninstall NAME --all --force
```

`install` prints `Installed NAME@VERSION` followed by digest and acquisition
evidence. These commands operate on the per-user store and `current` authoring
selection only; they do not make a plugin available to a scenario.

### Package author commands

```sh
sigil plugin validate ./plugin.toml
sigil plugin inspect ./plugin.wasm
sigil plugin pack ./plugin.toml --output-dir ./dist
sigil plugin install --path ./dist/name-version.sigil-plugin.tar.zst
```

`pack` emits a deterministic canonical archive. `validate` and `inspect` do not
grant execution authority. A locally installed archive can be inspected and
cached but cannot become a project dependency or execute in a scenario.

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
