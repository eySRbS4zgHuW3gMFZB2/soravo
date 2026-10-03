//! T10-B: Recovered Soravo-owned typed IPC commands.
//!
//! Provenance:
//! - `runtime_status`, `ping`, `session_snapshot`, `session_transition`,
//!   `session_reset`, `emit_ping`: first ported in `83a506e8`
//!   ("feat(desktop): port Handy shell, wire Rust session machine + decisions",
//!   `apps/desktop/src-tauri/src/commands.rs`). Lost when the Handy foundation
//!   migration (`842acdf9`, `557cfb66`, `5f56260c`, integrated by `a156c8c9`)
//!   replaced `commands.rs` with `commands/` and never re-added the
//!   Soravo-owned session/runtime surface.
//! - `inject_text`, `load_settings`, `save_settings`,
//!   `update_microphone_settings`, `update_hotkey_settings`,
//!   `update_model_settings`: added in `69999112` ("Implement settings
//!   foundation for microphone, hotkey, and model configuration") on top of
//!   `soravo-config` + `soravo-typing`. Lost in the same migration.
//!
//! Recovery policy (v6 `04_HANDY_FORK_AND_REUSE_POLICY.md`):
//! - Session/runtime/transcript IPC are SORAVO-OWNED: restored verbatim,
//!   adapted only with `#[specta::specta]` + `specta::Type` so type generation
//!   checks pass. No behavior change.
//! - `inject_text` reuses the Soravo typing abstraction (`soravo-typing`,
//!   itself documented as following Handy's `clipboard.rs` / `paste_tx/`
//!   snapshot-restore pattern). The working Handy `clipboard::paste()` path
//!   is untouched.
//! - Settings commands reuse `soravo-config` file persistence. The Handy
//!   `AppSettings` store (`settings.rs`, tauri-plugin-store) is untouched.
//!   The two stores coexist as they did historically; unifying them is a
//!   product decision and explicitly out of scope for T10-B.
//! - `emit_ping` is ancillary (not in the T10-B 11): it existed in the same
//!   historical module and the current frontend `emitPing()` still invokes
//!   `"emit_ping"`. Restored to prevent a runtime invoke failure; no new
//!   behavior.
//!
//! v6 contracts honored (`05_DESKTOP_CONTRACTS.md`):
//! - typed payloads, validated inputs, structured errors, no secrets.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

use crate::events::{PingPayload, SessionChangedPayload, SESSION_CHANGED_EVENT};
use crate::session::{SessionMachine, SessionPhase, SessionTransition};

// ---------------------------------------------------------------------------
// Runtime / session surface (Soravo-owned, from 83a506e8)
// ---------------------------------------------------------------------------

/// Snapshot of the desktop runtime handed to the frontend on request.
/// Mirrors `apps/desktop/src/ipc.ts` `RuntimeStatus`.
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub version: String,
    pub phase: SessionPhase,
    pub session_id: Option<u64>,
    pub sequence: u64,
    pub local_only: bool,
    pub ready: bool,
}

/// Monotonic sequence + timestamp pair for measuring IPC round-trips.
/// Mirrors `ipc.ts` `PingReply`.
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PingReply {
    pub sequence: u64,
    pub timestamp_ms: u64,
}

/// Current session snapshot for rendering and diagnostics.
/// Mirrors `ipc.ts` `SessionSnapshot`.
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub session_id: Option<u64>,
    pub phase: SessionPhase,
    pub sequence: u64,
}

#[tauri::command]
#[specta::specta]
pub fn runtime_status(machine: State<'_, Mutex<SessionMachine>>) -> RuntimeStatus {
    let machine = machine.lock().expect("session machine poisoned");
    RuntimeStatus {
        version: env!("CARGO_PKG_VERSION").to_string(),
        phase: machine.phase(),
        session_id: machine.session_id(),
        sequence: machine.sequence(),
        local_only: true,
        ready: true,
    }
}

