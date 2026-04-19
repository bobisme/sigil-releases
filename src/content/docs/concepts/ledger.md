---
title: Ledger
description: Append-only TSJSON event log — the single source of truth for sigil decisions.
---

The ledger is Sigil's source of truth. Every decision, every trust transition, every human override, every incident report is recorded as an event in an append-only log. The log is git-backed, signed, and projected into a SQLite view for queries.

## Event types

- **`eval.complete`** — a full evaluation finished. Carries the reproducibility tuple, per-scenario results, baseline comparison, and the score.
- **`eval.decision`** — a `sigil decide` invocation resolved to ALLOW, REVIEW, or BLOCK. References the `eval.complete` it was derived from.
- **`trust.transition`** — a per-service trust state changed. Records the window stats that drove the transition.
- **`override.human`** — a human overrode a sigil decision. Records who, when, and why.
- **`incident.*`** — production incidents are linked back to the merge that caused them. Feeds the trust decay model.

## Format

Events are stored as **TSJSON** (timestamped JSON), one event per line, in files organized by date. Each event is:

```json
{
  "ts": "2026-04-18T14:23:01.442Z",
  "kind": "eval.decision",
  "service": "api",
  "artifact": "sha256:8f3c…",
  "decision": "allow",
  "trust": "auto",
  "evaluator": "sigil/0.4.1",
  "signature": "ed25519:…"
}
```

Events are signed with Ed25519 keys held by the evaluator. Signatures are verified on replay and on the SQLite projection rebuild.

## Storage

- **Authoritative** — the git repository. Every event is a commit (or part of a commit). Git distribution gives us replication, audit, and branchless history.
- **Projection** — a local SQLite view for fast queries. The projection is rebuilt from the log on demand; the projection is never authoritative.

This is the same pattern used by `sigstore` and `in-toto`. It works because writes are append-only and log compaction is never destructive.

## Querying

```sh
sigil ledger list --service api --kind eval.decision --since 7d
sigil trust show --service api
sigil replay <eval-id>
```

`sigil replay` re-executes an eval bit-for-bit from its reproducibility tuple, then compares the new result to the stored one. If they diverge, Sigil emits a non-determinism warning with the diff.

## Freshness

See [Invariants — Freshness Gate](/concepts/invariants/). The ledger must have synced with its origin within a configurable staleness window before Sigil will emit an ALLOW.
