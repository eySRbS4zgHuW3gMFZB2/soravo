//! Prevents additional console window on Windows in release, DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::Parser;
use std::sync::{Arc, Mutex};
use tauri::{generate_handler, Manager};

use soravo_desktop_lib::{
    account::AccountMachine,
    auth_flow::AuthFlow,
    cli::CliArgs,
    commands::{account::*, history::*, initialize_shortcuts, models::*, soravo_ipc::*},
    managers::{
        audio::AudioRecordingManager,
        history::HistoryManager,
        model::ModelManager,
        transcription::{init_transcribe_backend, report_compute_devices, TranscriptionManager},
    },
    portable, secure_input,
    session::SessionMachine,
    TranscriptionCoordinator,
};
// `#[tauri::command]` macro-exports its per-command wrappers to the crate root.
// The other commands' wrappers arrive via the `account::*` / `history::*` /
// `soravo_ipc::*` globs; `initialize_shortcuts` is declared in `commands`
// itself, so both of its generated wrappers are imported by name here.
use soravo_desktop_lib::{__cmd__initialize_shortcuts, __tauri_command_name_initialize_shortcuts};

/// Route one raw deep-link/second-instance URL into the desktop auth flow.
fn route_auth_callback(app: &tauri::AppHandle, raw_url: &str) {
    soravo_desktop_lib::commands::account::handle_auth_callback_url(app, raw_url);
}

fn main() {
    // S0 — detect portable mode before Tauri initializes, so every app_data_dir
    // reader below resolves the same directory. (Handy: portable.rs:15.)
    portable::init();

    // S1 — parse the ported Handy CLI args. Note: this only yields a readable
    // `CliArgs` value; no flag has handling code in this repository.
    let cli_args = CliArgs::parse();

    // S2 — register the transcribe-cpp compute backends. Must precede the first
    // model load, or every `Model::load` fails. (Handy: managers/transcription.rs:1886.)
    // Registration alone stays on the startup path. Listing the devices to log
    // them is what first opens the GPU (macOS: loads ggml's Metal library,
    // compiled from source on a shader-cache miss — first launch after an
    // install/update), so it runs on a background thread instead of blocking
    // startup here. (Handy #2160: `report_compute_devices` off the startup
    // path; backend registration, model loading, device selection and
    // transcription are unchanged.)
    init_transcribe_backend();
    std::thread::spawn(report_compute_devices);

    // Initialize session state machine (Soravo's authoritative state)
    let session_machine = Mutex::new(SessionMachine::default());
    // T14: local account state (signed-out by default; no identity synthesised).
    let account_machine = Mutex::new(AccountMachine::new());
    // R1-GAP-021: desktop auth flow (PKCE handshake + keychain session).
    // Restores any persisted session into the snapshot without network.
    let auth_flow = AuthFlow::new();
    if let Ok(machine) = account_machine.lock() {
        soravo_desktop_lib::commands::account::restore_persisted_session(&auth_flow, &machine);
    }
    let auth_flow = Mutex::new(auth_flow);

    tauri::Builder::default()
        // Launch-stability prerequisite (G2 merge blocker): register the
        // deep-link plugin before setup() calls `app.deep_link().on_open_url`
        // (R1-GAP-021 auth-callback listener). Without this the app panics at
        // startup with `state() called before manage()` and exits 101.
        // Proven by T22 live runs on the R1 line; ported here verbatim.
        .plugin(tauri_plugin_deep_link::init())
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
        .plugin(tauri_plugin_single_instance::init(|app, args, _| {
            // R1-GAP-021: a second launch carrying the auth deep link arrives
            // here (custom schemes re-activate the single instance). Route
            // `soravo://` argv entries into the auth flow; ignore the rest.
            for arg in &args {
                if arg.starts_with("soravo://") {
                    route_auth_callback(app, arg);
                }
            }
            println!("Launched with args: {args:?}");
        }))
        .manage(session_machine)
        .manage(account_machine)
        .manage(auth_flow)
        .setup(move |app| {
            // Launch-stability prerequisite (G2 merge blocker): mount the
            // typed tauri-specta events before anything can emit them.
            // Without this, every typed `.emit()` (stream text/phase, history
            // updates) panics with "EventRegistry not found", killing the
            // streaming worker mid-dictation, dropping the leased engine, and
            // failing every repeat dictation with "Model is not loaded".
            // Proven by T22 live runs on the R1 line; ported here verbatim.
            tauri_specta::Builder::<tauri::Wry>::new()
                .events(tauri_specta::collect_events![
                    soravo_desktop_lib::managers::transcription::StreamTextEvent,
                    soravo_desktop_lib::managers::transcription::StreamPhaseEvent,
                    soravo_desktop_lib::managers::history::HistoryUpdatePayload,
                ])
                .mount_events(app);

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

            // R1-GAP-021 — deep-link listener for `soravo://auth/callback`.
            // The OS routes the custom scheme here (first instance); a second
            // instance is folded into the single-instance callback above.
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let callback_handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        route_auth_callback(&callback_handle, url.as_str());
                    }
                });
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
            account_begin_sign_in,
            account_refresh_session,
            account_sign_out,
            initialize_shortcuts,
            // R1-GAP-017 runtime re-verification: expose the existing
            // Handy-derived model contract. The R1-GAP-017 frontend wiring
            // (`ipc.ts` wrappers + `model-feed.ts`) invokes these names, so
            // without registration the settings model selector and the
            // download/selection path fail at runtime with an unknown-command
            // error. Registration only — no manager/command behavior changed,
            // and every one of these takes already-managed state
            // (`Arc<ModelManager>` / `Arc<TranscriptionManager>`).
            get_available_models,
            get_model_info,
            rescan_local_models,
            download_model,
            cancel_download,
            delete_model,
            set_active_model,
            get_current_model,
            get_transcription_model_status,
            is_model_loading,
            // R1-GAP-018: expose the existing Handy-derived history contract.
            // Registration only — no manager/command behavior changed.
            get_history_entries,
            toggle_history_entry_saved,
            delete_history_entry,
            retry_history_entry_transcription,
        ])
        .run(tauri::generate_context!())
        .expect("error while running soravo desktop");
}
