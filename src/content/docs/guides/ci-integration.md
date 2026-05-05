---
title: Sigil CI Integration for GitHub Actions
description: Wire Sigil into GitHub Actions, status checks, branch protection, and the merge queue.
---

Sigil ships with a first-class GitHub integration via the `sigil ci` command. It evaluates a PR, posts a status check, optionally comments, and — at `AUTO` trust — triggers the merge queue.

:::note[Installer]
The workflow example below installs the latest published Sigil binary through `https://runsigil.com/install.sh`, which redirects to the public release artifact.
:::

## The CI loop

```sh
sigil ci owner/repo#42 --service api
```

This does, in order:

1. `sigil eval` against the PR ref vs the merge-base baseline.
2. `sigil decide` to resolve ALLOW/REVIEW/BLOCK.
3. Posts a GitHub commit status with the decision and a link to the eval report.
4. (Optional) Posts a PR comment with the lossy feedback.
5. (Optional) Enqueues the PR in the merge queue on ALLOW.

## GitHub Actions example

```yaml
# .github/workflows/sigil.yml
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

## `[ci]` config section

```toml
[ci]
status_context = "sigil/api"
comment        = true
auto_merge     = true
```

- `status_context` — the GitHub status check name. Protected branches match this to require the check.
- `comment` — post the lossy feedback as a PR comment.
- `auto_merge` — on ALLOW at AUTO trust, enqueue the PR in the GitHub merge queue.

## Command flags

```
sigil ci <pr-ref> --service <svc>
  --github-api-url <url>   # override — useful for testing with wraith digital twins
  --dry-run                # compute, report, but don't post status or comment
  --comment                # post PR comment with lossy feedback
  --auto-merge             # enqueue on ALLOW if trust is AUTO
  --sha <sha>              # override head SHA detection
```

## Branch protection

Configure your protected branches (typically `main`) to require the `sigil/<service>` status check. Sigil will post `success` for ALLOW, `failure` for BLOCK, and `pending`→`success`/`failure` as the eval runs for REVIEW (the decision is surfaced in the description).

When Sigil is at **SHADOW** trust, status posts are tagged as non-required — you can see them without enforcing them. This is how you calibrate before turning the gate on.

## Testing with wraith

For local or CI testing without hitting the real GitHub API, point `--github-api-url` at a [wraith](https://wraith.cx) twin of the GitHub API. Sigil's integration tests use exactly this pattern.
