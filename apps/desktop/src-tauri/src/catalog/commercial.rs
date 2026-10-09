//! T10 commercial safety gate: deterministic production exposure control.
//!
//! SORAVO must not expose a model for commercial download or use unless that
//! model is present in the authoritative `MODEL_LICENSES.json` registry with a
//! commercially approved classification. This module is the single decision
//! point for that policy:
//!
//! ```text
//! catalog model / discovered file
//!     ↓
//! license registry lookup (embedded `MODEL_LICENSES.json`, §1)
//!     ↓
//! commercial clearance decision ([`is_commercially_cleared`])
//!     ↓
//! production registry exposure (`ModelManager`)
//! ```
//!
//! ## Authority and fail-closed rules
//!
//! 1. The registry JSON is compiled into the binary with `include_str!`, so
//!    the decision is deterministic and cannot be altered at runtime.
//! 2. Only [`CommercialClassification::Clear`] and
//!    [`CommercialClassification::ClearWithAttribution`] expose a model. Every
//!    other value — `NonCommercial`, `Prohibited`, `Unknown`,
//!    `InsufficientProvenance`, a missing entry, or an unrecognised string —
//!    is NOT cleared.
//! 3. A `ClearWithAttribution` entry without a non-empty `attribution_text`
//!    is invalid data and therefore NOT cleared.
//! 4. A structurally invalid registry (unparseable JSON, wrong `version`,
//!    missing/non-array `entries`) yields an empty registry: everything is
//!    NOT cleared. A malformed single entry is skipped (that model stays
//!    blocked) without disturbing the rest.
//! 5. The `classification` field is the sole authority. Informational fields
//!    (`commercial_use`, `license`, notes) are never consulted.
//!
//! ## Invariants (security)
//!
//! MISSING OR INVALID COMMERCIAL LICENSE DATA = NOT COMMERCIALLY CLEARED.

use std::collections::HashMap;

use once_cell::sync::Lazy;
use serde::Deserialize;

/// Registry schema version this gate understands. Any other (or missing)
/// version fails closed to an empty registry.
const REGISTRY_VERSION: &str = "1.0.0";

/// The authoritative license registry, embedded at compile time from the
/// repository root (`MODEL_LICENSES.json`). Same file, no duplication.
static REGISTRY_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../../MODEL_LICENSES.json"
));

/// Commercial clearance of one catalog model.
///
/// Deserialization is fail-closed: unknown strings fall into `Unknown`
/// (never an approved variant), so a typo can only block, never expose.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
pub enum CommercialClassification {
    /// Commercial use permitted, no in-flow attribution precondition.
    #[serde(rename = "COMMERCIAL-CLEAR")]
    Clear,
    /// Commercial use permitted conditioned on showing the registry's exact
    /// `attribution_text` with the model.
    #[serde(rename = "COMMERCIAL-CLEAR-WITH-ATTRIBUTION")]
    ClearWithAttribution,
    /// License forbids commercial use. Never reinterpreted.
    #[serde(rename = "NON-COMMERCIAL")]
    NonCommercial,
    /// Audit-identified prohibition. Never reinterpreted.
    #[serde(rename = "PROHIBITED")]
    Prohibited,
    /// Artifact provenance cannot be traced. Blocked until traced.
    #[serde(rename = "INSUFFICIENT-PROVENANCE")]
    InsufficientProvenance,
    /// Unverifiable license, or any unrecognised classification string.
    #[serde(rename = "UNKNOWN", other)]
    Unknown,
}

/// One resolved registry entry: the decision inputs, nothing more.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ResolvedEntry {
    pub classification: CommercialClassification,
    pub attribution: Option<String>,
}

/// Raw registry entry shape. The `id` is extracted before decoding (an entry
/// without one is skipped); extra fields (`model_name`, `license`,
/// `commercial_use`, `notes`, …) are evidence, not authority, and are
/// ignored here. A missing `classification`, or a non-string
/// `attribution_text`, fails the entry (it is skipped → blocked).
#[derive(Deserialize)]
struct RegistryEntry {
    classification: CommercialClassification,
    #[serde(default)]
    attribution_text: Option<String>,
}

