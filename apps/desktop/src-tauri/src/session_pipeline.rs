//! R1-GAP-005/006 — deterministic session↔recording coupling.
//!
//! Reused contracts (nothing reinvented, no second lifecycle):
//! - [`crate::session::SessionMachine`] — the canonical session lifecycle
//!   (`IDLE → STARTING → LISTENING → TRANSCRIBING → FINALIZING → DONE → IDLE`,
//!   `ANY → ERROR → IDLE`). The orchestrator below is the ONLY driver of the
//!   machine for a recording session; recording never invents its own states.
//! - `soravo-transcript::{TranscriptUpdate, TranscriptKind, TranscriptOrder,
//!   TranscriptState}` — tentative/committed/final semantics, ordering, and
//!   stale/duplicate rejection. Emission goes through these gates, so tentative
//!   output can never become final and stale/duplicated finals never re-emit.
//! - `soravo-audio` VAD (`VoiceActivityDetector`) — the Handy-derived audio
//!   path. The pipeline classifies frames through [`AudioGate`]; production
//!   uses the real detector, tests use scripted gates plus one real-`EarshotVad`
//!   conformance test.
//! - `soravo-stt::SpeechEngine` — the existing STT abstraction. Tests drive the
//!   pipeline through [`StreamingSttAdapter`], so mock audio/STT prove the path
//!   through the production engine interface (no mic, model, or network).
//!
//! Production wiring: [`announce_transition`], [`emit_transcript_final`], and
//! [`reset_session`] are the granular helpers `actions.rs` calls at its
//! existing lifecycle points (start ok / stop begins / transcription done /
//! cancel / error). They drive the SAME ladder the orchestrator pins, so the
//! integration tests below are the contract proof for the live path.
//!
//! `TRANSCRIPT_UPDATE_EVENT` (`transcript://update`) is the producer-side
//! constant matching the `ipc.ts` consumer contract established by R1-GAP-012.
//! It follows the existing `session://changed` URI-scheme convention; no new
//! payload contract is introduced (payload is verbatim `TranscriptUpdate`).

use std::sync::Mutex;

use soravo_transcript::{
    SessionId, TranscriptKind, TranscriptOrder, TranscriptState, TranscriptUpdate,
};

use crate::events::{SessionChangedPayload, SESSION_CHANGED_EVENT};
use crate::session::{SessionMachine, SessionPhase, SessionTransition};

/// Typed transcript-update channel on the existing Tauri event bus.
/// Matches `TRANSCRIPT_UPDATE_EVENT` in `apps/desktop/src/ipc.ts` (R1-GAP-012).
pub const TRANSCRIPT_UPDATE_EVENT: &str = "transcript://update";

/// Backend-sized audio frame used across the pipeline (16 kHz mono).
/// Matches the Handy-derived `EarshotVad` backend (`EARSHOT_FRAME_SAMPLES`).
pub const PIPELINE_FRAME_SAMPLES: usize = 256;

// ---------------------------------------------------------------------------
// Ports (narrow seams; production adapters live at the call sites)
// ---------------------------------------------------------------------------

/// Narrow recording seam: start/stop/is-active. Production drives the real
/// `AudioRecordingManager` directly (see `actions.rs`); the orchestrator and
/// its tests use this seam so start/stop exactness is provable without a mic.
pub trait RecordingPort {
    fn start(&mut self) -> Result<(), PipelineError>;
    fn stop(&mut self) -> Result<(), PipelineError>;
    fn is_active(&self) -> bool;
}

/// One STT output segment before canonical identity is stamped.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SttSegment {
    pub kind: SttSegmentKind,
    pub text: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SttSegmentKind {
    Tentative,
    Committed,
    Final,
}

/// Narrow STT seam: chunk transcription + finalization. Identity stamping
/// happens in the pipeline (the highest layer owning session identity), never
/// in the engine.
pub trait SttPort {
    fn transcribe_chunk(&mut self, audio: &[f32]) -> Result<Vec<SttSegment>, PipelineError>;
    fn finalize(&mut self) -> Result<Vec<SttSegment>, PipelineError>;
}

/// Narrow VAD seam: speech/non-speech per backend-sized frame.
pub trait AudioGate {
    fn is_speech(&mut self, frame: &[f32]) -> bool;
}

/// [`AudioGate`] over the real Handy-derived detector.
pub struct DetectorGate<V>(pub V);

