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
