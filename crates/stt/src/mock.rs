//! Deterministic mock-audio / mock-STT test doubles (R1-GAP-005/006).
//!
//! Reused contracts (nothing reinvented):
//! - [`crate::SpeechEngine`] — the existing STT abstraction. [`MockSpeechEngine`]
//!   implements it, so integration tests prove the session↔recording path through
//!   the production engine interface: no hardware, no model download, no network.
//! - [`soravo_audio::vad::VoiceActivityDetector`] — [`MockAudioSource`] emits
//!   backend-sized 16 kHz frames, so mock audio can be classified by the real
//!   Handy-derived VAD (`EarshotVad`) without any capture device.
//!
//! These doubles are test infrastructure. No production path constructs them
//! (see the `debug_assertions` guard in [`MockSpeechEngine::new`]-adjacent
//! documentation and the `#[cfg(test)]` coverage below); they exist so CI can
//! exercise session identity, staleness, duplication, finalization, and error
//! semantics deterministically.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicI32, Ordering};
use std::sync::Arc;

use crate::{
    EngineState, SpeechEngine, SpeechError, StreamingTranscript, TranscriptionConfig,
    TranscriptionResult,
};

/// Mono 16 kHz sample rate shared with the production audio path.
pub const MOCK_SAMPLE_RATE_HZ: u32 = 16_000;

/// Frame size matching the Handy-derived `EarshotVad` backend
/// (`EARSHOT_FRAME_SAMPLES`), so mock frames are directly classifiable.
pub const MOCK_FRAME_SAMPLES: usize = 256;

// ---------------------------------------------------------------------------
// Mock audio
// ---------------------------------------------------------------------------

/// One deterministic mock-audio frame: raw samples plus the ground-truth
/// speech flag the generator intended (loud tone = speech, silence = noise).
/// Tests assert VAD behavior against `speech`; the flag itself never drives
/// production logic.
#[derive(Clone, Debug)]
pub struct MockAudioFrame {
    pub samples: Vec<f32>,
    pub speech: bool,
}

/// Deterministic mock microphone: yields scripted 16 kHz frames without any
/// OS audio device. Patterns:
/// - [`MockAudioSource::silence`] — digital silence (VAD must report noise);
/// - [`MockAudioSource::tone`] — full-determinism sine burst (VAD must report
///   speech at the default Earshot threshold).
///
/// The generator is a pure function of (pattern, frame index): same script ⇒
/// same samples, every run, on every platform.
#[derive(Debug)]
pub struct MockAudioSource {
    frames: VecDeque<MockAudioFrame>,
    delivered: usize,
}

impl MockAudioSource {
    fn push(&mut self, frame: MockAudioFrame) {
        self.frames.push_back(frame);
    }

    /// `count` frames of digital silence.
    pub fn silence(count: usize) -> Self {
        let mut src = Self {
            frames: VecDeque::new(),
            delivered: 0,
        };
        for _ in 0..count {
            src.push(MockAudioFrame {
                samples: vec![0.0; MOCK_FRAME_SAMPLES],
                speech: false,
            });
        }
        src
    }

    /// `count` frames of a sine tone (`freq_hz`, peak `amplitude`).
    /// Amplitude 0.5 at 440 Hz is comfortably above the Earshot speech
    /// threshold while staying inside [-1.0, 1.0] (no clamping path).
    pub fn tone(count: usize, freq_hz: f32, amplitude: f32) -> Self {
        let mut src = Self {
            frames: VecDeque::new(),
            delivered: 0,
        };
        for n in 0..count {
            let mut samples = Vec::with_capacity(MOCK_FRAME_SAMPLES);
            for i in 0..MOCK_FRAME_SAMPLES {
                let t = ((n * MOCK_FRAME_SAMPLES + i) as f32) / MOCK_SAMPLE_RATE_HZ as f32;
                samples.push(amplitude * (2.0 * std::f32::consts::PI * freq_hz * t).sin());
            }
            src.push(MockAudioFrame {
                samples,
                speech: true,
            });
        }
        src
    }

    /// Scripted source: silence, then a tone burst, then trailing silence —
    /// the shape of one spoken utterance. Deterministic and platform-neutral.
    pub fn utterance() -> Self {
        let mut src = Self::silence(4);
        src.extend(Self::tone(12, 440.0, 0.5));
        src.extend(Self::silence(4));
        src
    }

