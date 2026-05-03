# Changelog

## Unreleased

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
