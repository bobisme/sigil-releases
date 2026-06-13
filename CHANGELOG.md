# Changelog

## Unreleased

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