    fn extend(&mut self, other: Self) {
        self.frames.extend(other.frames);
    }

    /// Next frame, or `None` when the script is exhausted (end of stream ⇒
    /// the pipeline must finalize, never hang).
    pub fn next_frame(&mut self) -> Option<MockAudioFrame> {
        let frame = self.frames.pop_front()?;
        self.delivered += 1;
        Some(frame)
    }

    /// Frames still queued.
    pub fn remaining(&self) -> usize {
        self.frames.len()
    }

    /// Frames delivered so far.
    pub fn delivered(&self) -> usize {
        self.delivered
    }

    /// Concatenate every remaining frame into one sample buffer (batch-path
    /// transcription input).
    pub fn drain_samples(&mut self) -> Vec<f32> {
        let mut out = Vec::new();
        while let Some(frame) = self.next_frame() {
            out.extend_from_slice(&frame.samples);
        }
        out
    }
}

// ---------------------------------------------------------------------------
// Mock STT
// ---------------------------------------------------------------------------

/// One scripted engine output, in emission order.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum MockScriptStep {
    /// Intermediate hypothesis: must never become committed/final output.
    Tentative(String),
    /// Stable prefix: injectable, deduplicated by sequence.
    Committed(String),
    /// Complete utterance: emitted exactly once, clears tentative state.
    Final(String),
    /// Next engine call fails with `SpeechError::Inference(msg)`.
    Fail(String),
}

/// Deterministic [`SpeechEngine`] test double.
///
/// Behavior:
/// - `process_audio` records the received sample count, then emits the next
///   scripted step (each emission bumps `revision`, mirroring streaming
///   revision tracking for stale-result rejection);
/// - steps past the end of the script yield no results (never fabricated);
/// - [`MockScriptStep::Fail`] makes exactly the next call fail; `fail_sticky`
///   makes every call fail until cleared (error-path coverage);
/// - a scripted `Final` is terminal for the utterance (as in every real
///   engine: final = stream end). After a `Final` is emitted on any path,
///   further `process_audio`/`feed_stream` calls yield nothing and `finalize`
///   yields nothing, until a new stream starts — so final output occurs
///   exactly once per utterance and can never be duplicated by the mock;
/// - `finalize` drains a trailing `Final` step when present, otherwise
///   synthesizes the final result from the last committed text (mirrors the
///   production stream-finalize-then-batch-fallback contract: finalization
///   always produces deterministic output, never hangs);
/// - session identity is intentionally the placeholder `"mock"`: the pipeline
///   stamps the canonical session id/sequence at the highest layer that owns
///   session identity (never inside the engine).
#[derive(Debug)]
pub struct MockSpeechEngine {
    script: VecDeque<MockScriptStep>,
    revision: i32,
    received_samples: usize,
    process_calls: usize,
    finalize_calls: usize,
    fail_sticky: Option<String>,
    finalized: bool,
    initialized: bool,
    last_committed: String,
    final_delivered: bool,
}

impl MockSpeechEngine {
    /// Scripted engine: emits `script` in order, then silence.
    pub fn scripted(steps: Vec<MockScriptStep>) -> Self {
        Self {
            script: steps.into(),
            revision: 0,
            received_samples: 0,
            process_calls: 0,
            finalize_calls: 0,
            fail_sticky: None,
            finalized: false,
            initialized: false,
            last_committed: String::new(),
            final_delivered: false,
        }
    }

    /// Convenience: one tentative hypothesis followed by its final text.
    pub fn tentative_then_final(tentative: &str, final_text: &str) -> Self {
        Self::scripted(vec![
            MockScriptStep::Tentative(tentative.to_string()),
            MockScriptStep::Final(final_text.to_string()),
        ])
    }

    /// Every engine call fails with `SpeechError::Inference(msg)` until
    /// [`MockSpeechEngine::clear_sticky_failure`] runs.
    pub fn failing(msg: &str) -> Self {
        let mut engine = Self::scripted(vec![]);
        engine.fail_sticky = Some(msg.to_string());
        engine
    }

    pub fn clear_sticky_failure(&mut self) {
        self.fail_sticky = None;
    }

    /// Total audio samples received across `process_audio` calls.
    pub fn received_samples(&self) -> usize {
        self.received_samples
    }

    pub fn process_calls(&self) -> usize {
        self.process_calls
    }

