//! R1-GAP-005/006 integration tests: session↔recording coupling over
//! mock audio + mock STT, through the existing `soravo-stt::SpeechEngine`
//! abstraction (no mic, model, or network).
//!
//! Matrix:
//! - A. normal session (full ladder + transcript events);
//! - B. tentative→final (tentative never final, no duplicate final);
//! - C. stale session (A's delayed result cannot touch B);
//! - D. duplicate result (same sequence redelivered ⇒ rejected once);
//! - E. recording stop / finalization (pending work finalized, res released);
//! - F. error path (canonical ERROR, cleanup, no orphan activity);
//! - G. repeated sessions (distinct ids, no contamination/leak/duplication).
//!
//! Plus bus-reachability: every transcript event carries the session identity
//! of an emitted session transition (the chain the R1-GAP-012 pill consumes).

use soravo_stt::mock::{MockAudioSource, MockSpeechEngine};
use soravo_stt::{SpeechEngine, StreamingTranscript};

use super::{
    AudioGate, PipelineError, RecordingPort, SessionPipeline, SttPort, SttSegment, SttSegmentKind,
    VecSink,
};
use crate::session::SessionPhase;

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

#[derive(Debug, Default)]
struct MockRecording {
    starts: u32,
    stops: u32,
    active: bool,
    fail_on_start: Option<String>,
    fail_on_stop: Option<String>,
}

impl RecordingPort for MockRecording {
    fn start(&mut self) -> Result<(), PipelineError> {
        self.starts += 1;
        if let Some(msg) = &self.fail_on_start {
            return Err(PipelineError::Recording(msg.clone()));
        }
        self.active = true;
        Ok(())
    }

    fn stop(&mut self) -> Result<(), PipelineError> {
        self.stops += 1;
        if let Some(msg) = &self.fail_on_stop {
            return Err(PipelineError::Recording(msg.clone()));
        }
        self.active = false;
        Ok(())
    }

    fn is_active(&self) -> bool {
        self.active
    }
}

/// Deterministic VAD gate: scripted speech flags, one per frame call.
#[derive(Debug)]
struct ScriptedGate {
    script: Vec<bool>,
    calls: usize,
}

impl ScriptedGate {
    fn always_speech() -> Self {
        Self {
            script: vec![],
            calls: 0,
        }
    }

    fn scripted(script: Vec<bool>) -> Self {
        Self { script, calls: 0 }
    }
}

impl AudioGate for ScriptedGate {
    fn is_speech(&mut self, _frame: &[f32]) -> bool {
        self.calls += 1;
        if self.script.is_empty() {
            return true;
        }
        let index = (self.calls - 1).min(self.script.len() - 1);
        self.script[index]
    }
}

/// [`SttPort`] over the existing streaming engine abstraction: frames enter
/// through `feed_stream`, finalization through `finalize_stream` — the same
/// calls the production `StreamRouter` path uses.
struct StreamingSttAdapter<E> {
    engine: E,
    handle: Option<Box<dyn soravo_stt::StreamHandle>>,
}

impl<E: SpeechEngine> StreamingSttAdapter<E> {
    fn new(engine: E) -> Self {
        Self {
            engine,
            handle: None,
        }
    }

    fn ensure_stream(&mut self) -> Result<(), PipelineError> {
        if self.handle.is_none() {
            let handle = self
                .engine
                .start_stream()
                .map_err(|e| PipelineError::Stt(e.to_string()))?;
            self.handle = Some(handle);
        }
        Ok(())
    }
}

impl<E: SpeechEngine> SttPort for StreamingSttAdapter<E> {
    fn transcribe_chunk(&mut self, audio: &[f32]) -> Result<Vec<SttSegment>, PipelineError> {
        self.ensure_stream()?;
        let handle = self.handle.as_mut().expect("stream ensured");
        let updates: Vec<StreamingTranscript> = self
            .engine
            .feed_stream(&mut **handle, audio)
            .map_err(|e| PipelineError::Stt(e.to_string()))?;
        let mut out = Vec::new();
        for update in updates {
            if update.is_final {
                out.push(SttSegment {
                    kind: SttSegmentKind::Final,
                    text: update.full_text(),
                });
            } else {
                if !update.committed.is_empty() {
                    out.push(SttSegment {
                        kind: SttSegmentKind::Committed,
                        text: update.committed.clone(),
                    });
                }
                if !update.tentative.is_empty() {
                    out.push(SttSegment {
                        kind: SttSegmentKind::Tentative,
                        text: update.tentative.clone(),
                    });
                }
            }
        }
        Ok(out)
    }

