---
title: Dark Factory
description: Why the agent never sees the holdout scenarios.
---

The **dark factory** is the core pattern that makes Sigil's decisions meaningful.

## The problem with visible tests

When a coding agent can see the test suite it will be judged against, the suite stops being a test. It becomes a specification the agent targets directly. Coverage metrics go up. Confidence goes up. Real behavior does not.

This is not a hypothetical. Agents trained or prompted against visible benchmarks routinely produce code that passes the benchmark and fails in production. The test suite leaked into the training set, literally or effectively, and the signal collapsed.

## The dark-factory pattern

Sigil splits every scenario set into two halves:

- **Visible scenarios** live alongside the code. The agent sees them, writes against them, and uses them to iterate. These are development tests.
- **Holdout scenarios** are age-encrypted per-service bundles. The agent never sees them. Sigil decrypts them inside the ephemeral evaluation environment, runs them, and then destroys that environment. The results surface as opaque step labels (`step_1`, `step_2`) with no scenario identity, no scenario content, no failure messages that could reveal what was tested.

The agent gets exactly one bit of information back per holdout step: pass or fail. Nothing it could use to reverse-engineer the scenario.

## The isolation wall

Every surface that the agent can read — feedback files, commit comments, PR comments, eval reports served to the agent runtime — is filtered through a single function whose only job is to strip holdout content. This is enforced by construction: the feedback generator has no read access to holdout scenarios' source, only to their identifiers and their pass/fail results.

If the isolation wall breaks, it breaks visibly. The integration tests for the feedback generator assert that holdout scenario content does not appear in feedback output for a battery of adversarial inputs. If those ever fail, Sigil refuses to ship.

## Why this matters for merge decisions

The dark factory is what makes `sigil decide` a real signal. An ALLOW from Sigil means: the agent solved a problem it could see, under conditions it couldn't game, judged by scenarios it never saw. That's a stronger claim than any visible test suite can make.

## See also

- [Invariants](/concepts/invariants/) — the four guarantees Sigil never violates.
- [Ledger](/concepts/ledger/) — how decisions are signed and stored.
- [Writing Scenarios](/guides/writing-scenarios/) — how to structure visible vs holdout.
