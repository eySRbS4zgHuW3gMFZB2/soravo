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

---

# Implementation Note — Phase 1 Task 1.1 (Handy Foundation Port)

Date: 2026-09-18

## Pinned upstream revision

- Repository: https://github.com/cjpais/Handy
- Pinned commit: `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (fetched from `origin` into `/tmp/handy` during Phase 1)
- License: MIT — Copyright (c) 2025 CJ Pais. Full text preserved in the upstream tree; Soravo complies with the MIT requirement to retain the copyright and permission notice in substantial portions of the code.

## Provenance

- The port is a **rebranded extraction**, not a git fork. No Handy git history or git dependencies were carried into the Soravo workspace; the pinned source tree is the only provenance reference.
- Handy-identifying strings (product name, `com.handy.*` bundle identifiers, upstream branding) were replaced. A `grep` sweep for the upstream identity is part of the task 1.1 verification.
- No telemetry or network-initiated behavior from upstream was ported into the Phase 1 shell.

## What was reused vs deferred

| Item | Disposition |
| --- | --- |
| Tauri v2 shell, build plumbing (tauri.conf, vite, capabilities) | **Directly reused** (task 1.1) |
| Rust core session state machine (TDD §6), typed event bus, IPC commands | **Reimplemented from the spec** — Handy has no such authoritative session machine; it was authored fresh in `session.rs`/`events.rs`/`commands.rs` with 13 unit tests |
| Global shortcuts, tray, autostart, updater, memory/portable, model manager, audio/VAD, hotkeys, transcript, typing, pill overlay | **Deferred** to Phases 2-4 per plan (2.1-2.3, 3.1-3.3, 4.1-4.2) |
| `tauri-specta` typed IPC (upstream uses `=2.0.0-rc.22` rc-pins) | **Not adopted** — plain serde payloads + typed TS mirrors avoid rc-pin churn and build complexity; satisfies the "typed events over the event bus" TDD acceptance |
| Linux `WEBKIT_DISABLE_DMABUF_RENDERER` env workaround | **Not ported** — the workspace forbids `unsafe` code (seed 2024 made `std::env::set_var` unsafe) and the ban takes precedence; Linux is a dev/CI target only per ADR-021 |

## Deviations from upstream pinned to this port

1. Workspace edition 2024 with `unsafe_code = "forbid"` and `unused_must_use = "deny"`: upstream's `unsafe` usage and edition 2021 Cargo.normal were not carried forward.
2. No `cjpais` git forks in the dependency graph; all Phase 1 deps come from crates.io (verified in task 1.2 audit).
3. License/worktree is Proprietary for Soravo code; upstream MIT terms continue to bind only the ported surface (shell/build plumbing).

## Release gates

The task 1.2 security/supply-chain audit builds the durable `docs/security/` baseline against this pinned revision before any upstream surface beyond the shell is integrated.
