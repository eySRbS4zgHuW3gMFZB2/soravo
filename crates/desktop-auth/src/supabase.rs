//! Supabase Auth REST shapes for the desktop (pure builders/parsers).
//!
//! This module performs NO network I/O and owns no async runtime: it builds
//! the exact HTTPS requests the Tauri command layer executes with `reqwest`
//! and parses the responses. Everything here is deterministically testable
//! without credentials or a live project.
//!
//! Endpoints used (all with the publishable anon key only — never the
//! service role):
//! - `POST {exchange_url}` `{code, code_verifier}` — desktop-auth-exchange
//!   Edge Function; returns a standard Supabase session.
//! - `POST {supabase_url}/auth/v1/token?grant_type=refresh_token`
//!   `{refresh_token}` — session renewal.
//! - `GET {supabase_url}/auth/v1/user` — session validation.
//! - PostgREST reads on `entitlements` / `devices` / `sessions` with the
//!   user's access token; projections mirror the website's
//!   `account-service.ts` exactly (RLS scopes rows to `auth.uid()`).

use serde::{Deserialize, Serialize};

/// Minimal HTTPS request description executed by the caller.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpRequest {
    pub method: &'static str,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AuthApiError {
    /// HTTP status; the body is deliberately NOT propagated (server detail
    /// must not reach UI strings; see account-service.ts generic messages).
    Http(u16),
    /// Response was not the expected session JSON.
    Malformed,
    /// Caller misconfiguration (empty URL/key/token).
    Misconfigured,
}

impl std::fmt::Display for AuthApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthApiError::Http(_) => f.write_str("authentication request failed"),
            AuthApiError::Malformed => f.write_str("authentication response unexpected"),
            AuthApiError::Misconfigured => f.write_str("desktop sign-in is not configured yet"),
        }
    }
}

/// Session tokens returned by the exchange/refresh endpoints.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SessionPayload {
    pub access_token: String,
    pub refresh_token: String,
    /// Seconds until `access_token` expiry (Supabase default 3600).
    pub expires_in: u64,
    pub user_id: String,
}

fn bearer_headers(anon_key: &str, access_token: Option<&str>) -> Vec<(String, String)> {
    let mut headers = vec![
        ("apikey".to_string(), anon_key.to_string()),
        ("Content-Type".to_string(), "application/json".to_string()),
    ];
    if let Some(token) = access_token {
        headers.push(("Authorization".to_string(), format!("Bearer {token}")));
    }
    headers
}

fn require(parts: &[&str]) -> Result<(), AuthApiError> {
    if parts.iter().all(|p| !p.is_empty()) {
        Ok(())
    } else {
        Err(AuthApiError::Misconfigured)
    }
}

/// Build the code+verifier exchange request (PKCE verification happens
/// server-side in the Edge Function).
pub fn build_exchange_request(
    exchange_url: &str,
    anon_key: &str,
    code: &str,
    code_verifier: &str,
) -> Result<HttpRequest, AuthApiError> {
    require(&[exchange_url, anon_key, code, code_verifier])?;
    let body = serde_json::json!({ "code": code, "code_verifier": code_verifier }).to_string();
    Ok(HttpRequest {
        method: "POST",
        url: exchange_url.to_string(),
        headers: bearer_headers(anon_key, None),
        body,
    })
}

/// Build the session-refresh request against Supabase Auth directly.
pub fn build_refresh_request(
    supabase_url: &str,
    anon_key: &str,
    refresh_token: &str,
) -> Result<HttpRequest, AuthApiError> {
    require(&[supabase_url, anon_key, refresh_token])?;
    let url = format!(
        "{}/auth/v1/token?grant_type=refresh_token",
        supabase_url.trim_end_matches('/')
    );
    let body = serde_json::json!({ "refresh_token": refresh_token }).to_string();
    Ok(HttpRequest {
        method: "POST",
        url,
        headers: bearer_headers(anon_key, None),
        body,
    })
}

