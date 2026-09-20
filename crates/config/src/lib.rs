#![forbid(unsafe_code)]
//! Validated desktop configuration types with persistence.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Schema version for settings migration.
const SCHEMA_VERSION: u32 = 1;

/// Interaction mode for hotkey.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InteractionMode {
    #[default]
    HoldToTalk,
    ToggleToTalk,
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
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct SchemaInfo {
    pub version: u32,
    pub last_migrated: Option<u64>,
}

/// Microphone settings.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct MicrophoneSettings {
    pub selected_device_index: Option<String>,
    pub selected_device_name: Option<String>,
    pub device_available: bool,
    pub auto_fallback: bool,
}

/// Hotkey settings.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct HotkeySettings {
    pub binding: Option<String>,
    pub mode: InteractionMode,
    pub enabled: bool,
    pub recording_in_progress: bool,
}

/// Model settings.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ModelSettings {
    pub selected_engine: Option<String>,
    pub selected_model: Option<String>,
    pub available: bool,
    pub status: ModelStatus,
}

/// Model status.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
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
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub schema: SchemaInfo,
    pub microphone: MicrophoneSettings,
    pub hotkey: HotkeySettings,
    pub model: ModelSettings,
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
            let contents = fs::read_to_string(&path)
                .map_err(|_| ConfigError::IoError)?;
            let mut settings: Settings = serde_json::from_str(&contents)
                .map_err(|_| ConfigError::ParseError)?;
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
        let contents = serde_json::to_string_pretty(self).map_err(|_| ConfigError::SerializeError)?;
        fs::write(&path, contents).map_err(|_| ConfigError::IoError)?;
        Ok(())
    }

    /// Apply schema migrations.
    fn migrate(settings: &mut Settings) -> Result<(), ConfigError> {
        if settings.schema.version < 1 {
            // Add any v0->v1 migration here
            settings.schema.version = 1;
            settings.schema.last_migrated = Some(0);
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
        assert_eq!(settings.schema.version, 1);
        assert_eq!(settings.hotkey.mode, InteractionMode::HoldToTalk);
        assert!(settings.hotkey.enabled);
    }
}
