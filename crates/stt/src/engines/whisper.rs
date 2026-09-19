#![forbid(unsafe_code)]
//! Whisper STT engine using transcribe-cpp native runtime.
//!
//! Adapted from Handy's transcribe-cpp Session integration with streaming support.

use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicI32, Ordering};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;

use anyhow::Result;
use transcribe_cpp::{Backend, Model, ModelOptions, RunOptions, Session, StreamOptions, Task};

use super::super::{
    EngineState, SpeechEngine, SpeechError, StreamHandle, StreamingTranscript, TranscriptionConfig,
    TranscriptionResult, VadConfig,
};

/// Commands sent to the streaming worker thread.
enum StreamWorkerCmd {
    Feed(Vec<f32>),
    Finalize(Sender<Result<Vec<TranscriptionResult>, SpeechError>>),
    Cancel(Sender<Result<(), SpeechError>>),
}

/// Streaming worker thread main loop.
///
/// This runs in a background thread and owns the Session and Stream,
/// keeping the Stream alive for the duration of the streaming session.
fn streaming_worker_loop(
    mut session: Session,
    session_id: String,
    config: TranscriptionConfig,
    cmd_rx: Receiver<StreamWorkerCmd>,
    revision_shared: Arc<AtomicI32>,
    finalized_shared: Arc<AtomicBool>,
) {
    let run_options = {
        let mut run_options = RunOptions::default();
        if config.language != "auto" {
            run_options.task = Task::Transcribe;
            run_options.language = Some(config.language.clone());
        } else {
            run_options.task = Task::Translate;
        }
        run_options
    };

    let stream_options = StreamOptions::default();

    // Create the stream and keep it alive for the entire loop
    let mut stream = match session.stream(&run_options, &stream_options) {
        Ok(s) => s,
        Err(e) => {
            log::error!("Failed to start stream: {}", e);
            finalized_shared.store(true, Ordering::Release);
            return;
        }
    };

    revision_shared.store(stream.revision(), Ordering::Release);

    while let Ok(cmd) = cmd_rx.recv() {
        match cmd {
            StreamWorkerCmd::Feed(audio) => {
                if finalized_shared.load(Ordering::Acquire) {
                    continue;
                }

                let _update = match stream.feed(&audio) {
                    Ok(u) => u,
                    Err(e) => {
                        log::warn!("Stream feed error: {}", e);
                        continue;
                    }
                };

                let _text = stream.text();
                let revision = stream.revision();
                revision_shared.store(revision, Ordering::Release);

                // We don't send results back for feed commands (fire-and-forget).
                // The caller can poll revision() on the handle.
            }
            StreamWorkerCmd::Finalize(reply_tx) => {
                let result = (|| -> Result<Vec<TranscriptionResult>, SpeechError> {
                    let _update = stream.finalize().map_err(|e| {
                        SpeechError::Inference(format!("Stream finalize failed: {}", e))
                    })?;

                    let revision = stream.revision();
                    revision_shared.store(revision, Ordering::Release);
                    finalized_shared.store(true, Ordering::Release);

                    let text = stream.text().full.trim().to_string();
                    if text.is_empty() {
                        return Ok(vec![]);
                    }

                    let sequence = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64;

                    Ok(vec![TranscriptionResult {
                        session_id: session_id.clone(),
                        sequence,
                        text,
                        is_final: true,
                        timestamp_ms: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_millis() as u64,
                        revision,
                    }])
                })();

                let _ = reply_tx.send(result);
                break;
            }
            StreamWorkerCmd::Cancel(reply_tx) => {
                stream.reset();
                finalized_shared.store(true, Ordering::Release);
                let _ = reply_tx.send(Ok(()));
                break;
            }
        }
    }
}

/// Handle for controlling a streaming session from the main thread.
struct WhisperStreamHandle {
    revision: Arc<AtomicI32>,
    finalized: Arc<AtomicBool>,
}

impl StreamHandle for WhisperStreamHandle {
    fn revision(&self) -> i32 {
        self.revision.load(Ordering::Acquire)
    }

    fn is_finalized(&self) -> bool {
        self.finalized.load(Ordering::Acquire)
    }

    fn mark_finalized(&self) {
        self.finalized.store(true, Ordering::Release);
    }
}

