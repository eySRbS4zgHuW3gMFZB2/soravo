# CURRENT-STATE-AUDIT-T01-REPORT

**TASK ID:** SORAVO-T01-CURRENT-STATE-AUDIT (v6 T01 — State audit)
**Audit timestamp (UTC):** 2026-09-27 (session date; local VM date Sun Sep 27 2026; `git fetch origin --prune` executed this session)
**Auditor:** OpenCode (audit-only; no repairs performed)
**Authority:** `docs/Soravo_Engineering_Docs_v6/` (tracked in HEAD) + `Soravo_Engineering_Docs_v6/SPEC_MANIFEST.json` v6.0.0; GitHub = implementation truth; PROGRESS.md = evidence only.

---

## 1. GIT IDENTITY

| Item | Value |
|---|---|
| Repository | `eySRbS4zgHuW3gMFZB2/soravo` (origin `https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git`, fetch+push) |
| Current branch | `main` |
| Local HEAD | `ede495b55efd95cedd882d90a19d12b4777da852` (`docs: persist Soravo engineering control pack v6`) |
| origin/main HEAD | `ede495b55efd95cedd882d90a19d12b4777da852` (identical) |
| Ahead/behind | 0 ahead, 0 behind (`git rev-list --left-right --count HEAD...origin/main` = `0 0`) |
| Working-tree status | DIRTY (unstaged deletions + untracked files; see §2) |
| Staged files | NONE (0 staged; `git diff --cached` empty) |
| Unstaged files | 34 deleted files, all under `docs/spec-v3/` (full list in §2) |
| Untracked files | 136 entries (`git status --porcelain=v1 -uall` total = 170 lines = 34 D + 136 ??) |
| `git diff --check` | clean (no whitespace errors) |
| Stashes (preserved, untouched) | 10 entries (`stash@{0..9}`; e.g. `feature/release-foundation`, `stt-003-streaming-transcription`, `clean-type-002-003`, `typing/clipboard-injection-002-003` ×2, main ×2, `feature/stt-002-benchmark-harness`, `feature/model-002-downloader`, `phase1/task1.2-deps-audit`) |
| Linked worktrees (preserved, untouched) | 3: `.swarm-worktrees/phase1-task1.1` (`83a506e8 [phase1/task1.1-port-handy]`), `.swarm-worktrees/phase1-task1.3-hotkeys` (`7eaea96f`), `.swarm-worktrees/type-001-native-insertion` (`d5a1f846`) |
| gh auth | Logged in as `eySRbS4zgHuW3gMFZB2` (https, keyring) — GitHub reads performed with authenticated `gh` CLI |

Recent local log (`git log -n 20 --oneline --decorate`, head):

```text
ede495b5 (HEAD -> main, origin/main) docs: persist Soravo engineering control pack v6
2f96f3d2 fix: update pnpm-lock.yaml to match payment-domain package.json
af19dc69 fix(website): allow legitimate Razorpay checkout bundle
bfbffc8d (feature/razorpay-payments-021-026) feat(payments): add frontend checkout implementation (033)
091f9e92 (origin/feature/razorpay-payments-021-026) feat(payments): share payment domain catalog
7902398c feat(payments): add Razorpay subscriptions
d879ed11 feat(payments): add regional Razorpay pricing
c2cab9b4 docs(payments): record RAZORPAY-TEST-PAYMENT-SMOKE-027 milestone results
804d8af2 docs(progress): record MILESTONE-COMMIT-026 commit SHA
746fbbd5 feat(payments): harden Razorpay webhook payload handling
a156c8c9 (feature/handy-integration-audit-008) feat: integrate PR #55 Handy-derived desktop foundation (audit-008)
```

Note: prior local report `STATE-AUDIT-V6-002.md` (untracked, evidence only) recorded origin/main `2f96f3d2` with local 2-ahead; the 2 commits have since been pushed — origin/main is now `ede495b5`. That prior report is HISTORICAL/STALE for origin position; its CI conclusions were independently re-verified this session.

---

## 2. DIRTY WORKTREE CLASSIFICATION

Nothing was deleted, altered, stashed, or moved. All items preserved as found.

### 2a. Unstaged deletions (34) — classification: previous task

All 34 are deletions of tracked `docs/spec-v3/*` files (0 staged):

