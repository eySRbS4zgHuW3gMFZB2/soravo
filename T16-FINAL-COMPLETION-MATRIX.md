# T16 — FINAL FUNCTIONAL COMPLETION MATRIX (Authoritative)

**Date:** 2026-09-28
**HEAD (committed):** `ede495b5` — docs: persist Soravo engineering control pack v6 (== origin/main)
**Worktree:** dirty — large pre-existing uncommitted delta (T03-E/T07/T10-B recovery + staged spec-v3 deletions + untracked reports). `git diff --check` clean.
**Sources:** v6 spec pack (`docs/Soravo_Engineering_Docs_v6/`), T13 boundary audit, T13–T15 reconciliation, T15 readiness, T11 post-cleanup audit, T09-C CI health, T09-D reconciliation, live repo reads performed 2026-09-28 (this task).
**Status vocabulary (mission-defined):** IMPLEMENTED · VERIFIED · PRODUCTION VERIFIED · PARTIAL · BLOCKED · NOT APPLICABLE
**Rule applied:** no status upgraded without evidence. Committed-HEAD evidence governs; worktree-only improvements are noted but do not change the committed verdict.

---

## Final matrix (22 domains)

| # | Domain | Status | Evidence (committed HEAD unless noted) |
|---|--------|--------|----------------------------------------|
| 1 | Handy core | IMPLEMENTED | T13: 9 core + 5 patched components traced (`crates/audio`, `crates/stt/engines`, `shortcut/handy_keys.rs`, `crates/typing`, model mechanics); dependency direction clean (Soravo→Handy, no reverse); no gratuitous rewrites. Not PRODUCTION VERIFIED (no release build). |
| 2 | Desktop shell | PARTIAL | Tauri v2 app exists (`apps/desktop/src-tauri`, React frontend, IPC, settings, tray). T09-C §5.9: committed `main.rs` references 11 commands absent from crate → `cargo check --all-targets` FAIL, `desktop` CI job blocked. T10-B 14-command recovery exists **in worktree only (uncommitted)** — does not change HEAD verdict. `tauri build` never executed. 15/178 lib tests fail (catalog + filler-gating, T09-C §5.10). |
| 3 | Audio/STT | PARTIAL | `crates/audio`, `crates/stt`, `audio_toolkit/` (cpal, VAD silero/smoothed/earshot, post-process), `transcription.rs` StreamRouter exist. No real-hardware capture, benchmark-dataset, or end-to-end transcription execution evidence. |
| 4 | Model management | PARTIAL | `managers/model.rs` (download, checksum, atomic install; TranscribeCpp/Parakeet/Moonshine/SenseVoice/GigaAM/Canary/Cohere types). T15 §9: **no default model catalog, no manifest** → nothing shippable out of the box. |
| 5 | Accounts | PARTIAL | `account.rs`, `commands/account.rs` (sign_in_start/complete, sign_out, device/session, token refresh) exist; worktree adds snapshot re-exports (uncommitted). No auth-flow execution evidence; offline `Unavailable` path untested. |
| 6 | Supabase | VERIFIED | `supabase/config.toml` + 14 migrations; T08 live verification confirmed 5 tables, RLS, constraints; edge-function dirs (`payment-checkout`, `razorpay-webhook`) present. Not PRODUCTION VERIFIED (no prod-traffic evidence). |
| 7 | Sessions | VERIFIED | `session.rs` state machine (IDLE→…→DONE) + `session_reset`; T10-B: 13 ladder tests pass; devices+sessions migration present. Local scope only — no prod verification. |
| 8 | Cloud sync | PARTIAL | Device/session records via Supabase REST only. T15 §14: **no transcript sync, no conflict resolution**. |
| 9 | Entitlements | PARTIAL | Server side VERIFIED live (entitlements table, RLS, service_role-only writes; 3 rows per T08). End-to-end PARTIAL: desktop validation stubbed (`request_sign_in`, T15 §12), no offline cache persistence, 2 failed webhook rows untriaged (T08 D8), subscription lifecycle unexercised. |
| 10 | License API | IMPLEMENTED | `services/license-api/` (catalog, payment service) exists; T04-C lint report; per-package tests pass (71/71 per T09-C). No endpoint/integration execution evidence → not VERIFIED. |
| 11 | Razorpay | PARTIAL | Lifetime order creation implemented; webhook HMAC path exists. Open: **F-01 JWT decoded via `atob()` never verified** (`payment-checkout/index.ts:76-88`, re-confirmed this task); F-05 fabricated monthly plan IDs; TEST credentials only, LIVE never exercised. |
| 12 | Webhooks | VERIFIED | `razorpay-webhook/` (HMAC-SHA256 `verify.ts`, raw-body check, ledger `20260926140000` migration, entitlement mapping); tests exist. Local scope — TEST mode only, 2 failed ledger rows untriaged → not PRODUCTION VERIFIED. |
| 13 | Website | PARTIAL | All pages present (landing/features/pricing/download/FAQ/login/account/admin), shadcn/ui; `pnpm build` + 179 website vitest pass (T09-C). Checkout: **F-03 SDK loader now present in worktree** (`ensureRazorpaySDK`, uncommitted improvement — verified this task); F-04 USD-display/INR-charge alignment still unproven end-to-end; no browser purchase proof. |
| 14 | CI/CD | PARTIAL | `web` PASS, `e2e` 20/20 PASS (T09-C). `rust --all-targets` + `desktop` jobs blocked at HEAD (§5.9; worktree fix uncommitted). Branch protection absent (404). `pages-deployment` deploys independent of CI (red-CI can ship). Release workflow `workflow_dispatch`-only, signing commented out, never exercised. |
| 15 | Cloudflare | BLOCKED | `pages-deployment.yaml` (least-privilege secrets, conditional skip) exists; **zero deployment executions**, per T08/T11/T13–T15 unanimously. Credentials-gated, provider-side. |
| 16 | Updates | BLOCKED | `tauri-plugin-updater` initialised in `main.rs`, but **`tauri.conf.json` (re-read this task) contains no `plugins.updater` endpoints/pubkey**; no update server, no staged-update test. T15 §16 blocking confirmed. |
| 17 | Security | PARTIAL | cargo-audit/deny PASS (13 aligned ignores), CSP present in `tauri.conf.json`, RLS service_role-only writes. Open: **F-01 JWT bypass (CRITICAL)**, leaked-password protection DISABLED (T08 D3), B2 unsafe-FFI ADR pending (worktree removed `memory.rs`, uncommitted). |
| 18 | MCP/agent tooling | IMPLEMENTED | v6 §11 MCP/agent docs, `.opencode/` config, skill packs, TestSprite/Playwright protocols present; Razorpay MCP untouched per task constraints. Capability-existence claim only — no execution/acceptance evidence claimed. |
| 19 | Tests | PARTIAL | Green: website 179/179, license-api 71/71, desktop frontend 8/8, workspace-minus-desktop, e2e 20/20. Red/gapped: desktop lib **15 failures persist** (10 `catalog.json` missing-`models`-field — re-confirmed this task: no `models` key; 5 filler-gating), `supabase/` webhook suite unresolvable (not in pnpm workspace), checkout tautologies (T09-D F-08), `supabase/functions/**` outside type/lint coverage (F-09). |
| 20 | Windows | PARTIAL | MSI+NSIS targets, installer icon, en-US/Wix config present in `tauri.conf.json`. **No `tauri build` execution evidence** on Windows or CI. |
| 21 | macOS | PARTIAL | DMG target, `Entitlements.plist`, icons present. **No build/notarization evidence**; app-ID registration outstanding; `NSMicrophoneUsageDescription` gap noted (T15 §4). |
| 22 | Provenance/licensing | PARTIAL | VERIFIED: upstream `cjpais/Handy`, pinned `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (ADR-026, T08), MIT attribution retained, `com.handy.*` branding removed. Missing: chain-of-custody artefacts per v6 §21 (clone timestamp, branch snapshot, immutable tarball) + model-licensing compliance incomplete. |

**Counts:** IMPLEMENTED 2 · VERIFIED 3 · PRODUCTION VERIFIED 0 · PARTIAL 15 · BLOCKED 2 · NOT APPLICABLE 0.

**What changed vs the 22-matrix baseline:** nothing upgraded — deliberately. Two worktree-only improvements observed (14-command IPC recovery; Razorpay SDK loader) remain uncommitted and therefore do not move HEAD verdicts. F-01, catalog-`models` gap, updater-endpoint gap, and Cloudflare non-deployment were re-verified live by this task.
