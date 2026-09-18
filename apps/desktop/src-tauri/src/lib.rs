#![forbid(unsafe_code)]
//! Soravo desktop shell — Tauri v2 runtime bootstrap.
//!
//! Ported from Handy (`ba10ce1943ef34e93c09494027fc0b9ced2e8a44`) build
//! plumbing, rebranded and stripped to the Phase 1 surface: window lifecycle,
//! logging, single-instance, the authoritative session state machine, IPC
//! commands, and the typed event bus. See `decisions/ADR-026`.

mod commands;
mod events;
mod hotkey;
mod session;

use std::sync::Mutex;

use tauri::Manager;

use hotkey::HotkeyState;
use session::SessionMachine;

/// Tauri app entry point, invoked by `main.rs`.
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                ])
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .manage(Mutex::new(SessionMachine::default()))
        .manage(Mutex::new(HotkeyState::default()))
        .invoke_handler(tauri::generate_handler![
            commands::runtime_status,
            commands::ping,
            commands::session_snapshot,
            commands::session_transition,
            commands::session_reset,
            commands::emit_ping,
            hotkey::hotkey_config,
            hotkey::set_hotkey_config,
            hotkey::hotkey_start,
            hotkey::hotkey_stop,
            hotkey::hotkey_toggle,
            hotkey::hotkey_recording,
            hotkey::hotkey_check_conflicts,
        ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running Soravo desktop runtime");
}