```text
D docs/spec-v3/00_README.md, 01_PRD.md, 02_ARCHITECTURE.md, 03_AI_INSTRUCTIONS.md,
  04_IMPLEMENTATION_PLAN.md, 06_DOD_QA.md, 07_AI_SKILLS.md, 08_MCP_AND_AGENT_TOOLING.md,
  09_SECURITY_BASELINE.md, 10_ADR_INDEX.md, 11_INTERRUPTION_HANDOFF.md, 12_BENCHMARK_PROTOCOL.md,
  13_RELEASE_RUNBOOK.md, 14_ENVIRONMENT_AND_SECRETS.md, 15_HANDY_REUSE_POLICY.md,
  16_HANDY_MIGRATION_STATUS.md, 17_MODEL_LICENSE_AND_PROVENANCE.md, 18_DESKTOP_ARCHITECTURE.md,
  19_DOCUMENT_GOVERNANCE.md, RAZORPAY-AUTHENTICATION-CHECK-020.md,
  RAZORPAY-GRANT-PAYLOAD-FIDELITY-026.md, RAZORPAY-LIVE-CONFIG-RECONCILIATION-025.md,
  RAZORPAY-LIVE-CONFIG-VERIFICATION-024.md, RAZORPAY-MCP-AUDIT-018.md,
  RAZORPAY-PAYMENT-ARCHITECTURE-021.md, RAZORPAY-REGIONAL-PRICING-028.md,
  RAZORPAY-SECRET-BOUNDARY-019B.md, RAZORPAY-SECRET-VALUE-019C.md, RAZORPAY-SUBSCRIPTIONS-029.md,
  RAZORPAY-TEST-PAYMENT-SMOKE-027.md, RAZORPAY-TEST-TOOLING-019.md, RAZORPAY-WEBHOOK-HARDENING-022.md,
  SPEC_MANIFEST.json, decisions/ADR-027-handy-derived-desktop-foundation.md
```

Matching untracked copies exist under `docs/archive/spec-v3/` (including a nested `docs/archive/spec-v3/spec-v3/` duplication). Consistent with an uncommitted documentation-archive relocation by a previous task. Classification: **previous task**. NOT repaired, NOT restored, NOT staged.

### 2b. Untracked files (136) — classification breakdown

| Group | Count (approx) | Classification |
|---|---|---|
| `docs/archive/**` (archived spec-v3 copies, v2-root-engineering-pack copies, nested `spec-v3/spec-v3/` duplicates) | ~95 | previous task (archive outputs; nested duplication noted but untouched) |
| Root `*-REPORT.md` / `*-PLAN.md` (`CI-BASELINE-AUDIT-002.md`, `DOCUMENTATION-ARCHIVE-003/004/005-REPORT.md`, `DOCUMENTATION-HYGIENE-001/002-REPORT.md`, `DOCUMENTATION-RECONCILIATION-002-REPORT.md`, `DOCUMENTATION-STATE-AUDIT-FINAL.md`, `DOCUMENTATION-STATE-AUDIT-V6-001.md`, `MCP-ENVIRONMENT-AUDIT-001.md`, `RAZORPAY-MCP-SETUP-001-PLAN.md`, `RAZORPAY-MCP-SETUP-002/003-REPORT.md`, `STATE-AUDIT-V6-002.md`) | 14 | previous task (audit/report artifacts, uncommitted) |
| `Soravo_Engineering_Docs_v6/` (24 files: full v6 pack duplicate at repo root) | 24 | **unknown** — the authoritative v6 pack is tracked at `docs/Soravo_Engineering_Docs_v6/` (committed in `ede495b5`, verified via `git ls-tree`/`git show --stat`); the root-level copy's provenance is unverified. Preserved. |
| `apps/desktop/.env.example` | 1 | unknown (example file only; no values) |
| `apps/desktop/src-tauri/src/audio_toolkit/post_process.rs` | 1 | unknown (uncommitted source fragment; may affect local-only compile — see §6) |
| `apps/desktop/src-tauri/src/commands/account.rs` | 1 | unknown (uncommitted source fragment) |
| `apps/desktop/src-tauri/src/helpers/` (`mod.rs`, `clamshell.rs`) | 2 | unknown (uncommitted source fragment) |
| `apps/website/src/lib/payment-service.test.ts` | 1 | unknown (uncommitted test fragment) |
| `deno.lock` | 1 | unknown |

`node_modules/`, `target/`, `.pnpm-store/` are ignored build artifacts (absent from porcelain status) and are NOT counted as dirty; classified **generated** for the record. No `task-owned` items: this audit created no source files and owns none of the dirty items.

---

## 3. GITHUB STATE

### 3a. Current main

- `origin/main` = `ede495b5` = local HEAD (in sync, verified post-fetch).
- Research HEAD `2f96f3d2` cited in the v6 pack is HISTORICAL/STALE (2 commits behind current main).

### 3b. Recent commits since last known audit

Last-known audit position was origin `2f96f3d2`; current origin `ede495b5` adds exactly:

1. `af19dc69` — `fix(website): allow legitimate Razorpay checkout bundle`
2. `ede495b5` — `docs: persist Soravo engineering control pack v6`

### 3c. Open PRs (8, all dependabot)

