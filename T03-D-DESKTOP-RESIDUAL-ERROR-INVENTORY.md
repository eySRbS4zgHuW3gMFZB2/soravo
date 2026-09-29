# T03-D — DESKTOP RESIDUAL ERROR INVENTORY

**Status:** Analysis complete after accounting for T02 manifest/workspace/dependency findings
**Date:** 2026-09-28
**HEAD:** `ede495b55efd95cedd882d90a19d12b4777da852`

---

## Executive Summary

After T02's manifest/workspace repairs (R3, R6, R4, R5), the residual errors reduce to **~12 distinct root causes**, down from the observed 280 compile errors. The vast majority of current errors are **cascaded** from missing manifest entries and workspace configuration gaps.

---

## 1. Current Error Landscape

### 1.1 Top-level Error Count
- **Total errors (unfixed):** 280
- **Root causes (distinct):** ~12
- **Cascaded errors:** ~268 (95.7%)

### 1.2 Error Classification

| Error Class | Count | Root Cause | Notes |
|-------------|-------|------------|-------|
| `E0432`/`E0433` missing crates | ~210 | T02 R3 (manifest gap) | ~24 undeclared crates |
| Missing intra-crate modules | ~30 | T02 R6 (workspace) + R7 (source gaps) | See §3 |
| API mismatch (rodio/cpal) | ~2 | T02 R4/R5 | `OutputStreamBuilder` not in rodio 0.19 |
| Formatting/format issues | 0 | T02 F1 | Already fixed |

---

## 2. T02 Manifest/Workspace Root Causes (Already Identified)

### 2.1 Missing Dependencies (R3 - ~24 undeclared crates)
The following are **absent from `apps/desktop/src-tauri/Cargo.toml`** but referenced in code:

| Crate | Referenced In | Intended Source |
|-------|---------------|-----------------|
| `soravo_audio` | `audio_toolkit/mod.rs`, `audio.rs` | `../../../crates/audio` (path) |
| `hf_hub` | `managers/model/download.rs` | NPM/crates.io |
| `gtk`/`gtk-layer-shell` | `overlay.rs` | System deps (Linux) |
| `ferrous_opencc` | `actions.rs` | crates.io |
| `anyhow` | Multiple | crates.io |
| `once_cell` | `actions.rs`, `catalog/mod.rs`, `tray_i18n.rs` | crates.io |
| `futures_util` | `managers/model/download.rs` | crates.io |
| `sha2` | `managers/model/download.rs` | crates.io |
| `specta`/`tauri_specta` | Multiple | crates.io |
| `rusqlite`/`rusqlite_migration` | `managers/history.rs` | crates.io |
| `flate2`/`tar` | `managers/model/download.rs` | crates.io |
| `transcribe_rs` | `managers/transcription.rs` | `../../../crates/transcribe-rs` |
| `transcribe_cpp` | `managers/transcription.rs` | `../../../crates/transcribe-cpp` |
| `handy_keys` | `managers/hotkeys.rs` | `../../../crates/hotkeys` (renamed?) |
| `tauri_plugin_global_shortcut` | `shortcut/tauri_impl.rs` | crates.io |
| `tauri_plugin_clipboard_manager` | `clipboard.rs`, `tray.rs` | crates.io |
| `tauri_plugin_store` | `managers/settings.rs` | crates.io |
| `tauri_plugin_opener` | `managers/session.rs` | crates.io |
| `tempfile` | `managers/model/download.rs` | crates.io |

### 2.2 Workspace Membership Gap (R6)
Root `Cargo.toml` declares 7 members; `crates/` contains 14 directories:
- **Missing members:** `diagnostics`, `history`, `licensing`, `scheduler`, `vad`, `transcribe-cpp`, `transcribe-rs`
- **Manifest-less:** `transcribe-cpp/src/`, `transcribe-rs/src/` exist without `Cargo.toml`

### 2.3 Version Mismatches (R4/R5)
| Item | Desktop Manifest | Audio Crate | Impact |
|------|------------------|-------------|--------|
| `cpal` | `0.15` | `0.16` | Type-level audio-device mismatch |
| `rodio` | `0.19` | Uses `OutputStreamBuilder`/`play` | API not present in rodio 0.19 |