impl<V: soravo_audio::vad::VoiceActivityDetector> AudioGate for DetectorGate<V> {
    fn is_speech(&mut self, frame: &[f32]) -> bool {
        self.0.is_voice(frame).unwrap_or(false)
    }
}

/// Event sink: session transitions + transcript updates. Production emits on
/// the Tauri bus (R1-GAP-012 consumers); tests record into [`VecSink`].
pub trait EventSink {
    fn emit_session(&mut self, transition: &SessionTransition);
    fn emit_transcript(&mut self, update: &TranscriptUpdate);
}

/// In-memory sink for deterministic tests.
#[derive(Debug, Default)]
pub struct VecSink {
    pub sessions: Vec<SessionTransition>,
    pub transcripts: Vec<TranscriptUpdate>,
}

impl EventSink for VecSink {
    fn emit_session(&mut self, transition: &SessionTransition) {
        self.sessions.push(transition.clone());
    }

    fn emit_transcript(&mut self, update: &TranscriptUpdate) {
        self.transcripts.push(update.clone());
    }
}

impl VecSink {
    pub fn phases(&self) -> Vec<SessionPhase> {
        self.sessions.iter().map(|t| t.phase).collect()
    }
}

/// Coupling failure: recording/STT errors travel the canonical ERROR path.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PipelineError {
    Recording(String),
    Stt(String),
    Session(String),
}

impl std::fmt::Display for PipelineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Recording(msg) => write!(f, "recording: {msg}"),
            Self::Stt(msg) => write!(f, "stt: {msg}"),
            Self::Session(msg) => write!(f, "session: {msg}"),
        }
    }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/// Deterministic session↔recording coupling over the canonical machine.
///
/// Lifecycle (every transition emitted to the sink):
/// `begin_session` (IDLE→STARTING→LISTENING, recording starts exactly once)
/// → `feed_audio` (first STT output moves LISTENING→TRANSCRIBING; transcript
/// events carry the session id) → `finish` (FINALIZING, pending work
/// finalized, recording stopped, DONE) → `to_idle` (DONE→IDLE, resources
/// released). Any failure → `abort` (ERROR→IDLE, resources cleaned).
pub struct SessionPipeline<R, S, E, V> {
    machine: SessionMachine,
    order: Option<TranscriptOrder>,
    state: Option<TranscriptState>,
    recording: R,
    stt: S,
    sink: E,
    gate: V,
    pending_frame: Vec<f32>,
    transcript_seq: u64,
    recording_active: bool,
    last_final_text: Option<String>,
}