/// Parse an exchange/refresh response body into session tokens.
pub fn parse_session_response(status: u16, body: &str) -> Result<SessionPayload, AuthApiError> {
    if !(200..300).contains(&status) {
        return Err(AuthApiError::Http(status));
    }
    #[derive(Deserialize)]
    struct Wire {
        access_token: Option<String>,
        refresh_token: Option<String>,
        expires_in: Option<u64>,
        user: Option<WireUser>,
    }
    #[derive(Deserialize)]
    struct WireUser {
        id: Option<String>,
    }
    let wire: Wire = serde_json::from_str(body).map_err(|_| AuthApiError::Malformed)?;
    match (
        wire.access_token,
        wire.refresh_token,
        wire.expires_in,
        wire.user,
    ) {
        (Some(access_token), Some(refresh_token), Some(expires_in), Some(user))
            if !access_token.is_empty()
                && !refresh_token.is_empty()
                && user.id.as_deref().map(|s| !s.is_empty()).unwrap_or(false) =>
        {
            Ok(SessionPayload {
                access_token,
                refresh_token,
                expires_in,
                user_id: user.id.unwrap_or_default(),
            })
        }
        _ => Err(AuthApiError::Malformed),
    }
}

/// Build the mint request the WEBSITE sends (user JWT -> single-use code).
/// Kept here so desktop and website share one contract definition.
pub fn build_mint_request(
    mint_url: &str,
    user_access_token: &str,
    code_challenge: &str,
    state: &str,
) -> Result<HttpRequest, AuthApiError> {
    require(&[mint_url, user_access_token, code_challenge, state])?;
    let body = serde_json::json!({ "code_challenge": code_challenge, "state": state }).to_string();
    Ok(HttpRequest {
        method: "POST",
        url: mint_url.to_string(),
        headers: vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            (
                "Authorization".to_string(),
                format!("Bearer {user_access_token}"),
            ),
        ],
        body,
    })
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct MintResponse {
    pub code: String,
    /// Seconds until the code expires (server authoritative, ~300).
    pub expires_in: u64,
}

pub fn parse_mint_response(status: u16, body: &str) -> Result<MintResponse, AuthApiError> {
    if !(200..300).contains(&status) {
        return Err(AuthApiError::Http(status));
    }
    let wire: MintResponse = serde_json::from_str(body).map_err(|_| AuthApiError::Malformed)?;
    if wire.code.is_empty() {
        return Err(AuthApiError::Malformed);
    }
    Ok(wire)
}

// --- Authenticated reads (exact website projections) ------------------------

/// `select` projection for `entitlements` (website account-service.ts).
pub const ENTITLEMENTS_SELECT: &str = "product,plan,status,starts_at,expires_at,updated_at";
/// `select` projection for `devices` (public identifiers only).
pub const DEVICES_SELECT: &str =
    "device_public_id,platform,app_version,first_seen_at,last_seen_at,revoked_at";
/// `select` projection for `sessions` with the safe device embedding.
pub const SESSIONS_SELECT: &str = "session_public_id,created_at,last_seen_at,revoked_at,devices(device_public_id,platform,app_version)";

/// Build an authenticated PostgREST read. `order` is the website's ordering.
pub fn build_table_read(
    supabase_url: &str,
    anon_key: &str,
    access_token: &str,
    table: &str,
    select: &str,
    order: &str,
) -> Result<HttpRequest, AuthApiError> {
    require(&[supabase_url, anon_key, access_token, table, select])?;
    let url = format!(
        "{}/rest/v1/{}?select={}&order={}",
        supabase_url.trim_end_matches('/'),
        table,
        percent_encode(select),
        percent_encode(order)
    );
    Ok(HttpRequest {
        method: "GET",
        url,
        headers: bearer_headers(anon_key, Some(access_token)),
        body: String::new(),
    })
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

/// Website-shape entitlement row (server-authoritative for gating).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Entitlement {
    pub product: String,
    pub plan: String,
    pub status: String,
    pub starts_at: String,
    pub expires_at: Option<String>,
    pub updated_at: String,
}

impl Entitlement {
    /// Mirrors the primary-entitlement ranking the desktop reader uses:
    /// active first, then lifetime over monthly, then most recently updated.
    pub fn is_lifetime(&self) -> bool {
        self.product == "soravo_lifetime"
    }
}

/// Select the primary entitlement (same rule as `select_primary_entitlement`
/// in the desktop reader): valid rows first, lifetime over monthly, newest.
pub fn select_primary_entitlement(rows: &[Entitlement]) -> Option<&Entitlement> {
    let mut ranked: Vec<&Entitlement> = rows.iter().collect();
    ranked.sort_by(|a, b| {
        b.expires_at
            .is_none()
            .cmp(&a.expires_at.is_none())
            .then(b.is_lifetime().cmp(&a.is_lifetime()))
            .then(b.updated_at.cmp(&a.updated_at))
    });
    ranked.into_iter().next()
}

