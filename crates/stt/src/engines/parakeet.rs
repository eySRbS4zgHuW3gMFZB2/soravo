#![forbid(unsafe_code)]
//! Parakeet STT engine using transcribe-rs ONNX runtime.
//!
//! Adapted from Handy's ParakeetModel integration.

use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

use anyhow::Result;
use transcribe_rs::onnx::parakeet::{ParakeetModel, ParakeetParams, TimestampGranularity};
use transcribe_rs::onnx::Quantization;
use transcribe_rs::{SpeechModel, TranscribeOptions};

use super::super::{SpeechEngine, SpeechError, TranscriptionConfig, TranscriptionResult};

/// Parakeet streaming engine.
///
/// Uses transcribe-rs ONNX runtime for local inference.
/// Supports both batch and streaming transcription.
pub struct ParakeetEngine {
    model: Option<ParakeetModel>,
    session_id: Option<String>,
    initialized: AtomicBool,
    config: Option<TranscriptionConfig>,
    #[allow(dead_code)]
    params: ParakeetParams,
    quantization: Quantization,
}

impl Default for ParakeetEngine {
    fn default() -> Self {
        Self {
            model: None,
            session_id: None,
            initialized: AtomicBool::new(false),
            config: None,
            params: ParakeetParams {
                timestamp_granularity: Some(TimestampGranularity::Segment),
                ..Default::default()
            },
            quantization: Quantization::Int8,
        }
    }
}

impl ParakeetEngine {
    /// Create a new Parakeet engine with custom parameters.
    pub fn with_params(params: ParakeetParams, quantization: Quantization) -> Self {
        Self {
            params,
            quantization,
            ..Default::default()
        }
    }

    /// Get the current session ID.
    pub fn session_id(&self) -> Option<&str> {
        self.session_id.as_deref()
    }

    /// Check if the engine is initialized.
    pub fn is_initialized(&self) -> bool {
        self.initialized.load(Ordering::Acquire)
    }
}

impl SpeechEngine for ParakeetEngine {
    fn initialize(
        &mut self,
        model_path: &str,
        config: &TranscriptionConfig,
    ) -> Result<(), SpeechError> {
        let path = Path::new(model_path);
        if !path.exists() {
            return Err(SpeechError::ModelLoad(format!(
                "Model not found at {}",
                model_path
            )));
        }

        // Load the Parakeet model
        let model = ParakeetModel::load(path, &self.quantization)
            .map_err(|e| SpeechError::ModelLoad(format!("Failed to load Parakeet model: {}", e)))?;

        self.model = Some(model);
        self.session_id = Some(format!(
            "session_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        self.config = Some(config.clone());
        self.initialized.store(true, Ordering::Release);

        log::info!(
            "Parakeet engine initialized: model={}, session={:?}",
            model_path,
            self.session_id
        );
        Ok(())
    }

    fn process_audio(&mut self, audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized.load(Ordering::Acquire) {
            return Err(SpeechError::NotInitialized);
        }

        let model = self.model.as_mut().ok_or(SpeechError::NotInitialized)?;

        let session_id = self.session_id.clone().unwrap_or_default();
        let sequence = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        // For streaming, we use the model's transcribe method with the audio chunk
        // Note: ParakeetModel doesn't have a native streaming API like Whisper,
        // so we process chunks and return partial results.
        let options = TranscribeOptions {
            language: Some(
                self.config
                    .as_ref()
                    .map(|c| c.language.clone())
                    .unwrap_or_else(|| "en".to_string()),
            ),
            ..Default::default()
        };

        let result = model
            .transcribe(audio, &options)
            .map_err(|e| SpeechError::Inference(format!("Parakeet inference failed: {}", e)))?;

        // Convert transcribe-rs result to our TranscriptionResult
        let text = result.text.trim().to_string();

        if text.is_empty() {
            return Ok(vec![]);
        }

        // For now, treat all results as final (no native streaming in transcribe-rs Parakeet)
        // A future enhancement could implement chunked processing for partials
        Ok(vec![TranscriptionResult {
            session_id,
            sequence,
            text,
            is_final: true,
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        }])
    }

    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized.load(Ordering::Acquire) {
            return Err(SpeechError::NotInitialized);
        }

        // Parakeet doesn't have a separate finalize step - process_audio is complete
        Ok(vec![])
    }

    fn reset(&mut self) {
        self.model = None;
        self.session_id = None;
        self.config = None;
        self.initialized.store(false, Ordering::Release);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parakeet_engine_default() {
        let engine = ParakeetEngine::default();
        assert!(!engine.is_initialized());
        assert!(engine.session_id().is_none());
    }

    #[test]
    fn parakeet_engine_with_params() {
        let params = ParakeetParams::default();
        let engine = ParakeetEngine::with_params(params, Quantization::Int8);
        assert!(!engine.is_initialized());
    }

    #[test]
    fn parakeet_initialize_nonexistent_model() {
        let mut engine = ParakeetEngine::default();
        let config = TranscriptionConfig {
            language: "en".to_string(),
            streaming: true,
            hotwords: vec![],
        };
        let result = engine.initialize("/nonexistent/model.onnx", &config);
        assert!(result.is_err());
        match result.unwrap_err() {
            SpeechError::ModelLoad(_) => {}
            _ => panic!("Expected ModelLoad error"),
        }
    }
}
