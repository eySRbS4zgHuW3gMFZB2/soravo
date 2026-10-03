# DOCUMENTATION-STATE-AUDIT-FINAL

**Repository:** `/home/maya/Desktop/Soravo_Engineering_Specification_v2`
**Remote:** `https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git`
**Branch:** `main`
**`HEAD` / `origin/main`:** `2f96f3d21213bce24f049996d5ab897f16acd31b` (identical, `0` ahead / `0` behind; confirmed against `git ls-remote origin refs/heads/main`)
**Audit type:** Read-only pre-v4 state audit
**Working directory when written:** `/home/maya/Desktop/Soravo_Engineering_Specification_v2`

---

## 0. Method, authority, and constraints

### 0.1 Authority ladder applied

| Rank | Source | Role in this audit |
|---|---|---|
| 1 | `Soravo_Engineering_Docs_v4/` | Engineering **intent**. What the project *should* be. |
| 2 | `origin/main` @ `2f96f3d2` | Committed **implementation**. What the project *is*. |
| 3 | Current VM working tree | **Observational only.** Heavily dirty; used only for "current compilation failure" facts, never as authority. |
| 4 | `docs/spec-v3/`, `docs/spec-v2-archive/`, `PROGRESS.md`, `SORAVO_HANDY_CODE_REUSE_REPORT.md`, `docs/HANDY_V1_PLAN.md`, `Soravo_Engineering_Docs_v4/DESIGN-wise.md` | Historical / reference. **Non-authoritative.** Used only to date and contextualize claims. |

### 0.2 Constraints honoured

- No source, manifest, CI, migration, or existing documentation file was created, modified, deleted, moved, or renamed.
- No commit, push, tag, release, or deployment was performed.
- No secret value is reproduced in this report. Existence and provenance only.
- Builds and checks were run **read-only** (`cargo check`, `cargo fmt --check`, `tsc --noEmit`, `eslint`, `vitest`, `gh`/`git` reads). The only writes were to `/tmp/opencode/audit/`.
- Where evidence does not exist, the literal string `UNKNOWN — EVIDENCE NOT AVAILABLE` is used. No inference is presented as fact.

### 0.3 Toolchain observed

`cargo 1.97.1` · `rustc 1.97.1` · `node 22.23.1` · `pnpm 11.17.0` · `supabase` CLI present · `deno` **absent from `PATH`** · `gh` authenticated (verified with a bounded `timeout`; an unbounded call hung and was abandoned).

### 0.4 Section taxonomy

Sections A–O below are this audit's own coverage taxonomy, derived from the requested scope. Each carries an evidence class:

- **MEASURED** — reproduced locally by a command in this audit.
- **OBSERVED** — read from a repository or remote artifact.
- **UNKNOWN** — `UNKNOWN — EVIDENCE NOT AVAILABLE`.

---

## 1. Executive summary

`origin/main` **does not build, does not lint, and does not fully test.** This is not a documentation defect — it is a broken committed state that has been publicly red on CI since 2026-09-22, and the 10 commits that created it were pushed **directly to `main`, bypassing pull request review**.

The single most consequential structural finding is that the v4 pack's core provenance promise cannot be satisfied from the current repository: **`15_HANDY_REUSE_POLICY.md` §6 states "The pinned Handy commit remains authoritative for all reused code." The pinned commit `842acdf9` is not an ancestor of `HEAD`.** The ~23,800 lines of Handy-derived Rust on `main` arrived by a different route, through a **closed, unmerged** PR, so there is currently no verifiable chain of custody from an identified upstream revision to the code on `main`.

Twenty-three findings are recorded below: 3 CRITICAL, 8 HIGH, 6 MEDIUM, 4 LOW, 2 INFO.

### 1.1 Severity index

| ID | Sev | Finding | Section |
|---|---|---|---|
| F-01 | CRITICAL | `soravo-desktop` does not compile — 17 errors (lib), 20 (lib test) | G |
| F-02 | CRITICAL | `main` red on CI since `a156c8c9`; 10 direct-to-main commits, no PR | E, L |
| F-03 | CRITICAL | Pinned Handy commit `842acdf9` is **not** an ancestor of `HEAD` | I |
| F-04 | HIGH | 5 of 12 crates are unbuildable, untested dead code | G |
| F-05 | HIGH | 14/14 Supabase migration versions diverge from the applied remote history | F |
| F-06 | HIGH | 2,419-line webhook security suite never executes (0 tests collected) | K |
| F-07 | HIGH | Root `pnpm lint` can never pass — filters a package with no `lint` script | E |
| F-08 | HIGH | `cargo fmt --check` fails, so clippy/test/audit/deny have never run | E, G |
| F-09 | HIGH | Model catalog empty while 7 unverified `blob.handy.computer` URLs ship in code | I |
| F-10 | HIGH | `handy-keys` external binary required at runtime, not vendored | I |
| F-11 | MEDIUM | Residual user-facing `"Handy Portable Mode"` branding | I |
| F-12 | MEDIUM | `deny.toml` license hash does not match `LICENSE` | E |
| F-13 | MEDIUM | Only 2 CI secrets; no Supabase/Razorpay/signing credentials | F |
| F-14 | MEDIUM | 2 of 4 production build variables unset; deploy still succeeded | F |
| F-15 | MEDIUM | Zero releases; `release.yml` is `workflow_dispatch`-only and untested | F |
| F-16 | MEDIUM | `linux` feature unreachable in CI; `overlay.rs` compiles unconditionally | E, G |
| F-17 | MEDIUM | PR #55 was CLOSED, not merged; integration landed anyway | L |
| F-18 | LOW | `16_HANDY_MIGRATION_STATUS.md` is stale and self-contradictory | I, C |
| F-19 | LOW | Three spec generations plus 2 unreconciled reports | C |
| F-20 | LOW | E2E = 3 specs against a dev server; no post-deploy verification | K |
| F-21 | LOW | Root `pnpm build` builds desktop but deploys only the website | E |
| F-22 | INFO | `crates/transcribe-cpp`, `crates/transcribe-rs` are empty | G |
| F-23 | INFO | Payment catalog is genuinely single-source; prices match v4 §03 exactly | H |

---

## A. Repository identity and git state

**Verdict: `origin/main` is authoritative and internally consistent with its remote. The working tree is heavily dirty and must not be treated as implementation truth.**

**MEASURED**

```
HEAD              2f96f3d21213bce24f049996d5ab897f16acd31b
origin/main       2f96f3d21213bce24f049996d5ab897f16acd31b
ahead / behind    0 / 0
ls-remote origin  2f96f3d21213bce24f049996d5ab897f16acd31b   (agrees)
```

Recent history on `main` (`git log --oneline -12`):

```
2f96f3d2 fix: update pnpm-lock.yaml to match payment-domain package.json
af19dc69 fix(website): allow legitimate Razorpay checkout bundle
bfbffc8d feat(payments): add frontend checkout implementation (033)
091f9e92 feat(payments): share payment domain catalog
7902398c feat(payments): add Razorpay subscriptions
d879ed11 feat(payments): add regional Razorpay pricing
c2cab9b4 docs(payments): record RAZORPAY-TEST-PAYMENT-SMOKE-027 milestone results
804d8af2 docs(progress): record MILESTONE-COMMIT-026 commit SHA
746fbbd5 feat(payments): harden Razorpay webhook payload handling
a156c8c9 feat: integrate PR #55 Handy-derived desktop foundation (audit-008)
6c8eb462 docs: create canonical PROGRESS.md with accurate repository state
549eeeec docs: update migration status to reflect fork/derive/rebrand strategy
79c72bf3 Merge pull request #58 from eySRbS4zgHuW3gMFZB2/docs/PLAN-AUTHORITY-003
```

