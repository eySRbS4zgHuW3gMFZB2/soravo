# Soravo Engineering Specification v3

**Version:** 3.0.0  
**Date:** 2026-09-21  
**Status:** Authoritative

---

## Product Definition

Soravo is a professional local-first, FOSS speech-to-text desktop application. It captures microphone audio locally, performs speech recognition on-device, and injects only committed/final text into the user's active application.

**Handy (MIT) is the current desktop implementation foundation.** The Soravo specification remains authoritative over any implementation choice.

---

## Authority Hierarchy

From highest to lowest authority:

1. **Security/safety** (non-negotiable)
2. **V3 AI Instructions** (`03_AI_INSTRUCTIONS.md`)
3. **V3 ADRs** (`10_ADR_INDEX.md`)
4. **V3 Architecture** (`02_ARCHITECTURE.md`)
5. **V3 PRD** (`01_PRD.md`)
6. **V3 Implementation Plan** (`04_IMPLEMENTATION_PLAN.md`)
7. **V3 Task Breakdown** (`05_TASK_BREAKDOWN.md`)
8. **V3 Definition of Done** (`06_DOD_QA.md`)
9. **Code** (implementation)
10. **Agent preference** (lowest)

If two documents conflict, the higher-authority document wins. Record the conflict in `progress/` and fix the lower-authority document.

---

## Handy Reuse First (Mandatory)

Soravo V1 desktop application is built on **Handy** (https://github.com/cjpais/Handy, MIT licensed). 

Before implementing any feature that may overlap with Handy functionality, agents MUST locate, inspect, and reuse the actual pinned Handy source code wherever technically and legally compatible. Reimplementing existing Handy functionality is not permitted without explicit justification.

See `03_AI_INSTRUCTIONS.md` section 9 for the full policy.

**DO NOT PRESERVE CODE MERELY BECAUSE SORAVO ALREADY IMPLEMENTED IT.**

If Handy provides a mature, compatible implementation, use Handy. Delete the redundant Soravo implementation after consumers are migrated and tests pass.

---

## Product Principles

- Audio and transcription are local by default
- No cloud STT
- No audio/transcript/keystroke telemetry
- Performance is a product feature
- Benchmark-driven engine selection
- Only committed/final text may be injected into applications
- The app must survive an interrupted AI coding session
- Supabase stores account/entitlement/device metadata, not audio or transcript
- Admin analytics are product/account metrics, separate from Umami website analytics

---

## Handy Implementation Foundation

Soravo owns:
- Product requirements
- Security requirements
- Privacy requirements
- Transcript semantics
- Session semantics
- IPC contract
- Account architecture
- Supabase integration
- Razorpay payments
- Licensing/entitlements
- Model manifest and verification
- Benchmark methodology
- Release gates
- Soravo branding and UX decisions
- Commercial/legal decisions

Handy provides implementation for:
- Tauri desktop shell
- React/TypeScript desktop foundation
- Rust desktop foundation
- Audio capture
- Audio toolkit / VAD
- Global shortcuts
- Typing/input
- Clipboard
- Overlay/pill
- Model management
- Transcription infrastructure
- Settings
- History
- Tray
- Related desktop plumbing

---

## License and Branding Notes

- Handy source code is MIT licensed; Soravo retains required copyright notices
- **Handy branding must not become Soravo branding**
- Model licenses are independent from software licenses—each model must be verified separately
- The Handy codebase does not automatically grant model redistribution rights

---

## Document Order

1. `01_PRD.md` — product requirements and scope
2. `02_ARCHITECTURE.md` — actual implementation architecture
3. `03_AI_INSTRUCTIONS.md` — deterministic rules for AI coding agents
4. `04_IMPLEMENTATION_PLAN.md` — phased build order and dependencies
5. `05_TASK_BREAKDOWN.md` — atomic implementation tasks
6. `06_DOD_QA.md` — definition of done, testing and release gates
7. `07_AI_SKILLS.md` — exact skills and usage policy
8. `08_MCP_AND_AGENT_TOOLING.md` — MCP and CLI policy
9. `09_SECURITY_BASELINE.md` — security baseline
10. `10_ADR_INDEX.md` — architecture-decision records
11. `11_INTERRUPTION_HANDOFF.md` — deterministic recovery protocol
12. `12_BENCHMARK_PROTOCOL.md` — STT performance/quality benchmark protocol
13. `13_RELEASE_RUNBOOK.md` — build, signing, release and rollback procedure
14. `14_ENVIRONMENT_AND_SECRETS.md` — development environment and secret handling
15. `15_HANDY_REUSE_POLICY.md` — detailed Handy reuse policy
16. `16_HANDY_MIGRATION_STATUS.md` — current migration status
17. `17_MODEL_LICENSE_AND_PROVENANCE.md` — model license verification policy
18. `18_DESKTOP_ARCHITECTURE.md` — desktop component matrix
19. `19_DOCUMENT_GOVERNANCE.md` — document governance rules

---

## V2 Archive

The previous specification (v2) remains in `docs/spec-v2-archive/` for historical reference. V3 supersedes v2 for all active implementation work.
