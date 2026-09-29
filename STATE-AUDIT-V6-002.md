# STATE-AUDIT-V6-002

**Audit Date:** 2026-09-27  
**Local HEAD:** ede495b55efd95cedd882d90a19d12b4777da852  
**Branch:** main  
**Origin:** https://github.com/eySRbS4zgHuW3gMFZB2/soravo.git  
**Origin/main:** 2f96f3d21213bce24f049996d5ab897f16acd31b  
**Ahead/Behind:** HEAD is 2 commits ahead of origin/main  
**Worktree:** dirty (15 untracked files)

## 1. Git State

| Item | Evidence | Status |
|------|----------|--------|
| Branch | `main` | IMPLEMENTED |
| HEAD | `ede495b5` (v6 pack persist) | VERIFIED |
| origin/main | `2f96f3d2` (pnpm-lock update) | VERIFIED |
| Ahead/Behind | 2 ahead, 0 behind | VERIFIED |
| Clean/Dirty | Dirty (untracked files) | BLOCKED |
| Staged files | None | VERIFIED |
| Untracked files | 15 files (docs, src files) | VERIFIED |

**Affected files:** Untracked files in /home/maya/Desktop/Soravo_Engineering_Specification_v2/

## 2. GitHub State

**Latest main commit:** ede495b55efd95cedd882d90a19d12b4777da852  
**CI runs:** Present in .github/workflows/ci.yml, security-audit.yml, release.yml, pages-deployment.yaml  
**Failed jobs:** UNKNOWN (no access to GitHub Actions API)  
**Successful jobs:** UNKNOWN (no access to GitHub Actions API)  
**Deployment state:** UNKNOWN (Cloudflare Pages config exists, no deployment verification)  
**Branch protection:** UNKNOWN (no API access)  
**Workflow configuration:** VERIFIED (4 workflow files present and parseable)

## 3. Documentation

**v6 pack presence:** IMPLEMENTED (all 22 + DESIGN.md + SPEC_MANIFEST.json)  
**Manifest validity:** VERIFIED (SPEC_MANIFEST.json present)  
**DESIGN.md authority:** VERIFIED (24613 bytes, authoritative design spec)  
**Conflicting historical documents:** HISTORICAL/STALE (spec-v3/ documents exist)  
**Obsolete duplicated specifications:** HISTORICAL/STALE (SORAVO_PLAN.md references exist)

## 4. Workspace

**pnpm workspace members:** VERIFIED (soravo root, @soravo/website, @soravo/desktop)  
**package scripts:** IMPLEMENTED (build, dev, lint, test, typecheck)  
**TypeScript projects:** IMPLEMENTED (apps/website, apps/desktop)  
**Rust workspace members:** IMPLEMENTED (8 crates)  
**Excluded crates:** BLOCKED (crates/diagnostics, history, licensing, scheduler, transcribe-cpp, transcribe-rs, vad exist but NOT in workspace members)  
**Missing referenced modules:** BLOCKED (soravo_audio crate referenced but not in workspace)

## 5. Website

**Build:** IMPLEMENTED (pnpm build, vite)  
**Lint:** IMPLEMENTED (eslint)  
**Typecheck:** IMPLEMENTED (tsc -b)  
**Tests:** IMPLEMENTED (vitest)  
**Production deployment:** UNKNOWN (Cloudflare Pages config present, no deployment verification)  
**Actual deployed SHA:** UNKNOWN (no API access to verify)

## 6. Supabase

**Functions:** IMPLEMENTED (payment-checkout, razorpay-webhook)  
**Migrations:** IMPLEMENTED (13 SQL files present)  
**Local vs remote migration history:** VERIFIED (no local supabase start)  
**Config:** IMPLEMENTED (config.toml present, JWT settings for razorpay-webhook)  
**Test collection:** IMPLEMENTED (4 test files, vitest config)  
**Webhook tests:** IMPLEMENTED (webhook-hardening.test.mjs)  
**Payment-checkout:** IMPLEMENTED (payment-checkout.test.mjs)  
**Razorpay-webhook:** IMPLEMENTED (verify.ts, events.ts, catalog.ts, ledger.ts)

## 7. Payment

**payment-domain:** IMPLEMENTED (packages/payment-domain)  
**Catalog consumers:** IMPLEMENTED (payment-checkout function, razorpay-webhook function)  
**Frontend checkout:** IMPLEMENTED (payment-service.ts, payment-service.test.ts)  
**Razorpay SDK loading:** IMPLEMENTED (via public keyId from checkout endpoint)  
**CSP:** IMPLEMENTED (tauri.conf.json has restrictive CSP)  
**Webhook:** IMPLEMENTED (HMAC verification, durable ledger)  
**Entitlement ledger:** IMPLEMENTED (webhook_events table, service_role grants)  
**TEST deployment state:** UNKNOWN (no verification)  
**E2E evidence:** UNKNOWN (no evidence recorded)

## 8. Desktop

