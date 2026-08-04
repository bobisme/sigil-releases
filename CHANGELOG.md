# Changelog

## Unreleased

## [0.28.0] — 2026-08-01 — Field Reports

Five field reports and what they turned up. No breaking changes; no migration. The through-line is failures that reported the *wrong* thing rather than nothing — a config field parsed and validated and then dropped, a decision cap that was correct but unexplained, a deployment that hung with no decision emitted, a helper path resolved against the wrong directory.

- **`sigil run` resolves `require('lib.x')` from the scenario tree you named**, not from its own working directory. It previously resolved `lib/` the way the configured modes do — against a `[[scenarios]]` root — despite having no config to read, and so fell through to a *relative* `scenarios/run/lib/`. A scenario tree staged anywhere else could not load its own helpers at all; and because the path was relative it resolved against sigil's working directory, so a run launched from inside another repository would read *that* repository's helpers if it had any. Resolution now uses the discovery anchor — the directory argument a scenario was found under, or a file argument's parent — as an absolute path. See [Where `require('lib.X')` resolves](/guides/writing-scenarios/#where-requirelibx-resolves).
- **`sigil run --lib-dir <DIR>`** names that directory outright, for tools that embed sigil as a runner over a tree they stage themselves. Validated before any scenario runs, so a bad value aborts the invocation instead of surfacing as a require failure partway through a suite.
- **`[deploy].startup_timeout` is honored instead of silently ignored.** No code read it at all: it was parsed, defaulted, validated and documented, then dropped, for every backend. It now bounds the compose start command — image pull, container create/start — while `health_timeout` continues to bound the readiness poll, so each name means the phase it describes.
- **A wedged `docker compose up` can no longer hang an eval forever.** It ran with no deadline, so a stuck registry pull blocked indefinitely with no decision emitted. It is now killed and reaped on expiry and fails closed. Teardown stays unbounded deliberately — a cut-short `down` would leak containers.
- **`sigil eval --failure-artifact <FILE>`** writes a fixed-vocabulary failure phase as JSON on every terminal outcome, including runs that produce no eval report. A caller that must preserve holdout secrecy can now tell a failed deploy leg from an undecryptable scenario set from an uncovered strict MUST from an internal evaluator error, without parsing stderr. The artifact carries only that closed vocabulary and config field names — never scenario ids, endpoints, rubric text, config values, or raw error strings. Each structured deployment failure also reports which config fields came from the working checkout, the control snapshot, a CLI flag, or the environment.
- **`sigil decide` explains the mode cap.** Only `auto` can ever ALLOW, so a clean evaluation in `shadow` or `advisory` returns REVIEW — unchanged, but previously unexplained. The rationale now carries `shadow_mode_cap` / `advisory_mode_cap` / `policy_mode_unset_cap`, and `--json` adds `policy_mode`, `mode_ceiling`, `mode_capped` and the full `lattice`. A REVIEW that came from real findings carries no cap code, so an operator can confirm a clean shadow run without opening a protected report.
- **`sigil keys add` works on a fresh project and is idempotent.** It creates the `[keys]` table when sigil.toml lacks one, and re-adding a name with the same recipient is a successful no-op that never prompts — safe to run repeatedly from headless provisioning. Re-adding with a *different* recipient still confirms interactively, but now fails closed without mutating sigil.toml when there is no terminal to confirm on; `--force` replaces it non-interactively.

## [0.27.0] — 2026-07-29 — Scenario Store Layout

**Breaking: existing projects must run `sigil migrate`** — dry-run by default, add `--apply` to write. Scenario ids are unchanged by the move, so ledger history stays comparable.

