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

`sigil plugin add` is the normal way to adopt one. For the first official
plugin in a new directory it creates a minimal non-deploying project config;
otherwise it preserves the existing `.sigil/sigil.toml`. It downloads the
package when necessary, declares the exact dependency, writes the
reproducibility lock, and generates the matching LuaLS stub.

| Plugin | Release | What it does | Requested host capabilities |
|---|---:|---|---|
| [`codec`](#codec-112) | `1.1.2` | Reference plugin that echoes a `u32` | None |
| [`mysql`](#mysql-021-rc1) | `0.2.1-rc.1` | Stateful typed SQL for SingleStore 5.7 and complete MySQL 8 authentication | Network, named secrets, and entropy |
| [`s3`](#s3-030-rc1) | `0.3.0-rc.1` | Bounded read-only S3 GET, HEAD, and one caller-driven list page | Network and host-owned SigV4 |
| [`parquet`](#parquet-011) | `0.1.1` | Parquet metadata plus typed cell, column, and projected-row reads | None |

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

## MySQL 0.2.1-rc.1

This MySQL prerelease is a stateful, bounded Classic Protocol driver for
SingleStore's MySQL 5.7 wire dialect and stock MySQL 8. It completes cold and
warm `caching_sha2_password`, server auth-switch handling, and
`mysql_native_password`; a wrong password is a typed authentication failure
with the server's bounded vendor code and SQLSTATE. Sigil owns endpoint
resolution, TCP, TLS verification, timeouts, byte quotas, secret grants,
entropy, cancellation, and teardown; the component sees only a logical
endpoint and the names of specifically granted secrets.

```sh
sigil plugin add mysql@0.2.1-rc.1
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

Then keep one server session across typed queries and commands:

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
      ["max-rows"] = 1000,
      ["max-result-bytes"] = 8 * 1024 * 1024,
    })
    expect(connection ~= nil, connect_error and connect_error.message)

    local rows, query_error = connection:query(
      "SELECT UNIX_TIMESTAMP(created_at), amount, nullable_note FROM records"
    )
    expect(rows ~= nil, query_error and query_error.message)
    expect(rows.rows[1].cells[1].tag == "signed")
    expect(rows.rows[1].cells[2].tag == "decimal")
    expect(rows.rows[1].cells[3].tag == "null")

    local command, exec_error =
      connection:exec("CREATE TEMPORARY TABLE probe(id BIGINT)")
    expect(command ~= nil, exec_error and exec_error.message)
    expect(command["affected-rows"] == 0)
    expect(command.warnings == 0)

    connection:close()
  end,
}
```

Integers remain integers, DECIMAL remains exact text, NULL is a tagged value
rather than absent Lua data, and temporal values retain their server lexeme and
declared type. Server failures preserve bounded `vendor-code` and `sqlstate`.
A semantic row or result-byte limit returns no partial result and closes the
session; a host wire ceiling is an unmaskable `plugin_infrastructure` failure.
The driver never retries, reconnects, replays, or opens a replacement session
after an ambiguous failure. It does not support prepared statements, the
binary protocol, multi-statements or multi-results, or `LOCAL INFILE`.

[View the immutable MySQL 0.2.1-rc.1 prerelease.](https://github.com/sigil-plugins/mysql/releases/tag/v0.2.1-rc.1)

## S3 0.3.0-rc.1

S3 performs bounded, read-only path-style GET, HEAD, and one ListObjectsV2
page against S3-compatible stores such as MinIO. Anonymous and presigned
requests remain available; private requests name an opaque SigV4 grant so the
component never receives credentials, signing time, authority, or signature
material. Use this candidate with Sigil 0.33.2-rc.2 or a compatible newer
release.

```sh
sigil plugin add s3@0.3.0-rc.1
```

The operator owns the socket route, secrets, signed Host, methods, canonical
paths, and exact query policy:

```toml
[plugins.grants.s3.network.object-store]
target = "minio:9000"
tls = "disabled"
connect_timeout = "5s"
io_timeout = "10s"
max_connections = 1
max_bytes = "8MiB"

[plugins.grants.s3.sigv4.private-read]
endpoint = "object-store"
access_key_secret = "OBJECT_STORE_ACCESS_KEY"
secret_key_secret = "OBJECT_STORE_SECRET_KEY"
region = "us-east-1"
service = "s3"
authority = "minio:9000"
methods = ["GET", "HEAD"]
canonical_uri_prefixes = ["/results/exports/"]
query = {}
header_names = []

[plugins.grants.s3.sigv4.results-list]
endpoint = "object-store"
access_key_secret = "OBJECT_STORE_ACCESS_KEY"
secret_key_secret = "OBJECT_STORE_SECRET_KEY"
region = "us-east-1"
service = "s3"
authority = "minio:9000"
methods = ["GET"]
canonical_uri_prefixes = ["/results/"]
header_names = []

[plugins.grants.s3.sigv4.results-list.query.list-type]
required = true
exact_values = ["2"]

[plugins.grants.s3.sigv4.results-list.query.max-keys]
required = true
decimal_max = 1000

[plugins.grants.s3.sigv4.results-list.query.prefix]
required = true
encoded_prefixes = ["exports%2F"]

[plugins.grants.s3.sigv4.results-list.query.continuation-token]
required = false
opaque_max_encoded_bytes = 6144
```

The secret names must also be present in the scenario environment allowlist.
The scenario drives pagination explicitly and composes list, metadata, and
exact-byte reads:

```lua
local s3 = require("wasm.s3")
local page, list_error = s3["list-objects"]({
  bucket = "results",
  prefix = "exports/",
  ["max-keys"] = 100,
  ["continuation-token"] = nil,
  auth = { tag = "sigv4", value = "results-list" },
})
expect(page ~= nil, list_error and list_error.message)

local key = page.objects[1].key
local metadata, head_error = s3["head-object"]({
  bucket = "results",
  key = key,
  auth = { tag = "sigv4", value = "private-read" },
})
expect(metadata ~= nil, head_error and head_error.message)

local bytes, get_error = s3["get-object"]({
  bucket = "results",
  key = key,
  auth = { tag = "sigv4", value = "private-read" },
  ["max-bytes"] = 4 * 1024 * 1024,
})
expect(bytes ~= nil, get_error and get_error.message)
```

Each listed object returns a string key, unsigned size, exact optional ETag,
and unnormalized optional Last-Modified text. A truncated page returns one
opaque `next-continuation-token`; the plugin never follows it automatically.
Host API 1.2 validates the token's allowed canonical ASCII form and encoded
length under the grant before signing or I/O. The host does not add token
contents to diagnostics or evidence; scenario Lua receives the token, so code
that explicitly logs or attaches it remains responsible for that disclosure.

GET reserves its body ceiling plus exactly 64 KiB of response framing; LIST
reserves 4 MiB plus 64 KiB. A reservation outside the network grant is an
uncatchable `PLUGIN_RESOURCE_LIMIT`/`plugin_infrastructure` failure. A body
over the plugin's own ceiling returns `nil, {class = "limit", ...}` with no
partial bytes. HEAD returns optional size, ETag, and exact Last-Modified text
without reading a body. The plugin exposes no write, delete, bucket-management,
range, redirect, retry, or fallback operation.

[View the immutable S3 0.3.0-rc.1 prerelease.](https://github.com/sigil-plugins/s3/releases/tag/v0.3.0-rc.1)

## Parquet 0.1.1

Parquet accepts a complete file as a binary Lua string, reports flat leaf
metadata, and reads one typed scalar cell, a bounded column window, or a
projected row window. It has no filesystem or network capability. The intended
object-store flow composes it with S3 in the scenario, without making either
plugin depend on the other:

```sh
sigil plugin add s3@0.3.0-rc.1
sigil plugin add parquet@0.1.1
```

Use the S3 endpoint grant from the preceding section, then pass the downloaded
bytes directly to Parquet:

```lua
return {
  title = "Read projected rows from a Parquet object",
  priority = "P1",
  policy = { capabilities = { "wasm.s3", "wasm.parquet" } },

  run = function()
    local s3 = require("wasm.s3")
    local parquet = require("wasm.parquet")

    local bytes, download_error = s3["get-object"]({
      bucket = "results",
      key = "exports/run/output.parquet",
      auth = { tag = "sigv4", value = "private-read" },
      ["max-bytes"] = 4 * 1024 * 1024,
    })
    expect(bytes ~= nil, download_error and download_error.message)

    local names, column_error = parquet["read-column"](bytes, {
      column = "last_name",
      offset = 0,
      limit = 3,
    })
    expect(names ~= nil, column_error and column_error.message)

    local batch, rows_error = parquet["read-rows"](bytes, {
      columns = { "last_name", "event_epoch_s", "amount" },
      offset = 0,
      limit = 3,
    })
    expect(batch ~= nil, rows_error and rows_error.message)
    expect(batch.rows[1].cells[3].tag == "decimal")
  end,
}
```

Rows are positional in the exact order of `batch.columns`. Duplicate, unknown,
nested, repeated, or unsupported projected columns fail before page decode.
An out-of-bounds row window returns `not-found` and is never silently clamped
to a shorter successful result. NULL remains tagged, decimal keeps exact
precision, scale, and unscaled bytes, and timestamp cells retain their raw
integer plus unit; the reader never normalizes the value a scenario is trying
to assert. Required or optional non-repeated scalar columns,
plain or dictionary encoding, and uncompressed or Snappy pages are supported.
INT96, nanosecond temporal values, external column chunks, and other compression
codecs fail explicitly. Input is capped at 16 MiB.

[View the immutable Parquet 0.1.1 release.](https://github.com/sigil-plugins/parquet/releases/tag/v0.1.1)

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
