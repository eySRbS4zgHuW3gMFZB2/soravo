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
    #[error("Streaming not supported by this engine")]
    StreamingNotSupported,
    #[error("Stream not active")]
    StreamNotActive,
    #[error("Stale result rejected: revision {revision} <= last {last_revision}")]
    StaleResult { revision: i32, last_revision: i32 },
}

/// Opaque handle for an active streaming session.
///
/// This trait allows engines to manage streaming state internally while
/// providing a uniform interface for the streaming worker.
pub trait StreamHandle: Send {
    /// Get the current revision number for stale result detection.
    fn revision(&self) -> i32;

    /// Check if the stream has been finalized.
    fn is_finalized(&self) -> bool;

    /// Mark the stream as finalized (called by engine after finalize_stream).
    fn mark_finalized(&self);
}

/// Streaming transcript update with revision tracking.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StreamingTranscript {
    /// Committed (stable) text that will not be revised.
    pub committed: String,
    /// Tentative (volatile) text that may be revised.
    pub tentative: String,
    /// Monotonic revision counter for stale result rejection.
    pub revision: i32,
    /// True if this is the final transcript.
    pub is_final: bool,
}

impl StreamingTranscript {
    pub fn new(committed: String, tentative: String, revision: i32, is_final: bool) -> Self {
        Self {
            committed,
            tentative,
            revision,
            is_final,
        }
    }

    pub fn full_text(&self) -> String {
        format!("{}{}", self.committed, self.tentative)
    }

    pub fn is_empty(&self) -> bool {
        self.committed.is_empty() && self.tentative.is_empty()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub session_id: String,
    pub sequence: u64,
    pub text: String,
    pub is_final: bool,
    pub timestamp_ms: u64,
    /// Revision number for stale result rejection (streaming engines).
    pub revision: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct TranscriptionConfig {
    pub language: String,
    pub streaming: bool,
    pub hotwords: Vec<String>,
}

/// Voice Activity Detection integration point.
#[derive(Clone, Debug, Default)]
pub struct VadConfig {
    /// Whether VAD is enabled for this session.
    pub enabled: bool,
    /// Minimum speech duration (ms) to trigger recognition.
    pub min_speech_ms: u32,
    /// Maximum silence duration (ms) before finalizing.
    pub max_silence_ms: u32,
    /// Speech probability threshold (0.0-1.0).
    pub threshold: f32,
}

/// Engine lifecycle state.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EngineState {
    /// Engine created but not initialized.
    Uninitialized,
    /// Model loaded, ready for inference.
    Ready,
    /// Engine warming up (pre-loading compute graph).
    WarmingUp,
    /// Active streaming session in progress.
    Streaming,
    /// Engine shutting down.
    ShuttingDown,
    /// Engine shut down, can be reinitialized.
    Shutdown,
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
    /// For batch engines, this processes the chunk independently.
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

    /// Get the current engine lifecycle state.
    fn state(&self) -> EngineState {
        EngineState::Uninitialized
    }

    /// Warm up the engine (load model, initialize compute graph, run dummy inference).
    ///
    /// This should be called after `initialize` to prepare the engine for
    /// low-latency first inference. Default implementation does nothing.
    fn warmup(&mut self) -> Result<(), SpeechError> {
        Ok(())
    }

    /// Start a streaming session.
    ///
    /// Returns a handle that must be passed to `feed_stream` and `finalize_stream`.
    /// Default implementation returns `StreamingNotSupported` error.
    fn start_stream(&mut self) -> Result<Box<dyn StreamHandle>, SpeechError> {
        Err(SpeechError::StreamingNotSupported)
    }

    /// Feed audio to an active streaming session.
    ///
    /// Returns streaming transcript updates with revision tracking for
    /// stale result rejection. Default implementation returns error.
    fn feed_stream(
        &mut self,
        _handle: &mut dyn StreamHandle,
        _audio: &[f32],
    ) -> Result<Vec<StreamingTranscript>, SpeechError> {
        Err(SpeechError::StreamingNotSupported)
    }

    /// Finalize a streaming session and return the final transcript.
    ///
    /// Consumes the stream handle. Default implementation returns error.
    fn finalize_stream(
        &mut self,
        _handle: Box<dyn StreamHandle>,
    ) -> Result<Vec<TranscriptionResult>, SpeechError> {
        Err(SpeechError::StreamingNotSupported)
    }

    /// Cancel an active streaming session without producing output.
    ///
    /// Default implementation returns error.
    fn cancel_stream(&mut self, _handle: Box<dyn StreamHandle>) -> Result<(), SpeechError> {
        Err(SpeechError::StreamingNotSupported)
    }

    /// Configure VAD integration for the engine.
    ///
    /// Default implementation does nothing. Engines with VAD support
    /// should override this to configure internal VAD parameters.
    fn set_vad_config(&mut self, _config: VadConfig) {}

    /// Perform a clean shutdown, releasing all resources.
    ///
    /// This should be called before dropping the engine to ensure
    /// bounded resource usage. Default implementation calls `reset`.
    fn shutdown(&mut self) {
        self.reset();
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
