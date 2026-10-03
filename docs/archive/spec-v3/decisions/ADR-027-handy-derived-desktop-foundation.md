# ADR-027 — Adopt Handy-Derived Desktop Foundation for Soravo

Status: ACCEPTED
Date: 2026-09-21
Updated: 2026-09-21 (strategy clarified from "port components" to "fork/derive/rebrand")

---

## Context

Soravo had independently implemented partial desktop systems while Handy already provided mature working implementations. Building the same generic desktop functionality independently would duplicate effort and delay release.

The original strategy emphasized "porting selected Handy components." The current strategy is more comprehensive: **Handy is the desktop foundation, Soravo derives/forks it, rebrands it, and Soravo owns the product architecture.**

---

## Decision

**Use Handy's MIT-licensed codebase as the implementation foundation for generic desktop functionality.**

Soravo becomes the product and architectural authority. Handy provides a working desktop implementation that Soravo may retain, modify, or replace as required.

Soravo retains authoritative control over:
- Product requirements and specifications
- Session semantics (state machine)
- Transcript semantics (tentative/committed/final)
- IPC/event contracts
- Security baseline
- Privacy requirements
- Account and authentication architecture
- Supabase integration
- Entitlement and licensing architecture
- Payment (Razorpay) integration
- Model provenance and verification
- Benchmark methodology
- Release policy
- Soravo branding and UX decisions
- Commercial and legal decisions

---

## Strategy Clarification

**DERIVE/FORK/REBRAND** means:
1. Use Handy's codebase as the desktop implementation foundation
2. Retain compatible Handy implementations
3. Modify or replace any Handy code that conflicts with Soravo requirements
4. Rebrand all user-facing elements as Soravo
5. Not automatically pull upstream Handy changes
6. Maintain full Soravo authority over the resulting application

This is NOT:
- Blind preservation of all Handy code
- A component-by-component port without architectural coherence
- An assumption that Handy's product decisions apply to Soravo

---

## Alternatives Considered

1. **Continue building Soravo desktop independently** (rejected: duplicate effort, delays release)
2. **Full fork without Soravo requirements** (rejected: loses product authority)
3. **Handy-derived with Soravo contracts** (chosen: preserves efficiency while maintaining authority)

---

## Security Consequences

Handy's permissions/CSP cannot automatically be trusted. Security review remains mandatory before use:
- Verify least-privilege capabilities
- Ensure explicit, restrictive CSP
- Check for secret handling
- Review injection and privilege escalation risks
- Confirm privacy requirements (no telemetry, no cloud STT)

**Security requirements override Handy defaults.**

---

## License Consequences

**Software license ≠ Model license.**

Handy source is MIT licensed. Model licenses are independent and must be verified separately for each model:
- Publisher and upstream source
- License terms (commercial use, redistribution, attribution)
- Hosting and distribution rights
- Checksum and provenance

Third-party dependencies (Rust crates, npm packages, system libraries) also have separate licenses requiring review.

---

## Branding Consequences

**Handy name/logo/brand assets are not Soravo assets.**

All user-facing branding must be Soravo:
- Product name
- Window titles
- Tray tooltips
- User-Agent headers
- About dialogs
- Error messages
- Documentation

Handy trademarks must not imply Handy endorsement of Soravo.

---

## Migration Consequences

Some previously written Soravo desktop code may be deleted. Existing code remains in feature/HANDY-MIGRATION-001 for rollback during the transition period.

After migration:
- Handy-derived subsystems are adopted
- Soravo session/IPC contracts are integrated
- Redundant Soravo code is removed
- Branding is updated to Soravo
- Security baseline is enforced

---

## Consequences

- **Development efficiency:** Reuse mature implementations instead of rebuilding
- **Product authority:** Soravo retains control over requirements and contracts
- **Technical debt risk:** Must actively avoid duplicate implementations
- **Upstream dependency:** Manual evaluation required for Handy updates
- **Migration effort:** Some Soravo code will be deleted
- **Licensing burden:** Dependencies and models must be independently verified

---

## Rollback

If required, revert to feature/HANDY-MIGRATION-001 branch. Pre-migration Soravo desktop code remains available for manual reintegration.

The decision can be revisited if:
- Security review identifies unacceptable risks
- Licensing prevents use of required components
- Handy upstream becomes incompatible with Soravo requirements