/// Pure decision: is this resolved entry commercially cleared?
///
/// `ClearWithAttribution` additionally requires a non-empty notice — a
/// cleared-with-attribution entry without one is invalid data.
pub fn entry_is_cleared(entry: &ResolvedEntry) -> bool {
    match entry.classification {
        CommercialClassification::Clear => true,
        CommercialClassification::ClearWithAttribution => entry
            .attribution
            .as_deref()
            .is_some_and(|text| !text.trim().is_empty()),
        CommercialClassification::NonCommercial
        | CommercialClassification::Prohibited
        | CommercialClassification::InsufficientProvenance
        | CommercialClassification::Unknown => false,
    }
}

/// Pure decision over an explicit registry map (production code passes the
/// embedded [`REGISTRY`]; tests pass synthetic maps).
pub fn is_cleared_in(registry: &HashMap<String, ResolvedEntry>, id: &str) -> bool {
    registry.get(id).is_some_and(entry_is_cleared)
}

/// Parse a registry document into an id → entry map, failing closed.
///
/// - Unparseable JSON / wrong `version` / missing or non-array `entries` →
///   empty map (nothing is cleared).
/// - Entry without an id, or entry that fails to decode → skipped with an
///   error log (that model stays blocked); the rest is unaffected.
/// - Duplicate ids → first entry wins (a trailing duplicate can never shadow
///   a blocked entry into exposure).
pub fn parse_registry(json: &str) -> HashMap<String, ResolvedEntry> {
    let mut out = HashMap::new();

    let root: serde_json::Value = match serde_json::from_str(json) {
        Ok(value) => value,
        Err(err) => {
            log::error!("T10 gate: license registry is not valid JSON, failing closed: {err}");
            return out;
        }
    };

    if root.get("version").and_then(|v| v.as_str()) != Some(REGISTRY_VERSION) {
        log::error!("T10 gate: license registry version is not {REGISTRY_VERSION}, failing closed");
        return out;
    }

    let entries = match root.get("entries").and_then(|v| v.as_array()) {
        Some(entries) => entries,
        None => {
            log::error!("T10 gate: license registry has no entries array, failing closed");
            return out;
        }
    };

    for (index, raw) in entries.iter().enumerate() {
        let id = raw.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
        if id.is_empty() {
            log::error!("T10 gate: registry entry #{index} has no id, skipping");
            continue;
        }
        if out.contains_key(id) {
            log::error!("T10 gate: duplicate registry entry for '{id}', keeping the first");
            continue;
        }
        match serde_json::from_value::<RegistryEntry>(raw.clone()) {
            Ok(entry) => {
                out.insert(
                    id.to_string(),
                    ResolvedEntry {
                        classification: entry.classification,
                        attribution: entry.attribution_text,
                    },
                );
            }
            Err(err) => {
                log::error!(
                    "T10 gate: registry entry '{id}' is malformed ({err}); treating as NOT CLEARED"
                );
            }
        }
    }

    out
}

/// The embedded authoritative registry, parsed once. Any structural failure
/// yields an empty map (fail closed) via [`parse_registry`].
static REGISTRY: Lazy<HashMap<String, ResolvedEntry>> = Lazy::new(|| parse_registry(REGISTRY_JSON));

/// Number of entries in the embedded registry (all classifications).
pub fn registry_entry_count() -> usize {
    REGISTRY.len()
}

/// Number of embedded entries that are commercially cleared.
pub fn approved_count() -> usize {
    REGISTRY.values().filter(|e| entry_is_cleared(e)).count()
}

/// Number of embedded entries that are NOT cleared (blocked).
pub fn blocked_count() -> usize {
    REGISTRY.len() - approved_count()
}

/// Pure counts over an explicit map (test helper).
pub fn counts_in(registry: &HashMap<String, ResolvedEntry>) -> (usize, usize) {
    let approved = registry.values().filter(|e| entry_is_cleared(e)).count();
    (approved, registry.len() - approved)
}

/// Classification of a catalog repo id, if it has a registry entry.
pub fn classification_of(catalog_repo_id: &str) -> Option<CommercialClassification> {
    REGISTRY.get(catalog_repo_id).map(|e| e.classification)
}

/// Whether a catalog repo id is commercially cleared. Missing entries are
/// NOT cleared.
pub fn is_commercially_cleared(catalog_repo_id: &str) -> bool {
    is_cleared_in(&REGISTRY, catalog_repo_id)
}

