---
title: Changelog
description: Release notes for sigil.
---

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

### Added
- **`sigil run [PATHS...]`** — minimal scenario runner. No `.sigil/sigil.toml` required. Walks files/directories for `*.lua` (recursive, `lib/` skipped), runs each via the in-process scenario runtime, prints pass/fail + summary. Flags:
  - `--filter <SUBSTR>` (repeatable, OR'd, substring on path and scenario title)
  - `--tag <T>` / `--exclude-tag <T>` (existing scenario tag semantics; exclude always wins)
  - `--endpoint <URL>` (optional; surfaces a clear error at first HTTP call if unset, so browser-only / client-side scenarios can run without one)
  - Exit codes: 0 all passed, 1 some failed, 2 zero scenarios matched (pytest convention)
- **`[browser] headless` config + `SIGIL_BROWSER_HEADLESS` env override** — set to `false` to see the browser window during local development.
- **Clearer `sigil install-browser` output** — distinguishes `Reusing cached chrome …` on cache hit from `Using system chrome …` (with `--use-system`) and `Installed chrome …` (fresh download).

### Fixed
- **Native browser backend (the 0.22.x cutover default) now functional end-to-end.** The CDP bridge was previously stubbed: every `sigil.browser.*` call returned `Err(Shutdown)` in <1ms without ever launching Chrome. This release wires `JobKind::CdpCall` / `AwaitEvent` / `AwaitDownload` through the live CDP client, event router, and download tracker; primes a default page session on launch and routes `Page.*`/`Runtime.*`/etc. accordingly.
- **`NativeBrowserManager::plan_call` handles 14 of 17 `BrowserCall` variants** (was 7). Wired: `Fill`, `Wait`, `Html`, `Type`, `Press`, `Hover`, `Check`, `Select`, `Scroll`, `Checked`, `WaitDownload`, `Cookies`, `Pdf`, `Snapshot`, `Upload`.
- **`sigil install-browser` HTTPS transport** wired through asupersync — pinned Chrome-for-Testing zip downloads + verifies + extracts in a single command on a clean host. Distinct error variants for DNS / TLS / connect / partial-body / HTTP-status failures.
- **`sigil install-browser` cache-hit writes the `current` pointer** so `sigil browser doctor` doesn't immediately report the binary as missing after a successful pre-populated install.
- **`sigil browser doctor` `use_system_fallback` row** reads coherently across all four states (Sigil install + no system, Sigil install + system available, system only, neither).
- **`scenario run --deploy` retry race** — back-to-back invocations no longer fail with "Error deploying service" after killing a stale process. Port-readiness polling after SIGTERM (with SIGKILL escalation after 2s), foreign-pid guard via `/proc/net/tcp{,6}`.
- **`cdp/client` integration tests** un-`#[ignore]`d (7 tests). Root cause was a dangling reader task keeping the server-side TCP half open.
- **Workspace clippy gate** (`cargo clippy --workspace --all-targets --locked -- -D warnings`) now exits 0 (was ~213 errors in test code). Added to CI.

### Security
- **`sigil.browser.upload` routes every file path through a per-scenario path sandbox** before `DOM.setFileInputFiles`. Previously caller-supplied paths went straight to Chrome, letting an untrusted scenario attach any file on the host (`/etc/passwd`, SSH keys, etc.) to a form. The sandbox canonicalizes paths after symlink resolution, rejects escapes (`OutsideAllowedRoots`), and fail-closes on a missing root. Allowed root is the **scenario file's parent directory**, so uploads can only reach fixtures sitting next to the scenario.

### Performance
- **Native browser only launches when a scenario declares `"browser"` capability.** Previously every scenario eagerly spawned Chrome (twice — once per PR/baseline env) before policy was even parsed. Pure-HTTP scenarios in `sigil eval --tag health` went from ~282ms/scenario to ~1ms/scenario.
- **Lazy browser-init backstop**: even browser-declared scenarios that never actually call the browser don't pay launch cost.
- Mis-declared scenarios that call `sigil.browser.*` without the `"browser"` capability now fail with a clear policy error instead of silently launching Chrome anyway.

### BREAKING (carried from prior cutover)
- `[browser] backend` default flipped from `cli` to `native`. Browser scenarios now run in-process via the `sigil-browser` crate by default. The CLI backend (`agent-browser`) shell-out path was removed; `backend = "cli"` still deserialises (so existing configs do not fail to parse) but every `sigil.browser.*` call returns a structured "removed" error directing operators to set `backend = "native"`.

## [0.21.0] — 2026-04-30

### Added
- **Scenario DSL**:
  - `sigil.sleep()` primitive for timing control with budget enforcement
  - `sigil.expect_status_class()` helper for HTTP response class assertions (2xx, 4xx, 5xx)
  - Per-scenario reset hook via `[scenario.reset]` config
  - Per-call `base_url` override on HTTP methods

- **Scenario management**:
  - `scenario promote` command for staging → holdout workflow
  - Holdout split support during promotion
  - `--seed` flag for deterministic scenario generation
  - Tag-based filtering: `--tag` and `--exclude-tag` selectors for all scenario commands
  - Scenario-level skip directives with reasons in reports

- **Scenario generation**:
  - `--filter` and `--limit` flags for scenario generate plan scope
  - Per-case logging in scenario generation

- **Judge system**:
  - `--judge-model` flag to compare judge outputs across different models
  - `sigil compare` command for side-by-side judge evaluation

- **Configuration**:
  - Prompt injection of configured `SIGIL_SEED_KEYS` into generation
  - Enhanced few-shot examples for spec-to-logs mapping
  - Improved JSON error handling with mode hints

### Fixed
- Scenario `run` and `dry-run` now honor skip directives
- Promotion correctly handles staging paths
- Staging-category names no longer leak into scenario tags
- Judge output now deterministic across runs (fixed parameter settings)

## [0.20.1-rc.1] — 2026-04-21

### Added
- **Scenario generation CLI**:
  - `sigil scenario generate` orchestrator for end-to-end generation
  - Stage 3 execution validation (opt-in via `--verify` flag)
  - Scenario-level skip with reason surfacing in eval reports
  - `--tag` / `--exclude-tag` selectors for `scenario run` and `scenario dry-run`
  - `scenario promote` subcommand for staging → visible/holdout split

- **Scenario DSL enhancements**:
  - `--seed` flag for deterministic generation
  - `--filter` and `--limit` for generation scope control

- **Judge system**:
  - `--judge-model` flag for cross-model comparison
  - `sigil compare` command
  - Claude-code provider for judge with structured output

- **CI integration**:
  - `sigil ci` command for PR evaluation and GitHub status
  - Config context resolution via frontmatter

- **Browser automation**:
  - `sigil.browser` API: `open`, `click`, `fill`, `wait`, `text`, `html`, `title`, `url`, `screenshot`, `eval`, `cookies`, `snapshot`, `visible`
  - Session isolation per scenario

- **Agentic intent**:
  - `sigil.intent()` for LLM-driven scenario execution
  - Tool-use with automatic tool descriptors
  - Capture fields for structured data extraction
  - Thinking model support

- **CLI enhancements**:
  - `sigil keys add-self` for key management
  - `sigil scenario run --all` for batch execution
  - `sigil feedback --last` for agent dev loop
  - `--no-baseline` flag for `sigil eval`
  - `--deploy` flag for `sigil scenario run` (self-contained execution)
  - Progress reporting for eval and scenario run
  - Format auto-detection and shell completion

### Fixed
- Judge parameter settings for deterministic output
- Judge provider argument handling
- Scenario CLI log buffer handling
- Scenario skip directive processing

## [0.20.0] — 2026-03-05

### Added
- **Kubernetes backend**:
  - `sigil eval` now supports Kubernetes deployments via kubectl
  - Configure via `[deploy]` section in sigil.toml

- **Container backends**:
  - Bare container backend for `docker run` / `podman run` single-container services
  - Configurable compose command (docker-compose, podman-compose, etc.)

- **Endpoint management**:
  - `--pr-endpoint` flag to evaluate against specific PR endpoint
  - `--baseline-endpoint` flag to evaluate against specific baseline endpoint

- **Documentation**:
  - Comprehensive Scenario DSL user reference
  - CLI help text improvements with examples

## [0.19.0] — 2026-03-05

### Added
- **Deploy backend selection**: Configure primary backend in `sigil.toml`
- **Compose CLI flexibility**: Support for podman-compose, docker-compose variants
- **Endpoint control**: `--pr-endpoint` and `--baseline-endpoint` flags for custom deployments

## [0.18.0] — 2026-03-05

### Added
- **GitHub Actions integration**: Deploy and verify via GitHub workflows
- **CLI improvements**: Long help text, workflow examples, agent-friendly documentation

## [0.17.0] — 2026-03-05

### Added
- **Attestations**: In-toto attestation generation and Ed25519 signing
- **Output formats**:
  - JSON format shorthand: `--json` alias for `--format json`
  - Format auto-detection: pretty for TTY, text for pipes
  - Shell completion generation

- **Diagnostics**:
  - Enhanced `sigil doctor` with comprehensive prerequisite checks

## [0.16.0] — 2026-03-05

### Added
- **Dashboard**: Web UI for eval and trust overview
- **Trust commands**:
  - `sigil trust show`: View current trust state
  - `sigil trust history`: Review trust transitions
  - `sigil trust mode`: Check and transition trust levels

- **Eval enhancements**:
  - Failure-triggered baseline re-check
  - `sigil report`: Reconstruct eval reports from ledger

- **Policy hooks**: Optional OPA/Rego policy verification

## [0.15.0] — 2026-03-05

### Added
- **Adaptive evaluation**: Early termination based on confidence
- **LLM judge**: `sigil.judge()` Lua API for semantic assertions
- **Judge configuration**: `[judge]` section in sigil.toml with provider selection
- **Evaluation**: `sigil diff` for comparing two evaluation results
- **Judge providers**: Support for multiple judge backends

## [0.14.0] — 2026-03-05

### Added
- **Replay**: `sigil replay` to re-execute scenarios from recorded artifacts
- **Reporting**: `sigil report` to reconstruct reports from ledger

## [0.13.0] — 2026-03-05

### Added
- **Security gates**:
  - Automated secret scanning (trufflehog)
  - Dependency vulnerability scanning (trivy)
  - Static analysis (semgrep) for code quality checks

## [0.12.0] — 2026-03-05

### Added
- **Parallel execution**: Concurrent scenario runs for faster evaluation
- **Judge consensus**: Quorum voting across multiple judge instances

## [0.11.0] — 2026-03-05

### Added
- **Trust model**: Per-service trust scoring
- **Judge fallback**: Automatic fallback to secondary model on provider failure

## [0.10.0] — 2026-03-05

### Added
- **GitHub Actions**: `sigil-action` workflow integration

## [0.9.0] — 2026-03-05

### Added
- **Policy engine**: `sigil decide` with threshold-based approval

## [0.8.0] — 2026-03-05

### Added
- **Evaluation reports**: JSON eval reports with detailed results

## [0.7.0] — 2026-03-05

### Added
- **Baseline comparison**: `sigil eval` compares PR against baseline
- **Satisfaction scoring**: Quantified results vs baseline

## [0.6.0] — 2026-03-05

### Added
- **Scenario execution**: `sigil eval` runs scenarios against deployed environments
- **Type stubs**: `sigil generate-types` for LuaLS IDE support
- **Blob store**: Content-addressed artifact storage with integrity verification

## [0.5.0] — 2026-03-05

### Added
- **Scenario runner**: `sigil scenario run <scenario>` for local development
- **HTTP client**: `sigil.get()`, `sigil.post()`, `sigil.put()`, `sigil.patch()`, `sigil.delete()`
- **CLI runner**: `sigil.exec()` for command execution

## [0.4.0] — 2026-03-05

### Added
- **Project setup**: `sigil init` scaffolds new sigil projects
- **Health checks**: `sigil doctor` validates environment and dependencies
- **Lua API**: `sigil.*` globals: `env()`, `json()`, `yaml()`

## [0.3.0] — 2026-03-05

### Added
- **Scenario DSL**:
  - `expect(expr)` with power assertions
  - `invariant(name, opts)` for property testing
  - Generators: `sigil.gen.string()`, `sigil.gen.int()`, etc.

- **Key management**: `sigil keys` commands for scenario encryption
- **Holdout scenarios**: Support for hidden test scenarios
- **Scenario management**: `sigil scenario list`, `sigil scenario dry-run`

## [0.2.0] — 2026-03-05

### Added
- Initial public release
- Core evaluation engine
- Scenario support with Lua DSL
- Docker Compose deployment
- Basic evaluation reporting
