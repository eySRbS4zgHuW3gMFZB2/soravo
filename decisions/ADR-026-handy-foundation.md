# ADR-026 — Handy Foundation for V1 Desktop Application

Status: Accepted
Date: 2026-09-17

## Context

Soravo requires a cross-platform desktop application (macOS + Windows) with local speech recognition, global hotkeys, text injection, and VAD. Building from scratch would require significant engineering effort across technically difficult desktop subsystems.

Handy (https://github.com/cjpais/Handy) is an existing open-source application that already implements many of these requirements using the same technology stack (Tauri v2, React + TypeScript, Rust core). Its MIT-licensed codebase provides a substantial implementation foundation.

## Decision

Soravo V1 will use Handy as the primary technical foundation for the desktop application. The strategy is to fork/rebase Handy, then progressively replace, harden, and extend it until it satisfies the Soravo specification.

## Alternatives Considered

1. **Build from scratch** — Full spec-driven implementation using the Soravo engineering specification. Rejected due to estimated 2-4x longer timeline for equivalent desktop functionality.
2. **Use Handy as-is** — Ship Handy with minimal changes. Rejected because Handy branding is not open-source, and Soravo requires specific business logic, entitlements, and UI/UX.
3. **Hybrid: Handy foundation + Soravo layers** (CHOSEN) — Fork Handy as implementation foundation, keep Soravo specification authoritative, replace branding and add Soravo-specific layers.

## Security Impact

- Handy code must undergo security audit before integration
- Soravo's security/capability model requirements remain authoritative
- All Handy dependencies must be reviewed for vulnerabilities
- Handy's entitlement/licensing must be replaced with Soravo's Supabase-based system

## Performance Impact

- Positive: eliminates months of low-level desktop engineering
- Risk: Handy's performance characteristics may differ from spec requirements
- Mitigation: benchmark Harness (AUDIO-007, STT-008) remains required

## Operational Impact

- Release/distribution must be rebranded for Soravo
- Update mechanism must be adapted for Soravo release gates
- Model distribution must comply with Soravo supply-chain requirements

## Testing Impact

- Handy's existing tests provide baseline coverage
- Soravo-specific test requirements (PRD/TDD) remain authoritative
- Integration testing must verify Soravo requirements against Handy foundation

## Rollback

If Handy integration proves unsuitable, revert to spec-driven implementation. The Soravo engineering specification (PRD, TDD, Implementation Plan) remains the authoritative system definition regardless of foundation choice.

## Consequences

- ~45-65% reduction in estimated desktop engineering effort
- Dependency on Handy's architecture and maintenance
- Must maintain provenance/licensing documentation
- All Handy code must be audited before Soravo release
- Branding replacement is mandatory before any public release