/// Whisper streaming engine.
///
/// Uses transcribe-cpp for native Whisper/Whisper.cpp inference with streaming support.
/// Supports both batch and streaming transcription via Session::stream().
pub struct WhisperEngine {
    model: Option<transcribe_cpp::Model>,
    session: Mutex<Option<Session>>,
    model_id: Option<String>,
    session_id: Option<String>,
    initialized: AtomicBool,
    config: Mutex<Option<TranscriptionConfig>>,
    supported_languages: Vec<String>,
    supports_streaming: AtomicBool,
    model_options: ModelOptions,
    state: Mutex<EngineState>,
    vad_config: Mutex<VadConfig>,
    sequence_counter: AtomicI32,
    last_revision: AtomicI32,
    // Streaming worker
    stream_worker_handle: Mutex<Option<thread::JoinHandle<()>>>,
    stream_cmd_tx: Mutex<Option<Sender<StreamWorkerCmd>>>,
    stream_revision: Arc<AtomicI32>,
    stream_finalized: Arc<AtomicBool>,
}

impl Default for WhisperEngine {
    fn default() -> Self {
        Self {
            model: None,
            session: Mutex::new(None),
            model_id: None,
            session_id: None,
            initialized: AtomicBool::new(false),
            config: Mutex::new(None),
            supported_languages: Vec::new(),
            supports_streaming: AtomicBool::new(false),
            model_options: ModelOptions::default(),
            state: Mutex::new(EngineState::Uninitialized),
            vad_config: Mutex::new(VadConfig::default()),
            sequence_counter: AtomicI32::new(0),
            last_revision: AtomicI32::new(-1),
            stream_worker_handle: Mutex::new(None),
            stream_cmd_tx: Mutex::new(None),
            stream_revision: Arc::new(AtomicI32::new(-1)),
            stream_finalized: Arc::new(AtomicBool::new(false)),
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
        self.supports_streaming.load(Ordering::Acquire)
    }

    /// Get the model's supported languages.
    pub fn supported_languages(&self) -> &[String] {
        &self.supported_languages
    }

    /// Get the current engine state.
    pub fn engine_state(&self) -> EngineState {
        *self.state.lock().unwrap()
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

        if config.language != "auto" {
            run_options.task = Task::Transcribe;
            run_options.language = Some(config.language.clone());
        } else {
            run_options.task = Task::Translate;
        }

        run_options
    }

    /// Get next sequence number.
    fn next_sequence(&self) -> u64 {
        self.sequence_counter.fetch_add(1, Ordering::AcqRel) as u64
    }

    /// Run batch transcription (non-streaming).
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
        let sequence = self.next_sequence();

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

    /// Warm up the engine with a dummy inference.
    fn do_warmup(&mut self) -> Result<(), SpeechError> {
        if !self.initialized.load(Ordering::Acquire) {
            return Err(SpeechError::NotInitialized);
        }

        let dummy_audio = vec![0.0f32; 1600];
        let _ = self.run_batch(&dummy_audio);
        Ok(())
    }

    fn start_stream_worker(&mut self) -> Result<(), SpeechError> {
        // Take the session out of the mutex
        let mut session_guard = self.session.lock().unwrap();
        let session = session_guard.take().ok_or(SpeechError::NotInitialized)?;

        let session_id = self.session_id.clone().unwrap_or_default();
        let config = self.config.lock().unwrap().clone().unwrap_or_default();

        // Create command channel
        let (cmd_tx, cmd_rx) = channel::<StreamWorkerCmd>();

        // Shared state for revision tracking
        let revision = Arc::new(AtomicI32::new(-1));
        let finalized = Arc::new(AtomicBool::new(false));

        // Clone for the closure
        let revision_worker = revision.clone();
        let finalized_worker = finalized.clone();

        // Spawn worker thread
        let handle = thread::spawn(move || {
            streaming_worker_loop(
                session,
                session_id,
                config,
                cmd_rx,
                revision_worker,
                finalized_worker,
            );
        });

        // Store worker handle and channel
        *self.stream_worker_handle.lock().unwrap() = Some(handle);
        *self.stream_cmd_tx.lock().unwrap() = Some(cmd_tx);
        self.stream_revision = revision;
        self.stream_finalized = finalized;
        self.last_revision.store(-1, Ordering::Release);

        *self.state.lock().unwrap() = EngineState::Streaming;
        Ok(())
    }

    /// Stop the streaming worker thread and return the session.
    fn stop_stream_worker(&mut self) -> Result<Session, SpeechError> {
        let cmd_tx = self.stream_cmd_tx.lock().unwrap().take();
        let handle = self.stream_worker_handle.lock().unwrap().take();

        if let (Some(cmd_tx), Some(handle)) = (cmd_tx, handle) {
            // Send cancel command and wait for thread to finish
            let (reply_tx, reply_rx) = channel();
            if cmd_tx.send(StreamWorkerCmd::Cancel(reply_tx)).is_ok() {
                let _ = reply_rx.recv();
            }
            let _ = handle.join();
        }

        // Recreate session from model (the old session was consumed by the worker)
        let model = self.model.as_ref().ok_or(SpeechError::NotInitialized)?;
        let session = model.session().map_err(|e| {
            SpeechError::ModelLoad(format!("Failed to recreate Whisper session: {}", e))
        })?;

        *self.state.lock().unwrap() = EngineState::Ready;
        Ok(session)
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

        *self.state.lock().unwrap() = EngineState::Ready;

        // Load the model
        let model = Model::load_with(path, &self.model_options)
            .map_err(|e| SpeechError::ModelLoad(format!("Failed to load Whisper model: {}", e)))?;

        // Check capabilities
        let caps = model.capabilities();
        self.supports_streaming
            .store(caps.supports_streaming, Ordering::Release);
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

        self.model = Some(model);
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
        self.sequence_counter.store(0, Ordering::Release);
        self.last_revision.store(-1, Ordering::Release);

        log::info!("Whisper engine initialized: session={:?}", self.session_id);
        Ok(())
    }

    fn process_audio(&mut self, audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized.load(Ordering::Acquire) {
            return Err(SpeechError::NotInitialized);
        }

        // If in streaming mode, reject direct process_audio calls
        if self.engine_state() == EngineState::Streaming {
            return Err(SpeechError::Inference(
                "Engine in streaming mode; use feed_stream instead".to_string(),
            ));
        }

        // Batch transcription
        self.run_batch(audio)
    }

    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if !self.initialized.load(Ordering::Acquire) {
            return Err(SpeechError::NotInitialized);
        }

        if self.engine_state() == EngineState::Streaming {
            return Err(SpeechError::Inference(
                "Engine in streaming mode; use finalize_stream instead".to_string(),
            ));
        }

        Ok(vec![])
    }

