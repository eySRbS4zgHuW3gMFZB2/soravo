//! PKCE (RFC 7636) S256 challenge pair + opaque `state` (RFC 8252 §8).
//!
//! The desktop generates a `code_verifier` it never discloses except over TLS
//! to the exchange endpoint, and hands `code_challenge` (S256) plus `state`
//! to the website `/desktop/connect` page via the system-browser URL. The
//! exchange endpoint re-derives the challenge from the presented verifier and
//! rejects mismatches, so a stolen authorization `code` alone is useless.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::RngCore;
use sha2::{Digest, Sha256};

/// PKCE code verifier + S256 challenge handed to the website step.
#[derive(Clone, Debug)]
pub struct ChallengePair {
    /// High-entropy secret kept in desktop memory only (43–128 chars).
    pub verifier: String,
    /// `BASE64URL(SHA256(verifier))`, safe to embed in the browser URL.
    pub challenge: String,
}

/// Generate a fresh verifier/challenge pair (64 random bytes -> 86 chars).
pub fn new_challenge_pair() -> ChallengePair {
    let mut bytes = [0u8; 64];
    rand::thread_rng().fill_bytes(&mut bytes);
    let verifier = URL_SAFE_NO_PAD.encode(bytes);
    let challenge = challenge_for_verifier(&verifier);
    ChallengePair {
        verifier,
        challenge,
    }
}

/// Generate an opaque CSRF `state` (32 random bytes, base64url).
pub fn new_state() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

/// `true` iff `BASE64URL(SHA256(verifier)) == challenge` (constant shape,
/// exact match; empty inputs never match).
pub fn verify_challenge(verifier: &str, challenge: &str) -> bool {
    if verifier.is_empty() || challenge.is_empty() {
        return false;
    }
    challenge_for_verifier(verifier) == challenge
}

fn challenge_for_verifier(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pair_is_internally_consistent_and_sized() {
        let pair = new_challenge_pair();
        assert!((43..=128).contains(&pair.verifier.len()));
        assert!(verify_challenge(&pair.verifier, &pair.challenge));
    }

    #[test]
    fn pairs_are_unique() {
        let a = new_challenge_pair();
        let b = new_challenge_pair();
        assert_ne!(a.verifier, b.verifier);
        assert_ne!(a.challenge, b.challenge);
        assert_ne!(new_state(), new_state());
    }

    #[test]
    fn tampered_verifier_or_challenge_fails() {
        let pair = new_challenge_pair();
        assert!(!verify_challenge("tampered", &pair.challenge));
        assert!(!verify_challenge(&pair.verifier, "tampered"));
        assert!(!verify_challenge("", &pair.challenge));
        assert!(!verify_challenge(&pair.verifier, ""));
    }

    #[test]
    fn rfc7636_vector() {
        // RFC 7636 §4.2 test vector.
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        assert_eq!(
            challenge_for_verifier(verifier),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
        assert!(verify_challenge(
            verifier,
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        ));
    }
}
