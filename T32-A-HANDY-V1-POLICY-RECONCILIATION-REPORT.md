# T32-A — HANDY-V1 POLICY RECONCILIATION REPORT

**Date:** 2026-09-29  
**Task:** T32-A — AUTHORITATIVE V1 HANDY WRAPPER POLICY + DOC RECONCILIATION  
**Status:** DOCUMENTATION RECONCILIATION COMPLETE  
**Branch:** `t31/soravo-wrapper-completion`  
**HEAD:** `648d110d`  
**State:** Clean working tree (untracked reports from T22–T31 preserved)

---

## 1. TASK SUMMARY

Reconciled the authoritative V1 Handy Wrapper Policy (from T29/T30/T31) into the engineering documentation pack.

**Policy Key Points:**
- Soravo V1 = Soravo-branded wrapper/platform around functioning Handy STT foundation
- DO NOT modify Handy's core STT behavior unless required for compilation, security, platform compatibility, or explicit contract
- DO NOT implement a Soravo transcription post-processing layer
- Handy = protected functional core; Soravo = wrapper/platform infrastructure
- When tests conflict with Handy behavior, STOP for product decision (do not change behavior to satisfy test)

---

## 2. DOCUMENTATION CHANGES

### Files Updated

| File | Changes |
|------|---------|
| `Soravo_Engineering_Docs_v6/02_PRODUCT_REQUIREMENTS.md` | Added V1 HANDY-CORE PRESERVATION section (6 policy bullet points) |
| `Soravo_Engineering_Docs_v6/04_HANDY_FORK_AND_REUSE_POLICY.md` | Added V1 HANDY-CORE PRESERVATION POLICY section (core principles + DO NOT modify list + test conflict procedure) |
| `Soravo_Engineering_Docs_v6/09_AI_AGENT_INSTRUCTIONS.md` | Added V1 HANDY-CORE PRESERVATION VIOLATIONS stop conditions (5 bullet points) |
| `Soravo_Engineering_Docs_v6/20_ADR_INDEX.md` | Added ADR-018 entry for V1 Handy-core preservation policy |
| `Soravo_Engineering_Docs_v6/21_HANDY_SOURCE_CHAIN_OF_CUSTODY.md` | Added V1 behavior preservation requirements section (4 bullet points) |

### Files NOT Modified

- `Soravo_Engineering_Docs_v6/03_TECHNICAL_DESIGN.md` — Already has Handy/Soravo boundary; V1 policy is covered in 04 and 09
- `Soravo_Engineering_Docs_v6/05_DESKTOP_CONTRACTS.md` — Already aligned with V1 boundary (session/transcript/IPC contracts)
- `Soravo_Engineering_Docs_v6/07_IMPLEMENTATION_PLAN.md` — Already references Phase 2–3 recovery; V1 gate enforced by 04/09

---

## 3. CONTRADICTIONS RESOLVED

| Contradiction | Resolution |
|---------------|------------|
| T29/T30/T31 V1 policy exists but docs don't explicitly enforce it | Now documented in 02, 04, 09, 21 |
| Test conflicts with Handy behavior (T30 §4) — no explicit stop condition in docs | Added V1 stop conditions to 09_AI_AGENT_INSTRUCTIONS.md |
| 20_ADR_INDEX.md missing ADR-018 entry | Added ADR-018 to index |
| Chain-of-custody doesn't mention V1 behavior preservation | Added V1 behavior preservation requirements to 21 |

---

## 4. DOCUMENTATION CONSISTENCY VERIFICATION

- [x] All V1 policy requirements now explicitly documented
- [x] No source files modified (only docs)
- [x] No new contradictions introduced
- [x] ADR-018 reference now available in index

---

## 5. GIT STATE

```
On branch t31/soravo-wrapper-completion
Your branch is up to date with 'origin/t31/soravo-wrapper-completion'.

Untracked files:
  T22-MILESTONE-CHECKPOINT-REPORT.md
  T23-BRANCH-PROTECTION-TASK.md
  T23-GITHUB-BRANCH-PROTECTION-REPORT.md
  T24-CI-FAILURE-ANALYSIS.md
  T24-CI-RECOVERY-REPORT.md
  T27-HANDY-CORE-FREEZE-AND-BOUNDARY-REPORT.md
  T28-CATALOG-AUTHORITY-REPORT.md
  T29-HANDY-V1-PRESERVATION-POLICY-REPORT.md
  T30-HANDY-V1-FAILURE-RECLASSIFICATION-REPORT.md
  T31-SORAVO-WRAPPER-COMPLETION-REPORT.md
  apps/desktop/.env.example
  apps/desktop/src-tauri/tauri.toml
  deno.lock
  docs/archive/spec-v3/spec-v3/
  reports/
```

**No staged changes.** All documentation updates are uncommitted (awaiting explicit commit instruction per task requirement).

---

## 6. NEXT TASK

Per T31: **T32 — Payment-checkout hardening** (Soravo-owned, TEST only)
1. Bring `supabase/functions/**` under type/lint coverage (T16 F-09)
2. Fix `getRegionalPrice` unresolved reference + `Buffer`→runtime-safe base64
3. Add defense-in-depth JWT verification
4. Extend `supabase/tests/` with checkout unit tests

---

**End of T32-A Report**
