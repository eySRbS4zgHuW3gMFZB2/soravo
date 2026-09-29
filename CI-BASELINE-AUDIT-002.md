# CI-BASELINE-AUDIT-002

**Date:** 2026-09-27  
**Auditor:** opencode  
**Working Directory:** `/home/maya/Desktop/Soravo_Engineering_Specification_v2`

---

## Summary

Main branch CI is currently **broken**. Three (3) of four (4) jobs failed on the most recent push (SHA: `ede495b5`). Branch protection is **not configured** on main. Pages deployment is gated on `CLOUDFLARE_API_TOKEN` secret availability.

---

## 1. Repository State

| Item | Value |
|------|-------|
| **Current HEAD (local)** | `ede495b5` |
| **origin/main (remote)** | `ede495b5` (up to date) |
| **Branch** | `main` |
| **Ahead/Behind** | 0 / 0 |
| **Worktree** | Dirty (untracked files present) |
| **Latest Commit** | `docs: persist Soravo engineering control pack v6` |

### Recent Commits (last 5)
1. `ede495b5` docs: persist Soravo engineering control pack v6
2. `2f96f3d2` fix: update pnpm-lock.yaml to match payment-domain package.json
3. `af19dc69` fix(website): allow legitimate Razorpay checkout bundle
4. `bfbffc8d` feat(payments): add frontend checkout implementation (033)
5. `091f9e92` feat(payments): share payment domain catalog

---

## 2. Current GitHub CI Runs (Main Branch)

### Latest Run Summary
| Field | Value |
|-------|-------|
| **Run ID** | `36339104443` |
| **Commit SHA** | `ede495b5` |
| **Workflow** | `CI` |
| **Status** | `failure` |
| **Trigger** | `push` (to main) |
| **Duration** | `4m8s` |
| **Runner** | `ubuntu-24.04` |

### Job-Level Breakdown

| Job | Status | Failure Point | Classification |
|-----|--------|---------------|----------------|
| `web` | ❌ **FAIL** | `pnpm lint` | A (CODE) |
| `e2e` | ✅ PASS | N/A | N/A |
| `rust` | ❌ **FAIL** | `cargo fmt --all -- --check` | A (CODE) |
| `desktop` | ❌ **FAIL** | `pnpm tauri build` | A (CODE) |

---

## 3. Exact Failure Details

### Job: `web` — Lint Failure
**File:** `apps/website/src/lib/payment-service.ts`  
**Error:**
```
1:15  error  'Currency' is defined but never used   @typescript-eslint/no-unused-vars
1:25  error  'ProductId' is defined but never used  @typescript-eslint/no-unused-vars
```
**Root Cause:** Unused imports in payment service file.

---

### Job: `rust` — Formatting Failure
**File:** `apps/desktop/src-tauri/src/audio_toolkit/mod.rs`  
**Error:** `cargo fmt --all -- --check` detected formatting drift.  
**Root Cause:** Re-export ordering mismatch (import `pub use soravo_audio::{AudioRecorder, VadPolicy};` not at expected position).

---

### Job: `desktop` — Build Failure
**File:** `apps/desktop/src-tauri/src/managers/transcription.rs`  
**Errors:**
```
use of unresolved module or unlinked crate `transcribe_cpp`
use of unresolved module or unlinked crate `handy_keys`
```
**Root Cause:** Missing Rust dependencies in `Cargo.toml` (`transcribe_cpp` crate and `handy_keys` module not declared).

---

## 4. Local Reproduction

| Test | Command | Result |
|------|---------|--------|
| **Lint** | `pnpm lint` | ❌ FAIL (15 errors) |
| **Rust fmt** | `cargo fmt --all -- --check` | ❌ FAIL (1 file) |
| **Rust build** | `cargo build` | ❌ FAIL (missing deps) |

All CI failures are **reproducible locally**.

---

## 5. Workflow / Gate Topology

### Active Workflows
| File | Purpose | Gating Requirements |
|------|---------|---------------------|
| `.github/workflows/ci.yml` | Main CI | Runs on PR + push to main |
| `.github/workflows/pages-deployment.yaml` | Pages deploy | Runs on push to main; gated by `CLOUDFLARE_API_TOKEN` secret |
| `.github/workflows/security-audit.yml` | Security scans | Runs on PR (Cargo.lock/toml changes) + weekly schedule |

### CI → Deployment Relationship
- Pages deployment runs **independently** of CI success
- Pages deploy **requires** `CLOUDFLARE_API_TOKEN` secret to be set (otherwise step skipped)
- **No mandatory status check** prevents merge on CI failure (branch protection not configured)

---

## 6. Branch Protection State

| Setting | Status |
|---------|--------|
| **Branch Protected** | ❌ No |
| **Required Status Checks** | None |
| **Required Reviews** | None |
| **Enforce Admins** | N/A |

**Implication:** Failed CI can coexist with production deployment. Merges can proceed without green CI.

---

## 7. T02 Acceptance Matrix

| Criterion | Met? | Evidence |
|-----------|------|----------|
| CI baseline established | ✅ | Latest run ID: 36339104443 |
| Failure classification | ✅ | 3 A-CODE failures, 0 ENVIRONMENT/SECRET |
| Local repro documented | ✅ | All failures reproducible locally |
| Blockers identified | ✅ | `transcribe_cpp` dependency missing |
| Workflow topology mapped | ✅ | 4 workflows, 3 jobs per CI |
| Branch protection assessed | ✅ | Not configured |
| Deployment gating assessed | ✅ | Gated on Cloudflare token secret |

---

## 8. First Blocking Issue

**Task:** `web` job lint failure (apps/website/src/lib/payment-service.ts)

**Reason:** This is the **most superficial fix** (unused imports) and affects the **first job** in CI ordering. Fixing this alone will not pass CI (rust and desktop also fail), but it is the simplest atomic step to restore partial CI hygiene.

**Recommended Next Atomic Task:**
1. Remove unused imports in `apps/website/src/lib/payment-service.ts` (Currency, ProductId)
2. Remove unused imports in `apps/website/src/pages/account.tsx` (refreshEntitlements, handleRefresh)
3. Address `any` types and unused vars in test files (or disable lint for test files)
4. Re-run `pnpm lint` to verify web job passes

---

## 9. Recommendations

1. **Fix lint errors first** (`apps/website/src/**`) — 5 min effort
2. **Fix rust fmt** (`apps/desktop/src-tauri/src/audio_toolkit/mod.rs`) — 5 min effort
3. **Add missing deps** to `apps/desktop/src-tauri/Cargo.toml` — requires upstream integration (transcribe_cpp crate)
4. **Enable branch protection** on main with `CI` as required check
5. **Enable Cloudflare token secret** for Pages deployment
6. **Address handy_keys module** in `apps/desktop/src-tauri/src/lib.rs` (missing `mod handy_keys;`)

---

## 10. Audit Notes

- No MCPs enabled (GitHub/Cloudflare MCP disabled by policy)
- Audit based on live GitHub run data + local reproduction
- All CI failures are **code-related** (not environment or secrets)
- Desktop build requires upstream integration work (transcribe_cpp crate availability)

---

**END OF AUDIT**
