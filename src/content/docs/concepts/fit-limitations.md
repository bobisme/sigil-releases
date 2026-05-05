---
title: Fit and Limitations
description: When Sigil is a good fit, where it is not yet appropriate, and what support assumptions to check before gating merges.
---

Sigil is built for teams letting coding agents open or revise production pull requests. It is strongest when the risky part of the workflow is not code generation itself, but deciding whether an agent-authored change deserves to reach main.

## Good fit

- You use Claude Code, Cursor, Devin, or a custom coding agent on real PRs.
- Your current alternative is visible tests, normal CI, and human-only PR review.
- You can express important behavior as markdown specs and executable scenarios.
- Your service can run in Docker or a reproducible CI environment.
- You want signed ALLOW, REVIEW, or BLOCK decisions with an audit trail.

## Poor fit

- You cannot deploy the service or a baseline in CI.
- You need broad static code review rather than behavior evaluation.
- You cannot safely provide test data, service secrets, or judge-provider configuration.
- You need a Windows-native install path today.
- You want to auto-merge before a service has accumulated clean evaluation history.

## Operational assumptions

Sigil assumes each protected service has explicit scenario ownership, a configured trust policy, and a ledger that can sync before an `ALLOW` decision. Any failure mode should downgrade to `REVIEW` or `BLOCK`.

## Support

For fit questions or platform support, email [info@runsigil.com](mailto:info@runsigil.com). Include your CI provider, service runtime, agent workflow, and the command you want Sigil to gate.
