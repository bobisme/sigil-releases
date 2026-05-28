---
title: CLI Reference
description: All sigil subcommands.
---

Run `sigil --help` or `sigil <subcommand> --help` for up-to-date usage. This page is a tour of the common subcommands.

## Core

### `sigil eval`

```
sigil eval <pr-ref> --service <svc> [options]
```

Deploy PR + baseline, run scenarios against both, score, and append `eval.complete` to the ledger.

### `sigil decide`

```
sigil decide <pr-ref> --service <svc>
```

Apply the threshold policy to the most recent eval for this PR and emit the decision. Exit 0 (ALLOW), 1 (REVIEW), 2 (BLOCK).

### `sigil ci`

```
sigil ci owner/repo#42 --service <svc> [--comment] [--auto-merge] [--dry-run]
```

`eval` + `decide` + GitHub integration in one. See [CI Integration](/guides/ci-integration/).

## Scenarios

### `sigil run`

```
sigil run [PATHS...] [--filter <SUBSTR>] [--tag <T>] [--exclude-tag <T>] [--endpoint <URL>]
```

Minimal scenario runner — runs `.lua` files directly without requiring `.sigil/sigil.toml`, the eval pipeline, or a ledger. Each positional is a file or a directory (recursive walk for `*.lua`, `lib/` skipped). `--filter` is substring-matched against scenario file path and `title` (repeatable, OR'd). `--tag` / `--exclude-tag` use the same semantics as `sigil scenario run` (exclude always wins). `--endpoint` is optional — surfaces a clear error at first HTTP call if a scenario needs one. Exit codes: `0` all passed, `1` some failed, `2` zero scenarios matched (pytest convention).

For PR evaluation, scoring, ledger writes, baseline comparison, and decision policy use `sigil eval` instead.

### `sigil scenario lint`

```
sigil scenario lint [--service <svc>]
```

Parse + static-check every scenario. Verifies capabilities, metadata, and sandbox-safety rules.

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
