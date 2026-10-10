//! Soravo desktop authentication handshake (R1-GAP-021).
//!
//! Minimal secure path connecting the existing website/Supabase authentication
//! system to the Tauri desktop app:
//!
//! ```text
//! desktop --(1)--> system browser --> website /desktop/connect
//!     (existing Supabase email/password login, ADR-011)
//! website --(2)--> desktop-auth-mint Edge Function (user JWT)
//!     returns single-use authorization `code` bound to the PKCE challenge
//! website --(3)--> soravo://auth/callback?code=..&state=..
//! desktop --(4)--> desktop-auth-exchange Edge Function (code + verifier)
//!     returns Supabase session tokens (access + refresh)
//! desktop --(5)--> OS keychain storage, session + entitlement/device reads
//! ```
//!
//! Security invariants (12_SECURITY_BASELINE.md):
//! - No client secret in the desktop (anon/publishable key only, env-gated).
//! - Tokens live in the OS credential store, never in plaintext files,
//!   `localStorage`, logs, or IPC payloads.
//! - PKCE S256 is mandatory on the code path; verifiers never leave the
//!   desktop except over TLS to the exchange endpoint.
//! - No passwords pass through desktop IPC; the desktop never renders a
//!   password field.
//! - Supabase remains the single authentication authority; no second provider.
//!
//! This crate holds pure, deterministically testable logic. OS keychain I/O
//! is behind [`store::TokenStore`]; HTTP is performed by the Tauri command
//! layer from [`supabase`] request builders/parsers so this crate performs
//! no network I/O and needs no async runtime.

pub mod callback;
pub mod device;
pub mod offline;
pub mod pkce;
pub mod session;
pub mod store;
pub mod supabase;

pub use callback::{parse_callback, CallbackError, CallbackSuccess, ConsumedCodes};
pub use device::{new_device_public_id, DeviceRecord};
pub use offline::{
    evaluate_offline_policy, EntitlementSnapshot, OfflineVerdict, OFFLINE_GRACE_SECS,
};
pub use pkce::{new_challenge_pair, new_state, verify_challenge, ChallengePair};
pub use session::{RefreshDecision, TokenSet};
pub use store::{load_entitlement_cache, save_entitlement_cache};
pub use store::{KeyringTokenStore, MemoryTokenStore, StoredSession, TokenStore, KEYCHAIN_SERVICE};

/// Custom-scheme deep-link callback for the desktop app.
pub const DEEP_LINK_SCHEME: &str = "soravo";
/// Full redirect URI the browser returns to after the website step.
/// Register at OS level via the Tauri deep-link plugin plus the
/// `tauri.conf.json` schemes entry (see the R1-GAP-021 proposal doc).
pub const DEEP_LINK_CALLBACK: &str = "soravo://auth/callback";

/// Pending-handshake lifetime: a started sign-in expires after 10 minutes.
pub const HANDSHAKE_TTL_SECS: i64 = 600;
