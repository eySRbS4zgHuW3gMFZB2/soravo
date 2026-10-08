#![forbid(unsafe_code)]
//! Validated desktop configuration types with persistence.
//!
//! # Store authority (R1-GAP-023 / ADR-032)
//!
//! This crate is the **compatibility** settings store: UI-local persistence
//! exposed over the `soravo_ipc` typed commands. It is **never** authoritative.
//! The single canonical source of truth for runtime behaviour is the
//! Handy-derived `AppSettings` document in
//! `apps/desktop/src-tauri/src/settings.rs`. See [`mirror`] for the normative
//! one-way (canonical → compatibility) mirror rule, conflict resolution,
//! startup and failure behaviour.

pub mod mirror;

pub use mirror::{
    divergence, mirror_from_canonical, mirror_on_canonical_write, CanonicalSettings,
    CanonicalShortcutActivation, MirrorCanonical, MirrorOutcome, MirrorRecord, MirrorState,
    MirroredConcept,
};

use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::path::PathBuf;

/// Schema version for settings migration.
///
/// v2 (R1-GAP-023 / ADR-032) adds the `mirror` provenance block. The bump is
/// additive: a v1 file gains `mirror: { applied: 0, last: null }` and keeps
/// every existing value, so a stored value can never be mistaken for a value
/// written by the canonical mirror.
const SCHEMA_VERSION: u32 = 2;

/// Interaction mode for hotkey.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum InteractionMode {
    #[default]
    HoldToTalk,
    ToggleToTalk,
}

impl InteractionMode {
    /// The persisted/wire form, matching this type's `snake_case` rename.
    pub fn as_str(self) -> &'static str {
        match self {
            InteractionMode::HoldToTalk => "hold_to_talk",
            InteractionMode::ToggleToTalk => "toggle_to_talk",
        }
    }
}

/// Parsed the persisted/wire form.
///
/// Errors on any other string so a caller can tell "not a mode" apart from "the
/// default mode". This is why it is not a `Default`-on-failure parse: an
/// unrepresentable canonical shortcut activation (`HoldOrToggle`) must never be
/// silently read back as a specific mode (see [`mirror`]).
impl std::str::FromStr for InteractionMode {
    type Err = ();

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "hold_to_talk" => Ok(InteractionMode::HoldToTalk),
            "toggle_to_talk" => Ok(InteractionMode::ToggleToTalk),
            _ => Err(()),
        }
    }
}

/// Hotkey shortcut representation.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Shortcut(String);

impl Shortcut {
    pub fn parse(value: &str) -> Result<Self, ConfigError> {
        let trimmed = value.trim();
        if trimmed.is_empty() || trimmed.len() > 80 {
            return Err(ConfigError::InvalidShortcut);
        }
        if !trimmed.contains('+') {
            return Err(ConfigError::InvalidShortcut);
        }
        Ok(Self(trimmed.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Settings schema version and migration metadata.
#[derive(Clone, Debug, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SchemaInfo {
    pub version: u32,
    #[serde(default, alias = "last_migrated")]
    pub last_migrated: Option<u64>,
}

/// Microphone settings.
#[derive(Clone, Debug, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MicrophoneSettings {
    #[serde(default, alias = "selected_device_index")]
    pub selected_device_index: Option<String>,
    #[serde(default, alias = "selected_device_name")]
    pub selected_device_name: Option<String>,
    #[serde(default, alias = "device_available")]
    pub device_available: bool,
    #[serde(default, alias = "auto_fallback")]
    pub auto_fallback: bool,
}

/// Hotkey settings.
#[derive(Clone, Debug, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HotkeySettings {
    pub binding: Option<String>,
    pub mode: InteractionMode,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default, alias = "recording_in_progress")]
    pub recording_in_progress: bool,
}