#[tauri::command]
#[specta::specta]
pub fn ping(machine: State<'_, Mutex<SessionMachine>>) -> PingReply {
    let machine = machine.lock().expect("session machine poisoned");
    PingReply {
        sequence: machine.sequence(),
        timestamp_ms: machine.now_ms(),
    }
}

#[tauri::command]
#[specta::specta]
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
#[specta::specta]
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
#[specta::specta]
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

/// Ancillary demo of the runtime ping event (parity with `runtime://ping`).
/// Not in the T10-B 11; restored because `ipc.ts` `emitPing()` invokes it.
#[tauri::command]
#[specta::specta]
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

// ---------------------------------------------------------------------------
// Text injection (Soravo-owned, from 69999112 via soravo-typing)
// ---------------------------------------------------------------------------

/// Maximum accepted injection length (DoS guard). Committed/final transcripts
/// are short utterances; anything larger is rejected before touching the
/// typing engine. Not a product limit: a validation bound per v6 IPC rules.
pub const MAX_INJECT_TEXT_LEN: usize = 100_000;

/// Pure validation helper so the bound is unit-testable without Tauri state.
pub fn validate_inject_text(text: &str) -> Result<(), String> {
    if text.len() > MAX_INJECT_TEXT_LEN {
        return Err(format!(
            "text too long ({} chars, max {})",
            text.len(),
            MAX_INJECT_TEXT_LEN
        ));
    }
    Ok(())
}

/// Inject committed text into the active application (typed IPC callable).
/// Uses the Soravo typing abstraction; emits the result on `typing://result`.
/// Only committed/final text must ever be passed here (v6 transcript rule);
/// the command itself does not accept tentative text by contract.
#[tauri::command]
#[specta::specta]
pub fn inject_text(app: AppHandle, text: String) -> Result<soravo_typing::TypingResult, String> {
    validate_inject_text(&text)?;
    let engine = soravo_typing::TypingEngine::new(soravo_typing::TypingConfig::default());
    let result = engine.inject(&text);
    let _ = app.emit(
        "typing://result",
        serde_json::to_value(&result).unwrap_or_default(),
    );
    Ok(result)
}

// ---------------------------------------------------------------------------
// Settings surface (Soravo-owned, from 69999112 via soravo-config)
// ---------------------------------------------------------------------------

/// IPC settings response. Mirrors `ipc.ts` `SettingsResponse`.
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SettingsResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<soravo_config::Settings>,
}

