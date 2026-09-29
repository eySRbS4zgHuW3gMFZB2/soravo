//! Post-processing utilities for transcription output.

use std::collections::HashSet;

/// Evidence about the language of transcribed text.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum OutputLanguageEvidence {
    /// The output language is unknown.
    Unknown,
    /// The user explicitly selected this language.
    UserSelected(String),
    /// The model was constrained to this language (single-language model).
    ModelConstrained(String),
    /// The model detected this language during transcription.
    ModelDetected(String),
    /// The text was detected to be in this language via post-processing.
    TextDetected(String),
    /// The output was translated to English.
    TranslatedToEnglish,
}

/// Apply custom word corrections to transcribed text using fuzzy matching.
pub fn apply_custom_words(text: &str, custom_words: &[String], threshold: f64) -> String {
    if custom_words.is_empty() || text.is_empty() {
        return text.to_string();
    }

    let words: Vec<&str> = text.split_whitespace().collect();
    let mut result = Vec::with_capacity(words.len());

    for word in words {
        let mut best_match = word;
        let mut best_score = 0.0;

        for custom_word in custom_words {
            let score = similarity(word, custom_word);
            if score > best_score && score >= threshold {
                best_score = score;
                best_match = custom_word;
            }
        }

        result.push(best_match);
    }

    result.join(" ")
}

/// Detect the language of transcribed text based on character patterns and vocabulary.
pub fn detect_output_language(text: &str, supported_languages: &[String]) -> Option<String> {
    if text.is_empty() || supported_languages.is_empty() {
        return None;
    }

    // Simple heuristic: check for language-specific character ranges
    let chinese_chars = text.chars().filter(|c| is_chinese_char(*c)).count();
    let japanese_chars = text.chars().filter(|c| is_japanese_char(*c)).count();
    let korean_chars = text.chars().filter(|c| is_korean_char(*c)).count();
    let latin_chars = text.chars().filter(|c| c.is_ascii_alphabetic()).count();
    let total_chars = text.chars().filter(|c| c.is_alphabetic()).count();

    if total_chars == 0 {
        return None;
    }

    let mut scores = Vec::new();

    if chinese_chars > 0 {
        let score = chinese_chars as f64 / total_chars as f64;
        if score > 0.3 {
            scores.push(("zh".to_string(), score));
        }
    }

    if japanese_chars > 0 {
        let score = japanese_chars as f64 / total_chars as f64;
        if score > 0.3 {
            scores.push(("ja".to_string(), score));
        }
    }

    if korean_chars > 0 {
        let score = korean_chars as f64 / total_chars as f64;
        if score > 0.3 {
            scores.push(("ko".to_string(), score));
        }
    }

    if latin_chars > 0 {
        let score = latin_chars as f64 / total_chars as f64;
        if score > 0.5 {
            // Default to English for Latin script, but check supported languages
            scores.push(("en".to_string(), score));
        }
    }

    // Sort by score descending
    scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Return the highest scoring language that's in supported_languages
    let supported_set: HashSet<_> = supported_languages.iter().cloned().collect();
    scores
        .into_iter()
        .find(|(lang, _)| supported_set.contains(lang))
        .map(|(lang, _)| lang)
}

/// Remove filler words from transcribed text.
pub fn remove_filler_words(
    text: &str,
    _output_language: &OutputLanguageEvidence,
    custom_filler_words: &Option<Vec<String>>,
    enabled: bool,
) -> String {
    if !enabled || text.is_empty() {
        return text.to_string();
    }

    // Default filler words for English
    let default_fillers: HashSet<&str> = [
        "um",
        "uh",
        "er",
        "ah",
        "like",
        "you know",
        "i mean",
        "sort of",
        "kind of",
        "actually",
        "basically",
        "literally",
        "so",
        "well",
        "right",
        "okay",
    ]
    .iter()
    .cloned()
    .collect();

    let filler_words: HashSet<String> = custom_filler_words
        .as_ref()
        .map(|v| v.iter().cloned().collect())
        .unwrap_or_else(|| default_fillers.iter().map(|s| s.to_string()).collect());

    let words: Vec<&str> = text.split_whitespace().collect();
    let mut result = Vec::new();

    for word in words {
        let lower = word.to_lowercase();
        if !filler_words.contains(&lower) {
            result.push(word);
        }
    }

    result.join(" ")
}

