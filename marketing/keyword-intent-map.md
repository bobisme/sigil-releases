# Sigil ICP Wedge and Keyword Intent Map

Updated: 2026-05-05

## Positioning Statement

Sigil is a merge policy engine for engineering teams using coding agents on production pull requests. Unlike visible tests plus normal CI plus human-only review, Sigil runs sealed holdout scenarios against PR and baseline environments, records signed ledger evidence, and returns ALLOW, REVIEW, or BLOCK.

## Dominant Alternative

The dominant alternative is a normal CI test suite plus human PR review, often with the same visible tests the coding agent can read and optimize against. The wedge is hidden holdout evaluation: Sigil distinguishes code that matches visible surface tests from code that satisfies the underlying intent.

## 60-Day ICP Wedge

| Segment | Pain | Reach | WTP fit | Switching cost | Proof availability | Confidence | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| Platform/CI owners adopting coding agents for production PRs | 5 | 4 | 4 | 3 | 4 | Medium | Best first wedge. They own merge policy, CI, and branch protection. |
| Engineering founders using autonomous agents to ship faster | 4 | 4 | 3 | 2 | 3 | Medium | Fast adoption, lower procurement, good for examples and feedback. |
| Security reviewers of generated code | 4 | 3 | 4 | 4 | 3 | Low-medium | High trust burden; useful proof buyer but slower motion. |
| Devtool teams building agent workflows | 3 | 3 | 3 | 3 | 4 | Medium | Adjacent audience; may prefer APIs or internal harnesses. |

Primary 60-day wedge: platform/CI owners and technical leads already letting coding agents touch production PRs.

## Query Map

| Query cluster | Intent | Target URL | Proof needed | Next action |
|---|---|---|---|---|
| agent-generated pull request merge gate | Evaluate category | `/` | Plain definition, GitHub check preview | Install or quickstart |
| AI coding agent CI evaluation | Evaluate workflow | `/how/` | Eval pipeline, holdouts, ledger | Read quickstart |
| hidden tests for coding agents | Understand wedge | `/concepts/dark-factory/` | Isolation wall, opaque feedback | Read scenario docs |
| LLM evals for pull requests | Compare approach | `/how/` | PR vs baseline, ALLOW/REVIEW/BLOCK | Install |
| install Sigil CLI | Install | `/installation/` | Installer behavior, verification | Copy install command |
| Sigil quickstart | Activate | `/quickstart/` | Expected first decision | Run first eval |
| GitHub Actions agent PR evaluation | Integrate | `/integrations/github-actions/` | Workflow YAML, permissions | Add CI workflow |
| coding agent merge queue | Evaluate risk | `/concepts/trust-model/` | Earned autonomy tiers | Configure trust |
| sealed holdout evals | Understand mechanism | `/concepts/dark-factory/` | Visible vs holdout split | Write scenarios |
| Lua scenario DSL | Implement | `/reference/lua-dsl/` | API reference, examples | Write scenario |
| Sigil trust model | Trust/procurement | `/concepts/trust-model/` | Incident decay, overrides | Configure service |
| verify Sigil release | Install trust | `/installation/` | Release artifacts, checksum | Verify binary |
| Sigil privacy | Trust/procurement | `/privacy/` | Data flow, contact | Contact support |
| agent PR status check | Integrate | `/guides/ci-integration/` | Status context, branch protection | Require check |

## Copy Guardrails

- Keep the category noun close to the top: merge policy engine, CI merge gate, or trust layer for agent-generated PRs.
- Do not describe Sigil as a generic AI code review tool.
- Name the status quo: visible tests, normal CI, human-only PR review.
- Tie proof to artifacts: GitHub status check, eval report, signed ledger event, replay command.
- Install is the primary conversion. Contact is for support, security, fit, and production rollout questions.