impl<R, S, E, V> SessionPipeline<R, S, E, V>
where
    R: RecordingPort,
    S: SttPort,
    E: EventSink,
    V: AudioGate,
{
    pub fn new(recording: R, stt: S, sink: E, gate: V) -> Self {
        Self {
            machine: SessionMachine::default(),
            order: None,
            state: None,
            recording,
            stt,
            sink,
            gate,
            pending_frame: Vec::new(),
            transcript_seq: 0,
            recording_active: false,
            last_final_text: None,
        }
    }

    pub fn phase(&self) -> SessionPhase {
        self.machine.phase()
    }

    pub fn session_id(&self) -> Option<u64> {
        self.machine.session_id()
    }

    pub fn sink(&self) -> &E {
        &self.sink
    }

    pub fn last_final_text(&self) -> Option<&str> {
        self.last_final_text.as_deref()
    }

    fn emit(&mut self, phase: SessionPhase) -> Result<(), PipelineError> {
        let transition = self
            .machine
            .try_transition(phase)
            .map_err(|e| PipelineError::Session(format!("{:?} → {:?} rejected", e.from, e.to)))?;
        self.sink.emit_session(&transition);
        Ok(())
    }

    /// STARTING (new session id, recording starts exactly once) → LISTENING.
    pub fn begin_session(&mut self) -> Result<u64, PipelineError> {
        self.emit(SessionPhase::Starting)?;
        let id = self.machine.session_id().ok_or_else(|| {
            PipelineError::Session("STARTING must allocate a session id".to_string())
        })?;
        if let Err(e) = self.recording.start() {
            self.abort_inner();
            return Err(e);
        }
        self.recording_active = true;
        self.order = Some(TranscriptOrder::new(SessionId::new(id)));
        self.state = Some(TranscriptState::new(SessionId::new(id)));
        self.transcript_seq = 0;
        self.emit(SessionPhase::Listening)?;
        Ok(id)
    }

    /// Feed raw 16 kHz samples: chunk into backend frames, gate through VAD,
    /// transcribe speech, emit transcript events with session identity.
    /// The first accepted STT output moves LISTENING→TRANSCRIBING.
    pub fn feed_audio(&mut self, audio: &[f32]) -> Result<(), PipelineError> {
        if !self.recording_active {
            return Ok(());
        }
        self.pending_frame.extend_from_slice(audio);
        let mut speech_frames: Vec<f32> = Vec::new();
        while self.pending_frame.len() >= PIPELINE_FRAME_SAMPLES {
            let frame: Vec<f32> = self.pending_frame.drain(..PIPELINE_FRAME_SAMPLES).collect();
            if self.gate.is_speech(&frame) {
                speech_frames.extend_from_slice(&frame);
            }
        }
        if speech_frames.is_empty() {
            return Ok(());
        }
        let segments = self
            .stt
            .transcribe_chunk(&speech_frames)
            .inspect_err(|_| self.abort_inner())?;
        for segment in segments {
            self.publish(segment)?;
        }
        Ok(())
    }

    /// Deliver one externally-produced segment (e.g. a delayed callback).
    /// Results that are not current for this machine are rejected: a stale
    /// session can never update the active session.
    pub fn deliver_external(
        &mut self,
        session_id: u64,
        sequence: u64,
        segment: SttSegment,
    ) -> bool {
        if !self.machine.is_current(session_id, sequence) {
            return false;
        }
        if self.session_id() != Some(session_id) {
            return false;
        }
        self.publish_at(session_id, sequence, segment)
    }

    fn publish(&mut self, segment: SttSegment) -> Result<(), PipelineError> {
        let id = self.session_id().ok_or_else(|| {
            PipelineError::Session("no active session for transcript output".to_string())
        })?;
        self.transcript_seq += 1;
        let seq = self.transcript_seq;
        if self.publish_at(id, seq, segment) && self.phase() == SessionPhase::Listening {
            self.emit(SessionPhase::Transcribing)?;
        }
        Ok(())
    }

    /// Gate one segment through ordering + stabilization; emit iff accepted.
    /// Returns `true` when the update was emitted.
    fn publish_at(&mut self, session_id: u64, sequence: u64, segment: SttSegment) -> bool {
        let kind = match segment.kind {
            SttSegmentKind::Tentative => TranscriptKind::Tentative,
            SttSegmentKind::Committed => TranscriptKind::Committed,
            SttSegmentKind::Final => TranscriptKind::Final,
        };
        let update = TranscriptUpdate {
            session_id: SessionId::new(session_id),
            sequence,
            kind,
            text: segment.text,
        };
        let order = match self.order.as_mut() {
            Some(order) => order,
            None => return false,
        };
        if !order.accept(&update) {
            return false;
        }
        // Stabilization: tentative is preview-only (never injectable); a
        // committed/final that the state rejects is a duplicate and must not
        // re-emit.
        let injectable = self
            .state
            .as_mut()
            .map(|state| state.update(update.clone()))
            .unwrap_or(None);
        let emit = match update.kind {
            TranscriptKind::Tentative => true,
            TranscriptKind::Committed | TranscriptKind::Final => injectable.is_some(),
        };
        if !emit {
            return false;
        }
        if update.kind == TranscriptKind::Final {
            self.last_final_text = Some(update.text.clone());
        }
        self.sink.emit_transcript(&update);
        true
    }

    /// FINALIZING (pending work finalized, recording stopped) → DONE.
    /// The final transcript is retained and emitted exactly once.
    pub fn finish(&mut self) -> Result<(), PipelineError> {
        if self.phase() == SessionPhase::Listening || self.phase() == SessionPhase::Transcribing {
            self.emit(SessionPhase::Finalizing)?;
        } else {
            return Ok(());
        }
        let segments = self.stt.finalize().inspect_err(|_| self.abort_inner())?;
        for segment in segments {
            // A duplicated final (same sequence redelivered by finalize) is
            // rejected by the ordering gate: final output occurs once.
            self.publish(segment)?;
        }
        if self.recording_active {
            if let Err(e) = self.recording.stop() {
                self.abort_inner();
                return Err(e);
            }
            self.recording_active = false;
        }
        self.emit(SessionPhase::Done)?;
        Ok(())
    }

    /// DONE→IDLE: no active recording remains, no stale session emits.
    pub fn to_idle(&mut self) -> Result<(), PipelineError> {
        if self.phase() == SessionPhase::Done {
            self.emit(SessionPhase::Idle)?;
            self.order = None;
            self.state = None;
        }
        Ok(())
    }

    /// Canonical error path: ERROR→IDLE with resources cleaned up.
    pub fn abort(&mut self) {
        self.abort_inner();
    }

    fn abort_inner(&mut self) {
        if self.recording_active {
            let _ = self.recording.stop();
            self.recording_active = false;
        }
        if self.phase() != SessionPhase::Idle && self.phase() != SessionPhase::Error {
            let _ = self.emit(SessionPhase::Error);
        }
        if self.phase() == SessionPhase::Error {
            let _ = self.emit(SessionPhase::Idle);
        }
        self.order = None;
        self.state = None;
    }
}

