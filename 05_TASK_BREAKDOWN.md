# 05 — Atomic Task Breakdown

Each task follows:
branch → implement → test → security review → QA → docs → progress → commit → push → PR.

## FOUNDATION

- FOUNDATION-001 repository/bootstrap
- FOUNDATION-002 engineering docs and ADR structure
- FOUNDATION-003 CI and code quality
- FOUNDATION-004 environment audit
- FOUNDATION-005 skills.sh installation/registry
- FOUNDATION-006 MCP setup and permission policy
- FOUNDATION-007 TestSprite MCP setup
- FOUNDATION-008 checkpoint/progress automation

## WEBSITE

- WEB-001 site shell
- WEB-002 shadcn design system
- WEB-003 landing/features
- WEB-004 pricing/download/FAQ
- WEB-005 legal/support pages
- WEB-006 Umami integration
- WEB-007 accessibility/performance
- WEB-008 account dashboard
- WEB-009 admin dashboard
- WEB-010 dashboard E2E tests

## CLOUD

- CLOUD-001 Supabase project integration
- CLOUD-002 auth/profile
- CLOUD-003 RLS policies
- CLOUD-004 entitlement schema
- CLOUD-005 devices/sessions
- CLOUD-006 admin role/authorization
- CLOUD-007 product metrics queries
- CLOUD-008 session/password flows
- CLOUD-009 payment service skeleton
- CLOUD-010 Razorpay verification
- CLOUD-011 webhook/idempotency
- CLOUD-012 signed entitlement

## DESKTOP

- DESKTOP-001 Tauri v2 bootstrap
- DESKTOP-002 React/shadcn shell
- DESKTOP-003 typed IPC/events
- DESKTOP-004 single instance
- DESKTOP-005 settings framework
- DESKTOP-006 account/entitlement UI
- DESKTOP-007 diagnostics

## AUDIO

- AUDIO-001 capture abstraction
- AUDIO-002 warm capture
- AUDIO-003 ring buffer
- AUDIO-004 pre-roll
- AUDIO-005 VAD
- AUDIO-006 device lifecycle
- AUDIO-007 audio benchmark harness

## STT

- STT-001 engine trait
- STT-002 benchmark dataset/harness
- STT-003 Parakeet adapter
- STT-004 Whisper adapter
- STT-005 scheduler
- STT-006 streaming/stability
- STT-007 model loading/unloading
- STT-008 benchmark report + ADR

## TRANSCRIPT

- TRANS-001 session IDs
- TRANS-002 tentative/committed state
- TRANS-003 stabilization
- TRANS-004 stale-result rejection
- TRANS-005 finalization
- TRANS-006 transcript tests

## HOTKEY/PILL

- HOTKEY-001 global hotkey abstraction
- HOTKEY-002 shortcut recorder
- HOTKEY-003 conflict validation
- HOTKEY-004 runtime replacement
- HOTKEY-005 hold-to-talk
- HOTKEY-006 toggle-to-talk
- PILL-001 state machine UI
- PILL-002 animations
- PILL-003 error state

## TYPING

- TYPE-001 native insertion
- TYPE-002 clipboard fallback
- TYPE-003 clipboard restoration
- TYPE-004 application compatibility matrix
- TYPE-005 injection tests

## MODELS

- MODEL-001 manifest schema
- MODEL-002 downloader
- MODEL-003 checksum verification
- MODEL-004 atomic install
- MODEL-005 rollback
- MODEL-006 model selection UI

## SETTINGS/HISTORY

- SETTINGS-001 persistence
- SETTINGS-002 migration
- SETTINGS-003 microphone settings
- SETTINGS-004 hotkey settings
- SETTINGS-005 model settings
- HISTORY-001 local storage
- HISTORY-002 deletion
- VOCAB-001 custom vocabulary

## RELEASE

- RELEASE-001 macOS CI
- RELEASE-002 Windows CI
- RELEASE-003 artifact checksums
- RELEASE-004 GitHub Release automation
- RELEASE-005 updater/rollback
- RELEASE-006 fresh-machine test
- RELEASE-007 release notes

## SECURITY

- SEC-001 secret scan
- SEC-002 dependency audit
- SEC-003 RLS review
- SEC-004 auth/session review
- SEC-005 SQL injection review
- SEC-006 XSS/CSRF review
- SEC-007 Tauri capability review
- SEC-008 CSP review
- SEC-009 MCP permission review
- SEC-010 supply-chain review
- SEC-011 TestSprite security-focused run
- SEC-012 final threat-model review

## QA

- QA-001 unit suite
- QA-002 integration suite
- QA-003 website E2E
- QA-004 desktop smoke
- QA-005 TestSprite diff runs
- QA-006 TestSprite release run
- QA-007 performance
- QA-008 long-session soak
- QA-009 device reconnect
- QA-010 payment sandbox
- QA-011 account/session tests
- QA-012 admin authorization tests