---

## 3. Residual Source-Integration Issues (After Manifest Repairs)

These persist even after T02's manifest/workspace fixes:

### 3.1 Missing Modules/Symbols

| Missing | Referenced In | Exists? | Location |
|---------|--------------|---------|----------|
| `crate::tray_i18n` | `tray.rs` | **YES** | `tray_i18n.rs` (not declared in lib.rs) |
| `crate::helpers` | `managers/audio.rs` | **YES** | `helpers/` directory (not declared in lib.rs) |
| `crate::audio_toolkit::audio` | `commands/audio.rs`, `audio_toolkit/mod.rs` | **NO** | Should be in `audio_toolkit/` but missing |
| `crate::audio_toolkit::vad::*` constants/types | `managers/audio.rs`, `actions.rs` | **PARTIAL** | `vad/mod.rs` exists but incomplete |
| `crate::memory` | `actions.rs` | **YES** | `memory.rs` (not declared in lib.rs) |
| `crate::llm_client` | `actions.rs` | **YES** | `llm_client.rs` (not declared in lib.rs) |
| `FILE_LOG_LEVEL`/`WEBVIEW_LOG_STREAMING` | `lib.rs` | **PARTIAL** | Declared in lib.rs but needs cfg setup |

### 3.2 Source-Integration Status

| File/Module | Status | Required Action |
|-------------|--------|-----------------|
| `tray_i18n.rs` | **Implemented** | Declare as `pub mod tray_i18n` in `lib.rs` |
| `helpers/mod.rs` | **Exists** (clamshell.rs inside) | Declare as `pub mod helpers` in `lib.rs` |
| `memory.rs` | **Implemented** | Declare as `pub mod memory` in `lib.rs` |
| `llm_client.rs` | **Implemented** | Declare as `pub mod llm_client` in `lib.rs` |
| `audio_toolkit/audio.rs` | **MISSING** | Create or re-export from `soravo_audio::audio` |
| `audio_toolkit/vad.rs` | **PARTIAL** | `vad/mod.rs` exists; check exports match imports |
| `audio_toolkit/post_process.rs` | **Implemented** | Not imported anywhere; unused |

---

## 4. API Mismatch Details

### 4.1 rodio 0.19 vs Source API
**Location:** `audio_feedback.rs:5`, `audio_feedback.rs:137`

**Code:**
```rust
use rodio::OutputStreamBuilder;  // Line 5
// ...
let stream_builder = OutputStreamBuilder::from_default_device()?;  // Line 105
// ...
let sink = rodio::play(mixer, buf_reader)?;  // Line 137
```

**Issue:** `OutputStreamBuilder` and `rodio::play` are **not present** in rodio 0.19 API.

**Possible fixes:**
- **Option A:** Bump rodio to 0.20+ (if `OutputStreamBuilder` exists there)
- **Option B:** Adapt calls to use rodio 0.19 API (`OutputStream`, `Decoder`, `Sink`)

### 4.2 cpal 0.15 vs 0.16
**Location:** `audio_feedback.rs:3`, `crates/audio/Cargo.toml:14`

**Issue:** Desktop uses `cpal = "0.15"`, but `crates/audio` uses `cpal = "0.16"`. The `get_cpal_host()` function in audio_toolkit references cpal types that may differ between versions.

**Fix:** Align versions across workspace; prefer `0.16` if audio crate already uses it.

---

## 5. Ordered Root-Cause Tree

