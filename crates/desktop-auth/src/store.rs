//! Secure token storage.
//!
//! Contract: session material persists ONLY in the OS credential store
//! (macOS Keychain, Windows Credential Manager, Linux Secret Service via the
//! `keyring` crate). Plaintext files, `localStorage`, Tauri `store` plugin
//! JSON, logs, and IPC payloads are NEVER token storage.
//!
//! [`MemoryTokenStore`] is the deterministic test double (and the fallback
//! shape if no OS store exists); [`KeyringTokenStore`] is the production
//! backend.

use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use super::session::TokenSet;

/// Keychain service namespace for all Soravo desktop secrets.
pub const KEYCHAIN_SERVICE: &str = "com.soravo.desktop";
const SESSION_ACCOUNT: &str = "supabase-session";
const DEVICE_ACCOUNT: &str = "device-public-id";
const ENTITLEMENT_CACHE_ACCOUNT: &str = "entitlement-cache";

/// Persist the non-secret entitlement cache in the keychain (encrypted at
/// rest) so no settings store or plaintext file is introduced for auth state.
pub fn save_entitlement_cache(payload_json: &str) -> Result<(), StoreError> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, ENTITLEMENT_CACHE_ACCOUNT)
        .map_err(|e| StoreError::Backend(format!("keychain init failed: {e:?}")))?;
    entry
        .set_password(payload_json)
        .map_err(|e| StoreError::Backend(format!("keychain write failed: {e:?}")))
}

/// Load the entitlement cache JSON, if present.
pub fn load_entitlement_cache() -> Result<Option<String>, StoreError> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, ENTITLEMENT_CACHE_ACCOUNT)
        .map_err(|e| StoreError::Backend(format!("keychain init failed: {e:?}")))?;
    match entry.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(StoreError::Backend(format!("keychain read failed: {e:?}"))),
    }
}

/// Persisted session bundle (JSON-encoded inside ONE keychain entry so the
/// access/refresh pair can only ever be written and wiped atomically).
#[derive(Clone, Debug, Serialize, Deserialize, Zeroize)]
pub struct StoredSession {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: u64,
    pub user_id: String,
}

impl From<&TokenSet> for StoredSession {
    fn from(t: &TokenSet) -> Self {
        Self {
            access_token: t.access_token.clone(),
            refresh_token: t.refresh_token.clone(),
            expires_at: t.expires_at,
            user_id: t.user_id.clone(),
        }
    }
}

impl StoredSession {
    pub fn into_token_set(self) -> TokenSet {
        TokenSet {
            access_token: self.access_token,
            refresh_token: self.refresh_token,
            expires_at: self.expires_at,
            user_id: self.user_id,
        }
    }
}

#[derive(Debug)]
pub enum StoreError {
    Backend(String),
    Corrupt,
}

impl std::fmt::Display for StoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StoreError::Backend(_) => f.write_str("secure storage unavailable"),
            StoreError::Corrupt => f.write_str("stored session is corrupt"),
        }
    }
}

/// Token storage contract. Errors are deliberately coarse so failure paths
/// cannot leak store internals to the UI.
pub trait TokenStore {
    fn save_session(&self, session: &StoredSession) -> Result<(), StoreError>;
    fn load_session(&self) -> Result<Option<StoredSession>, StoreError>;
    /// Best-effort wipe; missing entries count as wiped.
    fn clear_session(&self) -> Result<(), StoreError>;
    fn save_device_id(&self, device_id: &str) -> Result<(), StoreError>;
    fn load_device_id(&self) -> Result<Option<String>, StoreError>;
}

/// In-memory store: deterministic test double. NOT for production.
#[derive(Default)]
pub struct MemoryTokenStore {
    inner: std::sync::Mutex<MemoryState>,
}

#[derive(Default)]
struct MemoryState {
    session: Option<StoredSession>,
    device_id: Option<String>,
}

impl MemoryTokenStore {
    pub fn new() -> Self {
        Self::default()
    }
}

impl TokenStore for MemoryTokenStore {
    fn save_session(&self, session: &StoredSession) -> Result<(), StoreError> {
        self.inner
            .lock()
            .map_err(|_| StoreError::Backend("lock".to_string()))?
            .session = Some(session.clone());
        Ok(())
    }

    fn load_session(&self) -> Result<Option<StoredSession>, StoreError> {
        Ok(self
            .inner
            .lock()
            .map_err(|_| StoreError::Backend("lock".to_string()))?
            .session
            .clone())
    }

    fn clear_session(&self) -> Result<(), StoreError> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| StoreError::Backend("lock".to_string()))?;
        if let Some(session) = guard.session.as_mut() {
            session.zeroize();
        }
        guard.session = None;
        Ok(())
    }

    fn save_device_id(&self, device_id: &str) -> Result<(), StoreError> {
        self.inner
            .lock()
            .map_err(|_| StoreError::Backend("lock".to_string()))?
            .device_id = Some(device_id.to_string());
        Ok(())
    }

    fn load_device_id(&self) -> Result<Option<String>, StoreError> {
        Ok(self
            .inner
            .lock()
            .map_err(|_| StoreError::Backend("lock".to_string()))?
            .device_id
            .clone())
    }
}

