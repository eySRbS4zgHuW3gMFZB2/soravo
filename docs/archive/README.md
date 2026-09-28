# Soravo Engineering Documentation Archive

## Purpose

This archive contains historical and superseded engineering documentation. **Archived documents are NOT engineering authority.**

## Current Authority Model

1. **v6 Pack** (`Soravo_Engineering_Docs_v6/`) - Current engineering specification
2. **DESIGN.md** - Sole authoritative design spec
3. **GitHub main** - Implementation truth
4. **decisions/** - Current ADR history
5. **progress/** - Historical execution evidence

## Archive Contents

### v2 Root Engineering Pack (`v2-root-engineering-pack/`)
- 14 root-level engineering documents (01_PRD.md through 14_ENVIRONMENT_AND_SECRETS.md)
- Superseded by v6 pack
- SHA-256 verified for integrity

### Spec v3 (`spec-v3/`)
- Historical v3 implementation documentation (38 files + decisions/ subdirectory)
- Core docs: 00_README.md through 19_DOCUMENT_GOVERNANCE.md (19 files)
- Supplementary documents: MODEL_AND_BENCHMARK_REUSE_AUDIT.md, MODEL_PROVENANCE_MATRIX.md, SORAVO_UI_INTEGRATION_PLAN.md, STT-BENCHMARK-RESULTS-016.md
- Razorpay implementation docs (13 files)
- Superseded by v6 pack
- **Note:** Contains nested duplicate spec-v3/ subdirectory (exact byte-level copy of parent)

## Accessing Current Documentation

- **Root README**: `README.md` → references v6 pack
- **v6 Engineering Pack**: `Soravo_Engineering_Docs_v6/`
- **Design Spec**: `DESIGN.md`
- **ADR Index**: `decisions/`

## Notes

- Archived content preserved for historical reference only
- No archived document should be used as current authority
- For engineering questions, consult v6 pack first
