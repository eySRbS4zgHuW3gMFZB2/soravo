# T09-C — CI BASELINE AND REPOSITORY HEALTH REPORT

**Date:** 2026-09-28
**HEAD:** `ede495b55efd95cedd882d90a19d12b4777da852` (= `origin/main`, 0/0 ahead/behind)
**Branch:** `main`
**Mode:** Audit + minimal no-behavior-change repair. No commit, no push.
**Goal:** Restore a genuinely green engineering baseline without changing product behavior.

---

## 1. Skill-selection gate record (per `07_AI_SKILLS.md`)

Task T09-C classified by domain: GitHub/Git, Rust, Testing, Supabase/database,
Cloudflare/deployment, Security, Tauri/Desktop.

**Loaded before any planning or editing:**

| Skill | Domain trigger |
|---|---|
| `github`, `gh-cli` | GitHub/Git: CI runs, branch protection |
| `rust-engineer`, `rust-review` | Rust: fmt, clippy, tests, audit, deny, workspace, desktop |
| `vitest`, `playwright` | Testing: unit/integration, browser E2E (gate rule 8) |
| `supabase`, `supabase-postgres-best-practices` | Supabase function test execution |
| `tauri`, `tauri-development` | Desktop compilation (Tauri) |
| `cloudflare`, `wrangler`, `workers-best-practices` | Deploy-vs-CI relationship (Pages deploy path) |
| `security-guidance`, `supply-chain-risk-auditor` | cargo audit/deny, branch-protection readiness (gate rule 7) |

**Deliberately NOT loaded (gate rule 9):**
`shadcn`, `react`, `vercel-react-best-practices`, `vercel-composition-patterns`,
`frontend-design`, `web-design-guidelines`, `frontend-accessibility` (no UI work;
task forbids UI redesign), `tauri-setup` (no toolchain change),
`cloudflare-deploy` (no deployment executed), `semgrep`/`codeql` (CLIs absent),
`secure-workflow-guide` (smart-contract only, not applicable), `find-skills`
(no uncovered domain appeared), `agent-security-audit`/`mcp-server-review`
(no agent/MCP config change; Razorpay MCP untouched per instructions).

## 2. Inputs read

- `Soravo_Engineering_Docs_v6/00_README.md` (+ authority ladder, determinism rule)
- `13_DEFINITION_OF_DONE_AND_QA.md`, `14_CI_CD_AND_BRANCHING.md`,
  `16_TEST_AND_BENCHMARK_PROTOCOL.md`, `17_RELEASE_RUNBOOK.md`,
  `19_STATE_AUDIT_PROTOCOL.md`
- `T02-CI-BASELINE-AUDIT-REPORT.md` (baseline: 15 web-lint errors, fmt failure,
  279 desktop errors, e2e pass, no protection, deploy-on-red-CI)
- `T03-D-DESKTOP-RESIDUAL-ERROR-INVENTORY.md`, `T03-E-DESKTOP-COMPILER-RECOVERY-REPORT.md`
  (blockers B1 tray-locale, B2 unsafe-FFI)
- `T04-A-TRAY-LOCALE-RECOVERY-REPORT.md`, `T04-B-MEMORY-UNSAFE-FFI-REPORT.md`,
  `T04-C-LICENSE-API-LINT-REPORT.md`, `T04-D-CI-PROTECTION-READINESS-REPORT.md`
- `T05-A-TRAY-I18N-DECISION-PACK.md`, `T05-B-MEMORY-ADR-DECISION-PACK.md`,
  `T05-C-LOCAL-VS-GITHUB-BASELINE-REPORT.md`
- `T07-DESKTOP-RECOVERY-REPORT.md` (implemented Tray-B English-only + Memory-A
  removal; pre-existing in worktree, accepted as prior human-directed work,
  not re-litigated here)