/// Model settings.
#[derive(Clone, Debug, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettings {
    #[serde(default, alias = "selected_engine")]
    pub selected_engine: Option<String>,
    #[serde(default, alias = "selected_model")]
    pub selected_model: Option<String>,
    #[serde(default)]
    pub available: bool,
    #[serde(default)]
    pub status: ModelStatus,
}

/// Model status.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum ModelStatus {
    #[default]
    NotInstalled,
    Downloading,
    Verifying,
    Ready,
    Error,
}

/// Complete settings document.
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct Settings {
    pub schema: SchemaInfo,
    #[serde(default)]
    pub microphone: MicrophoneSettings,
    #[serde(default)]
    pub hotkey: HotkeySettings,
    #[serde(default)]
    pub model: ModelSettings,
    /// Provenance of the canonical → compatibility mirror (R1-GAP-023 /
    /// ADR-032). Defaults to "never mirrored" for every pre-v2 file, so a
    /// stored value is never mistaken for a mirrored one.
    #[serde(default)]
    pub mirror: MirrorState,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            schema: SchemaInfo {
                version: SCHEMA_VERSION,
                last_migrated: None,
            },
            microphone: MicrophoneSettings::default(),
            hotkey: HotkeySettings {
                mode: InteractionMode::HoldToTalk,
                enabled: true,
                ..Default::default()
            },
            model: ModelSettings::default(),
            mirror: MirrorState::default(),
        }
    }
}

impl Settings {
    /// Resolve the path to settings file.
    pub fn config_path() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("soravo")
            .join("settings.json")
    }

    /// Load settings from file. Returns default if file doesn't exist.
    pub fn load() -> Result<Self, ConfigError> {
        let path = Self::config_path();
        if path.exists() {
            let contents = fs::read_to_string(&path).map_err(|_| ConfigError::IoError)?;
            let mut settings: Settings =
                serde_json::from_str(&contents).map_err(|_| ConfigError::ParseError)?;
            Self::migrate(&mut settings)?;
            Ok(settings)
        } else {
            Ok(Settings::default())
        }
    }

    /// Save settings to file.
    pub fn save(&self) -> Result<(), ConfigError> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|_| ConfigError::IoError)?;
        }
        let contents =
            serde_json::to_string_pretty(self).map_err(|_| ConfigError::SerializeError)?;
        fs::write(&path, contents).map_err(|_| ConfigError::IoError)?;
        Ok(())
    }

    /// Apply schema migrations.
    ///
    /// Migrations are value-preserving by design: no step ever copies a value
    /// between the canonical and compatibility stores, and no step reconciles
    /// a compatibility value against the canonical one. Loading is a read —
    /// ADR-032 forbids silent migration.
    fn migrate(settings: &mut Settings) -> Result<(), ConfigError> {
        if settings.schema.version < 1 {
            // Add any v0->v1 migration here
            settings.schema.version = 1;
            settings.schema.last_migrated = Some(0);
        }
        if settings.schema.version < 2 {
            // R1-GAP-023 / ADR-032: stamp the schema version. `mirror` is
            // `#[serde(default)]`, so a v1 document already carries
            // `applied: 0, last: null` — "never mirrored" — before this runs.
            // Nothing else changes: existing values are preserved verbatim so
            // no user setting is rewritten by an upgrade.
            settings.schema.version = 2;
            settings.schema.last_migrated = Some(2);
        }
        Ok(())
    }
}

/// Configuration errors.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConfigError {
    InvalidShortcut,
    IoError,
    ParseError,
    SerializeError,
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConfigError::InvalidShortcut => write!(f, "invalid shortcut"),
            ConfigError::IoError => write!(f, "io error"),
            ConfigError::ParseError => write!(f, "parse error"),
            ConfigError::SerializeError => write!(f, "serialize error"),
        }
    }
}

