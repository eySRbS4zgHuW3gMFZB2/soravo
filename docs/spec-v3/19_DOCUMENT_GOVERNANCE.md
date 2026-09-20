# 19 — Document Governance

**Version:** 3.0.0  
**Status:** Authoritative

---

## 1. Version Authority

**V3 is authoritative going forward.**

V2 remains in `docs/spec-v2-archive/` for historical reference only.

If V3 conflicts with old V2 documents, V3 wins.

---

## 2. Document Location

| Version | Location | Status |
|---|---|---|
| V3 (authoritative) | `docs/spec-v3/` | Active implementation reference |
| V2 (historical) | `docs/spec-v2-archive/` | Historical reference only |

Do not modify V2 documents to make them appear consistent with V3. Preserve them as-is.

---

## 3. Agent Requirements

All coding agents must:
1. Read V3 documents before implementation
2. Consult V3 architecture when designing new features
3. Check V3 ADRs before changing architecture
4. Follow V3 AI instructions for coding workflow
5. Reference V3 task breakdown for implementation scope

---

## 4. Architecture Change Rules

**Do not silently modify architecture.**

If implementation reveals a TDD or architecture is wrong:
1. Stop before large-scale divergence
2. Create an ADR
3. Update affected documents
4. Continue only after the decision is recorded

---

## 5. Document Synchronization

When updating documents:
- Update `SPEC_MANIFEST.json` with document list and versions
- Update document timestamps
- Record changes in document history

---

## 6. ADR Requirements

All architecture decisions must be recorded in:
- `10_ADR_INDEX.md` (index)
- `decisions/ADR-XXX-title.md` (full decision)

Required ADR fields:
- Context
- Decision
- Alternatives considered
- Consequences
- Security impact
- Rollback strategy

---

## 7. Document Manifest

The `SPEC_MANIFEST.json` file tracks:
- Version
- Document list
- Authority order
- Superseded documents
- Current architecture
- Handy commit
- Migration status

Manifest must be machine-readable and deterministic.

---

## 8. Change Log

Document changes must be recorded in:
- Commit messages
- ADRs
- Migration status documents

---

## 9. Archive Policy

When superseding a document:
1. Move to archive location
2. Add superseded notice
3. Keep historical content intact
4. Update manifest to reflect change

---

## 10. Review Requirements

Before merging document changes:
- Verify no contradictions with higher-authority documents
- Confirm manifest updated
- Check V3 archive integrity
- Validate migration status reflects reality
