//! Authenticated session tokens held by the desktop.
//!
//! Tokens are secret material: they are `zeroize`d on drop, never logged
//! (no `Display`, redacted `Debug`), and persisted only through
//! [`crate::store::TokenStore`] (OS keychain), never via IPC payloads or
//! plaintext files.

use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Supabase session as held by the desktop after a successful exchange.
#[derive(Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct TokenSet {
    pub access_token: String,
    pub refresh_token: String,
    /// Unix seconds when `access_token` expires.
    pub expires_at: u64,
    pub user_id: String,
}

impl std::fmt::Debug for TokenSet {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TokenSet")
            .field("access_token", &"<redacted>")
            .field("refresh_token", &"<redacted>")
            .field("expires_at", &self.expires_at)
            .field("user_id", &self.user_id)
            .finish()
    }
}

impl TokenSet {
    /// `true` when the access token is expired (or expires within `leeway`
    /// seconds to absorb clock skew; 60 s default at call sites).
    pub fn is_expired(&self, now: u64, leeway_secs: u64) -> bool {
        now.saturating_add(leeway_secs) >= self.expires_at
    }

    /// Refresh policy: refresh proactively before expiry; re-authenticate
    /// when there is nothing usable left is decided by the caller (a missing
    /// or empty refresh token means the session cannot be renewed).
    pub fn refresh_decision(&self, now: u64) -> RefreshDecision {
        if self.refresh_token.is_empty() {
            return RefreshDecision::Reauthenticate;
        }
        if self.is_expired(now, 60) {
            RefreshDecision::RefreshNow
        } else {
            RefreshDecision::Valid
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RefreshDecision {
    /// Access token still valid; no action.
    Valid,
    /// Access token expired (or within skew leeway); use the refresh token.
    RefreshNow,
    /// No refresh token available; the user must sign in again.
    Reauthenticate,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tokens(expires_at: u64) -> TokenSet {
        TokenSet {
            access_token: "a".to_string(),
            refresh_token: "r".to_string(),
            expires_at,
            user_id: "u".to_string(),
        }
    }

    #[test]
    fn expiry_with_leeway() {
        let t = tokens(2000);
        assert!(!t.is_expired(1000, 60));
        assert!(t.is_expired(1940, 60));
        assert!(t.is_expired(2000, 0));
        assert!(!t.is_expired(1999, 0));
    }

    #[test]
    fn refresh_policy() {
        assert_eq!(tokens(5000).refresh_decision(1000), RefreshDecision::Valid);
        assert_eq!(
            tokens(1000).refresh_decision(1000),
            RefreshDecision::RefreshNow
        );
        let mut t = tokens(5000);
        t.refresh_token.clear();
        assert_eq!(t.refresh_decision(1000), RefreshDecision::Reauthenticate);
    }

    #[test]
    fn debug_redacts_secrets() {
        let rendered = format!("{:?}", tokens(1));
        assert!(rendered.contains("<redacted>"));
        assert!(!rendered.contains("\"a\""));
    }

    #[test]
    fn zeroized_on_drop_clears_bytes() {
        let mut t = tokens(1);
        t.zeroize();
        assert!(t.access_token.is_empty());
        assert!(t.refresh_token.is_empty());
    }
}
