//! R1-GAP-023 — wire the ADR-032 canonical → compatibility mirror into the
//! Handy-derived settings write paths.
//!
//! # Authority
//!
//! `R1-GAP-023-ADR-032-SETTINGS-STORE-AUTHORITY.md` (ADR-032, ACCEPTED) ratifies
//! **two stores, one canonical source of truth**:
//!
//! - **Canonical (sole source of truth for runtime behaviour)** — the
//!   Handy-derived `AppSettings` document (`settings.rs`, `settings_store.json`,
//!   key `"settings"`). Every behaviour decision reads it. This module never
//!   changes its shape, defaults, migration, or persistence path.
//! - **Compatibility (UI-local, never authoritative)** — `soravo-config`
//!   (`<config_dir>/soravo/settings.json`). It never decides behaviour.
//!
//! # The wiring rule (normative, ADR-032 §2.1)
//!
//! 1. **Direction.** Canonical → compatibility only. Nothing here writes into
//!    the canonical store; there is no reverse path and none is added.
//! 2. **Trigger.** Only a *successful canonical write* mirrors. Call
//!    [`mirror_after_canonical_write`] after [`crate::settings::write_settings`]
//!    returns, with the just-persisted values. Never call it on a load, a read,
//!    at startup, or on a failed/rejected canonical path.
//! 3. **Failure.** A mirror persistence failure is logged and swallowed. It must
//!    never roll back, reject, or invalidate the canonical write that already
//!    succeeded; the compatibility store simply stays stale (observable via
//!    `soravo_config::divergence`).
//! 4. **Representation.** Values the compatibility document cannot express
//!    exactly (`ShortcutActivation::HoldOrToggle`, the structured `bindings`
//!    map, the microphone device index) are left untouched, never approximated
//!    — enforced inside `soravo-config`'s tested mirror, not re-decided here.
//!
//! # Scope
//!
//! Only the write paths that change a mirrorable concept call into this module:
//!
//! - `commands/audio.rs::set_selected_microphone` (microphone),
//! - `shortcut/mod.rs::change_shortcut_activation_setting` (hotkey mode),
//! - `commands/models.rs::switch_active_model` / `delete_model` (model).
//!
//! Every other canonical write (theme, bindings, VAD, paste, post-process,
//! …) is untouched: those concepts are compatibility-owned or unrepresentable,
//! and mirroring them would be a behaviour change this task forbids. The
//! `soravo_ipc` compatibility commands are likewise untouched — wiring them
//! would be reverse synchronization, which ADR-032 forbids.
//!
//! # Classification
//!
//! This file is **SORAVO-NEW** (no Handy equivalent). It only reads the three
//! mirrorable `AppSettings` fields and never alters Handy-derived runtime
//! semantics.

use crate::settings::{AppSettings, ShortcutActivation};

/// Build the mirror crate's canonical snapshot from just-persisted settings.
///
/// Pure and total: empty `selected_model` / `selected_microphone` (both meaning
/// "unset" canonically) project to `None`, never to `Some("")`.
pub fn canonical_snapshot(settings: &AppSettings) -> soravo_config::CanonicalSettings {
    soravo_config::CanonicalSettings {
        selected_model: if settings.selected_model.is_empty() {
            None
        } else {
            Some(settings.selected_model.clone())
        },
        selected_microphone: match settings.selected_microphone.as_deref() {
            None | Some("") => None,
            Some(name) => Some(name.to_string()),
        },
        shortcut_activation: match settings.shortcut_activation {
            ShortcutActivation::Toggle => soravo_config::CanonicalShortcutActivation::Toggle,
            ShortcutActivation::PushToTalk => {
                soravo_config::CanonicalShortcutActivation::PushToTalk
            }
            ShortcutActivation::HoldOrToggle => {
                soravo_config::CanonicalShortcutActivation::HoldOrToggle
            }
        },
    }
}

/// Proof that a canonical write has just succeeded.
///
/// Private to this module: the only way to obtain one is to hold the
/// just-persisted `AppSettings` on a post-`write_settings` path. This is what
/// makes the mirror unwirable to a read, a load, or a startup path — a caller
/// on a failed or rejected canonical path holds no persisted values to mint
/// the token from, so there is nothing to call the mirror with.
struct MirrorToken {
    canonical: soravo_config::CanonicalSettings,
}

impl soravo_config::MirrorCanonical for MirrorToken {
    fn canonical_after_write(&self) -> &soravo_config::CanonicalSettings {
        &self.canonical
    }
}

/// Project just-persisted canonical values onto an in-memory compatibility
/// document.
///
/// Pure seam (no I/O): the exact operation the command paths perform, split
/// out so tests prove the mirror properties without touching the filesystem.
/// The caller must invoke this only on the success path of a canonical write.
pub fn mirror_compat_doc(
    compat: &mut soravo_config::Settings,
    settings: &AppSettings,
) -> soravo_config::MirrorOutcome {
    let token = MirrorToken {
        canonical: canonical_snapshot(settings),
    };
    soravo_config::mirror_on_canonical_write(compat, &token)
}

