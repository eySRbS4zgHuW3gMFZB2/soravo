#![forbid(unsafe_code)]
//! Parakeet STT engine using transcribe-rs ONNX runtime.
//!
//! Adapted from Handy's ParakeetModel integration.

use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use anyhow::Result;
use transcribe_rs::onnx::parakeet::{ParakeetModel, ParakeetParams, TimestampGranularity};
use transcribe_rs::onnx::Quantization;
use transcribe_rs::{SpeechModel, TranscribeOptions};

use super::super::{
    EngineState, SpeechEngine, SpeechError, TranscriptionConfig, TranscriptionResult,
};

/// Parakeet streaming engine with lifecycle management.
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
    state: Mutex<EngineState>,
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
            state: Mutex::new(EngineState::Unloaded),
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

    /// Get the current engine state.
    pub fn engine_state(&self) -> EngineState {
        *self.state.lock().unwrap()
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
    fn load(&mut self, model_path: &str, config: &TranscriptionConfig) -> Result<(), SpeechError> {
        // State: UNLOADED → LOADING
        *self.state.lock().unwrap() = EngineState::Loading;

        let path = Path::new(model_path);
        if !path.exists() {
            // Revert state on failure
            *self.state.lock().unwrap() = EngineState::Unloaded;
            return Err(SpeechError::ModelLoad(format!(
                "Model not found at {}",
                model_path
            )));
        }

        // Load the Parakeet model
        let model = ParakeetModel::load(path, &self.quantization).map_err(|e| {
            // Revert state on failure
            *self.state.lock().unwrap() = EngineState::Unloaded;
            SpeechError::ModelLoad(format!("Failed to load Parakeet model: {}", e))
        })?;

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
        *self.state.lock().unwrap() = EngineState::Ready;

        log::info!(
            "Parakeet engine loaded: model={}, session={:?}",
            model_path,
            self.session_id
        );
        Ok(())
    }

    fn unload(&mut self) -> Result<(), SpeechError> {
        // State: READY → UNLOADING → UNLOADED
        if self.engine_state() != EngineState::Ready {
            return Err(SpeechError::NotAvailable(
                "Engine not in READY state".to_string(),
            ));
        }

        *self.state.lock().unwrap() = EngineState::Unloading;
        self.reset();
        *self.state.lock().unwrap() = EngineState::Unloaded;
        Ok(())
    }

    fn initialize(
        &mut self,
        model_path: &str,
        config: &TranscriptionConfig,
    ) -> Result<(), SpeechError> {
        // DEPRECATED: use load() instead
        self.load(model_path, config)
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
            revision: 0,
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
        *self.state.lock().unwrap() = EngineState::Unloaded;
    }

    fn state(&self) -> EngineState {
        self.engine_state()
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
        assert_eq!(engine.engine_state(), EngineState::Unloaded);
    }

    #[test]
    fn parakeet_engine_with_params() {
        let params = ParakeetParams::default();
        let engine = ParakeetEngine::with_params(params, Quantization::Int8);
        assert!(!engine.is_initialized());
        assert_eq!(engine.engine_state(), EngineState::Unloaded);
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

    #[test]
    fn parakeet_lifecycle_state_transitions() {
        let mut engine = ParakeetEngine::default();
        // Start: UNLOADED
        assert_eq!(engine.engine_state(), EngineState::Unloaded);

        // load() with non-existent model should fail and revert to UNLOADED
        let config = TranscriptionConfig {
            language: "en".to_string(),
            streaming: true,
            hotwords: vec![],
        };
        let result = engine.load("/nonexistent/model.onnx", &config);
        assert!(result.is_err());
        assert_eq!(engine.engine_state(), EngineState::Unloaded);
    }
}
