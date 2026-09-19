#![forbid(unsafe_code)]
//! Whisper STT engine using transcribe-cpp native runtime.
//!
//! Adapted from Handy's transcribe-cpp Session integration with streaming support.

use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use anyhow::Result;
use transcribe_cpp::{
    Backend, Model, ModelOptions, RunOptions, Session, Stream, StreamOptions, Task,
};

use super::super::{SpeechEngine, SpeechError, TranscriptionConfig, TranscriptionResult};

/// Whisper streaming engine.
///
/// Uses transcribe-cpp for native Whisper/Whisper.cpp inference with streaming support.
/// Supports both batch and streaming transcription via Session::stream().
///
/// The session is protected by a Mutex. For streaming, the streaming worker
/// should take ownership of the engine (or lock it for the duration of streaming).
pub struct WhisperEngine {
    session: Mutex<Option<Session>>,
    model_id: Option<String>,
    session_id: Option<String>,
    initialized: AtomicBool,
    config: Mutex<Option<TranscriptionConfig>>,
    supported_languages: Vec<String>,
    supports_streaming: bool,
    model_options: ModelOptions,
}

impl Default for WhisperEngine {
    fn default() -> Self {
        Self {
            session: Mutex::new(None),
            model_id: None,
            session_id: None,
            initialized: AtomicBool::new(false),
            config: Mutex::new(None),
            supported_languages: Vec::new(),
            supports_streaming: false,
            model_options: ModelOptions::default(),
        }
    }
}

impl WhisperEngine {
    /// Create a new Whisper engine with custom model options.
    pub fn with_model_options(model_options: ModelOptions) -> Self {
        Self {
            model_options,
            ..Default::default()
        }
    }

    /// Set the backend explicitly (for testing or specific hardware selection).
    pub fn set_backend(&mut self, backend: Backend) {
        self.model_options.backend = backend;
    }

    /// Get the current session ID.
    pub fn session_id(&self) -> Option<&str> {
        self.session_id.as_deref()
    }

    /// Check if the engine is initialized.
    pub fn is_initialized(&self) -> bool {
        self.initialized.load(Ordering::Acquire)
    }

    /// Check if the loaded model supports streaming.
    pub fn supports_streaming(&self) -> bool {
        self.supports_streaming
    }

    /// Get the model's supported languages.
    pub fn supported_languages(&self) -> &[String] {
        &self.supported_languages
    }

    /// Build run options from transcription config.
    fn build_run_options(&self) -> RunOptions {
        let config = self
            .config
            .lock()
            .unwrap()
            .clone()
            .unwrap_or_else(|| TranscriptionConfig {
                language: "en".to_string(),
                streaming: true,
                hotwords: Vec::new(),
            });
        let mut run_options = RunOptions::default();

        // Task: transcribe or translate
        if config.language != "auto" {
            run_options.task = Task::Transcribe;
        } else {
            run_options.task = Task::Translate;
        }

        // Language
        if config.language != "auto" {
            run_options.language = Some(config.language.clone());
        }

        run_options
    }

    /// Run streaming transcription with a closure that has access to the stream.
    ///
    /// This follows Handy's pattern: the caller provides a closure that receives
    /// the stream. The session lock is held for the duration of the closure.
    pub fn with_stream<F, R>(&self, f: F) -> Result<R, SpeechError>
    where
        F: FnOnce(&mut Stream) -> Result<R, SpeechError>,
    {
        if !self.supports_streaming {
            return Err(SpeechError::Inference(
                "Model does not support streaming".to_string(),
            ));
        }

        let mut session_guard = self.session.lock().unwrap();
        let session = session_guard.as_mut().ok_or(SpeechError::NotInitialized)?;
        let run_options = self.build_run_options();

        let mut stream = session
            .stream(&run_options, &StreamOptions::default())
            .map_err(|e| SpeechError::Inference(format!("Failed to start stream: {}", e)))?;

        let result = f(&mut stream);

        // The stream is dropped here, releasing the compute lease
        result
    }

    /// Feed audio to a stream (used within with_stream closure).
    fn feed_stream(
        stream: &mut Stream,
        audio: &[f32],
        session_id: &str,
    ) -> Result<Vec<TranscriptionResult>, SpeechError> {
        let _update = stream
            .feed(audio)
            .map_err(|e| SpeechError::Inference(format!("Stream feed failed: {}", e)))?;

        let text = stream.text();
        let session_id = session_id.to_string();
        let sequence = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let mut results = Vec::new();

        if !text.committed.is_empty() {
            results.push(TranscriptionResult {
                session_id: session_id.clone(),
                sequence,
                text: text.committed,
                is_final: false,
                timestamp_ms: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
            });
        }

        if !text.tentative.is_empty() {
            results.push(TranscriptionResult {
                session_id,
                sequence: sequence + 1,
                text: text.tentative,
                is_final: false,
                timestamp_ms: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
            });
        }

        Ok(results)
    }