| # | Title | Branch | State |
|---|---|---|---|
| 47 | `chore(deps): bump rubato 0.16.2 → 5.0.0` | `dependabot/cargo/rubato-5.0.0` | OPEN |
| 46 | `chore(deps): bump cocoa 0.25.0 → 0.27.0` | `dependabot/cargo/cocoa-0.27.0` | OPEN |
| 45 | `chore(deps): bump typescript 6.0.3 → 7.0.2 in /apps/desktop` | `dependabot/npm_and_yarn/...` | OPEN |
| 44 | `chore(deps-dev): bump @types/node 26.5.1 → 26.6.1 in /apps/desktop` | `dependabot/...` | OPEN |
| 43 | `chore(deps): bump thiserror 1.0.69 → 2.0.20` | `dependabot/...` | OPEN |
| 42 | `chore(deps): bump lucide-react 1.45.0 → 1.47.0 in /apps/desktop` | `dependabot/...` | OPEN |
| 41 | `chore(deps): bump sha2 0.10.9 → 0.11.0` | `dependabot/...` | OPEN |
| 40 | `chore(deps): bump cpal 0.15.3 → 0.16.0` | `dependabot/...` | OPEN |

Relevance: PR #40 (cpal) and #43 (thiserror) touch the exact incoherent-dependency area blocking the desktop build (§6/T07). No human-authored feature PRs are open.

### 3d. Recently closed/merged PRs

- #58 `docs/PLAN-AUTHORITY-003` — MERGED 2026-09-20
- #57 `docs/PLAN-AUTHORITY-001` — MERGED 2026-09-20
- #56 `docs/SPEC-V3-DOCS-CLEAN` — MERGED 2026-09-20
- #54/#53 `fix/ci-foundation-003` (cargo-audit fixes) — MERGED 2026-09-20
- #52 branch-cleanup audit — MERGED 2026-09-20
- #51 SETTINGS-FOUNDATION — MERGED 2026-09-20
- #50 DESKTOP-006 account/entitlement UI — MERGED 2026-09-20
- #49 Tauri NSIS config/security baseline — MERGED 2026-09-20
- #48 CLOUD-012 entitlements provider-neutral — MERGED 2026-09-20

### 3e. CI runs for main (exact)

| Workflow | Run ID | Commit | Result |
|---|---|---|---|
| CI | `36339104443` | `ede495b5` | **failure** (rust/web/desktop fail; e2e pass) |
| Deploy website to Cloudflare Pages | `36339104444` | `ede495b5` | **success** |
| CI | `36286378783` | `2f96f3d2` | **failure** (rust/web/desktop fail; e2e pass) |
| Deploy website to Cloudflare Pages | `36286378781` | `2f96f3d2` | success |
| CI | `36285840478` | `af19dc69` | **failure** (all 4 jobs fail incl. e2e) |
| Deploy website to Cloudflare Pages | `36285840473` | `af19dc69` | failure |
| Security Audit (schedule) | `36281790018` | main | success |
| Security Audit (PR triggers, dependabot PRs) | `36285945926`, `36285949919`, `36285950490`, `36285950982` | PR heads | failure (dependabot heads, not main) |

Exact failed jobs/steps on HEAD run `36339104443`:

- **rust → failure** at step `Run cargo fmt --all -- --check` (exit 1). Exact error: import-ordering diff in `apps/desktop/src-tauri/src/audio_toolkit/mod.rs:3` (`pub use soravo_audio::{AudioRecorder, VadPolicy};` ordering). All later rust steps (clippy, test, audit, deny) **skipped** — status UNKNOWN (never executed on this commit).
- **web → failure** at step `Run pnpm lint` (exit 1). Exact errors (15 problems, 0 warnings, `--max-warnings=0`): `payment-service.ts:1:15/1:25` unused `Currency`/`ProductId`; `account.tsx:10:3` unused `refreshEntitlements`, `292:18` unused `handleRefresh`; `pricing.test.tsx` unused `Mock`/`useNavigate` + 4× `no-explicit-any`; `pricing.tsx` unused `FormEvent` + 4× `no-explicit-any`. Later web steps (typecheck/test/build/audit) **skipped** — UNKNOWN.
- **desktop → failure** at step `Build Tauri desktop` (`pnpm tauri build`). First compiler error in output order: `error[E0432]: unresolved imports crate::audio_toolkit::{is_microphone_access_denied, is_no_input_device_error}` at `apps/desktop/src-tauri/src/actions.rs:4:28`. Followed by `rodio::OutputStreamBuilder` (E0432), unlinked `soravo_audio` (E0433 ×3), unlinked `gtk`/`gtk_layer_shell` (E0433/E0432), missing `crate::tray_i18n`, `audio_toolkit::audio`, `audio_toolkit::vad::{...}`, `crate::helpers`, post-processing fns, `ferrous_opencc`, `tauri_plugin_global_shortcut`, `once_cell`, and further unresolved imports (full enumeration §6).
- **e2e → success** on HEAD (`pnpm e2e` passed; chromium).

