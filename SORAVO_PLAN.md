# Soravo — Authoritative Engineering Plan

> **Repository root authority document for Soravo engineering/product plan.**
> 
> **Read this before reading any other document.**

---

## 1. Status & Authority

**This document (`SORAVO_PLAN.md`) and `docs/spec-v3/` are the current authoritative Soravo plan.**

| Version | Status | Location | Authority |
|---|---|---|---|
| **V3** | **Authoritative** | `docs/spec-v3/` | **Implementation authority** |
| V2 | Historical / Superseded | `docs/spec-v2-archive/` | Traceability only |

**Rules:**
- Future AI agents MUST NOT use V2 as implementation authority.
- If V2 conflicts with V3, V3 wins.
- If this file conflicts with V3, the more specific V3 document governs.
- ADRs (`10_ADR_INDEX.md`) govern architectural decisions.
- Security requirements cannot be weakened by implementation convenience.

---

## 2. Product Definition

Soravo is a professional **local-first, FOSS speech-to-text desktop application**.

**Core goals:**
- Fast local transcription (no cloud STT)
- Professional-quality dictation
- Privacy-first operation (no desktop telemetry)
- No cloud STT/audio/transcript dependency
- macOS and Windows primary targets
- Linux: development/optional support per current V3 scope

---

## 3. Architecture: Handy-Derived Desktop Foundation

**Handy (MIT) is the implementation foundation for generic desktop functionality.**

Handy-derived systems (where compatible):
- Tauri desktop shell
- React/TypeScript desktop foundation
- Rust desktop foundation
- Audio capture & toolkit
- VAD (Voice Activity Detection)
- Shortcuts/hotkeys
- Typing/input
- Clipboard
- Overlay/pill
- Model management
- Transcription infrastructure
- Settings
- History
- Tray
- Related desktop plumbing

**Rule:** Soravo does NOT automatically preserve old independently-built implementations of these systems. If Handy provides a compatible mature implementation:
1. Inspect it
2. Reuse/adapt it
3. Migrate consumers
4. Test it
5. Delete redundant Soravo implementation

---

## 4. Soravo-Owned Contracts (Not Replaced by Handy)

Soravo owns these requirements and contracts regardless of implementation choice:

- Product requirements
- Session semantics (state machine)
- Transcript semantics (tentative/committed/final)
- IPC/event contracts
- Security baseline
- Privacy requirements
- Account/auth architecture
- Supabase integration
- Entitlement architecture
- Licensing
- Razorpay/payment architecture
- Model manifest
- Model provenance
- Checksum policy
- Benchmark methodology
- Release policy
- Soravo branding/UX decisions
- Commercial/legal decisions

**Handy implementation cannot override Soravo requirements.**

---

## 5. Session State Machine (Authoritative)

```
IDLE → STARTING → LISTENING → TRANSCRIBING → FINALIZING → DONE → IDLE
                                    ↓
                               ERROR → IDLE
```

**Transcript semantics:**
- tentative: UI only, never injected
- committed: stable, may be injected
- final: confirmed complete

**Rules:**
- tentative text is never typed
- only stable/committed/final text may be injected
- session_id is required
- sequence/revision handling is required
- stale results must be rejected
- cancellation must be safe
- errors must return to a safe state

---

## 6. Security Requirements (Non-Negotiable)

- Explicit restrictive CSP
- Least-privilege Tauri capabilities
- No desktop telemetry
- No cloud STT/audio/transcript endpoints
- No Supabase service-role secret in desktop
- No Razorpay secret in desktop
- No frontend secrets
- Secure model installation with checksum verification
- Safe archive extraction
- Atomic model installation (preserve previous working model on failure)
- Never execute arbitrary model contents
- Security requirements override Handy defaults

---

## 7. Model Policy

**SOFTWARE LICENSE ≠ MODEL LICENSE**

For every model Soravo supports, verify independently:
- Publisher
- Exact artifact
- Upstream source
- License (commercial use, redistribution, attribution)
- Hosting rights
- Checksum
- Provenance

**Unknown licensing = UNKNOWN/BLOCKED.**

Do not assume:
- Handy's MIT license covers model weights
- Handy-hosted models are automatically redistributable

---

## 8. Benchmark Policy

**Handy functionality is NOT proof of Soravo performance.**

No claims (fastest, lowest latency, highest accuracy, best model) without:
- The benchmark protocol (`12_BENCHMARK_PROTOCOL.md`)
- Actual measurements

Do not fabricate: WER, CER, latency, CPU, memory, GPU, stability metrics.

---

## 9. Current Project Status

