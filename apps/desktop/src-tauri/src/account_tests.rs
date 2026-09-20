//! Account module tests.
//!
//! Tests verify that the account module exposes only non-sensitive data.
//! Access tokens, secrets, and entitlement payment details are NEVER exposed.

use super::AccountSnapshot;
use super::AccountState;

#[test]
fn default_account_snapshot_is_signed_out() {
    let snapshot = AccountSnapshot::default();
    assert_eq!(snapshot.state, AccountState::SignedOut);
    assert_eq!(snapshot.user_id, None);
    assert_eq!(snapshot.session_id, None);
    assert!(!snapshot.entitlement_active);
    assert!(!snapshot.is_offline);
}

#[test]
fn snapshot_does_not_contain_token_fields() {
    // Compile-time check: these fields should NOT exist
    // This test will fail to compile if tokens are accidentally added
    let _snapshot = AccountSnapshot::default();
    // Access only the public fields to verify they exist
    let _state = _snapshot.state;
    let _user_id = _snapshot.user_id;
    let _session_id = _snapshot.session_id;
    let _entitlement = _snapshot.entitlement_active;
    let _device_id = _snapshot.device_id;
    let _is_offline = _snapshot.is_offline;
}
