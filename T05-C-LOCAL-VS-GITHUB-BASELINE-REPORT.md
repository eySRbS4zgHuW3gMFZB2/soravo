# T05-C — Local Working Tree vs GitHub `main` Baseline Audit

Date: 2026-09-28
Repository: `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
Branch: `main`
Scope: read-only audit. No source, config, or MCP changes were made.

---

## 1. Git State

| Item | Value |
|---|---|
| Local `HEAD` | `ede495b55efd95cedd882d90a19d12b4777da852` |
| Local `origin/main` | `ede495b55efd95cedd882d90a19d12b4777da852` |
| `git ls-remote origin main` | `ede495b55efd95cedd882d90a19d12b4777da852` |
| Ahead / behind | `0 / 0` |
| Staged changes | none (`git diff --cached --stat` empty) |

Local `HEAD` is identical to GitHub `main`. **The two trees are not the same
content, however** — the working tree carries a large uncommitted delta. GitHub
Actions checks out the committed tree, so it never sees these changes.

### Working-tree inventory (default-collapsed porcelain, 91 entries)

| Class | Count |
|---|---|
| Tracked modifications (`M` in worktree) | 23 |
| Tracked deletions (`D` in worktree) | 34 |
| Untracked entries (`??`) | 34 |
| Staged | 0 |

Nothing is staged. All 34 deletions are worktree deletions of files that remain
tracked in the index (`git ls-files --error-unmatch` still resolves them).

---

## 2. Attribution of the T03 Recovery Changes

All T03 work is **uncommitted** and therefore **absent from GitHub `main`**.
Nothing in this section is on the remote.

### 2.1 Tracked modifications (23)

| File | Group |
|---|---|
| `Cargo.toml` | dependency/workspace recovery |
| `Cargo.lock` | dependency/workspace recovery |
| `pnpm-lock.yaml` | web lint recovery |
| `crates/scheduler/src/lib.rs` | Rust fmt |
| `apps/desktop/src-tauri/Cargo.toml` | dependency/workspace recovery + cpal/rodio alignment |
| `apps/desktop/src-tauri/build.rs` | desktop recovery |
| `apps/desktop/src-tauri/src/lib.rs` | desktop recovery |
| `apps/desktop/src-tauri/src/audio_toolkit/mod.rs` | Rust fmt + audio module wiring |
| `apps/desktop/src-tauri/src/audio_toolkit/vad/mod.rs` | Rust fmt |
| `apps/desktop/src-tauri/src/managers/model.rs` | desktop recovery |
| `apps/desktop/src-tauri/src/managers/model/download.rs` | desktop recovery |
| `apps/desktop/src-tauri/src/secure_input.rs` | desktop recovery |
| `apps/desktop/src-tauri/src/settings.rs` | desktop recovery |
| `apps/desktop/src-tauri/src/tray_i18n.rs` | desktop recovery |
| `apps/website/src/lib/payment-service.ts` | web lint |
| `apps/website/src/pages/account.tsx` | web lint |
| `apps/website/src/pages/pricing.tsx` | web lint |
| `apps/website/src/pages/pricing.test.tsx` | web lint |
| `packages/payment-domain/package.json` | web lint |
| `packages/payment-domain/src/types.ts` | web lint |
| `services/license-api/src/payment/catalog.ts` | web lint |
| `services/license-api/src/payment/catalog.test.ts` | web lint |
| `services/license-api/src/payment/service.ts` | web lint |

### 2.2 Untracked T03 files

- `apps/desktop/.env.example`
- `apps/desktop/src-tauri/src/audio_toolkit/audio.rs`
- `apps/desktop/src-tauri/src/audio_toolkit/post_process.rs`
- `apps/desktop/src-tauri/src/audio_toolkit/wav.rs`
- `apps/desktop/src-tauri/src/commands/account.rs`
- `apps/desktop/src-tauri/src/helpers/clamshell.rs`
- `apps/desktop/src-tauri/src/helpers/mod.rs`
- `apps/website/src/lib/payment-service.test.ts`
- `packages/payment-domain/eslint.config.js`

Untracked files are the highest-risk class here: they are invisible to `git diff`,
to Actions, and to any `git stash`/restore of tracked files. Seven of the nine are
required for the desktop crate to compile at all.

### 2.3 Tracked deletions (34)

The deletions are the `docs/spec-v3/` tree, with untracked replacements under
`docs/archive/`. This is an unrelated documentation migration and is **not** part
of the T03 recovery. It is also invisible to GitHub.

### 2.4 Already committed / absent from GitHub

- `deny.toml` is present in `HEAD` and unmodified. The audit-ignore policy is
  committed; the advisories it fails to cover are not a local regression.
- `apps/desktop/src-tauri/src/audio_feedback.rs` is unmodified locally. Its
  `cpal::traits::{DeviceTrait, HostTrait}`, `rodio::OutputStreamBuilder`, and
  `rodio::play` usage already matches the cpal 0.16 / rodio 0.21 API surface, so
  the dependency bump needs no source change there.
- The four `docs/spec-v3` archived replacements, the T03 reports themselves, and
  all code changes above are absent from GitHub.

---

## 3. Local Verification Results

Commands were run from the repository root. `pnpm install --frozen-lockfile` was
run only after confirming `node_modules/` is gitignored; it reported
`Already up to date`.

| Check | Command | Exit | Result |
|---|---|---|---|
| JS install | `pnpm install --frozen-lockfile` | 0 | up to date |
| JS lint | `pnpm lint` | 0 | all 4 package lint commands passed |
| JS typecheck | `pnpm typecheck` | 0 | passed |
| JS test | `pnpm test` | **1** | see 3.1 |
| JS build | `pnpm build` | 0 | website + desktop bundles built |
| JS audit | `pnpm audit --prod` | 0 | no known vulnerabilities |
| Rust fmt | `cargo fmt --all -- --check` | 0 | passed |
| Rust test (non-desktop) | `cargo test --workspace --exclude soravo-desktop` | 0 | 99 passed, 0 failed |
| Rust test (workspace) | `cargo test --workspace --no-run` | **101** | blocked at `build.rs:42` |
| Rust clippy (non-desktop) | `cargo clippy --workspace --exclude soravo-desktop --all-targets -- -D warnings` | 0 | passed |
| Rust clippy (workspace) | `cargo clippy --workspace --all-targets -- -D warnings` | **101** | blocked at `build.rs:42` |
| Rust audit | `cargo audit --deny warnings` (CI ignore list) | **1** | see 3.2 |
| Rust deny | `cargo deny check` | **1** | see 3.2 |
| Desktop check | `cargo check -p soravo-desktop --all-targets` | **101** | blocked at `build.rs:42` |

Per-package JS tests all pass individually: `@soravo/website`, `@soravo/desktop`,
`@soravo/license-api`, `@soravo/payment-domain`.

### 3.1 `pnpm test` failure is a pre-existing environment defect

The failure is isolated to the `supabase/tests` stage:

```
FAIL supabase/tests/webhook-hardening.test.mjs
Error: Cannot find package '@soravo/payment-domain' imported from
  supabase/functions/razorpay-webhook/catalog.ts