/// Build the device self-registration upsert.
///
/// `devices_insert_own` (migration `20260915160000`) requires the caller to
/// supply `user_id` (WITH CHECK `user_id = auth.uid()`); identity columns
/// are server-guarded immutable. `on_conflict` + merge-duplicates makes
/// re-registration idempotent without ever re-keying the row.
pub fn build_device_upsert_request(
    supabase_url: &str,
    anon_key: &str,
    access_token: &str,
    user_id: &str,
    device: &crate::device::DeviceRecord,
) -> Result<HttpRequest, AuthApiError> {
    require(&[supabase_url, anon_key, access_token, user_id])?;
    let url = format!(
        "{}/rest/v1/devices?on_conflict=device_public_id",
        supabase_url.trim_end_matches('/')
    );
    let body = serde_json::json!({
        "user_id": user_id,
        "device_public_id": device.device_public_id,
        "platform": device.platform,
        "app_version": device.app_version,
    })
    .to_string();
    let mut headers = bearer_headers(anon_key, Some(access_token));
    headers.push((
        "Prefer".to_string(),
        "resolution=merge-duplicates,return=representation".to_string(),
    ));
    Ok(HttpRequest {
        method: "POST",
        url,
        headers,
        body,
    })
}

/// Extract the internal device row `id` from an upsert representation
/// response (needed as `device_id` for the session row).
pub fn parse_device_upsert_response(status: u16, body: &str) -> Result<String, AuthApiError> {
    if !(200..300).contains(&status) {
        return Err(AuthApiError::Http(status));
    }
    let rows: Vec<serde_json::Value> =
        serde_json::from_str(body).map_err(|_| AuthApiError::Malformed)?;
    rows.first()
        .and_then(|row| row.get("id"))
        .and_then(|id| id.as_str())
        .filter(|id| !id.is_empty())
        .map(|id| id.to_string())
        .ok_or(AuthApiError::Malformed)
}

/// Build the application session-registry insert (metadata only — never a
/// credential; authoritative sessions live in Supabase Auth).
pub fn build_session_insert_request(
    supabase_url: &str,
    anon_key: &str,
    access_token: &str,
    user_id: &str,
    device_row_id: &str,
    session_public_id: &str,
) -> Result<HttpRequest, AuthApiError> {
    require(&[
        supabase_url,
        anon_key,
        access_token,
        user_id,
        device_row_id,
        session_public_id,
    ])?;
    let url = format!("{}/rest/v1/sessions", supabase_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "user_id": user_id,
        "device_id": device_row_id,
        "session_public_id": session_public_id,
    })
    .to_string();
    Ok(HttpRequest {
        method: "POST",
        url,
        headers: bearer_headers(anon_key, Some(access_token)),
        body,
    })
}

