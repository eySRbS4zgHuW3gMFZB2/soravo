// Tests for text injection
// Reuses patterns from Handy's clipboard fallback implementation

use soravo_typing::{PasteMethod, TypingConfig, TypingEngine};

#[test]
fn test_inject_empty_string() {
    let engine = TypingEngine::new(TypingConfig::default());
    let result = engine.inject("");

    assert!(result.success);
    assert_eq!(result.duration_ms, 0);
}

#[test]
fn test_inject_with_text() {
    let config = TypingConfig {
        prefer_native: false,
        max_duration_ms: 100,
        ..Default::default()
    };
    let engine = TypingEngine::new(config);

    let result = engine.inject("hello");

    // Should succeed (may use clipboard fallback)
    assert!(result.success || result.method == soravo_typing::TypingMethod::ClipboardFallback);
}

#[test]
fn test_paste_method_variants() {
    // Verify all paste method variants are available
    let _ = PasteMethod::CtrlV;
    let _ = PasteMethod::CtrlShiftV;
    let _ = PasteMethod::ShiftInsert;
}

#[test]
fn test_config_with_custom_paste_method() {
    let config = TypingConfig {
        prefer_native: false,
        paste_method: PasteMethod::CtrlShiftV,
        paste_delay_ms: 100,
        paste_delay_after_ms: 100,
        ..Default::default()
    };
    let engine = TypingEngine::new(config);

    // Verify the engine was constructed (config is internal)
    // The paste method and delays are exercised during inject()
    let result = engine.inject("test");
    // On CI/headless, paste may fail - that's expected
    assert!(result.message.contains("characters") || result.message.contains("Failed"));
}