- `T08-DESKTOP-INTEGRATION-REPORT.md` (audited; §4 "Tauri Commands
  IMPLEMENTED_VERIFIED" claim is contradicted by source evidence — see §5.9)
- Live: `.github/workflows/*.yml`, `Cargo.toml`, `deny.toml`,
  `package.json`, `pnpm-workspace.yaml`.

## 3. Worktree note

HEAD equals `origin/main`. The worktree carries a large pre-existing uncommitted
delta (T03-E/T07 recovery + staged `docs/spec-v3` deletions + untracked reports).
Nothing was reset, stashed, committed, or pushed. `git diff --check` is clean.

**Concurrent-modification disclosure:** at ~12:02 UTC the file
`apps/website/src/pages/pricing.tsx` changed on disk during this session
(a dead `loadRazorpay` helper present at first read/lint was gone on re-read;
the first `pnpm --filter @soravo/website lint` failed 26:10, the re-run passed).
The authoring process is unknown (no edit by this task succeeded on that file —
the single edit attempt failed with oldString-mismatch because the content had
already changed). Recorded here; no action taken on that file by this task.

## 4. Baseline results (before this task's fixes)

| # | Item | Command | Result before fix |
|---|---|---|---|
| 1 | web lint | `pnpm --filter @soravo/website lint` | FAIL (1 err: `loadRazorpay` unused — since resolved externally, see §3) |
| 2 | full pnpm lint | `pnpm lint` (4 filters) | FAIL (same 1 err) → now **PASS** |
| 3 | Rust fmt | `cargo fmt --all -- --check` | **PASS** (exit 0) |
| 4 | Rust clippy | `cargo clippy --workspace --all-targets -- -D warnings` | FAIL (lib 19 style errors; bin 22 missing-command errors) → lib now **PASS** |
| 5 | Rust tests | `cargo test --workspace --exclude soravo-desktop` | **PASS** (all suites ok) |
| 6 | cargo audit | CI command (8 ignores) | FAIL (5 denied warnings) → with aligned ignores **PASS** |
| 7 | cargo deny | `cargo deny check` | FAIL (`error[unmaintained]` ×2) → now **PASS** |
| 8 | workspace membership | `cargo metadata --no-deps` | **PASS** (13 members resolve; see §5.8) |
| 9 | desktop compilation | `cargo check -p soravo-desktop --all-targets` | FAIL → lib now **PASS**; bin still FAIL (blocker §5.9) |
| 10 | E2E | `pnpm e2e` | **PASS 20/20** (12.4s, chromium-1243) |
| 11 | Supabase function tests | `pnpm test:supabase` | FAIL (1 suite unresolvable, pre-existing — §5.11) |
| 12 | CI job ordering | read `ci.yml` | independent jobs, no `needs` (confirmed) |
| 13 | deploy-vs-CI | read `pages-deployment.yaml` | independent; deploys on red CI (confirmed) |
| 14 | branch protection | `gh api .../branches/main/protection` | 404 ABSENT (confirmed; NOT enabled — §7) |

Also verified green: `pnpm typecheck` (4 filters), `pnpm build`
(website + desktop frontend), `pnpm audit --prod` (no vulnerabilities),
website vitest 179/179, license-api 71/71, desktop frontend 8/8,
payment-domain tests pass.

## 5. Fixes applied (confirmed issues only, zero product-behavior change)

No UI redesign. No payment-behavior change. Razorpay MCP untouched
(no MCP config, auth, or tool call in this task).

### 5.1 Clippy lib style lints — 19 errors → 0

All edits are lint-mechanical with identical runtime semantics:

- `managers/model.rs` (10× `useless_borrows_in_formatting`): removed redundant
  `&` in `format!("{}.partial"/"{}.extracting", …)` for `model.filename` (4)
  and `model_info.filename` (6). Format output byte-identical.
- `shortcut/handy_keys.rs` (2×), `shortcut/tauri_impl.rs` (2×)
  (`needless_return`): removed trailing `return;` after `let _ = app;` in
  Linux-gated early-out blocks. Control flow identical.
- `audio_toolkit/post_process.rs` (`manual_find`): `for`+`return Some` loop →
  `scores.into_iter().find(…).map(…)`; identical selection.
- `audio_toolkit/post_process.rs` (2× `needless_range_loop` in `similarity()`):
  index loops → `dp.iter_mut().enumerate()` / `dp[0].iter_mut().enumerate()`
  writing the same cells. Levenshtein values identical.
- `clipboard.rs` (`needless_late_init`): `let command; match …` →
  `let command = match …` expression. Same assignment set.
- `managers/transcription.rs` (`unused_assignments`): `let mut
  model_takes_initial_prompt = false;` → deferred `let
  model_takes_initial_prompt: bool;` (assigned+read only inside the
  TranscribeCpp probe branch; verified by grep: 3 hits, all in-branch).
- `managers/transcription.rs` (`items_after_test_module`, test target):
  moved `impl Drop for TranscriptionManager` above `mod tests` verbatim.
  Item order has no runtime effect.
- `portable.rs` (`write_with_newline`, test code): `write!(f, "…\n")` →
  `writeln!(f, "…")`. Bytes identical.
- `managers/gguf_meta.rs` (`manual_repeat_n`, test code):
  `repeat(0).take(n)` → `repeat_n(0, n)`. Elements identical.
- Ran `cargo fmt --all`; `cargo fmt --all -- --check` exits 0.

Verification: `cargo clippy -p soravo-desktop --lib -- -D warnings` exits 0
(was: 19 errors). No test-target style lints remain (only the §5.9 blocker).

### 5.2 `cargo deny` — FAIL → PASS

Root cause: two pre-existing transitive advisories uncovered by `deny.toml`:
`RUSTSEC-2025-0119` (`number_prefix 0.4.0` ← `indicatif` ← `hf-hub` ←
soravo-desktop; progress-bar formatting only) and `RUSTSEC-2024-0436`
(`paste 1.0.15` ← `specta`/`tauri` ← soravo-desktop; build-time proc-macro
only). Provenance via `cargo tree -i`. Added the two ignores with reasons in
the file's existing style. No dependency version changed, no behavior changed.
Verification: `cargo deny check` → `advisories ok, bans ok, licenses ok,
sources ok`, exit 0. Stale `advisory-not-detected` warnings (0081, 0075, 0080,
0100, 0098, 0186) remain as warnings only and were deliberately left in place.

### 5.3 `ci.yml` cargo-audit ignore list aligned — FAIL → PASS

Root cause (confirms T05-C §3.2): the CI `cargo audit` line carried 8 ignores
while the advisory graph needs 13. The 5 gaps: `RUSTSEC-2024-0422`,
`RUSTSEC-2024-0423`, `RUSTSEC-2026-0186` (already accepted in `deny.toml` and
`security-audit.yml`) plus the §5.2 pair. Extended the CI ignore flags to the
same 13 (no reason-field support in flags; rationale recorded here and in
`deny.toml`). Verified the exact new command exits 0 over 812 locked crates
(1273 advisories loaded). No dependency changed.

### 5.4-5.7 Ancillary verifications (no change needed)

- §4 items 3 (fmt), 5 (workspace tests), 8 (membership), 10 (E2E 20/20),
  typecheck, build, `pnpm audit --prod`, per-package vitest suites: green,
  recorded as evidence, untouched.
- `pnpm lint` full chain: exit 0 across all 4 filters (after the §3
  external resolution; no edit by this task).

### 5.8 Workspace membership

Root `Cargo.toml` lists 13 members; `cargo metadata --no-deps` resolves all 13
(`soravo-desktop`, `audio`, `config`, `diagnostics`, `history`, `hotkeys`,
`licensing`, `models`, `scheduler`, `stt`, `transcript`, `typing`, `vad`).
`crates/transcribe-cpp` and `crates/transcribe-rs` remain manifest-less empty
dirs, intentionally not invented as crates (T03-E rule, upheld). The
`[profile.release]` warning is gone (profile lives at workspace root).
`crates/` contains 14 entries; the 13-member set is the intended universe.

### 5.9 Desktop bin blocker — NOT fixed (out of scope by rule)

`cargo check -p soravo-desktop --all-targets` still fails: 22 errors, all in
`apps/desktop/src-tauri/src/main.rs:30-41`. The `generate_handler!` references
11 commands that exist nowhere in the crate:
`runtime_status`, `ping`, `session_snapshot`, `session_transition`,
`session_reset`, `inject_text`, `load_settings`, `save_settings`,
`update_microphone_settings`, `update_hotkey_settings`, `update_model_settings`
(repo-wide grep: only hits are the `main.rs` references; `commands/mod.rs` at
HEAD and in worktree defines a different command set; the untracked
`commands/account.rs` defines account DTOs, not these). Identical at HEAD —
pre-existing integration gap in the T02-R7 class. Implementing 11 IPC commands
would invent product behavior and is forbidden by this task's rules.
This contradicts `T08-DESKTOP-INTEGRATION-REPORT.md` §4 ("Tauri Commands
IMPLEMENTED_VERIFIED") — that verdict is not supported by source evidence.

### 5.10 Desktop lib test failures — NOT fixed (product data/logic, out of scope)

`cargo test -p soravo-desktop --lib`: 178 passed, 15 failed.
- 10 share one root cause: `catalog/mod.rs:119` —
  `bundled catalog.json … Error("missing field models")`
  (6 `catalog::tests`, 4 `managers::model::tests`). `src/catalog/` is
  byte-clean vs HEAD: pre-existing product-data defect. Fixing means changing
  shipped catalog data or its schema — product change, out of scope.
- 5 `managers::transcription::tests` filler-gating assertions
  (e.g. expected `"eu vi um carro"`, got `"Eu vi carro."`): product logic in
  functions this task did not alter (verified §5.1 edits are semantic no-ops;
  catalog-adjacent failures prove the suite was already red).
Recorded as blockers for a product task, not CI-hygiene.

### 5.11 Supabase function tests — NOT fixed (pre-existing packaging defect)

`pnpm test:supabase`: 30 passed, 1 suite failed —
`webhook-hardening.test.mjs` cannot resolve `@soravo/payment-domain` from
`supabase/functions/razorpay-webhook/catalog.ts`. Confirms T05-C §3.1:
`pnpm-workspace.yaml` covers only `apps/*`, `services/*`, `packages/*`;
`supabase/` has no `package.json`/`node_modules`, so Node resolution fails.
Identical import exists at HEAD (`git status --porcelain supabase/` empty).
Repackaging supabase/ as a workspace member is a design decision with install
side effects — out of scope for behavior-preserving repair. Recorded as blocker.

## 6. CI ordering, deploy relationship, protection (no changes made)

- **Job ordering (`ci.yml`):** no `needs` keys; `web`, `e2e`, `rust`, `desktop`
  run independently. In-job steps are sequential with fail-fast (later steps
  skip after the first failure — the T02 masking mechanism). No edit made.
- **Deploy-vs-CI (`pages-deployment.yaml`):** triggers on `push: [main]` +
  `workflow_dispatch`, independent of the `CI` workflow result; deployment is
  skipped only when `CLOUDFLARE_API_TOKEN` is unset. Red-CI heads can still
  deploy — the v6 §14 distinction holds and is unchanged by this task.
  No edit made (gating deployment behind CI = F11, requires the green baseline
  first and a human decision on enforcement mechanics).
- **Release (`release.yml`):** `workflow_dispatch` only; signing secrets still
  commented out. Untouched.
- **`security-audit.yml`:** unchanged. Note: its audit ignore list (11) now
  differs from CI's (13) only by the §5.2 pair, which `deny.toml` covers for
  the deny job; a follow-up may align the two audit lines for uniformity
  (cosmetic, not done here to keep the diff minimal).

## 7. Branch-protection readiness — NOT READY, NOT ENABLED

- State: `gh api …/branches/main/protection` → HTTP 404 `Branch not protected`.
- Nothing was enabled (per instructions: do not enable until required checks
  are actually green and verified).
- Readiness verdict: **not ready.** Required checks `web`, `e2e`, `rust`,
  `desktop` are not jointly green: `rust` (workspace clippy/test over
  `--all-targets`) and `desktop` (`pnpm tauri build`) both fail at the §5.9
  missing-commands blocker; `cargo test --workspace` additionally carries the
  §5.10 catalog/filler failures. Enabling protection now would freeze `main`
  behind unpassable gates. Enable only after a product task resolves §5.9
  (+§5.10/§5.11 as scoped) and a full CI run is green; then require exactly
  `web`, `rust`, `e2e`, `desktop` (never `deploy`, per T04-D).

## 8. Constraint compliance

- No UI touched (no frontend/design skill loaded, no component edited by this
  task; the §3 pricing.tsx change was external to this task).
- No payment behavior modified (payment-service, license-api, payment-domain,
  supabase functions, checkout/webhook paths untouched; audit/deny/CI-flag
  changes cannot alter runtime behavior).
- Razorpay MCP untouched (no MCP surface used or configured).
- Only confirmed, evidence-backed issues fixed (§5.1–§5.3); all fixes are
  formatting/lint/ignore-list level with byte-identical outputs.

## 9. Exact files changed by this task (uncommitted, unpushed)

- `apps/desktop/src-tauri/src/managers/model.rs` (10× `&` removal in format!)
- `apps/desktop/src-tauri/src/shortcut/handy_keys.rs` (2× `return;` removal)
- `apps/desktop/src-tauri/src/shortcut/tauri_impl.rs` (2× `return;` removal)
- `apps/desktop/src-tauri/src/audio_toolkit/post_process.rs` (untracked;
  `find()` + `enumerate()` refactors, Levenshtein init)
- `apps/desktop/src-tauri/src/clipboard.rs` (match-expression init)
- `apps/desktop/src-tauri/src/managers/transcription.rs` (deferred init;
  Drop-impl reorder before `mod tests`)
- `apps/desktop/src-tauri/src/portable.rs` (`writeln!`, test code)
- `apps/desktop/src-tauri/src/managers/gguf_meta.rs` (`repeat_n`, test code)
- `.github/workflows/ci.yml` (audit ignore list 8 → 13)
- `deny.toml` (2 advisory ignores with reasons)
- `T09-C-CI-HEALTH-REPORT.md` (this file, new)
- `Cargo.lock` shows as modified: pre-existing (dependency closure from prior
  recovery work); this task added no dependency and ran no `cargo update`.

All other worktree modifications pre-date this task (T03-E/T07 recovery,
staged `docs/spec-v3` deletions, untracked reports). No commit, no push.

## 10. Next actions (product/human-owned, explicitly out of scope here)

1. Implement or officially descope the 11 missing Tauri commands (§5.9) per
   v6 §05 desktop contracts — the single blocker for `rust --all-targets`
   and `desktop` CI jobs.
2. Fix bundled `catalog.json` schema mismatch and the 5 filler-gating test
   expectations (§5.10) as product decisions.
3. Package-scope decision for `supabase/` workspace resolution (§5.11).
4. After 1–3 land and a full CI run is green: F11 deploy-gating + branch
   protection with checks `web`, `rust`, `e2e`, `desktop` (§7).
5. Reconcile the §3 concurrent-edit observation with whoever owns the
   parallel worktree activity before the fixing PR is cut (the fixing diff
   must be cut from a clean, owner-dispositioned worktree per T02 §18/B7).

---

*Method: read-only audit first (`git`, `gh`, file reads, `cargo metadata`,
`cargo fmt --check`, `pnpm lint/typecheck/test/build/audit`, `cargo
clippy/test/audit`, `cargo deny`, `pnpm e2e`), then minimal behavior-preserving
repairs only. Skills per §1 loaded before planning/editing. No commit, no push.*
