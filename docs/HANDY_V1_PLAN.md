# Soravo V1 — Handy-Based Desktop Foundation (Plan)

- **Plan identity:** `soravo-Soravo_V1___Handy-Based_Desktop_Foundation`
- **Effective spec:** `.swarm/spec.md` (25 FR-### requirements, 0 uncovered)
- **Status:** approved for planning; implementation not started. This session performed planning only.

## Strategy
Soravo V1 = Handy desktop (github.com/cjpais/Handy, MIT code, Tauri v2 + Rust core + React/TS) as the primary technical foundation, rebranded/redesigned/adapted to Soravo. PRD `/TDD` = WHAT; `SORAVO_HANDY_CODE_REUSE_REPORT.md` = HOW. Old generic plan superseded (ADR-026).

## Scope guards (V1)
- Local-first: no cloud STT, no meeting transcription/diarization/collaboration, no cloud transcript sync, no RAG, no AI assistant chat, no mobile, no unnecessary engine zoo, no infrastructure sprawl.
- FluidVoice/Core ML: **deferred** — `SORAVO_HANDY_FLUIDVOICE_FLUIDAUDIO_COMBINED_AUDIT.md` is absent from the repo, so no V1 commitment. Parakeet (primary) + Whisper (fallback) only; benchmark-gated.

## Execution profile (bound with user)
- `parallelization_enabled: true`, `max_concurrent_tasks: 3`, disjoint scope lanes (scoped_allow)
- `commit_after_each_completed_task: false` (phase-boundary commits)
- `auto_proceed: true`
- Plan doc via PR, merged with normal (non-destructive, non-squash) merge.

## QA gates (bound with user)
`reviewer`, `test_engineer`, `sme_enabled`, `sast_enabled`, `drift_check` (default on). Off: critic_pre_plan, council_mode, hallucination_guard, mutation_test, phase_council, final_council.

## Phases & tasks

| Task | Title | Reuse | Depends | Gates |
|---|---|---|---|---|
| 1.1 | Pin + port Handy Tauri v2 core into `apps/desktop`, rebrand to `com.soravo.*`; record ADR-026 note | directly_reused | — | cargo build + tauri build; platform matrix (FR-008) |
| 1.2 | Dependency/license/network audit; strip telemetry; pin versions; docs/security baseline | adapted | 1.1 | grep-verifiable zero telemetry/hidden HTTP |
| 2.1 | `crates/audio`: cpal RT-safe callback, ~300ms pre-roll ring buffer, warm capture, device lifecycle | adapted | 1.1 | warm<50ms; finalize<500ms |
| 2.2 | `crates/vad`: VAD gates recognition, never capture | directly_reused | 2.1 | unit tests; no capture blocking |
| 2.3 | `crates/hotkeys`: hold+toggle, Escape, transactional replace, warm trigger | adapted | 2.1 | macOS/Windows/Linux; no audio deadlock |
| 3.1 | Transcript stabilization state machine (tentative/committed/final); stale-seq rejection; commit-only injection | newly_implemented | 2.2 | FR-203/204 state tests |
| 3.2 | Text injection: native + clipboard snapshot-restore fallback; <50ms | adapted | 3.1 | clipboard restored on failure; commit/final only |
| 3.3 | Floating pill UI (7 states) + controls, React/TS/shadcn; no Handy UI | replaced | 3.1 | component tests; a11y |
| 4.1 | `crates/models` + `crates/stt`: model manager (SHA-256 manifest, atomic install, rollback); Parakeet+Whisper via SpeechEngine | adapted | 2.2 | FR-206 checksum/corrupt/rollback tests |
| 4.2 | Settings + local history + vocabulary (local-only, no sync/telemetry) | adapted | 4.1 | FR-003 offline-first; no telemetry |
| 4.3 | STT benchmark lab (protocol §12): Parakeet vs Whisper; WER/RTF/latency/stability; no perf claims before measurement | adapted | 4.1 | reproducible report → `progress/BENCHMARKS.md` |
| 5.1 | `services/license-api`: Razorpay adapter (server price authority, createOrder, verify, idempotent webhook, signed entitlement + offline cache); no secrets in client | newly_implemented | 3.2 | ADR-024 41 Vitest incl. structural checks |
| 5.2 | Supabase entitlements + RLS (service_role-only writes) + server-side admin RBAC + user directory | newly_implemented | 5.1 | RLS assertions; no client service-role |
| 6.1 | Release: Soravo branding, code-sign macOS/Windows, Tauri updater, GitHub Release + checksums | adapted/replaced | 4.2, 5.2 | artifacts sign+verify; branding grep clean |
| 6.2 | Security hardening: strict CSP, least-privilege Tauri caps, typed IPC, no fs/process/network exposure, sanitized logging | adapted | 6.1 | SAST + secretscan clean |
| 6.3 | V1 acceptance: DoD gates (cargo check/clippy, frontend build, tests, security, >80% coverage), §11 perf targets, handoff docs | newly_implemented | 6.2 | all gates green; RC artifacts listed |

Reuse buckets used: directly_reused (1), adapted (9), replaced (1), newly_implemented (5).

## Rollback points
- After each phase: phase-boundary commit; `git revert`/branch reset available before next phase advances.
- Model manager keeps prior working model until activation verifies (FR-206).
- Updater retains prior app version until new build verifies (release runbook §13).

## Known notes
- `.swarm/` is git-excluded (`.git/info/exclude`); active plan lives there. This doc is the durable, reviewed tracking artifact.
- Old `.swarm` plan/ledger/evidence artifacts were NOT deletable via shell (guardrails `block_destructive_commands`), and `/swarm reset` is forbidden — the old **pending** plan was superseded atomically by this `save_plan` (new `plan.json`/`plan.md`); inert old files hold no execution authority.
- Supabase service-role / Razorpay secret / CF token / GitHub PAT / TestSprite key / signing creds must never be committed (FR-004/005, docs/14).