#[tauri::command]
#[specta::specta]
pub fn load_settings() -> SettingsResponse {
    match soravo_config::Settings::load() {
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
#[specta::specta]
pub fn save_settings(settings: soravo_config::Settings) -> SettingsResponse {
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
#[specta::specta]
pub fn update_microphone_settings(settings: soravo_config::MicrophoneSettings) -> SettingsResponse {
    match soravo_config::Settings::load() {
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
#[specta::specta]
pub fn update_hotkey_settings(settings: soravo_config::HotkeySettings) -> SettingsResponse {
    match soravo_config::Settings::load() {
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
#[specta::specta]
pub fn update_model_settings(settings: soravo_config::ModelSettings) -> SettingsResponse {
    match soravo_config::Settings::load() {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runtime_status_contract_shape() {
        // Contract: version/phase/sessionId/sequence/localOnly/ready.
        let status = RuntimeStatus {
            version: "0.1.0".to_string(),
            phase: SessionPhase::Idle,
            session_id: None,
            sequence: 0,
            local_only: true,
            ready: true,
        };
        let value = serde_json::to_value(&status).expect("serializes");
        for key in [
            "version",
            "phase",
            "sessionId",
            "sequence",
            "localOnly",
            "ready",
        ] {
            assert!(value.get(key).is_some(), "missing key {key}");
        }
        assert_eq!(value["phase"], serde_json::json!("IDLE"));
    }

    #[test]
    fn session_snapshot_contract_shape() {
        let snap = SessionSnapshot {
            session_id: Some(1),
            phase: SessionPhase::Listening,
            sequence: 3,
        };
        let value = serde_json::to_value(&snap).expect("serializes");
        assert_eq!(value["sessionId"], serde_json::json!(1));
        assert_eq!(value["phase"], serde_json::json!("LISTENING"));
        assert_eq!(value["sequence"], serde_json::json!(3));
    }

    #[test]
    fn ping_reply_contract_shape() {
        let reply = PingReply {
            sequence: 7,
            timestamp_ms: 123,
        };
        let value = serde_json::to_value(&reply).expect("serializes");
        assert_eq!(value["sequence"], serde_json::json!(7));
        assert_eq!(value["timestampMs"], serde_json::json!(123));
    }

    #[test]
    fn session_transition_error_serializes_structured() {
        let mut machine = SessionMachine::default();
        let err = machine
            .try_transition(SessionPhase::Listening)
            .expect_err("cannot skip STARTING");
        let value = serde_json::to_value(&err).expect("serializes");
        assert_eq!(value["code"], serde_json::json!("INVALID_TRANSITION"));
        assert_eq!(value["from"], serde_json::json!("IDLE"));
        assert_eq!(value["to"], serde_json::json!("LISTENING"));
    }

    #[test]
    fn inject_text_rejects_oversize_input() {
        assert!(validate_inject_text("").is_ok());
        assert!(validate_inject_text("hello").is_ok());
        let big = "x".repeat(MAX_INJECT_TEXT_LEN + 1);
        assert!(validate_inject_text(&big).is_err());
    }

    #[test]
    fn settings_ipc_accepts_camel_case_frontend_payload() {
        // Frontend sends camelCase (ipc.ts); the command layer must accept it.
        let payload = serde_json::json!({
            "schema": { "version": 1, "lastMigrated": null },
            "microphone": {
                "selectedDeviceIndex": "1",
                "selectedDeviceName": "Built-in",
                "deviceAvailable": true,
                "autoFallback": true
            },
            "hotkey": {
                "binding": "ctrl+space",
                "mode": "hold_to_talk",
                "enabled": true,
                "recordingInProgress": false
            },
            "model": {
                "selectedEngine": "whisper",
                "selectedModel": "large-v3-turbo",
                "available": true,
                "status": "ready"
            }
        });
        let settings: soravo_config::Settings =
            serde_json::from_value(payload).expect("camelCase payload parses");
        assert_eq!(
            settings.microphone.selected_device_name.as_deref(),
            Some("Built-in")
        );
        assert!(settings.microphone.device_available);
        let roundtrip = serde_json::to_value(&settings).expect("serializes");
        assert!(roundtrip["microphone"].get("selectedDeviceName").is_some());
        assert!(roundtrip["hotkey"].get("recordingInProgress").is_some());
    }

    #[test]
    fn settings_ipc_still_accepts_legacy_snake_case_file() {
        // Files written before the camelCase bridge used snake_case keys.
        let legacy = serde_json::json!({
            "schema": { "version": 1, "last_migrated": null },
            "microphone": {
                "selected_device_index": null,
                "selected_device_name": null,
                "device_available": false,
                "auto_fallback": false
            },
            "hotkey": {
                "binding": null,
                "mode": "hold_to_talk",
                "enabled": true,
                "recording_in_progress": false
            },
            "model": {
                "selected_engine": null,
                "selected_model": null,
                "available": false,
                "status": "not_installed"
            }
        });
        let settings: soravo_config::Settings =
            serde_json::from_value(legacy).expect("legacy snake_case still parses");
        assert!(!settings.microphone.device_available);
    }

    #[test]
    fn settings_response_contract_shape() {
        let response = SettingsResponse {
            success: true,
            message: "Settings loaded".to_string(),
            data: Some(soravo_config::Settings::default()),
        };
        let value = serde_json::to_value(&response).expect("serializes");
        assert_eq!(value["success"], serde_json::json!(true));
        assert!(value.get("message").is_some());
        assert!(value.get("data").is_some());
    }
}