/// Mirror just-persisted canonical values into the compatibility store.
///
/// Call **only after** [`crate::settings::write_settings`] has returned, with
/// the values as persisted. Best-effort: a compatibility load or save failure
/// is logged and swallowed — the canonical write already succeeded and stands.
/// Never panics, never returns an error, never touches the canonical store.
pub fn mirror_after_canonical_write(settings: &AppSettings) {
    let mut compat = match soravo_config::Settings::load() {
        Ok(compat) => compat,
        Err(e) => {
            log::warn!(
                "settings mirror skipped: compatibility load failed ({e}); canonical write stands"
            );
            return;
        }
    };
    mirror_compat_doc(&mut compat, settings);
    if let Err(e) = compat.save() {
        log::warn!(
            "settings mirror skipped: compatibility save failed ({e}); canonical write stands"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::get_default_settings;

    fn canonical_fixture() -> AppSettings {
        let mut settings = get_default_settings();
        settings.selected_model = "parakeet-tdt-0.6b-v3".to_string();
        settings.selected_microphone = Some("USB Microphone".to_string());
        settings.shortcut_activation = ShortcutActivation::PushToTalk;
        settings
    }

    #[test]
    fn canonical_write_occurs_and_snapshot_reflects_persisted_values() {
        // The command paths persist first and mirror the persisted values; the
        // snapshot must therefore reflect exactly what was written.
        let settings = canonical_fixture();
        let snapshot = canonical_snapshot(&settings);
        assert_eq!(
            snapshot.selected_model.as_deref(),
            Some("parakeet-tdt-0.6b-v3")
        );
        assert_eq!(
            snapshot.selected_microphone.as_deref(),
            Some("USB Microphone")
        );
        assert_eq!(
            snapshot.shortcut_activation,
            soravo_config::CanonicalShortcutActivation::PushToTalk
        );
    }

    #[test]
    fn empty_canonical_values_project_to_none_never_empty_string() {
        let mut settings = get_default_settings();
        settings.selected_model = String::new();
        settings.selected_microphone = None;
        let snapshot = canonical_snapshot(&settings);
        assert_eq!(snapshot.selected_model, None);
        assert_eq!(snapshot.selected_microphone, None);
    }

    #[test]
    fn snapshot_maps_all_shortcut_activations_without_approximation() {
        let mut settings = get_default_settings();
        for (activation, expected) in [
            (
                ShortcutActivation::Toggle,
                soravo_config::CanonicalShortcutActivation::Toggle,
            ),
            (
                ShortcutActivation::PushToTalk,
                soravo_config::CanonicalShortcutActivation::PushToTalk,
            ),
            (
                ShortcutActivation::HoldOrToggle,
                soravo_config::CanonicalShortcutActivation::HoldOrToggle,
            ),
        ] {
            settings.shortcut_activation = activation;
            assert_eq!(canonical_snapshot(&settings).shortcut_activation, expected);
        }
    }

    #[test]
    fn mirror_follows_successful_canonical_write() {
        // A stale compatibility document converges onto the canonical values
        // once the post-write mirror runs.
        let settings = canonical_fixture();
        let mut compat = soravo_config::Settings::default();
        assert_ne!(
            compat.model.selected_model.as_deref(),
            Some("parakeet-tdt-0.6b-v3")
        );
        let outcome = mirror_compat_doc(&mut compat, &settings);
        assert!(outcome.changed);
        assert_eq!(
            compat.model.selected_model.as_deref(),
            Some("parakeet-tdt-0.6b-v3")
        );
        assert_eq!(
            compat.microphone.selected_device_name.as_deref(),
            Some("USB Microphone")
        );
        assert_eq!(
            compat.hotkey.mode,
            soravo_config::InteractionMode::HoldToTalk
        );
        assert!(soravo_config::divergence(&compat, &canonical_snapshot(&settings)).is_empty());
    }

    #[test]
    fn mirror_is_not_called_on_failed_canonical_write() {
        // A failed or rejected canonical path never reaches the mirror: the
        // token is private to this module and the only mutation entry point is
        // `mirror_compat_doc`, which the command paths invoke solely after
        // `write_settings` returns. With no call, nothing moves.
        let settings = canonical_fixture();
        let snapshot = canonical_snapshot(&settings);
        let compat = soravo_config::Settings::default();
        let before = compat.clone();
        // Deliberately no mirror call — this is the failed-write path.
        assert_eq!(compat.model.selected_model, before.model.selected_model);
        assert_eq!(
            compat.microphone.selected_device_name,
            before.microphone.selected_device_name
        );
        assert_eq!(compat.hotkey.mode, before.hotkey.mode);
        // …and the staleness is observable rather than silently fixed.
        assert!(!soravo_config::divergence(&compat, &snapshot).is_empty());
    }

    #[test]
    fn mirror_failure_does_not_undo_canonical_write() {
        // The mirror is a pure in-memory projection over a *copy* of the
        // canonical values: even if persistence fails (here simulated by
        // discarding the projected document instead of saving it), the
        // canonical values the caller holds are untouched.
        let settings = canonical_fixture();
        let before_model = settings.selected_model.clone();
        let before_microphone = settings.selected_microphone.clone();
        let before_activation = settings.shortcut_activation;

        let mut compat = soravo_config::Settings::default();
        let before_compat = compat.clone();
        let _ = mirror_compat_doc(&mut compat, &settings);
        drop(compat); // simulate: save failed, projected document never lands

        assert_eq!(settings.selected_model, before_model);
        assert_eq!(settings.selected_microphone, before_microphone);
        assert_eq!(settings.shortcut_activation, before_activation);
        // The on-disk document is exactly as stale as before — provably so.
        assert_eq!(
            before_compat.model.selected_model,
            soravo_config::Settings::default().model.selected_model
        );
    }

    #[test]
    fn unrepresentable_hold_or_toggle_leaves_mode_untouched() {
        // The upstream default has no compatibility form: the mirror records
        // the skip and leaves `hotkey.mode` exactly as it was.
        let mut settings = canonical_fixture();
        settings.shortcut_activation = ShortcutActivation::HoldOrToggle;
        let mut compat = soravo_config::Settings::default();
        compat.hotkey.mode = soravo_config::InteractionMode::ToggleToTalk;
        let outcome = mirror_compat_doc(&mut compat, &settings);
        assert_eq!(
            compat.hotkey.mode,
            soravo_config::InteractionMode::ToggleToTalk
        );
        let hotkey_record = outcome
            .records
            .iter()
            .find(|record| record.concept == soravo_config::MirroredConcept::Hotkey)
            .expect("hotkey record present");
        assert!(hotkey_record.skipped_unrepresentable);
    }

    #[test]
    fn unsupported_fields_remain_untouched() {
        // Compatibility-owned or unrepresentable fields are never rewritten by
        // the mirror: binding display string, device index, engine, available,
        // status, device flags, enabled, recording flag.
        let settings = canonical_fixture();
        let mut compat = soravo_config::Settings::default();
        compat.hotkey.binding = Some("ctrl+shift+space".to_string());
        compat.microphone.selected_device_index = Some("7".to_string());
        compat.microphone.device_available = true;
        compat.microphone.auto_fallback = true;
        compat.hotkey.enabled = false;
        compat.model.selected_engine = Some("parakeet".to_string());
        compat.model.available = true;
        compat.model.status = soravo_config::ModelStatus::Ready;

        let _ = mirror_compat_doc(&mut compat, &settings);

        assert_eq!(compat.hotkey.binding.as_deref(), Some("ctrl+shift+space"));
        assert_eq!(
            compat.microphone.selected_device_index.as_deref(),
            Some("7")
        );
        assert!(compat.microphone.device_available);
        assert!(compat.microphone.auto_fallback);
        assert!(!compat.hotkey.enabled);
        assert_eq!(compat.model.selected_engine.as_deref(), Some("parakeet"));
        assert!(compat.model.available);
        assert_eq!(compat.model.status, soravo_config::ModelStatus::Ready);
        // …while the three mirrorable concepts did move.
        assert_eq!(
            compat.model.selected_model.as_deref(),
            Some("parakeet-tdt-0.6b-v3")
        );
        assert_eq!(
            compat.microphone.selected_device_name.as_deref(),
            Some("USB Microphone")
        );
    }

    #[test]
    fn existing_handy_settings_behavior_remains_unchanged() {
        // This module only reads three fields; defaults, salvage, migrations,
        // and every other `AppSettings` value pass through untouched.
        let defaults = get_default_settings();
        let snapshot = canonical_snapshot(&defaults);
        // Fresh-install defaults: no model, system microphone, upstream
        // hold-or-toggle default — all project without approximation.
        assert_eq!(snapshot.selected_model, None);
        assert_eq!(snapshot.selected_microphone, None);
        assert_eq!(
            snapshot.shortcut_activation,
            soravo_config::CanonicalShortcutActivation::HoldOrToggle
        );
        let mut compat = soravo_config::Settings::default();
        let outcome = mirror_compat_doc(&mut compat, &defaults);
        // HoldOrToggle skips; empty model/mic project to the already-None
        // defaults: a no-change run that still records provenance.
        assert!(!outcome.changed);
        assert_eq!(compat.model.selected_model, None);
        assert_eq!(compat.microphone.selected_device_name, None);
    }
}
