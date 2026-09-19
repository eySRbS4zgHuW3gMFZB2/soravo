# TYPE-002/003 Handy Reuse Audit Report

**Date:** 2026-09-19
**Auditor:** OpenCode (mimo-v2.5-free)
**Branch:** `typing/clipboard-injection-002-003`
**PR:** #32

---

## 1. Handy Implementation Inspected

**Repository:** https://github.com/cjpais/Handy
**Pinned commit:** `ba10ce1943ef34e93c09494027fc0b9ced2e8a44`
**License:** MIT

### Files Examined

| File | Lines | Purpose |
|------|-------|---------|
| `src-tauri/src/clipboard.rs` | 1016 | Clipboard fallback: snapshot → write → paste chord → restore |
| `src-tauri/src/paste_tx/mod.rs` | ~200 | Receipt-sequenced clipboard restoration state machine |
| `src-tauri/src/paste_tx/macos.rs` | ~300 | macOS promise-based pasteboard with concealed types |
| `src-tauri/src/paste_tx/windows.rs` | ~625 | Windows delayed rendering clipboard |
| `src-tauri/src/input.rs` | ~300 | Layout-aware paste chord simulation (enigo-based) |

---

## 2. What Handy Already Implements

### TYPE-002 (Clipboard Fallback)
Handy's `clipboard.rs` implements `paste_via_clipboard()`:
1. Snapshot current clipboard (text + image, avoiding bitmap decode when text present)
2. Write dictated text to clipboard
3. Send paste chord (Ctrl+V / Cmd+V / Ctrl+Shift+V / Shift+Insert)
4. Configurable delay before/after chord (`paste_delay_ms`, `paste_delay_after_ms`)
5. Restore original clipboard, guarded by ownership check

### TYPE-003 (Clipboard Restoration)
Handy's `paste_tx/` implements receipt-sequenced restoration:
- **macOS:** `declareTypes:owner:` with `HandyPasteProvider` — pasteboard calls `pasteboard:provideDataForType:` on read, which is the receipt
- **Windows:** Delayed rendering via `SetClipboardData(CF_UNICODETEXT, NULL)` — owner window receives `WM_RENDERFORMAT` on read
- **State machine:** Tracks receipts, ownership loss, quiet period (200ms), timeout (8s)
- **Ownership guard:** changeCount-based — never clobbers a newer user copy
- **Concealment markers:** `org.nspasteboard.TransientType` etc. to skip clipboard managers

### Additional Handy Capabilities
- **Layout-aware paste:** macOS TIS API resolves Cmd+V keycode for non-Latin/Dvorak/AZERTY layouts
- **Linux/Wayland:** xclip, wl-copy, wl-paste, xdotool, ydotool, ydotoold
- **Configurable paste methods:** Ctrl+V, Ctrl+Shift+V, Shift+Insert (from `settings.rs`)
- **Clipboard ownership tracking:** Prevents restoring over user's newer clipboard

---

## 3. What Soravo's TYPE-002/003 Implementation Had

The original implementation (`crates/typing/src/lib.rs`, 364 lines):
- `ClipboardSnapshot` with text content + was_modified flag
- `take_clipboard_snapshot()`: Windows via `clipboard_win`, macOS via `pbcopy` (BUG: should be `pbpaste`), no Linux
- `write_to_clipboard()`: Windows via `clipboard_win`, macOS via `pbpaste` (BUG: should be `pbcopy`), no Linux
- `paste()`: Windows via raw `SendInput` (unsafe), macOS via `osascript`, no Linux
- `restore_clipboard()`: Simple write-back with was_modified guard
- Fixed-delay restoration (no ownership tracking)

### Bugs Found
1. **macOS clipboard read:** Called `pbcopy` (writes) instead of `pbpaste` (reads) — clipboard snapshot always empty
2. **macOS clipboard write:** Called `pbpaste` (reads) instead of `pbcopy` (writes) — text never written to clipboard
3. **Windows unsafe:** Raw `SendInput` inside `#![forbid(unsafe_code)]` crate — compiles only because `#[cfg(windows)]` blocks are stripped on Linux CI

### Missing Functionality vs Handy
| Feature | Handy | Soravo (Before) |
|---------|-------|-----------------|
| Linux/Wayland support | Yes | No |
| Configurable paste methods | Yes (3 methods) | No (hardcoded Ctrl+V) |
| Paste delay configuration | Yes | No (hardcoded) |
| Layout-aware paste (macOS) | Yes (TIS API) | No |
| Clipboard ownership tracking | Yes (changeCount) | Partial (was_modified flag) |
| Receipt-sequenced restoration | Yes | No |
| Concealment markers | Yes | No |
| Image clipboard preservation | Yes | No |

---

## 4. Whether Existing Implementation Unnecessarily Recreated Handy Functionality