/// Normalize transcription output (capitalization, punctuation, etc.).
pub fn normalize_transcription_output(text: &str) -> String {
    if text.is_empty() {
        return text.to_string();
    }

    let mut result = text.trim().to_string();

    // Capitalize first letter
    if let Some(first_char) = result.chars().next() {
        if first_char.is_lowercase() {
            result =
                first_char.to_uppercase().collect::<String>() + &result[first_char.len_utf8()..];
        }
    }

    // Ensure sentence ends with punctuation
    if let Some(last_char) = result.chars().last() {
        if !last_char.is_ascii_punctuation() {
            result.push('.');
        }
    }

    result
}

/// Calculate similarity between two strings (0.0 to 1.0).
fn similarity(a: &str, b: &str) -> f64 {
    if a == b {
        return 1.0;
    }

    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();

    if a_chars.is_empty() || b_chars.is_empty() {
        return 0.0;
    }

    // Simple Levenshtein-based similarity
    let len_a = a_chars.len();
    let len_b = b_chars.len();
    let max_len = len_a.max(len_b);

    let mut dp = vec![vec![0; len_b + 1]; len_a + 1];

    for (i, row) in dp.iter_mut().enumerate() {
        row[0] = i;
    }
    for (j, cell) in dp[0].iter_mut().enumerate() {
        *cell = j;
    }

    for i in 1..=len_a {
        for j in 1..=len_b {
            if a_chars[i - 1] == b_chars[j - 1] {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + dp[i - 1][j].min(dp[i][j - 1]).min(dp[i - 1][j - 1]);
            }
        }
    }

    let distance = dp[len_a][len_b];
    1.0 - (distance as f64 / max_len as f64)
}

fn is_chinese_char(c: char) -> bool {
    matches!(c, '\u{4E00}'..='\u{9FFF}' | '\u{3400}'..='\u{4DBF}' | '\u{20000}'..='\u{2A6DF}')
}

fn is_japanese_char(c: char) -> bool {
    matches!(c, '\u{3040}'..='\u{309F}' | '\u{30A0}'..='\u{30FF}' | '\u{31F0}'..='\u{31FF}')
}

fn is_korean_char(c: char) -> bool {
    matches!(c, '\u{AC00}'..='\u{D7AF}' | '\u{1100}'..='\u{11FF}' | '\u{3130}'..='\u{318F}')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_custom_words() {
        let custom = vec!["Soravo".to_string(), "Razorpay".to_string()];
        let result = apply_custom_words("I use soravo and razorpay", &custom, 0.7);
        assert_eq!(result, "I use Soravo and Razorpay");
    }

    #[test]
    fn test_remove_filler_words() {
        let result = remove_filler_words(
            "um this is uh a test",
            &OutputLanguageEvidence::Unknown,
            &None,
            true,
        );
        assert_eq!(result, "this is a test");
    }

    #[test]
    fn test_normalize_transcription_output() {
        let result = normalize_transcription_output("hello world");
        assert_eq!(result, "Hello world.");
    }

    #[test]
    fn test_detect_output_language_chinese() {
        let supported = vec!["zh".to_string(), "en".to_string()];
        let result = detect_output_language("你好世界", &supported);
        assert_eq!(result, Some("zh".to_string()));
    }

    #[test]
    fn test_detect_output_language_english() {
        let supported = vec!["en".to_string(), "zh".to_string()];
        let result = detect_output_language("hello world", &supported);
        assert_eq!(result, Some("en".to_string()));
    }
}
