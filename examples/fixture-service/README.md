# Sigil Fixture Service

This minimal service exists for first-run Sigil evaluations and docs screenshots. It exposes `/health` on port `8080` and includes a visible smoke scenario.

## Run

```sh
docker compose up --build
curl http://localhost:8080/health
```

Expected response:

```json
{"ok":true,"service":"sigil-fixture"}
```

## Sigil

From this directory:

```sh
sigil init --service api
sigil scenario lint
sigil eval pull/42/head --service api
sigil decide pull/42/head --service api
```

For a local-only smoke test while developing docs, run the scenario command appropriate for your Sigil version.