impl std::error::Error for ConfigError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_shortcut() {
        assert_eq!(Shortcut::parse(""), Err(ConfigError::InvalidShortcut));
    }

    #[test]
    fn accepts_modifier_shortcut() {
        assert!(Shortcut::parse("Ctrl+Shift+Space").is_ok());
    }

    #[test]
    fn test_default_settings() {
        let settings = Settings::default();
        assert_eq!(settings.schema.version, 2);
        assert_eq!(settings.hotkey.mode, InteractionMode::HoldToTalk);
        assert!(settings.hotkey.enabled);
        assert_eq!(settings.mirror, MirrorState::default());
    }

    #[test]
    fn interaction_mode_parses_only_its_own_wire_forms() {
        assert_eq!(
            "hold_to_talk".parse::<InteractionMode>(),
            Ok(InteractionMode::HoldToTalk)
        );
        assert_eq!(
            "toggle_to_talk".parse::<InteractionMode>(),
            Ok(InteractionMode::ToggleToTalk)
        );
        // "HoldOrToggle" is a canonical value with no compatibility form; it
        // must not be mistaken for a mode.
        assert!("HoldOrToggle".parse::<InteractionMode>().is_err());
        assert!("".parse::<InteractionMode>().is_err());
    }

    #[test]
    fn v1_document_migrates_to_v2_without_touching_any_value() {
        let v1 = serde_json::json!({
            "schema": { "version": 1, "lastMigrated": null },
            "microphone": {
                "selectedDeviceIndex": "1",
                "selectedDeviceName": "Built-in",
                "deviceAvailable": true,
                "autoFallback": false
            },
            "hotkey": {
                "binding": "ctrl+space",
                "mode": "toggle_to_talk",
                "enabled": false,
                "recordingInProgress": true
            },
            "model": {
                "selectedEngine": "whisper",
                "selectedModel": "large-v3",
                "available": true,
                "status": "ready"
            }
        });
        let mut settings: Settings = serde_json::from_value(v1).expect("v1 parses");
        Settings::migrate(&mut settings).expect("migrates");

        assert_eq!(settings.schema.version, 2);
        assert_eq!(
            settings.microphone.selected_device_name.as_deref(),
            Some("Built-in")
        );
        assert_eq!(
            settings.microphone.selected_device_index.as_deref(),
            Some("1")
        );
        assert!(settings.microphone.device_available);
        assert!(!settings.microphone.auto_fallback);
        assert_eq!(settings.hotkey.mode, InteractionMode::ToggleToTalk);
        assert!(!settings.hotkey.enabled);
        assert!(settings.hotkey.recording_in_progress);
        assert_eq!(settings.model.selected_model.as_deref(), Some("large-v3"));
        assert_eq!(settings.model.status, ModelStatus::Ready);
        // The whole point of the bump: pre-v2 files are provably never mirrored.
        assert_eq!(settings.mirror, MirrorState::default());
        assert_eq!(settings.mirror.applied, 0);
    }

    #[test]
    fn migration_is_idempotent_and_never_resurrects_stale_mirror_state() {
        let v0 = serde_json::json!({ "schema": { "version": 0, "lastMigrated": null } });
        let mut settings: Settings = serde_json::from_value(v0).expect("v0 parses");
        Settings::migrate(&mut settings).expect("first migrate");
        let once = settings.clone();
        Settings::migrate(&mut settings).expect("second migrate");
        assert_eq!(settings.schema.version, 2);
        assert_eq!(settings.schema.version, once.schema.version);
        assert_eq!(settings.schema.last_migrated, once.schema.last_migrated);
        assert_eq!(settings.mirror, MirrorState::default());
    }

    #[test]
    fn missing_mirror_block_defaults_to_never_mirrored() {
        let doc = serde_json::json!({
            "schema": { "version": 2, "lastMigrated": 2 },
            "model": { "selectedModel": "m" }
        });
        let settings: Settings = serde_json::from_value(doc).expect("parses");
        assert_eq!(settings.mirror.applied, 0);
        assert!(settings.mirror.last.is_none());
        assert_eq!(settings.model.selected_model.as_deref(), Some("m"));
    }
}
