#![forbid(unsafe_code)]
//! Validated desktop configuration types. Persistence is added in SETTINGS-001.

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum InteractionMode {
    #[default]
    HoldToTalk,
    ToggleToTalk,
}

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
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConfigError {
    InvalidShortcut,
}

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
}
