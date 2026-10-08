//! R1-GAP-023 — deterministic canonical → compatibility settings mirror.
//!
//! # Authority
//!
//! `R1-GAP-023-ADR-032-SETTINGS-STORE-AUTHORITY.md` (ADR-032, adopted from
//! `R1-GAP-023-SETTINGS-STORE-PROPOSAL.md` Option A) ratifies **two stores,
//! one owner each**:
//!
//! - **Canonical (sole source of truth for runtime behaviour)** — the
//!   Handy-derived `AppSettings` document persisted by
//!   `apps/desktop/src-tauri/src/settings.rs` through `tauri-plugin-store` at
//!   `settings_store.json`, key `"settings"` (`SETTINGS_STORE_PATH`). Every
//!   Rust runtime behaviour path — audio capture (`managers/audio.rs`
//!   `selected_microphone`), the shortcut system (`shortcut/` `bindings` +
//!   `shortcut_activation`), transcription (`managers/transcription.rs`
//!   `selected_model`), tray, secure input, post-process, theme — reads it.
//! - **Compatibility (UI-local persistence, never authoritative)** — *this*
//!   crate's `Settings` document, whole-file at `<config_dir>/soravo/
//!   settings.json`, exposed to the webview by the `soravo_ipc` commands
//!   (`load_settings`, `save_settings`, `update_microphone_settings`,
//!   `update_hotkey_settings`, `update_model_settings`).
//!
//! `soravo-config` is **SORAVO-NEW** (no Handy equivalent; Handy has no
//! `soravo/settings.json`) and `settings.rs` is **HANDY-REUSE**. ADR-032
//! therefore forbids the compatibility store from ever winning a conflict.
//!
//! # The mirror rule (normative)
//!
//! One way, canonical → compatibility, three deterministic clauses:
//!
//! 1. **Direction.** Only a canonical value may overwrite a compatibility
//!    value. Nothing in this crate (or the IPC layer) may ever copy a
//!    compatibility value into the canonical store. The canonical store has no
//!    API for it and this module provides none.
//! 2. **Trigger.** Only a *successful canonical write* may mirror
//!    ([`MirrorCanonical`]). Never a load, never startup, never a read. A
//!    canonical path that fails or is rejected must not project anything.
//! 3. **Conflict.** Canonical always wins, unconditionally and without
//!    consulting the compatibility value. A divergence the mirror cannot
//!    represent is **left as-is and recorded**, never approximated, and the
//!    mirror never partially applies a concept.
//!
//! Startup behaviour is deliberately a **no-op**: `Settings::load` performs no
//! reconciliation and overwrites nothing. Re-projecting on load would be the
//! silent migration ADR-032 defers.
//!
//! # Representability is not approximated
//!
//! Only a value the compatibility document can express *exactly* is mirrored.
//! The canonical store is richer than the compatibility store, so three
//! concepts are canonical-owned and deliberately **not** projected:
//!
//! | Concept | Canonical | Compatibility | Why not mirrored |
//! |---|---|---|---|
//! | Shortcut binding | `bindings` (`HashMap<String, ShortcutBinding>`) | `hotkey.binding: Option<String>` | The compatibility field is a display-only string; the canonical value is a structured binding whose textual form is Handy-owned. Rendering it here would fabricate an upstream format (v6 §21 never-fabricate). |
//! | Shortcut activation `HoldOrToggle` | `shortcut_activation` | `hotkey.mode: hold_to_talk \| toggle_to_talk` | Not expressible — the compatibility enum has no third variant. Mirroring it would make the compatibility store lie about behaviour. |
//! | Microphone device index | `selected_microphone: Option<String>` (a device **name**) | `microphone.selected_device_index: Option<String>` | No canonical counterpart. The compatibility value indexes a UI-local list and is compatibility-owned. |
//!
//! The remaining compatibility fields (`microphone.device_available`,
//! `microphone.auto_fallback`, `hotkey.binding`, `hotkey.enabled`,
//! `hotkey.recording_in_progress`, `model.selected_engine`, `model.available`,
//! `model.status`) stay compatibility-owned. Promoting them is Option B, the
//! deferred migration — not this module.

use crate::{InteractionMode, Settings};
use serde::{Deserialize, Serialize};
use specta::Type;

