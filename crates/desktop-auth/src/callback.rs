//! Deep-link callback parsing and validation.
//!
//! The website redirects the system browser to
//! `soravo://auth/callback?code=<single-use>&state=<csrf>` after minting the
//! authorization code. This module validates the callback against the pending
//! handshake: exact scheme/host/path, required parameters, `state` match,
//! handshake freshness, and code single-use. Tokens NEVER travel in this URL.

use std::collections::{HashMap, HashSet};
use std::time::{SystemTime, UNIX_EPOCH};

use super::{DEEP_LINK_SCHEME, HANDSHAKE_TTL_SECS};

/// Successful validation: the opaque code the desktop may exchange once.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CallbackSuccess {
    pub code: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CallbackError {
    /// Not our scheme (e.g. `https://…`, another app's link).
    InvalidScheme,
    /// Wrong host or path (`soravo://other/…`).
    InvalidTarget,
    /// `code` parameter absent or empty.
    MissingCode,
    /// `state` parameter absent or empty.
    MissingState,
    /// `state` does not match the pending handshake (CSRF).
    StateMismatch,
    /// Handshake older than [`HANDSHAKE_TTL_SECS`](super::HANDSHAKE_TTL_SECS).
    HandshakeExpired,
    /// This `code` was already consumed (replay).
    CodeReused,
}

impl std::fmt::Display for CallbackError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let msg = match self {
            CallbackError::InvalidScheme => "callback is not a soravo:// deep link",
            CallbackError::InvalidTarget => "callback target is not auth/callback",
            CallbackError::MissingCode => "callback is missing the authorization code",
            CallbackError::MissingState => "callback is missing the state parameter",
            CallbackError::StateMismatch => "callback state does not match this sign-in attempt",
            CallbackError::HandshakeExpired => "sign-in attempt expired; start again",
            CallbackError::CodeReused => "authorization code already used",
        };
        f.write_str(msg)
    }
}

/// Single-use registry for consumed authorization codes (replay guard).
#[derive(Debug, Default)]
pub struct ConsumedCodes {
    seen: HashSet<String>,
}

impl ConsumedCodes {
    pub fn new() -> Self {
        Self::default()
    }

    /// Record `code`; returns `false` if it was already consumed.
    pub fn consume(&mut self, code: &str) -> bool {
        self.seen.insert(code.to_string())
    }
}

/// Validate `raw_url` against the pending handshake.
///
/// * `expected_state` — the `state` issued by [`crate::pkce::new_state`].
/// * `handshake_started_at` / `now` — unix seconds; the handshake must be
///   younger than `HANDSHAKE_TTL_SECS`.
pub fn parse_callback(
    raw_url: &str,
    expected_state: &str,
    handshake_started_at: u64,
    now: u64,
    consumed: &mut ConsumedCodes,
) -> Result<CallbackSuccess, CallbackError> {
    let (scheme, rest) = raw_url
        .split_once("://")
        .ok_or(CallbackError::InvalidScheme)?;
    if scheme != DEEP_LINK_SCHEME {
        return Err(CallbackError::InvalidScheme);
    }
    let (authority_and_path, query) = match rest.split_once('?') {
        Some(parts) => parts,
        None => return Err(CallbackError::MissingCode),
    };
    if authority_and_path != "auth/callback" {
        return Err(CallbackError::InvalidTarget);
    }
    let params = parse_query(query);
    let code = params
        .get("code")
        .filter(|v| !v.is_empty())
        .ok_or(CallbackError::MissingCode)?;
    let state = params
        .get("state")
        .filter(|v| !v.is_empty())
        .ok_or(CallbackError::MissingState)?;
    if state != expected_state {
        return Err(CallbackError::StateMismatch);
    }
    if now.saturating_sub(handshake_started_at) > HANDSHAKE_TTL_SECS as u64 {
        return Err(CallbackError::HandshakeExpired);
    }
    if !consumed.consume(code) {
        return Err(CallbackError::CodeReused);
    }
    Ok(CallbackSuccess { code: code.clone() })
}

