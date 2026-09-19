#![forbid(unsafe_code)]
//! Streaming transcription events — partial/final segmentation for live UI.
//!
//! Adapted from Handy's StreamTextEvent and StreamPhaseEvent.

use serde::{Deserialize, Serialize};

/// Live transcription snapshot emitted during a streaming run.
/// `committed` is the append-only, flicker-free prefix; `tentative` is the
/// volatile suffix the model may still rewrite.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct StreamTextEvent {
    pub committed: String,
    pub tentative: String,
}

impl StreamTextEvent {
    pub fn new(committed: String, tentative: String) -> Self {
        Self {
            committed,
            tentative,
        }
    }

    pub fn full_text(&self) -> String {
        format!("{}{}", self.committed, self.tentative)
    }

    pub fn is_empty(&self) -> bool {
        self.committed.is_empty() && self.tentative.is_empty()
    }
}

/// Phase of the streaming transcription, emitted to drive UI state.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StreamPhase {
    /// Receiving audio / live text (waiting for first speech).
    Listening,
    /// Finalizing or post-processing — show a spinner.
    Working,
}

/// Semantic kind of "working" phase, used to localize the spinner label.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StreamWorkKind {
    Transcribing,
    Polishing,
}

/// Emitted to switch the streaming overlay to a working spinner.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StreamPhaseEvent {
    pub phase: StreamPhase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<StreamWorkKind>,
}

impl StreamPhaseEvent {
    pub fn listening() -> Self {
        Self {
            phase: StreamPhase::Listening,
            kind: None,
        }
    }

    pub fn working(kind: StreamWorkKind) -> Self {
        Self {
            phase: StreamPhase::Working,
            kind: Some(kind),
        }
    }
}

/// Output language evidence for post-processing decisions.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum OutputLanguageEvidence {
    /// Language not yet determined.
    Unknown,
    /// Language explicitly set by user.
    Forced(String),
    /// Language detected by model (whisper LID).
    Detected(String),
}

/// Finalized stream text with post-processing metadata.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FinalizedStreamText {
    pub text: String,
    pub output_language: OutputLanguageEvidence,
    /// The streaming model's supported languages, for text-based detection.
    pub supported_languages: Vec<String>,
}

impl FinalizedStreamText {
    pub fn new(
        text: String,
        output_language: OutputLanguageEvidence,
        supported_languages: Vec<String>,
    ) -> Self {
        Self {
            text,
            output_language,
            supported_languages,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stream_text_event_full_text() {
        let event = StreamTextEvent::new("Hello".to_string(), " world".to_string());
        assert_eq!(event.full_text(), "Hello world");
    }

    #[test]
    fn stream_text_event_empty() {
        let event = StreamTextEvent::new("".to_string(), "".to_string());
        assert!(event.is_empty());
    }

    #[test]
    fn stream_phase_event_listening() {
        let event = StreamPhaseEvent::listening();
        assert_eq!(event.phase, StreamPhase::Listening);
        assert!(event.kind.is_none());
    }

    #[test]
    fn stream_phase_event_working() {
        let event = StreamPhaseEvent::working(StreamWorkKind::Transcribing);
        assert_eq!(event.phase, StreamPhase::Working);
        assert_eq!(event.kind, Some(StreamWorkKind::Transcribing));
    }
}
