# ADR-027 — Adopt Handy-Derived Desktop Foundation for Soravo

Status: PROPOSED
Date: 2026-09-21

Context:
Soravo had independently implemented partial desktop systems while Handy already provided mature working implementations. Building the same generic desktop functionality independently would duplicate effort and delay release.

Decision:
Use Handy's MIT-licensed codebase as the implementation foundation for generic desktop functionality.

Soravo remains authoritative for:
- Product requirements
- Session semantics
- Transcript semantics
- IPC/event contracts
- Security
- Privacy
- Account
- Supabase
- Entitlements
- Licensing
- Payments
- Model provenance
- Benchmarks
- Release requirements
- Branding

Existing Soravo code does NOT receive preservation priority merely because it already exists. If Handy provides a compatible mature implementation, adopt it, migrate consumers, test it, and delete redundant Soravo implementation.

Alternatives:
1. Continue building Soravo desktop independently (rejected: duplicate effort)
2. Full fork of Handy without Soravo architecture (rejected: loses Soravo requirements)
3. Hybrid/Handy-derived architecture (chosen)

Security consequences:
Handy's permissions/CSP cannot automatically be trusted. Security review remains mandatory before use.

License consequences:
Handy software license and model licenses are separate. Model verification must be performed independently.

Branding consequences:
Handy name/logo/brand assets are not Soravo assets. Separate branding required.

Migration consequences:
Some previously written Soravo desktop code may be deleted. Existing code remains in feature/HANDY-MIGRATION-001 for rollback.

Rollback:
If required, revert to feature/HANDY-MIGRATION-001 branch. Pre-migration Soravo desktop code remains available for manual reintegration.
