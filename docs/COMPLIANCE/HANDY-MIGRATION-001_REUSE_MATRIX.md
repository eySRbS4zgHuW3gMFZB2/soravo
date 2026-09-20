# HANDY-MIGRATION-001 Reuse Matrix

**Date:** 2026-09-21  
**Migration Branch:** feature/HANDY-MIGRATION-001  
**Origin Main:** 216cf23a7959840a3f830e187445968f6fc57dc7  
**Handy Commit:** 8f9cf53cd1410cda26beea39ff802ac306e39585

## Classification Key

- **ADOPT**: Use Handy implementation directly
- **ADAPT**: Use Handy implementation with Soravo-specific modifications
- **KEEP**: Retain existing Soravo implementation
- **REPLACE**: Replace with new Soravo-specific implementation
- **REMOVE**: Delete as redundant
- **NEW**: Create new Soravo code

## Subsystem Reuse Decisions

| # | Subsystem | Decision | Rationale | Evidence |
|---|-----------|----------|-----------|----------|
| 1 | Tauri v2 shell | ADOPT | Soravo has partial/empty impl | Handy src-tauri/tauri.conf.json fully configured |
| 2 | Rust Cargo structure | ADOPT | Soravo uses workspace crates; Handy has monolithic impl | Handy Cargo.toml shows complete dependency graph |
| 3 | React frontend | ADAPT | Soravo UI requirements differ | Handy src/ has complete App.tsx, components |
| 4 | Audio capture | ADOPT | Soravo has no impl | Handy src/audio_toolkit/capture.rs |
| 5 | Pre-roll buffer | ADOPT | Soravo has no impl | Handy src/audio_toolkit/ |
| 6 | VAD | ADOPT | Soravo has no impl | Handy src/audio_toolkit/vad.rs (earshot) |
| 7 | Hotkeys | ADAPT | Handy needs Soravo hotkey config | Handy src/shortcut/ |
| 8 | Text injection | ADOPT | Soravo has no impl | Handy src/clipboard.rs + src/input.rs (enigo) |
| 9 | Settings persistence | ADOPT | Soravo has no impl | Handy src/settings.rs (tauri-plugin-store) |
| 10 | Model catalog | ADOPT | Soravo has no impl | Handy src/catalog/ |
| 11 | Model downloader | ADAPT | Add SHA-256 verification | Handy src/lib.rs (hf-hub) |
| 12 | Model manifest | NEW | Soravo-specific requirements | Requires SHA-256, license, platform fields |
| 13 | Model verification | ADAPT | Add SHA-256 enforcement | Partial in Handy, needs enhancement |
| 14 | Whisper support | ADOPT | transcribe-cpp integration | Handy depends on transcribe-cpp |
| 15 | Parakeet support | ADOPT | transcribe-rs integration | Handy depends on transcribe-rs |
| 16 | Model lifecycle | ADOPT | Handy has ModelManager | Handy src/managers/model_manager.rs |
| 17 | Overlay/pill | ADAPT | Rebrand to Soravo | Handy src/overlay.rs |
| 18 | History | ADOPT | Handy has HistoryManager | Handy src/managers/history_manager.rs |
| 19 | Clipboard fallback | ADOPT | Handy has paste_tx | Handy src/paste_tx/ |
| 20 | Typing engine | ADOPT | Handy uses enigo | Handy src/input.rs |
| 21 | Audio feedback | ADOPT | Handy has implementation | Handy src/audio_feedback.rs |
| 22 | Tray | ADOPT | Handy has implementation | Handy src/tray.rs |
| 23 | Autostart | ADOPT | tauri-plugin-autostart | Handy src/autostart.rs |
| 24 | Updater | ADAPT | Needs Soravo metadata | Handy uses tauri-plugin-updater |
| 25 | Logging | ADAPT | Ensure no secrets | Handy uses tauri-plugin-log |
| 26 | i18n | REPLACE | Replace with Soravo localization | Handy uses i18next |
| 27 | Tauri capabilities | REPLACE | Must tighten to Soravo baseline | Handy has broad permissions |
| 28 | Typed IPC | REPLACE | Soravo uses plain serde + TS mirrors | Handy uses tauri-specta (rc pins) |
| 29 | Transcript state machine | REPLACE | Soravo tentative/committed/final required | Handy has different model |
| 30 | Session IDs | ADAPT | Verify session/sequence semantics | Handy src/transcription_coordinator.rs |
| 31 | Model UI | ADAPT | Rebrand to Soravo | Handy src/components/model/ |
| 32 | Settings UI | ADAPT | Rebrand to Soravo | Handy src/components/settings/ |
| 33 | macOS platform | ADOPT | Verified working | Handy src/overlay.rs (nspanel) |
| 34 | Windows platform | ADOPT | Verified working | Handy src-tauri/Windows-specific code |
| 35 | Linux platform | DEFER | Linux is dev/CI target only | Handy supports gtk-layer-shell |
| 36 | Security/CAPability model | REPLACE | Must enforce Soravo security baseline | Handy has broad permissions |
| 37 | Logging audit | ADAPT | Ensure no transcript/audio secrets | Handy logging enabled |
| 38 | Test coverage | ADAPT | Integrate Soravo test requirements | Handy has Playwright + unit tests |

## Files to Replace (Handy → Soravo)

| File | Action |
|------|--------|
| apps/desktop/src-tauri/Cargo.toml | REPLACE |
| apps/desktop/src-tauri/tauri.conf.json | REPLACE |
| apps/desktop/src-tauri/src/*.rs | REPLACE (except session.rs, events.rs) |
| apps/desktop/src-tauri/src/audio_toolkit/* | REPLACE |
| apps/desktop/src-tauri/src/commands/* | REPLACE |
| apps/desktop/src-tauri/src/managers/* | REPLACE |
| apps/desktop/src/ | ADAPT (merge with Soravo UI) |
| apps/desktop/package.json | ADAPT |

## Files to Retain (Soravo-specific)

| File | Reason |
|------|--------|
| apps/desktop/src-tauri/src/session.rs | Session state machine (IDLE→STARTING→LISTENING→TRANSCRIBING→FINALIZING→DONE) |
| apps/desktop/src-tauri/src/events.rs | Typed event bus |
| apps/desktop/src-tauri/src/commands.rs | Soravo command structure |
| All Supabase/account/licensing code | Independent of desktop |
| Supabase schema/migrations | Independent |
| services/license-api/ | Independent |

## Security Hardening Required

| Area | Change |
|------|--------|
| CSP | Enable restrictive CSP (currently null in Handy) |
| Capabilities | Limit fs scope, add network allowlist |
| Model Downloads | Add SHA-256 verification |
| Model Install | Implement atomic replace + rollback |
| IPC | Remove tauri-specta (rc pins), use serde + TS mirrors |
| Logging | Verify no secrets/audio/transcript logged |

## Unresolved Items

- [ ] Parakeet license verification (HuggingFace model card)
- [ ] Whisper model license (depends on specific model source)
- [ ] Model manifest system design (SHA-256, license, platform fields)
- [ ] Model catalog integration with Supabase entitlement system
- [ ] Final branding assets (icons, product name)
