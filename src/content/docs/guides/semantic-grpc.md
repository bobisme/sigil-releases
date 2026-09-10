---
title: Semantic gRPC for Plugins
description: Host-owned unary gRPC authority, limits, and replay rules in Sigil 0.35.0.
---

Sigil 0.35.0 supports the additive Host API 1.3 interface
`sigil:host/grpc-unary@1.3.0` under plugin manifest schema 4. Existing schema
1–3 and Host API 1.0–1.2 imports remain unchanged.

The host supports exactly three Temporal WorkflowService methods:
`StartWorkflowExecution`, `DescribeWorkflowExecution`, and
`GetWorkflowExecutionHistory`. This is not a generic gRPC client. Reflection,
streaming, connection pooling, hidden retries, and mTLS are not supported.

:::caution[Host support is not plugin acceptance]
The [Temporal plugin repository](https://github.com/sigil-plugins/temporal) is
on a release-candidate track. Stable plugin promotion requires its separate
real-service caller-replacement gate. Host qualification or a local component
harness pass does not certify that gate. Do not replace a locked stable
dependency with a local archive or widen trust policy to obtain a pass.
:::

## Authority belongs to the host

The component supplies profile/RPC aliases, protobuf bytes, and limits that can
only lower host ceilings. It cannot select socket addresses, TLS roots, SNI,
or raw request headers, and it never receives credentials. Only explicitly
allowlisted response metadata is returned to the component. Before secret
lookup or socket access, the host validates the frozen profile and canonical
application request.

Execution requires all of these independently:

1. A verified immutable package and exact project requirement/lock, admitted
   by the project's source policy.
2. A schema-4 manifest importing Host API 1.3 and requesting `grpc-unary`, with
   no raw network/secret imports or requests.
3. Source admission under the `grpc-unary` capability allowlist.
4. The scenario's exact `wasm.<name>` capability and matching operator grants.
5. A request satisfying `temporal-workflow-v0`: namespace, workflow prefix,
   Start workflow type/task queue/identity, and payload shape are constrained.
   The caller owns the Start request ID.

Explicit installation before `plugin add` makes acquisition visible and works
with older hosts. Sigil 0.35.0's `add` can instead acquire missing packages
through verified remote installation. After adopting an official candidate,
run `plugin sync` and inspect its exact
`official-github-provenance-v1` proof tuple. `plugin test --path` cannot supply
this adapter's frozen project owner, even with a `local:path` allowance.

## Operator configuration

Configure the source policy under
`[plugins.trust.capability_allowlist].grpc-unary`, then bind a profile under
`[plugins.grants.<plugin>.grpc.<profile>]` to a named network endpoint. The
profile freezes its transport, authority, RPC aliases, request policy,
request/response metadata, and byte/deadline limits. A source allowlist alone
does not grant a method or create provenance.

Request metadata is closed, not an arbitrary user-header map: it requires
`temporal-namespace`, `supported-server-versions`, `caller-type`, `client-name`,
and `client-version`. Namespace must match the request policy. The other
values are operator-pinned bounded ASCII.

The logical grant target, published socket, and protocol `:authority` are
distinct. For an endpoint target `workflow:7233` published on a different port,
bind it explicitly with
`--plugin-route workflow:7233=http://127.0.0.1:49172`, or use a structured
endpoint-map entry with `logical_port = 7233`. An omitted authority port stays
omitted; it is never inferred from the socket. See
[route configuration](/guides/plugins/#direct-runs-and-named-network-services).

For direct TLS, select `transport = "h2-tls"`, endpoint `tls = "direct"`, a
`tls_server_name` matching the authority's DNS host, and operator-selected
roots. `bearer_secret` names an allowed scenario environment variable, never
its value. Do not also grant it as a raw secret. Credentials are acquired
lazily only after certificate, SNI, and exact `h2` ALPN verification. An unused
missing credential does not abort a run; a selected missing one fails closed.
Bearer credentials over `h2c` are forbidden.

## Limits and outcomes

Endpoint connection and cumulative bidirectional HTTP/2 plaintext-byte quotas
are shared across calls, not reset by each RPC. Request/response protobuf
ceilings are at most 4 MiB, independently of plugin memory and fuel. Overall,
connect, and I/O waits obey the earliest applicable profile, caller, outer-call,
and scenario deadline; progress does not restart the whole-call budget.

A maximum-sized message is not guaranteed to fit the default 64 MiB runtime
budget. Canonical lifting allocates host values and consumes transfer fuel.
A measured 4 MiB response fixture reaches Lua under `max_memory = "256MiB"`;
the default instead fails without returning partial data. Even 256 MiB is not
a universal sizing guarantee: guest memory and other retained values still
share the budget.

A complete nonzero gRPC status is a typed server result. Authorization,
transport, malformed-request/response, cancellation, and resource faults latch
infrastructure failure. `pcall`, ignored results, or a later guest success
cannot clear it; further exchanges on that store are denied.

Trusted direct-run reports may include `grpc_send_state`: `not-sent`,
`headers-sent`, `message-partial`, or `message-sent`. This describes observed
transmission, **not whether the server committed a mutation**. It never
authorizes automatic retry. Holdout-safe eval feedback remains generic.

Credential-fragment filtering and wiping cover selected Sigil-owned buffers.
They do not promise transformed-secret detection or erasure of guest,
Wasmtime, TLS-library, kernel, or process-wide memory.

## Replay

Ordinary replay reads and verifies pinned evidence without executing plugins
or selecting credentials. Semantic source, profile, RPC classification, and
transport identities are revalidated.

Live replay rejects a selected plugin if its frozen profile contains **any**
mutation RPC, before deployment—even if the scenario would use a read alias.
`--live` is not mutation authorization. Read-only live replay uses frozen
policy/roots with current lazy credentials and must pass ordinary execution
checks. Baseline verdicts are separate from PR comparison status; a PR `MATCH`
is not proof of fresh baseline success.
