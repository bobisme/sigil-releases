---
title: Installation
description: Install the latest Sigil release.
---

## Shell installer

The hosted installer is the shortest path for Linux and macOS. It downloads the latest public release installer, which selects the right prebuilt archive for your platform and installs `sigil` into Cargo's bin directory.

```sh
curl -fsSL https://runsigil.com/install.sh | sh
```

Pass installer flags after `sh -s --`:

```sh
curl -fsSL https://runsigil.com/install.sh | sh -s -- --no-modify-path
```

## Homebrew

```sh
brew install bobisme/tap/sigil
```

## Release artifacts

Prebuilt archives and checksums are published at the public release repository:

https://github.com/bobisme/sigil-releases/releases/latest
