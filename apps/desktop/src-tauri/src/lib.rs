//! Soravo Desktop Core Library
//!
//! This module integrates:
//! - Handy's audio, model, typing, settings infrastructure  
//! - Soravo's session state machine (authoritative)

pub mod session;
pub mod events;

// Handy integration modules
pub mod audio_toolkit;
pub mod clipboard;
pub mod input;
pub mod settings;
pub mod tray;
pub mod overlay;
pub mod paste_tx;
pub mod catalog;
pub mod audio_feedback;
pub mod autostart;
pub mod utils;
pub mod portable;
pub mod actions;
pub mod secure_input;

// Commands
pub mod commands;

// Managers  
pub mod managers;

// Shortcut/hotkey integration
pub mod shortcut;

// Session state accessors
pub use session::{SessionMachine, SessionPhase, SessionTransition};
