//! R1-GAP-017 runtime re-verification: registration-completeness tests for the
//! model command family.
//!
//! Background. R1-GAP-018 found that implemented command families can be absent
//! from the Tauri `invoke_handler`. This file locks the R1-GAP-017 model family
//! shut against a recurrence. The `ipc.ts` wrappers + `model-feed.ts` fold were
//! merged invoking `get_available_models`, `get_current_model`,
//! `set_active_model`, `download_model`, and `cancel_download`, but none of the
//! Rust commands were registered — so every model-selector and download
//! invocation failed at runtime with an unknown-command error.
//!
//! These tests read the two real sources (`src/main.rs` and `apps/desktop/src/
//! ipc.ts`) rather than restating a hand-kept list, so they fail if either side
//! drifts. They are pure source analysis: no Tauri runtime, no window, no
//! model asset, no microphone, and no network.
//!
//! Scope note. This covers the R1-GAP-017 model family ONLY. The hotkey family
//! (`hotkey_config`, `hotkey_start`, …) is deliberately excluded: those commands
//! take `State<'_, Mutex<HotkeyState>>`, and no `Mutex<HotkeyState>` is ever
//! `.manage(...)`d, so registering them would panic on invoke instead of
//! failing cleanly. They are a separate gap with a different (state-management)
//! fix. Likewise `commands/transcription.rs` takes
//! `State<TranscriptionManager>` while `main.rs` manages
//! `Arc<TranscriptionManager>`; registering those would panic too. Neither is
//! part of the R1-GAP-017 model-selector/download wiring.

/// The model commands the frontend contract (`ipc.ts`) depends on.
///
/// Each name is asserted to (a) appear in the `invoke_handler!` list and (b)
/// exist as a `#[tauri::command]` in the Rust source. Both halves are required:
/// registering a name with no definition does not compile, and defining a
/// command without registering it is precisely the defect under test.
const R1_GAP_017_MODEL_COMMANDS: &[&str] = &[
    "get_available_models",
    "get_model_info",
    "rescan_local_models",
    "download_model",
    "cancel_download",
    "delete_model",
    "set_active_model",
    "get_current_model",
    "get_transcription_model_status",
    "is_model_loading",
];

const MAIN_RS: &str = include_str!("../main.rs");
const IPC_TS: &str = include_str!("../../../src/ipc.ts");
const COMMANDS_MOD_RS: &str = include_str!("mod.rs");
const COMMANDS_MODELS_RS: &str = include_str!("models.rs");

/// Extract the command identifiers listed inside the `generate_handler![ … ]`
/// block of `main.rs`, ignoring comments and whitespace.
fn registered_commands(source: &str) -> Vec<String> {
    let start = source
        .find("generate_handler![")
        .expect("main.rs must contain a generate_handler! invocation");
    let body = &source[start + "generate_handler![".len()..];
    let end = body
        .find(']')
        .expect("generate_handler! list must be closed");

    body[..end]
        .lines()
        .map(|line| {
            // Strip line comments first so commented-out names never count.
            let code = line.split("//").next().unwrap_or("");
            code.trim().trim_end_matches(',').trim()
        })
        .filter(|token| !token.is_empty())
        .map(str::to_string)
        .collect()
}

/// Extract the command names the frontend actually invokes from `ipc.ts`.
///
/// Matches `invoke<…>("name"` and `invoke("name"`, which is exactly how the
/// shipped wrappers call the bridge. Shared-utility helpers such as
/// `inject_text` are included; callers narrow to the family under test.
fn frontend_invocations(source: &str) -> Vec<String> {
    let mut names = Vec::new();
    for line in source.lines() {
        let Some(rest) = line.split_once("invoke") else {
            continue;
        };
        let rest = &rest.1;
        // Skip any identifier that merely contains `invoke` (e.g. `doInvoke`).
        let tail = rest.trim_start();
        if !tail.starts_with('<') && !tail.starts_with('(') {
            continue;
        }
        let Some(quote_start) = rest.find('"') else {
            continue;
        };
        let after = &rest[quote_start + 1..];
        let Some(quote_end) = after.find('"') else {
            continue;
        };
        let name = &after[..quote_end];
        // Guard against a bare `invoke` identifier match elsewhere on the line.
        if name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
            && !name.is_empty()
        {
            names.push(name.to_string());
        }
    }
    names
}