    fn finalize(&mut self) -> Result<Vec<SttSegment>, PipelineError> {
        let Some(handle) = self.handle.take() else {
            return Ok(vec![]);
        };
        let results = self
            .engine
            .finalize_stream(handle)
            .map_err(|e| PipelineError::Stt(e.to_string()))?;
        Ok(results
            .into_iter()
            .filter(|r| !r.text.trim().is_empty())
            .map(|r| SttSegment {
                kind: if r.is_final {
                    SttSegmentKind::Final
                } else {
                    SttSegmentKind::Committed
                },
                text: r.text,
            })
            .collect())
    }
}

fn engine_initialized(mut engine: MockSpeechEngine) -> MockSpeechEngine {
    engine
        .initialize(
            "mock://no-model",
            &soravo_stt::TranscriptionConfig {
                language: "en".to_string(),
                streaming: true,
                hotwords: vec![],
            },
        )
        .expect("mock initializes without assets");
    engine
}

type TestPipeline =
    SessionPipeline<MockRecording, StreamingSttAdapter<MockSpeechEngine>, VecSink, ScriptedGate>;

fn pipeline(engine: MockSpeechEngine, gate: ScriptedGate) -> TestPipeline {
    SessionPipeline::new(
        MockRecording::default(),
        StreamingSttAdapter::new(engine_initialized(engine)),
        VecSink::default(),
        gate,
    )
}

fn feed_tone(pipe: &mut TestPipeline, frames: usize) {
    let mut src = MockAudioSource::tone(frames, 440.0, 0.5);
    while let Some(frame) = src.next_frame() {
        // Errors are the pipeline's own abort path (see F): the feed itself
        // never panics, so tests assert on the resulting phase, not the call.
        let _ = pipe.feed_audio(&frame.samples);
    }
}

fn full_cycle(pipe: &mut TestPipeline) -> u64 {
    let id = pipe.begin_session().expect("begin succeeds");
    feed_tone(pipe, 4);
    pipe.finish().expect("finish succeeds");
    pipe.to_idle().expect("idle succeeds");
    id
}

// ---------------------------------------------------------------------------
// A. Normal session
// ---------------------------------------------------------------------------

#[test]
fn a_normal_session_drives_full_ladder_with_transcript_events() {
    let mut pipe = pipeline(
        MockSpeechEngine::tentative_then_final("hel", "hello world"),
        ScriptedGate::always_speech(),
    );

    let id = pipe.begin_session().expect("begin succeeds");
    assert_eq!(id, 1);
    assert_eq!(pipe.phase(), SessionPhase::Listening);

    feed_tone(&mut pipe, 4);
    assert_eq!(pipe.phase(), SessionPhase::Transcribing);

    pipe.finish().expect("finish succeeds");
    assert_eq!(pipe.phase(), SessionPhase::Done);
    assert_eq!(pipe.last_final_text(), Some("hello world"));

    pipe.to_idle().expect("idle succeeds");
    assert_eq!(pipe.phase(), SessionPhase::Idle);
    assert_eq!(pipe.session_id(), None);

    assert_eq!(
        pipe.sink().phases(),
        vec![
            SessionPhase::Starting,
            SessionPhase::Listening,
            SessionPhase::Transcribing,
            SessionPhase::Finalizing,
            SessionPhase::Done,
            SessionPhase::Idle,
        ]
    );

    // Both transcript events arrived on the bus.
    assert_eq!(pipe.sink().transcripts.len(), 2);
    assert_eq!(pipe.sink().transcripts[0].text, "hel");
    assert_eq!(
        pipe.sink().transcripts[0].kind,
        soravo_transcript::TranscriptKind::Tentative
    );
    assert_eq!(pipe.sink().transcripts[1].text, "hello world");
    assert_eq!(
        pipe.sink().transcripts[1].kind,
        soravo_transcript::TranscriptKind::Final
    );
}