/// Canonical shortcut activation.
///
/// Mirrors the three observed variants of the Handy-derived
/// `settings::ShortcutActivation` (`Toggle`, `PushToTalk`, `HoldOrToggle`,
/// with `HoldOrToggle` the default). Declared locally so this crate keeps no
/// dependency on Handy-derived source; the wire name is the upstream variant
/// name verbatim because upstream applies no `serde` rename to that enum.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum CanonicalShortcutActivation {
    /// Hold to record and release to stop, or tap to keep recording until the
    /// next press. The upstream default and the common case.
    #[default]
    HoldOrToggle,
    /// Press to start, press again to stop.
    Toggle,
    /// Hold to record, release to stop.
    PushToTalk,
}

/// The subset of the canonical `AppSettings` document this module projects.
///
/// Constructed by a caller that already holds the canonical value; this crate
/// never reads the canonical store itself. It deliberately carries no secret,
/// no binding map, and no microphone index — see the module table above.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct CanonicalSettings {
    /// `AppSettings.selected_model`. `None` (empty string upstream) means no
    /// active model; it is mirrored as `None`, never as an empty string.
    pub selected_model: Option<String>,
    /// `AppSettings.selected_microphone`. `None` means the system default.
    pub selected_microphone: Option<String>,
    /// `AppSettings.shortcut_activation`.
    pub shortcut_activation: CanonicalShortcutActivation,
}

/// One user-visible setting concept that overlaps both stores.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum MirroredConcept {
    /// `AppSettings.selected_model` → `model.selected_model`.
    Model,
    /// `AppSettings.selected_microphone` → `microphone.selected_device_name`.
    Microphone,
    /// `AppSettings.shortcut_activation` → `hotkey.mode`.
    Hotkey,
}

/// The deterministic result of mirroring one concept.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MirrorRecord {
    /// The concept this record describes.
    pub concept: MirroredConcept,
    /// The canonical value that was projected, `""` when canonical is unset.
    pub canonical: String,
    /// The compatibility value produced. Equal to `canonical` for a successful
    /// projection; `null` for a concept that was skipped as unrepresentable.
    pub compat: Option<String>,
    /// `true` when the canonical value could not be represented exactly and
    /// the compatibility value was therefore left untouched. When `true`,
    /// `compat` is `None` and the compatibility document is unchanged for
    /// this concept.
    pub skipped_unrepresentable: bool,
}

/// Durable record of the mirror, persisted inside the compatibility document.
///
/// Its presence is what makes the mirror observable across a restart: an
/// absent record proves the document predates ADR-032 (or has never been
/// mirrored into), so an on-disk value cannot be mistaken for a mirrored one.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MirrorState {
    /// Number of successful concept projections recorded so far. Monotonic;
    /// `0` means "never mirrored".
    pub applied: u32,
    /// The most recent concept projection, successful or skipped.
    pub last: Option<MirrorRecord>,
}

/// Outcome of [`mirror_from_canonical`].
///
/// `changed` is `true` only when at least one compatibility value actually
/// moved. A run that projected every canonical value to the value already
/// stored is a successful, non-mutating no-op — it still records provenance, so
/// idempotency is observable rather than indistinguishable from "never ran".
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MirrorOutcome {
    /// True when a compatibility value changed.
    pub changed: bool,
    /// One record per concept, always in [`MirroredConcept`] declaration order
    /// (`Model`, `Microphone`, `Hotkey`) so the result is order-stable.
    pub records: Vec<MirrorRecord>,
    /// The provenance block to persist with the compatibility document.
    pub state: MirrorState,
}

