---
title: Configuring Judges
description: LLM judges for sigil.judge — providers, prompts, calibration.
---

Sigil's judge system is **three-tier**. Only the top tier uses an LLM; the cheaper tiers run first and short-circuit when they can.

| Tier | Mechanism | Cost |
|------|-----------|------|
| 1 | Deterministic `expect()` assertions | free |
| 2 | JSON schema validation (`invariant` with schemas) | free |
| 3 | LLM judge (`sigil.judge`) | paid |

## `[judge]` config

```toml
[judge]
provider   = "ollama"                       # ollama | openai | anthropic | openrouter | command | claude-code
model      = "qwen3:14b"
api_base   = "http://localhost:11434"       # defaulted by provider
fallback   = { provider = "openai", model = "gpt-5" }
quorum     = 1                              # 1 or 3; 3 runs a vote
token_budget_per_eval = 40000
```

### Providers

- **`ollama`** — local model via Ollama. No API key. Good for dev and self-hosting.
- **`openai`** — OpenAI API. Uses `OPENAI_API_KEY`.
- **`anthropic`** — Anthropic API. Uses `ANTHROPIC_API_KEY`.
- **`openrouter`** — OpenRouter API. Uses `OPENROUTER_API_KEY`.
- **`command`** — pipes the prompt to an arbitrary CLI tool on stdin. Useful for exotic setups.
- **`claude-code`** — invokes `claude -p --json-schema` for structured output. The recommended setup when Sigil is part of a broader Claude Code pipeline.

## Prompt format

Sigil uses a minimal, structured prompt format — not XML tags. This is the format `claude -p` accepts without modification:

```
=== INSTRUCTIONS ===
<judge instructions, including rubric>

=== INPUT ===
<serialized response under judgment>
```

The rubric is taken from the `---` doc comment above the `sigil.judge()` call in the scenario file.

## Quorum voting

With `quorum = 3`, Sigil runs the judge three times with independent seeds and takes the majority vote on the score. Disagreements beyond a threshold downgrade the decision to REVIEW and emit an `eval.complete` event with the divergence recorded.

## Calibration

Judge calibration is the process of grading the judge against a human-labeled golden set.

```sh
sigil judge calibrate --golden .sigil/calibration/golden.json
```

Sigil reports:

- **Accuracy** — fraction of golden items where the judge matched the human label within tolerance.
- **False-accept rate** — fraction of human-rejected items the judge accepted.
- **False-reject rate** — fraction of human-accepted items the judge rejected.
- **Cost per eval** — tokens spent per golden item.

A judge that fails calibration cannot promote trust. You fix it by either changing the judge model, tightening the rubric, or expanding the golden set.

## Injection defense

LLM judges see untrusted content (the service's responses). Sigil normalizes and escapes inputs, then runs a detection pass for common injection patterns (`ignore previous instructions`, system-prompt-shaped strings, etc.). On detection, the tier-3 result is thrown out and the scenario falls back to tier-1/2 results. Detection events land in the ledger as `incident.injection_attempt`.