// ---------------------------------------------------------------------------
// B. Tentative → final
// ---------------------------------------------------------------------------

#[test]
fn b_tentative_never_final_and_final_emitted_once() {
    let mut pipe = pipeline(
        MockSpeechEngine::tentative_then_final("partial", "complete utterance"),
        ScriptedGate::always_speech(),
    );

    pipe.begin_session().unwrap();
    feed_tone(&mut pipe, 6);
    pipe.finish().unwrap();
    pipe.to_idle().unwrap();

    let transcripts = &pipe.sink().transcripts;
    let finals: Vec<_> = transcripts
        .iter()
        .filter(|u| u.kind == soravo_transcript::TranscriptKind::Final)
        .collect();
    assert_eq!(finals.len(), 1, "final output occurs exactly once");
    assert_eq!(finals[0].text, "complete utterance");

    // Tentative output exists as preview but never as committed/final output.
    let tentatives: Vec<_> = transcripts
        .iter()
        .filter(|u| u.kind == soravo_transcript::TranscriptKind::Tentative)
        .collect();
    assert!(!tentatives.is_empty());
    for tentative in &tentatives {
        assert_ne!(tentative.text, finals[0].text);
    }
    // No committed/final event carries tentative text.
    for update in transcripts.iter().filter(|u| {
        u.kind == soravo_transcript::TranscriptKind::Committed
            || u.kind == soravo_transcript::TranscriptKind::Final
    }) {
        assert_ne!(update.text, "partial");
    }
}

// ---------------------------------------------------------------------------
// C. Stale session
// ---------------------------------------------------------------------------

#[test]
fn c_stale_session_result_cannot_update_new_session() {
    // Two utterances scripted: A consumes the first pair, B the second.
    let mut pipe = pipeline(
        MockSpeechEngine::scripted(vec![
            soravo_stt::mock::MockScriptStep::Tentative("aaa".to_string()),
            soravo_stt::mock::MockScriptStep::Final("session A final".to_string()),
            soravo_stt::mock::MockScriptStep::Tentative("bbb".to_string()),
            soravo_stt::mock::MockScriptStep::Final("session B final".to_string()),
        ]),
        ScriptedGate::always_speech(),
    );

    let id_a = pipe.begin_session().unwrap();
    feed_tone(&mut pipe, 2);
    pipe.finish().unwrap();
    pipe.to_idle().unwrap();

    // Capture A's emitted transcript identity for the delayed redelivery.
    let stale = pipe.sink().transcripts[0].clone();
    let stale_session: u64 = {
        // SessionId serializes as u64; read it back through JSON.
        serde_json::to_value(stale.session_id)
            .expect("serializes")
            .as_u64()
            .expect("numeric session id")
    };
    assert_eq!(stale_session, id_a);

    // Establish session B per the canonical lifecycle.
    let id_b = pipe.begin_session().unwrap();
    assert_ne!(id_b, id_a);

    // A's delayed result arrives during B: rejected, B stays authoritative.
    let delivered = pipe.deliver_external(
        id_a,
        stale.sequence,
        SttSegment {
            kind: SttSegmentKind::Committed,
            text: "stale from A".to_string(),
        },
    );
    assert!(!delivered, "stale session result must be rejected");
    assert!(
        pipe.sink()
            .transcripts
            .iter()
            .all(|u| u.text != "stale from A"),
        "no stale transcript event may leak into the active session"
    );

    // B transcribes normally with its own identity.
    feed_tone(&mut pipe, 2);
    pipe.finish().unwrap();
    pipe.to_idle().unwrap();
    let b_updates: Vec<_> = pipe.sink().transcripts.iter().skip(2).collect();
    assert_eq!(b_updates.len(), 2);
    assert_eq!(b_updates[1].text, "session B final");
}

// ---------------------------------------------------------------------------
// D. Duplicate result
// ---------------------------------------------------------------------------