    fn reset(&mut self) {
        // Stop any active streaming worker
        let _ = self.stop_stream_worker();

        *self.session.lock().unwrap() = None;
        self.model = None;
        self.model_id = None;
        self.session_id = None;
        *self.config.lock().unwrap() = None;
        self.supported_languages.clear();
        self.supports_streaming.store(false, Ordering::Release);
        self.initialized.store(false, Ordering::Release);
        *self.state.lock().unwrap() = EngineState::Uninitialized;
        self.sequence_counter.store(0, Ordering::Release);
        self.last_revision.store(-1, Ordering::Release);
    }

    fn state(&self) -> EngineState {
        *self.state.lock().unwrap()
    }

    fn warmup(&mut self) -> Result<(), SpeechError> {
        *self.state.lock().unwrap() = EngineState::WarmingUp;
        let result = self.do_warmup();
        if result.is_ok() {
            *self.state.lock().unwrap() = EngineState::Ready;
        }
        result
    }

    fn start_stream(&mut self) -> Result<Box<dyn StreamHandle>, SpeechError> {
        if !self.initialized.load(Ordering::Acquire) {
            return Err(SpeechError::NotInitialized);
        }
        if !self.supports_streaming.load(Ordering::Acquire) {
            return Err(SpeechError::StreamingNotSupported);
        }
        if self.engine_state() == EngineState::Streaming {
            return Err(SpeechError::Inference("Stream already active".to_string()));
        }

        self.start_stream_worker()?;

        Ok(Box::new(WhisperStreamHandle {
            revision: self.stream_revision.clone(),
            finalized: self.stream_finalized.clone(),
        }))
    }

