#![forbid(unsafe_code)]
//! Speech recognition engine abstraction.
//!
//! Implements SpeechEngine trait with Parakeet and Whisper adapters.
//! Benchmark-driven selection (protocol §12).

pub mod benchmark;

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

pub trait SpeechEngine: Send + Sync {
    fn initialize(
        &mut self,
        model_path: &str,
        _config: &TranscriptionConfig,
    ) -> Result<(), SpeechError>;
    fn process_audio(&mut self, _audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError>;
    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError>;
    fn reset(&mut self);
}

#[derive(Default)]
pub struct ParakeetEngine {
    initialized: bool,
    session_id: Option<String>,
}

impl SpeechEngine for ParakeetEngine {
    fn initialize(
        &mut self,
        model_path: &str,
        _config: &TranscriptionConfig,
    ) -> Result<(), SpeechError> {
        if std::path::Path::new(model_path).exists() {
            self.initialized = true;
            self.session_id = Some(format!(
                "session_{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis()
            ));
            Ok(())
        } else {
            Err(SpeechError::ModelLoad(format!(
                "Model not found at {}",
                model_path
            )))
        }
    }

    fn process_audio(&mut self, _audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized {
            return Err(SpeechError::NotInitialized);
        }

        // Placeholder: real implementation would run inference
        Ok(vec![])
    }

    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized {
            return Err(SpeechError::NotInitialized);
        }
        Ok(vec![])
    }

    fn reset(&mut self) {
        self.initialized = false;
        self.session_id = None;
    }
}

#[derive(Default)]
pub struct WhisperEngine {
    initialized: bool,
    session_id: Option<String>,
}

impl SpeechEngine for WhisperEngine {
    fn initialize(
        &mut self,
        model_path: &str,
        _config: &TranscriptionConfig,
    ) -> Result<(), SpeechError> {
        if std::path::Path::new(model_path).exists() {
            self.initialized = true;
            self.session_id = Some(format!(
                "session_{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis()
            ));
            Ok(())
        } else {
            Err(SpeechError::ModelLoad(format!(
                "Model not found at {}",
                model_path
            )))
        }
    }

    fn process_audio(&mut self, _audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized {
            return Err(SpeechError::NotInitialized);
        }
        Ok(vec![])
    }

    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized {
            return Err(SpeechError::NotInitialized);
        }
        Ok(vec![])
    }

    fn reset(&mut self) {
        self.initialized = false;
        self.session_id = None;
    }
}

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
}