**YES.** The original TYPE-002/003 implementation recreated a subset of Handy's clipboard fallback/restoration functionality with:
- Simpler (and buggy) clipboard read/write
- No Linux support
- No configurable paste methods
- No layout-aware paste
- Unsafe Windows code in a `#![forbid(unsafe_code)]` crate

The core pattern (snapshot → write → paste → restore) is identical to Handy's, but the implementation quality and platform coverage were significantly worse.

---

## 5. Whether Handy Implementation Can Safely Replace or Simplify New Code

**YES, with caveats.**

### What was adopted (safe, no unsafe):
- **PasteMethod enum pattern** from Handy's `settings.rs`
- **Paste delay configuration** from Handy's clipboard settings
- **Linux clipboard** (xclip/wl-copy) from Handy's `clipboard.rs`
- **Linux paste simulation** (xdotool/ydotool) from Handy's Linux support
- **macOS clipboard read/write** (pbcopy/pbpaste) corrected from Handy's approach
- **Windows clipboard** via `clipboard_win` (same as Handy)

### What was NOT adopted (requires unsafe or Tauri integration):
- **Receipt-sequenced paste** (`paste_tx/`): Requires `objc2` (macOS) and Win32 delayed rendering — both need `unsafe`. Adopt in Tauri integration layer.
- **Layout-aware paste** (`input.rs` macOS): Requires `enigo` + Carbon TIS APIs — both need `unsafe`. Adopt in Tauri integration layer.
- **Concealment markers**: Requires `objc2` for NSPasteboard type registration.

### Why fixed-delay is acceptable for now:
Soravo's specification mandates committed/final-only injection (never tentative). This means:
- The text being pasted is always the final transcript
- There is no "tentative" text that might be retracted
- A short fixed delay (50ms) is sufficient for the paste chord to complete
- The receipt-sequenced approach becomes critical only with tentative injection

---

## 6. Soravo-Specific Requirements Preserved

- **`#![forbid(unsafe_code)]`**: Maintained. All platform operations go through safe abstractions or external commands.
- **Committed/final-only injection**: Enforced by type contract (caller must provide final text).
- **No secrets logged**: Clipboard contents never logged.
- **No network access**: Injection path is purely local.
- **Platform coverage**: Now covers Windows, macOS, and Linux (X11 + Wayland).

---

## 7. Tests/Security

### Tests
- **9/9 pass** (5 unit + 4 integration)
- Unit tests: empty text, config defaults, paste method variants, clipboard snapshot state
- Integration tests: empty string injection, text injection, paste method construction, config construction

### Clippy
- Clean (0 warnings)

### Secret Scan
- No findings in typing crate

### Cargo Audit
- No new vulnerabilities introduced
- Pre-existing advisory: `h2` RUSTSEC-2026-0258 (unrelated to typing crate)

---

## 8. PR/Merge/Git State

- **Branch:** `typing/clipboard-injection-002-003`
- **PR:** https://github.com/eySRbS4zgHuW3gMFZB2/soravo/pull/32
- **Base:** `main`
- **Commits on branch:**
  1. `5c8569a9` — typing/clipboard: implement TYPE-001 native insertion, TYPE-002 clipboard fallback, TYPE-003 clipboard restoration
  2. `edc0f28c` — docs: add TYPE-002/003 implementation report
  3. `6fb0d687` — refactor(typing): reuse Handy clipboard patterns for TYPE-002/003 (this audit)
- **Status:** PR created, awaiting CI and review
- **Not merged** per instructions

---

## 9. Summary of Handy Code Reused

| Handy Source | Soravo Adoption | Method |
|-------------|----------------|--------|
| `clipboard.rs` snapshot pattern | ClipboardSnapshot struct | Adapted |
| `clipboard.rs` paste_via_clipboard flow | inject_via_clipboard method | Adapted |
| `settings.rs` PasteMethod enum | PasteMethod enum | Reused |
| `settings.rs` paste_delay_ms | paste_delay_ms config | Reused |
| `settings.rs` paste_delay_after_ms | paste_delay_after_ms config | Reused |
| `clipboard.rs` Linux xclip/wl-copy | Linux clipboard read/write | Reused |
| `clipboard.rs` Linux paste methods | Linux paste chord (xdotool/ydotool) | Reused |
| `clipboard.rs` macOS pbcopy/pbpaste | macOS clipboard (corrected) | Adapted |
| `clipboard.rs` Windows clipboard_win | Windows clipboard | Reused |
| `paste_tx/mod.rs` receipt-sequenced approach | Documented as future enhancement | Not adopted |
| `paste_tx/macos.rs` promise-based pasteboard | Not adopted (requires objc2 unsafe) | Not adopted |
| `paste_tx/windows.rs` delayed rendering | Not adopted (requires Win32 unsafe) | Not adopted |
| `input.rs` layout-aware paste (macOS) | Not adopted (requires enigo/Carbon unsafe) | Not adopted |