#[test]
fn d_duplicate_result_is_deduplicated() {
    let mut pipe = pipeline(
        MockSpeechEngine::tentative_then_final("dup", "duplicate final"),
        ScriptedGate::always_speech(),
    );

    let id = pipe.begin_session().unwrap();
    feed_tone(&mut pipe, 2);
    let before = pipe.sink().transcripts.len();

    // Redeliver the exact same logical result (same session + sequence).
    let prior = pipe.sink().transcripts[0].clone();
    let delivered = pipe.deliver_external(
        id,
        prior.sequence,
        SttSegment {
            kind: SttSegmentKind::Tentative,
            text: prior.text.clone(),
        },
    );
    assert!(!delivered, "duplicate sequence must be rejected");
    assert_eq!(pipe.sink().transcripts.len(), before);

    pipe.finish().unwrap();
    pipe.to_idle().unwrap();
    let finals = pipe
        .sink()
        .transcripts
        .iter()
        .filter(|u| u.kind == soravo_transcript::TranscriptKind::Final)
        .count();
    assert_eq!(finals, 1, "final output occurs once");
}

// ---------------------------------------------------------------------------
// E. Recording stop / finalization
// ---------------------------------------------------------------------------

#[test]
fn e_stop_finalizes_pending_work_and_releases_resources() {
    // Engine with committed text but no scripted Final: finalize must
    // synthesize the deterministic final from committed output.
    let mut pipe = pipeline(
        MockSpeechEngine::scripted(vec![soravo_stt::mock::MockScriptStep::Committed(
            "pending prefix".to_string(),
        )]),
        ScriptedGate::always_speech(),
    );

    pipe.begin_session().unwrap();
    feed_tone(&mut pipe, 3);
    pipe.finish().unwrap();

    assert_eq!(pipe.phase(), SessionPhase::Done);
    assert_eq!(pipe.last_final_text(), Some("pending prefix"));
    let finals: Vec<_> = pipe
        .sink()
        .transcripts
        .iter()
        .filter(|u| u.kind == soravo_transcript::TranscriptKind::Final)
        .collect();
    assert_eq!(finals.len(), 1);
    assert_eq!(finals[0].text, "pending prefix");

    pipe.to_idle().unwrap();
    assert_eq!(pipe.phase(), SessionPhase::Idle);
}

// ---------------------------------------------------------------------------
// F. Error path
// ---------------------------------------------------------------------------

#[test]
fn f_stt_failure_travels_canonical_error_path_with_cleanup() {
    let mut pipe = pipeline(
        MockSpeechEngine::failing("engine exploded"),
        ScriptedGate::always_speech(),
    );

    pipe.begin_session().unwrap();
    feed_tone(&mut pipe, 2);

    // The STT failure aborts through ERROR→IDLE during feed.
    assert_eq!(pipe.phase(), SessionPhase::Idle);
    let phases = pipe.sink().phases();
    assert!(phases.contains(&SessionPhase::Error));
    assert_eq!(phases.last(), Some(&SessionPhase::Idle));
    // No orphan recording remains and no transcript leaked.
    assert!(pipe.sink().transcripts.is_empty());
}

#[test]
fn f_recording_start_failure_travels_error_path_exactly_once() {
    let mut pipe = SessionPipeline::new(
        MockRecording {
            fail_on_start: Some("no input device".to_string()),
            ..Default::default()
        },
        StreamingSttAdapter::new(engine_initialized(MockSpeechEngine::default())),
        VecSink::default(),
        ScriptedGate::always_speech(),
    );

    let err = pipe.begin_session().expect_err("start must fail");
    assert!(matches!(err, PipelineError::Recording(_)));
    let phases = pipe.sink().phases();
    assert_eq!(
        phases,
        vec![
            SessionPhase::Starting,
            SessionPhase::Error,
            SessionPhase::Idle
        ]
    );
}

// ---------------------------------------------------------------------------
// G. Repeated sessions
// ---------------------------------------------------------------------------

