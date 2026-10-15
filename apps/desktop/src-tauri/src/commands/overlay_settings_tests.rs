//! R1 overlay selectors: registration-completeness tests for the overlay
//! style + position command pairs (`get/change_overlay_style_setting`,
//! `get/change_overlay_position_setting` in `shortcut/mod.rs`).
//!
//! Background. The Handy-derived overlay backends existed with
//! `#[tauri::command]` but were absent from the Tauri `invoke_handler`, so
//! every Settings-UI overlay invocation would fail at runtime with an
//! unknown-command error — the same defect class as R1-GAP-017/R1-GAP-018/G2.
//! These tests lock the exposure shut.
//!
//! These tests read the real sources (`src/main.rs`, `shortcut/mod.rs`,
//! `commands/mod.rs`, `apps/desktop/src/ipc.ts`) rather than restating a
//! hand-kept list, so they fail if either side drifts. They are pure source
//! analysis: no Tauri runtime, no window, no model asset, no microphone, and
//! no network.

/// The overlay commands the frontend contract (`ipc.ts`) depends on.
///
/// Each name is asserted to (a) appear in the `invoke_handler!` list, (b)
/// exist as a `#[tauri::command]` in the Rust source, and (c) be invoked by
/// the `ipc.ts` wrappers. Registration without definition cannot compile;
/// definition without registration (or without a caller) is precisely the
/// defect class under test.
const OVERLAY_SETTINGS_COMMANDS: &[&str] = &[
    "get_overlay_style_setting",
    "change_overlay_style_setting",
    "get_overlay_position_setting",
    "change_overlay_position_setting",
];

const MAIN_RS: &str = include_str!("../main.rs");
const IPC_TS: &str = include_str!("../../../src/ipc.ts");
const COMMANDS_MOD_RS: &str = include_str!("mod.rs");
const SHORTCUT_MOD_RS: &str = include_str!("../shortcut/mod.rs");

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
/// shipped wrappers call the bridge.
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

/// The core regression: every overlay-style command is registered.
#[test]
fn overlay_commands_are_registered_in_invoke_handler() {
    let registered = registered_commands(MAIN_RS);
    let missing: Vec<&str> = OVERLAY_SETTINGS_COMMANDS
        .iter()
        .copied()
        .filter(|name| !registered.iter().any(|r| r == name))
        .collect();

    assert!(
        missing.is_empty(),
        "Overlay-style commands defined but NOT registered in main.rs \
         invoke_handler: {missing:?}. Every command the frontend ipc.ts \
         contract invokes must be registered or the invocation fails at runtime."
    );
}

/// Each registered overlay command also exists as a `#[tauri::command>`.
///
/// Registration without a definition cannot compile, so this guards the mirror
/// direction: it proves the names above are the real Rust command names (not
/// typos that happened to satisfy the first test through a stale list).
#[test]
fn overlay_commands_exist_as_tauri_commands() {
    for name in OVERLAY_SETTINGS_COMMANDS {
        let defined = SHORTCUT_MOD_RS.contains(&format!("fn {name}("));
        assert!(
            defined,
            "`{name}` is registered but has no command definition in \
             shortcut/mod.rs — registration and definition must agree."
        );
    }
    assert!(
        SHORTCUT_MOD_RS.contains("#[tauri::command]"),
        "shortcut/mod.rs must carry #[tauri::command] attributes"
    );
}

/// Each overlay command is re-exported through `commands/mod.rs` (the same
/// path the G2 rebind family uses), keeping one canonical import surface.
#[test]
fn overlay_commands_are_reexported_through_commands_mod() {
    for name in OVERLAY_SETTINGS_COMMANDS {
        assert!(
            COMMANDS_MOD_RS.contains(name),
            "commands/mod.rs must re-export `{name}`"
        );
    }
}

/// Each overlay command is actually invoked by the `ipc.ts` wrappers the
/// Settings UI calls — a registered command with no caller is dead surface.
#[test]
fn overlay_commands_are_invoked_by_the_frontend_contract() {
    let invoked = frontend_invocations(IPC_TS);
    for name in OVERLAY_SETTINGS_COMMANDS {
        assert!(
            invoked.iter().any(|invocation| invocation == name),
            "ipc.ts must invoke `{name}` (invoked: {invoked:?})"
        );
    }
}
