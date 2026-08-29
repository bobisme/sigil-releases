---
title: Official Plugins
description: Official Sigil plugins, what they do, and copy-paste examples for adopting them.
---

Official plugins are public WebAssembly Component Model packages published by
the Sigil project under the
[`sigil-plugins`](https://github.com/sigil-plugins) GitHub organization. Their
immutable releases carry keyless provenance that Sigil verifies before
installation and pins in the project lock.

Run this command for the live inventory:

```sh
sigil plugin list-remote
```

`sigil plugin add` is the normal way to adopt one. Run it in the project that
contains `.sigil/sigil.toml`; it downloads the package when necessary, declares
the exact project dependency, writes the reproducibility lock, and generates
the matching LuaLS stub.

| Plugin | Release | What it does | Requested host capabilities |
|---|---:|---|---|
| [`codec`](#codec-112) | `1.1.2` | Reference plugin that echoes a `u32` | None |
| [`mysql`](#mysql-012) | `0.1.2` | Bounded MySQL 8.4 text-protocol driver | Network and named secrets |
| [`s3`](#s3-010) | `0.1.0` | Bounded, read-only S3-compatible object fetch | Network |
| [`parquet`](#parquet-010) | `0.1.0` | Parquet metadata inspection and typed scalar reads | None |

:::note[Declare plugin capabilities in committed scenarios]
Strict project lint expects each required module in `policy.capabilities`, such
as `"wasm.parquet"`. This authorizes that module for the scenario; it does not
grant network, secrets, or another host service. Host authority remains in the
operator-owned plugin grants.
:::

## Codec 1.1.2

Codec is the small, capability-free reference plugin. It is useful for checking
that plugin installation, locking, LuaLS generation, and the Component Model
runtime work end to end. It is not a general-purpose codec library: its current
interface exports one `echo-u32` function.

```sh
sigil plugin add codec@1.1.2
```

```lua
return {
  title = "Codec plugin is available",
  priority = "P1",
  policy = { capabilities = { "wasm.codec" } },

  run = function()
    local codec = require("wasm.codec")
    expect(codec["echo-u32"](42) == 42)
  end,
}
```

[View the immutable Codec 1.1.2 release.](https://github.com/sigil-plugins/codec/releases/tag/v1.1.2)

## MySQL 0.1.2

MySQL is a bounded MySQL 8.4 Classic Protocol driver. Sigil owns endpoint
resolution, TCP, TLS verification, timeouts, byte quotas, secret grants,
cancellation, and teardown; the component sees only a logical endpoint and the
names of specifically granted secrets.

```sh
sigil plugin add mysql@0.1.2
```

Expose the credential names to scenarios, grant those names to this plugin,
and map its logical `database` endpoint to the lane-local service:

```toml
[scenario.env]
MYSQL_USER = { from = "MYSQL_USER" }
MYSQL_PASSWORD = { from = "MYSQL_PASSWORD" }

[plugins.grants.mysql]
secrets = ["MYSQL_USER", "MYSQL_PASSWORD"]

[plugins.grants.mysql.network.database]
target = "mysql:3306"
tls = "upgrade"
tls_server_name = "mysql"
tls_ca_file = ".sigil/certs/mysql-ca.pem"
connect_timeout = "5s"
io_timeout = "10s"
max_connections = 2
max_bytes = "16MiB"
```

Then connect and issue a text query:

```lua
return {
  title = "MySQL responds to a query",
  priority = "P1",
  policy = { capabilities = { "wasm.mysql" } },

  run = function()
    local mysql = require("wasm.mysql")
    local connection, connect_error = mysql.connect({
      endpoint = "database",
      ["username-secret"] = "MYSQL_USER",
      ["password-secret"] = "MYSQL_PASSWORD",
      database = "app",
    })
    expect(connect_error == nil, connect_error and connect_error.message)

    local result, query_error =
      connection:query("SELECT 'ready' AS marker")
    expect(query_error == nil, query_error and query_error.message)
    expect(result.tag == "rows")

    connection:close()
  end,
}
```

The experimental `sigil:sql/driver@0.1.0` interface supports TLS upgrade,
`caching_sha2_password`, text queries, and one result. It does not support
prepared statements, the binary protocol, multi-statements or multi-results,
retry, reconnect, or `LOCAL INFILE`.

[View the immutable MySQL 0.1.2 release.](https://github.com/sigil-plugins/mysql/releases/tag/v0.1.2)

## S3 0.1.0

S3 performs one bounded, path-style HTTP `GET` from an S3-compatible object
store such as MinIO. It is read-only and accepts anonymous access or a
caller-supplied presigned query. It does not accept access keys, sign requests,
follow redirects, list buckets, issue ranges, or write objects.

```sh
sigil plugin add s3@0.1.0
```

Map the guest-visible `object-store` endpoint to MinIO. The host byte quota
includes request and response framing, so this example budgets 4 MiB for the
object plus bounded wire overhead:

```toml
[plugins.grants.s3.network.object-store]
target = "minio:9000"
tls = "disabled"
connect_timeout = "5s"
io_timeout = "10s"
max_connections = 1
max_bytes = "4172KiB"
```

```lua
return {
  title = "Read an object from MinIO",
  priority = "P1",
  policy = { capabilities = { "wasm.s3" } },

  run = function()
    local s3 = require("wasm.s3")
    local bytes, download_error = s3["get-object"]({
      endpoint = "object-store",
      bucket = "results",
      key = "run/output.parquet",
      ["max-bytes"] = 4 * 1024 * 1024,
    })

    expect(download_error == nil,
      download_error and download_error.message)
    expect(bytes ~= nil)
  end,
}
```

The maximum object body is 16 MiB. The logical endpoint is also the HTTP
`Host`, so a presigned query must target that in-environment name.

[View the immutable S3 0.1.0 release.](https://github.com/sigil-plugins/s3/releases/tag/v0.1.0)

## Parquet 0.1.0

Parquet accepts a complete file as a binary Lua string, reports flat leaf
metadata, and reads one typed scalar cell by column path and zero-based row
index. It has no filesystem or network capability. The intended object-store
flow composes it with S3 in the scenario, without making either plugin depend on
the other:

```sh
sigil plugin add s3@0.1.0
sigil plugin add parquet@0.1.0
```

Use the S3 endpoint grant from the preceding section, then pass the downloaded
bytes directly to Parquet:

```lua
return {
  title = "Read one value from a Parquet object",
  priority = "P1",
  policy = { capabilities = { "wasm.s3", "wasm.parquet" } },

  run = function()
    local s3 = require("wasm.s3")
    local parquet = require("wasm.parquet")

    local bytes, download_error = s3["get-object"]({
      endpoint = "object-store",
      bucket = "results",
      key = "run/output.parquet",
      ["max-bytes"] = 4 * 1024 * 1024,
    })
    expect(download_error == nil,
      download_error and download_error.message)

    local cell, read_error = parquet["read-cell"](bytes, {
      column = "total",
      row = 1,
    })
    expect(read_error == nil, read_error and read_error.message)
    expect(cell.tag == "floating")
    expect(cell.value == 27.75)
  end,
}
```

Version 0.1 supports required or optional non-repeated scalar columns, plain or
dictionary encoding, and uncompressed or Snappy pages. Nested or repeated
columns, INT96, nanosecond temporal values, external column chunks, and other
compression codecs fail explicitly. Input is capped at 16 MiB.

[View the immutable Parquet 0.1.0 release.](https://github.com/sigil-plugins/parquet/releases/tag/v0.1.0)

:::note[Direct runs require an explicit named service]
Deployed PR and baseline lanes resolve S3's reviewed route normally. For a box
owned by another orchestrator, supply the logical service name explicitly:
`sigil run scenarios/ --endpoint minio=http://127.0.0.1:PUBLISHED` or pass the
same `minio` key through `--endpoints-from`. The published port replaces the
logical `minio:9000` port; a bare primary endpoint is never inferred as plugin
authority. See [Direct runs and named network services](/guides/plugins/#direct-runs-and-named-network-services).
:::

## Commit the dependency generation

After adding plugins, commit the complete reproducibility generation and lint
the scenarios:

```sh
git add .sigil/sigil.toml .sigil/sigil.plugins.lock .sigil/types/wasm
sigil scenario lint
```

See [Using Plugins](/guides/plugins/) for locking, syncing, updates, removal,
third-party sources, and CI behavior.
