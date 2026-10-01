//! Soravo Desktop Core Library
//!
//! This module integrates:
//! - Handy's audio, model, typing, settings infrastructure  
//! - Soravo's session state machine (authoritative)

pub mod events;
pub mod session;
pub mod transcription_coordinator;

// Handy integration modules
pub mod account;
pub mod actions;
#[cfg(target_os = "macos")]
pub mod apple_intelligence;
pub mod audio_feedback;
pub mod audio_toolkit;
pub mod autostart;
pub mod catalog;
pub mod cli;
pub mod clipboard;
pub mod helpers;
pub mod input;
pub mod llm_client;
// T33-P-FOLLOWUP-2B / ADR-021: narrowly scoped unsafe exception. Each
// `allow` below exists ONLY on Windows builds (cfg_attr) and covers ONLY
// the Handy-derived Win32 FFI allowlisted in ADR-021 (21 sites total).
// Every other target sees crate-level `deny`; every other module and
// crate keeps workspace `forbid`. macOS `unsafe` surfaces are NOT covered.
#[cfg_attr(target_os = "windows", allow(unsafe_code))]
pub mod overlay;
#[cfg_attr(target_os = "windows", allow(unsafe_code))]
pub mod paste_tx;
pub mod portable;
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
