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
use std::sync::Mutex;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize, PartialEq, Eq, specta::Type)]
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

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize, specta::Type)]
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

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EntitlementInfo {
    pub product: String,
    pub plan: String,
    pub status: String,
    pub active: bool,
    pub expires_at: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DeviceRecord {
    pub device_public_id: String,
    pub platform: String,
    pub app_version: String,
    pub first_seen_at: String,
    pub last_seen_at: String,
    pub revoked: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionRecord {
    pub session_public_id: String,
    pub created_at: String,
    pub last_seen_at: String,
    pub revoked: bool,
}

#[derive(Default)]
pub struct AccountMachine {
    snapshot: Mutex<AccountSnapshot>,
}

impl AccountMachine {
    pub fn new() -> Self {
        Self {
            snapshot: Mutex::new(AccountSnapshot::default()),
        }
    }

    pub fn get_snapshot(&self) -> AccountSnapshot {
        self.snapshot.lock().map(|m| m.clone()).unwrap_or_default()
    }

    /// T14: legacy local placeholder — NOT wired to any IPC command and NOT
    /// used as an identity source (it synthesises a static user id). Kept so
    /// existing unit/manual references still compile; real sign-in requires
    /// the Supabase PKCE decision recorded in the T14 report.
    pub fn request_sign_in(&self) -> Result<String, String> {
        let mut snapshot = self
            .snapshot
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        snapshot.state = AccountState::SignedIn;
        snapshot.user_id = Some("user-123".to_string());
        snapshot.session_id = Some("session-456".to_string());
        snapshot.entitlement_active = true;
        snapshot.is_offline = false;
        Ok("Sign in initiated".to_string())
    }

    pub fn sign_out(&self) -> Result<String, String> {
        let mut snapshot = self
            .snapshot
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        snapshot.state = AccountState::SignedOut;
        snapshot.user_id = None;
        snapshot.session_id = None;
        snapshot.entitlement_active = false;
        Ok("Signed out successfully".to_string())
    }

    /// Apply a freshly established Supabase session (R1-GAP-021). Tokens stay
    /// in the OS keychain; only the non-secret identity summary lands here.
    pub fn apply_signed_in(
        &self,
        user_id: String,
        session_public_id: String,
        entitlement_active: bool,
    ) -> Result<(), String> {
        let mut snapshot = self
            .snapshot
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        snapshot.state = AccountState::SignedIn;
        snapshot.user_id = Some(user_id);
        snapshot.session_id = Some(session_public_id);
        snapshot.entitlement_active = entitlement_active;
        snapshot.is_offline = false;
        Ok(())
    }

    /// Mark the session as needing a refresh (expired access token, refresh
    /// token still stored). Local dictation remains available.
    pub fn apply_needs_refresh(&self) -> Result<(), String> {
        let mut snapshot = self
            .snapshot
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        snapshot.state = AccountState::NeedsRefresh;
        Ok(())
    }

    pub fn set_offline(&self) {
        let mut snapshot = self.snapshot.lock().unwrap();
        snapshot.is_offline = true;
        snapshot.state = AccountState::Unavailable;
    }
}