    /// Finalize a stream (used within with_stream closure).
    fn finalize_stream(
        stream: &mut Stream,
        session_id: &str,
    ) -> Result<Vec<TranscriptionResult>, SpeechError> {
        let _update = stream
            .finalize()
            .map_err(|e| SpeechError::Inference(format!("Stream finalize failed: {}", e)))?;

        let text = stream.text().full;
        let session_id = session_id.to_string();
        let sequence = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        if text.is_empty() {
            return Ok(vec![]);
        }

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

    /// Run batch transcription.
    fn run_batch(&self, audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError> {
        let mut session_guard = self.session.lock().unwrap();
        let session = session_guard.as_mut().ok_or(SpeechError::NotInitialized)?;
        let run_options = self.build_run_options();

        let result = session
            .run(audio, &run_options)
            .map_err(|e| SpeechError::Inference(format!("Whisper inference failed: {}", e)))?;

        let text = result.text.trim().to_string();
        if text.is_empty() {
            return Ok(vec![]);
        }

        let session_id = self.session_id.clone().unwrap_or_default();
        let sequence = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

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
}

impl SpeechEngine for WhisperEngine {
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

        // Load the model
        let model = Model::load_with(path, &self.model_options)
            .map_err(|e| SpeechError::ModelLoad(format!("Failed to load Whisper model: {}", e)))?;

        // Check capabilities
        let caps = model.capabilities();
        self.supports_streaming = caps.supports_streaming;
        self.supported_languages = caps.languages.clone();

        log::info!(
            "Whisper model loaded: arch={}, variant={}, streaming={}, languages={:?}",
            model.arch(),
            model.variant(),
            caps.supports_streaming,
            caps.languages
        );

        // Create session
        let session = model.session().map_err(|e| {
            SpeechError::ModelLoad(format!("Failed to create Whisper session: {}", e))
        })?;

        *self.session.lock().unwrap() = Some(session);
        self.model_id = Some(model_path.to_string());
        self.session_id = Some(format!(
            "session_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        *self.config.lock().unwrap() = Some(config.clone());
        self.initialized.store(true, Ordering::Release);

        log::info!("Whisper engine initialized: session={:?}", self.session_id);
        Ok(())
    }

    fn process_audio(&mut self, audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized.load(Ordering::Acquire) {
            return Err(SpeechError::NotInitialized);
        }

        // If model supports streaming, use streaming API
        if self.supports_streaming {
            let session_id = self.session_id.clone().unwrap_or_default();
            return self.with_stream(|stream| Self::feed_stream(stream, audio, &session_id));
        }

        // Otherwise, fall back to batch transcription
        self.run_batch(audio)
    }

    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized.load(Ordering::Acquire) {
            return Err(SpeechError::NotInitialized);
        }

        // For streaming, finalize should be called via with_stream
        // For batch, there's nothing to finalize
        if self.supports_streaming {
            let session_id = self.session_id.clone().unwrap_or_default();
            return self.with_stream(|stream| Self::finalize_stream(stream, &session_id));
        }

        Ok(vec![])
    }

    fn reset(&mut self) {
        *self.session.lock().unwrap() = None;
        self.model_id = None;
        self.session_id = None;
        *self.config.lock().unwrap() = None;
        self.supported_languages.clear();
        self.supports_streaming = false;
        self.initialized.store(false, Ordering::Release);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn whisper_engine_default() {
        let engine = WhisperEngine::default();
        assert!(!engine.is_initialized());
        assert!(!engine.supports_streaming());
        assert!(engine.session_id().is_none());
        assert!(engine.supported_languages().is_empty());
    }

    #[test]
    fn whisper_engine_with_model_options() {
        let options = ModelOptions::default();
        let engine = WhisperEngine::with_model_options(options);
        assert!(!engine.is_initialized());
    }

    #[test]
    fn whisper_initialize_nonexistent_model() {
        let mut engine = WhisperEngine::default();
        let config = TranscriptionConfig {
            language: "en".to_string(),
            streaming: true,
            hotwords: vec![],
        };
        let result = engine.initialize("/nonexistent/model.bin", &config);
        assert!(result.is_err());
        match result.unwrap_err() {
            SpeechError::ModelLoad(_) => {}
            _ => panic!("Expected ModelLoad error"),
        }
    }

    #[test]
    fn whisper_set_backend() {
        let mut engine = WhisperEngine::default();
        engine.set_backend(Backend::Cpu);
    }
}