// ---------------------------------------------------------------------------
// Production helpers (called by actions.rs at its existing lifecycle points)
// ---------------------------------------------------------------------------

/// Drive one validated transition on the shared machine and broadcast it on
/// `session://changed`. Invalid edges (e.g. a duplicate STARTING while a
/// session is already active) are ignored — never fatal to recording.
pub mod production {
    use super::*;
    use tauri::{Emitter, Manager};

    pub fn announce_transition(app: &tauri::AppHandle, target: SessionPhase) {
        let transition = app
            .state::<Mutex<SessionMachine>>()
            .lock()
            .map(|mut machine| machine.try_transition(target).ok())
            .ok()
            .flatten();
        if let Some(transition) = transition {
            let _ = app.emit(
                SESSION_CHANGED_EVENT,
                SessionChangedPayload::new(&transition),
            );
        }
    }

    /// Emit one canonical Final transcript update on `transcript://update`.
    /// Only committed/final text travels this path (never tentative).
    pub fn emit_transcript_final(app: &tauri::AppHandle, session_id: u64, text: &str) {
        let sequence = app
            .state::<Mutex<SessionMachine>>()
            .lock()
            .map(|machine| machine.sequence())
            .unwrap_or(0);
        let _ = app.emit(
            TRANSCRIPT_UPDATE_EVENT,
            TranscriptUpdate {
                session_id: SessionId::new(session_id),
                sequence,
                kind: TranscriptKind::Final,
                text: text.to_string(),
            },
        );
    }

    /// Current session id, if a session is in flight.
    pub fn current_session_id(app: &tauri::AppHandle) -> Option<u64> {
        app.state::<Mutex<SessionMachine>>()
            .lock()
            .map(|machine| machine.session_id())
            .unwrap_or(None)
    }

    /// Current canonical phase (defaults to IDLE when state is unavailable).
    pub fn session_phase(app: &tauri::AppHandle) -> SessionPhase {
        app.state::<Mutex<SessionMachine>>()
            .lock()
            .map(|machine| machine.phase())
            .unwrap_or(SessionPhase::Idle)
    }

    /// Transcription output is ready: FINALIZING + one canonical Final emit.
    /// Only committed/final text travels this path (never tentative); empty
    /// output still advances finalization so the session cannot wedge.
    pub fn announce_transcription_finalized(app: &tauri::AppHandle, text: &str) {
        announce_transition(app, SessionPhase::Finalizing);
        if let Some(id) = current_session_id(app) {
            if !text.trim().is_empty() {
                emit_transcript_final(app, id, text);
            }
        }
    }

    /// Successful terminal: DONE exactly once, then IDLE (resources released).
    /// Each edge is validated; stale calls are ignored, never duplicated.
    pub fn announce_completion(app: &tauri::AppHandle) {
        announce_transition(app, SessionPhase::Done);
        announce_transition(app, SessionPhase::Idle);
    }

    /// Failure terminal: ERROR→IDLE with no phantom session. No-op when no
    /// session is active, so a failed start from IDLE stays silent.
    pub fn fail_active_session(app: &tauri::AppHandle) {
        if session_phase(app) != SessionPhase::Idle {
            announce_transition(app, SessionPhase::Error);
            announce_transition(app, SessionPhase::Idle);
        }
    }

    /// Imperative return to IDLE (cancel paths): no stale session may emit.
    pub fn reset_session(app: &tauri::AppHandle) {
        let transition = app
            .state::<Mutex<SessionMachine>>()
            .lock()
            .map(|mut machine| machine.reset())
            .unwrap_or_else(|_| SessionTransition {
                session_id: None,
                sequence: 0,
                phase: SessionPhase::Idle,
                timestamp_ms: 0,
            });
        let _ = app.emit(
            SESSION_CHANGED_EVENT,
            SessionChangedPayload::new(&transition),
        );
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
#[path = "session_pipeline_tests.rs"]
mod tests;
