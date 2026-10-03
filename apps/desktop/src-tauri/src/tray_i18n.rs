//! Tray menu strings.
//!
//! Tray labels are English-only. Localization was temporarily disabled
//! to unblock the build pending product copy decisions.

/// Tray menu string labels. All values are English.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TrayStrings {
    pub settings: String,
    pub check_updates: String,
    pub copy_last_transcript: String,
    pub quit: String,
    pub cancel: String,
    pub model: String,
    pub unload_model: String,
    pub secure_input_warning: String,
}

impl Default for TrayStrings {
    fn default() -> Self {
        Self {
            settings: "Settings".to_string(),
            check_updates: "Check for Updates".to_string(),
            copy_last_transcript: "Copy Last Transcript".to_string(),
            quit: "Quit".to_string(),
            cancel: "Cancel".to_string(),
            model: "Model".to_string(),
            unload_model: "Unload Model".to_string(),
            secure_input_warning: "Secure Input blocked: keyboard shortcuts unavailable while recording. Disable Secure Input in System Settings to restore shortcuts.".to_string(),
        }
    }
}

/// Get tray menu strings. Always returns English.
pub fn get_tray_translations(_locale: Option<String>) -> TrayStrings {
    TrayStrings::default()
}

#[cfg(test)]
mod tests {
    use super::get_tray_translations;

    #[test]
    fn returns_english_strings() {
        let strings = get_tray_translations(Some("en".to_string()));
        assert_eq!(strings.settings, "Settings");
        assert_eq!(strings.check_updates, "Check for Updates");
        assert_eq!(strings.copy_last_transcript, "Copy Last Transcript");
        assert_eq!(strings.quit, "Quit");
        assert_eq!(strings.cancel, "Cancel");
        assert_eq!(strings.model, "Model");
        assert_eq!(strings.unload_model, "Unload Model");
        assert!(!strings.secure_input_warning.is_empty());
    }

    #[test]
    fn ignores_locale_input() {
        let strings_en = get_tray_translations(Some("en".to_string()));
        let strings_zh = get_tray_translations(Some("zh".to_string()));
        let strings_fr = get_tray_translations(Some("fr".to_string()));
        assert_eq!(strings_en, strings_zh);
        assert_eq!(strings_en, strings_fr);
    }
}