```
Desktop build failure (280 errors)
├── R3: Missing manifest dependencies (~24 crates) → ~210 errors
│   ├── soravo_audio, hf_hub, ferrous_opencc, anyhow, once_cell
│   ├── tauri-plugin-* (5 crates), specta/tauri_specta
│   ├── rusqlite/rusqlite-migration, flate2, tar
│   ├── transcribe_rs, transcribe_cpp, handy_keys
│   └── sha2, futures_util, tempfile
│
├── R6: Workspace membership gap → ~20 errors
│   ├── transcribe-cpp/transcribe-rs without manifests
│   └── 5 crates missing from workspace.members
│
├── R4/R5: API version mismatches → ~2-3 errors
│   ├── cpal 0.15 vs 0.16
│   └── rodio 0.19 API (OutputStreamBuilder/play not present)
│
└── R7: Missing module declarations → ~40 errors (after manifest fixes)
    ├── audio_toolkit/audio.rs missing
    ├── audio_toolkit/vad exports incomplete
    ├── lib.rs missing: tray_i18n, helpers, memory, llm_client
    └── helpers/ not declared in lib.rs
```

---

## 6. Smallest Source Changes After Manifest/Dependency Repairs

Once T02's manifest/workspace fixes are applied, only these source changes remain:

### 6.1 Module Declarations in `lib.rs`
Add missing module declarations (5 lines):
```rust
pub mod tray_i18n;  // Already exists at src/tray_i18n.rs
pub mod helpers;     // Already exists at src/helpers/mod.rs
pub mod memory;      // Already exists at src/memory.rs
pub mod llm_client;  // Already exists at src/llm_client.rs
```

### 6.2 Create `audio_toolkit/audio.rs`
**Location:** `apps/desktop/src-tauri/src/audio_toolkit/audio.rs`

This module should re-export from `soravo_audio`:
```rust
pub use soravo_audio::audio::{list_input_devices, list_output_devices, CpalDeviceInfo};
```

### 6.3 Fix `audio_toolkit/vad.rs` Exports
**Location:** `apps/desktop/src-tauri/src/audio_toolkit/vad/mod.rs`

Currently empty/incomplete. Should re-export:
```rust
pub use soravo_audio::vad::{
    EarshotVad, SileroVad, SmoothedVad, VoiceActivityDetector, VadFrame, VadTailReport,
    VAD_PREFILL_MS, VAD_OFFLINE_HANGOVER_MS, VAD_STREAMING_HANGOVER_MS, VAD_ONSET_MS,
    frames_for_duration_ms,
};
```

### 6.4 Fix `rodio` API Usage
**Location:** `audio_feedback.rs`

Two options:
1. **Bump rodio:** Change `rodio = "0.19"` to `rodio = "0.20"` (or version with `OutputStreamBuilder`)
2. **Adapt source:** Replace `OutputStreamBuilder::from_default_device()` with `rodio::OutputStream::try_default()` and `rodio::play()` with `Sink::try_new()`

### 6.5 Align `cpal` Versions
**Location:** `apps/desktop/src-tauri/Cargo.toml`, `crates/audio/Cargo.toml`

Change desktop's `cpal = "0.15"` to `cpal = "0.16"` to match the audio crate.

---

## 7. Verification Order

After manifest/workspace repairs, verify in this order:

1. `cargo check -p soravo-desktop` — Should pass with only module declarations missing
2. Add module declarations to `lib.rs`
3. Create missing `audio_toolkit/audio.rs` and fix `vad/mod.rs`
4. Fix rodio/cpal versions
5. `cargo check -p soravo-desktop --all-targets` — Should now pass
6. `cargo clippy --workspace --all-targets -- -D warnings`
7. `cargo test --workspace`

---

## 8. Summary

| Category | After T02 Fixes | Action Required |
|----------|-----------------|-----------------|
| Manifest dependencies | Still missing ~24 crates | T02 R6 fix (Cargo.toml additions) |
| Workspace membership | 5 crates unlisted | T02 F7 fix (workspace members) |
| API mismatches | rodio/cpal still divergent | T02 F8 fix (version alignment) |
| Source declarations | 4 modules undeclared | Add to `lib.rs` (6 lines total) |
| Source files missing | `audio_toolkit/audio.rs` | Create (1 line re-export) |
| Source files incomplete | `audio_toolkit/vad/mod.rs` | Add re-exports (10 lines) |

**Total residual source changes:** ~20 lines across 3 files after T02 manifest/workspace repairs.

---

*End of T03-D Report*
