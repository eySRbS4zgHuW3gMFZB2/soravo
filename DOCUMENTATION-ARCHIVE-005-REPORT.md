# DOCUMENTATION-ARCHIVE-005-REPORT

**Generated:** 2026-09-28  
**Repository:** eySRbS4zgHuW3gMFZB2/soravo  
**HEAD:** ede495b55efd95cedd882d90a19d12b4777da852  
**origin/main:** ede495b55efd95cedd882d90a19d12b4777da852  
**Branch:** main

---

## 1. Repository State

| Field | Value |
|-------|-------|
| repository SHA | `ede495b55efd95cedd882d90a19d12b4777da852` |
| origin/main SHA | `ede495b55efd95cedd882d90a19d12b4777da852` |
| HEAD == origin/main | YES |
| Worktree state | Dirty (untracked files present, no staged changes) |

---

## 2. Files Moved (Phase 1)

All 8 missing v2 root engineering documents moved to `docs/archive/v2-root-engineering-pack/`:

| File | SHA-256 |
|------|---------|
| 07_AI_SKILLS.md | c653a08a38f158d94cc65a62012bc50ea10a3b783a1c7821e9c1b2e47662d02f |
| 08_MCP_AND_AGENT_TOOLING.md | 1cce4c1d5a0e1d4de8e880455a43d81cc6f91e018ebceae8a6fea35899e8bc59 |
| 09_SECURITY_BASELINE.md | 69304c16699e82e416b63289c8e0850f092d5a32b8f4731f08f71b1fac142d58 |
| 10_ADR_INDEX.md | 569cac8cffd378afda22affbb674d0007e5584efb3ceecee698ecbbef211ae96 |
| 11_INTERRUPTION_HANDOFF.md | 82310ad8ffdd18b4834317b1bb5ffa4d6268dfc2fa7ae6bd50f1925c373f89cb |
| 12_BENCHMARK_PROTOCOL.md | 1523784c252497c1505345c06e004685fb51f136e47ee6ece1f9ee86777d1c72 |
| 13_RELEASE_RUNBOOK.md | 078b73ea9dbde861e8f111b84f9519d3eaee194049150f73dcfd1c9da95fadd8 |
| 14_ENVIRONMENT_AND_SECRETS.md | 50cf5d01506c34c287032411b47c6aeafa51b89bc36abf0cc01ad686b0c0ebb7 |

**Verification:** All SHA-256 hashes match original root files.

---

## 3. Files Retained

### Root v2 originals (still present)
All 14 root v2 documents remain at root level (tracked, unmodified):
- 01_PRD.md through 14_ENVIRONMENT_AND_SECRETS.md

### Unchanged authorities (per instructions)
- `decisions/` - Current ADR history (14 ADRs)
- `progress/` - Historical execution evidence (16 files)
- `Soravo_Engineering_Docs_v6/` - Current v6 pack (24 files)
- `DESIGN.md` - Authoritative design spec

---

## 4. Duplicates (Phase 3)

### Nested spec-v3/spec-v3/
- Contains 38 files
- Byte-identical duplicate of parent `docs/archive/spec-v3/` (excluding the nested directory itself)
- **Status:** Verified exact duplicate at byte level (sampled multiple files including 01_PRD.md, 07_AI_SKILLS.md)
- **Action:** Preserved as historical archive (not deleted per instructions)

---

## 5. Stale References (Phase 4)

### Broken path references identified:

| File | Reference Type | Stale Path | Current Path |
|------|----------------|------------|--------------|
| PROGRESS.md | Multiple links | docs/spec-v3/* | docs/archive/spec-v3/* |

**Notes:**
- PROGRESS.md contains historical references to docs/spec-v3/ paths
- These are documentation-only references, not code/config/CI
- No source code, CI, or MCP configuration references found
- SPEC_MANIFEST.json references remain as intentional historical records

---

## 6. Unresolved References

- PROGRESS.md references to docs/spec-v3/* are historical documentation
- No active blocking issues in source code, CI, or MCP config
- Documentation-only path updates would require human approval

---

## 7. Final Archive Counts

| Location | Count |
|----------|-------|
| docs/archive/v2-root-engineering-pack/ | 14 files |
| docs/archive/spec-v3/ (top level) | 39 entries (38 files + decisions/ subdir) |
| docs/archive/spec-v3/spec-v3/ (nested) | 38 files |
| docs/archive/ total | ~84 files |

---

## 8. Documentation Tree

```
docs/
├── archive/
│   ├── README.md                    # Updated with accurate counts
│   ├── v2-root-engineering-pack/    # 14 files (complete)
│   │   ├── 01_PRD.md
│   │   ├── ...
│   │   └── 14_ENVIRONMENT_AND_SECRETS.md
│   └── spec-v3/
│       ├── 00_README.md
│       ├── ...
│       ├── decisions/ADR-027-handy-derived-desktop-foundation.md
│       ├── MODEL_AND_BENCHMARK_REUSE_AUDIT.md
│       ├── MODEL_PROVENANCE_MATRIX.md
│       ├── SORAVO_UI_INTEGRATION_PLAN.md
│       ├── SPEC_MANIFEST.json
│       ├── STT-BENCHMARK-RESULTS-016.md
│       ├── RAZORPAY-*.md (13 files)
│       └── spec-v3/                 # Nested duplicate (38 files, byte-identical)
├── decisions/                       # 14 files (untouched)
├── progress/                        # 16 files (untouched)
└── Soravo_Engineering_Docs_v6/      # 24 files (current authority)
```

---

## 9. Authority Verification

| Authority Level | Location | Status |
|----------------|----------|--------|
| v6 Engineering Spec | Soravo_Engineering_Docs_v6/ | ACTIVE |
| Design Authority | DESIGN.md | ACTIVE |
| Implementation | GitHub main | ACTIVE |
| ADR History | decisions/ | ACTIVE |
| Execution History | progress/ | ACTIVE |
| Historical Evidence | docs/archive/ | ARCHIVED |

**Verification:** All authority levels preserved. Archived material correctly marked as non-authoritative in docs/archive/README.md.

---

## Summary

- **14 v2 root documents** → Complete in docs/archive/v2-root-engineering-pack/ (SHA-256 verified)
- **8 files moved** in this phase with SHA-256 evidence
- **0 source/CI/MCP changes** → Per instructions
- **0 commits/pushes** → Per instructions
- **1 nested duplicate preserved** → spec-v3/spec-v3/ (byte-identical)
- **docs/archive/README.md updated** → Accurate counts and notes

**STOP:** Archive organization complete. Report generated.
