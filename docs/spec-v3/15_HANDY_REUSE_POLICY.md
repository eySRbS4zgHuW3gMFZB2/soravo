# 15 — Handy Reuse Policy

**Version:** 3.0.0  
**Status:** Authoritative

---

## 1. Core Principle

**"DO NOT PRESERVE CODE MERELY BECAUSE SORAVO ALREADY IMPLEMENTED IT."**

If Handy provides a mature, compatible implementation, use Handy. Delete the redundant Soravo implementation after consumers are migrated and tests pass.

This is a deliberate architecture decision, not temporary technical debt.

---

## 2. Required Inspection Process

Before implementing any desktop feature:

1. **Locate first** — Find the equivalent Handy implementation in the pinned source tree
2. **Inspect the actual code** — Read the actual pinned source files, not merely their documentation
3. **Reuse if present** — Reuse or adapt the actual code wherever technically and legally compatible
4. **Adapt as needed** — Modify interfaces, branding, architecture boundaries, and security controls to meet Soravo specifications
5. **Document decisions** — Record what was reused, what was adapted, and what was built new

---

## 3. Reuse Categories

### 3.1 Direct Reuse

Use as-is with minimal changes:
- Tauri project structure
- Build configuration (where compatible)
- Platform-specific plumbing
- Existing Rust module organization (where compatible)
- Development scripts (where useful)

### 3.2 Adaptation Required

Keep core implementation, adapt to Soravo:
- audio_toolkit (adapt to pre-roll/warm requirements)
- VAD (coordinate with Soravo session state)
- Global shortcuts (adapt to hold/toggle modes)
- Typing/input (wrap in Soravo committed/final abstraction)
- Model manager (add Soravo manifest/checksum requirements)
- Settings (adapt to Soravo schema)
- History (apply Soravo privacy rules)
- Transcription manager (adapt to Soravo session semantics)

### 3.3 Replacement Required

Build Soravo-specific implementation:
- Account/entitlement architecture
- Supabase integration
- Razorpay integration
- Signed entitlements
- Device/session licensing
- Soravo UI/UX (replace all Handy branding)
- Model manifest and verification
- Release gates and quality standards

---

## 4. Forbidden Actions

### 4.1 Branding

Do not reuse:
- Handy name
- Handy logo
- Handy icon
- Handy brand assets
- Any Handy-specific visual identity

**Branding must be Soravo throughout.**

### 4.2 Product Assumptions

Do not inherit:
- Handy pricing assumptions
- Handy product positioning
- Handy feature priorities
- Handy analytics decisions
- Handy account model
- Handy licensing/business model
- Any Handy UX decisions simply because they exist

### 4.3 Parallel Implementations

Do NOT maintain duplicate implementations without a documented ADR.

If Handy provides working code and Soravo requirements are compatible, DELETE the redundant Soravo implementation after migration.

---

## 5. Required Task Reporting

Every implementation task that touches a subsystem with Handy-derived code MUST record in its completion report:

- **Handy source inspected:** exact files/modules/functions read
- **Exact files/modules/functions reused:** what was directly reused or adapted
- **Adaptations made:** what was changed and why
- **Functionality implemented from scratch:** what was built new and why
- **Reason for any non-reuse:** explicit justification when Handy had equivalent code that was not reused

The statement "Handy code reused: None" is NOT acceptable without explicit justification.

---

## 6. Security and Authority

- Reuse must never weaken Soravo's security, privacy, licensing, or architecture requirements
- The Soravo specification (PRD/TDD/AI Instructions) remains authoritative over Handy behavior
- The pinned Handy commit remains authoritative for all reused code
- All reused Handy code must pass Soravo security baseline

---

## 7. Licensing Requirements

### 7.1 Code License

Handy source is MIT licensed. Soravo must:
- Retain copyright notices
- Preserve MIT license text in substantial portions of code
- Document all reused files/modules

### 7.2 Model Licenses

**Handy MIT code license does NOT determine model licenses.**

Each model must be independently verified:
- Exact source and version
- License terms
- Commercial use rights
- Redistribution rights
- Hosting restrictions

---

## 8. Dependency Audit

Handy is MIT, but its dependencies are separate works with their own licenses.

Required process:
1. Identify all Rust and npm dependencies
2. Record exact versions
3. Review licenses
4. Verify commercial compatibility
5. Document attribution requirements

---

## 9. Benchmark Before Replacement

Do not rewrite working Handy-derived code merely because the architecture looks different.

First benchmark:
- Compare Handy-derived implementation against Soravo requirements
- Measure latency, resource usage, stability
- Only replace if benchmarks show clear benefit

---

## 10. Reuse Decision Matrix

| Subsystem | Action | Reason |
|---|---|---|
| Tauri shell | ADOPT | Architecture match |
| React frontend | ADOPT | Build foundation match |
| Rust core | ADOPT | Architecture match |
| Audio | ADAPT | Strong foundation, needs Soravo pre-roll/warm |
| VAD | REUSE | Compatible semantics |
| Hotkeys | ADAPT | Platform complexity, adapt to Soravo modes |
| Typing | ADAPT | Platform complexity, wrap in Soravo abstraction |
| Model manager | ADAPT | Useful foundation, add Soravo manifest |
| Settings | REUSE | Storage foundation |
| History | REUSE | Local foundation, add Soravo privacy |
| Transcription | ADAPT | Adapt to Soravo session semantics |
| Branding | REPLACE | Soravo identity |
| Entitlements | NEW | Soravo-specific |
| Supabase | NEW | Soravo-specific |
| Razorpay | NEW | Soravo-specific |

---

## 11. Migration Process

When replacing a Soravo implementation with Handy-derived code:

1. Identify all consumers of the Soravo implementation
2. Adapt the Handy code to Soravo requirements
3. Switch one consumer at a time
4. Run tests for each consumer
5. After all consumers migrated and tests pass, DELETE the Soravo implementation
6. Update documentation
7. Record in ADR if any reason exists to keep both temporarily

---

## 12. Exit Strategy

Soravo must remain architecturally capable of replacing any Handy-derived subsystem.

If Handy upstream becomes unavailable or incompatible:
- Document the affected subsystems
- Have fallback implementations or rebuild plans
- Ensure Soravo code is not tightly coupled to Handy internals

---

## 13. ADR Requirement

Create an ADR when:
- Handy implementation conflicts with explicit Soravo requirement
- Security requires replacement or hardening
- Licensing prevents reuse
- Platform differences genuinely require new code
- Deciding to keep both implementations temporarily

---

## 14. Authority Reminder

**Existing Soravo code has NO preservation priority over a superior compatible Handy implementation.**

If Handy provides working code that meets Soravo requirements, use it and delete the redundant Soravo code.

The Soravo specification remains authoritative—Handy is an implementation asset, not a requirement source.