```

The other two supabase suites pass (30 tests). Root cause is workspace
membership, not a code defect:

- `pnpm-workspace.yaml` lists only `apps/*`, `services/*`, `packages/*`. It does
  not include `supabase/`.
- `supabase/` has no `package.json` and no `node_modules/`.
- `services/license-api/node_modules/@soravo/payment-domain` exists as a symlink
  into `packages/payment-domain`; `apps/website/node_modules/@soravo/` does not,
  and neither does a root-level one.
- Therefore Node resolution from `supabase/functions/` cannot reach the package,
  even though `packages/payment-domain/dist/` is fully built and present.

This failure is **not** attributable to the T03 changes. `git status --porcelain
supabase/` is empty, and `git show HEAD:supabase/functions/razorpay-webhook/
catalog.ts` contains the identical import line. The test was added in `746fbbd5`
(2026-09-27), which is **not** an ancestor of `549eeeec` — the last fully green CI
run (2026-09-21). The green run predates the test, so no CI run has ever exercised
this import.

The other local change to `packages/payment-domain` is unrelated to this failure:
`package.json` gained a `lint` script and ESLint devDependencies, and
`src/types.ts` had an interface narrowed. Neither affects module resolution.

### 3.2 Rust advisory gates fail, and the failure splits into two classes

`cargo audit` and `cargo deny check` both fail locally with five advisories:

| Crate | Version | Advisory | Class |
|---|---|---|---|
| `gtk-layer-shell` | 0.8.2 | RUSTSEC-2024-0422 (unmaintained) | **new** |
| `gtk-layer-shell-sys` | 0.7.2 | RUSTSEC-2024-0423 (unmaintained) | **new** |
| `memmap2` | 0.8.0 | RUSTSEC-2026-0186 (unsound) | **new** |
| `number_prefix` | 0.4.0 | RUSTSEC-2025-0119 (unmaintained) | pre-existing |
| `paste` | 1.0.15 | RUSTSEC-2024-0436 (unmaintained) | pre-existing |

Classification is by `Cargo.lock` membership at `HEAD` versus locally:
`number_prefix` and `paste` are already in `HEAD:Cargo.lock`; `gtk-layer-shell`,
`gtk-layer-shell-sys`, and `memmap2` are not, and enter the graph through the new
desktop dependencies.

The two gates disagree, and this matters for interpreting CI:

- `.github/workflows/ci.yml` uses `cargo audit --deny warnings` with an 8-entry
  ignore list that does **not** cover any of the five. So the `rust` job's audit
  step will fail.
- `.github/workflows/security-audit.yml` uses `cargo deny check` with a 10-entry
  ignore list that **does** cover all five. `deny.toml` in the working tree also
  ignores them. The `security-audit` job therefore passes locally apart from
  `advisory-not-detected` warnings for three now-unreachable IDs
  (RUSTSEC-2025-0100, -0098, RUSTSEC-2026-0186), which are warnings, not errors.

`cargo deny check` reports `advisories FAILED, bans ok, licenses ok, sources ok`.
Only `number_prefix` and `paste` are raised as `error[unmaintained]`; the other
three are suppressed by `deny.toml` but are unignored in `ci.yml`.

### 3.3 Rust formatting is green locally, red on GitHub

`cargo fmt --all -- --check` passes on the working tree. The `rust` job still
fails formatting on `main` because Actions checks out the committed
`apps/desktop/src-tauri/src/audio_toolkit/mod.rs`, which predates the local fmt
and module-wiring changes. The three untracked audio-toolkit modules are already
formatted.

---

## 4. Known Human Blockers on Desktop

Both are unresolvable without a human decision, and the audit scope forbids
working around them.

**B1 — missing tray translation evidence (active, fail-closed).**

```
thread 'main' panicked at apps/desktop/src-tauri/build.rs:42:13:
tray i18n: missing translation file for locale 'en' at
  .../apps/desktop/src/i18n/locales/en/translation.json
```

The `en`, `fr`, `zh`, and `zh-TW` locale directories exist but contain no files.
The build script is intentionally fail-closed, so `cargo check`, `cargo test
--workspace`, and `cargo clippy --workspace` all terminate here before any
compilation of desktop code. The `desktop` CI job cannot pass without the
translation files, and no placeholder may be synthesized for them.

**B2 — latent `unsafe` blocks under a `forbid` workspace lint (statically
confirmed, not yet compiler-reachable).**

`Cargo.toml` sets:

```toml
[workspace.lints.rust]
unsafe_code = "forbid"
unused_must_use = "deny"
```

`apps/desktop/src-tauri/Cargo.toml` opts in with `[lints] workspace = true`.
`apps/desktop/src-tauri/src/memory.rs` contains two `unsafe` blocks — at line 32
(`libc::mallopt` in `init_allocator`) and line 49 (`libc::malloc_trim` in
`trim_freed_memory`) — both gated on
`#[cfg(all(target_os = "linux", target_env = "gnu"))]`. There is **no**
`#[allow(unsafe_code)]` anywhere in `apps/desktop/src-tauri/src/`. Both blocks are
required FFI calls for glibc allocator tuning and cannot simply be deleted.

Because B1 halts the build first, B2 has not been observed as a compiler error
locally; it is confirmed by configuration and source inspection. On a Linux/GNU
CI runner, fixing B1 alone is expected to surface two `unsafe_code` errors.

---

## 5. GitHub CI Results

### 5.1 Latest run on `main` — 3 failing jobs, not 4

Run `36339104443` is the latest CI run on the `main` branch and checks out the
exact `HEAD` SHA `ede495b55efd95cedd882d90a19d12b4777da852`.

| Job | Conclusion | Failure |
|---|---|---|
| `web` | failure | 15 lint errors |
| `rust` | failure | `cargo fmt --all -- --check` |
| `desktop` | failure | 279 compiler errors |
| `e2e` | success | — |

Baseline figures are corroborated by `T02-CI-BASELINE-AUDIT-REPORT.md`.

**The claim of "4 failing jobs on `main``" is not supported.** `e2e` passes on
`main`. The `main` run has 3 failing jobs.

### 5.2 The 4-failure runs are Dependabot PRs, not `main`

Three chronologically newer runs each have all 4 jobs failing. None is a `main`
run:

| Run | PR | SHA | Failing jobs |
|---|---|---|---|
| `36357597823` | #61 | `f10c511a1dd786647d66dbdb97d9c418476ac730` | 4 |
| `36357583831` | #60 | `33eec2b79f95353d80fec83b2452427650e673e4` | 4 |
| `36357567311` | #59 | `77a797c26be13e0e3024890f207ac82e54edce7e` | 4 |

In run `36357597823`:

- `web` and `e2e` fail at `pnpm install --frozen-lockfile` with
  `ERR_PNPM_OUTDATED_LOCKFILE` for `apps/desktop/package.json`. These branches
  changed `apps/desktop/package.json` without regenerating the lockfile, so the
  install never reaches lint or tests.
- `rust` fails at `cargo fmt --all -- --check` on committed
  `apps/desktop/src-tauri/src/audio_toolkit/mod.rs`.
- `desktop` fails at the same frozen-install step.

Last fully green CI run on the default branch: `35541961814` at `549eeeec`
(2026-09-21), all four jobs successful. Twelve commits landed after it, including
the T03-unrelated `docs/spec-v3` archive and the Supabase webhook hardening that
introduced the unresolvable import.

---

## 6. Web Lint Recovery Detail

`HEAD:package.json` already invokes `@soravo/payment-domain lint`, but
`HEAD:packages/payment-domain/package.json` has **no** `lint` script
(`git show HEAD:packages/payment-domain/package.json | grep -c lint` → `0`) and
`packages/payment-domain/eslint.config.js` does not exist at `HEAD`. The local
pair of changes — adding the lint script plus ESLint devDependencies, and adding
the config file — is what makes the root `pnpm lint` invocation coherent. Split
across tracked and untracked files, this fix is easy to lose.

`pnpm-lock.yaml` also carries drift unrelated to lint, from floating `latest`
resolution:

- `@tauri-apps/api` `2.11.1` → `2.12.0`
- `@tauri-apps/cli` `2.11.5` → `2.12.0`
- `lru-cache` `11.5.2` → `11.5.3`

The license-API changes in `services/license-api/src/payment/` are consistent
with `T04-C`'s prior work and are also uncommitted.

---

## 7. Dependency, Workspace, and cpal/rodio Alignment Detail

`apps/desktop/src-tauri/Cargo.toml` recovers the desktop dependency set, adding
`serde_json` as a build dependency alongside numerous runtime and plugin crates.
`Cargo.toml` adds workspace membership and the `[workspace.lints.rust]` block
quoted under B2 in section 4.

cpal/rodio alignment is **uncommitted**:

| Item | `HEAD` | Working tree / lock |
|---|---|---|
| `cpal` (desktop) | `0.15` | `0.16` |
| `rodio` (desktop) | `0.19` | `0.21` |
| `cpal` resolved | — | `0.16.0` |
| `rodio` resolved | — | `0.21.1` |

`crates/audio` already targets the 0.16/0.21 generation, so the desktop crate was
the outlier. `apps/desktop/src-tauri/src/audio_feedback.rs` is unmodified and
already compiles against the new API surface, as noted in section 2.4.

---

## 8. Gap Summary

Locally green, and therefore genuinely improved over `main`:

- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build`
- `pnpm audit --prod`
- per-package JS tests (`website`, `desktop`, `license-api`, `payment-domain`)
- `cargo fmt --all -- --check`
- `cargo test --workspace --exclude soravo-desktop` (99 tests)
- `cargo clippy --workspace --exclude soravo-desktop --all-targets -- -D warnings`

Still failing or unverified, with cause classified:

| Item | Status | Cause |
|---|---|---|
| `pnpm test` (supabase stage) | fail | pre-existing workspace-membership defect, not T03 |
| `cargo check`/`test`/`clippy` for desktop | blocked | B1, human decision required |
| `unsafe_code` in `memory.rs` | latent error | B2, human decision required |
| `cargo audit` (ci.yml ignore list) | fail | 5 unignored advisories; 3 newly introduced |
| `cargo deny check` | fail | 2 pre-existing unmaintained advisories |
| GitHub `rust` job | fail | local fmt fixes are uncommitted |
| GitHub `desktop` job | fail | B1 plus 279 committed-tree errors |

## 9. Conclusion

The T03 recovery is real, substantial, and effective: the web lint gate, Rust
formatting, dependency recovery, workspace lint configuration, and cpal/rodio
alignment are all present and verified locally. None of it is on GitHub.

`HEAD` equals `origin/main`, so there is no local commit to lose — but the entire
recovery is exposed to accidental loss because it is unstaged, and seven of the
nine untracked files are required for the desktop crate to compile.

Two blockers require human decisions: the missing tray translation files (B1) and
the `unsafe` FFI blocks in `memory.rs` that conflict with the newly added
`unsafe_code = "forbid"` workspace lint (B2). Neither can be resolved by
generating placeholders or relaxing the lint, and both block the desktop job.

The premise of "4 failing jobs" refers to Dependabot PR runs. The latest `main`
run, `36339104443`, has 3 failing jobs with `e2e` passing.

Three additional findings not attributable to the T03 work are recorded in this
report: the pre-existing unresolvable Supabase workspace import, the advisory
drift in the `ci.yml` versus `security-audit.yml` ignore lists, and the
unrelated `latest`-resolution churn in `pnpm-lock.yaml`.
