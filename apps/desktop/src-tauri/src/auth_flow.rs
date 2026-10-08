//! Desktop-side R1-GAP-021 authentication flow state.
//!
//! Owns the pending PKCE handshake, the OS-keychain session, and the HTTPS
//! calls to Supabase Auth / PostgREST / the desktop-auth Edge Functions.
//! Passwords never appear here: the user authenticates in the system browser
//! on the website, and only an opaque single-use `code` returns via the
//! `soravo://auth/callback` deep link.
//!
//! Configuration is compile-time env only (publishable values):
//! `SORAVO_SUPABASE_URL`, `SORAVO_SUPABASE_ANON_KEY`, `SORAVO_SITE_URL`.
//! When any is absent the flow stays inert and sign-in fails closed with the
//! pre-existing "not configured" message.

use std::sync::Mutex;

use soravo_desktop_auth::{
    callback::{parse_callback, unix_now, ConsumedCodes},
    device::{new_device_public_id, DeviceRecord},
    offline::{evaluate_offline_policy, EntitlementSnapshot, OfflineVerdict},
    pkce::{new_challenge_pair, new_state},
    session::{RefreshDecision, TokenSet},
    store::{
        load_entitlement_cache as load_cache_json, KeyringTokenStore, StoredSession, TokenStore,
    },
    supabase as supa,
};

/// Compile-time desktop auth configuration (publishable values only).
#[derive(Clone, Debug)]
pub struct DesktopAuthConfig {
    pub supabase_url: String,
    pub anon_key: String,
    pub site_url: String,
}

impl DesktopAuthConfig {
    pub fn from_env() -> Option<Self> {
        let supabase_url = option_env!("SORAVO_SUPABASE_URL")?.trim().to_string();
        let anon_key = option_env!("SORAVO_SUPABASE_ANON_KEY")?.trim().to_string();
        let site_url = option_env!("SORAVO_SITE_URL")?.trim().to_string();
        if supabase_url.is_empty() || anon_key.is_empty() || site_url.is_empty() {
            return None;
        }
        if !supabase_url.starts_with("https://") || !site_url.starts_with("https://") {
            return None;
        }
        Some(Self {
            supabase_url,
            anon_key,
            site_url,
        })
    }

    pub fn exchange_url(&self) -> String {
        format!(
            "{}/functions/v1/desktop-auth-exchange",
            self.supabase_url.trim_end_matches('/')
        )
    }

    pub fn connect_url(&self, challenge: &str, state: &str) -> String {
        format!(
            "{}/desktop/connect?code_challenge={}&state={}",
            self.site_url.trim_end_matches('/'),
            percent_encode(challenge),
            percent_encode(state)
        )
    }
}

fn percent_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for b in input.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

struct PendingHandshake {
    verifier: String,
    state: String,
    started_at: u64,
}

/// Managed Tauri state for the desktop auth flow.
pub struct AuthFlow {
    inner: Mutex<AuthFlowInner>,
    store: KeyringTokenStore,
    http: reqwest::Client,
}

struct AuthFlowInner {
    config: Option<DesktopAuthConfig>,
    pending: Option<PendingHandshake>,
    consumed: ConsumedCodes,
}

impl AuthFlow {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(AuthFlowInner {
                config: DesktopAuthConfig::from_env(),
                pending: None,
                consumed: ConsumedCodes::new(),
            }),
            store: KeyringTokenStore::new(),
            http: reqwest::Client::new(),
        }
    }

    pub fn is_configured(&self) -> bool {
        self.inner
            .lock()
            .map(|g| g.config.is_some())
            .unwrap_or(false)
    }

    /// Start a sign-in: create the PKCE handshake and return the website URL
    /// the caller opens in the SYSTEM browser (never WebView-embedded, so the
    /// desktop never sees the password field).
    pub fn begin_sign_in(&self) -> Result<BeginSignIn, String> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        let config = guard.config.clone().ok_or_else(|| {
            "Desktop sign-in is not configured yet. Local dictation remains available.".to_string()
        })?;
        let pair = new_challenge_pair();
        let state = new_state();
        let url = config.connect_url(&pair.challenge, &state);
        guard.pending = Some(PendingHandshake {
            verifier: pair.verifier,
            state,
            started_at: unix_now(),
        });
        Ok(BeginSignIn {
            url,
            expires_in: soravo_desktop_auth::HANDSHAKE_TTL_SECS as u64,
        })
    }

    /// Validate a deep-link callback against the pending handshake and take
    /// the one-time exchange material. Returns `None` when no handshake is
    /// pending (stray link) — the caller surfaces a generic message.
    pub fn take_exchange(&self, raw_url: &str) -> Result<PendingExchange, String> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|e| format!("lock poisoned: {e}"))?;
        let config = guard.config.clone().ok_or_else(|| {
            "Desktop sign-in is not configured yet. Local dictation remains available.".to_string()
        })?;
        let pending = guard
            .pending
            .take()
            .ok_or_else(|| "No sign-in attempt is pending. Start sign-in again.".to_string())?;
        let success = parse_callback(
            raw_url,
            &pending.state,
            pending.started_at,
            unix_now(),
            &mut guard.consumed,
        )
        .map_err(|e| e.to_string())?;
        Ok(PendingExchange {
            exchange_url: config.exchange_url(),
            anon_key: config.anon_key.clone(),
            supabase_url: config.supabase_url.clone(),
            code: success.code,
            verifier: pending.verifier,
        })
    }

    pub fn cancel_sign_in(&self) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.pending = None;
        }
    }

    pub fn config_snapshot(&self) -> Option<DesktopAuthConfig> {
        self.inner.lock().ok().and_then(|g| g.config.clone())
    }

    pub fn http_client(&self) -> reqwest::Client {
        self.http.clone()
    }

    pub fn token_store(&self) -> KeyringTokenStore {
        self.store.clone()
    }

    pub fn store(&self) -> &KeyringTokenStore {
        &self.store
    }

    pub fn http(&self) -> &reqwest::Client {
        &self.http
    }
}

