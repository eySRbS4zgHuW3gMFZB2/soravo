// Tests for text injection

use soravo_typing::{TypingConfig, TypingEngine};

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
    };
    let engine = TypingEngine::new(config);

    let result = engine.inject("hello");

    // Should succeed (may use clipboard fallback)
    assert!(result.success || result.method == soravo_typing::TypingMethod::ClipboardFallback);
}
