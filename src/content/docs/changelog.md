---
title: Changelog
description: Release notes for sigil.
---

## Unreleased

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
