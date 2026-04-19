---
title: Invariants
description: The four guarantees sigil never violates.
---

Sigil's behavior is governed by four invariants. If any of these is violated, the system fails closed — no ALLOW, ever. These are not configuration options. They are not feature flags. They are properties of the design that testing enforces.

## 1. Fail-closed

Any error — any panic, any unhandled exception, any unreachable code path, any missing config, any unparseable scenario, any Docker failure, any LLM timeout — downgrades the decision to REVIEW or BLOCK.

There is no code path in Sigil that converts an error into ALLOW. This is enforced by the type system in the `decide` crate: the error type cannot be constructed from `Decision::Allow`.

## 2. Isolation wall

Holdout scenario content — the scenario source, its identifiers, its failure messages, its expected values, anything that could let the agent infer what the holdout tests — never appears in output the agent can read.

The feedback generator is the single source of truth for this boundary. It receives only opaque step labels (`step_1`, `step_2`) and pass/fail bits. Integration tests assert this by running adversarial inputs through the feedback generator and checking that holdout content never leaks.

## 3. Reproducibility

Every eval carries a full provenance tuple:

- **Artifact digest** — content-addressed hash of the PR image.
- **Baseline digest** — content-addressed hash of the baseline image.
- **Scenario-set hash** — hash of the full (visible + holdout) scenario bundle used.
- **RNG seed** — the master seed from which all sub-seeds are derived deterministically.
- **Control ref hash** — hash of the policy configuration that governed the decision.
- **Evaluator version** — semver of the Sigil binary that ran the eval.

Given this tuple, any evaluator can re-run the same eval and get the same result bit-for-bit, modulo non-deterministic judge responses (which are themselves seeded).

## 4. Freshness gate

The append-only ledger must sync within the staleness window (default 60 seconds) before any ALLOW decision is emitted. If ledger sync fails or is stale, the decision downgrades to REVIEW.

This prevents a split-brain condition where two evaluators independently decide ALLOW based on divergent ledger state. It also means that any ALLOW is backed by a ledger entry that is globally consistent at the moment of the decision.

## Why these four

These are the smallest set of properties that prevent the failure modes that make evaluation systems untrustworthy:

- Without **fail-closed**, bugs in Sigil become green lights for bad code.
- Without **isolation**, the agent learns to game the evaluator.
- Without **reproducibility**, evaluations cannot be audited, and disputes cannot be resolved.
- Without **freshness**, evaluations become unmoored from the shared source of truth.

Any other property is nice to have. These four are load-bearing.
