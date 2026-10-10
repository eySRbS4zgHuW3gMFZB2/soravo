//! Desktop account IPC — thin Soravo integration layer over `crate::account`.
//!
//! R1-GAP-021 wires the real Supabase PKCE/deep-link flow through here:
//! - `account_begin_sign_in` creates the PKCE handshake and returns the
//!   website URL the frontend opens in the SYSTEM browser. No password field
//!   exists on the desktop and no password crosses IPC.
//! - The `soravo://auth/callback` deep link is handled in Rust
//!   (`crate::auth_flow` + `main.rs` deep-link/single-instance routing), which
//!   exchanges the single-use code, stores tokens in the OS keychain, and
//!   emits `auth://changed`.
//! - `account_refresh_session` renews an expired access token from the stored
//!   refresh token; `account_sign_out` signs out server-side (best-effort)
//!   and wipes the keychain.
//!
//! When the desktop build lacks Supabase configuration, `account_begin_sign_in`
//! fails closed with an explicit message instead of minting any identity.
//! No Handy STT/audio code is touched.

use std::sync::Mutex;

use soravo_desktop_auth::TokenStore;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_opener::OpenerExt;

use crate::account::{AccountMachine, AccountSnapshot};
use crate::auth_flow::{self, AuthFlow};

/// Frontend account operation result (`AccountResult` in `ipc.ts`).
#[derive(Clone, Debug, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountResult {
    pub success: bool,
    pub message: String,
}

/// Begin-sign-in result (`BeginSignInResult` in `ipc.ts`). `url` must be
/// opened in the system browser (via the opener plugin), never embedded.
#[derive(Clone, Debug, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BeginSignInResult {
    pub success: bool,
    pub message: String,
    pub url: Option<String>,
}

/// Auth-changed event payload (`auth://changed`).
pub const AUTH_CHANGED_EVENT: &str = "auth://changed";

/// Read-only local account snapshot. Defaults to signed-out; never synthesises
/// an identity.
#[tauri::command]
#[specta::specta]
pub fn get_account_snapshot(account_machine: State<'_, Mutex<AccountMachine>>) -> AccountSnapshot {
    account_machine
        .lock()
        .map(|m| m.get_snapshot())
        .unwrap_or_default()
}

/// Start desktop sign-in. Returns the website URL for the system browser.
/// Emits nothing; completion arrives via the deep-link handler.
#[tauri::command]
#[specta::specta]
pub fn account_begin_sign_in(
    app: AppHandle,
    auth_flow: State<'_, Mutex<AuthFlow>>,
) -> Result<BeginSignInResult, String> {
    let flow = auth_flow
        .lock()
        .map_err(|e| format!("lock poisoned: {e}"))?;
    match flow.begin_sign_in() {
        Ok(begin) => {
            if let Err(e) = app.opener().open_url(&begin.url, None::<&str>) {
                flow.cancel_sign_in();
                return Err(format!("Could not open the browser for sign-in: {e}"));
            }
            Ok(BeginSignInResult {
                success: true,
                message: "Complete sign-in in your browser, then return here.".to_string(),
                url: Some(begin.url),
            })
        }
        Err(message) => Err(message),
    }
}

/// Legacy sign-in entry kept for the existing panel call shape: delegates to
/// the browser flow. The panel should migrate to `account_begin_sign_in`.
#[tauri::command]
#[specta::specta]
pub fn account_sign_in(
    app: AppHandle,
    auth_flow: State<'_, Mutex<AuthFlow>>,
) -> Result<AccountResult, String> {
    let flow = auth_flow
        .lock()
        .map_err(|e| format!("lock poisoned: {e}"))?;
    match flow.begin_sign_in() {
        Ok(begin) => {
            if let Err(e) = app.opener().open_url(&begin.url, None::<&str>) {
                flow.cancel_sign_in();
                return Err(format!("Could not open the browser for sign-in: {e}"));
            }
            Ok(AccountResult {
                success: true,
                message: "Complete sign-in in your browser, then return here.".to_string(),
            })
        }
        Err(message) => Err(message),
    }
}

/// Renew the access token from the stored refresh token.
#[tauri::command]
#[specta::specta]
pub async fn account_refresh_session(
    app: AppHandle,
    auth_flow: State<'_, Mutex<AuthFlow>>,
    account_machine: State<'_, Mutex<AccountMachine>>,
) -> Result<AccountResult, String> {
    // Snapshot owned pieces first: no mutex guard is held across awaits.
    let (http, store, config) = {
        let flow = auth_flow
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        (
            flow.http_client(),
            flow.token_store(),
            flow.config_snapshot(),
        )
    };
    let Some(config) = config else {
        return Err(
            "Desktop sign-in is not configured yet. Local dictation remains available.".to_string(),
        );
    };
    let renewed = auth_flow::refresh_stored_session(&http, &store, &config).await?;
    {
        let machine = account_machine
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        let keep_session_id = machine.get_snapshot().session_id.unwrap_or_default();
        let keep_entitlement = machine.get_snapshot().entitlement_active;
        let renewed_user_id = renewed.user_id.clone();
        machine.apply_signed_in(renewed_user_id, keep_session_id, keep_entitlement)?;
    }
    let _ = app.emit(AUTH_CHANGED_EVENT, ());
    Ok(AccountResult {
        success: true,
        message: "Session refreshed".to_string(),
    })
}

