# Status

Current phase: Phase 6 — WEB-012 Cloudflare Pages DEPLOYMENT — **COMPLETE**. Site live at `https://soravo.xyz/` (production branch `main` → Pages project `soravo`), deployed via the repo-owned GitHub Actions pipeline after the owner supplied `CLOUDFLARE_API_TOKEN`. `origin/main` = `4f6d521`.
Current task: **TASK 1.3 COMPLETE** — Hotkey + pill UX implemented (HOTKEY-001 through HOTKEY-006, PILL-001 through PILL-003).

## Task 1.3 Implementation Summary

### Implemented Components
- **Hotkey Crate** (`crates/hotkeys/`): Platform-agnostic hotkey subsystem with cross-platform support for Windows and macOS
- **Hotkey Service** (`apps/desktop/src-tauri/src/hotkey.rs`): Tauri state management and IPC commands
- **Pill UI Component** (`apps/desktop/src/components/pill.tsx`): Floating status indicator with hold-to-talk and toggle-to-talk modes

### Changes Made
1. `crates/hotkeys/Cargo.toml` — New hotkey crate manifest
2. `crates/hotkeys/src/lib.rs` — Core hotkey types (KeyCode, Modifiers, HotkeyBinding, HotkeyConfig, InteractionMode, HotkeyResult)
3. `apps/desktop/src-tauri/Cargo.toml` — Added soravo-hotkeys dependency
4. `apps/desktop/src-tauri/src/hotkey.rs` — Hotkey state machine and Tauri commands
5. `apps/desktop/src-tauri/src/lib.rs` — Registered hotkey module and commands
6. `apps/desktop/src/ipc.ts` — Added hotkey IPC functions
7. `apps/desktop/src/components/pill.tsx` — Pill UI component
8. `apps/desktop/src/styles.css` — Added pill component styles
9. `apps/desktop/src/app.tsx` — Integrated pill component

### Tests & Checks
- `pnpm lint` ✓
- `pnpm typecheck` ✓
- `pnpm test` ✓ (8 tests passed)
- `cargo check --package soravo-hotkeys` ✓
- `cargo check --package soravo-desktop` ✓

### Next Steps
- Desktop foundation is ready for audio/STT integration
- Hotkey commands are wired but await actual hotkey listener implementation (platform-specific registration)
- Pill component renders UI states but is not yet connected to actual hotkey events

## Task TYPE-001 — Complete: Native Text Insertion (`crates/typing/`)

Implements the Soravo typing abstraction: committed/final-only committed text injection via native insertion (FR-203, FR-205, FR-207). Branch `feature/type-001-native-insertion`, merged via PR.

### Implemented
- `TextInserter` trait — platform abstraction for injecting text into the active application
- `NativeInserter` — enigo 0.6.1-backed native insertion (Windows, macOS, Linux/X11; lazy connection)
- `MockInserter` — deterministic test double
- `Injector` — committed/final-only gate: tentative never injected; duplicate, stale, late, out-of-order updates rejected; failures surfaced text-free

### Tests & Checks
- `cargo test -p soravo-typing` ✓ (17 tests)
- `cargo clippy -p soravo-typing --all-targets` ✓ (0 warnings)
- `cargo fmt --check -p soravo-typing` ✓
- `cargo check --workspace --exclude soravo-desktop` ✓
- `cargo test -p soravo-transcript` ✓ (6 tests, unchanged)
- secretscan on `crates/typing` ✓ no findings

### Notes
- `enigo = "=0.6.1"` (MIT, default X11 backend, pure-Rust, no system libraries; verified no known advisories)
- Clipboard/paste fallback and clipboard restoration deferred to TYPE-002 / TYPE-003
- Errors are text-free and never contain dictated text (FR-207)
- `soravo-desktop` not locally checkable (webkit2gtk-4.1 absent per `progress/ENVIRONMENT.md`)

(Last updated 2026-09-19, TYPE-001)