---
title: Changelog
description: Release notes for sigil.
---

## Unreleased

## [0.33.1-rc.1] — 2026-08-31 — Signed Delivery Candidate

This prerelease is the cross-machine acceptance build for the host-signed
object-storage path. It is hosted alongside stable 0.33.0 and deliberately
does not advance the stable installer, homepage version, or `latest` release.

- **WASM plugins can request bounded host-side SigV4 signing.** Manifest schema version 2 adds an explicit `sigv4` capability whose project allowlist binds secret names, regions, services, signing authorities, and clock skew. Credentials remain in the host; undeclared or ambiguous authority is rejected before I/O.
- **Patch candidates retain the preceding stable plugin ecosystem.** Sigil `0.33.1-rc.1` accepts plugins compatible with `0.33.0` and plugins that explicitly opt into the RC line, while refusing plugins that require the unreleased final `0.33.1`.
- **The matching S3 candidate exercises the complete route.** [`s3@0.2.0-rc.1`](https://github.com/sigil-plugins/s3/releases/tag/v0.2.0-rc.1) performs bounded host-signed GET and HEAD requests against S3-compatible services, alongside the existing anonymous and presigned paths. Install the pair with the [Sigil RC installer](https://github.com/bobisme/sigil-releases/releases/tag/v0.33.1-rc.1), then run `sigil plugin add s3@0.2.0-rc.1` in a project.
- **Release artifacts target Apple Silicon macOS and x64 Linux.** No Intel macOS artifact is built. The RC remains excluded from Homebrew and stable-site announcement channels.

## [0.33.0] — 2026-08-29 — Outside the Lane

Sigil can now compose locked network plugins against services that another
tool already brought up. Direct runs resolve network authority only from
explicit named services, while built-in HTTP and process paths preserve exact
bytes and deterministic generators can produce one-off values without shell
access.

- **Network plugins work against externally managed boxes.** A plugin grant targeting `minio:9000` can resolve from `--endpoint minio=http://127.0.0.1:PUBLISHED` or the same named service in `--endpoints-from`. The published URL port replaces the logical deployment port. A bare primary endpoint is never inferred as plugin authority, and missing, ambiguous, TLS-incompatible, or upgrade-only routes fail before reset hooks or scenario code. See [Using WebAssembly Plugins → Direct runs and named network services](/guides/plugins/#direct-runs-and-named-network-services).
- **HTTP and `sigil.exec` are binary-safe.** Response bodies, stdin, stdout, and stderr arrive in Lua as exact byte strings, including invalid UTF-8 and embedded NULs. The existing 1 MiB process-output bounds remain byte-accurate; internal JSON evidence marks binary data with a bounded `base64-preview`, byte count, and BLAKE3 digest instead of silently returning an empty or replacement-expanded value.
- **`sigil.gen.sample(...)` produces deterministic one-shot data.** Generator factories remain lazy descriptors for `invariant`, while ordinary scenario code can sample UUIDs, emails, strings, integers, booleans, bytes, constants, and choices without granting `exec`. Direct runners accept `--seed <64-hex|auto>`, record the selected root seed, reproduce the same sample stream, and do not perturb invariant case generation. See [Lua DSL → Generators](/reference/lua-dsl/#sigilgen).
- **A reviewed plugin lock can bootstrap a clean clone without editor stubs.** `plugin sync`, lint, run, eval, and replay trust the exact checked-in lock independently of `.sigil/types/wasm/`. Sync never creates or mutates stubs; `sigil generate-types` recreates them when an editor needs them. Authoring commands retain transactional lock/stub protection.
- **Assertions in required helpers retain assertion classification.** Module-body assertions, nested helpers, and helper-built `run` functions now receive the same diagnostics and `failure_class = "assertion"` as calls authored in the scenario file. A caught assertion followed by a real runtime failure remains a crash.
- **Dynamic scenario metadata fails closed as E009.** Scenarios must return a literal top-level table so title, priority, budget, tags, and capabilities remain statically reviewable. `return helper.build()` now aborts during lint/preflight before filtering, resets, plugin acquisition, deployment, or scenario execution; a literal table may still delegate its `run` function.
- **Malformed plugin names point at the CLI argument.** Invalid `NAME` or `NAME@VERSION` values are safely escaped and rejected before network access with the accepted syntax. Canonical SemVer errors and invalid fields inside actual package manifests remain distinct.

## [0.32.6] — 2026-08-28 — Trusted Path

Official plugin acquisition now follows the host's TLS trust policy. This
brings `sigil plugin install` and `sync` in line with browsers and tools such as
`curl` on enterprise networks that install an interception root, without
weakening package integrity or provenance checks.

- **Plugin downloads work through trusted enterprise TLS inspection.** GitHub API, release asset, redirect, and attestation-bundle requests use the platform verifier backed by operating-system trust roots, so an installed Netskope or other enterprise root is recognized while certificate-chain and hostname verification stay mandatory. Exact package checksums and Sigstore provenance are still verified independently after download.
- **Transport failures are diagnosed accurately.** A rustls certificate failure wrapped by the HTTP stack as an I/O error remains `PLUGIN_TLS_TRUST_INVALID`; DNS resolution, invalid proxy configuration, connection refusal, timeout, and other transport failures carry safe, specific causes without exposing credentials or response bodies.

## [0.32.5] — 2026-08-27 — Data Paths

Sigil's official plugin catalog now covers the practical object-data path:
fetch bounded bytes from an S3-compatible store, then inspect a single typed
value in a Parquet file. This patch also fixes host-command capture for
scenarios whose commands produce substantial output.

- **Official S3 and Parquet plugins.** [`s3@0.1.0`](https://github.com/sigil-plugins/s3/releases/tag/v0.1.0) performs a bounded, read-only object GET from S3-compatible services including MinIO, while [`parquet@0.1.0`](https://github.com/sigil-plugins/parquet/releases/tag/v0.1.0) reads metadata or one typed scalar cell from the resulting bytes. They are independent project dependencies: only S3 receives network authority. See the new [Official Plugins catalog](/plugins/official/) for install commands, grants, usage snippets, and current limits.
- **`sigil.exec` drains output while commands run.** Stdout and stderr can no longer fill an OS pipe and deadlock the scenario. Each stream retains its first 1 MiB, reports discarded excess through `stdout_truncated` or `stderr_truncated`, and keeps draining until the command exits.
- **Host command process groups are cleaned up.** Each `sigil.exec` call starts in an isolated process group; timeout, Ctrl+C, output failure, and normal return terminate processes that remain in that group, including ordinary background commands that inherit it. This is lifecycle cleanup, not a security boundary: a command that deliberately creates a new session can leave the group.

## [0.32.4] — 2026-08-26 — Clean Room

Use this release for new 0.32 installs. It is the same complete Component Model
plugin system introduced in 0.32.0, followed through clean hosted builds and the
real Docker-backed evaluation path before publishing the final artifacts.

- **Plugin-free selections stay plugin-free.** A project may declare plugins for other scenarios without forcing every core-DSL run to have those unrelated packages in its user store. The moment a selected scenario uses `require("wasm.NAME")`, the checked-in project requirement, exact lock, immutable package, and scenario capability are still mandatory and fail closed on any mismatch.
- **The full workspace gate runs in a bounded clean job.** Hosted tests have their own runner and cache, disable test debug symbols, and serialize large integration-test link steps. The current-layout fixture setup and Docker evaluation pipeline now run from a clean checkout, so release validation covers the path users actually install.

## [0.32.3] — 2026-08-26 — One at a Time

The complete hosted test suite was still able to launch several large linkers
at once and exhaust the runner even though product tests were passing.

- **Workspace test linking is serialized.** Cargo uses one build job for the complete workspace test gate, removing the runner-memory race without dropping or weakening tests.

## [0.32.2] — 2026-08-26 — Separate Circuits

The first stabilization patch exposed two CI-only races that did not belong in
the plugin runtime: concurrent feature-matrix linking and a command-judge test
that could answer before consuming its prompt.

- **The plugin feature matrix has its own runner.** Plugins-on and plugins-off checks, tests, and strict Clippy no longer compete with the default workspace linker; both jobs independently gate the release.
- **Command-judge tests preserve the production pipe contract.** Test providers consume stdin before responding, so they no longer race prompt delivery while production still treats a broken pipe as a fail-closed provider error.

## [0.32.1] — 2026-08-26 — Green Matrix

The WebAssembly plugin release compiled and passed its 2,509 plugins-disabled
tests, but the first release-commit CI run then found one strict-Clippy failure
in that feature matrix: the no-op plugin preflight deliberately retained a
fallible signature shared with the feature-enabled implementation. This patch
documents that interface choice with a narrow lint allowance. Runtime behavior
and the plugin format are unchanged.

- **Plugins-disabled builds are green under strict Clippy.** Shared scenario-run callers still propagate real lock and freeze failures when plugin support is enabled; the disabled build remains a no-op and now passes the same complete CI feature matrix used before release.

## [0.32.0] — 2026-08-26 — Plugged In

Sigil can now run WebAssembly Component Model plugins as reproducible project
dependencies. A scenario loads `require("wasm.codec")`; the checked-in project
requirement, exact lock, package digests, publisher evidence, host grants, and
runtime limits determine what executes in both evaluation lanes and later
replay. Public Codec 1.1.2 and MySQL 0.1.2 packages exercised that complete
install → lock → dual-lane evaluation → offline replay path before release.

- **A bounded `wasm.<name>` Lua module system.** Plugin functions and WIT records, tuples, lists, options, results, flags, enums, variants, constructors, resources, and methods cross a closed typed boundary. Each scenario/environment lane gets a fresh Lua VM, Wasmtime Store, module cache, quotas, and resource table; memory, value shape, component complexity, fuel, time, calls, instances, and resources are bounded. Cancellation and teardown release retained resources without running untrusted cleanup. See [Using WebAssembly Plugins](/guides/plugins/).
- **Project dependency commands: `sigil plugin add` and `remove`.** `add NAME[@VERSION]` installs when necessary, writes an exact formatting-preserving `[plugins.require]` entry, and transactionally refreshes `.sigil/sigil.plugins.lock` plus managed LuaLS stubs. `remove NAME` removes project authority, lock entry, and stub while retaining cached bytes. **Upgrade note:** an installed or `current` user-cache version is no longer enough in any execution mode; existing store-only workflows must run `sigil plugin add NAME`.
- **Deterministic package management and CI sync.** `pack`, `validate`, `inspect`, `install`, `list`, `list-remote`, `info`, `verify`, `use`, `update`, and `uninstall` cover bounded canonical archives and official or explicitly enabled third-party GitHub releases. `plugin lock` resolves reviewed requirements; `lock --update NAME` makes a source change explicit; `plugin sync` installs only exact identities already approved by the lock. See the [CLI reference](/reference/cli/#plugins).
- **Operator-owned host capabilities, no ambient WASI.** Plugins can request bounded logging, deterministic random, separately authorized entropy, named secrets, and named outbound TCP/TLS endpoints. Effective authority is the intersection of the manifest request, publisher policy, control-ref grant, scenario capability, and operator denylist. Components receive no filesystem, process, environment enumeration, clock, stdio, raw DNS, listener, UDP, or arbitrary Internet surface. See [Configuration → Plugins](/reference/configuration/#plugins).
- **Keyless provenance for official packages.** Sigil verifies the exact package plus GitHub repository, commit/ref, protected workflow/environment, trigger, hosted runner, SLSA predicate, and public-transparency identity, then pins the selected bundle and trusted root for offline evaluation, replay, and decisions. Historical digest-only packages remain diagnostic and cannot authorize a fresh ALLOW; missing or drifted plugin evidence fails closed.
- **Plugin evidence is durable but feedback stays lossy.** Reports and `eval.complete` bind exact trusted plugin identities and content-addressed package/component/proof blobs; attestation predicate v2 signs only the coarse plugin-infrastructure marker. Replay is blob-first and independent of the network or mutable cache selection, while agent-visible feedback never exposes plugin identities, lanes, scenario names, or counts.
- **Clear plugin-manager outcomes.** Human `plugin install` output starts with `Installed NAME@VERSION`; `info` and `verify` use `Plugin …` and `Verified …` headings, and inactive versions name the actual cache selection. JSON output is unchanged.

## [0.31.0] — 2026-08-19 — Second Report

Another batch from the same external agent, all about the project-less runner being harder to talk to than it should be. The bug first: `sigil run` inferred capabilities from the literal call sites in a scenario file and let that inferred set *replace* the declared `policy.capabilities`, so `exec` declared but called from a `lib/` helper hit the denying stub. Then legibility: `sigil.log` and `sigil.attach` show up in the runner's output, bare `expect` takes a message, unknown scenario keys warn, and I001 stops telling `expect.eq`-only scenarios they have no assertions. One lint tightening to read before upgrading: strict lint (`sigil scenario lint`, promote) now sees a capability call whose result is indexed inline (`sigil.exec("x").status`), so a committed scenario using that shape without declaring the capability newly fails E003 — it was a runtime denial waiting to happen.

- **`sigil run` no longer strips declared capabilities.** The effective set under `sigil run` is now declared ∪ inferred: a declaration is always honored, inference only adds (so a bare `{ run = … }` still works), and `--deny-capability` still wins over both. A capability reached through a `require('lib.x')` helper, `sigil["exec"]`, or a `local f = sigil.exec` alias must be declared — inference only sees literal call sites in the scenario file. See [Writing scenarios → Capabilities](/guides/writing-scenarios/#capabilities).
- **`expect(cond, message)`** — bare `expect` takes an optional second argument, a string or `{ message = "…" }`, appended to the failure text and used as `expects[].description` when no `---` doc comment precedes the call. See [Lua DSL → `expect`](/reference/lua-dsl/#expectexpr-message).
- **`sigil.log` and `sigil.attach` surface in `sigil run` / `sigil scenario run`.** `--json` carries `logs: [...]` and `attachments: {name: value}` on every scenario entry (always present); human mode prints `log:` lines to stderr as they happen and `attach:` lines after the scenario. `sigil eval`'s lossy feedback and the PR comment are unchanged. See [Lua DSL → `sigil.log` / `sigil.attach`](/reference/lua-dsl/#sigillogmessage-and-sigilattachname-value).
- **W008 — unknown scenario metadata keys.** `timeout`, `timeout_ms`, `budget_ms` and typos of real keys were silent no-ops; they now warn with a near-miss hint pointing at `budget = { max_seconds = N }`, in both lint modes and under `sigil run`.
- **Capability inference sees a call result indexed inline** — `expect(sigil.exec("x").status == 0)` in a policy-less scenario now infers `exec` instead of being denied; the same fix feeds E003/E007.
- **I001 ("no assertions")** counts `expect.<method>()`, `invariant()`, and `sigil.check()`, not only literal `expect(`.

## [0.30.0] — 2026-08-19 — Meeting in the Middle

The follow-up to Running Boxes. 0.29.0 gave `sigil run` named services and `--endpoints-from`, and gave the configured modes per-service reset hooks — but not to each other, so a box sigil did not deploy still could not be reset from a project-less run. 0.30.0 closes that gap, and fixes a pinning hole the same tool-fed shape exposed. One behavior change to read before upgrading: a `sigil run` that declares only named services (no bare `--endpoint`) is now pinned to those origins instead of running unpinned; a run that declares no origins at all is unchanged.

- **`sigil run --reset [NAME=]METHOD:/path` and `--resets-from <json>`** — reset hooks for the project-less runner. `--reset` (repeatable) sends an HTTP request before every scenario, to the primary `--endpoint` or, with `NAME=`, to a named service declared with `--endpoint name=url` / `--endpoints-from`; any 2xx is success. `--resets-from` (`-` reads stdin) loads a JSON array whose entries carry the same fields as a `[[scenario.reset]]` table — `method`, `path`, `service`, `headers`, `body`, `expected_status` — for hooks that need more than a method and a path. Validated before the first scenario runs with the same rules `[scenario.reset]` gets at config load; a hook that fails at run time fails that scenario without executing its body (`failure_class = "crash"`). Hooks only reach the primary or a declared service with a relative path, so they add no pinning surface. See [Quickstart: Test a Running Service → Reset between scenarios](/quickstart-local/#reset-between-scenarios) and [CLI → `sigil run`](/reference/cli/#sigil-run).
- **A services-only `sigil run` is now pinned.** Origin pinning was inert whenever no bare `--endpoint` was passed, even with named services declared — so the tool-fed multi-twin shape ran with pinning off and any `opts.base_url` could reach any origin. A non-empty declared-origin set now activates pinning on its own: the run is confined to the union of the `--endpoint` origin (when given), every named service origin, and every `--allow-origin` value, for requests and 3xx `Location` targets alike. `--allow-origin` still widens the set, `--allow-cross-origin` still disables pinning, the single-origin diagnostics are unchanged byte-for-byte, and blocks report `failure_class = "pinning"`.
- **`sigil ci` explains a policy-mode cap.** Only `auto` can ever ALLOW, so a clean eval under `shadow`, `advisory`, or an unset mode returns REVIEW — and `sigil ci` used to render that exactly like a failed review. The commit status now reads `sigil: REVIEW — clean (8/8 passed); capped by shadow mode (ceiling: review)`, the PR comment carries the `shadow_mode_cap` rationale, and `--format json` gains `policy_mode`, `mode_ceiling`, `mode_capped`, `mode_cap_reason`. A REVIEW with real findings keeps its counts and carries no cap vocabulary; exit codes and status states are unchanged. See [CI integration → Branch protection](/guides/ci-integration/#branch-protection).
- **A missing `require('lib.x')` helper names the directory it was looked for in.** Under `sigil run` the error now appends the anchor it resolved from — the directory argument the scenario was found under, or the file argument's parent — and suggests `--lib-dir` when it was not already given; an explicit `--lib-dir` failure names that directory instead. `failure_class` stays `"crash"`. See [Where `require('lib.X')` resolves](/guides/writing-scenarios/#where-requirelibx-resolves).
- **`sigil init`** commented the policy table as `# [[policy.{service_name}]]` (array-of-tables syntax for what is one table per service); it is now `# [policy.{service_name}]`.
- **Docs: [Configuration](/reference/configuration/) audited against the published schema.** `[eval]` is filled out (`runs_per_scenario`, `confidence_level`, `pass_threshold`, `progressive`, `differential`, budgets, `max_eval_age`) and the previously undocumented `[holdout]`, `[feedback]`, `[security]`, `[ledger]` — home of the `max_staleness_for_allow` freshness gate — `[attestation]`, `[observability]`, `[browser]`, and `[risk]` tables have sections. Every TOML block on the page is now validated against the schema by a drift check in this site's build tooling, so the page cannot quietly diverge again.

## [0.29.0] — 2026-08-19 — Running Boxes

A release shaped by someone pointing sigil at a box that was already running rather than at a PR: several twins on one host, each with its own reset URL, fed from a tool that already knows the service map, run in CI where third-party Lua must not get a shell. Plus the first published JSON Schema for `sigil.toml`, a config-side `sigil.env()` allowlist for evals, and the fixes that had landed since 0.28.0 without release notes. Two behavior changes to read before upgrading, neither of which affects a config that does not set the fields involved: an eval with `[scenario.reset]` hooks configured now *sends* them (and refuses hooks combined with `scenario_concurrency > 1`), and teardown plus the `container` / `kubernetes` start commands are now time-bounded. Nothing is denied, reset, or bounded differently by default otherwise.

- **`sigil run --endpoints-from <PATH>`** loads named `--endpoint` services from a flat JSON file (`-` reads stdin) — `rig env --format json | sigil run scenarios/ --endpoint http://a:8080 --endpoints-from -`. Every key becomes a named service, validated and folded into the origin pin set exactly like `--endpoint name=url`; the primary endpoint stays argv-only, a name declared in both is an error, and a bad file, bad JSON, or bad origin aborts before any scenario runs. See [Quickstart: Test a Running Service](/quickstart-local/).
- **`[[scenario.reset]]` — several reset hooks, each able to target a named `[eval] service`.** A box with more than one twin resets each of them before every scenario. The single-table form parses exactly as before; hooks fire in declaration order, the first failure fails that scenario without sending the rest, `path` stays relative per target so a reset can never leave the pinned origin set, and an undeclared `service` is a config error listing the declared names. See [Configuration → `[scenario.reset]`](/reference/configuration/#scenarioreset).
- **`sigil eval` fires `[scenario.reset]` hooks** — before each scenario, PR deploy then baseline deploy, named-service hooks resolving through `[eval] services` for both. A failed reset is that side's setup failure: its scenario body does not run, the other side is untouched, and the pair reads as a regression, never ALLOW. Hooks plus `[eval] scenario_concurrency > 1` is refused before anything deploys rather than quietly downgraded to sequential. (`sigil run` got its own `--reset` / `--resets-from` flags in 0.30.0.)
- **Capability denylist.** `[eval] denied_capabilities = ["exec", …]` and repeatable `sigil run --deny-capability <NAME>`. Nothing is denied by default; an unknown name is a hard error. Enforced fail-closed at three layers — lint error `E007` on both the `policy.capabilities` declaration and every call site, a runtime denying stub installed regardless of what the scenario declared, and `sigil.intent` tool exposure — and a blocked scenario reports `failure_class = "capability"`. The motivating case: `sigil.exec` runs `sh -c` on the host running sigil, not inside the deployed container, so deny it wherever third-party or agent-authored scenarios run.
- **JSON Schema for `sigil.toml`.** `sigil schema config` prints the schema for the whole supported configuration, generated from sigil's own config types and drift-tested in CI, and it is published at [runsigil.com/schemas/sigil-config.schema.json](/schemas/sigil-config.schema.json). `sigil init` writes a `#:schema` header pointing there, so editors with TOML schema support offer completion and flag unknown keys with no per-workspace setup. See [Configuration](/reference/configuration/).
- **`[scenario.env]` — `sigil.env()` now works under `sigil eval`.** Previously eval hardcoded an empty allowlist and every `sigil.env(KEY)` returned nil; only `sigil run --env` populated it, and an earlier version of this site documented a `[scenarios.env]` table that had never been implemented. `[scenario.env]` is a strict per-key allowlist mirroring `sigil run --env`: `KEY = "literal"` or `KEY = { from = "PROCESS_ENV_NAME" }` for a passthrough that keeps secrets off disk, read from the control snapshot so a PR cannot widen its own allowlist. See [Configuration → `[scenario.env]`](/reference/configuration/#scenarioenv--environment-variables-in-scenarios).
- **`[deploy] teardown_timeout`** (default 600s) bounds teardown, which previously ran with no time bound. Separate from `startup_timeout` on purpose — start fast, tear down patiently. On expiry the process is killed and reaped and a greppable `SIGIL_TEARDOWN_LEAK` warning names the environment so an operator can reclaim anything left behind.
- **`container` and `kubernetes` backends honor `[deploy] startup_timeout`.** Both shelled out to a blocking `docker run` / `kubectl apply` with no bound, so a wedged pull or stuck apply hung the eval with no decision. A timeout is now a fail-closed failure, as it already was for `compose`.
- **`sigil eval --judge-model` actually reaches the judge.** The flag was applied to the working-checkout config but the judge is built from the control snapshot, so it silently had no effect. It is now an explicit override applied to the snapshot — CLI flag beats both configs — and the provenance table records `judge.model` as `cli-flag`.
- **git subprocess output no longer leaks onto stdout.** `git worktree add` printed `HEAD is now at …` to the inherited stdout, so `sigil eval --format json` could hand a machine consumer a git line prepended to the JSON document. The git helpers now capture both streams and re-emit them on stderr.
- **`sigil trust` and `sigil decide` agree on an unset policy mode.** `trust show` rendered a missing `[policy] mode` as `advisory` while `decide` rendered it as `unset`; both capped at REVIEW but disagreed on the displayed state. Both now render `unset` with its REVIEW ceiling; explicit modes and exit codes are unchanged.
- **Docs: a second quickstart — [Test a Running Service](/quickstart-local/)** — the no-config `sigil run --endpoint` path; the `sigil.exec` reference and LuaLS type stub now match the runtime (`(command, opts{cwd, env, stdin}) -> { stdout, stderr, status }`); and this configuration reference was reconciled with the real config keys (`[deploy]`, `[policy.<service>]`, `default_service`).

## [0.28.0] — 2026-08-01 — Field Reports

Five field reports and what they turned up. No breaking changes; no migration. The through-line is failures that reported the *wrong* thing rather than nothing — a config field parsed and validated and then dropped, a decision cap that was correct but unexplained, a deployment that hung with no decision emitted, a helper path resolved against the wrong directory.

- **`sigil run` resolves `require('lib.x')` from the scenario tree you named**, not from its own working directory. It previously resolved `lib/` the way the configured modes do — against a `[[scenarios]]` root — despite having no config to read, and so fell through to a *relative* `scenarios/run/lib/`. A scenario tree staged anywhere else could not load its own helpers at all; and because the path was relative it resolved against sigil's working directory, so a run launched from inside another repository would read *that* repository's helpers if it had any. Resolution now uses the discovery anchor — the directory argument a scenario was found under, or a file argument's parent — as an absolute path. See [Where `require('lib.X')` resolves](/guides/writing-scenarios/#where-requirelibx-resolves).
- **`sigil run --lib-dir <DIR>`** names that directory outright, for tools that embed sigil as a runner over a tree they stage themselves. Validated before any scenario runs, so a bad value aborts the invocation instead of surfacing as a require failure partway through a suite.
- **`[deploy].startup_timeout` is honored instead of silently ignored.** No code read it at all: it was parsed, defaulted, validated and documented, then dropped, for every backend. It now bounds the compose start command — image pull, container create/start — while `health_timeout` continues to bound the readiness poll, so each name means the phase it describes.
- **A wedged `docker compose up` can no longer hang an eval forever.** It ran with no deadline, so a stuck registry pull blocked indefinitely with no decision emitted. It is now killed and reaped on expiry and fails closed. Teardown stays unbounded deliberately — a cut-short `down` would leak containers.
- **`sigil eval --failure-artifact <FILE>`** writes a fixed-vocabulary failure phase as JSON on every terminal outcome, including runs that produce no eval report. A caller that must preserve holdout secrecy can now tell a failed deploy leg from an undecryptable scenario set from an uncovered strict MUST from an internal evaluator error, without parsing stderr. The artifact carries only that closed vocabulary and config field names — never scenario ids, endpoints, rubric text, config values, or raw error strings. Each structured deployment failure also reports which config fields came from the working checkout, the control snapshot, a CLI flag, or the environment.
- **`sigil decide` explains the mode cap.** Only `auto` can ever ALLOW, so a clean evaluation in `shadow` or `advisory` returns REVIEW — unchanged, but previously unexplained. The rationale now carries `shadow_mode_cap` / `advisory_mode_cap` / `policy_mode_unset_cap`, and `--json` adds `policy_mode`, `mode_ceiling`, `mode_capped` and the full `lattice`. A REVIEW that came from real findings carries no cap code, so an operator can confirm a clean shadow run without opening a protected report.
- **`sigil keys add` works on a fresh project and is idempotent.** It creates the `[keys]` table when sigil.toml lacks one, and re-adding a name with the same recipient is a successful no-op that never prompts — safe to run repeatedly from headless provisioning. Re-adding with a *different* recipient still confirms interactively, but now fails closed without mutating sigil.toml when there is no terminal to confirm on; `--force` replaces it non-interactively.

## [0.27.0] — 2026-07-29 — Scenario Store Layout

**Breaking: existing projects must run `sigil migrate`** — dry-run by default, add `--apply` to write. Scenario ids are unchanged by the move, so ledger history stays comparable.

- **Scenario source moves out of `.sigil/` to the project root.** `.sigil/scenarios/<svc>/{visible,holdout,staging}/` becomes `scenarios/<svc>/`. `.sigil/` now holds only tool state — config, blobs, ledger, proofs, generated type stubs — while scenarios live where they can be found and edited like any other source. See [Writing Scenarios](/guides/writing-scenarios/#file-layout).
- **The file extension is the source of truth for visibility.** `foo.lua` is visible, `foo.lua.age` is an age-encrypted holdout, `foo.staged.lua` is generated output awaiting promotion. `lib/` is the only reserved directory name. Three invalid states stop being representable: a plaintext `.lua` under `holdout/` was a leaked holdout, and there is no `holdout/` now; a directory and an extension could disagree about visibility, and there is one signal; and promoting a scenario was a cross-tree move that broke `git log --follow`, where it is now an encrypt in place at the same path.
- **`sigil migrate`** — one command to upgrade. Refuses a dirty git worktree, refuses when both layouts are populated, and refuses to move an unencrypted file out of `holdout/` (in the new layout that name *means* visible, so migrating it would publish it). Uses `git mv` so history follows each file, is idempotent, and verifies the scenario-id set is identical before and after — a migration that would silently drop or rename a scenario aborts rather than reporting success.
- **Promoting to holdout without configured recipients is now an error.** It previously warned and wrote plaintext, which was survivable when a directory carried the designation. Now that visibility *is* the extension, an unencrypted holdout is indistinguishable from a visible one, so that path silently published held-out scenarios to the coding agent. Promotion is all-or-nothing.
- **`[[scenarios]]` config, with multi-root support for monorepos.** Declare where scenario trees live, and colocate them with the service they exercise rather than forcing one central tree. Each root resolves its own `lib/`. Replaces the old `[scenarios]` table. See [Configuration](/reference/configuration/#scenarios).
- **Sealed-recipient manifests are embedded in the age header**, replacing the `.sealed.json` sidecar. A manifest cannot drift from the file it describes, is readable with no key at all — the point being that you need to know who a bundle was sealed to precisely when you cannot open it — keeps the file decryptable by stock `age` / `rage`, and is covered by age's header MAC, so a forged recipient list makes the file fail to decrypt. It remains an assertion, not proof of identity: a missing manifest means *unknown* recipients, never *verified*.
- **Holdout scenario set hashes change once, at migration.** Re-sealing yields new ciphertext, and an embedded manifest changes which digest is hashed. `sigil migrate` records a `scenario.layout_migrated` ledger event so `replay` / `diff` can explain the discontinuity instead of presenting prior evals as corrupt.

## [0.26.0] — 2026-06-25 — Decision-Gate Hardening + Structured Judge

- **Security gates fail closed.** Mark a scanner `required` and a scanner that can't run — missing binary, timeout, or unparseable output — now blocks the merge instead of silently passing. New per-scanner modes (`disabled` / `advisory` / `required`) and a configurable per-scanner timeout (default 120s).
- **The security report now reaches the decision.** Fixed: scan findings were not being carried into `sigil decide`, so a failing security gate didn't actually influence ALLOW / REVIEW / BLOCK. Findings are now round-tripped from the eval through to the decision end-to-end.
- **An eval without durable evidence can't ALLOW.** If sigil can't persist the report, scenario evidence, eval DAG, or ledger event, the eval is marked degraded and the decision drops to REVIEW — a score you can't reproduce shouldn't earn autonomy.
- **More reliable LLM judging.** The judge now uses structured tool/function calling instead of parsing prose, so verdicts come back as typed values — no more "the model wrote an essay instead of JSON," and no fragile score-scraping. Works across OpenAI-compatible, tool-calling, and command providers, with a JSON-mode fallback; malformed output is a judge failure, never a silent pass.
- **Faster ad-hoc contracts.** A one-line scenario — `return { run = function() ... end }` — now runs as-is: capabilities are inferred from the body and `priority` is optional on the `sigil run` path. Committed suites still get the full strict `sigil scenario lint`.
- **New guide: the contract handoff.** An end-to-end walkthrough of authoring a contract in sigil, packaging it as a `.wic`, and verifying it as a provider with wraith — including the exit-code and `failure_class` mapping. See [Guides → .wic handoff](/guides/wic-handoff/).

## [0.25.0] — 2026-06-13 — Intent-Contracts Surface + Untrusted-Input Hardening

- **`sigil.check(expr, label)`** — advisory checks: a nonfatal tier alongside `expect()`. Outcomes are recorded in the report but never fail the scenario or change the exit code. The expression is evaluated defensively, so a check against a field that drifted away (e.g. `auth.json.id`) records an evaluation error instead of crashing the run. Each appears in a per-scenario `checks[]` block.
- **`sigil run --env KEY[=VALUE]`** — docker-style, repeatable. `--env FOO=bar` sets a value; bare `--env FOO` passes a value through from sigil's own environment so secrets never appear on the command line. Strict allowlist: only named keys reach `sigil.env()`.
- **Endpoint pinning (security).** By default `sigil run` confines every HTTP call and redirect to the `--endpoint` origin — a scenario can no longer redirect a request to an arbitrary host (cloud metadata endpoints, attacker origins) via `base_url`, even one built at runtime. `--allow-cross-origin` opts out. In configured modes, a `[eval] allowed_origins` allowlist permits known sidecars.
- **Machine-readable failure detail in `--json`.** Per-scenario entries now carry `failure_class` (`"assertion"` for a behavior problem, `"crash"` for a tooling/runtime problem, `"pinning"` for an endpoint-pinning violation) and an `expects[]` array recording every `expect()` outcome with its source and lifted `---` description — so tools can branch on outcomes without scraping error text.
- **`sigil scenario lint-path <paths...> --json`** — lint arbitrary `.lua` files with machine-readable findings, no project layout required.
- **`sigil scenario run --format json`** — the configured runner now emits the same report schema as `sigil run --json`.
- **New scenario lints** — unknown capability names (E005) and the `wraith` helper capability declaration (E006) are now caught statically.
- **Faster, hardened scenario parsing.** An owned Lua 5.4 lexer replaces the previous tokenizer on the scenario-rewriting path: ~2.5× faster, and hardened so malformed or hostile scenario files fail with a normal report entry instead of ever crashing the `sigil` process. Deep nesting, runaway memory allocation, and pathological input are all bounded; a scenario's declared time budget is now honored (capped at the operator's ceiling).

## [0.24.0] — 2026-06-07 — Native Browser Hardening

- **`sigil run --json`** — machine-readable run report on stdout (`{status, total, passed, failed, scenarios:[…]}`); exit codes unchanged, human output still the default.
- **`sigil run` is quiet by default** — internal browser-session logs are gated behind `RUST_LOG=info`; in `--json` mode all logs stay on stderr so stdout is valid JSON.
- **Browser reliability** — `open`/`reload`/`back`/`forward` wait for the page load event before returning; the remaining `sigil.browser.*` getters (`value`, `attr`, `count`, `visible`, `enabled`, …) are wired and now raise on backend errors instead of silently reporting `false`; `screenshot("path")` writes a sandboxed PNG file.
- **Migrated to the published `asupersync` 0.3.2 crate** (capability-secure IO model), fixing CI.

## [0.23.0] — 2026-05-27

### Added
- **`sigil run [PATHS...]`** — minimal scenario runner. No `.sigil/sigil.toml` required. Walks files/directories for `*.lua` (recursive, `lib/` skipped), runs each via the in-process scenario runtime, prints pass/fail + summary. Flags:
  - `--filter <SUBSTR>` (repeatable, OR'd, substring on path and scenario title)
  - `--tag <T>` / `--exclude-tag <T>` (existing scenario tag semantics; exclude always wins)
  - `--endpoint <URL>` (optional; surfaces a clear error at first HTTP call if unset, so browser-only / client-side scenarios can run without one)
  - Exit codes: 0 all passed, 1 some failed, 2 zero scenarios matched (pytest convention)
- **`[browser] headless` config + `SIGIL_BROWSER_HEADLESS` env override** — set to `false` to see the browser window during local development.
- **Clearer `sigil install-browser` output** — distinguishes `Reusing cached chrome …` on cache hit from `Using system chrome …` (with `--use-system`) and `Installed chrome …` (fresh download).

### Fixed
- **Native browser backend (the 0.22.x cutover default) now functional end-to-end.** The CDP bridge was previously stubbed: every `sigil.browser.*` call returned `Err(Shutdown)` in <1ms without ever launching Chrome. This release wires `JobKind::CdpCall` / `AwaitEvent` / `AwaitDownload` through the live CDP client, event router, and download tracker; primes a default page session on launch and routes `Page.*`/`Runtime.*`/etc. accordingly.
- **`NativeBrowserManager::plan_call` handles 14 of 17 `BrowserCall` variants** (was 7). Wired: `Fill`, `Wait`, `Html`, `Type`, `Press`, `Hover`, `Check`, `Select`, `Scroll`, `Checked`, `WaitDownload`, `Cookies`, `Pdf`, `Snapshot`, `Upload`.
- **`sigil install-browser` HTTPS transport** wired through asupersync — pinned Chrome-for-Testing zip downloads + verifies + extracts in a single command on a clean host. Distinct error variants for DNS / TLS / connect / partial-body / HTTP-status failures.
- **`sigil install-browser` cache-hit writes the `current` pointer** so `sigil browser doctor` doesn't immediately report the binary as missing after a successful pre-populated install.
- **`sigil browser doctor` `use_system_fallback` row** reads coherently across all four states (Sigil install + no system, Sigil install + system available, system only, neither).
- **`scenario run --deploy` retry race** — back-to-back invocations no longer fail with "Error deploying service" after killing a stale process. Port-readiness polling after SIGTERM (with SIGKILL escalation after 2s), foreign-pid guard via `/proc/net/tcp{,6}`.
- **`cdp/client` integration tests** un-`#[ignore]`d (7 tests). Root cause was a dangling reader task keeping the server-side TCP half open.
- **Workspace clippy gate** (`cargo clippy --workspace --all-targets --locked -- -D warnings`) now exits 0 (was ~213 errors in test code). Added to CI.

### Security
- **`sigil.browser.upload` routes every file path through a per-scenario path sandbox** before `DOM.setFileInputFiles`. Previously caller-supplied paths went straight to Chrome, letting an untrusted scenario attach any file on the host (`/etc/passwd`, SSH keys, etc.) to a form. The sandbox canonicalizes paths after symlink resolution, rejects escapes (`OutsideAllowedRoots`), and fail-closes on a missing root. Allowed root is the **scenario file's parent directory**, so uploads can only reach fixtures sitting next to the scenario.

### Performance
- **Native browser only launches when a scenario declares `"browser"` capability.** Previously every scenario eagerly spawned Chrome (twice — once per PR/baseline env) before policy was even parsed. Pure-HTTP scenarios in `sigil eval --tag health` went from ~282ms/scenario to ~1ms/scenario.
- **Lazy browser-init backstop**: even browser-declared scenarios that never actually call the browser don't pay launch cost.
- Mis-declared scenarios that call `sigil.browser.*` without the `"browser"` capability now fail with a clear policy error instead of silently launching Chrome anyway.

### BREAKING (carried from prior cutover)
- `[browser] backend` default flipped from `cli` to `native`. Browser scenarios now run in-process via the `sigil-browser` crate by default. The CLI backend (`agent-browser`) shell-out path was removed; `backend = "cli"` still deserialises (so existing configs do not fail to parse) but every `sigil.browser.*` call returns a structured "removed" error directing operators to set `backend = "native"`.

## [0.21.0] — 2026-04-30

### Added
- **Scenario DSL**:
  - `sigil.sleep()` primitive for timing control with budget enforcement
  - `sigil.expect_status_class()` helper for HTTP response class assertions (2xx, 4xx, 5xx)
  - Per-scenario reset hook via `[scenario.reset]` config
  - Per-call `base_url` override on HTTP methods

- **Scenario management**:
  - `scenario promote` command for staging → holdout workflow
  - Holdout split support during promotion
  - `--seed` flag for deterministic scenario generation
  - Tag-based filtering: `--tag` and `--exclude-tag` selectors for all scenario commands
  - Scenario-level skip directives with reasons in reports

- **Scenario generation**:
  - `--filter` and `--limit` flags for scenario generate plan scope
  - Per-case logging in scenario generation

- **Judge system**:
  - `--judge-model` flag to compare judge outputs across different models
  - `sigil compare` command for side-by-side judge evaluation

- **Configuration**:
  - Prompt injection of configured `SIGIL_SEED_KEYS` into generation
  - Enhanced few-shot examples for spec-to-logs mapping
  - Improved JSON error handling with mode hints

### Fixed
- Scenario `run` and `dry-run` now honor skip directives
- Promotion correctly handles staging paths
- Staging-category names no longer leak into scenario tags
- Judge output now deterministic across runs (fixed parameter settings)

## [0.20.1-rc.1] — 2026-04-21

### Added
- **Scenario generation CLI**:
  - `sigil scenario generate` orchestrator for end-to-end generation
  - Stage 3 execution validation (opt-in via `--verify` flag)
  - Scenario-level skip with reason surfacing in eval reports
  - `--tag` / `--exclude-tag` selectors for `scenario run` and `scenario dry-run`
  - `scenario promote` subcommand for staging → visible/holdout split

- **Scenario DSL enhancements**:
  - `--seed` flag for deterministic generation
  - `--filter` and `--limit` for generation scope control

- **Judge system**:
  - `--judge-model` flag for cross-model comparison
  - `sigil compare` command
  - Claude-code provider for judge with structured output

- **CI integration**:
  - `sigil ci` command for PR evaluation and GitHub status
  - Config context resolution via frontmatter

- **Browser automation**:
  - `sigil.browser` API: `open`, `click`, `fill`, `wait`, `text`, `html`, `title`, `url`, `screenshot`, `eval`, `cookies`, `snapshot`, `visible`
  - Session isolation per scenario

- **Agentic intent**:
  - `sigil.intent()` for LLM-driven scenario execution
  - Tool-use with automatic tool descriptors
  - Capture fields for structured data extraction
  - Thinking model support

- **CLI enhancements**:
  - `sigil keys add-self` for key management
  - `sigil scenario run --all` for batch execution
  - `sigil feedback --last` for agent dev loop
  - `--no-baseline` flag for `sigil eval`
  - `--deploy` flag for `sigil scenario run` (self-contained execution)
  - Progress reporting for eval and scenario run
  - Format auto-detection and shell completion

### Fixed
- Judge parameter settings for deterministic output
- Judge provider argument handling
- Scenario CLI log buffer handling
- Scenario skip directive processing

## [0.20.0] — 2026-03-05

### Added
- **Kubernetes backend**:
  - `sigil eval` now supports Kubernetes deployments via kubectl
  - Configure via `[deploy]` section in sigil.toml

- **Container backends**:
  - Bare container backend for `docker run` / `podman run` single-container services
  - Configurable compose command (docker-compose, podman-compose, etc.)

- **Endpoint management**:
  - `--pr-endpoint` flag to evaluate against specific PR endpoint
  - `--baseline-endpoint` flag to evaluate against specific baseline endpoint

- **Documentation**:
  - Comprehensive Scenario DSL user reference
  - CLI help text improvements with examples

## [0.19.0] — 2026-03-05

### Added
- **Deploy backend selection**: Configure primary backend in `sigil.toml`
- **Compose CLI flexibility**: Support for podman-compose, docker-compose variants
- **Endpoint control**: `--pr-endpoint` and `--baseline-endpoint` flags for custom deployments

## [0.18.0] — 2026-03-05

### Added
- **GitHub Actions integration**: Deploy and verify via GitHub workflows
- **CLI improvements**: Long help text, workflow examples, agent-friendly documentation

## [0.17.0] — 2026-03-05

### Added
- **Attestations**: In-toto attestation generation and Ed25519 signing
- **Output formats**:
  - JSON format shorthand: `--json` alias for `--format json`
  - Format auto-detection: pretty for TTY, text for pipes
  - Shell completion generation

- **Diagnostics**:
  - Enhanced `sigil doctor` with comprehensive prerequisite checks

## [0.16.0] — 2026-03-05

### Added
- **Dashboard**: Web UI for eval and trust overview
- **Trust commands**:
  - `sigil trust show`: View current trust state
  - `sigil trust history`: Review trust transitions
  - `sigil trust mode`: Check and transition trust levels

- **Eval enhancements**:
  - Failure-triggered baseline re-check
  - `sigil report`: Reconstruct eval reports from ledger

- **Policy hooks**: Optional OPA/Rego policy verification

## [0.15.0] — 2026-03-05

### Added
- **Adaptive evaluation**: Early termination based on confidence
- **LLM judge**: `sigil.judge()` Lua API for semantic assertions
- **Judge configuration**: `[judge]` section in sigil.toml with provider selection
- **Evaluation**: `sigil diff` for comparing two evaluation results
- **Judge providers**: Support for multiple judge backends

## [0.14.0] — 2026-03-05

### Added
- **Replay**: `sigil replay` to re-execute scenarios from recorded artifacts
- **Reporting**: `sigil report` to reconstruct reports from ledger

## [0.13.0] — 2026-03-05

### Added
- **Security gates**:
  - Automated secret scanning (trufflehog)
  - Dependency vulnerability scanning (trivy)
  - Static analysis (semgrep) for code quality checks

## [0.12.0] — 2026-03-05

### Added
- **Parallel execution**: Concurrent scenario runs for faster evaluation
- **Judge consensus**: Quorum voting across multiple judge instances

## [0.11.0] — 2026-03-05

### Added
- **Trust model**: Per-service trust scoring
- **Judge fallback**: Automatic fallback to secondary model on provider failure

## [0.10.0] — 2026-03-05

### Added
- **GitHub Actions**: `sigil-action` workflow integration

## [0.9.0] — 2026-03-05

### Added
- **Policy engine**: `sigil decide` with threshold-based approval

## [0.8.0] — 2026-03-05

### Added
- **Evaluation reports**: JSON eval reports with detailed results

## [0.7.0] — 2026-03-05

### Added
- **Baseline comparison**: `sigil eval` compares PR against baseline
- **Satisfaction scoring**: Quantified results vs baseline

## [0.6.0] — 2026-03-05

### Added
- **Scenario execution**: `sigil eval` runs scenarios against deployed environments
- **Type stubs**: `sigil generate-types` for LuaLS IDE support
- **Blob store**: Content-addressed artifact storage with integrity verification

## [0.5.0] — 2026-03-05

### Added
- **Scenario runner**: `sigil scenario run <scenario>` for local development
- **HTTP client**: `sigil.get()`, `sigil.post()`, `sigil.put()`, `sigil.patch()`, `sigil.delete()`
- **CLI runner**: `sigil.exec()` for command execution

## [0.4.0] — 2026-03-05

### Added
- **Project setup**: `sigil init` scaffolds new sigil projects
- **Health checks**: `sigil doctor` validates environment and dependencies
- **Lua API**: `sigil.*` globals: `env()`, `json()`, `yaml()`

## [0.3.0] — 2026-03-05

### Added
- **Scenario DSL**:
  - `expect(expr)` with power assertions
  - `invariant(name, opts)` for property testing
  - Generators: `sigil.gen.string()`, `sigil.gen.int()`, etc.

- **Key management**: `sigil keys` commands for scenario encryption
- **Holdout scenarios**: Support for hidden test scenarios
- **Scenario management**: `sigil scenario list`, `sigil scenario dry-run`

## [0.2.0] — 2026-03-05

### Added
- Initial public release
- Core evaluation engine
- Scenario support with Lua DSL
- Docker Compose deployment
- Basic evaluation reporting
