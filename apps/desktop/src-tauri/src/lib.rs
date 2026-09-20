//! Soravo Desktop Core Library
//!
//! This module integrates:
//! - Handy's audio, model, typing, settings infrastructure  
//! - Soravo's session state machine (authoritative)

pub mod events;
pub mod session;

// Handy integration modules
pub mod actions;
pub mod audio_feedback;
pub mod audio_toolkit;
pub mod autostart;
pub mod catalog;
pub mod clipboard;
pub mod input;
pub mod overlay;
pub mod portable;
pub mod secure_input;
pub mod settings;
pub mod tray;
pub mod utils;

// Commands
pub mod commands;

// Managers
pub mod managers;

// Shortcut/hotkey integration
pub mod shortcut;

// Session state accessors
pub use session::{SessionMachine, SessionPhase, SessionTransition};