| Area | Status | Authority |
|---|---|---|
| V3 Documentation | PR #56 merged (SHA: 2fa7f9bf8dca505e450bf16a63f20e4a2e5ffe64) | V3 |
| V2 Archive | Historical | docs/spec-v2-archive/ |
| Handy Desktop Foundation | Implemented on unmerged PR #55 | migration docs |
| Session/IPC | Implemented according to migration docs | V3 |
| Model Licensing | Partially verified / some blocked | model provenance doc |
| Benchmark | Infrastructure/plan, real benchmark pending | benchmark doc |
| Release | Not final | release docs |

**PR #55** remains OPEN with mixed documentation + Handy implementation work. Do NOT treat it as authoritative plan.

---

## 10. Implementation Priority (From V3)

1. V3 documentation authority
2. Handy migration stabilization
3. Model provenance/license verification
4. Soravo session/IPC integration verification
5. Security hardening
6. Full desktop build/test
7. Real STT benchmark
8. Account/entitlement/payment integration
9. Soravo product differentiation
10. Full QA/E2E
11. Release preparation
12. Release candidate

*Reconcile against V3's actual order in `04_IMPLEMENTATION_PLAN.md`.*

---

## 11. What NOT to Do

Future AI agents MUST NOT:
- Rebuild generic desktop systems from scratch before inspecting Handy
- Preserve redundant Soravo desktop code merely because it exists
- Create parallel audio/VAD/hotkey/typing/overlay implementations without an ADR
- Treat Handy branding as Soravo branding
- Assume Handy's MIT license covers model weights
- Assume Handy-hosted models are automatically redistributable
- Fabricate benchmark results
- Weaken Soravo security to match Handy
- Put secrets in the desktop app
- Add desktop telemetry
- Add cloud STT/audio/transcript storage
- Edit main directly
- Force-push
- Rewrite shared history
- Merge with failing required CI
- Claim work is complete without evidence

---

## 12. AI Agent Workflow

Every AI engineering session should:
1. Read `SORAVO_PLAN.md`
2. Read relevant V3 documents
3. Inspect actual repository state
4. Inspect relevant existing implementation
5. Inspect Handy implementation before creating generic desktop code
6. Inspect installed skills
7. Use required skills
8. Inspect relevant GitHub/MCP tooling
9. Create a short-lived feature branch
10. Make minimal scoped changes
11. Test
12. Inspect security
13. Update documentation/ADR when architecture changes
14. Open PR
15. Wait for required CI
16. Merge only when acceptance criteria and CI pass

---

## 13. Source of Truth Map

| Question | Authoritative Location |
|---|---|
| Current project plan | `SORAVO_PLAN.md` |
| Product requirements | `docs/spec-v3/01_PRD.md` |
| Architecture | `docs/spec-v3/02_ARCHITECTURE.md` |
| AI workflow | `docs/spec-v3/03_AI_INSTRUCTIONS.md` |
| Implementation order | `docs/spec-v3/04_IMPLEMENTATION_PLAN.md` |
| Tasks | `docs/spec-v3/05_TASK_BREAKDOWN.md` |
| DoD/QA | `docs/spec-v3/06_DOD_QA.md` |
| Skills | `docs/spec-v3/07_AI_SKILLS.md` |
| MCP/tooling | `docs/spec-v3/08_MCP_AND_AGENT_TOOLING.md` |
| Security | `docs/spec-v3/09_SECURITY_BASELINE.md` |
| ADRs | `docs/spec-v3/10_ADR_INDEX.md` |
| Interruption/handoff | `docs/spec-v3/11_INTERRUPTION_HANDOFF.md` |
| Benchmarks | `docs/spec-v3/12_BENCHMARK_PROTOCOL.md` |
| Release | `docs/spec-v3/13_RELEASE_RUNBOOK.md` |
| Environment/secrets | `docs/spec-v3/14_ENVIRONMENT_AND_SECRETS.md` |
| Handy reuse | `docs/spec-v3/15_HANDY_REUSE_POLICY.md` |
| Handy migration | `docs/spec-v3/16_HANDY_MIGRATION_STATUS.md` |
| Model provenance | `docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md` |
| Desktop architecture | `docs/spec-v3/18_DESKTOP_ARCHITECTURE.md` |
| Documentation governance | `docs/spec-v3/19_DOCUMENT_GOVERNANCE.md` |
| Manifest | `docs/spec-v3/SPEC_MANIFEST.json` |
| Historical V2 | `docs/spec-v2-archive/` |

---

## 14. Document Governance

- Architecture changes require ADR
- Implementation may diverge from Handy only when justified
- When architecture changes:
  - Update ADR
  - Update `SORAVO_PLAN.md` if needed
  - Update relevant V3 document
  - Update `SPEC_MANIFEST.json`

**Do not allow the plan and implementation to silently drift.**

---

*Generated: 2026-09-21*
*Base SHA: 2fa7f9bf8dca505e450bf16a63f20e4a2e5ffe64*
