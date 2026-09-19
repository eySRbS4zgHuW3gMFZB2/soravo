# Next Tasks

## Completed
- **TASK 1.3** — Hotkey + pill UX (HOTKEY-001 through HOTKEY-006, PILL-001 through PILL-003)
- **TYPE-001** — Native text insertion (`crates/typing/`, `TextInserter`/`NativeInserter`/`MockInserter`/`Injector`, 17 tests) via `feature/type-001-native-insertion`

## Ready to Start
- **TASK 1.4** — Audio capture (AUDIO-001 through AUDIO-007)
- **TYPE-002** — Clipboard/paste fallback (clipboard snapshot, write dictated text, paste, restore original clipboard when safe, report failure) — same `TextInserter` trait
- **TYPE-003** — Clipboard restoration hardening

### Skills to load on resume
- rust-engineer, tauri-development, tauri, security-guidance, supply-chain-risk-auditor (already loaded/read for TYPE-001)
- For TYPE-002 clipboard work: also consider web-perf/semgrep only if scanning; core Rust + security-guidance mandatory

### Prerequisites for Task 1.4
- Desktop shell is ready with session machine
- Hotkey infrastructure is in place (awaiting actual listener)
- Audio crate structure exists (`crates/audio/`)

## Implementation Notes
Task 1.3 was implemented in parallel worktree `phase1/task1.3-hotkeys`. The main repository now contains the implementation.