### 3f. Branch protection

`gh api repos/.../branches/main/protection` → HTTP 404 `{"message":"Branch not protected"}`. **Branch protection: NONE (UNKNOWN historically; VERIFIED absent now).**

### 3g. Deployment workflows/status

- Workflows present: `CI`, `Deploy website to Cloudflare Pages`, `Release`, `Security Audit`, `Dependabot Updates` (all active).
- Deployment (Cloudflare Pages) for HEAD commit `ede495b5`: **success** (run `36339104444`). Per v6 §14: deployment success is NOT CI success — CI for the same commit is failing. No `Release` workflow runs for HEAD were observed; release artifact evidence: UNKNOWN.

---

## 4. CI BASELINE

Per-gate status on current HEAD (`ede495b5`), fresh evidence only:

| Gate | Status | Evidence |
|---|---|---|
| website lint | FAIL (reproducible) | CI run `36339104443` job `web`, 15 errors (see §3e); failed identically on `af19dc69`, `2f96f3d2` |
| website typecheck | UNKNOWN (never executed on HEAD — skipped after lint) | no evidence |
| website tests | UNKNOWN (skipped on HEAD) | no evidence |
| website build | UNKNOWN (skipped on HEAD) | no evidence |
| Playwright/E2E | PASS (HEAD) | CI run `36339104443` job `e2e` success; note `af19dc69` e2e failed — HISTORICAL/STALE for that commit |
| cargo fmt | FAIL (reproducible locally + CI) | CI `36339104443` job `rust`; local `cargo fmt --all -- --check` reproduces the identical `audio_toolkit/mod.rs` diff |
| cargo clippy | UNKNOWN (skipped on HEAD) | no evidence |
| cargo test | UNKNOWN (skipped on HEAD) | no evidence |
| cargo audit | UNKNOWN (skipped on HEAD; scheduled Security Audit success `36281790018` is a different workflow, not this gate) | no evidence |
| cargo deny | UNKNOWN (skipped on HEAD) | no evidence |
| desktop build | FAIL (reproducible locally + CI) | CI `36339104443` job `desktop`; local `cargo check -p soravo-desktop` reproduces same first error; 281 total local errors (local tree includes untracked fragment files, so count is advisory) |
| security workflows | MIXED | Scheduled `Security Audit` on main: success (`36281790018`); PR-triggered runs on dependabot heads: failure (not main) |

Failure records (category per v6 §14: A code; B missing env/secret; C external service; D workflow config; E historical/stale; F unrelated):

1. workflow CI / run `36339104443` / commit `ede495b5` / job `rust` / step `cargo fmt --all -- --check` / error: import-ordering diff `audio_toolkit/mod.rs:3` / reproducible: YES (local + CI) / category: **A**.
2. workflow CI / run `36339104443` / commit `ede495b5` / job `web` / step `pnpm lint` / error: 15× unused-import/`any` lint errors (`payment-service.ts`, `account.tsx`, `pricing.test.tsx`, `pricing.tsx`) / reproducible: YES (3 consecutive main commits fail lint) / category: **A**.
3. workflow CI / run `36339104443` / commit `ede495b5` / job `desktop` / step `Build Tauri desktop` / error: first `E0432 actions.rs:4` unresolved `audio_toolkit::{is_microphone_access_denied, is_no_input_device_error}`, cascading unlinked-crate/API errors / reproducible: YES (local `cargo check` same first error) / category: **A**.
4. Historical: run `36285840478` / commit `af19dc69` — all 4 jobs incl. e2e + Pages deploy failed → category **E** (superseded; HEAD e2e passes).

Last fully-green CI on main observed: run `35541961814` (2026-09-20, older commit) — HISTORICAL/STALE, not current evidence.

---

## 5. WORKSPACE/CRATE STRUCTURE

Root `Cargo.toml`: workspace, **no `exclude` key**. Declared members (7 + desktop):

```text
apps/desktop/src-tauri (soravo-desktop), crates/audio (soravo-audio), crates/config,
crates/hotkeys, crates/models, crates/stt, crates/transcript, crates/typing
```

Filesystem reality under `crates/`: `audio, config, diagnostics, history, hotkeys, licensing, models, scheduler, stt, transcribe-cpp, transcribe-rs, transcript, typing, vad` (all with `Cargo.toml` **except** `transcribe-cpp` and `transcribe-rs`, which contain only `src/` — no manifest).

