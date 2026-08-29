---
title: Using WebAssembly Plugins
description: Install, adopt, run, update, and remove reproducible Sigil plugin dependencies.
---

Sigil plugins are WebAssembly Component Model packages exposed to Lua through
`require("wasm.<name>")`. They are project dependencies: a package in your user
cache is not available to a scenario until the project declares and locks it.
See [Official Plugins](/plugins/official/) for the current first-party catalog,
capability requirements, and complete usage examples.

## The shortest path

From the project containing `.sigil/sigil.toml`:

```sh
sigil plugin add codec
git add .sigil/sigil.toml .sigil/sigil.plugins.lock .sigil/types/wasm
```

`plugin add` resolves the highest stable official Codec release, installs it if
necessary, writes an **exact** requirement, creates the reproducibility lock,
and generates the matching LuaLS stub. Commit all three artifacts.

Then load it from a scenario:

```lua
return {
  priority = "P1",
  policy = { capabilities = { "wasm.codec" } },

  run = function()
    local codec = require("wasm.codec")
    expect(codec["echo-u32"](42) == 42)
  end,
}
```

The module name is dotted and exact: `wasm.codec`. `wasm:codec` and
`codec.wasm` are not aliases.

Verify the project before committing:

```sh
sigil scenario lint
sigil generate-types
sigil scenario run --all --service YOUR_SERVICE
```

## Inspect before adopting

Installation and project adoption are deliberately separate when you want a
review step:

```sh
sigil plugin install codec
sigil plugin info codec@1.1.2
sigil plugin verify codec@1.1.2
sigil plugin add codec@1.1.2
```

`install` populates the per-user immutable cache and selects a convenient
authoring candidate. It prints `Installed NAME@VERSION` before its digest and
provenance evidence. It does **not** grant authority to a project. `add` is the
operation that writes the reviewed project dependency and lock.

:::note[Cache selection is not runtime authority]
Changing `sigil plugin use`, installing another version, or modifying another
project cannot change what this project runs. Whenever a selected scenario loads
a plugin, every execution path verifies `[plugins.require]` against
`.sigil/sigil.plugins.lock` and the immutable store.
:::

:::note[Only selected plugins are preflighted]
A plugin-free scenario selection can run even when an unrelated project plugin
is absent from this machine's user store. As soon as any selected scenario uses
`require("wasm.NAME")`, Sigil requires that exact project declaration, lock entry,
immutable package, and scenario capability before execution.
:::

## What to commit

`sigil plugin add` and `sigil plugin lock` author a coupled generation:

- `.sigil/sigil.toml` — the reviewed name, exact version/range, and source;
- `.sigil/sigil.plugins.lock` — exact version, source, package and component
  digests, host API, and publisher-verification evidence;
- `.sigil/types/wasm/` — deterministic LuaLS stubs generated from that lock.

CI should restore those files from the trusted control ref and run:

```sh
sigil plugin sync
sigil scenario lint
sigil eval "$PR_REF" --service "$SERVICE"
```

`plugin sync` may download a missing exact package, but never chooses a newer
compatible version and never changes project files, generated stubs, or the
user-cache selection. The lock is independently sufficient for sync, lint,
run, eval, and replay: a fresh clone may omit `.sigil/types/wasm/`, then run
`sigil generate-types` later if an editor needs the stubs. Authoring commands
still protect unknown or mismatched stub state transactionally. Evaluation
itself has no package repair or network path: missing or drifted evidence fails
before deployment.

## Version ranges and third-party sources

An official shorthand always means the matching repository in the
`sigil-plugins` GitHub organization:

```toml
[plugins.require]
codec = "=1.1.2"
mysql = "^0.1"
```

`plugin add` writes an exact version. You can edit a canonical SemVer range and
then run `sigil plugin lock` when you intentionally want compatible resolution.

Third-party dependencies must name their source and require explicit project
opt-in plus source allowlists:

```toml
[plugins]
allow_third_party = true

[plugins.trust]
install_allowlist = ["github:sigil-plugins/*", "github:acme/sigil-protobuf"]

[plugins.require]
protobuf = { version = "=1.2.4", source = "github:acme/sigil-protobuf" }
```

```sh
sigil plugin add github:acme/sigil-protobuf@1.2.4
```

