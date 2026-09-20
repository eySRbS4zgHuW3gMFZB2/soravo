# Soravo

> **Repository root specification for Soravo engineering/product plan.**

## AUTHORITATIVE PROJECT PLAN

The current Soravo engineering plan is:

**SORAVO_PLAN.md**

The detailed authoritative specification is:

**docs/spec-v3/**

V2 is historical and superseded:

**docs/spec-v2-archive/**

**Future contributors and AI agents MUST read SORAVO_PLAN.md before implementation.**

---

## Quick Links

| Document | Description |
|---|---|
| [SORAVO_PLAN.md](./SORAVO_PLAN.md) | Root-level navigation and authority document |
| [V3 README](./docs/spec-v3/00_README.md) | Authoritative entry point for V3 |
| [V3 PRD](./docs/spec-v3/01_PRD.md) | Product requirements and scope |
| [V3 Architecture](./docs/spec-v3/02_ARCHITECTURE.md) | Actual implementation architecture (Handy-derived) |
| [V3 Security](./docs/spec-v3/09_SECURITY_BASELINE.md) | Security requirements |
| [V3 ADR Index](./docs/spec-v3/10_ADR_INDEX.md) | Architecture-decision records |
| [V2 Archive](./docs/spec-v2-archive/) | Historical documents (superseded) |

---

## Product Definition

Soravo is a professional **local-first, FOSS speech-to-text desktop application**.

- Fast local transcription (no cloud STT)
- Privacy-first operation (no desktop telemetry)
- macOS and Windows primary targets
- Handy (MIT) as the desktop implementation foundation

---

## Key Principles

1. **V3 is authoritative** — V2 is historical only
2. **Handy-derived architecture** — Reuse generic desktop implementations
3. **Soravo owns contracts** — Requirements/Security/Session semantics remain authoritative
4. **Model licenses are independent** — Each model must be verified separately
5. **Benchmark-driven decisions** — No claims without measurements

---

## License

- Soravo specification: See V3 documents
- Handy code (if reused): MIT (https://github.com/cjpais/Handy)
- Model licenses: Verified independently per model

---

## Getting Started

1. Read `SORAVO_PLAN.md`
2. Read `docs/spec-v3/00_README.md`
3. Read `docs/spec-v3/03_AI_INSTRUCTIONS.md` for AI agent rules
4. Inspect `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` for current migration status
5. Check `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` for model policy