- **Scenario source moves out of `.sigil/` to the project root.** `.sigil/scenarios/<svc>/{visible,holdout,staging}/` becomes `scenarios/<svc>/`. `.sigil/` now holds only tool state — config, blobs, ledger, proofs, generated type stubs — while scenarios live where they can be found and edited like any other source. See [Writing Scenarios](/guides/writing-scenarios/#file-layout).
- **The file extension is the source of truth for visibility.** `foo.lua` is visible, `foo.lua.age` is an age-encrypted holdout, `foo.staged.lua` is generated output awaiting promotion. `lib/` is the only reserved directory name. Three invalid states stop being representable: a plaintext `.lua` under `holdout/` was a leaked holdout, and there is no `holdout/` now; a directory and an extension could disagree about visibility, and there is one signal; and promoting a scenario was a cross-tree move that broke `git log --follow`, where it is now an encrypt in place at the same path.
- **`sigil migrate`** — one command to upgrade. Refuses a dirty git worktree, refuses when both layouts are populated, and refuses to move an unencrypted file out of `holdout/` (in the new layout that name *means* visible, so migrating it would publish it). Uses `git mv` so history follows each file, is idempotent, and verifies the scenario-id set is identical before and after — a migration that would silently drop or rename a scenario aborts rather than reporting success.
- **Promoting to holdout without configured recipients is now an error.** It previously warned and wrote plaintext, which was survivable when a directory carried the designation. Now that visibility *is* the extension, an unencrypted holdout is indistinguishable from a visible one, so that path silently published held-out scenarios to the coding agent. Promotion is all-or-nothing.
- **`[[scenarios]]` config, with multi-root support for monorepos.** Declare where scenario trees live, and colocate them with the service they exercise rather than forcing one central tree. Each root resolves its own `lib/`. Replaces the old `[scenarios]` table. See [Configuration](/reference/configuration/#scenarios).
- **Sealed-recipient manifests are embedded in the age header**, replacing the `.sealed.json` sidecar. A manifest cannot drift from the file it describes, is readable with no key at all — the point being that you need to know who a bundle was sealed to precisely when you cannot open it — keeps the file decryptable by stock `age` / `rage`, and is covered by age's header MAC, so a forged recipient list makes the file fail to decrypt. It remains an assertion, not proof of identity: a missing manifest means *unknown* recipients, never *verified*.
- **Holdout scenario set hashes change once, at migration.** Re-sealing yields new ciphertext, and an embedded manifest changes which digest is hashed. `sigil migrate` records a `scenario.layout_migrated` ledger event so `replay` / `diff` can explain the discontinuity instead of presenting prior evals as corrupt.

## [0.26.0] — 2026-06-25 — Decision-Gate Hardening + Structured Judge

- **Security gates fail closed.** Mark a scanner `required` and a scanner that can't run — missing binary, timeout, or unparseable output — now blocks the merge instead of silently passing. New per-scanner modes (`disabled` / `advisory` / `required`) and a configurable per-scanner timeout (default 120s).
- **The security report now reaches the decision.** Fixed: scan findings were not being carried into `sigil decide`, so a failing security gate didn't actually influence ALLOW / REVIEW / BLOCK. Findings are now round-tripped from the eval through to the decision end-to-end.
- **An eval without durable evidence can't ALLOW.** If sigil can't persist the report, scenario evidence, eval DAG, or ledger event, the eval is marked degraded and the decision drops to REVIEW — a score you can't reproduce shouldn't earn autonomy.
- **More reliable LLM judging.** The judge now uses structured tool/function calling instead of parsing prose, so verdicts come back as typed values — no more "the model wrote an essay instead of JSON," and no fragile score-scraping. Works across OpenAI-compatible, tool-calling, and command providers, with a JSON-mode fallback; malformed output is a judge failure, never a silent pass.
- **Faster ad-hoc contracts.** A one-line scenario — `return { run = function() ... end }` — now runs as-is: capabilities are inferred from the body and `priority` is optional on the `sigil run` path. Committed suites still get the full strict `sigil scenario lint`.
- **New guide: the contract handoff.** An end-to-end walkthrough of authoring a contract in sigil, packaging it as a `.wic`, and verifying it as a provider with wraith — including the exit-code and `failure_class` mapping.

## [0.25.0] — 2026-06-13 — Intent-Contracts Surface + Untrusted-Input Hardening

- **`sigil.check(expr, label)`** — advisory checks: a nonfatal tier alongside `expect()`. Outcomes are recorded in the report but never fail the scenario or change the exit code. The expression is evaluated defensively, so a check against a field that drifted away (e.g. `auth.json.id`) records an evaluation error instead of crashing the run. Each appears in a per-scenario `checks[]` block.
- **`sigil run --env KEY[=VALUE]`** — docker-style, repeatable. `--env FOO=bar` sets a value; bare `--env FOO` passes a value through from sigil's own environment so secrets never appear on the command line. Strict allowlist: only named keys reach `sigil.env()`.
- **Endpoint pinning (security).** By default `sigil run` confines every HTTP call and redirect to the `--endpoint` origin — a scenario can no longer redirect a request to an arbitrary host (cloud metadata endpoints, attacker origins) via `base_url`, even one built at runtime. `--allow-cross-origin` opts out. In configured modes, a `[eval] allowed_origins` allowlist permits known sidecars.
- **Machine-readable failure detail in `--json`.** Per-scenario entries now carry `failure_class` (`"assertion"` vs `"crash"`) and an `expects[]` array recording every `expect()` outcome with its source and lifted `---` description — so tools can branch on outcomes without scraping error text.
- **`sigil scenario lint-path <paths...> --json`** — lint arbitrary `.lua` files with machine-readable findings, no project layout required.
- **`sigil scenario run --format json`** — the configured runner now emits the same report schema as `sigil run --json`.
- **New scenario lints** — unknown capability names (E005) and the `wraith` helper capability declaration (E006) are now caught statically.
- **Faster, hardened scenario parsing.** An owned Lua 5.4 lexer replaces the previous tokenizer on the scenario-rewriting path: ~2.5× faster, and hardened so malformed or hostile scenario files fail with a normal report entry instead of ever crashing the `sigil` process. Deep nesting, runaway memory allocation, and pathological input are all bounded; a scenario's declared time budget is now honored (capped at the operator's ceiling).

## [0.24.0] — 2026-06-07 — Native Browser Hardening

- **`sigil run --json`** — machine-readable run report on stdout (`{status, total, passed, failed, scenarios:[…]}`); exit codes unchanged, human output still the default.
- **`sigil run` is quiet by default** — internal browser-session logs are gated behind `RUST_LOG=info`; in `--json` mode all logs stay on stderr so stdout is valid JSON.
- **Browser reliability** — `open`/`reload`/`back`/`forward` wait for the page load event before returning; the remaining `sigil.browser.*` getters (`value`, `attr`, `count`, `visible`, `enabled`, …) are wired and now raise on backend errors instead of silently reporting `false`; `screenshot("path")` writes a sandboxed PNG file.
- **Migrated to the published `asupersync` 0.3.2 crate** (capability-secure IO model), fixing CI.

## [0.23.0] — 2026-05-27

- `sigil run [PATHS...]` — minimal scenario runner with no `.sigil/sigil.toml` required. Walks files/directories for `*.lua`, runs each, prints pass/fail. Flags: `--filter <SUBSTR>` (repeatable, substring on path + title), `--tag` / `--exclude-tag` (existing scenario tag semantics), `--endpoint <URL>` (optional; required at first HTTP call). Exit codes 0 / 1 / 2 for all-passed / some-failed / no-match (pytest convention).
- Native browser backend (the 0.22.x cutover default) is now functional end-to-end. The CDP bridge, primary-page session attach, and 14 of 17 `BrowserCall` variants (Fill, Wait, Html, Type, Press, Hover, Check, Select, Scroll, Checked, WaitDownload, Cookies, Pdf, Snapshot, Upload) all work against real Chrome-for-Testing.
- `sigil install-browser` actually downloads on a clean host — HTTPS transport wired through asupersync. Cache-hit path now writes the `current` pointer so `sigil browser doctor` doesn't immediately report the binary as missing.
- `[browser] headless` config option + `SIGIL_BROWSER_HEADLESS` env override. Set to `false` to see the browser window during local development.
- `sigil install-browser` distinguishes its output: `Reusing cached …` on cache hit, `Using system …` for `--use-system`, `Installed …` for a fresh download.
- **Security**: `sigil.browser.upload` now routes every file path through a per-scenario sandbox (canonicalize-after-symlink-resolve, fail-closed). Untrusted scenarios can no longer attach arbitrary host files (`/etc/passwd`, SSH keys, etc.) to forms.
- **Performance**: native browser only launches for scenarios that declare `"browser"` capability. Pure-HTTP scenarios in eval went from ~282ms/scenario to ~1ms/scenario (Chrome startup eliminated). Mis-declared scenarios fail with a clear policy error instead of silently launching.
- `scenario run --deploy` no longer races on back-to-back invocations: port-readiness polling after SIGTERM (with SIGKILL escalation), foreign-pid guard prevents killing unrelated processes if the pid file is stale.
- Workspace clippy gate (`cargo clippy --workspace --all-targets`) now exits 0; added to CI.

## [0.21.0] — 2026-04-30

- `sigil.sleep()` primitive for timing control
- `sigil.expect_status_class()` for HTTP response class assertions
- `scenario promote` command for staging → holdout workflow
- `--seed` flag for deterministic scenario generation
- `--judge-model` flag and `sigil compare` command
- Per-scenario reset hooks via `[scenario.reset]` config
- Per-call `base_url` override on HTTP methods
- `--filter` and `--limit` for scenario generation
- Tag-based filtering for scenario commands
- Improved few-shot examples for prompt steering
- Bug fixes for scenario skip directives and tag handling

## [0.20.1-rc.1] — 2026-04-21

- `sigil scenario generate` orchestrator
- Stage 3 execution validation (`--verify` flag)
- Browser automation API: `sigil.browser.*`
- Agentic intent executor: `sigil.intent()`
- `sigil ci` for GitHub PR evaluation
- `sigil compare` for cross-model judge comparison
- Claude-code judge provider
- Structured data extraction via capture fields
- `--judge-model` flag
- `sigil keys add-self`, `sigil scenario run --all`, `sigil feedback --last`
- `--no-baseline` flag for eval
- Progress reporting for eval and scenario run

## [0.20.0] — 2026-03-05

- Kubernetes backend support
- Bare container backend (docker/podman run)
- `--pr-endpoint` and `--baseline-endpoint` flags
- Configurable compose command
- Comprehensive Scenario DSL documentation

## [0.19.0] — 2026-03-05

- Config-driven deploy backend selection
- Compose CLI flexibility (podman-compose, docker-compose)

## [0.18.0] — 2026-03-05

- GitHub Actions integration
- Improved CLI help text and examples

## [0.17.0] — 2026-03-05

- In-toto attestations and Ed25519 signing
- `--json` shorthand for all format flags
- Format auto-detection and shell completion
- Enhanced `sigil doctor` diagnostics

## [0.16.0] — 2026-03-05

- Dashboard for eval and trust overview
- `sigil trust show/history/mode` commands
- `sigil report` for reconstructing eval reports
- OPA/Rego policy hooks

## [0.15.0] — 2026-03-05

- Adaptive evaluation with early termination
- `sigil.judge()` for semantic assertions
- `[judge]` configuration section
- `sigil diff` for comparing evaluations

## [0.14.0] — 2026-03-05

- `sigil replay` for scenario re-execution
- `sigil report` command

## [0.13.0] — 2026-03-05

- Secret scanning (trufflehog)
- Dependency scanning (trivy)
- Static analysis (semgrep)

## [0.12.0] — 2026-03-05

- Parallel scenario execution
- Judge consensus via quorum voting

## [0.11.0] — 2026-03-05

- Trust scoring system
- Judge fallback models

## [0.10.0] — 2026-03-05

- GitHub Actions workflow integration

## [0.9.0] — 2026-03-05

- `sigil decide` policy engine

## [0.8.0] — 2026-03-05

- JSON eval reports

## [0.7.0] — 2026-03-05

- Baseline comparison
- Satisfaction scoring

## [0.6.0] — 2026-03-05

- `sigil eval` for scenario execution
- `sigil generate-types` for IDE support
- Blob store with integrity verification

## [0.5.0] — 2026-03-05

- `sigil scenario run` for local development
- HTTP client: `sigil.get()`, `sigil.post()`, etc.
- `sigil.exec()` for CLI commands

## [0.4.0] — 2026-03-05

- `sigil init` project scaffolding
- `sigil doctor` health checks
- Lua globals: `sigil.env()`, `sigil.json()`, `sigil.yaml()`

## [0.3.0] — 2026-03-05

- `expect(expr)` power assertions
- `invariant()` property testing
- Generator functions
- Key management
- Scenario DSL and holdout support

## [0.2.0] — 2026-03-05

- Initial public release