Local archives can be packed, validated, inspected, and cached for development,
but `local:path` bytes cannot become a project dependency or execute in a
scenario.

## Host capabilities and grants

A plugin manifest may request bounded host services: logging, deterministic
random, entropy, named secrets, or named outbound TCP/TLS endpoints. A request
is not a grant. Effective authority is the intersection of:

1. what the package manifest requests;
2. which publisher the project trusts for that capability;
3. the operator-owned `[plugins.grants.<name>]` entry;
4. the scenario's `wasm.<name>` capability; and
5. the operator denylist.

Components receive no ambient filesystem, process, environment enumeration,
clock, stdio, raw DNS, listener, UDP, or arbitrary Internet access. See
[Configuration → Plugins](/reference/configuration/#plugins) for the config
shape.

## Direct runs and named network services

In an evaluation, network grants resolve inside Sigil's deployed PR and
baseline lanes. When another tool already owns the box, `sigil run` can instead
resolve a locked plugin route from an explicit named service:

```sh
sigil run scenarios/ --endpoint minio=http://127.0.0.1:49172

# Or consume the service map produced by an orchestrator:
rig services --format json \
  | sigil run scenarios/ --endpoints-from -
```

For a reviewed grant target of `minio:9000`, the service must be named
`minio`; the externally published URL port (`49172` above) replaces logical
port `9000`. A bare `--endpoint http://127.0.0.1:49172` is only the primary HTTP
base and never grants a plugin route. `sigil scenario run` uses matching named
`[eval] services` from project configuration in the same way.

All routes are resolved before reset hooks or scenarios execute. Missing or
unresolvable services, ambiguous DNS results, and incompatible TLS modes fail
closed. Use `http://` for a grant with `tls = "disabled"` and `https://` for
`tls = "direct"`; URL-derived direct routes do not support `tls = "upgrade"`.
Pure plugins such as Parquet need no named route. Concrete socket addresses
remain host-owned and are not exposed to Lua or reports.

## Update, remove, and uninstall

```sh
# Inspect available releases, then update the cache selection.
sigil plugin list-remote codec
sigil plugin update codec

# Intentionally change a project range/source, then refresh one lock entry.
sigil plugin lock --update codec

# Remove project authority, lock entry, and managed stub; keep cached bytes.
sigil plugin remove codec

# Delete a cached version only when no project operation needs it.
sigil plugin uninstall codec@1.1.2 --force
```

`plugin remove` is the dependency operation. `plugin uninstall` is the user
cache operation. The old unambiguous `plugin remove NAME@VERSION` cache-deletion
form remains temporarily available with a deprecation warning.

## Corporate proxies and TLS inspection

Plugin acquisition honors `HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY`, and
`NO_PROXY`. Certificate-chain and hostname verification are always enabled,
and Sigil 0.32.6 or newer delegates certificate trust to the operating system.
If an enterprise proxy such as Netskope re-signs GitHub traffic, install its
root in the host trust store just as you would for `curl`; Sigil provides no
insecure skip-verification option.

To distinguish a trust problem from routing or proxy configuration, test the
same API endpoint on the affected machine:

```sh
curl -sS -o /dev/null \
  -w 'HTTP %{http_code}; TLS verify %{ssl_verify_result}\n' \
  https://api.github.com/repos/sigil-plugins/codec/releases
```

`TLS verify 0` means `curl` trusts the presented chain. On releases before
0.32.6, Sigil used a separate bundled root set, so `curl` could succeed while
plugin installation failed. Upgrade before investigating further.

## Common failures

| Message | Fix |
|---|---|
| Plugin is not declared for this project | Run `sigil plugin add NAME`. |
| Lock is absent or stale | Review the requirement, then run `sigil plugin lock`. |
| Exact locked package is missing in CI | Run `sigil plugin sync` before lint/eval. |
| `wasm.NAME` capability is missing | Add the exact capability to committed scenario policy; literal requires are inferred only by the smoke runner. |
| Source or capability policy rejects a package | Narrowly allow the reviewed source under `[plugins.trust]`; do not weaken policy globally. |
| `PLUGIN_TLS_TRUST_INVALID` | Install the enterprise root in the host trust store and use Sigil 0.32.6 or newer; never disable TLS verification. |
| Official provenance verification fails | Do not bypass it. Select a valid immutable release or treat the publisher incident as infrastructure REVIEW. |