| Crate/dir | State |
|---|---|
| `apps/desktop/src-tauri` | workspace member (IMPLEMENTED membership) |
| `crates/{audio,config,hotkeys,models,stt,transcript,typing}` | workspace members |
| `crates/{diagnostics,history,licensing,scheduler,vad}` | **present but invisible to workspace** (have `Cargo.toml`, not in members, no `exclude` entry) |
| `crates/{transcribe-cpp,transcribe-rs}` | **present but invisible AND manifest-less** (`src/` only, no `Cargo.toml`) |
| Explicitly excluded | **none** (no `exclude` key exists) |
| `soravo_audio` (referenced via `pub use soravo_audio::...` in `apps/desktop/src-tauri/src/audio_toolkit/mod.rs`) | **referenced but missing as a dependency**: `crates/audio` is package `soravo-audio`, yet `apps/desktop/src-tauri/Cargo.toml` declares NO `soravo-audio` dependency (only `soravo-config/hotkeys/typing` paths). Direct cause of E0433 ×3. |
| `hf_hub` (imported by model code) | **referenced but missing**: zero declarations in any `Cargo.toml`; absent from `Cargo.lock` |
| `gtk` / `gtk_layer_shell` | declared OPTIONAL (`gtk4 0.11`, `gtk-layer-shell 0.8`, `linux` feature); lock has `gtk4 0.11.5`, NO `gtk4-layer-shell` entry; default (non-`linux`) build cannot resolve them → E0433/E0432 in `overlay.rs` |
| `rodio` | declared `0.19`, locked `0.19.0`; code uses `rodio::OutputStreamBuilder` (newer API) → E0432 in `audio_feedback.rs` |
| `cpal` | declared `0.15` (desktop); lock contains **two** versions `0.15.3` + `0.16.0` → incoherent version strategy |
| Declared but unused | UNKNOWN (dependency/import cross-check not completed beyond the above; no dependency added or removed by this audit) |

Single Tauri app crate: `apps/desktop/src-tauri` (only `apps/*/src-tauri` present). No dependencies were added — T08 acceptance (every crate member-or-excluded; deps match imports; reproducible lockfile) is NOT met.

---

## 6. DESKTOP BUILD (diagnostic only — nothing fixed)

Non-mutating commands executed: `cargo fmt --all -- --check` (read-only check flag) and `cargo check -p soravo-desktop` (no `--fix`, no manifest edits, no lockfile writes). `Cargo.toml`/`Cargo.lock` untouched.

- Local `cargo fmt --check`: reproduces CI failure byte-for-byte (`audio_toolkit/mod.rs` import ordering).
- Local `cargo check -p soravo-desktop`: **281 `^error` lines** (advisory count — local tree contains the untracked `helpers/` + `post_process.rs` + `account.rs` fragments absent from CI's HEAD checkout, so local error set is a superset).
- **FIRST compiler error in dependency/source (output) order, identical locally and in CI (`36339104443`):**

```text
error[E0432]: unresolved imports `crate::audio_toolkit::is_microphone_access_denied`, `crate::audio_toolkit::is_no_input_device_error`
 --> apps/desktop/src-tauri/src/actions.rs:4:28
```

Root-cause layer beneath it (not a fix, classification only): `audio_toolkit/mod.rs` re-exports from the unlinked `soravo_audio` crate, so the module's own surface (including the `is_*` helpers' provenance) cannot resolve; downstream consumers (`actions.rs`, `commands/audio.rs`, `managers/audio.rs`, `managers/transcription.rs`) fail in turn, alongside independent missing deps (`hf_hub`, `once_cell`, `anyhow`, `ferrous_opencc`, tauri plugins) and API drift (`rodio::OutputStreamBuilder`, `gtk*`, VAD symbol set). Dependency/source-order root: **unlinked `soravo-audio` dependency + missing `hf-hub`/plugin deps + rodio/CPAL/GTK API drift** — T04/T06/T07/T08 territory, left entirely untouched.

---

## 7. HANDY FOUNDATION