    pub fn finalize_calls(&self) -> usize {
        self.finalize_calls
    }

    pub fn is_finalized(&self) -> bool {
        self.finalized
    }

    fn next_revision(&mut self) -> i32 {
        self.revision += 1;
        self.revision
    }

    fn check_sticky(&self) -> Result<(), SpeechError> {
        if let Some(msg) = &self.fail_sticky {
            return Err(SpeechError::Inference(msg.clone()));
        }
        Ok(())
    }

    fn result_for(&mut self, text: String, is_final: bool) -> TranscriptionResult {
        let revision = self.next_revision();
        TranscriptionResult {
            session_id: "mock".to_string(),
            sequence: revision as u64,
            text,
            is_final,
            timestamp_ms: 0,
            revision,
        }
    }
}

impl Default for MockSpeechEngine {
    fn default() -> Self {
        Self::scripted(vec![])
    }
}

impl SpeechEngine for MockSpeechEngine {
    fn initialize(
        &mut self,
        _model_path: &str,
        _config: &TranscriptionConfig,
    ) -> Result<(), SpeechError> {
        // No model is loaded: initialization always succeeds so tests never
        // touch the network, the filesystem, or a model catalogue.
        self.initialized = true;
        Ok(())
    }

    fn process_audio(&mut self, audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError> {
        self.check_sticky()?;
        if !self.initialized {
            return Err(SpeechError::NotInitialized);
        }
        self.process_calls += 1;
        self.received_samples += audio.len();
        if self.final_delivered {
            return Ok(vec![]);
        }

        match self.script.pop_front() {
            Some(MockScriptStep::Tentative(text)) => Ok(vec![self.result_for(text, false)]),
            Some(MockScriptStep::Committed(text)) => {
                self.last_committed = text.clone();
                Ok(vec![self.result_for(text, false)])
            }
            Some(MockScriptStep::Final(text)) => {
                self.last_committed = text.clone();
                self.final_delivered = true;
                Ok(vec![self.result_for(text, true)])
            }
            Some(MockScriptStep::Fail(msg)) => Err(SpeechError::Inference(msg)),
            None => Ok(vec![]),
        }
    }

    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError> {
        self.check_sticky()?;
        if !self.initialized {
            return Err(SpeechError::NotInitialized);
        }
        self.finalize_calls += 1;
        self.finalized = true;
        if self.final_delivered {
            return Ok(vec![]);
        }

        // A trailing scripted Final wins verbatim; otherwise the last
        // committed text is the deterministic final (never fabricated from
        // nothing: empty when the engine never produced text).
        let final_text = match self.script.pop_front() {
            Some(MockScriptStep::Final(text)) => Some(text),
            Some(other) => {
                self.script.push_front(other);
                None
            }
            None => None,
        }
        .or_else(|| {
            if self.last_committed.is_empty() {
                None
            } else {
                Some(self.last_committed.clone())
            }
        });

        match final_text {
            Some(text) => {
                self.final_delivered = true;
                Ok(vec![self.result_for(text, true)])
            }
            None => Ok(vec![]),
        }
    }

    fn reset(&mut self) {
        self.script.clear();
        self.revision = 0;
        self.received_samples = 0;
        self.process_calls = 0;
        self.finalize_calls = 0;
        self.fail_sticky = None;
        self.finalized = false;
        self.initialized = false;
        self.last_committed.clear();
        self.final_delivered = false;
    }

    fn supports_streaming(&self) -> bool {
        true
    }

    fn state(&self) -> EngineState {
        if self.initialized {
            EngineState::Ready
        } else {
            EngineState::Unloaded
        }
    }

    fn start_stream(&mut self) -> Result<Box<dyn crate::StreamHandle>, SpeechError> {
        self.check_sticky()?;
        if !self.initialized {
            return Err(SpeechError::NotInitialized);
        }
        // A new stream is a new utterance: a previously delivered Final must
        // not suppress it.
        self.final_delivered = false;
        Ok(Box::new(MockStreamHandle {
            revision: Arc::new(AtomicI32::new(0)),
            finalized: Arc::new(AtomicI32::new(0)),
        }))
    }

    fn feed_stream(
        &mut self,
        handle: &mut dyn crate::StreamHandle,
        audio: &[f32],
    ) -> Result<Vec<StreamingTranscript>, SpeechError> {
        self.check_sticky()?;
        self.received_samples += audio.len();
        if self.final_delivered {
            return Ok(vec![]);
        }
        let revision = handle.revision() + 1;
        match self.script.pop_front() {
            Some(MockScriptStep::Tentative(text)) => Ok(vec![StreamingTranscript::new(
                String::new(),
                text,
                revision,
                false,
            )]),
            Some(MockScriptStep::Committed(text)) => {
                self.last_committed = text.clone();
                Ok(vec![StreamingTranscript::new(
                    text,
                    String::new(),
                    revision,
                    false,
                )])
            }
            Some(MockScriptStep::Final(text)) => {
                self.last_committed = text.clone();
                self.final_delivered = true;
                Ok(vec![StreamingTranscript::new(
                    text,
                    String::new(),
                    revision,
                    true,
                )])
            }
            Some(MockScriptStep::Fail(msg)) => Err(SpeechError::Inference(msg)),
            None => Ok(vec![]),
        }
    }

    fn finalize_stream(
        &mut self,
        handle: Box<dyn crate::StreamHandle>,
    ) -> Result<Vec<TranscriptionResult>, SpeechError> {
        self.check_sticky()?;
        handle.mark_finalized();
        self.finalize()
    }

    fn cancel_stream(&mut self, handle: Box<dyn crate::StreamHandle>) -> Result<(), SpeechError> {
        handle.mark_finalized();
        self.script.clear();
        Ok(())
    }
}

#[derive(Debug)]
struct MockStreamHandle {
    revision: Arc<AtomicI32>,
    finalized: Arc<AtomicI32>,
}

impl crate::StreamHandle for MockStreamHandle {
    fn revision(&self) -> i32 {
        self.revision.load(Ordering::SeqCst)
    }