**F-02 (CRITICAL) — PR bypass.** The last merge commit on `main` is `79c72bf3` (PR #58). The **10 commits above it carry no merge commit**, so all of them — including the 23,826-line Handy integration and the entire payment stack — were pushed straight to `main`. `main` is unprotected against direct pushes for at least this window.

**Worktrees (OBSERVED)**

| Path | HEAD |
|---|---|
| main root | `2f96f3d2` |
| `.swarm-worktrees/phase1-task1.1` | `83a506e8` |
| `.swarm-worktrees/phase1-task1.3-hotkeys` | `7eaea96f` |
| `.swarm-worktrees/type-001-native-insertion` | `d5a1f846` |

Agent worktrees exist inside the repository directory. They are operational scaffolding, not deliverables, and are not tracked.

---

## B. Directory and file inventory

**Verdict: The tree is coherent in layout. 12 crate directories exist but only 8 are buildable — see G.**

| Area | Path | Classification | Notes |
|---|---|---|---|
| Web app | `apps/website/` | **Active** | Vite + React SPA |
| Desktop shell | `apps/desktop/`, `apps/desktop/src-tauri/` | **Active — non-building** | Tauri 2.12.0 |
| License service | `services/license-api/` | **Active** | 1,868 LOC incl. tests |
| Shared payment domain | `packages/payment-domain/` | **Active** | 157 LOC, single source of truth |
| Rust crates | `crates/` (12 with manifests) | **Mixed** | 8 members, 5 unbuildable |
| Backend | `supabase/` (14 migrations, 2 Edge Functions) | **Active — drift** | see F |
| CI/CD | `.github/workflows/` (4 files) | **Active — partly dead** | see E |
| Reference spec | `Soravo_Engineering_Docs_v4/` | **Active — untracked** | 23 files, intent authority |
| Historical spec | `docs/spec-v3/` (34), `docs/spec-v2-archive/` (32) | **Historical** | non-authoritative |
| Governance | `decisions/` (14 ADRs), `progress/` (16), `tasks/` (1), `scripts/` (1) | **Control** | partially stale |
| Tests | `tests/e2e/` (3 specs), `tests/integration/`, `tests/performance/` | **Active — thin** | 2 dirs are empty `.gitkeep` |
| Agent config | `.opencode/` (1 tracked file), `.swarm/`, `.swarm-worktrees/` | **Operational** | not deliverables |
| Generated | `node_modules/`, `.pnpm-store/`, `dist/`, `target/`, `test-results/`, `supabase/.temp/` | **Generated/ignored** | |

**Tracked doc counts (OBSERVED):** `docs` 72 · `decisions` 14 · `progress` 16 · `tasks` 1 · `scripts` 1.
**Spec generations (OBSERVED):** `spec-v2` 32 files · `spec-v3` 35 files · `spec-v4` 23 files (untracked).

---

## C. Documentation inventory and authority

### C.1 The v4 pack

**Verdict: Internally consistent and correctly scoped. This is the strongest documentation asset in the repository.**

**MEASURED / OBSERVED**

- 23 files: 21 numbered Markdown (`00_README.md` … `20_ADR_INDEX.md`), `SPEC_MANIFEST.json`, `DESIGN-wise.md`.
- `SPEC_MANIFEST.json` declares `file_count: 23`; actual count is 23. ✔
- Manifest read order (1–23) matches `00_README.md`. ✔
- Manifest research SHA matches current `HEAD`. ✔
- Authority classification is explicit: `00`–`20` + manifest = **authoritative**; `DESIGN-wise.md` = **reference only**. ✔
- An explicit `HUMAN REVIEW REQUIRED` conflict rule is present. ✔

### C.2 The design reference

**Verdict: `DESIGN-wise.md` is a Wise brand analysis, not a Soravo design system. It must never be used as a Soravo visual authority.**

**MEASURED**

- Contains **zero** occurrences of `Soravo`.
- Describes Wise's identity: lime `#9fe870`, sage surfaces, rounded cards, heavy display typography, component and do/don't rules.
- Names **proprietary `Wise Sans`** — a licensed typeface Soravo does not hold.
- Direct case-sensitive count of `Wise`: **28**. The pack's own summary states **26**. → **Discrepancy in the pack metadata; requires correction before v4 is published.**
- Reusable without licence risk: spacing rhythm, contrast hierarchy, card/button accessibility patterns.
- **Not** reusable: colour identity, `Wise Sans`, Wise-specific component styling.

### C.3 Historical documentation

**Verdict: Significant sprawl, partly stale, containing at least one self-contradictory document. v4's consolidation mandate is justified.**

**F-19 (LOW).** Three full spec generations coexist, plus 14 ADRs, 16 progress files, and two **untracked** reconciliation reports (`DOCUMENTATION-HYGIENE-001-REPORT.md`, `DOCUMENTATION-RECONCILIATION-002-REPORT.md`) that are themselves inputs the v4 pack does not reference.

**F-18 (LOW) — `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` (tracked at `HEAD`, deleted in the working tree) is stale and self-contradictory:**

| Claim | Recorded value | Reality at audit time |
|---|---|---|
| "Origin/main SHA" | `216cf23a7959840a3f830e187445968f6fc57dc7` | `2f96f3d2…` — **stale** |
| Document date | `2026-09-21` | Predates the commit it describes (`a156c8c9`, 2026-09-22) |
| Status header | "IMPLEMENTED ON FEATURE BRANCH / NOT YET MERGED" | Code is on `main` |
| §7 Build Status | "BLOCKED on Linux VM" — GTK libs | Actual cause is missing crate dependencies, not system libs |
| §8 Model License | "BLOCKED … unknown" | **Still true** (F-09) |
| §10 PR Status | "NOT CREATED … branch remains on remote origin" | PR #55 exists and is **CLOSED**; `origin/feature/HANDY-MIGRATION-001` does not exist remotely |
| §13 Acceptance | "Rust checks pass ⚠️ BLOCKED" · §15 Verdict | **"HANDY-MIGRATION-001: COMPLETE"** |

The document declares migration **COMPLETE** while its own acceptance table records that Rust and Tauri checks never passed. Any reader treating §15 as a status source would be misled.

**F-18 note.** `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` exists at `HEAD` and is the correct home for the model-licensing record; v4 §12 should explicitly supersede it rather than leaving both live.

---

## D. Design and UX authority

**Verdict: `UNKNOWN — EVIDENCE NOT AVAILABLE` for a Soravo design system. No such document exists in any spec generation.**

What exists instead: `DESIGN-wise.md` (C.2, reference-only, zero Soravo content) and `docs/spec-v3/SORAVO_UI_INTEGRATION_PLAN.md` (untracked, working-tree only, non-authoritative). There is no colour, typography, spacing, component, iconography, or accessibility specification for Soravo anywhere in the tracked repository.

This is a **v4 blocker**: §00–§20 contain no design-system requirement, so the intent pack cannot currently be implemented as a design.

---

## E. CI, build, and quality gates

**Verdict: `main` is red. Three of four jobs fail. Because the failures occur early, the deeper gates have never executed on this code.**

### E.1 Latest CI run on `main`

**MEASURED** — `gh run view 36286378783`, SHA `2f96f3d2…`

| Job | Result | Failed step | Root cause |
|---|---|---|---|
| `web` | ❌ FAIL | step 6 `pnpm lint` | 15 ESLint errors in 4 website files at `HEAD` |
| `e2e` | ✅ PASS | — | — |
| `rust` | ❌ FAIL | step 6 `cargo fmt --all -- --check` | Formatting diffs |
| `desktop` | ❌ FAIL | step 8 `pnpm tauri build` | Unresolved crates — see G |

**MEASURED — `web` lint failures at `HEAD`** (all `@typescript-eslint/no-unused-vars` / `no-explicit-any`):

| File | Errors |
|---|---|
| `apps/website/src/lib/payment-service.ts` | 2 — unused `Currency`, `ProductId` |
| `apps/website/src/pages/account.tsx` | 2 — unused `refreshEntitlements`, `handleRefresh` |
| `apps/website/src/pages/pricing.test.tsx` | 7 — unused `Mock`, `useNavigate`; 5× `any` |
| `apps/website/src/pages/pricing.tsx` | 5 — unused `FormEvent`; 4× `any` |

> **Divergence note.** Locally, website lint **passes** — the uncommitted working-tree edits fixed these. This is precisely the authority separation of §0.1: `HEAD` is red, the dirty worktree is greener, and only `HEAD` counts as implementation.

**MEASURED — `rust` fmt failure.** `cargo fmt --all -- --check` exits 1 with 23 diff sites across 10 files:

```
apps/desktop/src-tauri/build.rs (2)
apps/desktop/src-tauri/src/audio_toolkit/mod.rs (8)
apps/desktop/src-tauri/src/audio_toolkit/post_process.rs (7)
apps/desktop/src-tauri/src/helpers/clamshell.rs (1)
apps/desktop/src-tauri/src/helpers/mod.rs (1)
apps/desktop/src-tauri/src/managers/model/download.rs (2)
apps/desktop/src-tauri/src/managers/model.rs (4)
apps/desktop/src-tauri/src/memory.rs (1)
crates/audio/src/audio/mod.rs (1)
```

**F-08 (HIGH) — dead gates.** The `rust` job runs, in order: `fmt --check` → `clippy -D warnings` → `cargo test --workspace` → `cargo audit` → `cargo deny check`. Step 1 fails, so **clippy with `-D warnings`, the entire Rust test suite, the vulnerability audit, and the licence check have never run against this code on CI.**

**MEASURED — `desktop` failure.** `pnpm tauri build` at `HEAD` reports unresolved imports for `anyhow`, `once_cell`, `futures_util`, `sha2`, `hf_hub`, `specta`, `ferrous_opencc`, `tauri_plugin_store`, `tauri_plugin_clipboard_manager`, `tauri_plugin_global_shortcut`, `tauri_plugin_global_shortcut`, `soravo_audio`, plus unresolved `crate::helpers`, `crate::tray_i18n`, `crate::audio_toolkit::{audio,vad,…}`, unresolved `gtk`, `gtk_layer_shell`, and `rodio::OutputStreamBuilder`.

**F-16 (MEDIUM) — unreachable `linux` feature.** `apps/desktop/src-tauri/Cargo.toml` declares:

```toml
[features]
default = []
linux = ["gtk", "gtk-layer-shell"]
```

`src/overlay.rs` (892 lines) is compiled **unconditionally** and imports `gtk` and `gtk_layer_shell`, which are **optional** and **not in `default`**. The `desktop` CI job runs `pnpm tauri build` with no `--features linux`, and the `rust` job runs no `--features` either. **The `linux` feature can therefore never be exercised by any CI job** — it is unverifiable by construction, and its non-default wiring is itself a compile error on every platform.

### E.2 Local reproduction of the web gate

**MEASURED** — `pnpm lint` in the dirty worktree: website ✔, desktop ✔, **license-api ✗** (9 errors across 3 files — 5 unused imports in `payment/catalog.ts`, 1 unused import in `payment/service.ts`, 3× `any` in `service.test.ts`).

**F-07 (HIGH) — root `pnpm lint` can never pass.** `package.json` chains:

```
pnpm --filter @soravo/website lint && … && pnpm --filter @soravo/payment-domain lint
```

but `packages/payment-domain/package.json` defines only `build` and `typecheck`. Verified directly:

```
$ pnpm --filter @soravo/payment-domain lint
[ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT] None of the selected packages has a "lint" script
exit=1
```

Even with all ESLint errors fixed, the final chain element fails. The same filter appears in `pnpm test`; there the missing `test` script did **not** fail the chain (observed exit 0). That asymmetry is itself a defect: the root script composition is not trustworthy as a gate.

**F-21 (LOW).** `pnpm build` = `build website && build desktop`, but `pages-deployment.yaml` deploys only `apps/website/dist`. The desktop frontend build is performed on every production deploy and discarded.

**F-12 (MEDIUM) — licence-hash mismatch.** `deny.toml` declares

```toml
license-files = [ { path = "LICENSE", hash = 0x00147eb5 } ]
```

`MEASURED`: `sha256sum LICENSE` = `86cfd66d2957519d2a96a59a6eb5df6edc4c4db42886dde65342d2102ffdb3d4`. The first four bytes are `86cfd66d`, not `00147eb5`. This is a **probable** `cargo deny check` failure; it is not confirmed because `deny.toml`'s hash algorithm could not be reproduced (`cargo-deny` is not installed) and because F-08 prevents the step from running. Note the root `LICENSE` is MIT, `Copyright (c) 2025 CJ Pais` — the Handy author's copyright, correctly retained per `15_HANDY_REUSE_POLICY.md` §7.1.

**`pnpm typecheck` (MEASURED): PASSES** — all four packages (`tsc -b`, `tsc -b`, `tsc --noEmit`, `tsc --noEmit`) complete with no diagnostics.

### E.3 Other workflows

**OBSERVED**

| Workflow | Trigger | State |
|---|---|---|
| `ci.yml` | `pull_request`, `push` to `main` | **Red on `main`** (E.1) |
| `pages-deployment.yaml` | `push` to `main`, `workflow_dispatch` | **Green** — run `36286378781`, deploy step **executed** |
| `release.yml` | `workflow_dispatch` only | **Never run** (F-15) |
| `security-audit.yml` | `pull_request` filtered to `**/Cargo.toml`; `schedule` weekly | Historical runs; Cargo path filter means **TS-only PRs skip it entirely** |

`ci.yml` `rust` job additionally passes **seven** `--ignore` flags to `cargo audit` (`GHSA-q83h-524g-xf6h`, `RUSTSEC-2024-0370`, `RUSTSEC-2025-0081/0075/0080/0100/0098`, `RUSTSEC-2024-0429`). v4 should record *why* each is suppressed and by whom.

---

## F. Deployment and external state

### F.1 Cloudflare Pages (website)

**MEASURED**

- `gh secret list` → exactly **two** secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`. Both created `2026-09-16`. The least-privilege token described in ADR-014 decision 10 **exists**.
- Deploy step is gated on `env.CLOUDFLARE_API_TOKEN != ''`; in run `36286378781` it **ran** (not skipped) → the website **is deployed**.
- Command: `wrangler pages deploy apps/website/dist --project-name=soravo --branch=main`.

**F-14 (MEDIUM) — incomplete production configuration.** `gh variable list` returns only **two** of the four variables the workflow injects:

| Variable | State |
|---|---|
| `VITE_SUPABASE_URL` | ✅ set (points at the linked project) |
| `VITE_SUPABASE_ANON_KEY` | ✅ set (publishable anon key; value intentionally not reproduced) |
| `VITE_UMAMI_HOST_URL` | ❌ **not set** |
| `VITE_UMAMI_WEBSITE_ID` | ❌ **not set** |

The deploy still succeeded, meaning **production analytics is silently unconfigured**. ADR-014 decision 11 calls these "client-safe build values", but nothing in CI fails when they are absent.

No preview or staging environment exists. There is **no post-deploy verification** step and no smoke test against the deployed URL (`UNKNOWN — EVIDENCE NOT AVAILABLE` for the live site's current content and health).

### F.2 Supabase

**MEASURED** — `supabase/.temp/linked-project.json` → ref `zbzhlhoxblguepplqppw`, org `ycbdtwbmcpblyhxbpmhf`.

**F-05 (HIGH) — 14/14 migration version divergence.** Every local migration filename version differs from the corresponding applied remote version. **Zero overlap.**

| Local file (tracked) | Applied remote version | Name |
|---|---|---|
| `20260915000000` | `20260915050920` | establish_supabase_baseline |
| `20260915120000` | `20260915062310` | establish_profiles_and_rls |
| `20260915123000` | `20260915062707` | profiles_set_search_path |
| `20260915140000` | `20260915094537` | harden_rls_authorization |
| `20260915150000` | `20260915102139` | `20260915150000_establish_entitlements` ← malformed name |
| `20260915160000` | `20260915111100` | establish_devices_and_sessions |
| `20260915170000` | `20260915114327` | establish_admin_role_authorization |
| `20260915171000` | `20260915114529` | admin_role_insert_guard |
| `20260915180000` | `20260915130217` | establish_product_metrics |
| `20260916120000` | `20260916052432` | establish_admin_user_directory |
| `20260920100000` | `20260926173530` | entitlements_provider_neutral |
| `20260926000000` | `20260926173539` | establish_webhook_events |
| `20260926140000` | `20260926173605` | razorpay_webhook_hardening_022 |
| `20260927100000` | `20260926193817` | entitlements_provider_refs |

Consequences:

1. `supabase/config.toml` asserts that "`supabase/migrations/` stays the authoritative, reviewable source of truth (ADR-010)". **Empirically it is not** — the applied history was created out-of-band, and one remote entry carries a malformed name embedding its own timestamp.
2. A `supabase db push` or `db pull` would treat **all 15** local files as unapplied, or overwrite the remote history. This is a live hazard, not a documentation nicety.
3. `20260927100000_entitlements_provider_refs.sql` is dated **2026-09-27**, one day *after* the remote applied `20260926193817` for the same change — i.e. the local file was written after the fact and does not correspond to the applied artifact.

Edge Functions (both present in `supabase/functions/`):

- `payment-checkout/index.ts` (378 lines) — JWT-gated, `verify_jwt` left at default (correct per the config comment).
- `razorpay-webhook/` (1,512 lines across 4 files) — `verify_jwt = false` with an extensive, well-reasoned justification comment recording a behavioural probe (unsigned POST → 400 "missing signature", not 401) and a named regression guard (`webhook-hardening.test.mjs` section N).

`supabase/config.toml` is a **positive example** of the documentation discipline v4 §12 mandates: load-bearing configuration with rationale, evidence, and a named regression guard. It is the one artifact in the repository that already meets the v4 bar.

**F-13 (MEDIUM) — no backend deploy credentials in CI.** With only the two Cloudflare secrets present, `supabase functions deploy` and `supabase db push` **cannot be automated**. `UNKNOWN — EVIDENCE NOT AVAILABLE` for when, or by what mechanism, the 14 remote migrations were actually applied.

### F.3 Releases

**F-15 (MEDIUM). MEASURED:** `gh release list` returns **zero releases**. `release.yml` triggers only on `workflow_dispatch` and builds a macOS/Windows matrix. It has never been exercised. `UNKNOWN — EVIDENCE NOT AVAILABLE` for any distributed artifact.

### F.4 Payment provider

**MEASURED** — `services/license-api/.env.example` is tracked; Razorpay keys are **server-side only** by design. No Razorpay secret exists in GitHub Actions (F.13). `docs/payments/…SMOKE-027` is referenced by commit `c2cab9b4` as a recorded milestone.

**`UNKNOWN — EVIDENCE NOT AVAILABLE`** for: whether a real Razorpay TEST-mode order completed against the deployed Edge Function; whether a signed webhook was ever accepted end-to-end in a live environment; and the current Razorpay dashboard state. The `supabase/.temp/smoke-027` artefacts are local historical scratch, not authority, and were not treated as evidence.

---

## G. Compilation and build state

### G.1 `origin/main` — does not compile

**MEASURED** — CI job `desktop`, run `36286378783`, step "Build Tauri desktop", at SHA `2f96f3d2`:

> **F-01 (CRITICAL).** `soravo-desktop` fails to build with unresolved imports for every dependency added by the Handy integration — `anyhow`, `once_cell`, `futures_util`, `sha2`, `hf_hub`, `specta`, `ferrous_opencc`, `tauri_plugin_store`, `tauri_plugin_clipboard_manager`, `tauri_plugin_global_shortcut`, `soravo_audio` — plus `gtk`, `gtk_layer_shell`, `rodio::OutputStreamBuilder`, and unresolved internal modules `crate::helpers`, `crate::tray_i18n`, `crate::audio_toolkit::{audio,vad,…}`.

**Root cause (OBSERVED from `git show a156c8c9`).** Commit `a156c8c9` *"integrate PR #55 Handy-derived desktop foundation (audit-008)"* added **23,826 insertions across 50 files** but changed `apps/desktop/src-tauri/Cargo.toml` by only **16 lines**. Its own commit message states the condition plainly:

```
- Build: Requires transcribe-rs, hf_hub, ferrous_opencc dependencies
- Next: Add missing dependencies and run full build/tests
```

**The break was knowingly introduced on 2026-09-22 and has never been fixed.** `main` has been continuously red since.

### G.2 Current VM working tree — also does not compile, differently

**MEASURED** — `cargo check --workspace --all-targets --message-format=short`, exit **101**:

```
error: could not compile `soravo-desktop` (lib)      due to 17 previous errors; 6 warnings
error: could not compile `soravo-desktop` (lib test) due to 20 previous errors; 6 warnings
```

The uncommitted `Cargo.toml` fixes the *missing-dependency* class but exposes **eight further, previously masked defect classes**:

| # | Error | Location | Class |
|---|---|---|---|
| 1 | `unresolved imports rodio::OutputStream, rodio::Sink` | `audio_feedback.rs:5` | rodio 0.19 → 0.22 API move |
| 2 | `cannot find module or crate gtk` ×2 | `overlay.rs:83,102` | F-16 optional feature |
| 3 | `unresolved import gtk_layer_shell` | `overlay.rs:24` | F-16 optional feature |
| 4 | `no method init_layer_shell / set_layer / set_keyboard_mode / set_exclusive_zone / is_layer_window` on `gtk::ApplicationWindow` | `overlay.rs:133–141` | gtk-layer-shell trait not in scope |
| 5 | `unresolved import tempfile` ×3 | `model/download/tests.rs:8`, `model.rs:2721`, `tray.rs:719` | **still an undeclared dependency** |
| 6 | `no method with_revision on HFRepository`; `String: From<&&str>` unsatisfied ×2 | `model.rs:2025` | hf-hub 1.0 API mismatch |
| 7 | `cannot find function resolve_cache_dir` ×2 | `model.rs:374,1791` | missing function |
| 8 | `no associated function from_path on Image` | `tray.rs:439` | Tauri 2.12 API change |

**Interpretation.** The desktop crate is not one build break away from green. The uncommitted work is a partial repair that has traded missing-dependency errors for API-version and missing-symbol errors. **No credible estimate of remaining effort can be given from the current tree**, and none is offered.

All other workspace members check clean: `soravo-models`, `soravo-stt`, `soravo-typing`, `soravo-config`, `soravo-audio`, `soravo-hotkeys`, `soravo-transcript`.

### G.3 Unbuildable crates

**F-04 (HIGH). MEASURED.** 12 crate directories have a `Cargo.toml`; the root workspace declares 8 members. The remaining 5 are **neither members nor excluded**, so cargo refuses to build them at all:

```
$ cargo check --manifest-path crates/diagnostics/Cargo.toml
error: current package believes it's in a workspace when it's not:
current:   …/crates/diagnostics/Cargo.toml
workspace: …/Cargo.toml
this may be fixable by adding `crates/diagnostics` to the `workspace.members` array …
Alternatively, to keep it out of the workspace, add the package to `workspace.exclude` …
```

Identical failure for all five:

| Crate | Manifest tracked | Workspace status | Buildable |
|---|---|---|---|
| `crates/diagnostics` | TRACKED | NON-MEMBER | ❌ |
| `crates/history` | TRACKED | NON-MEMBER | ❌ |
| `crates/licensing` | TRACKED | NON-MEMBER | ❌ |
| `crates/scheduler` | TRACKED | NON-MEMBER | ❌ |
| `crates/vad` | TRACKED | NON-MEMBER | ❌ |

These are **committed, tracked, unbuildable, and untested** — cargo emits a hard error, so no root command, CI job, or local invocation can compile them. They are invisible to every quality gate. `crates/history` and `crates/licensing` in particular suggest intended capabilities (persistence, entitlement enforcement) that have **no verified implementation**. Whether they contain real logic or scaffolding: `UNKNOWN — EVIDENCE NOT AVAILABLE` (contents not audited).

**F-22 (INFO).** `crates/transcribe-cpp/` and `crates/transcribe-rs/` contain **no `Cargo.toml`** and are untracked. The uncommitted `src-tauri/Cargo.toml` references them as path dependencies. This is the direct cause of the CI `transcribe-rs` unresolved error.

### G.4 Workspace warning

**MEASURED:** cargo emits `warning: profiles for the non root package will be ignored` for `apps/desktop/src-tauri/Cargo.toml` — a `[profile]` section is declared in a member instead of the workspace root and is silently discarded.

---

## H. Payments

**Verdict: This is the strongest subsystem in the repository. The catalog is genuinely single-source, prices match v4 §03 exactly, and the webhook hardening is well documented. It is also blocked by a test-execution defect (F-06) and by schema drift (F-05).**

**F-23 (INFO / positive) — MEASURED single-source verification.**

| Location | Lines | Role |
|---|---|---|
| `packages/payment-domain/src/catalog.ts` | 60 | **The only file containing amounts** |
| `services/license-api/src/payment/catalog.ts` | 132 | Re-export shim + validation only; **no amounts** |
| `supabase/functions/razorpay-webhook/catalog.ts` | 28 | Re-export shim + legacy mapping; **no amounts** |

`v4 §06` "No third price catalog may exist" is **satisfied**. The shims' own comments assert single-source-of-truth, and inspection confirms it.

**MEASURED price conformance to v4 §03** — all 10 values match exactly:

| Product | USD | INR | CAD | EUR | AUD |
|---|---|---|---|---|---|
| `soravo_monthly` | 1200 | 9900 | 1600 | 1100 | 1800 |
| `soravo_lifetime` | 5000 | 41500 | 6700 | 4600 | 7500 |

All carry `status: "evaluated_target"` — correctly *not* `"confirmed"`, consistent with v4's prohibition on treating unconfirmed values as final.

**MEASURED — security model is correct.** `supabase/functions/payment-checkout/index.ts` header documents and implements: server-side JWT validation, `sub` extraction from the token (never from the request body), server-authoritative product/currency validation against the catalog, credentials server-side only, and a hardcoded `access-control-allow-origin: https://soravo.com`. Unsupported product/currency are rejected. This matches v4 §06.

**Observed concerns (not defects):**

1. `catalog.ts` carries a `PLAN_BY_LEGACY_PRODUCT` map resolving the legacy `product = 'soravo'` marker for pre-catalog orders, and **deliberately refuses to guess** when the `plan` note is absent (comment cites findings F7/F8). Sound, but it is a permanent compatibility surface with no removal criterion recorded.
2. `services/license-api/src/payment/dev-provider.ts` (33 lines) exists alongside `razorpay-provider.ts` (164 lines) and `provider-factory.ts` (39 lines). `UNKNOWN — EVIDENCE NOT AVAILABLE` for the dev provider's activation guard — i.e. whether a non-Razorpay provider can be selected in a production configuration.
3. `c2cab9b4` records a "RAZORPAY-TEST-PAYMENT-SMOKE-027" milestone. Its contents were not treated as proof of a live transaction (see F.4).

---

## I. Handy provenance, licensing, and reuse

**Verdict: CRITICAL. The v4 pack's central reuse guarantee — a pinned upstream commit — is not satisfied on `main`. Chain of custody from an identified Handy revision to the code on `main` cannot be established from this repository.**

### I.1 The pin is not on `main`

**F-03 (CRITICAL). MEASURED.**

`docs/spec-v3/15_HANDY_REUSE_POLICY.md` §6 states:

> "The pinned Handy commit remains authoritative for all reused code."

`16_HANDY_MIGRATION_STATUS.md` §1 records the pin as `842acdf96c77df3ec0c5a27dfe0a740196c915c9`.

**MEASURED:**

```
$ git cat-file -t 842acdf9…   →  commit      (object exists locally)
$ git merge-base --is-ancestor 842acdf9… HEAD  →  NO
```

`842acdf9` *"Migrate to Handy desktop foundation (HANDY-MIGRATION-001)"* exists in the object store with the same 50-file shape as `a156c8c9` — but it is **not on `main`'s history**. The Handy-derived code on `main` arrived via a different commit that is not the documented pin.

**Consequence:** any statement of the form "Soravo reuses Handy as of revision X" is currently **unsupported by `main`**. v4 §07's provenance requirement cannot be satisfied until the actual upstream Handy repository, URL, and commit SHA are recorded and the delta between it and `main` is documented.

The other two SHAs in that document (`216cf23a…`, `d58e46b2…`) also exist as local objects, but `216cf23a…` is a **merge commit for PR #51**, not the Handy upstream — the document mislabels it as "Origin/main SHA" at a time when it described the migration branch's base.

### I.2 PR #55 was closed, not merged

**F-17 (MEDIUM). MEASURED** — `gh pr list --state all`:

```
55  docs: adopt Handy-derived desktop architecture v3   docs/SPEC-V3-HANDY-FOUNDATION   CLOSED   2026-09-20
```

PR #55 is a **docs** PR and it is **CLOSED, never merged**. Yet commit `a156c8c9` is titled *"integrate PR #55 Handy-derived desktop foundation"* and delivers 23,826 lines of Rust to `main`. The commit message cites a PR that did not merge, and the payload bears no relation to that PR's stated scope.

**Branches (MEASURED):** local `feature/HANDY-MIGRATION-001` and `docs/SPEC-V3-HANDY-FOUNDATION` exist; only `origin/docs/SPEC-V3-HANDY-FOUNDATION` is remote-tracking. So §10's claim that "branch remains `feature/HANDY-MIGRATION-001` on remote origin" is **not** supported.

**`UNKNOWN — EVIDENCE NOT AVAILABLE`:** the identity of the Handy upstream repository, its owner, the PR #55 ↔ commit `a156c8c9` relationship, and whether any reviewer examined the 23,826-line change. No PR in the list covers `a156c8c9`.

### I.3 Code-level reuse footprint

**MEASURED:** 190 `handy`-string occurrences under `apps/desktop/src-tauri/`. Tracked Handy-related files:

```
SORAVO_HANDY_CODE_REUSE_REPORT.md
apps/desktop/src-tauri/src/shortcut/handy_keys.rs
decisions/ADR-026-handy-foundation.md
docs/COMPLIANCE/HANDY-MIGRATION-002_AUDIT_REPORT.md
docs/HANDY_V1_PLAN.md
docs/spec-v3/decisions/ADR-027-handy-derived-desktop-foundation.md
docs/spec-v3/15_HANDY_REUSE_POLICY.md
docs/spec-v3/16_HANDY_MIGRATION_STATUS.md
progress/STT-003-HANDY-REUSE-AUDIT.md
progress/TYPE-002-003-HANDY-REUSE-AUDIT.md
```

**F-11 (MEDIUM) — residual user-facing branding. MEASURED:** `src/portable.rs` still contains the literal string `"Handy Portable Mode"` at lines 30, 107, 122, and 171, and `handy_test_*` sentinel markers at 118, 129, 139, 157, 167. These are user-visible window/dialog text. `16_HANDY_MIGRATION_STATUS.md` §9 flagged exactly this as "⚠️ Needs update" — it was never done.

**F-10 (HIGH) — unvendored external binary. MEASURED.** `src/shortcut/handy_keys.rs` drives an external process named `handy-keys` (20+ log and error strings, e.g. `"handy-keys is not the active keyboard implementation"`, `"Failed to initialize handy-keys shortcuts"`, `handy-keys-event`). `git ls-files | grep -i handy` returns **no binary, no vendored source, no installer, no submodule** — only the client module and Markdown. `handy-keys` is **not in this repository**.

Consequences: the desktop's hotkey subsystem has a runtime dependency on a binary that cannot be obtained, built, or licensed from this repo. Packaging, CI, and `release.yml` (which builds macOS/Windows artifacts) have no way to satisfy it. `UNKNOWN — EVIDENCE NOT AVAILABLE` for how `handy-keys` is expected to reach an end user.

### I.4 Model licensing — hard v4 blocker

**F-09 (HIGH). MEASURED.**

`apps/desktop/src-tauri/src/catalog/catalog.json` is **`{}`** — the model catalog is **empty**. Meanwhile `src/managers/model.rs` contains **seven hardcoded upstream download URLs**:

```
line 615  https://blob.handy.computer/ggml-small.bin
line 648  https://blob.handy.computer/whisper-medium-q4_1.bin
line 680  https://blob.handy.computer/ggml-large-v3-turbo.bin
line 712  https://blob.handy.computer/ggml-large-v3-q5_0.bin
line 745  https://blob.handy.computer/breeze-asr-q5_k.bin
line 778  https://blob.handy.computer/parakeet-v2-int8.tar.gz
line 820  https://blob.handy.computer/parakeet-v3-int8.tar.gz
```

So the *declared* catalog is empty while the *effective* model surface is defined in code, pointing at a third-party host. `16_HANDY_MIGRATION_STATUS.md` §8 records every one of these artifacts as:

> Source: `blob.handy.computer` · License: **BLOCKED (unknown)** · Commercial use: **BLOCKED (unknown)** · Redistribution: **BLOCKED (unknown)**

**Nothing in the repository establishes that redistribution of these weights is permitted.** v4 §03 and §12 both require verified model provenance and licensing before any model is offered. This is unresolved and is a **release blocker**: shipping a build that downloads weights from an unlicensed third-party host would violate v4 §12 as written.

### I.5 Code licence

**MEASURED / OBSERVED — this part is in good order.** `15_HANDY_REUSE_POLICY.md` §7.1 requires MIT text preservation for substantial reused portions. The root `LICENSE` is MIT, `Copyright (c) 2025 CJ Pais` — the Handy author — and is retained, satisfying the policy. `deny.toml` includes a `[licenses.clarify]` entry for it. Caveat: **no per-crate `LICENSE` or `NOTICE` file exists** for the 12 crates, and `deny.toml`'s hash for the root licence appears stale (F-12).

---

## J. AI agent and tooling configuration

**Verdict: Functionally configured, entirely **outside** the repository, and therefore unreviewable and unreproducible by anyone cloning it.**

**MEASURED / OBSERVED**

| Layer | Finding |
|---|---|
| Project tracked | Exactly one file: `.opencode/opencode-swarm.json` |
| Project `AGENTS.md` | **absent** |
| Project `opencode.json` | **absent** |
| Project `.mcp.json` | **absent** |
| Project `.opencode/skills/` | **absent** (0 project skills) |
| Global | `~/.config/opencode/opencode.json` — plugins incl. `opencode-swarm`, omniroute |
| Global | `~/.config/opencode/opencode.jsonc` — global skills dir + GitHub / Supabase / Cloudflare MCP entries |
| Global skills | `~/.agents/skills/` present; **not** repository authority |

**Supabase MCP** is project-scoped to `zbzhlhoxblguepplqppw` — consistent with `.temp/linked-project.json`, and it is the mechanism by which the out-of-band migrations (F-05) were most plausibly applied.

**Gap.** v4 §10 references a specific family of skills and §11 a preferred MCP set. The repository contains **no committed declaration** of either, and `gh secret list` shows CI has no MCP or API credentials beyond the two Cloudflare secrets. Nothing in the repository can confirm that the agent tooling v4 assumes is installed, authenticated, or version-pinned. `UNKNOWN — EVIDENCE NOT AVAILABLE` for MCP connectivity, auth validity, and tool versions from within the repo.

`.opencode/opencode-swarm.json` is tracked but agent-orchestration state also lives in `.swarm/` (plans, scopes, summaries, SQLite projection, knowledge receipts) — **all untracked and all agent-generated**. This is a second, undocumented "source of truth" adjacent to the documentation, and v4's authority ladder does not mention it. It should be explicitly classified as operational, or excluded, in the v4 landing plan.

---

## K. Tests

**Verdict: Broad on paper, materially incomplete in execution. The largest security test file in the repository never runs.**

### K.1 Root `pnpm test` — FAILS

**MEASURED** — exit **1**.

| Suite | Result |
|---|---|
| `@soravo/website` | ✅ 16 test files passed |
| `@soravo/desktop` | ✅ 1 test file passed |
| `@soravo/license-api` | ✅ 6 files, **71 tests** passed |
| `@soravo/payment-domain` | no `test` script (chain continued, exit 0) — see F-07 asymmetry |
| `supabase/tests` (`vitest run --config supabase/tests/vitest.config.mjs`) | ❌ **1 failed, 2 passed** |

**F-06 (HIGH) — MEASURED:**

```
FAIL  supabase/tests/webhook-hardening.test.mjs  [ 0 test ]
Error: Cannot find package '@soravo/payment-domain'
       imported from supabase/functions/razorpay-webhook/catalog.ts
 ❯ supabase/functions/razorpay-webhook/catalog.ts:5:1
Test Files  1 failed | 2 passed (3)
Tests       30 passed (30)
```

`webhook-hardening.test.mjs` is **2,419 lines** — the largest test file in the repository, and the one `supabase/config.toml` names as the regression guard for the `verify_jwt = false` webhook decision. It collects **0 tests** because a Deno Edge Function imports a pnpm workspace package that the Vitest resolver cannot resolve. The 30 passing tests come from `payment-checkout.test.mjs` (18) and `migration-guard.test.mjs` (12).

**The entire webhook security suite — signature verification, replay handling, ledger idempotency, hardening regressions — is currently unexecuted, and the root test command fails because of it.**

### K.2 Rust tests

**MEASURED:** 41 tracked `.rs` files contain `#[test]` or `#[tokio::test]`. `cargo test --workspace` **cannot run** — `cargo check` fails first (G), and F-08 shows it is step 3 of a job whose step 1 fails. Rust test results: `UNKNOWN — EVIDENCE NOT AVAILABLE`. The 5 unbuildable crates (F-04) contain no executable tests at all.

### K.3 E2E

**MEASURED — the only green CI job.** Run `36286378783` job `e2e`: **SUCCESS**. `pnpm e2e` → `playwright test`; artifact upload on failure with 14-day retention.

`playwright.config.ts`: `baseURL http://127.0.0.1:4175`, `webServer` boots the **Vite dev server** with `VITE_E2E_TEST_MODE=true`, single `chromium` project at 1280×720.

**F-20 (LOW).** Coverage is **3 specs** — `admin.spec.ts`, `auth.spec.ts`, `navigation.spec.ts` (+ `helpers.ts`). `tests/integration/` and `tests/performance/` contain only `.gitkeep`. There is **no test against the deployed Cloudflare Pages site**, and no test against the Supabase Edge Functions in a live environment. E2E green therefore says nothing about production behaviour.

### K.4 SQL

**OBSERVED:** `supabase/tests/rls_assertions.sql` (1,790 lines) and `db_assertions.sql` (1,322 lines) exist. No CI job, npm script, or Supabase config entry references them. Execution status: `UNKNOWN — EVIDENCE NOT AVAILABLE`.

### K.5 Test inventory summary

| Layer | Files | Executing? |
|---|---|---|
| Website unit | 16 | ✅ |
| Desktop unit | 1 | ✅ |
| license-api unit | 71 tests / 6 files | ✅ |
| payment-domain | 0 (no script) | ⚠️ no tests exist |
| Supabase Edge Fn (checkout) | 18 | ✅ |
| Supabase migration guard | 12 | ✅ |
| **Supabase webhook hardening** | **2,419 lines** | ❌ **0 tests collected** |
| Rust | 41 files | ❌ blocked by G |
| Playwright E2E | 3 specs | ✅ (dev server only) |
| RLS / DB assertions | 3,112 lines SQL | ❌ not wired |
| Integration / performance | `.gitkeep` | ❌ empty |

---

## L. Governance and process

**Verdict: The process intent is unusually good; the process execution has broken down in the most recent window.**

**F-02 (CRITICAL) — direct-to-`main`.** 10 commits reached `main` with no merge commit since PR #58. The repository's own tooling would have caught the break: `ci.yml` runs on every push to `main` and has been red throughout. Nothing gated the merge.

**F-17 (MEDIUM) — misleading commit/PR references.** `a156c8c9` cites PR #55, which is CLOSED and docs-only (I.2). A commit message asserting integration provenance that does not hold is worse than no message, because a future auditor will trust it — as this audit nearly did.

**Positive evidence — process intent is sound:**

- `supabase/config.toml` records load-bearing decisions with rationale, empirical evidence, and a named regression guard. This is the v4 §12 standard, already met in one place.
- ADR-014 decisions 10 and 11 document credential minimality and client-safe build values; ADR-010 records the migration-source-of-truth decision (now contradicted — F-05).
- `ci.yml` installs system deps explicitly, pins Node 22, uses `--frozen-lockfile`, and keeps a distinct `desktop` build job. The workflow design is correct; only the code it gates is broken.
- The v4 pack itself has an explicit authority ladder and a `HUMAN REVIEW REQUIRED` conflict rule (C.1).

**The failure is not a missing process. It is a process that was defined, documented, and then not enforced for the last 10 commits.** v4 §01's authority model is sound; what is missing is a *mechanism* that makes a red `main` impossible to extend.

---

## M. Deterministic state table

Every row is independently verifiable. "Claim tested" is the specific assertion examined.

| # | Area | Claim tested | Verdict | Evidence class | Evidence |
|---|---|---|---|---|---|
| M-01 | Git | `HEAD` == `origin/main` == remote | **TRUE** | MEASURED | both `2f96f3d2…`; `ls-remote` agrees; 0/0 |
| M-02 | Git | Working tree is dirty | **TRUE** | MEASURED | 58 porcelain lines: 26 `D`, 19 `M`, 13 `??`; 0 staged |
| M-03 | Git | `main` is red | **TRUE** | MEASURED | run `36286378783` conclusion `failure` |
| M-04 | Git | Last 10 commits bypassed PR review | **TRUE** | MEASURED | no merge commit above `79c72bf3` |
| M-05 | Build | `soravo-desktop` compiles at `HEAD` | **FALSE** | MEASURED | CI job `desktop` step 8; unresolved imports |
| M-06 | Build | `soravo-desktop` compiles in the VM tree | **FALSE** | MEASURED | `cargo check` exit 101, 17 + 20 errors |
| M-07 | Build | Workspace compiles (non-desktop members) | **TRUE** | MEASURED | 7 crates checked clean |
| M-08 | Build | All 12 crates are buildable | **FALSE** | MEASURED | 5 non-members; cargo hard error |
| M-09 | Build | `cargo fmt --check` passes | **FALSE** | MEASURED | 23 diffs / 10 files |
| M-10 | Build | `pnpm typecheck` passes | **TRUE** | MEASURED | 4 packages, no diagnostics |
| M-11 | Lint | Root `pnpm lint` can pass | **FALSE** | MEASURED | payment-domain has no `lint` script → exit 1 |
| M-12 | Lint | Lint passes at `HEAD` | **FALSE** | MEASURED | 15 ESLint errors / 4 files |
| M-13 | Test | Root `pnpm test` passes | **FALSE** | MEASURED | exit 1; webhook-hardening unresolvable |
| M-14 | Test | webhook-hardening suite executes | **FALSE** | MEASURED | 2,419 lines, **0 tests collected** |
| M-15 | Test | license-api tests pass | **TRUE** | MEASURED | 71/71 |
| M-16 | Test | E2E passes | **TRUE** | MEASURED | CI job `e2e` SUCCESS |
| M-17 | Test | E2E exercises production | **FALSE** | MEASURED | `baseURL` = local Vite dev server |
| M-18 | Test | Rust tests run in CI | **FALSE** | MEASURED | `fmt` at step 1 blocks step 3 |
| M-19 | Test | SQL assertions are wired | **FALSE** | MEASURED | no script/job references them |
| M-20 | Deploy | Website is deployed | **TRUE** | MEASURED | run `36286378781`, deploy step executed |
| M-21 | Deploy | Production analytics configured | **FALSE** | MEASURED | 2 of 4 `vars` unset |
| M-22 | Deploy | Any release exists | **FALSE** | MEASURED | `gh release list` empty |
| M-23 | Deploy | Backend deployable from CI | **FALSE** | MEASURED | only 2 Cloudflare secrets |
| M-24 | Backend | Local migrations match applied history | **FALSE** | MEASURED | 14/14 versions diverge |
| M-25 | Backend | `payment-checkout` JWT-gated | **TRUE** | OBSERVED | `config.toml` default + JWT model in code |
| M-26 | Backend | `razorpay-webhook` JWT-free with guard | **TRUE** | OBSERVED | `verify_jwt = false` + comment + behavioural probe |
| M-27 | Payments | Exactly one price catalog | **TRUE** | MEASURED | amounts only in `payment-domain/src/catalog.ts` |
| M-28 | Payments | Prices match v4 §03 | **TRUE** | MEASURED | all 10 values identical |
| M-29 | Payments | Prices are marked confirmed | **FALSE** | MEASURED | all `status: "evaluated_target"` (correct per v4) |
| M-30 | Handy | Pinned commit is on `main` | **FALSE** | MEASURED | `merge-base --is-ancestor` → NO |
| M-31 | Handy | PR #55 merged the integration | **FALSE** | MEASURED | PR #55 `CLOSED`, docs-only |
| M-32 | Handy | `handy-keys` is vendored | **FALSE** | MEASURED | absent from `git ls-files` |
| M-33 | Handy | Handy branding removed | **FALSE** | MEASURED | `"Handy Portable Mode"` ×4 in `portable.rs` |
| M-34 | Handy | MIT licence text retained | **TRUE** | OBSERVED | root `LICENSE`, © 2025 CJ Pais |
| M-35 | Models | Catalog is populated | **FALSE** | MEASURED | `catalog.json` == `{}` |
| M-36 | Models | Model licences verified | **FALSE** | OBSERVED | §8 "BLOCKED (unknown)" ×3 fields |
| M-37 | Models | No third-party model URLs in code | **FALSE** | MEASURED | 7 `blob.handy.computer` URLs |
| M-38 | Docs | v4 pack internally consistent | **TRUE** | MEASURED | 23/23, order + authority verified |
| M-39 | Docs | `DESIGN-wise.md` is a Soravo design system | **FALSE** | MEASURED | 0 `Soravo`; 28 `Wise`; proprietary `Wise Sans` |
| M-40 | Docs | Only one spec generation is live | **FALSE** | MEASURED | v2 (32) + v3 (35) + v4 (23) |
| M-41 | Docs | Historical status docs are accurate | **FALSE** | MEASURED | stale SHA; COMPLETE vs BLOCKED contradiction |
| M-42 | AI tooling | Agent config is repo-committed | **FALSE** | MEASURED | 1 tracked file; MCP/skills global only |
| M-43 | Secrets | No secret values appear in this report | **TRUE** | MEASURED | existence-only throughout |
| M-44 | Audit | Audit changed no repository file | **TRUE** | MEASURED | see §N.2 |

---

## N. Risks to a v4 landing

### N.1 Ordered by severity

1. **`main` is red and unprotected** (F-02). Any v4 work applied on top of a red, bypass-guarded `main` compounds the problem. **A branch-protection rule and a green-baseline requirement should precede v4 implementation.**
2. **Provenance is unverifiable** (F-03, F-17). v4 §07 requires exact upstream revision and patch provenance. Neither can be supplied today. This is a hard blocker on the v4 reuse claim itself, and it is a *documentation* blocker — it cannot be fixed by writing better docs.
3. **The desktop is structurally unbuildable, not one fix from green** (G.2). Eight distinct defect classes; the honest position is that remaining effort is unbounded from current evidence.
4. **Model licensing is unresolved** (F-09). Blocks any distribution that offers STT. §03/§12 cannot be satisfied without upstream licence terms.
5. **Five crates are dead code** (F-04). Either the workspace is wrong or the crates are scaffolding. Both readings are disqualifying for a v4 architecture that assumes those capabilities exist.
6. **Schema drift** (F-05). The next `db push` could corrupt or re-apply the entire production schema.
7. **The webhook security suite does not run** (F-06). The single most important payment guarantee is untested, and the root test command is red because of it.
8. **No release path is proven** (F-15, F-10). Even a green `main` would not yield a shippable desktop: `handy-keys` is missing and `release.yml` has never run.

### N.2 What this audit did and did not touch

**Did:** read-only repository, git, and GitHub inspection; `cargo check` (writes confined to `/tmp/opencode/audit/`); `cargo fmt --check`; `pnpm lint` / `typecheck` / `test`; `supabase_list_migrations`; creation of this single file.

**Did not:** modify, delete, move, or rename any pre-existing file; stage, commit, push, tag, release, or deploy; fetch or push refs; write to any path inside the repository other than this report.

The working tree contained 58 pre-existing porcelain entries before this audit and 58 after, the sole difference being this untracked report.

---

## O. Gaps in the v4 documentation pack

Assessed against the §0.1 authority ladder. "Missing" means absent from all 23 v4 files.

| # | Gap | Severity | Why it matters |
|---|---|---|---|
| O-01 | **No Soravo design system** | **BLOCKER** | §00–§20 contain no colour, type, spacing, component, or accessibility requirement. `DESIGN-wise.md` cannot substitute (M-39). D is `UNKNOWN`. |
| O-02 | **No Handy upstream identity** | **BLOCKER** | §07 requires exact fork + commit. The repository cannot supply it (M-30). Must record upstream URL, owner, SHA, and the per-file delta to `main`. |
| O-03 | **No model licence determination** | **BLOCKER** | §03/§12 require verified provenance. 7 URLs ship in code; licences recorded "BLOCKED" (M-36, M-37). Needs a written determination per model, not a placeholder. |
| O-04 | **No ownership/licence statement for the 5 dead crates** | HIGH | `diagnostics`, `history`, `licensing`, `scheduler`, `vad` are unbuildable (M-08). v4 cannot assume capabilities that have never compiled. |
| O-05 | **No DB schema or migration-reconciliation requirement** | HIGH | F-05 is a live hazard with no governing requirement. v4 must mandate version reconciliation and a `db push` safety rule. |
| O-06 | **No CI baseline contract** | HIGH | v4 assumes a working build. It must state the green-baseline requirement and a branch-protection rule, or the same bypass repeats (F-02). |
| O-07 | **No test-execution requirement, only test existence** | HIGH | F-06 proves a 2,419-line suite can exist and never run. v4 must require *executed* coverage with a zero-uncollected-suite rule. |
| O-08 | **No `handy-keys` dependency decision** | HIGH | A required runtime binary is absent from the repo (M-32). Either vendor it, abstract it behind a trait, or drop it — v4 is silent. |
| O-09 | **No release/version policy** | MEDIUM | Zero releases (M-22); `release.yml` untested; no signing, updater, or version scheme in any generation. |
| O-10 | **No exact module/crate ownership map** | MEDIUM | Cannot be written until O-04 is resolved. |
| O-11 | **No API contract for `license-api` / Edge Functions** | MEDIUM | Contracts exist only as in-file header comments, not as a specification. |
| O-12 | **No supported-OS matrix** | MEDIUM | GTK/gtk-layer-shell are non-default (F-16) and `handy-keys` availability is unstated. macOS/Windows readiness is claimed in a commit message only. |
| O-13 | **No explicit `deno` provisioning requirement** | MEDIUM | Edge Functions require Deno; it is absent from `PATH` here. §08 tooling lists no runtime prerequisite. |
| O-14 | **No environment-variable contract** | MEDIUM | Four `VITE_*` vars, two unset (F-14); nothing fails when absent. |
| O-15 | **No ADR migration map** | MEDIUM | 14 ADRs exist; v4 has no table stating which are superseded, retained, or archived. §20 is an index, not a disposition. |
| O-16 | **No acceptance-criteria matrix** | MEDIUM | No testable pass/fail per requirement. Every "done" claim to date has been self-certified (F-18, F-17). |
| O-17 | **No deprecation/removal policy for legacy surfaces** | LOW | The `product = 'soravo'` legacy mapping has no removal criterion (H). |
| O-18 | **No CI-suppression register** | LOW | Seven `cargo audit --ignore` flags and three `security-audit.yml` suppressions are undocumented rationale. |
| O-19 | **Agent tooling not declared in-repo** | LOW | §10/§11 assume skills and MCP; nothing is committed (M-42). |
| O-20 | **No statement on `.swarm/` and worktrees** | LOW | A second untracked "source of truth" exists inside the repo tree and is unclassified by the authority ladder. |
| O-21 | **Pack metadata inconsistency** | LOW | `DESIGN-wise.md` reference count states 26; actual 28 (C.2). Correct before publication. |
| O-22 | **No consolidated historical-doc disposition** | LOW | 2 untracked reconciliation reports exist; v4 does not reference or supersede them (F-19). |

### O.1 Minimum set to unblock v4 implementation

**O-01, O-02, O-03, O-06.** Without a Soravo design system, a verifiable Handy provenance record, a model licence determination, and an enforced green baseline, the v4 pack cannot be implemented as written, and the next implementation cycle will reproduce the same provenance and verification failures documented above.

---

## Appendix A — Commands run (reproducible)

```
git rev-parse HEAD; git rev-parse origin/main
git rev-list --left-right --count origin/main...HEAD
git ls-remote origin refs/heads/main
git log --oneline -12 ; git log --oneline --merges -5 ; git log --oneline --since=2026-09-20
git worktree list
git status --porcelain | sort -k2
git show --stat a156c8c9 ; git show a156c8c9 -- apps/desktop/src-tauri/Cargo.toml
git cat-file -t 842acdf9… ; git merge-base --is-ancestor 842acdf9… HEAD
git ls-files | grep -i handy
sha256sum LICENSE

cargo check --workspace --all-targets --message-format=short   # exit 101, log in /tmp
cargo fmt --all -- --check                                    # exit 1
cargo check --manifest-path crates/{diagnostics,history,licensing,scheduler,vad}/Cargo.toml

pnpm lint ; pnpm typecheck ; pnpm test
pnpm --filter @soravo/payment-domain lint   # ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT, exit 1
pnpm --filter @soravo/payment-domain test   # exit 0 (asymmetry, F-07)

gh run view 36286378783 --log-failed        # + per-job
gh run view 36286378781
gh secret list ; gh variable list ; gh release list ; gh pr list --state all

supabase_list_migrations                    # 14 applied
git ls-files supabase/migrations            # 15 files (14 + .gitkeep)
```

## Appendix B — Evidence files

| Path | Contents |
|---|---|
| `/tmp/opencode/audit/cargo-check-workspace.log` | Full `cargo check` output, exit 101, 73 lines |
| `/tmp/opencode/audit/pnpm-test.log` | Full `pnpm test` output, exit 1 |
| `/tmp/opencode/audit/target-nonmember/` | Non-member crate build attempts |

## Appendix C — Finding index

F-01 §G.1 · F-02 §A,§E.1,§L · F-03 §I.1 · F-04 §G.3 · F-05 §F.2 · F-06 §K.1 · F-07 §E.2 · F-08 §E.1 · F-09 §I.4 · F-10 §I.3 · F-11 §I.3 · F-12 §E.2 · F-13 §F.2 · F-14 §F.1 · F-15 §F.3 · F-16 §E.1 · F-17 §I.2,§L · F-18 §C.3 · F-19 §C.3 · F-20 §K.3 · F-21 §E.2 · F-22 §G.3 · F-23 §H
