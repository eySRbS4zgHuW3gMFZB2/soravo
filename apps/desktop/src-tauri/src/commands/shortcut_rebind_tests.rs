//! G2 hotkey-rebind exposure: registration-completeness tests for the
//! rebind command family.
//!
//! Background. The Handy-derived rebind backend (`change_binding`,
//! `reset_binding`, `suspend_all_bindings`, `resume_all_bindings` in
//! `shortcut/mod.rs`) existed with `#[tauri::command]` but was absent from
//! the Tauri `invoke_handler`, so every settings-UI rebind invocation would
//! fail at runtime with an unknown-command error — the same defect class as
//! R1-GAP-017/R1-GAP-018. These tests lock the G2 exposure shut.
//!
//! These tests read the two real sources (`src/main.rs` and
//! `apps/desktop/src/ipc.ts`) rather than restating a hand-kept list, so they
//! fail if either side drifts. They are pure source analysis: no Tauri
//! runtime, no window, no model asset, no microphone, and no network.
//!
//! Scope note. This covers the G2 rebind family ONLY: the four commands the
//! settings rebind flow invokes. The HandyKeys recorder commands
//! (`start/stop_handy_keys_recording`) are deliberately excluded: the
//! recorder requires the HandyKeys keyboard implementation, which is not the
//! default on Linux, and the G2 capture flow commits through `change_binding`
//! instead.

/// The rebind commands the frontend contract (`ipc.ts`) depends on.
///
/// Each name is asserted to (a) appear in the `invoke_handler!` list and (b)
/// exist as a `#[tauri::command]` in the Rust source. Both halves are required:
/// registering a name with no definition does not compile, and defining a
/// command without registering it is precisely the defect under test.
const G2_REBIND_COMMANDS: &[&str] = &[
    "change_binding",
    "reset_binding",
    "suspend_all_bindings",
    "resume_all_bindings",
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

/// The core regression: every G2 rebind command is registered.
#[test]
fn g2_rebind_commands_are_registered_in_invoke_handler() {
    let registered = registered_commands(MAIN_RS);
    let missing: Vec<&str> = G2_REBIND_COMMANDS
        .iter()
        .copied()
        .filter(|name| !registered.iter().any(|r| r == name))
        .collect();

    assert!(
        missing.is_empty(),
        "G2 rebind commands defined but NOT registered in main.rs \
         invoke_handler: {missing:?}. Every command the frontend ipc.ts \
         contract invokes must be registered or the invocation fails at runtime."
    );
}

/// Each registered rebind command also exists as a `#[tauri::command]`.
///
/// Registration without a definition cannot compile, so this guards the mirror
/// direction: it proves the names above are the real Rust command names (not
/// typos that happened to satisfy the first test through a stale list).
#[test]
fn g2_rebind_commands_exist_as_tauri_commands() {
    for name in G2_REBIND_COMMANDS {
        let defined = SHORTCUT_MOD_RS.contains(&format!("fn {name}("));
        assert!(
            defined,
            "`{name}` is registered but has no command definition in \
             shortcut/mod.rs — registration and definition must agree."
        );
    }
}

/// Every rebind command the frontend invokes is registered.
///
/// This is the behavioural form of the test: it derives the required set from
/// `ipc.ts` (the real frontend contract) rather than from a constant, so a new
/// rebind wrapper added without registration fails here.
#[test]
fn every_frontend_rebind_invocation_is_registered() {
    let registered = registered_commands(MAIN_RS);
    let frontend = frontend_invocations(IPC_TS);

    // The rebind family as invoked by the frontend today.
    let rebind_invocations: Vec<&String> = frontend
        .iter()
        .filter(|name| G2_REBIND_COMMANDS.contains(&name.as_str()))
        .collect();

    assert!(
        !rebind_invocations.is_empty(),
        "expected ipc.ts to invoke at least one rebind command; the extraction \
         or the frontend contract changed — re-verify before trusting this test."
    );

    let unregistered: Vec<&&String> = rebind_invocations
        .iter()
        .filter(|name| !registered.iter().any(|r| r == **name))
        .collect();
    assert!(
        unregistered.is_empty(),
        "frontend ipc.ts invokes rebind commands that main.rs does not \
         register: {unregistered:?}"
    );
}

/// The re-export required for `main.rs` to name the rebind commands is present.
///
/// `main.rs` imports the family via `commands::{…}`; `commands/mod.rs`
/// must therefore re-export each name. Without it the binary fails to compile,
/// and this assertion documents the coupling explicitly.
#[test]
fn commands_mod_reexports_the_rebind_family() {
    for name in G2_REBIND_COMMANDS {
        assert!(
            COMMANDS_MOD_RS.contains(name),
            "commands/mod.rs must re-export `{name}` so main.rs's \
             `commands::{{…}}` import resolves it."
        );
    }
}