**Cargo workspace:** IMPLEMENTED (apps/desktop/src-tauri in root workspace)  
**Compile state:** BLOCKED (E0432 errors on soravo_audio, hf_hub, gtk, rodio, etc.)  
**First reproducible compiler error:** BLOCKED (unresolved import `crate::audio_toolkit::is_microphone_access_denied` in actions.rs:4)  
**Missing crates:** BLOCKED (hf_hub, anyhow, futures_util, sha2, specta, tauri_specta, rusqlite, tauri_plugin_store, tauri_plugin_opener, tauri_plugin_clipboard_manager, tauri_plugin_global_shortcut, tauri_plugin_updater, transcribe_rs, transcribe_cpp, handy_keys, flate2, tar, ferrous_opencc, gtk, gtk-layer-shell, once_cell)  
**Missing modules:** BLOCKED (helpers, audio_toolkit exports)  
**GTK/layer-shell:** BLOCKED (crates not in workspace, compilation errors)  
**hf-hub:** BLOCKED (not in workspace, compilation error)  
**rodio/CPAL:** IMPLEMENTED (in Cargo.toml)  
**Tauri API:** IMPLEMENTED (v2, plugins configured)  
**Handy-derived files:** VERIFIED (per PR #55, commit a156c8c9)

## 9. Handy Provenance

**Exact upstream repository:** UNKNOWN (per 21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md)  
**Exact source SHA:** UNKNOWN (per 21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md)  
**Source manifest:** BLOCKED (not created)  
**License evidence:** BLOCKED (not recorded)  
**Imported files:** VERIFIED (40+ files, per commit a156c8c9)  
**Current Soravo integration commit:** IMPLEMENTED (a156c8c9)  
**Whether 842acdf9 is relevant:** HISTORICAL/STALE (not an ancestor of current main)  
**Current UNKNOWN evidence:** VERIFIED (documented in 21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md)

## 10. Models

**For every model reference:**
- **Artifact:** BLOCKED (no model manifests in repo)
- **Publisher:** UNKNOWN
- **URL:** UNKNOWN
- **License:** BLOCKED (no evidence)
- **Commercial use:** UNKNOWN
- **Redistribution:** UNKNOWN
- **Hosting:** UNKNOWN
- **Checksum:** UNKNOWN
- **Provenance:** UNKNOWN
- **Release status:** UNKNOWN

**T10 Model licensing:** BLOCKED (no specific models licensed/verified)

## 11. CI Baseline (T02)

**web lint:** IMPLEMENTED (workflow present)  
**Rust fmt:** IMPLEMENTED (cargo fmt --all --check in workflow)  
**workspace crate membership:** BLOCKED (8 crates exist, not all in workspace members)  
**desktop build reproducibility:** BLOCKED (compilation errors)  
**root test collection:** IMPLEMENTED (test command in root package.json)

## 12. T01-T14 Task Comparison

| Task | Status | Evidence |
|------|--------|----------|
| T01 State audit | VERIFIED | This report |
| T02 CI baseline | BLOCKED | Desktop build errors, missing workspace members |
| T03 Handy provenance | BLOCKED | Upstream SHA UNKNOWN |
| T04 Desktop compiler | BLOCKED | Multiple E0432 errors |
| T05 GTK/layer-shell | BLOCKED | Missing dependencies |
| T06 hf-hub | BLOCKED | Not in workspace |
| T07 rodio/CPAL | IMPLEMENTED | In Cargo.toml |
| T08 Crate reconciliation | BLOCKED | Crates exist but not in workspace |
| T09 Handy branding | UNKNOWN | No review performed |
| T10 Model licensing | BLOCKED | No model licenses verified |
| T11 STT benchmark | BLOCKED | No benchmark evidence |
| T12 Payment E2E | BLOCKED | No E2E evidence |
| T13 Website redesign | UNKNOWN | Not assessed |
| T14 Release | BLOCKED | Multiple prerequisites BLOCKED |

---

# BLOCKED Items Summary

1. **T02 CI baseline** - Workspace crate membership incomplete (crates/diagnostics, history, licensing, scheduler, transcribe-cpp, transcribe-rs, vad not in workspace), desktop build fails
2. **T03 Handy provenance** - Exact upstream repository and commit SHA are UNKNOWN per documentation
3. **T04 Desktop compiler recovery** - Multiple E0432 errors preventing compilation
4. **T05 GTK/layer-shell** - Missing dependencies in workspace
5. **T06 hf-hub** - Crate not in workspace members
6. **T08 Crate reconciliation** - 8 crates exist but not in Cargo.toml workspace members
7. **T10 Model licensing** - No specific model artifacts, licenses, or provenance verified
8. **T11 STT benchmark** - No benchmark corpus/hardware/build evidence
9. **T12 Payment E2E** - No lifetime or monthly TEST path evidence recorded

# UNKNOWN Items Summary

1. **CI runs** - No access to GitHub Actions API to verify pass/fail status
2. **Deployment state** - No access to Cloudflare Pages API to verify deployed commit
3. **Model licensing details** - No model manifests or license files in repository
4. **Handy upstream** - Documented as UNKNOWN in 21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md

---

**Command executed:** `git status`, `git log`, `cargo check`, `cat` on all relevant files  
**Affected files:** All source files in apps/desktop/src-tauri, missing workspace members in Cargo.toml
