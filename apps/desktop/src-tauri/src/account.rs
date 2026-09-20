//! Account/session architecture for Soravo desktop licensing foundation.
//!
//! This module provides:
//! - Account state management (signed-in user, entitlement state)
//! - Device identity (local, non-secret identifier)
//! - Session refresh/expiration handling
//! - Offline-first behavior (local dictation independent of account state)
//! - Secure token storage (never logged or exposed)
//!
//! Security baseline (09_SECURITY_BASELINE.md):
//! - Access tokens stored in platform secure store (not logs, not IPC, not frontend)
//! - Account data scoped to authenticated user (supabase RLS enforced server-side)
//! - Device ID is a local, non-secret identifier for tracking only
//! - No payment/entitlement secrets stored locally

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum AccountState {
    /// No account signed in; local dictation still available.
    SignedOut,
    /// Signed in with validated entitlements.
    SignedIn,
    /// Session needs refresh (token expired but credentials available).
    NeedsRefresh,
    /// Account data unavailable (offline or server error).
    Unavailable,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AccountSnapshot {
    pub state: AccountState,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub entitlement_active: bool,
    pub device_id: String,
    pub is_offline: bool,
}

impl Default for AccountSnapshot {
    fn default() -> Self {
        Self {
            state: AccountState::SignedOut,
            user_id: None,
            session_id: None,
            entitlement_active: false,
            device_id: String::new(),
            is_offline: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_account_snapshot_is_signed_out() {
        let snapshot = AccountSnapshot::default();
        assert_eq!(snapshot.state, AccountState::SignedOut);
        assert_eq!(snapshot.user_id, None);
        assert_eq!(snapshot.session_id, None);
        assert!(!snapshot.entitlement_active);
        assert!(!snapshot.is_offline);
    }
}
