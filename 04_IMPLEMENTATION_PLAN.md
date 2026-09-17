# 04 — Implementation Plan

## Phase 0 — Foundation

Deliver:
- repository structure
- engineering docs
- GitHub repo
- branch/PR conventions
- CI skeleton
- skills setup
- MCP setup
- security baseline
- progress/checkpoint system
- environment audit
- TestSprite MCP setup

Exit:
- fresh agent can read docs and continue;
- CI runs;
- no secrets committed.

## Phase 1 — Website foundation

Build:
- landing
- features
- pricing
- FAQ
- download
- privacy
- terms
- refund/cancellation
- contact/support
- responsive layout
- shadcn design system
- Umami

Exit:
- legitimate public website;
- analytics events contain no private dictation data;
- accessibility baseline passes.

## Phase 2 — Auth/account/backend

Build:
- Supabase Auth
- profile
- entitlement schema
- devices
- sessions
- RLS
- role model
- password reset/change
- logout
- user dashboard
- admin dashboard
- admin metrics

Exit:
- user cannot access another user's data;
- non-admin cannot access admin routes/data;
- RLS/security tests pass.

## Phase 3 — Desktop foundation (Handy audit/adapt)

Audit and adapt:
- Handy codebase provenance and licensing review
- Handy architecture audit (Tauri/Rust/React)
- Fork/rebase Handy as Soravo desktop foundation
- Replace Handy branding with Soravo branding
- Adapt Handy IPC/events for Soravo requirements
- Single instance management
- Settings framework adaptation
- Account/entitlement UI integration points
- Diagnostics adaptation

Exit:
- Handy foundation integrated as Soravo desktop shell;
- all Handy branding replaced;
- provenance/licensing documented;
- Soravo spec compliance verified against Handy foundation.

## Phase 4 — Audio

Build:
- warm capture
- ring buffer
- timestamps
- pre-roll
- device selection
- device disconnect/reconnect
- VAD integration

Exit:
- first-word preservation;
- stable long-session capture;
- no blocking callback.

## Phase 5 — STT benchmark lab

Build benchmark harness first.

Candidates:
- Parakeet variants
- Whisper variants
- relevant runtime/backend options

Measure:
- first partial
- finalization
- real-time factor
- memory
- CPU/GPU
- WER/CER where suitable
- punctuation/capitalization
- stability
- packaging complexity
- platform compatibility

Exit:
- documented engine choice;
- ADR;
- reproducible benchmark.

## Phase 6 — Streaming/transcript

Build:
- engine adapter
- scheduler
- tentative/committed/final transcript
- session IDs
- ordering
- stabilization
- stale result rejection

Exit:
- no duplicate committed text;
- no old-session injection.

## Phase 7 — Hotkey + pill UX

Build:
- global hotkey
- recorder
- hold/toggle
- transactional replacement
- pill
- state animations

Exit:
- custom shortcut works;
- first phoneme preserved;
- UI state matches runtime state.

## Phase 8 — Typing

Build:
- native insertion
- clipboard fallback
- clipboard restoration
- common application QA

Exit:
- committed text reliably appears.

## Phase 9 — Model manager

Build:
- manifest
- download
- checksum
- atomic install
- rollback
- model selection

Exit:
- corrupted download never becomes active.

## Phase 10 — Settings/history/vocabulary

Build:
- microphone
- hotkey
- model
- language
- history
- vocabulary
- privacy
- diagnostics

Exit:
- settings persist;
- migrations work.

## Phase 11 — Payments/licensing

Build:
- Razorpay server integration
- webhook verification
- idempotency
- entitlement
- signed entitlement
- device activation
- offline entitlement cache

Exit:
- sandbox payment lifecycle passes;
- no secret in client;
- revoked entitlement behavior defined.

## Phase 12 — Release engineering

Build:
- macOS package
- Windows package
- GitHub Releases
- checksums
- update path
- CI artifacts
- release notes
- fresh-machine tests

Exit:
- install from a clean machine.

## Phase 13 — Security hardening

Run:
- dependency audit
- secret scan
- static analysis
- SQL/RLS review
- auth review
- Tauri capability review
- CSP review
- MCP permission audit
- TestSprite
- adversarial tests

Exit:
- no unresolved P0/P1 security issue.

## Phase 14 — Performance hardening

Run:
- latency benchmark
- long dictation
- CPU/RAM soak
- device reconnect
- startup
- model load

Exit:
- target metrics documented.

## Phase 15 — Release candidate

Run:
- complete test suite
- TestSprite full sweep
- security review
- website review
- payment sandbox verification
- account/dashboard review
- release package validation

Exit:
- release checklist green.