fn parse_query(query: &str) -> HashMap<String, String> {
    let mut out = HashMap::new();
    for pair in query.split('&') {
        let Some((k, v)) = pair.split_once('=') else {
            continue;
        };
        out.insert(percent_decode(k), percent_decode(v));
    }
    out
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (hex_val(bytes[i + 1]), hex_val(bytes[i + 2])) {
                out.push(h << 4 | l);
                i += 3;
                continue;
            }
        }
        if bytes[i] == b'+' {
            out.push(b' ');
        } else {
            out.push(bytes[i]);
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn hex_val(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

pub fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn harness(state: &str, started: u64, now: u64) -> ConsumedCodes {
        let _ = (state, started, now);
        ConsumedCodes::new()
    }

    #[test]
    fn successful_callback() {
        let mut consumed = harness("s", 1000, 1100);
        let got = parse_callback(
            "soravo://auth/callback?code=abc123&state=s",
            "s",
            1000,
            1100,
            &mut consumed,
        );
        assert_eq!(
            got,
            Ok(CallbackSuccess {
                code: "abc123".to_string()
            })
        );
    }

    #[test]
    fn invalid_scheme_and_target_rejected() {
        let mut consumed = ConsumedCodes::new();
        assert_eq!(
            parse_callback("https://x/?code=a&state=s", "s", 0, 0, &mut consumed),
            Err(CallbackError::InvalidScheme)
        );
        assert_eq!(
            parse_callback(
                "other://auth/callback?code=a&state=s",
                "s",
                0,
                0,
                &mut consumed
            ),
            Err(CallbackError::InvalidScheme)
        );
        assert_eq!(
            parse_callback(
                "soravo://evil/callback?code=a&state=s",
                "s",
                0,
                0,
                &mut consumed
            ),
            Err(CallbackError::InvalidTarget)
        );
        assert_eq!(
            parse_callback(
                "soravo://auth/other?code=a&state=s",
                "s",
                0,
                0,
                &mut consumed
            ),
            Err(CallbackError::InvalidTarget)
        );
        assert_eq!(
            parse_callback("not-a-url", "s", 0, 0, &mut consumed),
            Err(CallbackError::InvalidScheme)
        );
    }

    #[test]
    fn missing_params_rejected() {
        let mut consumed = ConsumedCodes::new();
        assert_eq!(
            parse_callback("soravo://auth/callback?state=s", "s", 0, 0, &mut consumed),
            Err(CallbackError::MissingCode)
        );
        assert_eq!(
            parse_callback("soravo://auth/callback?code=a", "s", 0, 0, &mut consumed),
            Err(CallbackError::MissingState)
        );
        assert_eq!(
            parse_callback(
                "soravo://auth/callback?code=&state=s",
                "s",
                0,
                0,
                &mut consumed
            ),
            Err(CallbackError::MissingCode)
        );
        assert_eq!(
            parse_callback("soravo://auth/callback", "s", 0, 0, &mut consumed),
            Err(CallbackError::MissingCode)
        );
    }

    #[test]
    fn state_mismatch_rejected() {
        let mut consumed = ConsumedCodes::new();
        assert_eq!(
            parse_callback(
                "soravo://auth/callback?code=a&state=attacker",
                "real-state",
                1000,
                1100,
                &mut consumed
            ),
            Err(CallbackError::StateMismatch)
        );
    }

    #[test]
    fn expired_handshake_rejected() {
        let mut consumed = ConsumedCodes::new();
        assert_eq!(
            parse_callback(
                "soravo://auth/callback?code=a&state=s",
                "s",
                1000,
                1000 + HANDSHAKE_TTL_SECS as u64 + 1,
                &mut consumed
            ),
            Err(CallbackError::HandshakeExpired)
        );
    }

    #[test]
    fn replayed_code_rejected() {
        let mut consumed = ConsumedCodes::new();
        let url = "soravo://auth/callback?code=once&state=s";
        assert!(parse_callback(url, "s", 1000, 1100, &mut consumed).is_ok());
        assert_eq!(
            parse_callback(url, "s", 1000, 1100, &mut consumed),
            Err(CallbackError::CodeReused)
        );
    }

    #[test]
    fn percent_encoded_params_decode() {
        let mut consumed = ConsumedCodes::new();
        let got = parse_callback(
            "soravo://auth/callback?code=a%2Bb%20c&state=s",
            "s",
            0,
            0,
            &mut consumed,
        );
        assert_eq!(
            got,
            Ok(CallbackSuccess {
                code: "a+b c".to_string()
            })
        );
    }
}