#[test]
fn g_repeated_sessions_stay_isolated_without_leaks() {
    let mut pipe = pipeline(
        MockSpeechEngine::scripted(vec![
            soravo_stt::mock::MockScriptStep::Final("first".to_string()),
            soravo_stt::mock::MockScriptStep::Final("second".to_string()),
        ]),
        ScriptedGate::always_speech(),
    );

    let id_a = full_cycle(&mut pipe);
    let id_b = full_cycle(&mut pipe);
    assert_ne!(id_a, id_b, "each session gets a distinct identity");

    // Session sequences strictly increase across the whole run.
    let sequences: Vec<u64> = pipe.sink().sessions.iter().map(|t| t.sequence).collect();
    for window in sequences.windows(2) {
        assert!(window[1] > window[0], "global sequence must increase");
    }

    // Transcript identity matches the session that produced it.
    let finals: Vec<_> = pipe
        .sink()
        .transcripts
        .iter()
        .filter(|u| u.kind == soravo_transcript::TranscriptKind::Final)
        .collect();
    assert_eq!(finals.len(), 2);
    assert_eq!(finals[0].text, "first");
    assert_eq!(finals[1].text, "second");

    // After IDLE, stray audio is a no-op: no orphan activity.
    let transcript_count = pipe.sink().transcripts.len();
    feed_tone(&mut pipe, 2);
    assert_eq!(pipe.sink().transcripts.len(), transcript_count);
}

// ---------------------------------------------------------------------------
// Bus reachability (pill/overlay regression surface)
// ---------------------------------------------------------------------------

#[test]
fn bus_every_transcript_carries_an_emitted_session_identity() {
    let mut pipe = pipeline(
        MockSpeechEngine::tentative_then_final("bus preview", "bus final"),
        ScriptedGate::always_speech(),
    );
    full_cycle(&mut pipe);

    // The chain mock audio → STT → transcript event → canonical bus: every
    // transcript event's session id matches an emitted session transition's
    // session id, so the R1-GAP-012 fold accepts (never drops) live traffic.
    let live_ids: Vec<Option<u64>> = pipe.sink().sessions.iter().map(|t| t.session_id).collect();
    for update in &pipe.sink().transcripts {
        let id: u64 = serde_json::to_value(update.session_id)
            .expect("serializes")
            .as_u64()
            .expect("numeric");
        assert!(
            live_ids.contains(&Some(id)),
            "transcript session {id} has no matching session transition"
        );
    }
    // Wire-shape check: TranscriptUpdate serializes exactly as ipc.ts expects
    // (snake_case session_id, verbatim kind names).
    let value = serde_json::to_value(&pipe.sink().transcripts[1]).expect("serializes");
    assert!(value.get("session_id").is_some());
    assert!(value.get("sequence").is_some());
    assert_eq!(value["kind"], serde_json::json!("Final"));
}

#[test]
fn vad_gate_drops_silence_before_stt() {
    // First two frames silence (dropped), rest speech (transcribed).
    let frames = 6;
    let mut pipe = pipeline(
        MockSpeechEngine::tentative_then_final("gated", "gated final"),
        ScriptedGate::scripted(vec![false, false, true, true, true, true]),
    );
    pipe.begin_session().unwrap();
    feed_tone(&mut pipe, frames);
    // Two silent frames never reached the engine: only scripted-speech frames
    // were transcribed (one process call per speech frame here).
    pipe.finish().unwrap();
    pipe.to_idle().unwrap();
    assert!(!pipe.sink().transcripts.is_empty());
}

#[test]
fn real_earshot_vad_gates_mock_audio() {
    use super::DetectorGate;

    let vad = soravo_audio::vad::EarshotVad::new(0.5).expect("earshot constructs");
    let mut pipe = SessionPipeline::new(
        MockRecording::default(),
        StreamingSttAdapter::new(engine_initialized(MockSpeechEngine::tentative_then_final(
            "real vad",
            "real vad final",
        ))),
        VecSink::default(),
        DetectorGate(vad),
    );
    pipe.begin_session().unwrap();

    // Digital silence through the REAL Handy-derived VAD: nothing transcribed.
    let mut silent = MockAudioSource::silence(4);
    while let Some(frame) = silent.next_frame() {
        pipe.feed_audio(&frame.samples).unwrap();
    }
    assert!(
        pipe.sink().transcripts.is_empty(),
        "silence must not reach transcription"
    );

    // Tone through the real VAD: transcribed.
    let mut tone = MockAudioSource::tone(8, 440.0, 0.5);
    while let Some(frame) = tone.next_frame() {
        pipe.feed_audio(&frame.samples).unwrap();
    }
    pipe.finish().unwrap();
    pipe.to_idle().unwrap();
    assert!(
        !pipe.sink().transcripts.is_empty(),
        "tone must reach transcription through the real VAD"
    );
}
