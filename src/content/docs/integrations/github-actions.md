---
title: GitHub Actions Integration
description: Run Sigil in GitHub Actions to evaluate agent-generated pull requests and publish ALLOW, REVIEW, or BLOCK status checks.
---

Sigil's GitHub Actions integration evaluates a pull request, compares it with the baseline, posts a status check, and can enqueue safe PRs when a service has earned `AUTO` trust.

## What it does

```sh
sigil ci owner/repo#42 --service api --comment --auto-merge
```

The command runs:

1. `sigil eval` against the PR ref and merge-base baseline.
2. `sigil decide` to resolve `ALLOW`, `REVIEW`, or `BLOCK`.
3. A GitHub commit status with a link to the eval report.
4. Optional lossy PR feedback for the authoring agent.
5. Optional merge queue enqueue on `ALLOW` when trust is `AUTO`.

## Minimal workflow

```yaml
name: sigil
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      statuses: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Install sigil
        run: curl -fsSL https://runsigil.com/install.sh | sh
      - name: Evaluate
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SIGIL_SCENARIOS_KEY: ${{ secrets.SIGIL_SCENARIOS_KEY }}
        run: |
          sigil ci ${{ github.repository }}#${{ github.event.pull_request.number }} \
            --service api \
            --comment \
            --auto-merge
```

## Required permissions

| Permission | Why |
|---|---|
| `contents: read` | Checkout and resolve refs. |
| `statuses: write` | Publish the Sigil decision as a commit status. |
| `pull-requests: write` | Post optional lossy feedback comments. |

## Branch protection

Require the `sigil/<service>` status check on protected branches after the service has been calibrated. While a service is still in `SHADOW`, use Sigil as a non-blocking signal and compare decisions with human review outcomes.

## Troubleshooting

| Symptom | Check |
|---|---|
| No status appears | Confirm `statuses: write` permission and the ref passed to `sigil ci`. |
| PR comment fails | Confirm `pull-requests: write` permission. |
| Holdouts do not run | Confirm `SIGIL_SCENARIOS_KEY` is present in repository or environment secrets. |
| Merge queue does not enqueue | Confirm the service is in `AUTO` trust and branch protection allows queue enqueue. |

For setup help, email [info@runsigil.com](mailto:info@runsigil.com) with the workflow file, Sigil version, and sanitized command output.

## More detail

Read the full [CI Integration guide](/guides/ci-integration/) for config options and command flags.