/// Generate an opaque application session id (`ses_` + 128 random bits).
/// Mirrors [`crate::device::new_device_public_id`]: public, non-secret.
pub fn new_session_public_id() -> String {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
    use rand::RngCore;
    let mut bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut bytes);
    format!("ses_{}", URL_SAFE_NO_PAD.encode(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    const SESSION_BODY: &str =
        r#"{"access_token":"a","refresh_token":"r","expires_in":3600,"user":{"id":"u1"}}"#;

    #[test]
    fn exchange_request_shape() {
        let req = build_exchange_request("https://f/exchange", "anon", "code1", "ver1").unwrap();
        assert_eq!(req.method, "POST");
        assert_eq!(req.url, "https://f/exchange");
        assert!(req
            .headers
            .iter()
            .any(|(k, v)| k == "apikey" && v == "anon"));
        let body: serde_json::Value = serde_json::from_str(&req.body).unwrap();
        assert_eq!(body["code"], "code1");
        assert_eq!(body["code_verifier"], "ver1");
    }

    #[test]
    fn refresh_request_shape() {
        let req = build_refresh_request("https://proj.supabase.co/", "anon", "rt").unwrap();
        assert_eq!(
            req.url,
            "https://proj.supabase.co/auth/v1/token?grant_type=refresh_token"
        );
        let body: serde_json::Value = serde_json::from_str(&req.body).unwrap();
        assert_eq!(body["refresh_token"], "rt");
    }

    #[test]
    fn session_response_round_trip() {
        let parsed = parse_session_response(200, SESSION_BODY).unwrap();
        assert_eq!(parsed.access_token, "a");
        assert_eq!(parsed.expires_in, 3600);
        assert_eq!(parsed.user_id, "u1");
    }

    #[test]
    fn session_response_failures() {
        assert_eq!(
            parse_session_response(400, "{}"),
            Err(AuthApiError::Http(400))
        );
        assert_eq!(
            parse_session_response(200, "not json"),
            Err(AuthApiError::Malformed)
        );
        assert_eq!(
            parse_session_response(
                200,
                r#"{"access_token":"","refresh_token":"r","expires_in":1,"user":{"id":"u"}}"#
            ),
            Err(AuthApiError::Malformed)
        );
        assert_eq!(
            parse_session_response(
                200,
                r#"{"access_token":"a","refresh_token":"r","expires_in":1}"#
            ),
            Err(AuthApiError::Malformed)
        );
    }

    #[test]
    fn misconfigured_builders_fail_closed() {
        assert_eq!(
            build_exchange_request("", "anon", "c", "v"),
            Err(AuthApiError::Misconfigured)
        );
        assert_eq!(
            build_refresh_request("https://x", "anon", ""),
            Err(AuthApiError::Misconfigured)
        );
    }

    #[test]
    fn error_strings_are_generic() {
        // UI-facing strings must not carry server detail.
        assert_eq!(
            AuthApiError::Http(500).to_string(),
            "authentication request failed"
        );
        assert!(!format!("{:?}", AuthApiError::Http(500)).contains("secret"));
    }

    #[test]
    fn primary_entitlement_prefers_lifetime_then_newest() {
        let mk = |product: &str, updated_at: &str| Entitlement {
            product: product.to_string(),
            plan: "p".to_string(),
            status: "active".to_string(),
            starts_at: "2026-01-01".to_string(),
            expires_at: None,
            updated_at: updated_at.to_string(),
        };
        let rows = vec![
            mk("soravo_monthly", "2026-09-02"),
            mk("soravo_lifetime", "2026-09-01"),
        ];
        assert_eq!(
            select_primary_entitlement(&rows).unwrap().product,
            "soravo_lifetime"
        );
        assert!(select_primary_entitlement(&[]).is_none());
    }

    #[test]
    fn table_read_uses_exact_projections() {
        let req = build_table_read(
            "https://proj.supabase.co",
            "anon",
            "tok",
            "entitlements",
            ENTITLEMENTS_SELECT,
            "updated_at.desc",
        )
        .unwrap();
        assert!(req.url.contains("/rest/v1/entitlements?select="));
        assert!(req.url.contains("product%2Cplan"));
        assert!(req
            .headers
            .iter()
            .any(|(k, v)| k == "Authorization" && v == "Bearer tok"));
    }

    #[test]
    fn device_session_registration_shapes() {
        let device = crate::device::DeviceRecord::new("dev_abc".to_string(), "macos", "0.1.0");
        let upsert =
            build_device_upsert_request("https://proj.supabase.co", "anon", "tok", "u1", &device)
                .unwrap();
        assert!(upsert
            .url
            .contains("/rest/v1/devices?on_conflict=device_public_id"));
        assert!(upsert
            .headers
            .iter()
            .any(|(k, v)| k == "Prefer" && v.contains("merge-duplicates")));
        let body: serde_json::Value = serde_json::from_str(&upsert.body).unwrap();
        assert_eq!(body["user_id"], "u1");
        assert_eq!(body["device_public_id"], "dev_abc");
        assert!(body.get("token").is_none());

        let row_id =
            parse_device_upsert_response(201, r#"[{"id":"11111111-2222-3333-4444-555555555555"}]"#)
                .unwrap();
        assert_eq!(row_id, "11111111-2222-3333-4444-555555555555");
        assert_eq!(
            parse_device_upsert_response(200, "[]"),
            Err(AuthApiError::Malformed)
        );

        let ses = new_session_public_id();
        assert!(ses.starts_with("ses_"));
        let insert = build_session_insert_request(
            "https://proj.supabase.co",
            "anon",
            "tok",
            "u1",
            &row_id,
            &ses,
        )
        .unwrap();
        assert!(insert.url.ends_with("/rest/v1/sessions"));
        let body: serde_json::Value = serde_json::from_str(&insert.body).unwrap();
        assert_eq!(body["device_id"], row_id);
        assert_eq!(body["session_public_id"], ses);
    }
}