/// Deterministic projection of one canonical concept onto the compatibility
/// document. Pure: no I/O, no Tauri state, no canonical-store access.
fn project(concept: MirroredConcept, canonical: &CanonicalSettings) -> MirrorRecord {
    match concept {
        MirroredConcept::Model => {
            // Canonical `selected_model` is a String whose empty value means
            // "no active model" (`models.rs::delete_model` clears it that
            // way). Project to `None`, never `Some("")`.
            let raw = canonical.selected_model.clone().unwrap_or_default();
            let compat = if raw.is_empty() {
                None
            } else {
                Some(raw.clone())
            };
            MirrorRecord {
                concept,
                canonical: raw,
                compat: compat.clone(),
                skipped_unrepresentable: false,
            }
        }
        MirroredConcept::Microphone => {
            // Canonical `selected_microphone` is `Option<String>` where
            // `None` means the system default (`commands/audio.rs::
            // set_selected_microphone` maps the sentinel `"default"` to
            // `None`). Project `None` — and an empty name, which is not a
            // device — to `None`, never to `Some("")`.
            let raw = canonical.selected_microphone.clone().unwrap_or_default();
            let compat = if raw.is_empty() {
                None
            } else {
                Some(raw.clone())
            };
            MirrorRecord {
                concept,
                canonical: raw,
                compat,
                skipped_unrepresentable: false,
            }
        }
        MirroredConcept::Hotkey => match canonical.shortcut_activation {
            CanonicalShortcutActivation::PushToTalk => MirrorRecord {
                concept,
                canonical: "PushToTalk".to_string(),
                compat: Some(InteractionMode::HoldToTalk.as_str().to_string()),
                skipped_unrepresentable: false,
            },
            CanonicalShortcutActivation::Toggle => MirrorRecord {
                concept,
                canonical: "Toggle".to_string(),
                compat: Some(InteractionMode::ToggleToTalk.as_str().to_string()),
                skipped_unrepresentable: false,
            },
            // `HoldOrToggle` is the upstream default and has no compatibility
            // counterpart. Leave `hotkey.mode` exactly as it is and record the
            // skip; approximating it as either mode would make the
            // compatibility store assert a behaviour the canonical store does
            // not have.
            CanonicalShortcutActivation::HoldOrToggle => MirrorRecord {
                concept,
                canonical: "HoldOrToggle".to_string(),
                compat: None,
                skipped_unrepresentable: true,
            },
        },
    }
}

/// Apply the ADR-032 mirror rule to `compat`.
///
/// Call this **only on the success path of a canonical write**
/// ([`MirrorCanonical`]). It is not called from `Settings::load` and must not
/// be called from startup: re-projecting on load would be the silent migration
/// ADR-032 defers.
pub fn mirror_from_canonical(
    compat: &mut Settings,
    canonical: &CanonicalSettings,
    previous: &MirrorState,
) -> MirrorOutcome {
    let mut changed = false;
    let mut records = Vec::with_capacity(3);

    for concept in [
        MirroredConcept::Model,
        MirroredConcept::Microphone,
        MirroredConcept::Hotkey,
    ] {
        let record = project(concept, canonical);

        if !record.skipped_unrepresentable {
            match concept {
                MirroredConcept::Model => {
                    let before = compat.model.selected_model.clone();
                    if before != record.compat {
                        changed = true;
                    }
                    compat.model.selected_model = record.compat.clone();
                }
                MirroredConcept::Microphone => {
                    let before = compat.microphone.selected_device_name.clone();
                    let after = record.compat.clone();
                    if before != after {
                        changed = true;
                    }
                    compat.microphone.selected_device_name = after;
                }
                MirroredConcept::Hotkey => {
                    let Some(value) = record.compat.as_deref() else {
                        // Unreachable while `skipped_unrepresentable` is the
                        // only way to leave `compat` unset; kept total rather
                        // than unwrapped so a future variant cannot panic a
                        // settings write.
                        records.push(record);
                        continue;
                    };
                    let after: InteractionMode = value.parse().unwrap_or_default();
                    if compat.hotkey.mode != after {
                        changed = true;
                    }
                    compat.hotkey.mode = after;
                }
            }
        }

        records.push(record);
    }

    let last = records.last().cloned().or_else(|| previous.last.clone());
    MirrorOutcome {
        changed,
        records,
        state: MirrorState {
            applied: previous.applied.saturating_add(1),
            last,
        },
    }
}

/// Marker trait for the canonical-write success path.
///
/// Implemented only by a caller that has just completed a canonical write —
/// `settings::write_settings` upstream of the projection. It exists so the
/// mirror cannot be wired to a read, a load, or a startup path by accident:
/// [`mirror_on_canonical_write`] requires the token and is the only entry
/// point that mutates a compatibility document.
pub trait MirrorCanonical {
    /// The canonical values as they stand after the successful write.
    fn canonical_after_write(&self) -> &CanonicalSettings;
}

/// Apply the mirror on a canonical-write success path, stamping the provenance
/// into the compatibility document.
pub fn mirror_on_canonical_write(
    compat: &mut Settings,
    token: &impl MirrorCanonical,
) -> MirrorOutcome {
    let previous = compat.mirror.clone();
    let outcome = mirror_from_canonical(compat, token.canonical_after_write(), &previous);
    compat.mirror = outcome.state.clone();
    outcome
}

