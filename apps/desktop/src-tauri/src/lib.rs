#![forbid(unsafe_code)]

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeStatus {
    version: &'static str,
    state: &'static str,
    local_only: bool,
}

#[tauri::command]
fn runtime_status() -> RuntimeStatus {
    RuntimeStatus {
        version: env!("CARGO_PKG_VERSION"),
        state: "idle",
        local_only: true,
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![runtime_status])
        .run(tauri::generate_context!())
        .expect("Soravo desktop runtime failed to start");
}
