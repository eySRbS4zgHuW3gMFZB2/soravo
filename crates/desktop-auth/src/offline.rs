//! Offline entitlement policy evaluation.
//!
//! Product/security contract (05_DESKTOP_CONTRACTS.md): the desktop receives
//! the minimum necessary entitlement data, and the cache is bounded and
//! tamper-evident under an explicit offline policy.
//!
//! The explicit time bound below is a PROPOSAL (R1-GAP-021 proposal doc),
//! not ratified product semantics: a 72-hour grace window during which a
//! previously-verified active entitlement continues to be honoured offline.
//! Two invariants hold regardless of the bound and are NOT provisional:
//! (1) local dictation never depends on account/entitlement state;
//! (2) no cached entitlement is ever treated as fresher than its fetch time.

/// Provisional offline grace window (72 h). See proposal doc.
pub const OFFLINE_GRACE_SECS: u64 = 72 * 3600;

/// Last server-verified entitlement state cached on the desktop.
#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct EntitlementSnapshot {
    pub active: bool,
    pub product: String,
    pub plan: String,
    /// Unix seconds of the successful server fetch.
    pub fetched_at: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum OfflineVerdict {
    /// Caller is online; `fetched_at` is current — use the live value.
    Online,
    /// Offline but inside the grace window: honour the cached value.
    OfflineGrace { active: bool },
    /// Offline past the grace window: entitlement unknown; dictation stays
    /// available, gated features must fail closed.
    OfflineExpired,
    /// Never successfully fetched: nothing to honour.
    NoCache,
}

/// Evaluate the offline policy at `now` (unix seconds).
///
/// * `online` — a server fetch just succeeded (`fetched_at == now` shape).
/// * `cached` — last verified snapshot, if any.
pub fn evaluate_offline_policy(
    online: bool,
    cached: Option<&EntitlementSnapshot>,
    now: u64,
) -> OfflineVerdict {
    if online {
        return OfflineVerdict::Online;
    }
    match cached {
        None => OfflineVerdict::NoCache,
        Some(snapshot) => {
            if now.saturating_sub(snapshot.fetched_at) <= OFFLINE_GRACE_SECS {
                OfflineVerdict::OfflineGrace {
                    active: snapshot.active,
                }
            } else {
                OfflineVerdict::OfflineExpired
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snap(active: bool, fetched_at: u64) -> EntitlementSnapshot {
        EntitlementSnapshot {
            active,
            product: "soravo_lifetime".to_string(),
            plan: "lifetime".to_string(),
            fetched_at,
        }
    }

    #[test]
    fn online_short_circuits() {
        assert_eq!(
            evaluate_offline_policy(true, None, 1000),
            OfflineVerdict::Online
        );
    }

    #[test]
    fn offline_inside_grace_honours_cache() {
        let s = snap(true, 1000);
        assert_eq!(
            evaluate_offline_policy(false, Some(&s), 1000 + OFFLINE_GRACE_SECS),
            OfflineVerdict::OfflineGrace { active: true }
        );
        let s = snap(false, 1000);
        assert_eq!(
            evaluate_offline_policy(false, Some(&s), 2000),
            OfflineVerdict::OfflineGrace { active: false }
        );
    }

    #[test]
    fn offline_past_grace_expires() {
        let s = snap(true, 1000);
        assert_eq!(
            evaluate_offline_policy(false, Some(&s), 1000 + OFFLINE_GRACE_SECS + 1),
            OfflineVerdict::OfflineExpired
        );
    }

    #[test]
    fn offline_without_cache_has_nothing() {
        assert_eq!(
            evaluate_offline_policy(false, None, 999_999),
            OfflineVerdict::NoCache
        );
    }
}
