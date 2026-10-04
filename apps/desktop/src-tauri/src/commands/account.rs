//! Desktop account IPC — thin Soravo integration layer over `crate::account`.
//!
//! T14 scope note: this adapter exposes exactly the three commands the
//! frontend calls (`get_account_snapshot`, `account_sign_in`,
//! `account_sign_out`) using the existing local `AccountMachine` state.
//! Full Desktop <-> Supabase authentication (PKCE/deep-link flow, token
//! storage, server entitlement refresh) is NOT implemented here: it requires
//! a product decision on the sign-in flow plus Supabase provider
//! configuration, recorded as a STOP in T14-FUNCTIONAL-COMPLETION-REPORT.md.
//! `account_sign_in` therefore fails closed with an explicit message instead
//! of minting a placeholder identity. No Handy STT/audio code is touched.

use std::sync::Mutex;

use tauri::State;

use crate::account::{AccountMachine, AccountSnapshot};

/// Frontend account operation result (`AccountResult` in `ipc.ts`).
#[derive(Clone, Debug, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountResult {
    pub success: bool,
    pub message: String,
}

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

/// Desktop sign-in is not yet configured (see module docs). Fails closed so
/// the panel surfaces a message instead of wedging or trusting a fake user.
#[tauri::command]
#[specta::specta]
pub fn account_sign_in(
    _account_machine: State<'_, Mutex<AccountMachine>>,
) -> Result<AccountResult, String> {
    Err("Desktop sign-in is not configured yet. Local dictation remains available.".to_string())
}

/// Clear local account state. Always available offline.
#[tauri::command]
#[specta::specta]
pub fn account_sign_out(
    account_machine: State<'_, Mutex<AccountMachine>>,
) -> Result<AccountResult, String> {
    let machine = account_machine
        .lock()
        .map_err(|e| format!("lock poisoned: {e}"))?;
    machine.sign_out()?;
    Ok(AccountResult {
        success: true,
        message: "Signed out successfully".to_string(),
    })
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
}
