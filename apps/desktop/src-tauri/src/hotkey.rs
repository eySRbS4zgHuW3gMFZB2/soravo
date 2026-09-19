//! Hotkey service that manages global shortcut registration.
//!
//! This module provides:
//! - Platform-agnostic hotkey registration
//! - Hold-to-talk and toggle-to-talk modes
//! - Hotkey state management

use soravo_hotkeys::{HotkeyBinding, HotkeyConfig, HotkeyResult};
use std::sync::Mutex;
use tauri::State;

/// Hotkey state managed by the Tauri runtime.
#[derive(Default, Debug)]
pub struct HotkeyState {
    config: HotkeyConfig,
    is_listening: bool,
    toggle_state: bool, // For toggle mode: true = recording, false = idle
}

impl HotkeyState {
    #[allow(dead_code)]
    pub fn new(config: HotkeyConfig) -> Self {
        Self {
            config,
            is_listening: false,
            toggle_state: false,
        }
    }

    pub fn config(&self) -> &HotkeyConfig {
        &self.config
    }

    #[allow(dead_code)]
    pub fn is_listening(&self) -> bool {
        self.is_listening
    }

    #[allow(dead_code)]
    pub fn is_toggle_on(&self) -> bool {
        self.toggle_state
    }

    /// Update configuration.
    pub fn set_config(&mut self, config: HotkeyConfig) -> HotkeyResult {
        self.config = config;
        HotkeyResult::Success {
            message: String::from("Hotkey configuration updated"),
        }
    }

    /// Start listening (hold mode).
    pub fn start_listening(&mut self) -> HotkeyResult {
        if self.config.enabled && self.config.binding.is_some() {
            self.is_listening = true;
            HotkeyResult::Success {
                message: String::from("Started listening"),
            }
        } else {
            HotkeyResult::Invalid {
                code: soravo_hotkeys::HotkeyErrorCode::InvalidKey,
                message: String::from("Hotkey not configured"),
            }
        }
    }

    /// Stop listening (hold mode).
    pub fn stop_listening(&mut self) -> HotkeyResult {
        self.is_listening = false;
        HotkeyResult::Success {
            message: String::from("Stopped listening"),
        }
    }

    /// Toggle recording state (toggle mode).
    pub fn toggle(&mut self) -> HotkeyResult {
        if self.config.enabled && self.config.binding.is_some() {
            self.toggle_state = !self.toggle_state;
            self.is_listening = self.toggle_state;
            HotkeyResult::Success {
                message: String::from("Toggled recording state"),
            }
        } else {
            HotkeyResult::Invalid {
                code: soravo_hotkeys::HotkeyErrorCode::InvalidKey,
                message: String::from("Hotkey not configured"),
            }
        }
    }

    /// Check if recording is active (for both modes).
    pub fn is_recording(&self) -> bool {
        self.is_listening
    }
}

/// Tauri command: get current hotkey configuration.
#[tauri::command]
pub fn hotkey_config(state: State<'_, Mutex<HotkeyState>>) -> HotkeyConfig {
    let state = state.lock().expect("hotkey state poisoned");
    state.config().clone()
}

/// Tauri command: update hotkey configuration.
#[tauri::command]
pub fn set_hotkey_config(
    state: State<'_, Mutex<HotkeyState>>,
    config: HotkeyConfig,
) -> HotkeyResult {
    let mut state = state.lock().expect("hotkey state poisoned");
    state.set_config(config)
}

/// Tauri command: start recording (hold mode).
#[tauri::command]
pub fn hotkey_start(state: State<'_, Mutex<HotkeyState>>) -> HotkeyResult {
    let mut state = state.lock().expect("hotkey state poisoned");
    state.start_listening()
}

/// Tauri command: stop recording (hold mode).
#[tauri::command]
pub fn hotkey_stop(state: State<'_, Mutex<HotkeyState>>) -> HotkeyResult {
    let mut state = state.lock().expect("hotkey state poisoned");
    state.stop_listening()
}

/// Tauri command: toggle recording (toggle mode).
#[tauri::command]
pub fn hotkey_toggle(state: State<'_, Mutex<HotkeyState>>) -> HotkeyResult {
    let mut state = state.lock().expect("hotkey state poisoned");
    state.toggle()
}

/// Tauri command: get current recording state.
#[tauri::command]
pub fn hotkey_recording(state: State<'_, Mutex<HotkeyState>>) -> bool {
    let state = state.lock().expect("hotkey state poisoned");
    state.is_recording()
}

/// Tauri command: check if a hotkey conflict exists.
#[tauri::command]
pub fn hotkey_check_conflicts(binding: Option<HotkeyBinding>) -> HotkeyResult {
    // This is a placeholder for platform-specific conflict detection
    // In a real implementation, this would query OS-level hotkey registry
    if let Some(_b) = binding {
        // Simulated conflict check - always returns success for now
        HotkeyResult::Success {
            message: String::from("No conflicts detected"),
        }
    } else {
        HotkeyResult::Invalid {
            code: soravo_hotkeys::HotkeyErrorCode::InvalidKey,
            message: String::from("No binding provided"),
        }
    }
}
