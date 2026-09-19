//! Hotkey subsystem for Soravo.
//!
//! Implements:
//! - Global hotkey registration/unregistration
//! - Shortcut recording (capture key combination)
//! - Conflict validation
//! - Hold-to-talk vs toggle-to-talk modes
//!
//! Does NOT trigger microphone initialization.
//! The capture pipeline is warmed independently.

use serde::{Deserialize, Serialize};

/// Key code representation for cross-platform compatibility.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KeyCode {
    // Letters
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    M,
    N,
    O,
    P,
    Q,
    R,
    S,
    T,
    U,
    V,
    W,
    X,
    Y,
    Z,
    // Numbers
    Digit0,
    Digit1,
    Digit2,
    Digit3,
    Digit4,
    Digit5,
    Digit6,
    Digit7,
    Digit8,
    Digit9,
    // Function keys
    F1,
    F2,
    F3,
    F4,
    F5,
    F6,
    F7,
    F8,
    F9,
    F10,
    F11,
    F12,
    // Special keys
    Escape,
    Backspace,
    Delete,
    End,
    Enter,
    Home,
    Insert,
    Space,
    Tab,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    // Media/volume
    VolumeDown,
    VolumeUp,
    Mute,
}

/// Modifier keys.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Modifiers {
    pub ctrl: bool,
    pub alt: bool,
    pub shift: bool,
    pub meta: bool, // Cmd on macOS, Win/Super on Windows
}

impl Modifiers {
    pub fn none() -> Self {
        Self::default()
    }

    pub fn is_empty(&self) -> bool {
        !self.ctrl && !self.alt && !self.shift && !self.meta
    }
}

/// A complete hotkey binding.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct HotkeyBinding {
    pub modifiers: Modifiers,
    pub key: KeyCode,
}

impl HotkeyBinding {
    pub fn new(modifiers: Modifiers, key: KeyCode) -> Self {
        Self { modifiers, key }
    }
}

/// Interaction mode for the hotkey.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum InteractionMode {
    /// Hold to record, release to stop.
    #[default]
    HoldToTalk,
    /// Toggle on/off with each press.
    ToggleToTalk,
}

/// Hotkey configuration.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct HotkeyConfig {
    pub binding: Option<HotkeyBinding>,
    pub mode: InteractionMode,
    pub enabled: bool,
}

impl HotkeyConfig {
    pub fn default_binding() -> HotkeyBinding {
        HotkeyBinding::new(
            Modifiers {
                meta: true,
                ..Modifiers::none()
            },
            KeyCode::S,
        )
    }
}

/// Result of a hotkey operation.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum HotkeyResult {
    Success {
        message: String,
    },
    Invalid {
        code: HotkeyErrorCode,
        message: String,
    },
    Conflict {
        conflicting_app: String,
        message: String,
    },
}

/// Error codes for hotkey operations.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum HotkeyErrorCode {
    InvalidModifier,
    InvalidKey,
    NotRegistered,
    AlreadyRegistered,
    PlatformError,
    PermissionDenied,
}
