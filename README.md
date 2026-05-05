# sigil

**Autonomous evaluation and merge policy engine for agent-generated PRs.**

Sigil is the trust layer between coding agents and your main branch. It deploys every PR and a baseline to ephemeral Docker environments, runs sealed Lua scenarios the agent never sees, scores the result against the baseline, and emits an auditable **ALLOW**, **REVIEW**, or **BLOCK** decision.

```
sigil eval pull/42/head --service api      # evaluate against baseline
sigil decide pull/42/head --service api    # exit 0=ALLOW 1=REVIEW 2=BLOCK
sigil ci owner/repo#42 --service api       # all-in-one with GitHub integration
```

## Four invariants, non-negotiable

- **Fail-closed** — any error downgrades to REVIEW or BLOCK. Never ALLOW on failure.
- **Isolation wall** — holdout scenario content never appears in feedback the agent can see.
- **Reproducibility** — every eval carries a full provenance tuple.
- **Freshness gate** — the append-only ledger must sync before any ALLOW.

## Install

```sh
curl -fsSL https://runsigil.com/install.sh | sh
```

## Development

This repo hosts the documentation site at [runsigil.com](https://runsigil.com).

```sh
bun install
bun run dev         # dev server at http://localhost:4321
bun run build
```

Full documentation at [runsigil.com](https://runsigil.com).

## License

Sigil is distributed under the [Elastic License 2.0](./LICENSE). Free for evaluation, personal use, internal business use, and consulting. Restricts redistribution and hosted-service offerings.

## Support

For support, install questions, security/privacy review, or production-fit questions, email info@runsigil.com or open an issue on this repo.
