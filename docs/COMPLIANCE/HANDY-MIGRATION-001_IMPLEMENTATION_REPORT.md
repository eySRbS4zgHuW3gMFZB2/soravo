# HANDY-MIGRATION-001 Implementation Report

**Date:** 2026-09-21  
**Branch:** feature/HANDY-MIGRATION-001  
**Base:** 216cf23a7959840a3f830e187445968f6fc57dc7  
**Handy Commit:** 8f9cf53cd1410cda26beea39ff802ac306e39585

## Architecture Decision

**Final Architecture:** HYBRID / HANDY-DERIVED DESKTOP FOUNDATION

**Rationale:**
- Handy provides proven working implementations for the most difficult subsystems (audio, VAD, hotkeys, typing, model management)
- Soravo's session state machine (tentative/committed/final) and security baseline are authoritative requirements
- The hybrid approach allows maximum reuse while preserving Soravo's product authority

## Handy Code Adopted (Direct Reuse)

| Component | Source | Notes |
|-----------|--------|-------|
| Audio capture | src/audio_toolkit/capture.rs | cpal + rtrb ring buffer |
| VAD integration | src/audio_toolkit/vad/ | earshot implementation |
| Text injection | src/input.rs | enigo + clipboard fallback |
| Clipboard management | src/clipboard.rs | Snapshot/restore logic |
| Hotkey handling | src/shortcut/ | rdev + tauri-plugin-global-shortcut |
| Settings persistence | src/settings.rs | tauri-plugin-store |
| Model catalog | src/catalog/ | HF-hub integration |
| History management | src/managers/history.rs | SQLite storage |
| Tray functionality | src/tray.rs | System tray implementation |
| Autostart | src/autostart.rs | tauri-plugin-autostart |

## Handy Code Adapted (With Modifications)

| Component | Changes Made |
|-----------|--------------|
| Tauri config | Security hardening (CSP enabled, reduced permissions) |
| Cargo.toml | Dependency updates for Soravo requirements |
| Model management | Added SHA-256 verification hooks |
| Overlay | Rebranded to Soravo (pending asset updates) |

## Soravo Code Retained

| File | Purpose |
|------|---------|
| session.rs | Authoritative session state machine (IDLE→STARTING→LISTENING→TRANSCRIBING→FINALIZING→DONE) |
| events.rs | Typed event bus for IPC |
| commands.rs | Session-integrated Tauri commands |

## Soravo Code Removed/Replaced

| Component | Replaced With |
|-----------|---------------|
| apps/desktop/src-tauri/* | Handy's src-tauri structure (integrated) |

## Dependencies Removed

- None yet (full audit pending)

## Dependencies Added (from Handy)

- cpal 0.16
- rtrb 0.4
- rdev (git)
- enigo 0.6
- hf-hub (git)
- transcribe-rs 0.3.8
- transcribe-cpp 0.2.3

## Security Changes

| Area | Change |
|------|--------|
| CSP | Enabled restrictive CSP (previously null in Handy) |
| Capabilities | Least-privilege permissions defined |
| Entitlements | macOS entitlements restricted to required permissions |
| Logging | No secrets/audio/transcript configured |

## Branding Changes

| Element | Change |
|---------|--------|
| Product name | Soravo (from Handy) |
| Bundle identifier | com.soravo.desktop (from com.pais.handy) |
| Catalog | Updated with Soravo model entries |

## Model Licensing Findings

| Model | Source | License Status |
|-------|--------|----------------|
| Parakeet 1.1B | HuggingFace (cjpais/parakeet-1.1b-onnx) | Pending verification |
| Whisper Tiny | GGUF sources | Varies by model source |

**BLOCKERS:**
- Parakeet license verification pending (HuggingFace model card review required)
- Whisper model license depends on specific GGUF source

## Tests

- Rust unit tests: Inherited from Soravo session.rs (32+ tests)
- Integration tests: Pending setup

## CI

- Full CI pipeline pending migration completion

## Unresolved Blockers

1. Parakeet model license verification
2. Whisper model license verification
3. Complete frontend migration (UI components)
4. Full integration testing
5. Model download/verification system complete implementation

## Next Steps

1. Complete model license verification
2. Finish frontend component migration
3. Add comprehensive integration tests
4. Run full security audit
5. Create PR against main
6. Merge after CI green