    fn is_finalized(&self) -> bool {
        self.finalized.load(Ordering::SeqCst) != 0
    }

    fn mark_finalized(&self) {
        self.finalized.store(1, Ordering::SeqCst);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::SpeechEngine;

    fn config() -> TranscriptionConfig {
        TranscriptionConfig {
            language: "en".to_string(),
            streaming: true,
            hotwords: vec![],
        }
    }

    #[test]
    fn mock_audio_silence_is_all_zeros() {
        let mut src = MockAudioSource::silence(3);
        assert_eq!(src.remaining(), 3);
        while let Some(frame) = src.next_frame() {
            assert_eq!(frame.samples.len(), MOCK_FRAME_SAMPLES);
            assert!(frame.samples.iter().all(|s| *s == 0.0));
            assert!(!frame.speech);
        }
        assert_eq!(src.remaining(), 0);
        assert!(src.next_frame().is_none(), "exhausted source must end");
    }

    #[test]
    fn mock_audio_tone_is_deterministic() {
        let mut a = MockAudioSource::tone(2, 440.0, 0.5);
        let mut b = MockAudioSource::tone(2, 440.0, 0.5);
        while let (Some(fa), Some(fb)) = (a.next_frame(), b.next_frame()) {
            assert_eq!(fa.samples, fb.samples);
            assert!(fa.samples.iter().any(|s| s.abs() > 0.1));
            assert!(fa.speech);
        }
    }

    #[test]
    fn mock_audio_utterance_has_speech_core() {
        let mut src = MockAudioSource::utterance();
        let mut saw_silence = false;
        let mut saw_speech = false;
        while let Some(frame) = src.next_frame() {
            if frame.speech {
                saw_speech = true;
            } else {
                saw_silence = true;
            }
        }
        assert!(saw_silence && saw_speech);
        assert!(src.next_frame().is_none());
    }

    #[test]
    fn mock_audio_frames_fit_earshot_vad_backend() {
        // Mock frames must be directly classifiable by the real Handy-derived
        // VAD: silence ⇒ noise, tone ⇒ speech (no device, no model).
        use soravo_audio::vad::{EarshotVad, VoiceActivityDetector};
        let mut vad = EarshotVad::new(0.5).expect("earshot constructs");
        let mut silent = MockAudioSource::silence(2);
        while let Some(frame) = silent.next_frame() {
            assert!(!vad.is_voice(&frame.samples).expect("vad runs"));
        }
        let mut tone = MockAudioSource::tone(8, 440.0, 0.5);
        let mut speech_votes = 0;
        while let Some(frame) = tone.next_frame() {
            if vad.is_voice(&frame.samples).expect("vad runs") {
                speech_votes += 1;
            }
        }
        assert!(speech_votes > 0, "tone must read as speech");
    }

    #[test]
    fn mock_engine_requires_initialize_first() {
        let mut engine = MockSpeechEngine::default();
        assert!(engine.process_audio(&[0.0; 256]).is_err());
        engine.initialize("mock://no-model", &config()).unwrap();
        assert!(engine.process_audio(&[0.0; 256]).is_ok());
    }

    #[test]
    fn mock_engine_emits_script_in_order_with_revisions() {
        let mut engine = MockSpeechEngine::tentative_then_final("hel", "hello world");
        engine.initialize("mock://no-model", &config()).unwrap();

        let first = &engine.process_audio(&[0.0; 256]).unwrap()[0];
        assert_eq!(first.text, "hel");
        assert!(!first.is_final);

        let second = &engine.process_audio(&[0.1; 256]).unwrap()[0];
        assert_eq!(second.text, "hello world");
        assert!(second.is_final);
        assert!(second.revision > first.revision);

        assert_eq!(engine.received_samples(), 512);
    }

    #[test]
    fn mock_engine_empty_script_yields_no_results() {
        let mut engine = MockSpeechEngine::default();
        engine.initialize("mock://no-model", &config()).unwrap();
        assert!(engine.process_audio(&[0.0; 256]).unwrap().is_empty());
        assert!(engine.finalize().unwrap().is_empty());
    }

    #[test]
    fn mock_engine_finalize_synthesizes_from_committed() {
        let mut engine = MockSpeechEngine::scripted(vec![MockScriptStep::Committed(
            "stable prefix".to_string(),
        )]);
        engine.initialize("mock://no-model", &config()).unwrap();
        engine.process_audio(&[0.0; 256]).unwrap();
        let finals = engine.finalize().unwrap();
        assert_eq!(finals.len(), 1);
        assert_eq!(finals[0].text, "stable prefix");
        assert!(finals[0].is_final);
        assert!(engine.is_finalized());
    }

    #[test]
    fn mock_engine_fail_step_fails_once() {
        let mut engine = MockSpeechEngine::scripted(vec![
            MockScriptStep::Fail("boom".to_string()),
            MockScriptStep::Final("recovered".to_string()),
        ]);
        engine.initialize("mock://no-model", &config()).unwrap();
        let err = engine.process_audio(&[0.0; 256]).unwrap_err();
        assert!(matches!(err, SpeechError::Inference(_)));
        let next = engine.process_audio(&[0.0; 256]).unwrap();
        assert_eq!(next[0].text, "recovered");
    }

    #[test]
    fn mock_engine_sticky_failure_blocks_finalize_until_cleared() {
        let mut engine = MockSpeechEngine::failing("mic gone");
        engine.initialize("mock://no-model", &config()).unwrap();
        assert!(engine.process_audio(&[0.0; 256]).is_err());
        assert!(engine.finalize().is_err());
        engine.clear_sticky_failure();
        assert!(engine.process_audio(&[0.0; 256]).unwrap().is_empty());
    }

    #[test]
    fn mock_engine_final_is_terminal_until_next_stream() {
        let mut engine = MockSpeechEngine::tentative_then_final("hel", "hello world");
        engine.initialize("mock://no-model", &config()).unwrap();
        assert_eq!(engine.process_audio(&[0.0; 256]).unwrap().len(), 1);
        assert_eq!(engine.process_audio(&[0.0; 256]).unwrap().len(), 1);
        // After the Final, the utterance is over: silence, and finalize is
        // a no-op (final output occurs exactly once).
        assert!(engine.process_audio(&[0.0; 256]).unwrap().is_empty());
        assert!(engine.finalize().unwrap().is_empty());
    }

    #[test]
    fn mock_engine_streaming_round_trip() {
        let mut engine = MockSpeechEngine::tentative_then_final("hel", "hello world");
        engine.initialize("mock://no-model", &config()).unwrap();
        assert!(engine.supports_streaming());
        let mut handle = engine.start_stream().unwrap();
        let updates = engine.feed_stream(&mut *handle, &[0.0; 256]).unwrap();
        assert_eq!(updates[0].tentative, "hel");
        let results = engine.finalize_stream(handle).unwrap();
        assert!(results[0].is_final);
    }
}
