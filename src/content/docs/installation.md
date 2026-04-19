---
title: Installation
description: Install the sigil CLI.
---

:::caution[Unreleased — private beta]
Sigil has not shipped a public release. There is no Homebrew tap, no curl installer, and no GitHub release tarball. The install endpoints referenced elsewhere in these docs (`https://sigil.cx/install.sh`, `homebrew/sigil`, etc.) are **placeholders that do not work yet**.

To use Sigil today you must either (a) be in the private beta and have a pre-built binary from the maintainer, or (b) build from source. Everything below assumes (b).
:::

## Requirements

- Linux or macOS (Windows via WSL2)
- Docker + `docker compose`
- `age` or `rage` for scenario encryption/decryption
- `git` (ledger sync)
- Rust toolchain 1.84+ if building from source

## From source

```sh
git clone https://github.com/bobisme/sigil.git
cd sigil
just install
```

This installs the `sigil` binary to your Cargo bin directory (typically `~/.cargo/bin/`). Ensure that directory is on your `PATH`.

## Verify

```sh
sigil --version
sigil --help
```

## Shell completions

```sh
sigil completions bash > ~/.local/share/bash-completion/completions/sigil
sigil completions zsh  > "${fpath[1]}/_sigil"
sigil completions fish > ~/.config/fish/completions/sigil.fish
```
