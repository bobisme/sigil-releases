---
title: Trust Model
description: Earned autonomy — per-service trust scored from ledger history.
---

Sigil's trust model is **earned, per-service, and observable**. Every service starts with no history and climbs through four trust states as it accumulates clean evaluations. Incidents decay trust back down the ladder.

## States

| State | What it means | Behavior |
|-------|---------------|----------|
| **NONE** | No meaningful history. | All decisions route to human review. Sigil records evaluations but never recommends auto-merge. |
| **SHADOW** | Sigil is running, but its decisions are not gating anything. | Decisions are appended to the ledger; humans merge freely. Useful for calibration. |
| **ADVISORY** | Decisions are posted as status checks. | Humans see ALLOW/REVIEW/BLOCK on the PR. Merges remain human. |
| **AUTO** | Sigil gates the merge queue. | ALLOW triggers merge; REVIEW or BLOCK halts it. Humans can override, but overrides are logged. |

## Transitions

Transitions are driven by a rolling window of evaluations. The exact policy is configurable per service, but the defaults enforce:

- Minimum window size before any promotion (e.g., 50 evals).
- Minimum clean-ALLOW rate (e.g., 98% of evals that would have auto-allowed were correct, measured against downstream incident reports and human overrides).
- Cooldown after any incident — trust cannot promote during the cooldown.

## Decay

Incidents decay trust. A production incident linked to a sigil-gated merge — via the ledger's `incident.*` events — immediately drops the service by one level. Repeated incidents compound.

This means trust is never a one-way ratchet. A service can be AUTO in the morning and ADVISORY by afternoon if it shipped a regression.

## Human overrides

Humans can override Sigil decisions at any trust level via `sigil override`. Overrides are recorded to the ledger (`override.human` events) and feed back into the trust score. A pattern of humans overriding REVIEW to merge is a signal that the policy is too strict. A pattern of humans overriding ALLOW to block is a signal that the policy is too loose. Both are visible in the ledger projection.

## Why earned autonomy

Trust that comes from the outside — a config flag, a permission grant, a model name — is not trust. It is permission with a different label. Sigil's trust is built only from observed behavior, which means it is immune to the pathologies that come with trusting an agent by name.

## See also

- [Ledger](/concepts/ledger/)
- [Invariants](/concepts/invariants/)
