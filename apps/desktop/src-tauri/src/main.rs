//! Prevents additional console window on Windows in release, DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{generate_handler, Manager};

use soravo_desktop_lib::{commands::*, session::SessionMachine};

fn main() {
    // Initialize session state machine (Soravo's authoritative state)
    let session_machine = Mutex::new(SessionMachine::default());

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::AppleScript,
            None,
        ))
        .plugin(tauri_plugin_single_instance::init(|_, args, _| {
            println!("Launched with args: {args:?}");
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(session_machine)
        .invoke_handler(generate_handler![
            runtime_status,
            ping,
            session_snapshot,
            session_transition,
            session_reset,
            inject_text,
            load_settings,
            save_settings,
            update_microphone_settings,
            update_hotkey_settings,
            update_model_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running soravo desktop");
}