- Reuse report `SORAVO_HANDY_CODE_REUSE_REPORT.md` (tracked, dated 2026-09-17): names upstream `https://github.com/cjpais/Handy`, MIT code license, revision explicitly **"To be pinned during audit phase (pre-implementation)"** — i.e. no pinned SHA even at report time. Evidence only (HISTORICAL/STALE for current main).
- Import commit `a156c8c916b00f1da27010a88e08bcaef5b1d91f` (verified via `git show`): integrated 40+ Handy-derived files (50 files, +23826/−763), self-declared as needing "additional dependencies and a later full build/test pass".
- PR #55 (`docs: adopt Handy-derived desktop architecture v3`): CLOSED, not merged (per v6 pack; not re-verified via API this session — HISTORICAL/STALE as second-hand claim, retained as stated in control plane).
- `842acdf9` (`Migrate to Handy desktop foundation (HANDY-MIGRATION-001)`, object exists locally): `git merge-base --is-ancestor 842acdf9 HEAD` exits **1** — NOT an ancestor of current main. Therefore 842acdf9 is **retired as stale** and MUST NOT be treated as the Handy source identity (vestigial local object only).
- Exact upstream Handy repo + source commit for the integrated files: **UNKNOWN** (no source manifest found in repo; v6 §21's 10-field manifest does not exist). No provenance claim invented.
- Chain-of-custody state: **UNKNOWN / not VERIFIED** (missing: upstream SHA, retrieval date, license hash, per-file SHAs, modification enumeration, non-reuse list).

---

## 8. SUPABASE

Read-only inspection (no migration applied, repaired, reordered, or deleted; no live project reads performed):

- `supabase/migrations/`: **14 files**, ordered prefix `20260915000000` → `20260927100000` (baseline, profiles+RLS, search_path, RLS hardening, entitlements, devices+sessions, admin RBAC ×2, product metrics, admin directory, provider-neutral entitlements, webhook_events, webhook hardening 022, provider refs). Latest: `20260927100000_entitlements_provider_refs.sql`.
- `supabase/functions/`: `payment-checkout` (`index.ts`), `razorpay-webhook` (`index.ts`, `catalog.ts`, `events.ts`, `ledger.ts`, `verify.ts`) — structure consistent with v6 §06 (HMAC verification module + durable ledger module present as files; behavior NOT executed/verified).
- `supabase/tests/`: `migration-guard.test.mjs`, `payment-checkout.test.mjs`, `webhook-hardening.test.mjs`, `db_assertions.sql`, `rls_assertions.sql`, `vitest.config.mjs`.
- `supabase/config.toml`, `supabase/README.md` present.
- Live Supabase state (function list, `verify_jwt`, deployed migration level, secret existence): **UNKNOWN** — no Supabase MCP read was performed in this audit; `opencode` CLI is unavailable in this environment (see §10).
- Razorpay mode (TEST/LIVE), webhook endpoint/events, Plans/subscriptions, transaction evidence: **UNKNOWN** — no provider read performed; no payment executed (none attempted).

---

## 9. PAYMENT

No payment code or configuration touched; no real or TEST payment performed.

- `packages/payment-domain/src/` (`catalog.ts`, `index.ts`, `types.ts`) — single price catalog source of truth exists as files (values NOT re-verified against v6 §03 figures this session → catalog-content status UNKNOWN beyond file existence).
- `apps/website/src/lib/payment-service.test.ts` — untracked, uncommitted test fragment (classification unknown, §2b).
- Webhook hardening + ledger + verify modules exist as files (§8); prior milestone claims (`RAZORPAY-TEST-PAYMENT-SMOKE-027`, MILESTONE-COMMIT-026) live in PROGRESS.md / archived spec-v3 docs = evidence only (HISTORICAL/STALE, must be revalidated).
- Current implementation/test/deployment evidence for lifetime-TEST E2E, monthly-TEST E2E, signature/ledger/entitlement/account/desktop verification: **UNKNOWN** (code exists ≠ E2E VERIFIED; nothing executed this session).

---

## 10. MCP/SKILLS

Inventory of what is actually available to the current environment (no setup attempted; Razorpay MCP explicitly OUT OF SCOPE and untouched):

- Project-local skills (`.opencode/skills/`): **NONE** — `.opencode/` contains only `package.json`, `package-lock.json`, `opencode-swarm.json`, `.gitignore`, `node_modules/` (no skills directory).
- Global skills (`~/.agents/skills/`): **32 entries** — `agent-security-audit`, `cloudflare`, `cloudflare-deploy`, `codeql`, `find-skills`, `frontend-accessibility`, `frontend-design`, `gh-cli`, `github`, `mcp-server-review`, `playwright`, `react`, `rust-engineer`, `rust-review`, `securability-engineering`, `secure-workflow-guide`, `security-guidance`, `semgrep`, `shadcn`, `supabase`, `supabase-postgres-best-practices`, `supply-chain-risk-auditor`, `tauri`, `tauri-development`, `tauri-setup`, `vercel-composition-patterns`, `vercel-react-best-practices`, `vitest`, `web-design-guidelines`, `web-perf`, `workers-best-practices`, `wrangler`. (Content of individual SKILL.md files NOT loaded — procedural guidance, not authority; narrowest-skill loading is a per-task step, not an audit step.)
- Enabled MCP servers: **UNKNOWN** — `opencode` CLI is not installed in this environment (`opencode: command not found`), so `opencode mcp list` could not be executed. This session used direct `gh` CLI (authenticated) and local toolchain reads instead.
- Disconnected/unavailable MCP servers: **UNKNOWN** (unverifiable here).
- Per v6 §11 verification rule, no MCP is VERIFIED by this audit (no discovery+auth+harmless-read cycle performed for Supabase/Cloudflare MCP).

---

## 11. MODELS

- `crates/models/src/lib.rs` (workspace member `soravo-models`) implements a downloader with HTTPS-only/SSRF guards, streaming download, SHA-256 verification, size checks, atomic install + rollback, and `#![forbid(unsafe_code)]` (file content read; behavior NOT executed).
- Per-artifact evidence (exact artifact, publisher, source URL, license, commercial-use, redistribution, hosting, checksum, provenance, release decision — T10 acceptance): **UNKNOWN**. Archived matrices (`docs/archive/spec-v3/MODEL_PROVENANCE_MATRIX.md`, `MODEL_AND_BENCHMARK_REUSE_AUDIT.md`) are untracked previous-task copies = HISTORICAL/STALE at best, not current evidence.
- No license invented or inferred. Unknown license ⇒ that model is BLOCKED for release (policy restated, not a new decision).

---

## 12. DESIGN

- `docs/Soravo_Engineering_Docs_v6/DESIGN.md` (544 lines, design-token front-matter + fintech brand spec) is **tracked in HEAD** (committed by `ede495b5`, verified via `git show --stat HEAD` + `git ls-tree`).
- Confirmed: the v6 `DESIGN.md` is the authoritative Soravo design specification per `SPEC_MANIFEST.json` (`"design_source_of_truth": "DESIGN.md"`, v6.0.0, 24 files).
- Nothing redesigned. T13 implementation state: no redesign implementation evidence observed → see §13.

---

## 13. TASK BOARD (T01–T14, current evidence only)

Code-exists ≠ complete. PROGRESS.md claims (last audited 2026-09-27, but citing Main SHA `549eeeec`, older than current `ede495b5`, and citing superseded `SORAVO_PLAN.md`/`docs/spec-v3/` authority) are **HISTORICAL/STALE** throughout and were NOT reused as current state.

| Task | State | Basis (fresh evidence) |
|---|---|---|
| T01 State audit | IMPLEMENTED | This report records local/origin SHAs, branch, worktree, CI/deployment, dirty classification, MCP/skills inventory (T01 acceptance items). Not VERIFIED/DEPLOYED (audit artifacts aren't deployed). |
| T02 CI baseline restoration | BLOCKED | web lint FAIL, fmt FAIL, desktop build FAIL (all reproducible, category A); typecheck/tests/build/clippy/audit/deny UNKNOWN (skipped). Root test-command collection not demonstrated. |
| T03 Handy chain-of-custody | BLOCKED | Upstream repo+SHA UNKNOWN; no source manifest; `842acdf9` proven non-ancestor (retired stale). Blocker: exact upstream identity. |
| T04 Desktop compiler recovery | BLOCKED | 281 local errors; first error `actions.rs:4` E0432 reproduced; no fix attempted (audit-only). |
| T05 GTK/layer-shell | BLOCKED | `gtk`/`gtk_layer_shell` unresolvable in default build; installed-API verification not performed; overlay does not compile. |
| T06 hf-hub | BLOCKED | `hf_hub` imported but absent from all manifests + lockfile; no locked API to verify against. |
| T07 rodio/CPAL | BLOCKED | `rodio::OutputStreamBuilder` vs locked 0.19; dual cpal 0.15.3/0.16.0 in lock; no coherent strategy/ADR. |
| T08 Crate/workspace reconciliation | BLOCKED | 7 dirs invisible (5 manifest-less-of-workspace, 2 manifest-less entirely); `soravo-audio` referenced-but-undeclared; zero `exclude` entries. |
| T09 Branding/rebrand | UNKNOWN | No source scan performed this session; no classification report verified. |
| T10 Model licensing | UNKNOWN | Downloader code exists; per-artifact license/provenance evidence missing. (Release policy: unknown = BLOCKED for that model.) |
| T11 STT benchmark | UNKNOWN | No benchmark evidence executed or verified this session. |
| T12 Payment E2E | UNKNOWN | Code + test files exist; lifetime/monthly TEST E2E not executed; webhook/entitlement/account/desktop verification evidence missing. |
| T13 Website redesign | UNKNOWN | DESIGN.md authority confirmed; no implementation evidence observed; prerequisites (T02–T12) incomplete. |
| T14 Release | BLOCKED | CI red, desktop unbuildable, licenses unknown, no payment E2E, security gates unexecuted on HEAD. |

## 14. BLOCKERS

1. **Desktop does not compile** (T04/T08 root: unlinked `soravo-audio`, missing `hf-hub`/plugin deps, rodio/CPAL/GTK drift) — blocks T04–T08 and everything downstream.
2. **CI red on HEAD** (lint + fmt + desktop, category A) with 5 downstream gates skipped-to-UNKNOWN — blocks T02 and release.
3. **Handy upstream identity UNKNOWN** (no source manifest) — blocks T03 and provenance-gated release claims.
4. **Dirty worktree** (34 deletions + 136 untracked, §2) — must be classified/committed/archived by owners before implementation branches proceed; unknown fragments (`helpers/`, `post_process.rs`, `account.rs`, root v6 duplicate) must be preserved, never reset over.
5. **No branch protection on `main`** — governance gap (not a code blocker; recorded).
6. **Model per-artifact licensing UNKNOWN; payment E2E UNKNOWN; live Supabase/Razorpay/Cloudflare-account state UNKNOWN** (no authorized live reads performed).

## 15. UNKNOWNS (explicit)

Secret values / secret existence (only `.env.example` files observed; environment exposes no `SUPABASE*/RAZORPAY*/CLOUDFLARE*/VITE_*` names — names checked, values never read); MCP server states; clippy/test/audit/deny/typecheck/build gate outcomes on HEAD; T09–T13 completion states; deployment commit beyond Pages success at `ede495b5`; release artifacts; benchmark data; transaction evidence; live provider configurations.

## 16. EXACT NEXT TASK

**T02 — CI baseline restoration** (v6 §08 prerequisite ordering; T01 completes with this report).

T02 acceptance (all must hold): web lint passes; Rust fmt passes; required desktop crates are workspace members or explicitly excluded; desktop build gate has a reproducible failure-or-PASS statement; root test commands collect the intended suites. T02 must NOT be skipped for easier later tasks; T03+ remain gated behind it. Recommended first scoped slice (for the T02 implementer, not this audit): web-lint unused-import/`any` cleanup (category A, smallest blast radius), then `cargo fmt` (mechanical), then workspace membership/exclusion declaration — desktop compiler repair itself belongs to T04+.

---

## 17. COMMANDS EXECUTED (read-only)

```text
git fetch origin --prune
git status --short --branch / git status --porcelain=v1 [-uall] (multiple slices + counts)
git rev-parse HEAD / git rev-parse origin/main
git rev-list --left-right --count HEAD...origin/main
git log -n 20 --oneline --decorate
git worktree list
git diff --check / git diff --name-status / git diff --cached --name-status
git stash list
git ls-tree HEAD [--name-only] (+ Soravo_Engineering_Docs_v6, docs/spec-v3, docs/archive paths)
git show --stat HEAD / git show --stat a156c8c9 (paging head/tail only)
git merge-base --is-ancestor 842acdf9 HEAD (exit code) / git cat-file -t 842acdf9 / git log --oneline 842acdf9 -1
git remote -v
gh pr list --state open/merged; gh run list --branch main / --workflow "Security Audit"
gh run view <36339104443|36286378783|36285840478> [--json jobs | --log-failed] (+ grep slices for errors)
gh api repos/eySRbS4zgHuW3gMFZB2/soravo/branches/main/protection
gh run view 36339104444 --json conclusion,headSha,workflowName,status
gh workflow list; gh auth status
cargo fmt --all -- --check (check-only, non-mutating)
cargo check -p soravo-desktop (twice: error-list slice + count; no --fix, no manifest/lock writes)
cargo --version / rustc --version / node --version / pnpm --version
ls/dir listings (crates/*, apps, supabase/*, packages/*, .opencode, ~/.agents/skills, .github/workflows)
head/tail reads of: v6 pack (all 24 files, mandatory order), Cargo.toml files, Cargo.lock slices (grep),
  SORAVO_HANDY_CODE_REUSE_REPORT.md, PROGRESS.md, STATE-AUDIT-V6-002.md, CI-BASELINE-AUDIT-002.md,
  crates/models/src/lib.rs
printenv | cut -d= -f1 | grep -iE "supabase|razorpay|cloudflare|vite_|tauri|apple|microsoft" (NAMES ONLY)
find .opencode -maxdepth 3
```

---

## 18. STATEMENT OF WHAT WAS NOT MODIFIED

No source code, package/config file, CI workflow, MCP configuration, or documentation (other than this new audit report file) was created, edited, moved, or deleted. No dependencies installed or removed. No formatter executed in write mode (`cargo fmt` ran only with `--check`). No migrations applied/reordered/repaired. No payment executed. No commit, push, reset, clean, stash, checkout-overwrite, or deletion performed — the 34 unstaged deletions, 136 untracked files, 10 stashes, and 3 linked worktrees were inspected and left exactly as found. No Razorpay MCP setup attempted (explicitly out of scope). No Handy SHA inferred; no license invented; no missing fact inferred — UNKNOWN reported wherever evidence was absent, per the v6 determinism rule.

**FINAL RULE COMPLIANCE: audit stops here. Nothing was fixed, committed, or pushed.**
