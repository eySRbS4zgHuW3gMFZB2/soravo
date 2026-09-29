//! Prevents additional console window on Windows in release, DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::Parser;
use std::sync::{Arc, Mutex};
use tauri::{generate_handler, Manager};

use soravo_desktop_lib::{
    account::AccountMachine,
    cli::CliArgs,
    commands::{account::*, initialize_shortcuts, soravo_ipc::*},
    managers::{
        audio::AudioRecordingManager,
        history::HistoryManager,
        model::ModelManager,
        transcription::{init_transcribe_backend, TranscriptionManager},
    },
    portable, secure_input,
    session::SessionMachine,
    TranscriptionCoordinator,
};
// `#[tauri::command]` macro-exports its per-command wrappers to the crate root.
// The other 15 commands' wrappers arrive via the `account::*` / `soravo_ipc::*`
// globs; `initialize_shortcuts` is declared in `commands` itself, so both of its
// generated wrappers are imported by name here.
use soravo_desktop_lib::{__cmd__initialize_shortcuts, __tauri_command_name_initialize_shortcuts};

fn main() {
    // S0 — detect portable mode before Tauri initializes, so every app_data_dir
    // reader below resolves the same directory. (Handy: portable.rs:15.)
    portable::init();

    // S1 — parse the ported Handy CLI args. Note: this only yields a readable
    // `CliArgs` value; no flag has handling code in this repository.
    let cli_args = CliArgs::parse();

    // S2 — register the transcribe-cpp compute backends. Must precede the first
    // model load, or every `Model::load` fails. (Handy: managers/transcription.rs:1886.)
    init_transcribe_backend();

    // Initialize session state machine (Soravo's authoritative state)
    let session_machine = Mutex::new(SessionMachine::default());
    // T14: local account state (signed-out by default; no identity synthesised).
    let account_machine = Mutex::new(AccountMachine::new());

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
        .manage(session_machine)
        .manage(account_machine)
        .setup(move |app| {
            // S3 — the model registry. Seeded from the bundled catalog, the
            // legacy model table, on-disk discovery and the HF cache.
            let model_manager = Arc::new(ModelManager::new(app.handle())?);
            app.manage(Arc::clone(&model_manager));

            // S4 — the transcription manager. Requires the model manager, and
            // `stream_router()` below is a method on this value.
            let transcription_manager = Arc::new(TranscriptionManager::new(
                app.handle(),
                Arc::clone(&model_manager),
            )?);
            app.manage(Arc::clone(&transcription_manager));

            // S5 — audio capture/VAD. Fed by the transcription stream router.
            let audio_manager = Arc::new(AudioRecordingManager::new(
                app.handle(),
                transcription_manager.stream_router(),
            )?);
            app.manage(Arc::clone(&audio_manager));

            // S6 — local history store. Runs its SQLite migrations at boot.
            let history_manager = Arc::new(HistoryManager::new(app.handle())?);
            app.manage(Arc::clone(&history_manager));

            // S7 — the dictation coordinator. MUST come after every manager
            // above: its worker thread resolves `state::<Arc<TranscriptionManager>>()`
            // and would die silently under `catch_unwind` if the state were absent.
            app.manage(TranscriptionCoordinator::new(app.handle().clone()));

            // S8 — the parsed CLI args, read by the tray on macOS.
            app.manage(cli_args);

            // S9 — secure-input state. A real monitor on macOS; a no-op elsewhere.
            // Must precede the first recording, which resolves this state.
            secure_input::init(app.handle());

            // S10 — install the global shortcut. Idempotent, and re-runnable from
            // the `initialize_shortcuts` command after an OS accessibility grant.
            if let Err(e) = initialize_shortcuts(app.handle().clone()) {
                log::warn!("initial global shortcut installation reported: {e}");
            }

            Ok(())
        })
        .invoke_handler(generate_handler![
            runtime_status,
            ping,
            emit_ping,
            session_snapshot,
            session_transition,
            session_reset,
            inject_text,
            load_settings,
            save_settings,
            update_microphone_settings,
            update_hotkey_settings,
            update_model_settings,
            get_account_snapshot,
            account_sign_in,
            account_sign_out,
            initialize_shortcuts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running soravo desktop");
}