impl Default for AuthFlow {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, Debug)]
pub struct BeginSignIn {
    pub url: String,
    pub expires_in: u64,
}

/// One-time code exchange material (code + verifier, never logged).
#[derive(Clone, Debug)]
pub struct PendingExchange {
    pub exchange_url: String,
    pub anon_key: String,
    pub supabase_url: String,
    pub code: String,
    pub verifier: String,
}

/// Execute an [`supa::HttpRequest`] with reqwest. Lives here (not in the
/// pure crate) so `soravo-desktop-auth` performs no network I/O.
pub async fn execute(
    http: &reqwest::Client,
    req: &supa::HttpRequest,
) -> Result<(u16, String), String> {
    let mut builder = match req.method {
        "POST" => http.post(&req.url),
        _ => http.get(&req.url),
    };
    for (k, v) in &req.headers {
        builder = builder.header(k.as_str(), v.as_str());
    }
    if req.method == "POST" {
        builder = builder.body(req.body.clone());
    }
    let response = builder
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;
    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();
    Ok((status, body))
}

fn platform_name() -> &'static str {
    match std::env::consts::OS {
        "macos" => "macos",
        "windows" => "windows",
        _ => "linux",
    }
}

/// Complete sign-in after the exchange: persist tokens, register device +
/// session rows (best-effort metadata), fetch entitlements, and return the
/// signed-in identity for the snapshot.
///
/// Takes owned/cloned pieces (never a lock guard) so callers can hold no
/// mutex across network awaits.
pub async fn establish_session(
    http: &reqwest::Client,
    store: &KeyringTokenStore,
    config: &DesktopAuthConfig,
    exchange: PendingExchange,
) -> Result<EstablishedSession, String> {
    let exchange_req = supa::build_exchange_request(
        &exchange.exchange_url,
        &exchange.anon_key,
        &exchange.code,
        &exchange.verifier,
    )
    .map_err(|e| e.to_string())?;
    let (status, body) = execute(http, &exchange_req).await?;
    let payload = supa::parse_session_response(status, &body).map_err(|e| e.to_string())?;
    let now = unix_now();
    let tokens = TokenSet {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_at: now.saturating_add(payload.expires_in),
        user_id: payload.user_id.clone(),
    };
    store
        .save_session(&StoredSession::from(&tokens))
        .map_err(|e| e.to_string())?;

    // Device identity: reuse the stored public id or mint a fresh opaque one.
    let device_public_id = match store.load_device_id().map_err(|e| e.to_string())? {
        Some(existing) if !existing.is_empty() => existing,
        _ => {
            let fresh = new_device_public_id();
            store.save_device_id(&fresh).map_err(|e| e.to_string())?;
            fresh
        }
    };
    let device = DeviceRecord::new(device_public_id, platform_name(), env!("CARGO_PKG_VERSION"));

    // Device + session registration is dashboard metadata: attempt it, but a
    // registration failure must not fail the sign-in itself.
    let session_public_id = supa::new_session_public_id();
    if let Err(e) = register_device_and_session(
        http,
        &config.supabase_url,
        &config.anon_key,
        &tokens,
        &device,
        &session_public_id,
    )
    .await
    {
        log::warn!("desktop device/session registration failed: {e}");
    }

    let entitlement_active = fetch_primary_entitlement_active(
        http,
        &config.supabase_url,
        &config.anon_key,
        &tokens.access_token,
    )
    .await;
    persist_entitlement_cache(entitlement_active, now);

    Ok(EstablishedSession {
        user_id: tokens.user_id.clone(),
        session_public_id,
        entitlement_active,
    })
}