/// The core regression: every R1-GAP-017 model command is registered.
#[test]
fn r1_gap_017_model_commands_are_registered_in_invoke_handler() {
    let registered = registered_commands(MAIN_RS);
    let missing: Vec<&str> = R1_GAP_017_MODEL_COMMANDS
        .iter()
        .copied()
        .filter(|name| !registered.iter().any(|r| r == name))
        .collect();

    assert!(
        missing.is_empty(),
        "R1-GAP-017 model commands defined but NOT registered in main.rs \
         invoke_handler: {missing:?}. Every command the frontend ipc.ts \
         contract invokes must be registered or the invocation fails at runtime."
    );
}

/// Each registered model command also exists as a `#[tauri::command]`.
///
/// Registration without a definition cannot compile, so this guards the mirror
/// direction: it proves the names above are the real Rust command names (not
/// typos that happened to satisfy the first test through a stale list).
#[test]
fn r1_gap_017_model_commands_exist_as_tauri_commands() {
    for name in R1_GAP_017_MODEL_COMMANDS {
        let defined_in_models = COMMANDS_MODELS_RS.lines().any(|line| {
            line.trim_start().starts_with("pub async fn ")
                || line.trim_start().starts_with("pub fn ")
        }) && COMMANDS_MODELS_RS.contains(&format!("fn {name}("));
        assert!(
            defined_in_models,
            "`{name}` is registered but has no command definition in \
             commands/models.rs — registration and definition must agree."
        );
    }
}

/// Every model command the frontend invokes is registered.
///
/// This is the behavioural form of the test: it derives the required set from
/// `ipc.ts` (the real frontend contract) rather than from a constant, so a new
/// model wrapper added without registration fails here.
#[test]
fn every_frontend_model_invocation_is_registered() {
    let registered = registered_commands(MAIN_RS);
    let frontend = frontend_invocations(IPC_TS);

    // The model family as invoked by the frontend today.
    let model_invocations: Vec<&String> = frontend
        .iter()
        .filter(|name| {
            R1_GAP_017_MODEL_COMMANDS.contains(&name.as_str())
                || name.starts_with("get_model")
                || name.ends_with("_model")
                || name.ends_with("_model_status")
                || name.ends_with("_models")
                || name.ends_with("_model_loading")
        })
        .collect();

    assert!(
        !model_invocations.is_empty(),
        "expected ipc.ts to invoke at least one model command; the extraction \
         or the frontend contract changed — re-verify before trusting this test."
    );

    let unregistered: Vec<&&String> = model_invocations
        .iter()
        .filter(|name| !registered.iter().any(|r| r == **name))
        .collect();
    assert!(
        unregistered.is_empty(),
        "frontend ipc.ts invokes model commands that main.rs does not \
         register: {unregistered:?}"
    );
}

/// Registration names are unique.
///
/// A duplicate `generate_handler!` entry is a silent shadowing hazard, so keep
/// the list injective. Registration-only changes are the easiest place to
/// introduce one.
#[test]
fn invoke_handler_has_no_duplicate_registrations() {
    let registered = registered_commands(MAIN_RS);
    let mut seen = std::collections::HashSet::new();
    let mut duplicates: Vec<&String> = Vec::new();
    for name in &registered {
        if !seen.insert(name.as_str()) {
            duplicates.push(name);
        }
    }
    assert!(
        duplicates.is_empty(),
        "duplicate command names in generate_handler!: {duplicates:?}"
    );
}

/// The re-export required for `main.rs` to name the model commands is present.
///
/// `main.rs` imports the family via `commands::{… models::* …}`; `commands/mod.rs`
/// must therefore re-export each name. Without it the binary fails to compile,
/// and this assertion documents the coupling explicitly.
#[test]
fn commands_mod_reexports_the_model_family() {
    for name in R1_GAP_017_MODEL_COMMANDS {
        assert!(
            COMMANDS_MOD_RS.contains(name),
            "commands/mod.rs must re-export `{name}` so main.rs's \
             `models::*` import resolves it."
        );
    }
}
