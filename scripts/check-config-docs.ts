#!/usr/bin/env bun
/**
 * scripts/check-config-docs.ts
 *
 * Drift check for src/content/docs/reference/configuration.md: extracts every
 * ```toml code block on the page, parses it, and validates it against
 * public/schemas/sigil-config.schema.json — the schema `sigil` itself
 * publishes for `sigil.toml` — so a renamed/removed config key can never
 * silently drift out of sync with the docs again.
 *
 * Snippets on the page are deliberately fragments (a single table, or two
 * alternate spellings of the same table shown back to back for illustration,
 * e.g. `[scenario.reset]` vs `[[scenario.reset]]`) rather than one complete
 * `sigil.toml`. To stay tolerant of that:
 *
 *   1. Each fenced block is split into "chunks" at every TOML table-header
 *      line (`[...]` or `[[...]]`). Chunks are re-assembled greedily: keep
 *      appending chunks to the current candidate document as long as it still
 *      parses as TOML; the moment appending a chunk breaks parsing (e.g. a
 *      `[[scenario.reset]]` array-of-tables redefining a key already set as
 *      `[scenario.reset]`), the candidate so far is finalized as one
 *      document and a new candidate starts from the failing chunk. This lets
 *      "here are two ways to write this" examples live in one fenced block
 *      without the checker choking on TOML that was never meant to be one
 *      file.
 *   2. Each resulting document is validated against the schema with every
 *      `required` array stripped (recursively) — fragments legitimately omit
 *      most of a table's keys — while `additionalProperties: false` is left
 *      intact, so an unknown / renamed / misspelled key still fails the
 *      check.
 *
 * Usage:
 *   bun run scripts/check-config-docs.ts
 *   bun run check:docs        # via package.json
 *
 * Exit code is non-zero (with a line-numbered, per-block report) if any
 * block fails to parse as TOML or fails schema validation. Not wired into a
 * GitHub Actions workflow: this repo has no CI job that builds/tests the
 * site (only `bump-version.yml`, which only rewrites version strings on
 * release). Run it locally before committing changes to configuration.md,
 * or add it to a future site-build workflow's steps as
 * `bun run check:docs`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DOC_PATH = `${ROOT}/src/content/docs/reference/configuration.md`;
const SCHEMA_PATH = `${ROOT}/public/schemas/sigil-config.schema.json`;

interface TomlBlock {
  /** 1-based line number of the ```toml fence itself. */
  line: number;
  text: string;
}

/** Pull every ```toml ... ``` fenced block out of the markdown, with the
 * source line of its opening fence (for actionable error messages). */
function extractTomlBlocks(markdown: string): TomlBlock[] {
  const lines = markdown.split("\n");
  const blocks: TomlBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    if (/^```toml\s*$/.test(lines[i] ?? "")) {
      const startLine = i + 1; // 1-based
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i] !== "```") {
        body.push(lines[i] ?? "");
        i += 1;
      }
      blocks.push({ line: startLine, text: body.join("\n") });
    }
    i += 1;
  }
  return blocks;
}

/** Split a TOML snippet into chunks at each table-header line. The first
 * chunk (possibly empty) holds any leading bare `key = value` lines before
 * the first header. */
function splitIntoChunks(text: string): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current: string[] = [];
  for (const rawLine of lines) {
    if (/^\s*\[\[?[^\]]+\]?\]\s*(#.*)?$/.test(rawLine) && current.length > 0) {
      chunks.push(current.join("\n"));
      current = [rawLine];
    } else {
      current.push(rawLine);
    }
  }
  if (current.length > 0) chunks.push(current.join("\n"));
  return chunks;
}

/** Greedily reassemble chunks into the maximal documents that still parse as
 * TOML, splitting wherever appending the next chunk breaks parsing. Returns
 * one parsed JS value per document. Throws with a descriptive message if a
 * single chunk on its own does not parse (a genuine syntax error, not an
 * alternate-form collision). */
function parseAsTolerantDocuments(text: string): unknown[] {
  const chunks = splitIntoChunks(text).filter((c) => c.trim().length > 0);
  if (chunks.length === 0) return [];

  const docs: unknown[] = [];
  let candidate = "";
  for (const chunk of chunks) {
    const attempt = candidate.length > 0 ? `${candidate}\n${chunk}` : chunk;
    try {
      Bun.TOML.parse(attempt);
      candidate = attempt;
    } catch {
      // Appending this chunk broke the candidate document (most likely two
      // alternate spellings of the same table shown side by side). Flush
      // what we had, and start a fresh candidate from this chunk alone.
      if (candidate.length > 0) {
        docs.push(Bun.TOML.parse(candidate));
      }
      // The chunk must parse on its own; if not, this is a real error and we
      // let it throw with TOML's own message.
      Bun.TOML.parse(chunk);
      candidate = chunk;
    }
  }
  if (candidate.length > 0) {
    docs.push(Bun.TOML.parse(candidate));
  }
  return docs;
}

/** Recursively strip every `required` keyword from a JSON Schema (deep
 * clone) so fragment documents aren't rejected for omitting keys — while
 * leaving `additionalProperties: false` intact, so unknown keys still fail. */
function stripRequired(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripRequired);
  if (node !== null && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "required") continue;
      out[key] = stripRequired(value);
    }
    return out;
  }
  return node;
}

function main(): number {
  const markdown = readFileSync(DOC_PATH, "utf8");
  const schema = stripRequired(
    JSON.parse(readFileSync(SCHEMA_PATH, "utf8")),
  ) as Record<string, unknown>;

  const ajv = new Ajv2020({ strict: false, allErrors: true, logger: false });
  const validate = ajv.compile(schema);

  const blocks = extractTomlBlocks(markdown);
  if (blocks.length === 0) {
    console.error(`No \`\`\`toml blocks found in ${DOC_PATH} — nothing to check.`);
    return 1;
  }

  let failures = 0;
  let checkedDocs = 0;

  for (const block of blocks) {
    let docs: unknown[];
    try {
      docs = parseAsTolerantDocuments(block.text);
    } catch (error) {
      failures += 1;
      console.error(`configuration.md:${block.line}: TOML parse error`);
      console.error(`  ${(error as Error).message}`);
      continue;
    }

    for (const doc of docs) {
      checkedDocs += 1;
      const valid = validate(doc);
      if (!valid) {
        failures += 1;
        console.error(`configuration.md:${block.line}: schema validation failed`);
        for (const err of validate.errors ?? []) {
          const path = err.instancePath || "(root)";
          console.error(`  ${path} ${err.message}`);
        }
      }
    }
  }

  if (failures > 0) {
    console.error(
      `\n${failures} problem(s) across ${blocks.length} \`\`\`toml block(s) (${checkedDocs} document(s) checked).`,
    );
    return 1;
  }

  console.log(
    `OK: ${blocks.length} \`\`\`toml block(s) (${checkedDocs} document(s)) in configuration.md validate against sigil-config.schema.json.`,
  );
  return 0;
}

process.exit(main());
