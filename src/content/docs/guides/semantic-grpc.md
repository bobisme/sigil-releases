---
title: Semantic gRPC for Plugins
description: Host-owned unary gRPC authority, limits, replay rules, and operator diagnostics in Sigil 0.35.1.
---

Since Sigil 0.35.0, the host supports the additive Host API 1.3 interface
`sigil:host/grpc-unary@1.3.0` under plugin manifest schema 4. Existing schema
1–3 and Host API 1.0–1.2 imports remain unchanged.

The host supports exactly three Temporal WorkflowService methods:
`StartWorkflowExecution`, `DescribeWorkflowExecution`, and
`GetWorkflowExecutionHistory`. This is not a generic gRPC client. Reflection,
streaming, connection pooling, hidden retries, and mTLS are not supported.

:::note[Use the official stable plugin]
[Temporal 0.1.1](/plugins/official/#temporal-011) requires
Sigil **>=0.35.0** and exact Host API **1.3.0**. Host support alone does not
certify every Temporal server or caller workflow. Keep your own service
acceptance checks. Do not replace a locked dependency with a local archive or
widen trust policy to obtain a pass.
:::

## Temporal 0.1.1

The plugin exports three operations with fixed host RPC aliases:

| Lua export | Profile RPC alias | Caller timeout ceiling |
|---|---|---:|
| `start-workflow-execution` | `start` | 10,000 ms |
| `describe-workflow-execution` | `describe` | 10,000 ms |
| `get-workflow-execution-history` | `history` | 65,000 ms for close-event waiting; 10,000 ms for all-events |

Each request supplies a named `profile` and a positive `timeout-millis` no
greater than that operation's ceiling. Host profile and scenario deadlines
can lower the effective timeout further. Grant only the aliases needed by the
scenario, with their exact WorkflowService paths and read/mutation kinds.

Start requires exactly two ordered `json/plain` payloads and a caller-owned
`request-id`. Its protobuf identity is fixed to `sigil-temporal@0.1.0`; the
operator's request policy must match. Describe and History select the latest
run by `workflow-id`; they do not accept an explicit run ID.

History accepts only these flag combinations:

| `filter` | `wait-new-event` | `skip-archival` | Maximum `timeout-millis` |
|---|---|---|---:|
| `"close-event"` | `true` | `true` | 65,000 |
| `"all-events"` | `false` | `false` | 10,000 |

Each History call returns one page. The caller passes the opaque
`next-page-token` explicitly to request another page. No operation retries,
polls, or reconnects internally. See the
[versioned Temporal README](https://github.com/sigil-plugins/temporal/blob/v0.1.1/README.md) for the
operator configuration and full caller contract.

<span id="temporal-010"></span>

Temporal 0.1.0's immutable manifest still requires `>=0.35.0, <0.36.0`.
The 0.1.1 minimum-only range removes that minor ceiling, not the exact host
interface or schema checks. It does not certify an unmeasured future host.

## Project-side Lua companion

Temporal 0.1.1 includes an opt-in
[Lua companion](https://github.com/sigil-plugins/temporal/blob/v0.1.1/examples/lib/temporal.lua).
Copy the version-pinned file into your scenario's `lib/temporal.lua` and record
its hash with the caller change. Official plugin acquisition does not install
this file. `require("lib.temporal")` callers must declare `wasm.temporal`, even
when using only its decoder; the standalone `sigil.json.decode` builtin instead
needs no plugin capability.

| Helper | Contract |
|---|---|
| `run(request, options)` | Starts once, then polls Describe; returns the full Describe response (`value.status.number`), not a status string. |
| `wait_after_start(request, options)` | Polls an already-started workflow without another Start. Only RUNNING and typed post-start NOT_FOUND are retryable. |
| `history(selector, options)` | Bounded History traversal; derives both flags from the required filter and preserves event order. |
| `result(selector, options)` | Reads close-event History; distinguishes completed ordered payloads, including an empty list, from `not-completed`. |
| `decode_json(payload, options)` | Explicitly decodes one `json/plain` payload layer; preserves raw payloads and never guesses a second decoding step. |

Polling requires explicit attempt/interval bounds. History and result require
explicit page, event, byte and per-call timeout bounds; result takes no filter.
Repeated tokens and exhausted bounds return helper errors, never partial
success or a fabricated workflow TIMED_OUT. Byte accounting covers returned
WIT strings, not process memory or cumulative transport bytes. Set a scenario
deadline as well: attempts are not elapsed seconds, and host deadlines still win.
Do not swallow RPC, sleep or checkpoint exceptions. A checkpoint may signal
cancellation but must not mutate requests or issue RPCs/sleep.

Preserve ordered binary payloads and metadata before interpreting them. An empty
completed payload list is not missing completion; JSON null is not no payload.
The decoder preserves exact signed 64-bit integers and empty object/array shape,
but rejects fractions, out-of-range integers, duplicate keys and malformed JSON.
Unsupported encoding returns a companion error; builtin JSON failures throw.
If an application explicitly stores JSON inside a JSON string or field, decode
that further layer at the application boundary, not automatically.

Handle helper/infrastructure failures before product assertions, and do not
mask an already-measured non-COMPLETED product outcome with an unnecessary result
read. Start is never retried. `started=false` has no presence information, and
successful `effect="applied"` may describe an existing execution, not creation
by this call. Describe/History still select by workflow ID, not Start's returned
run ID. See [Start semantics](https://github.com/sigil-plugins/temporal/blob/v0.1.1/docs/start-semantics.md)
and the [complete helper contract](https://github.com/sigil-plugins/temporal/blob/v0.1.1/docs/lua-companion-design.md).

CAPI accepted the exact 0.1.1-rc.1 package and copied companion on Sigil 0.35.1:
five profiles, 10 scenarios, 319 unchanged assertions and both expected-RED
fingerprints. Its supplemental real histories fit in one page; repeated tokens,
empty completed payloads and cancellation/deadline races were not exercised.
The later diagnostic addendum did not rerun the full suite. This evidence is
scoped to that RC and caller adoption, not a separate stable-artifact CAPI run
or proof that every server/payload shape works.

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
through verified remote installation. For an existing lock with an empty
cache, run `sigil plugin sync` **before** adding or upgrading Temporal, so the
other pinned dependencies are available. Then install and add
`temporal@0.1.1`, run `plugin sync`, and inspect its exact
`official-github-provenance-v1` proof tuple. `plugin test --path` cannot supply
this adapter's frozen project owner, even with a `local:path` allowance.

## Operator configuration

Configure the source policy under
`[plugins.trust.capability_allowlist].grpc-unary`, then bind a profile under
`[plugins.grants.<plugin>.grpc.<profile>]` to a named network endpoint. The
profile freezes its transport, authority, RPC aliases, request policy,
request/response metadata, and byte/deadline limits. A source allowlist alone
does not grant a method or create provenance.

In Sigil 0.35.1, unused-network-grant warnings recognize endpoints referenced
by gRPC and SigV4 profiles, not just raw network capability. Referenced
endpoints are not reported as unused. Unused extras still produce
`unused plugin network grants ignored` with an `unused_endpoints` count, never
endpoint names or targets. This diagnostic does not grant raw guest networking
or change route admission.

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

## Diagnose a pre-send denial

Since Sigil 0.35.1, human output from `sigil run` and `sigil scenario run`
includes a closed operator hint for gRPC authorization failures. Common
categories point to the constraint to inspect:

| Hint prefix | What to check |
|---|---|
| `grpc.profile` | The named profile exists in the plugin's frozen grant. |
| `grpc.rpc-alias` | The internal alias (`start`, `describe`, or `history`), not the Lua export name, appears in the selected profile's `rpcs` map. |
| `grpc.request.identity` | `request_policy.identity` matches the plugin's fixed caller identity; do not derive it from the release version. |
| `grpc.request.history-flags` | Close-event requests use both flags `true`; all-events requests use both `false`, as shown above. |

Only the first failure is reported. Fixing an alias can reveal an independent
identity mismatch on the next run. Hints never echo request or policy values,
payload bytes, secrets, or the alias inventory. JSON, ledger, replay, and
agent-safe feedback omit this private hint.

These pre-send host failures latch `PLUGIN_CAPABILITY_DENIED` for authorization.
Internal host-to-WASM kinds distinguish `denied` from `invalid-request`; the
Temporal adapter maps exchange failures to infrastructure/host-failure and the
sticky host fault throws after export. Do not expect distinct Lua-returned
kinds for these denials. A malformed RPC alias can instead fail at configuration
load, before any run report exists; inspect stderr. Human hints are not JSON
fields. Do not weaken the grant or retry an ambiguous Start. A caught sticky
failure cannot be converted into a passing run.

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
