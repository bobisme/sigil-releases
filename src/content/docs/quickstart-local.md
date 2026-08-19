---
title: "Quickstart: Test a Running Service"
description: Point `sigil run` at a URL and run Lua scenarios against it — no Docker Compose, no sigil.toml, no ledger.
---

This quickstart is for the case where a service is **already running** — on
your box, in a dev container, behind a tunnel, or as a set of API twins —
and you want acceptance scenarios against it right now. No `sigil.toml`, no
Docker Compose, and nothing written to a ledger.

If you want Sigil to deploy a PR and a baseline itself, compare them, and
emit a merge decision, see [Quickstart: Gate an Agent PR](/quickstart/)
instead.

## 1. Install

```sh
curl -fsSL https://runsigil.com/install.sh | sh
```

## 2. Write one scenario

`sigil run` takes plain `.lua` files or directories — no `sigil init`, no
`scenarios/<service>/` layout required.

```lua
-- scenarios/health.lua
return {
  title    = "Service responds to /health",
  priority = "P0",
  policy   = { capabilities = {"http"} },

  run = function()
    local res = sigil.get("/health")
    expect(res.status == 200)
    expect(res.json.ok == true)
  end,
}
```

## 3. Run it against the endpoint

```sh
sigil run scenarios/ --endpoint http://localhost:8080
```

`sigil run` walks the directory recursively for `*.lua` files (skipping any
`lib/`), runs each one against the endpoint, and prints a PASS/FAIL line per
scenario:

```txt
PASS: health (42 ms)
  title: Service responds to /health

1 run, 1 pass, 0 fail — 42ms
```

Exit codes:

| Exit | Meaning |
|---:|---|
| 0 | Every matched scenario passed. |
| 1 | At least one scenario failed. |
| 2 | Zero scenarios matched (bad path, filter, or tag — pytest convention). |

## Several services on one box

Testing more than one service — a couple of API twins, say — declares each
extra one as a **named service** with a second `--endpoint name=url`, then
reaches it from Lua with `sigil.service("name")`:

```sh
sigil run scenarios/ \
  --endpoint http://localhost:8080 \
  --endpoint taxonomy=http://localhost:8081
```

```lua
local primary = sigil.get("/orders/42")                    -- localhost:8080
local other   = sigil.service("taxonomy").get("/orders/42") -- localhost:8081
```

Exactly one bare `--endpoint <URL>` sets the primary/default base URL that
plain `sigil.get/post/...` hit; any number of `--endpoint name=url` values
declare named services. `sigil.service("taxonomy")` returns a handle with
the same `get/post/put/patch/delete` verbs, permanently bound to that
service's origin.

If a tool already knows the box's service map, hand it over as a file instead of
shell-quoting it: `--endpoints-from endpoints.json` takes a flat JSON object
`{ "taxonomy": "http://localhost:8081", ... }` (`-` reads stdin), and every key
becomes a named service exactly as if you had typed `--endpoint name=url`.

Sharing a helper (auth headers, a session setup) across scenarios that call
multiple services works the same way as any shared Lua helper: put it in
`lib/` and `require('lib.x')`. See [Where `require('lib.X')` resolves](/guides/writing-scenarios/#where-requirelibx-resolves)
for how `sigil run` derives that path from the directory you named on the
command line.

**Origin pinning**: by default every live HTTP call is confined to the
`--endpoint` origin (plus any declared named-service origins) — a
cross-origin `base_url` or redirect is a runtime error. For a one-off call
to a known extra origin without declaring a named service, use
`--allow-origin <URL>` (repeatable) instead; it widens the pin set by
exactly that origin, leaving pinning enforced for everything else.
`--allow-cross-origin` disables pinning entirely — reserve it for suites
where every scenario file is fully trusted and the origins are not knowable
in advance, since it re-opens every origin, not just the one you need.

## Secrets

`sigil.env("KEY")` only ever sees keys you explicitly pass with `--env`:

```sh
sigil run scenarios/ --endpoint http://localhost:8080 \
  --env API_TOKEN \
  --env BASE_PATH=/v2
```

`--env KEY` (bare) passes the value through from your own shell environment
— use this for secrets, since command-line arguments are visible via `ps`
and process listings. `--env KEY=VALUE` sets a literal value directly.

## CI: `--json`, `--filter`, `--tag`

```sh
sigil run scenarios/ --endpoint http://localhost:8080 --json
```

`--json` prints one machine-readable report to stdout instead of human
lines; exit codes are unchanged. `--filter <SUBSTR>` (repeatable, OR'd)
matches scenario path or title; `--tag <T>` / `--exclude-tag <T>` filter on
declared tags, with exclude always winning.

## Running scenarios you did not write

`sigil.exec` runs `sh -c` on the host running sigil — not inside any container.
When the scenario files come from somewhere else (a contract package, an agent),
deny it:

```sh
sigil run scenarios/ --endpoint http://localhost:8080 --deny-capability exec
```

A scenario that declares or calls a denied capability fails before it executes
(lint `E007`, `failure_class = "capability"` in `--json`); nothing is denied
unless you ask.

## What you don't get here

`sigil run` is the lightweight path. It does not:

- deploy or compare against a baseline environment
- write anything to a ledger
- apply trust gating or emit an `ALLOW`/`REVIEW`/`BLOCK` decision

When you're ready for those, graduate to [Quickstart: Gate an Agent PR](/quickstart/),
which runs the same Lua scenarios through `sigil eval` and `sigil decide`.

## Full flag reference

See [CLI Reference: `sigil run`](/reference/cli/#sigil-run) for every flag,
including `--lib-dir` for scenario trees staged by another tool.
