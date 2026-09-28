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
pub mod clipboard;
pub mod helpers;
pub mod input;
pub mod llm_client;
pub mod overlay;
pub mod portable;
pub mod secure_input;
pub mod settings;
pub mod tray;
pub mod tray_i18n;
pub mod utils;

// Commands
pub mod commands;

// Managers
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