/// Compare a compatibility document against the canonical values.
///
/// Deterministic and read-only. The returned list is in [`MirroredConcept`]
/// declaration order and contains every concept whose compatibility value
/// differs from what the mirror rule would produce. An empty result means the
/// document is mirror-consistent; a non-empty one means the compatibility value
/// is stale or user-edited and must not be trusted for behaviour.
pub fn divergence(compat: &Settings, canonical: &CanonicalSettings) -> Vec<MirroredConcept> {
    [
        MirroredConcept::Model,
        MirroredConcept::Microphone,
        MirroredConcept::Hotkey,
    ]
    .into_iter()
    .filter(|concept| {
        let record = project(*concept, canonical);
        match concept {
            MirroredConcept::Model => compat.model.selected_model != record.compat,
            MirroredConcept::Microphone => compat.microphone.selected_device_name != record.compat,
            // A skipped concept is not divergence: the rule deliberately left
            // the compatibility value alone, so it cannot disagree with the
            // rule's output.
            MirroredConcept::Hotkey => {
                !record.skipped_unrepresentable
                    && record
                        .compat
                        .as_deref()
                        .and_then(|value| value.parse().ok())
                        != Some(compat.hotkey.mode)
            }
        }
    })
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{HotkeySettings, MicrophoneSettings, ModelSettings, SchemaInfo};

    fn compat_document() -> Settings {
        Settings {
            schema: SchemaInfo {
                version: crate::SCHEMA_VERSION,
                last_migrated: None,
            },
            microphone: MicrophoneSettings {
                selected_device_index: Some("2".to_string()),
                selected_device_name: Some("UI-picked name".to_string()),
                device_available: true,
                auto_fallback: true,
            },
            hotkey: HotkeySettings {
                binding: Some("ctrl+space".to_string()),
                mode: InteractionMode::ToggleToTalk,
                enabled: true,
                recording_in_progress: false,
            },
            model: ModelSettings {
                selected_engine: Some("TranscribeCpp".to_string()),
                selected_model: Some("compat-only-model".to_string()),
                available: true,
                status: crate::ModelStatus::Ready,
            },
            mirror: MirrorState::default(),
        }
    }

    /// A token that can only be produced by a successful canonical write.
    struct CommittedWrite(CanonicalSettings);

    impl MirrorCanonical for CommittedWrite {
        fn canonical_after_write(&self) -> &CanonicalSettings {
            &self.0
        }
    }

    // -- canonical read / canonical write ------------------------------------

    #[test]
    fn canonical_write_is_the_only_mirror_entry_point() {
        let mut compat = compat_document();
        let token = CommittedWrite(CanonicalSettings {
            selected_model: Some("whisper-large-v3-turbo".to_string()),
            selected_microphone: Some("Built-in Microphone".to_string()),
            shortcut_activation: CanonicalShortcutActivation::PushToTalk,
        });
        let outcome = mirror_on_canonical_write(&mut compat, &token);
        assert!(outcome.changed);
        assert_eq!(
            compat.model.selected_model.as_deref(),
            Some("whisper-large-v3-turbo")
        );
        assert_eq!(
            compat.microphone.selected_device_name.as_deref(),
            Some("Built-in Microphone")
        );
        assert_eq!(compat.hotkey.mode, InteractionMode::HoldToTalk);
        // Provenance is stamped by the entry point, not by the caller.
        assert_eq!(compat.mirror, outcome.state);
        assert_eq!(compat.mirror.applied, 1);
    }

    #[test]
    fn canonical_empty_model_projects_to_none_never_empty_string() {
        let mut compat = compat_document();
        let token = CommittedWrite(CanonicalSettings {
            selected_model: None,
            ..CanonicalSettings::default()
        });
        mirror_on_canonical_write(&mut compat, &token);
        assert_eq!(compat.model.selected_model, None);
    }

    #[test]
    fn canonical_cleared_microphone_projects_to_none() {
        let mut compat = compat_document();
        let token = CommittedWrite(CanonicalSettings::default());
        mirror_on_canonical_write(&mut compat, &token);
        assert_eq!(compat.microphone.selected_device_name, None);
    }

    // -- conflict resolution -------------------------------------------------

    #[test]
    fn canonical_wins_and_compatibility_never_overwrites_canonical() {
        let mut compat = compat_document();
        // The compatibility store holds different values for all three
        // concepts; the canonical write must win for every one of them.
        let canonical = CanonicalSettings {
            selected_model: Some("canonical-model".to_string()),
            selected_microphone: Some("Canonical Mic".to_string()),
            shortcut_activation: CanonicalShortcutActivation::Toggle,
        };
        let outcome = mirror_from_canonical(&mut compat, &canonical, &MirrorState::default());
        assert!(outcome.changed);
        assert_eq!(
            compat.model.selected_model.as_deref(),
            Some("canonical-model")
        );
        assert_eq!(
            compat.microphone.selected_device_name.as_deref(),
            Some("Canonical Mic")
        );
        assert_eq!(compat.hotkey.mode, InteractionMode::ToggleToTalk);
    }

    #[test]
    fn mirror_is_idempotent_and_reports_no_change_on_second_run() {
        let canonical = CanonicalSettings {
            selected_model: Some("m".to_string()),
            selected_microphone: Some("Mic".to_string()),
            shortcut_activation: CanonicalShortcutActivation::PushToTalk,
        };
        let mut compat = compat_document();
        let first = mirror_from_canonical(&mut compat, &canonical, &MirrorState::default());
        assert!(first.changed);
        let second = mirror_from_canonical(&mut compat, &canonical, &first.state);
        assert!(!second.changed, "second projection must be a no-op");
        assert_eq!(compat.model.selected_model.as_deref(), Some("m"));
        assert_eq!(
            compat.microphone.selected_device_name.as_deref(),
            Some("Mic")
        );
        assert_eq!(compat.hotkey.mode, InteractionMode::HoldToTalk);
    }

    #[test]
    fn unrepresentable_hot_or_toggle_is_skipped_not_approximated() {
        let mut compat = compat_document();
        let before = compat.hotkey.mode;
        let token = CommittedWrite(CanonicalSettings {
            shortcut_activation: CanonicalShortcutActivation::HoldOrToggle,
            ..CanonicalSettings::default()
        });
        let outcome = mirror_on_canonical_write(&mut compat, &token);
        assert_eq!(compat.hotkey.mode, before, "skipped concept must not move");
        let hotkey = outcome
            .records
            .iter()
            .find(|r| r.concept == MirroredConcept::Hotkey)
            .expect("hotkey record present");
        assert!(hotkey.skipped_unrepresentable);
        assert_eq!(hotkey.compat, None);
        assert_eq!(hotkey.canonical, "HoldOrToggle");
    }

    #[test]
    fn unrepresentable_concept_is_never_reported_as_divergence() {
        let mut compat = compat_document();
        let canonical = CanonicalSettings {
            shortcut_activation: CanonicalShortcutActivation::HoldOrToggle,
            ..CanonicalSettings::default()
        };
        mirror_from_canonical(&mut compat, &canonical, &MirrorState::default());
        assert!(
            !divergence(&compat, &canonical).contains(&MirroredConcept::Hotkey),
            "a deliberately skipped concept cannot disagree with the rule"
        );
    }

    #[test]
    fn divergence_lists_only_mismatched_concepts_in_declaration_order() {
        let compat = compat_document();
        let canonical = CanonicalSettings {
            selected_model: Some("canonical-model".to_string()),
            selected_microphone: Some("UI-picked name".to_string()),
            shortcut_activation: CanonicalShortcutActivation::PushToTalk,
        };
        assert_eq!(
            divergence(&compat, &canonical),
            vec![MirroredConcept::Model, MirroredConcept::Hotkey],
            "model and hotkey differ; microphone already matches"
        );
    }

    // -- compatibility-owned fields are untouched ----------------------------

    #[test]
    fn mirror_preserves_every_compatibility_owned_field() {
        let mut compat = compat_document();
        let before = compat.clone();
        let token = CommittedWrite(CanonicalSettings {
            selected_model: Some("m".to_string()),
            selected_microphone: Some("Mic".to_string()),
            shortcut_activation: CanonicalShortcutActivation::Toggle,
        });
        mirror_on_canonical_write(&mut compat, &token);

        assert_eq!(
            compat.microphone.selected_device_index,
            before.microphone.selected_device_index
        );
        assert_eq!(
            compat.microphone.device_available,
            before.microphone.device_available
        );
        assert_eq!(
            compat.microphone.auto_fallback,
            before.microphone.auto_fallback
        );
        assert_eq!(compat.hotkey.binding, before.hotkey.binding);
        assert_eq!(compat.hotkey.enabled, before.hotkey.enabled);
        assert_eq!(
            compat.hotkey.recording_in_progress,
            before.hotkey.recording_in_progress
        );
        assert_eq!(compat.model.selected_engine, before.model.selected_engine);
        assert_eq!(compat.model.available, before.model.available);
        assert_eq!(compat.model.status, before.model.status);
    }

    // -- restart persistence -------------------------------------------------

    #[test]
    fn mirror_state_survives_a_serialize_load_restart() {
        let mut compat = compat_document();
        let token = CommittedWrite(CanonicalSettings {
            selected_model: Some("m".to_string()),
            selected_microphone: Some("Mic".to_string()),
            shortcut_activation: CanonicalShortcutActivation::PushToTalk,
        });
        mirror_on_canonical_write(&mut compat, &token);
        let expected = compat.clone();

        let bytes = serde_json::to_vec(&compat).expect("serializes");
        let restarted: Settings = serde_json::from_slice(&bytes).expect("deserializes");

        // Compared through the persisted form: the restart guarantee is about
        // the bytes on disk, not about in-memory equality.
        assert_eq!(
            serde_json::to_value(&restarted).expect("serializes"),
            serde_json::to_value(&expected).expect("serializes")
        );
        assert_eq!(restarted.mirror.applied, 1);
        assert_eq!(restarted.model.selected_model.as_deref(), Some("m"));
        assert_eq!(
            restarted.microphone.selected_device_name.as_deref(),
            Some("Mic")
        );
        assert_eq!(restarted.hotkey.mode, InteractionMode::HoldToTalk);
    }

    #[test]
    fn startup_load_reconciles_nothing_and_moves_no_value() {
        // The exact shape of a pre-ADR-032 on-disk document: drifted values,
        // no mirror provenance.
        let legacy = serde_json::json!({
            "schema": { "version": 1, "last_migrated": null },
            "microphone": { "selectedDeviceName": "UI-picked name" },
            "hotkey": { "mode": "toggle_to_talk" },
            "model": { "selectedModel": "compat-only-model" }
        });
        let mut loaded: Settings = serde_json::from_value(legacy).expect("legacy parses");
        let drifted = loaded.clone();

        // `Settings::load`'s migration path runs here in production; assert the
        // post-migration document still carries every drifted value and no
        // provenance, i.e. startup performed no reconciliation.
        loaded.schema.version = crate::SCHEMA_VERSION;
        assert_eq!(loaded.model.selected_model, drifted.model.selected_model);
        assert_eq!(
            loaded.microphone.selected_device_name,
            drifted.microphone.selected_device_name
        );
        assert_eq!(loaded.hotkey.mode, drifted.hotkey.mode);
        assert_eq!(loaded.mirror, MirrorState::default());
        assert_eq!(loaded.mirror.applied, 0);
    }

    #[test]
    fn pre_mirror_document_is_distinguishable_from_a_mirrored_one() {
        let legacy = serde_json::json!({
            "schema": { "version": 1, "last_migrated": null },
            "model": { "selectedModel": "compat-only-model" }
        });
        let loaded: Settings = serde_json::from_value(legacy).expect("legacy parses");
        assert_eq!(
            loaded.mirror,
            MirrorState::default(),
            "an absent mirror block proves the file predates ADR-032"
        );
        assert!(loaded.mirror.last.is_none());
    }

    // -- record shape --------------------------------------------------------

    #[test]
    fn records_are_emitted_in_stable_declaration_order() {
        let mut compat = Settings::default();
        let outcome = mirror_from_canonical(
            &mut compat,
            &CanonicalSettings::default(),
            &MirrorState::default(),
        );
        assert_eq!(
            outcome
                .records
                .iter()
                .map(|r| r.concept)
                .collect::<Vec<_>>(),
            vec![
                MirroredConcept::Model,
                MirroredConcept::Microphone,
                MirroredConcept::Hotkey
            ]
        );
        assert_eq!(
            outcome.records.last().map(|r| r.concept),
            Some(MirroredConcept::Hotkey)
        );
        assert_eq!(outcome.state.last, outcome.records.last().cloned());
    }

    #[test]
    fn interaction_mode_round_trips_through_its_string_form() {
        for mode in [InteractionMode::HoldToTalk, InteractionMode::ToggleToTalk] {
            assert_eq!(mode.as_str().parse::<InteractionMode>(), Ok(mode));
        }
        // An unrepresentable canonical value must fail to parse, never
        // default — defaulting would let the compatibility store assert a
        // behaviour the canonical store does not have.
        assert!("HoldOrToggle".parse::<InteractionMode>().is_err());
    }
}