async fn register_device_and_session(
    http: &reqwest::Client,
    supabase_url: &str,
    anon_key: &str,
    tokens: &TokenSet,
    device: &DeviceRecord,
    session_public_id: &str,
) -> Result<(), String> {
    let upsert = supa::build_device_upsert_request(
        supabase_url,
        anon_key,
        &tokens.access_token,
        &tokens.user_id,
        device,
    )
    .map_err(|e| e.to_string())?;
    let (status, body) = execute(http, &upsert).await?;
    let device_row_id =
        supa::parse_device_upsert_response(status, &body).map_err(|e| e.to_string())?;
    let insert = supa::build_session_insert_request(
        supabase_url,
        anon_key,
        &tokens.access_token,
        &tokens.user_id,
        &device_row_id,
        session_public_id,
    )
    .map_err(|e| e.to_string())?;
    let (status, _) = execute(http, &insert).await?;
    if !(200..300).contains(&status) {
        return Err(format!("session registration rejected: HTTP {status}"));
    }
    Ok(())
}

async fn fetch_primary_entitlement_active(
    http: &reqwest::Client,
    supabase_url: &str,
    anon_key: &str,
    access_token: &str,
) -> bool {
    let req = match supa::build_table_read(
        supabase_url,
        anon_key,
        access_token,
        "entitlements",
        supa::ENTITLEMENTS_SELECT,
        "updated_at.desc",
    ) {
        Ok(req) => req,
        Err(_) => return false,
    };
    let (status, body) = match execute(http, &req).await {
        Ok(res) => res,
        Err(_) => return false,
    };
    if !(200..300).contains(&status) {
        return false;
    }
    match serde_json::from_str::<Vec<supa::Entitlement>>(&body) {
        Ok(rows) => supa::select_primary_entitlement(&rows)
            .map(|e| e.status == "active")
            .unwrap_or(false),
        Err(_) => false,
    }
}

fn persist_entitlement_cache(active: bool, now: u64) {
    use soravo_desktop_auth::save_entitlement_cache;
    let snapshot = EntitlementSnapshot {
        active,
        product: String::new(),
        plan: String::new(),
        fetched_at: now,
    };
    let payload = serde_json::to_string(&snapshot).unwrap_or_default();
    // Non-secret cache kept in the keychain (encrypted at rest) so no
    // settings store or plaintext file is introduced for auth state.
    let _ = save_entitlement_cache(&payload);
}

pub fn load_entitlement_cache() -> Option<EntitlementSnapshot> {
    load_cache_json()
        .ok()
        .flatten()
        .and_then(|payload| serde_json::from_str::<EntitlementSnapshot>(&payload).ok())
}

/// Evaluate the offline verdict for snapshot display.
pub fn offline_verdict(now: u64) -> OfflineVerdict {
    evaluate_offline_policy(false, load_entitlement_cache().as_ref(), now)
}

/// Refresh the stored session via the refresh token. Takes owned pieces so
/// callers hold no mutex across network awaits.
pub async fn refresh_stored_session(
    http: &reqwest::Client,
    store: &KeyringTokenStore,
    config: &DesktopAuthConfig,
) -> Result<TokenSet, String> {
    let stored = store
        .load_session()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No saved session. Sign in again.".to_string())?;
    let mut tokens = stored.into_token_set();
    match tokens.refresh_decision(unix_now()) {
        RefreshDecision::Valid => return Ok(tokens),
        RefreshDecision::Reauthenticate => {
            return Err("Session cannot be renewed. Sign in again.".to_string())
        }
        RefreshDecision::RefreshNow => {}
    }
    let req = supa::build_refresh_request(
        &config.supabase_url,
        &config.anon_key,
        &tokens.refresh_token,
    )
    .map_err(|e| e.to_string())?;
    let (status, body) = execute(http, &req).await?;
    let payload = supa::parse_session_response(status, &body).map_err(|e| e.to_string())?;
    tokens = TokenSet {
        expires_at: unix_now().saturating_add(payload.expires_in),
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        user_id: payload.user_id,
    };
    store
        .save_session(&StoredSession::from(&tokens))
        .map_err(|e| e.to_string())?;
    Ok(tokens)
}

/// Server sign-out (best-effort) + local keychain wipe.
pub async fn sign_out_everywhere(
    http: &reqwest::Client,
    store: &KeyringTokenStore,
    config: Option<&DesktopAuthConfig>,
) -> Result<(), String> {
    if let Ok(Some(stored)) = store.load_session() {
        if let Some(config) = config {
            let url = format!(
                "{}/auth/v1/logout",
                config.supabase_url.trim_end_matches('/')
            );
            let req = supa::HttpRequest {
                method: "POST",
                url,
                headers: vec![
                    ("apikey".to_string(), config.anon_key.clone()),
                    (
                        "Authorization".to_string(),
                        format!("Bearer {}", stored.access_token),
                    ),
                    ("Content-Type".to_string(), "application/json".to_string()),
                ],
                body: "{}".to_string(),
            };
            // Best-effort: a failed server logout must not block local wipe.
            if let Err(e) = execute(http, &req).await {
                log::warn!("server sign-out failed (local wipe continues): {e}");
            }
        }
    }
    store.clear_session().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Clone, Debug)]
pub struct EstablishedSession {
    pub user_id: String,
    pub session_public_id: String,
    pub entitlement_active: bool,
}
