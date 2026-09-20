# 15 — Handy Reuse Policy

**Version:** 3.1.0  
**Status:** Authoritative  
**Date:** 2026-09-21

---

## 1. Purpose

This document defines Soravo's authoritative strategy for using Handy as the desktop application foundation. It replaces the older "port selected components" approach with a clear **derive/fork/rebrand** strategy.

Soravo is the product and architectural authority. Handy provides a proven desktop implementation that Soravo may use, modify, or replace as required.

---

## 2. Current Handy-Derived Strategy

**SORAVO USES HANDY AS THE DESKTOP FOUNDATION, DERIVES/FORKS IT, REBRANDS IT AS SORAVO, AND MODIFIES/REPLACES/EXTENDS IT WHERE SORAVO REQUIREMENTS DIFFER.**

This means:
- Handy provides the proven desktop foundation (Tauri/Rust/React)
- Soravo becomes the product and architectural authority
- Handy implementation is retained wherever compatible and useful
- Redundant Soravo implementations are removed rather than maintaining duplicate stacks
- Soravo-owned contracts override Handy behavior where required

---

## 3. What "Fork/Derive Handy" Means for Soravo

**Derivation** means:
1. Using Handy's codebase as the implementation foundation for generic desktop functionality
2. Retaining compatibility with Handy's architecture where it serves Soravo
3. Modifying or replacing any Handy code that conflicts with Soravo requirements
4. Not automatically pulling future upstream Handy changes
5. Maintaining full Soravo authority over the resulting application

This is NOT:
- A blind fork that discards Handy's architecture
- A component-by-component port without architectural coherence
- An assumption that Handy's product decisions apply to Soravo

---

## 4. What Remains from Handy

Handy implementation is retained where:
- It provides compatible desktop functionality (Tauri shell, Rust core, React frontend)
- It does not conflict with Soravo requirements
- It meets Soravo security, privacy, and licensing standards

Typical Handy-derived subsystems:
- Tauri desktop shell
- Rust application structure and tooling
- React/TypeScript UI foundation
- Audio capture and processing infrastructure
- VAD (Voice Activity Detection)
- Model management infrastructure
- Transcription manager
- Settings storage
- History management
- Overlay/pill UI
- System tray
- Global hotkeys/shortcuts
- Clipboard operations
- Input/typing integration

---

## 5. What Soravo Owns

Soravo owns these requirements and contracts regardless of implementation choice:

- Product requirements and specifications
- Session semantics (state machine: IDLE→STARTING→LISTENING→TRANSCRIBING→FINALIZING→DONE→IDLE)
- Transcript semantics (tentative/committed/final)
- IPC/event contracts
- Security baseline (CSP, capabilities, secrets policy)
- Privacy requirements (no desktop telemetry, no cloud STT)
- Account/auth architecture
- Supabase integration
- Entitlement architecture
- Licensing and Razorpay payment integration
- Model manifest and provenance
- Checksum policy
- Benchmark methodology
- Release policy
- Soravo branding/UX decisions
- Commercial/legal decisions

**Handy implementation cannot override Soravo requirements.**

---

## 6. Rebranding Requirements

**All branding must be Soravo throughout.**

Do not redistribute:
- Handy name
- Handy logo
- Handy icon
- Handy brand assets
- Any Handy-specific visual identity

Replace in all user-facing contexts:
- Product name (Handy → Soravo)
- Window titles
- Tray tooltips
- User-Agent headers
- About dialogs
- Error messages
- Documentation and help content

**Where legal interpretation is uncertain, obtain legal review before proceeding.**

---

## 7. Handy Code Licensing

Handy source code is MIT licensed. Soravo must:
- Retain copyright notices in reused code
- Preserve MIT license text where required
- Document all reused files/modules in migration records
- Verify license compatibility before integration

**The MIT license covers source code only—not model weights, assets, trademarks, or proprietary data.**

---

## 8. Handy Trademarks and Brand Assets

Handy trademarks (name, logo, icon, brand assets) are NOT Soravo property.

Do not:
- Use Handy trademarks as Soravo branding
- Imply Handy endorsement of Soravo
- Redistribute Handy brand assets under Soravo's name

**Legal review required** for any ambiguous cases regarding:
- Attribution requirements
- Third-party assets that may carry separate licenses
- Trademark fair use boundaries

---

## 9. Third-Party Dependency Licensing

Handy is MIT, but its dependencies (Rust crates, npm packages, system libraries) have separate licenses.

Required process:
1. Audit all direct and transitive dependencies
2. Record exact versions
3. Review each dependency's license
4. Verify commercial compatibility
5. Document attribution requirements
6. Flag copyleft or restrictive licenses

**Unknown or incompatible licenses must be resolved before release.**

---

## 10. Model Licensing and Provenance

**Software license ≠ Model license.**