    fn feed_stream(
        &mut self,
        handle: &mut dyn StreamHandle,
        audio: &[f32],
    ) -> Result<Vec<StreamingTranscript>, SpeechError> {
        if self.engine_state() != EngineState::Streaming {
            return Err(SpeechError::StreamNotActive);
        }

        // Check for stale result
        let current_revision = handle.revision();
        let last_revision = self.last_revision.load(Ordering::Acquire);
        if current_revision <= last_revision && last_revision >= 0 {
            return Err(SpeechError::StaleResult {
                revision: current_revision,
                last_revision,
            });
        }
        self.last_revision
            .store(current_revision, Ordering::Release);

        let cmd_tx = self.stream_cmd_tx.lock().unwrap().clone();
        let Some(cmd_tx) = cmd_tx else {
            return Err(SpeechError::StreamNotActive);
        };

        // Send feed command (fire-and-forget for low latency)
        if cmd_tx.send(StreamWorkerCmd::Feed(audio.to_vec())).is_err() {
            return Err(SpeechError::StreamNotActive);
        }

        // For now, return empty - the caller should poll handle.revision()
        // and use a separate mechanism to get transcript updates.
        // A production implementation would use a callback or result channel.
        Ok(vec![])
    }

    fn finalize_stream(
        &mut self,
        handle: Box<dyn StreamHandle>,
    ) -> Result<Vec<TranscriptionResult>, SpeechError> {
        if self.engine_state() != EngineState::Streaming {
            return Err(SpeechError::StreamNotActive);
        }

        let cmd_tx = self.stream_cmd_tx.lock().unwrap().take();
        let Some(cmd_tx) = cmd_tx else {
            return Err(SpeechError::StreamNotActive);
        };

        let (reply_tx, reply_rx) = channel();
        cmd_tx
            .send(StreamWorkerCmd::Finalize(reply_tx))
            .map_err(|_| SpeechError::StreamNotActive)?;

        let result = reply_rx
            .recv()
            .map_err(|_| SpeechError::Inference("Stream worker died".to_string()))?;

        // Restore session
        let session = self.stop_stream_worker()?;
        *self.session.lock().unwrap() = Some(session);

        // Update handle state
        handle.mark_finalized();

        result
    }

    fn cancel_stream(&mut self, handle: Box<dyn StreamHandle>) -> Result<(), SpeechError> {
        if self.engine_state() != EngineState::Streaming {
            return Err(SpeechError::StreamNotActive);
        }

        let cmd_tx = self.stream_cmd_tx.lock().unwrap().take();
        let Some(cmd_tx) = cmd_tx else {
            return Err(SpeechError::StreamNotActive);
        };

        let (reply_tx, reply_rx) = channel();
        cmd_tx
            .send(StreamWorkerCmd::Cancel(reply_tx))
            .map_err(|_| SpeechError::StreamNotActive)?;

        let _ = reply_rx.recv();

        // Restore session
        let session = self.stop_stream_worker()?;
        *self.session.lock().unwrap() = Some(session);

        handle.mark_finalized();
        Ok(())
    }

    fn set_vad_config(&mut self, config: VadConfig) {
        *self.vad_config.lock().unwrap() = config;
    }

    fn shutdown(&mut self) {
        *self.state.lock().unwrap() = EngineState::ShuttingDown;
        let _ = self.stop_stream_worker();
        self.reset();
        *self.state.lock().unwrap() = EngineState::Shutdown;
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
        assert_eq!(engine.engine_state(), EngineState::Uninitialized);
    }

    #[test]
    fn whisper_engine_with_model_options() {
        let options = ModelOptions::default();
        let engine = WhisperEngine::with_model_options(options);
        assert!(!engine.is_initialized());
        assert_eq!(engine.engine_state(), EngineState::Uninitialized);
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

    #[test]
    fn whisper_engine_state_transitions() {
        let engine = WhisperEngine::default();
        assert_eq!(engine.engine_state(), EngineState::Uninitialized);
    }

    #[test]
    fn whisper_vad_config() {
        let mut engine = WhisperEngine::default();
        let vad_config = VadConfig {
            enabled: true,
            min_speech_ms: 250,
            max_silence_ms: 1000,
            threshold: 0.5,
        };
        engine.set_vad_config(vad_config);
    }
}
