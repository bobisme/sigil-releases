---
title: Install Sigil CLI on macOS and Linux
description: Install the Sigil CLI from public release artifacts, verify what the installer does, pin versions, and troubleshoot PATH issues.
---

Sigil is distributed through public release artifacts. The hosted installer is a small bootstrap script that downloads the latest release installer from GitHub and runs it on your machine or CI runner.

## Supported platforms

| Platform | Status | Notes |
|---|---|---|
| macOS | Supported | Apple Silicon and Intel builds are published when available. |
| Linux | Supported | x86_64 builds are published when available. |
| Windows | Not documented yet | Use WSL2 for now, or email [info@runsigil.com](mailto:info@runsigil.com) with your target workflow. |

## Shell installer

```sh
curl -fsSL https://runsigil.com/install.sh | sh
```

The script at `https://runsigil.com/install.sh` delegates to the latest public installer published at:

```txt
https://github.com/bobisme/sigil-releases/releases/latest
```

Pass installer flags after `sh -s --`:

```sh
curl -fsSL https://runsigil.com/install.sh | sh -s -- --no-modify-path
```

Use `--no-modify-path` when you want the installer to avoid editing shell profile PATH entries.

## Homebrew

```sh
brew install bobisme/tap/sigil
```

## Pin a release

For reproducible CI, install from a specific GitHub release instead of the moving `latest` URL. Replace `v0.22.2` with the version you want:

```sh
curl -fsSL https://github.com/bobisme/sigil-releases/releases/download/v0.22.2/sigil-installer.sh | sh
```

## Verify release artifacts

Release archives and checksums are published on GitHub:

```txt
https://github.com/bobisme/sigil-releases/releases/latest
```

Download the archive and checksum for your platform, then compare the published checksum with your local file:

```sh
shasum -a 256 sigil-*.tar.*
```

If a release includes signature or provenance files, verify those before using Sigil in a protected CI path. For security or verification questions, email [info@runsigil.com](mailto:info@runsigil.com).

## Confirm install

```sh
sigil --version
sigil --help
```

If your shell cannot find `sigil`, restart the shell or add Cargo's bin directory to your PATH:

```sh
export PATH="$HOME/.cargo/bin:$PATH"
```

## Uninstall

If installed into Cargo's bin directory, remove the binary:

```sh
rm -f "$HOME/.cargo/bin/sigil"
```

If installed through Homebrew:

```sh
brew uninstall sigil
```

Remove any PATH entries the installer added only after confirming no other tools need the same directory.

## Troubleshooting

| Symptom | Check |
|---|---|
| `curl: command not found` | Install `curl`, or download the release installer with another tool. |
| `sigil: command not found` | Check `~/.cargo/bin` in PATH, then restart the shell. |
| Permission denied in CI | Install into a writable directory, or run the installer before switching users. |
| Unsupported platform | Use WSL2 for Windows, or request platform support at [info@runsigil.com](mailto:info@runsigil.com). |
| Need an exact artifact | Use the GitHub release page and pin the version in CI. |

## Next step

Run the [quickstart](/quickstart/) to initialize a service, execute a first evaluation, and emit an `ALLOW`, `REVIEW`, or `BLOCK` decision.
