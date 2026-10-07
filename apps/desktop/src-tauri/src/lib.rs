//! Soravo Desktop Core Library
//!
//! This module integrates:
//! - Handy's audio, model, typing, settings infrastructure  
//! - Soravo's session state machine (authoritative)

pub mod events;
pub mod session;
pub mod session_pipeline;
pub mod transcription_coordinator;

// Handy integration modules
pub mod account;
pub mod actions;
// T33-P-FOLLOWUP-3D / ADR-024: narrowly scoped macOS unsafe exception.
#[cfg(target_os = "macos")]
#[cfg_attr(target_os = "macos", allow(unsafe_code))]
pub mod apple_intelligence;
pub mod audio_feedback;
pub mod audio_toolkit;
// T33-P-FOLLOWUP-3D / ADR-024: covers autostart.rs macOS SMAppService blocks only.
#[cfg_attr(target_os = "macos", allow(unsafe_code))]
pub mod autostart;
pub mod catalog;
pub mod cli;
pub mod clipboard;
pub mod helpers;
// T33-P-FOLLOWUP-3D / ADR-024: covers input.rs macOS Carbon/CoreFoundation blocks only.
#[cfg_attr(target_os = "macos", allow(unsafe_code))]
pub mod input;
pub mod llm_client;
// T33-P-FOLLOWUP-2B / ADR-021: narrowly scoped unsafe exception. Each
// `allow` below exists ONLY on Windows builds (cfg_attr) and covers ONLY
// the Handy-derived Win32 FFI allowlisted in ADR-021 (21 sites total).
// Every other target sees crate-level `deny`; every other module and
// crate keeps workspace `forbid`. macOS `unsafe` surfaces are covered
// separately by ADR-024 below (NOT by the Windows allows).
#[cfg_attr(target_os = "windows", allow(unsafe_code))]
pub mod overlay;
// T33-P-FOLLOWUP-2B / ADR-021 (Windows) + T33-P-FOLLOWUP-3D / ADR-024 (macOS):
// each allow exists ONLY on its named target and covers ONLY its ADR allowlist.
#[cfg_attr(target_os = "windows", allow(unsafe_code))]
#[cfg_attr(target_os = "macos", allow(unsafe_code))]
pub mod paste_tx;
pub mod portable;
// T33-P-FOLLOWUP-3D / ADR-024: covers secure_input.rs macOS Carbon block only.
#[cfg_attr(target_os = "macos", allow(unsafe_code))]
pub mod secure_input;
pub mod settings;
pub mod tray;
pub mod tray_i18n;
#[cfg_attr(target_os = "windows", allow(unsafe_code))]
pub mod utils;

// Commands
pub mod commands;

// Managers
// T33-P-FOLLOWUP-2B / ADR-021: covers managers/audio.rs Windows COM blocks
// only (same scoping as above; macOS/Linux unaffected).
#[cfg_attr(target_os = "windows", allow(unsafe_code))]
pub mod managers;

// Shortcut/hotkey integration
pub mod shortcut;

// R1-GAP-004: macOS permission-declaration posture regression tests.
// Test-only module; zero production footprint.
#[cfg(test)]
#[path = "platform_config_tests.rs"]
mod platform_config_tests;

// Session state accessors
pub use session::{SessionMachine, SessionPhase, SessionTransition};
pub use transcription_coordinator::TranscriptionCoordinator;

/// Process-wide file log level, stored as the `log::LevelFilter`
/// discriminant. Updated by the `set_log_level` command so the log filter
/// picks up changes without a restart. Defaults to the default settings
/// log level (`LogLevel::Debug`).
pub static FILE_LOG_LEVEL: std::sync::atomic::AtomicU8 =
    std::sync::atomic::AtomicU8::new(log::LevelFilter::Debug as u8);

/// Whether webview log streaming is enabled. Mirrors the `debug_mode`
/// setting: the live log viewer only exists in debug mode. Defaults to the
/// default settings value (`debug_mode: false`).
pub static WEBVIEW_LOG_STREAMING: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);