/// OS keychain store (production backend).
#[derive(Clone)]
pub struct KeyringTokenStore {
    service: String,
}

impl KeyringTokenStore {
    pub fn new() -> Self {
        Self {
            service: KEYCHAIN_SERVICE.to_string(),
        }
    }

    fn entry(&self, account: &str) -> Result<keyring::Entry, StoreError> {
        keyring::Entry::new(&self.service, account)
            .map_err(|e| StoreError::Backend(format!("keychain init failed: {e:?}")))
    }

    fn read_secret(account_entry: &keyring::Entry) -> Result<Option<String>, StoreError> {
        match account_entry.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(StoreError::Backend(format!("keychain read failed: {e:?}"))),
        }
    }
}

impl Default for KeyringTokenStore {
    fn default() -> Self {
        Self::new()
    }
}

impl TokenStore for KeyringTokenStore {
    fn save_session(&self, session: &StoredSession) -> Result<(), StoreError> {
        let payload = serde_json::to_string(session).map_err(|_| StoreError::Corrupt)?;
        let entry = self.entry(SESSION_ACCOUNT)?;
        entry
            .set_password(&payload)
            .map_err(|e| StoreError::Backend(format!("keychain write failed: {e:?}")))?;
        // Drop the serialized secret from memory immediately.
        let mut owned = payload.into_bytes();
        owned.zeroize();
        Ok(())
    }

    fn load_session(&self) -> Result<Option<StoredSession>, StoreError> {
        let entry = self.entry(SESSION_ACCOUNT)?;
        match Self::read_secret(&entry)? {
            None => Ok(None),
            Some(payload) => {
                let mut bytes = payload.into_bytes();
                let parsed: StoredSession =
                    serde_json::from_slice(&bytes).map_err(|_| StoreError::Corrupt)?;
                bytes.zeroize();
                Ok(Some(parsed))
            }
        }
    }

    fn clear_session(&self) -> Result<(), StoreError> {
        let entry = self.entry(SESSION_ACCOUNT)?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(StoreError::Backend(format!(
                "keychain delete failed: {e:?}"
            ))),
        }
    }

    fn save_device_id(&self, device_id: &str) -> Result<(), StoreError> {
        let entry = self.entry(DEVICE_ACCOUNT)?;
        entry
            .set_password(device_id)
            .map_err(|e| StoreError::Backend(format!("keychain write failed: {e:?}")))?;
        Ok(())
    }

    fn load_device_id(&self) -> Result<Option<String>, StoreError> {
        let entry = self.entry(DEVICE_ACCOUNT)?;
        Self::read_secret(&entry)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> StoredSession {
        StoredSession {
            access_token: "access-123".to_string(),
            refresh_token: "refresh-456".to_string(),
            expires_at: 9_999_999,
            user_id: "user-1".to_string(),
        }
    }

    #[test]
    fn save_load_round_trip() {
        let store = MemoryTokenStore::new();
        assert!(store.load_session().unwrap().is_none());
        store.save_session(&sample()).unwrap();
        let loaded = store.load_session().unwrap().expect("session stored");
        assert_eq!(loaded.access_token, "access-123");
        assert_eq!(loaded.refresh_token, "refresh-456");
        assert_eq!(loaded.expires_at, 9_999_999);
        assert_eq!(loaded.user_id, "user-1");
    }

    #[test]
    fn logout_wipes_session_but_keeps_device() {
        let store = MemoryTokenStore::new();
        store.save_session(&sample()).unwrap();
        store.save_device_id("dev_abc").unwrap();
        store.clear_session().unwrap();
        assert!(store.load_session().unwrap().is_none());
        // Device identity survives logout (non-secret tracking id).
        assert_eq!(store.load_device_id().unwrap().as_deref(), Some("dev_abc"));
        // Clearing twice is not an error.
        store.clear_session().unwrap();
    }

    #[test]
    fn device_id_round_trip() {
        let store = MemoryTokenStore::new();
        assert!(store.load_device_id().unwrap().is_none());
        store.save_device_id("dev_xyz").unwrap();
        assert_eq!(store.load_device_id().unwrap().as_deref(), Some("dev_xyz"));
    }

    #[test]
    fn token_set_conversion_preserves_fields() {
        let tokens = crate::session::TokenSet {
            access_token: "a".to_string(),
            refresh_token: "r".to_string(),
            expires_at: 42,
            user_id: "u".to_string(),
        };
        let stored = StoredSession::from(&tokens);
        let back = stored.into_token_set();
        assert_eq!(back.access_token, "a");
        assert_eq!(back.user_id, "u");
    }

    /// Live keychain round-trip. Ignored by default: requires a real OS
    /// credential store (absent on headless CI) and touches user state, so it
    /// must never gate deterministic suites. Run explicitly:
    /// `cargo test -p soravo-desktop-auth -- --ignored`.
    #[test]
    #[ignore]
    fn live_keychain_round_trip() {
        let store = KeyringTokenStore::new();
        let unique = format!("probe-{}", crate::device::new_device_public_id());
        store.save_device_id(&unique).unwrap();
        assert_eq!(
            store.load_device_id().unwrap().as_deref(),
            Some(unique.as_str())
        );
        store.clear_session().unwrap(); // must not fail when absent
        assert!(store.load_session().unwrap().is_none());
    }
}
