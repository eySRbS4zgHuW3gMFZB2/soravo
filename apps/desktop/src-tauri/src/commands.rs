//! Typed IPC commands for the Soravo desktop shell.
//!
//! Commands are request/response; streaming or push updates travel through the
//! typed event bus (`crate::events`). All session mutations are validated by
//! the authoritative `SessionMachine` — the frontend can never drive the
//! session into an invalid state.

use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::events::{PingPayload, SessionChangedPayload, SESSION_CHANGED_EVENT};
use crate::session::{SessionMachine, SessionPhase, SessionTransition};

use soravo_config::{HotkeySettings, MicrophoneSettings, ModelSettings, Settings};
use soravo_typing::{TypingConfig, TypingEngine, TypingResult};

/// Account response for sign-in/sign-out operations.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct AccountResult {
    pub success: bool,
    pub message: String,
}

/// Snapshot of the desk runtime handed to the frontend on request.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub version: &'static str,
    pub phase: SessionPhase,
    pub session_id: Option<u64>,
    pub sequence: u64,
    pub local_only: bool,
    pub ready: bool,
}

#[tauri::command]
pub fn runtime_status(machine: State<'_, Mutex<SessionMachine>>) -> RuntimeStatus {
    let machine = machine.lock().expect("session machine poisoned");
    RuntimeStatus {
        version: env!("CARGO_PKG_VERSION"),
        phase: machine.phase(),
        session_id: machine.session_id(),
        sequence: machine.sequence(),
        local_only: true,
        ready: true,
    }
}

/// Monotonic sequence + timestamp pair for measuring IPC round-trips.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingReply {
    pub sequence: u64,
    pub timestamp_ms: u64,
}

#[tauri::command]
pub fn ping(machine: State<'_, Mutex<SessionMachine>>) -> PingReply {
    let machine = machine.lock().expect("session machine poisoned");
    PingReply {
        sequence: machine.sequence(),
        timestamp_ms: machine.now_ms(),
    }
}

/// Current session snapshot for rendering and diagnostics.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub session_id: Option<u64>,
    pub phase: SessionPhase,
    pub sequence: u64,
}

#[tauri::command]
pub fn session_snapshot(machine: State<'_, Mutex<SessionMachine>>) -> SessionSnapshot {
    let machine = machine.lock().expect("session machine poisoned");
    SessionSnapshot {
        session_id: machine.session_id(),
        phase: machine.phase(),
        sequence: machine.sequence(),
    }
}

/// Validate and apply a transition. On success broadcasts the resulting
/// transition record on the typed event bus.
#[tauri::command]
pub fn session_transition(
    app: AppHandle,
    machine: State<'_, Mutex<SessionMachine>>,
    target: SessionPhase,
) -> Result<SessionTransition, String> {
    let mut machine = machine.lock().expect("session machine poisoned");
    let transition = machine.try_transition(target).map_err(|err| {
        serde_json::to_string(&err).unwrap_or_else(|_| "invalid transition".into())
    })?;
    let _ = app.emit(
        SESSION_CHANGED_EVENT,
        SessionChangedPayload::new(&transition),
    );
    Ok(transition)
}

/// Imperative reset back to IDLE (used by hold/toggle orchestration entry
/// points): clears any in-flight session without validating a path.
#[tauri::command]
pub fn session_reset(
    app: AppHandle,
    machine: State<'_, Mutex<SessionMachine>>,
) -> SessionTransition {
    let mut machine = machine.lock().expect("session machine poisoned");
    let transition = machine.reset();
    let _ = app.emit(
        SESSION_CHANGED_EVENT,
        SessionChangedPayload::new(&transition),
    );
    transition
}

/// Demo of the runtime ping event (kept for parity with `runtime://ping`).
#[tauri::command]
pub fn emit_ping(app: AppHandle, machine: State<'_, Mutex<SessionMachine>>) -> PingReply {
    let machine = machine.lock().expect("session machine poisoned");
    let reply = PingReply {
        sequence: machine.sequence(),
        timestamp_ms: machine.now_ms(),
    };
    let _ = app.emit(
        "runtime://ping",
        PingPayload::new(reply.sequence, reply.timestamp_ms),
    );
    reply
}

/// Inject committed text into the active application.
/// This is a typed IPC command callable from the frontend.
#[tauri::command]
pub fn inject_text(app: AppHandle, text: String) -> TypingResult {
    let engine = TypingEngine::new(TypingConfig::default());
    let result = engine.inject(&text);

    let _ = app.emit(
        "typing://result",
        serde_json::to_value(&result).unwrap_or_default(),
    );

    result
}

/// IPC settings response
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<Settings>,
}

#[tauri::command]
pub fn load_settings() -> SettingsResponse {
    match Settings::load() {
        Ok(settings) => SettingsResponse {
            success: true,
            message: "Settings loaded".to_string(),
            data: Some(settings),
        },
        Err(e) => SettingsResponse {
            success: false,
            message: format!("Failed to load settings: {}", e),
            data: None,
        },
    }
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> SettingsResponse {
    match settings.save() {
        Ok(()) => SettingsResponse {
            success: true,
            message: "Settings saved".to_string(),
            data: None,
        },
        Err(e) => SettingsResponse {
            success: false,
            message: format!("Failed to save settings: {}", e),
            data: None,
        },
    }
}

#[tauri::command]
pub fn update_microphone_settings(settings: MicrophoneSettings) -> SettingsResponse {
    match Settings::load() {
        Ok(mut current) => {
            current.microphone = settings;
            match current.save() {
                Ok(()) => SettingsResponse {
                    success: true,
                    message: "Microphone settings updated".to_string(),
                    data: Some(current),
                },
                Err(e) => SettingsResponse {
                    success: false,
                    message: format!("Failed to save settings: {}", e),
                    data: None,
                },
            }
        }
        Err(e) => SettingsResponse {
            success: false,
            message: format!("Failed to load settings: {}", e),
            data: None,
        },
    }
}

#[tauri::command]
pub fn update_hotkey_settings(settings: HotkeySettings) -> SettingsResponse {
    match Settings::load() {
        Ok(mut current) => {
            current.hotkey = settings;
            match current.save() {
                Ok(()) => SettingsResponse {
                    success: true,
                    message: "Hotkey settings updated".to_string(),
                    data: Some(current),
                },
                Err(e) => SettingsResponse {
                    success: false,
                    message: format!("Failed to save settings: {}", e),
                    data: None,
                },
            }
        }
        Err(e) => SettingsResponse {
            success: false,
            message: format!("Failed to load settings: {}", e),
            data: None,
        },
    }
}

#[tauri::command]
pub fn update_model_settings(settings: ModelSettings) -> SettingsResponse {
    match Settings::load() {
        Ok(mut current) => {
            current.model = settings;
            match current.save() {
                Ok(()) => SettingsResponse {
                    success: true,
                    message: "Model settings updated".to_string(),
                    data: Some(current),
                },
                Err(e) => SettingsResponse {
                    success: false,
                    message: format!("Failed to save settings: {}", e),
                    data: None,
                },
            }
        }
        Err(e) => SettingsResponse {
            success: false,
            message: format!("Failed to load settings: {}", e),
            data: None,
        },
    }
}