/// Clear local account state and wipe keychain tokens. Always available offline.
#[tauri::command]
#[specta::specta]
pub async fn account_sign_out(
    auth_flow: State<'_, Mutex<AuthFlow>>,
    account_machine: State<'_, Mutex<AccountMachine>>,
) -> Result<AccountResult, String> {
    // Snapshot owned pieces first: no mutex guard is held across awaits.
    let (http, store, config) = {
        let flow = auth_flow
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        (
            flow.http_client(),
            flow.token_store(),
            flow.config_snapshot(),
        )
    };
    auth_flow::sign_out_everywhere(&http, &store, config.as_ref()).await?;
    {
        let machine = account_machine
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        machine.sign_out()?;
    }
    Ok(AccountResult {
        success: true,
        message: "Signed out successfully".to_string(),
    })
}

/// Route one deep-link URL into the auth flow (shared by the deep-link plugin
/// event and the single-instance second-launch argv path).
pub fn handle_auth_callback_url(app: &AppHandle, raw_url: &str) {
    let exchange = {
        let state = app.state::<Mutex<AuthFlow>>();
        let flow = match state.lock() {
            Ok(flow) => flow,
            Err(_) => return,
        };
        match flow.take_exchange(raw_url) {
            Ok(exchange) => exchange,
            Err(e) => {
                log::warn!("desktop auth callback rejected: {e}");
                return;
            }
        }
    };
    let app_handle = app.clone();
    // Snapshot owned pieces before the spawn: no mutex is held across awaits.
    let (http, store, config) = {
        let state = app.state::<Mutex<AuthFlow>>();
        let flow = match state.lock() {
            Ok(flow) => flow,
            Err(_) => return,
        };
        (
            flow.http_client(),
            flow.token_store(),
            flow.config_snapshot(),
        )
    };
    let Some(config) = config else {
        log::warn!("desktop auth callback ignored: not configured");
        return;
    };
    tauri::async_runtime::spawn(async move {
        let machine_state = app_handle.state::<Mutex<AccountMachine>>();
        let established = match auth_flow::establish_session(&http, &store, &config, exchange).await
        {
            Ok(established) => established,
            Err(e) => {
                log::warn!("desktop auth exchange failed: {e}");
                return;
            }
        };
        if let Ok(machine) = machine_state.lock() {
            let _ = machine.apply_signed_in(
                established.user_id,
                established.session_public_id,
                established.entitlement_active,
            );
        }
        let _ = app_handle.emit(AUTH_CHANGED_EVENT, ());
    });
}

/// Restore a persisted session into the snapshot at startup (no network):
/// a valid unexpired keychain session signs in optimistically; an expired
/// one with a refresh token marks `NeedsRefresh`.
pub fn restore_persisted_session(auth_flow: &AuthFlow, account_machine: &AccountMachine) {
    let stored = match auth_flow.store().load_session() {
        Ok(stored) => stored,
        Err(_) => return,
    };
    let Some(stored) = stored else { return };
    let tokens = stored.into_token_set();
    let now = soravo_desktop_auth::callback::unix_now();
    match tokens.refresh_decision(now) {
        soravo_desktop_auth::session::RefreshDecision::Valid => {
            let active = matches!(
                auth_flow::offline_verdict(now),
                soravo_desktop_auth::offline::OfflineVerdict::OfflineGrace { active: true }
            );
            let _ = account_machine.apply_signed_in(tokens.user_id.clone(), String::new(), active);
        }
        soravo_desktop_auth::session::RefreshDecision::RefreshNow => {
            let _ = account_machine.apply_needs_refresh();
        }
        soravo_desktop_auth::session::RefreshDecision::Reauthenticate => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_defaults_to_signed_out_without_identity() {
        let machine = AccountMachine::new();
        let snapshot = machine.get_snapshot();
        assert_eq!(snapshot.state, crate::account::AccountState::SignedOut);
        assert!(snapshot.user_id.is_none());
        assert!(!snapshot.entitlement_active);
    }

    #[test]
    fn sign_out_clears_local_state() {
        let machine = AccountMachine::new();
        assert!(machine.sign_out().is_ok());
        let snapshot = machine.get_snapshot();
        assert_eq!(snapshot.state, crate::account::AccountState::SignedOut);
    }

    #[test]
    fn apply_signed_in_records_identity_summary() {
        let machine = AccountMachine::new();
        machine
            .apply_signed_in("user-1".to_string(), "ses_1".to_string(), true)
            .unwrap();
        let snapshot = machine.get_snapshot();
        assert_eq!(snapshot.state, crate::account::AccountState::SignedIn);
        assert_eq!(snapshot.user_id.as_deref(), Some("user-1"));
        assert!(snapshot.entitlement_active);
    }

    #[test]
    fn auth_changed_event_name_is_stable() {
        assert_eq!(AUTH_CHANGED_EVENT, "auth://changed");
    }
}