Each model Soravo supports must be independently verified:
- Publisher and upstream source
- Exact artifact and version
- License terms (commercial use, redistribution, attribution)
- Hosting and distribution rights
- Checksum and provenance documentation

**Unknown licensing = BLOCKED.** Do not assume:
- Handy's MIT license covers model weights
- Handy-hosted models are automatically redistributable

---

## 11. When Handy Code Should Be Retained

Retain Handy code when:
- It provides compatible desktop functionality
- It meets Soravo security standards
- It does not conflict with Soravo product requirements
- Replacing it would not provide clear architectural or performance benefit
- Licensing allows reuse

**Benchmark before replacing:** measure actual performance before rejecting working implementations.

---

## 12. When Handy Code Should Be Modified

Modify Handy code when:
- Interfaces need adaptation to Soravo contracts
- Branding changes are required
- Security controls need hardening
- Configuration needs to match Soravo requirements
- Soravo session/state semantics need integration

**All modifications must be documented.**

---

## 13. When Handy Code Should Be Replaced

Replace Handy code when:
- It conflicts with explicit Soravo requirements
- Security review identifies unacceptable risks
- Licensing prevents use
- Soravo-specific functionality is required (e.g., Supabase integration, payment flows)
- Benchmarks show clear benefit to alternative implementation

---

## 14. When Redundant Soravo Code Should Be Deleted

Delete redundant Soravo code when:
- A compatible Handy implementation is adopted
- Consumers have been migrated
- Tests pass
- The change is documented in the migration record

**Do NOT maintain parallel implementations without a documented ADR.**

---

## 15. Soravo-Owned Contracts That Override Handy

These Soravo requirements must be enforced even when using Handy infrastructure:

- Session state machine semantics
- Transcript state semantics (tentative/committed/final)
- IPC/event message contracts
- Security policies (CSP, capability restrictions, secrets handling)
- Privacy requirements (no telemetry, no cloud STT)
- Model provenance and verification requirements
- Account/entitlement/payout architecture
- Branding and UX standards

**Handy defaults that conflict with these requirements must be overridden.**

---

## 16. Security Requirements After Derivation

All reused Handy code must:
- Pass Soravo security baseline
- Use least-privilege Tauri capabilities
- Enforce explicit, restrictive CSP
- Avoid hard-coded secrets
- Support proper error handling
- Be reviewed for injection, privilege escalation, and data exposure risks

**Security requirements override Handy defaults.**

---

## 17. Upstream Handy Update Policy

**Future Handy upstream changes are not automatically pulled in.**

Manual evaluation required for:
- Security patches
- Bug fixes
- New features
- Breaking changes

Assessment criteria:
- Does the change align with Soravo architecture?
- Does it meet Soravo security requirements?
- Is it licensed for Soravo use?
- Does it provide clear benefit?

---

## 18. Avoiding Duplicate and Frankenstein Architecture

**Do NOT:**
- Build generic desktop systems from scratch before inspecting Handy
- Maintain parallel audio/VAD/hotkey/typing/overlay implementations
- Preserve redundant code merely because it exists
- Merge incompatible architectures without an ADR

**DO:**
- Inspect existing Handy implementation before creating new code
- Reuse/adapt where compatible
- Delete redundant implementations after migration
- Document all architectural decisions

---

## 19. Verification Checklist for Every Derived Subsystem

For each Handy-derived subsystem, verify:

- [ ] Hand source inspected (exact files read)
- [ ] Reuse decision documented (REUSE/ADAPT/REPLACE/NEW)
- [ ] Security review completed
- [ ] Licensing verified (code + dependencies + models if applicable)
- [ ] Branding replaced with Soravo
- [ ] Soravo contracts integrated (session, IPC, events)
- [ ] Tests pass
- [ ] Migration documented
- [ ] Redundant Soravo code deleted (if applicable)

---

## 20. Required Task Reporting

Every implementation task touching Handy-derived code MUST record:

- **Handy source inspected:** exact files/modules/functions read
- **Exact files/modules/functions reused:** what was directly reused or adapted
- **Adaptations made:** what was changed and why
- **Functionality implemented from scratch:** what was built new and why
- **Reason for any non-reuse:** explicit justification when Handy had equivalent code that was not reused

The statement "Handy code reused: None" is NOT acceptable without explicit justification.

---

## 21. Exit Strategy

Soravo must remain architecturally capable of replacing any Handy-derived subsystem.

If Handy upstream becomes unavailable or incompatible:
- Document affected subsystems
- Have fallback implementations or rebuild plans
- Ensure Soravo code is not tightly coupled to Handy internals

---

## 22. Authority Reminder

**Existing Soravo code has NO preservation priority over a superior compatible Handy implementation.**

If Handy provides working code that meets Soravo requirements, use it and delete the redundant Soravo code.

The Soravo specification remains authoritative—Handy is an implementation asset, not a requirement source.
