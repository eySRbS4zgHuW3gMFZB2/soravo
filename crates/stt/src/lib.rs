#![forbid(unsafe_code)]
//! Speech recognition engine abstraction.
//!
//! Implements SpeechEngine trait with Parakeet and Whisper adapters.
//! Benchmark-driven selection (protocol §12).

pub mod benchmark;
pub mod engines;
pub mod stream_events;
pub mod stream_router;
pub mod stream_worker;

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SpeechError {
    #[error("Engine not initialized")]
    NotInitialized,
    #[error("Model loading failed: {0}")]
    ModelLoad(String),
    #[error("Inference failed: {0}")]
    Inference(String),
    #[error("Engine not available: {0}")]
    NotAvailable(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub session_id: String,
    pub sequence: u64,
    pub text: String,
    pub is_final: bool,
    pub timestamp_ms: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TranscriptionConfig {
    pub language: String,
    pub streaming: bool,
    pub hotwords: Vec<String>,
}

/// Core speech engine trait.
///
/// Implementations must provide model initialization, audio processing,
/// finalization, and reset. For streaming-capable engines, the
/// `process_audio` method should return partial results with `is_final=false`
/// and the final result with `is_final=true`.
///
/// Note: The trait only requires `Send` (not `Sync`) because engines may
/// contain non-thread-safe native handles. Thread safety is achieved by
/// wrapping engines in `Arc<Mutex<...>>` at the manager level.
pub trait SpeechEngine: Send {
    /// Initialize the engine with a model path and configuration.
    fn initialize(
        &mut self,
        model_path: &str,
        config: &TranscriptionConfig,
    ) -> Result<(), SpeechError>;

    /// Process an audio chunk and return transcription results.
    ///
    /// For streaming engines, this may return partial results with
    /// `is_final=false`. The final result should have `is_final=true`.
    fn process_audio(&mut self, audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError>;

    /// Finalize transcription and return any remaining results.
    ///
    /// For streaming engines, this flushes the stream and returns the
    /// complete final text. For batch engines, this may return empty.
    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError>;

    /// Reset the engine to uninitialized state.
    fn reset(&mut self);

    /// Check if the engine supports streaming transcription.
    ///
    /// Default implementation returns false. Streaming-capable engines
    /// should override this to return true.
    fn supports_streaming(&self) -> bool {
        false
    }

    /// Get the model's supported languages (if known).
    ///
    /// Default implementation returns empty. Engines that load model
    /// metadata should override this.
    fn supported_languages(&self) -> Vec<String> {
        Vec::new()
    }
}

pub use engines::{ParakeetEngine, WhisperEngine};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parakeet_engine_initialization() {
        let mut engine = ParakeetEngine::default();
        let config = TranscriptionConfig {
            language: "en".to_string(),
            streaming: true,
            hotwords: vec![],
        };

        // Test with non-existent path
        assert!(engine
            .initialize("/nonexistent/model.bin", &config)
            .is_err());
    }

    #[test]
    fn test_whisper_engine_initialization() {
        let mut engine = WhisperEngine::default();
        let config = TranscriptionConfig {
            language: "en".to_string(),
            streaming: true,
            hotwords: vec![],
        };

        // Test with non-existent path
        assert!(engine
            .initialize("/nonexistent/model.bin", &config)
            .is_err());
    }

    #[test]
    fn test_speech_engine_trait_object() {
        // Verify trait object safety
        let _engine: Box<dyn SpeechEngine> = Box::new(ParakeetEngine::default());
        let _engine: Box<dyn SpeechEngine> = Box::new(WhisperEngine::default());
    }
}