/// Exact required attribution notice for a catalog repo id, if the registry
/// carries one. `None` for `Clear` models, blocked models, and unknown ids —
/// callers render nothing in those cases.
pub fn attribution_for(catalog_repo_id: &str) -> Option<&'static str> {
    REGISTRY
        .get(catalog_repo_id)
        .and_then(|e| e.attribution.as_deref())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Minimal synthetic registry document for decision-logic tests.
    fn synthetic(entries_json: &str) -> HashMap<String, ResolvedEntry> {
        parse_registry(&format!(
            r#"{{"version": "1.0.0", "entries": [{entries_json}]}}"#
        ))
    }

    #[test]
    fn t10_approved_clear_model_is_exposed() {
        // apache-2.0 catalog model, COMMERCIAL-CLEAR: exposed, no notice.
        let id = "handy-computer/whisper-small-gguf";
        assert!(is_commercially_cleared(id));
        assert_eq!(classification_of(id), Some(CommercialClassification::Clear));
        assert_eq!(attribution_for(id), None);
    }

    #[test]
    fn t10_attribution_required_model_is_exposed_with_exact_notice() {
        // cc-by-4.0 catalog model: exposed AND carries the exact notice.
        let id = "handy-computer/parakeet-tdt-0.6b-v3-gguf";
        assert!(is_commercially_cleared(id));
        assert_eq!(
            classification_of(id),
            Some(CommercialClassification::ClearWithAttribution)
        );
        assert_eq!(
            attribution_for(id),
            Some("Parakeet TDT 0.6B v3 by NVIDIA is licensed under CC-BY-4.0.")
        );
    }

    #[test]
    fn t10_non_commercial_model_is_blocked() {
        assert!(!is_commercially_cleared("handy-computer/canary-1b-gguf"));
        assert_eq!(
            classification_of("handy-computer/canary-1b-gguf"),
            Some(CommercialClassification::NonCommercial)
        );
        assert_eq!(attribution_for("handy-computer/canary-1b-gguf"), None);
    }

    #[test]
    fn t10_prohibited_model_is_blocked() {
        let registry =
            synthetic(r#"{"id": "org/prohibited-gguf", "classification": "PROHIBITED"}"#);
        assert!(!is_cleared_in(&registry, "org/prohibited-gguf"));
    }

    #[test]
    fn t10_unknown_model_is_blocked() {
        // Real UNKNOWN entry (catalog license "other").
        assert!(!is_commercially_cleared("handy-computer/medasr-gguf"));
        assert_eq!(
            classification_of("handy-computer/medasr-gguf"),
            Some(CommercialClassification::Unknown)
        );
        // An unrecognised classification string also resolves to Unknown.
        let registry =
            synthetic(r#"{"id": "org/future-gguf", "classification": "COMMERCIAL-MAYBE"}"#);
        assert_eq!(
            registry.get("org/future-gguf").map(|e| e.classification),
            Some(CommercialClassification::Unknown)
        );
        assert!(!is_cleared_in(&registry, "org/future-gguf"));
    }

    #[test]
    fn t10_insufficient_provenance_model_is_blocked() {
        let registry = synthetic(
            r#"{"id": "org/untraced-gguf", "classification": "INSUFFICIENT-PROVENANCE"}"#,
        );
        assert!(!is_cleared_in(&registry, "org/untraced-gguf"));
    }

    #[test]
    fn t10_missing_registry_entry_defaults_to_not_cleared() {
        assert!(!is_commercially_cleared("no/such-model-gguf"));
        assert_eq!(classification_of("no/such-model-gguf"), None);
        assert_eq!(attribution_for("no/such-model-gguf"), None);
    }

    #[test]
    fn t10_attribution_required_without_notice_is_not_cleared() {
        // Invalid data (missing notice) must fail closed, not expose.
        let registry = synthetic(
            r#"{"id": "org/nonotice-gguf", "classification": "COMMERCIAL-CLEAR-WITH-ATTRIBUTION", "attribution_text": null}"#,
        );
        assert!(!is_cleared_in(&registry, "org/nonotice-gguf"));
        let registry = synthetic(
            r#"{"id": "org/blanknotice-gguf", "classification": "COMMERCIAL-CLEAR-WITH-ATTRIBUTION", "attribution_text": "  "}"#,
        );
        assert!(!is_cleared_in(&registry, "org/blanknotice-gguf"));
    }

    #[test]
    fn t10_malformed_registry_fails_safely_closed() {
        // Garbage JSON → empty.
        assert!(parse_registry("{not json").is_empty());
        assert!(parse_registry("").is_empty());
        // Wrong or missing version → empty.
        assert!(parse_registry(r#"{"version": "9.9.9", "entries": []}"#).is_empty());
        assert!(parse_registry(r#"{"entries": []}"#).is_empty());
        // Missing / non-array entries → empty.
        assert!(parse_registry(r#"{"version": "1.0.0"}"#).is_empty());
        assert!(parse_registry(r#"{"version": "1.0.0", "entries": {}}"#).is_empty());
        // One malformed entry is skipped; valid siblings survive.
        let registry = synthetic(
            r#"{"id": "org/good-gguf", "classification": "COMMERCIAL-CLEAR"},
                {"classification": "COMMERCIAL-CLEAR"},
                {"id": "org/badclass-gguf"}"#,
        );
        assert!(is_cleared_in(&registry, "org/good-gguf"));
        assert_eq!(registry.len(), 1);
        // Duplicate ids: first wins, so a trailing duplicate can never flip a
        // blocked entry into exposure.
        let registry = synthetic(
            r#"{"id": "org/dup-gguf", "classification": "UNKNOWN"},
                {"id": "org/dup-gguf", "classification": "COMMERCIAL-CLEAR"}"#,
        );
        assert!(!is_cleared_in(&registry, "org/dup-gguf"));
    }

    #[test]
    fn t10_registry_counts_match_policy() {
        // 46 CLEAR + 15 WITH-ATTRIBUTION = 61 approved; 1 NON-COMMERCIAL + 7
        // UNKNOWN = 8 blocked; 69 entries total. Deliberately exact: any
        // registry edit must consciously update this test.
        assert_eq!(registry_entry_count(), 69);
        assert_eq!(approved_count(), 61);
        assert_eq!(blocked_count(), 8);
    }

    /// Every bundled catalog model has a registry entry, so no catalog model
    /// is blocked merely by omission. Fails on catalog regeneration until the
    /// registry is extended (MODEL_LICENSES.md §7).
    #[test]
    fn t10_registry_covers_every_catalog_model() {
        #[derive(Deserialize)]
        struct Root {
            models: Vec<Entry>,
        }
        #[derive(Deserialize)]
        struct Entry {
            id: String,
        }
        let root: Root =
            serde_json::from_str(include_str!("catalog.json")).expect("catalog parses");
        assert!(!root.models.is_empty());
        let mut missing = Vec::new();
        for model in &root.models {
            if !REGISTRY.contains_key(&model.id) {
                missing.push(model.id.clone());
            }
        }
        assert!(
            missing.is_empty(),
            "catalog models without a license registry entry (blocked by omission): {missing:?}"
        );
    }

    /// No silent reclassification: every non-UNKNOWN registry license label
    /// matches the catalog-declared label for that model.
    #[test]
    fn t10_registry_licenses_match_catalog_labels() {
        #[derive(Deserialize)]
        struct Root {
            models: Vec<Entry>,
        }
        #[derive(Deserialize)]
        struct Entry {
            id: String,
            license: String,
        }
        let root: Root =
            serde_json::from_str(include_str!("catalog.json")).expect("catalog parses");
        let by_id: HashMap<&str, &str> = root
            .models
            .iter()
            .map(|m| (m.id.as_str(), m.license.as_str()))
            .collect();
        let raw: serde_json::Value = serde_json::from_str(REGISTRY_JSON).expect("registry parses");
        for entry in raw
            .get("entries")
            .and_then(|v| v.as_array())
            .expect("entries array")
        {
            let id = entry.get("id").and_then(|v| v.as_str()).expect("id");
            let label = entry
                .get("license")
                .and_then(|v| v.as_str())
                .expect("license");
            let catalog_label = by_id
                .get(id)
                .unwrap_or_else(|| panic!("{id} not in catalog"));
            if label != "UNKNOWN" {
                assert_eq!(
                    label, *catalog_label,
                    "registry license for {id} must match the catalog label"
                );
            }
        }
    }
}
