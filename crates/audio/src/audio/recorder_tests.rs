//! R1-GAP-007 / R1-GAP-009 — Earshot-path recording tests.
//!
//! Authoritative scope (T34-AI fresh R1 re-audit, 2026-10-06):
//! - R1-GAP-007 "mic capture/device/format (cpal)", class IMPLEMENTED+NOT
//!   VERIFIED — the capture/format/framing machinery (`AudioRecorder`,
//!   `CaptureProcessor`, `FrameResampler`, `run_consumer`) exists but its
//!   behavior was unproven.
//! - R1-GAP-009 "silence/recording-lifecycle/cleanup", class IMPLEMENTED+NOT
//!   VERIFIED — silence handling, the recording lifecycle, and cleanup exist
//!   but were unproven on the Earshot path.
//! - Executable-now item: "007/009 Earshot-path recording tests".
//!
//! "Earshot-path" means the `VadBackend::Earshot` production wiring in
//! `managers/audio.rs::create_audio_recorder` — `EarshotVad(0.5)` inside
//! `SmoothedVad` with `frames_for_duration_ms` timing conversions, feeding
//! `AudioRecorder::with_vad` — the non-default backend that needs no model
//! asset. The default Silero backend is untouched: its `.onnx` asset is absent
//! (R1-GAP-008 BLOCKED) and must never be fabricated.
//!
//! Session start/stop, STT handoff, and finalization are OUT OF SCOPE here:
//! R1-GAP-005/006 already verifies them through `SessionPipeline` with mock
//! STT. This module proves the layer below: deterministic audio in,
//! VAD-gated frames out, lifecycle exactness. No production file is touched
//! (V1 Handy-core preservation holds trivially).
//!
//! Handy reuse (pin `ba10ce19`, verified live via authenticated `gh`):
//! - Part A ADOPTS 7 tests verbatim from upstream
//!   `src-tauri/src/audio_toolkit/audio/recorder/tests.rs` — the exact tests
//!   the Soravo migration dropped (Soravo kept the other half). The exercised
//!   paths (`run_consumer`, `CaptureProcessor`, `drain_available_samples`,
//!   `write_input_to_ring`, error classifiers) are behavior-identical;
//!   `earshot.rs` / `smoothed.rs` differ from the pin by comments only.
//!   Classification: HANDY-REUSE.
//! - Part B is SORAVO-NEW: the production Earshot composition has no upstream
//!   test (upstream tests cover scripted detectors only).
//!
//! Mock reuse: R1-GAP-028 doubles are browser-harness TypeScript doubles — not
//! applicable to Rust capture tests (recorded determination, not an omission).
//! R1-GAP-005/006 `MockAudioSource` tone/silence semantics ARE reused: 16 kHz
//! mono, 256-sample frames, 440 Hz / 0.5-peak sine (proven speech at the 0.5
//! Earshot threshold) and digital silence (proven noise). They are synthesized
//! locally instead of imported because `soravo-stt` depends on `soravo-audio`
//! (`mock.rs` uses `soravo_audio::vad`) — importing the mock would create a
//! dependency cycle. Same operating point, no second mock architecture.
//!
//! Security notes (security-guidance: V1.4, V2.2, V2.3):
//! - No `unsafe`, no FFI, no filesystem/network/process execution in these
//!   tests; audio fixtures are synthetic constants (V1.4 N/A by construction).
//! - The non-finite-sample rejection boundary (`EarshotVad` errors on NaN) and
//!   the `handle_frame` fail-open fallback are both pinned by tests (V2.2).
//! - The recording lifecycle (begin/finish/reset/Start/Stop/Shutdown) is pinned
//!   against leaks and wedges (V2.3).

use super::{
    drain_available_samples, is_no_input_device_error, run_consumer, AudioRecorder,
    CaptureProcessor, CaptureTransportState, ChunkDisposition, Cmd, VadConfig, VadPolicy,
};
use crate::vad::{
    frames_for_duration_ms, EarshotVad, SmoothedVad, VoiceActivityDetector,
    VAD_OFFLINE_HANGOVER_MS, VAD_ONSET_MS, VAD_PREFILL_MS, VAD_STREAMING_HANGOVER_MS,
};
use rtrb::RingBuffer;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    thread,
    time::{Duration, Instant},
};

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/// Backend frame size. Must equal the Handy-derived `EARSHOT_FRAME_SAMPLES`
/// (locked together by `frame_size_matches_earshot_backend` below).
const FRAME_SAMPLES: usize = 256;

/// Production Earshot threshold (`EARSHOT_VAD_THRESHOLD` in `managers/audio.rs`).
const EARSHOT_THRESHOLD: f32 = 0.5;

#[test]
fn frame_size_matches_earshot_backend() {
    assert_eq!(
        EarshotVad::new(EARSHOT_THRESHOLD)
            .expect("EarshotVad constructs")
            .frame_samples(),
        FRAME_SAMPLES
    );
}

/// Digital silence: classified as noise by the real detector.
fn silence_16k(frames: usize) -> Vec<f32> {
    vec![0.0; frames * FRAME_SAMPLES]
}

/// Phase-continuous 440 Hz sine at 0.5 peak, 16 kHz mono — the R1-GAP-005/006
/// `MockAudioSource::tone(_, 440.0, 0.5)` operating point, proven speech at the
/// 0.5 Earshot threshold. Phase continuity across frame boundaries keeps
/// classification stable frame to frame.
fn tone_16k(frames: usize) -> Vec<f32> {
    let total = frames * FRAME_SAMPLES;
    (0..total)
        .map(|i| 0.5 * (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 16_000.0).sin())
        .collect()
}

/// The production Earshot composition from
/// `managers/audio.rs::create_audio_recorder(VadBackend::Earshot)`: 0.5
/// threshold, `SmoothedVad` with `frames_for_duration_ms` conversions
/// (prefill 29 / offline hangover 29 / onset 4), `with_vad` hangovers
/// (offline 29 / streaming 104). A fresh detector per call so tests never
/// share smoothing state.
fn earshot_production_config() -> VadConfig {
    let detector = EarshotVad::new(EARSHOT_THRESHOLD).expect("EarshotVad constructs");
    let frame_samples = detector.frame_samples();
    assert_eq!(frame_samples, FRAME_SAMPLES);
    VadConfig {
        detector: Arc::new(Mutex::new(Box::new(SmoothedVad::new(
            Box::new(detector),
            frames_for_duration_ms(VAD_PREFILL_MS, frame_samples),
            frames_for_duration_ms(VAD_OFFLINE_HANGOVER_MS, frame_samples),
            frames_for_duration_ms(VAD_ONSET_MS, frame_samples),
        )))),
        frame_samples,
        offline_hangover_frames: frames_for_duration_ms(VAD_OFFLINE_HANGOVER_MS, frame_samples),
        streaming_hangover_frames: frames_for_duration_ms(VAD_STREAMING_HANGOVER_MS, frame_samples),
    }
}

/// Capture-processor harness: collected callback frames (lengths + samples).
struct EarshotHarness {
    processor: CaptureProcessor,
    frame_lengths: Arc<Mutex<Vec<usize>>>,
    captured: Arc<Mutex<Vec<f32>>>,
    ready_rx: mpsc::Receiver<()>,
}

fn earshot_harness(in_hz: u32, policy: VadPolicy) -> EarshotHarness {
    let frame_lengths = Arc::new(Mutex::new(Vec::new()));
    let captured = Arc::new(Mutex::new(Vec::new()));
    let lengths_cb = Arc::clone(&frame_lengths);
    let captured_cb = Arc::clone(&captured);
    let mut processor = CaptureProcessor::new(
        in_hz,
        Some(earshot_production_config()),
        None,
        Some(Arc::new(move |frame: &[f32]| {
            lengths_cb.lock().unwrap().push(frame.len());
            captured_cb.lock().unwrap().extend_from_slice(frame);
        })),
        Instant::now(),
    );
    let (ready_tx, ready_rx) = mpsc::channel();
    processor.begin_recording(policy, ready_tx);
    EarshotHarness {
        processor,
        frame_lengths,
        captured,
        ready_rx,
    }
}

fn expect_ready(ready_rx: &mpsc::Receiver<()>) {
    ready_rx
        .recv_timeout(Duration::from_secs(1))
        .expect("first captured chunk signals readiness");
}

// ---------------------------------------------------------------------------
// Part A — adopted Handy tests (HANDY-REUSE)
// ---------------------------------------------------------------------------
// Verbatim from `cjpais/Handy@ba10ce19`
// `src-tauri/src/audio_toolkit/audio/recorder/tests.rs`: the lifecycle tests
// the Soravo migration dropped. Only the module paths differ (this crate is
// `soravo-audio`, not `crate::audio_toolkit`).

/// Pass-through detector with a configurable frame size, standing in for a
/// backend such as Earshot whose frames are not 30 ms.
struct FixedFrameVad(usize);

impl VoiceActivityDetector for FixedFrameVad {
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> anyhow::Result<crate::vad::VadFrame<'a>> {
        Ok(crate::vad::VadFrame::Speech(frame))
    }

    fn frame_samples(&self) -> usize {
        self.0
    }
}

#[test]
fn resampler_frame_size_follows_the_vad_backend() {
    let frame_samples = 256;
    let vad = VadConfig {
        detector: Arc::new(Mutex::new(Box::new(FixedFrameVad(frame_samples)))),
        frame_samples,
        offline_hangover_frames: 0,
        streaming_hangover_frames: 0,
    };
    let frame_lengths = Arc::new(Mutex::new(Vec::new()));
    let observed = Arc::clone(&frame_lengths);
    let mut processor = CaptureProcessor::new(
        16_000,
        Some(vad),
        None,
        Some(Arc::new(move |frame: &[f32]| {
            observed.lock().unwrap().push(frame.len())
        })),
        Instant::now(),
    );

    let (ready_tx, _ready_rx) = mpsc::channel();
    processor.begin_recording(VadPolicy::Offline, ready_tx);
    processor.process_raw_chunk(&[0.0; 1024], ChunkDisposition::Capture);
    let samples = processor.finish_recording();

    assert_eq!(samples.len(), 1024);
    assert_eq!(*frame_lengths.lock().unwrap(), vec![frame_samples; 4]);
}

#[test]
fn idle_chunks_are_discarded_without_reaching_the_recording() {
    let mut processor = CaptureProcessor::new(16_000, None, None, None, Instant::now());
    processor.process_raw_chunk(&[1.0; 480], ChunkDisposition::Discard);
    assert!(processor.finish_recording().is_empty());
}

#[test]
fn shutdown_is_processed_without_audio_samples() {
    let (_producer, consumer) = RingBuffer::<f32>::new(48_000);
    let (cmd_tx, cmd_rx) = mpsc::channel();
    let (done_tx, done_rx) = mpsc::channel();
    let worker = thread::spawn(move || {
        run_consumer(
            CaptureProcessor::new(48_000, None, None, None, Instant::now()),
            consumer,
            cmd_rx,
            Arc::new(CaptureTransportState::default()),
            Arc::new(AtomicBool::new(false)),
        );
        let _ = done_tx.send(());
    });

    cmd_tx.send(Cmd::Shutdown).expect("send shutdown");
    assert!(done_rx.recv_timeout(Duration::from_secs(1)).is_ok());
    worker.join().expect("join consumer");
}

#[test]
fn bounded_drain_leaves_remaining_samples_for_the_next_command_cycle() {
    let (mut producer, mut consumer) = RingBuffer::<f32>::new(8);
    producer
        .push_entire_slice(&[1.0, 2.0, 3.0, 4.0, 5.0])
        .expect("samples");
    let mut drained = Vec::new();

    let count = drain_available_samples(&mut consumer, 3, |part| drained.extend_from_slice(part));

    assert_eq!(count, 3);
    assert_eq!(drained, [1.0, 2.0, 3.0]);
    assert_eq!(consumer.slots(), 2);
}

#[test]
fn ring_wraparound_preserves_both_read_slices_in_order() {
    let (mut producer, mut consumer) = RingBuffer::<f32>::new(5);
    let transport = CaptureTransportState::default();
    producer
        .push_entire_slice(&[1.0, 2.0, 3.0, 4.0])
        .expect("initial samples");
    let mut discarded = [0.0; 3];
    consumer
        .pop_entire_slice(&mut discarded)
        .expect("advance ring head");

    AudioRecorder::write_input_to_ring(
        &[5.0f32, 6.0, 7.0, 8.0],
        1,
        None,
        &mut producer,
        &transport,
    );

    let chunk = consumer.read_chunk(5).expect("wrapped samples");
    let (first, second) = chunk.as_slices();
    assert!(!first.is_empty());
    assert!(!second.is_empty());
    let ordered = first
        .iter()
        .chain(second.iter())
        .copied()
        .collect::<Vec<_>>();
    assert_eq!(ordered, [4.0, 5.0, 6.0, 7.0, 8.0]);
}

#[test]
fn repeated_start_stop_cycles_resume_capture_without_leaking_samples() {
    let (mut producer, consumer) = RingBuffer::<f32>::new(16_000);
    let transport = Arc::new(CaptureTransportState::default());
    let (cmd_tx, cmd_rx) = mpsc::channel();
    let streamed = Arc::new(Mutex::new(Vec::new()));
    let streamed_cb = Arc::clone(&streamed);
    let consumer_transport = Arc::clone(&transport);
    let worker = thread::spawn(move || {
        let processor = CaptureProcessor::new(
            16_000,
            None,
            None,
            Some(Arc::new(move |frame: &[f32]| {
                streamed_cb.lock().unwrap().extend_from_slice(frame)
            })),
            Instant::now(),
        );
        run_consumer(
            processor,
            consumer,
            cmd_rx,
            consumer_transport,
            Arc::new(AtomicBool::new(false)),
        );
    });

    let wait_for_pause_request = || {
        let deadline = Instant::now() + Duration::from_secs(1);
        while !transport.pause_requested.load(Ordering::Acquire) {
            assert!(Instant::now() < deadline, "pause was not requested");
            thread::sleep(Duration::from_millis(1));
        }
    };

    let first_input = [0.25f32, -0.5, 1.0];
    let (ready_tx, ready_rx) = mpsc::channel();
    cmd_tx
        .send(Cmd::Start(VadPolicy::Disabled, Instant::now(), ready_tx))
        .expect("first start");
    AudioRecorder::write_input_to_ring(&first_input, 1, None, &mut producer, &transport);
    ready_rx
        .recv_timeout(Duration::from_secs(1))
        .expect("first capture ready");

    let (reply_tx, reply_rx) = mpsc::channel();
    cmd_tx.send(Cmd::Stop(reply_tx)).expect("first stop");
    wait_for_pause_request();
    // The first callback after Stop carries audio captured before the stop,
    // so it belongs to the recording.
    AudioRecorder::write_input_to_ring(&[99.0f32], 1, None, &mut producer, &transport);

    let first_samples = reply_rx
        .recv_timeout(Duration::from_secs(1))
        .expect("first stop reply");
    let first_expected = [0.25f32, -0.5, 1.0, 99.0];
    assert_eq!(&first_samples[..first_expected.len()], &first_expected);
    assert!(first_samples[first_expected.len()..]
        .iter()
        .all(|&sample| sample == 0.0));
    assert!(!transport.pause_requested.load(Ordering::Acquire));

    let first_streamed_len = {
        let streamed = streamed.lock().unwrap();
        assert_eq!(&streamed[..first_expected.len()], &first_expected);
        streamed.len()
    };

    // Start again immediately after stop() would have returned. The producer
    // must already be re-enabled, and no first-cycle samples may leak through.
    let second_input = [0.75f32, -0.25, 0.5];
    let (ready_tx, ready_rx) = mpsc::channel();
    cmd_tx
        .send(Cmd::Start(VadPolicy::Disabled, Instant::now(), ready_tx))
        .expect("second start");
    AudioRecorder::write_input_to_ring(&second_input, 1, None, &mut producer, &transport);
    ready_rx
        .recv_timeout(Duration::from_secs(1))
        .expect("second capture ready");

    let (reply_tx, reply_rx) = mpsc::channel();
    cmd_tx.send(Cmd::Stop(reply_tx)).expect("second stop");
    wait_for_pause_request();
    AudioRecorder::write_input_to_ring(&[199.0f32], 1, None, &mut producer, &transport);

    let second_samples = reply_rx
        .recv_timeout(Duration::from_secs(1))
        .expect("second stop reply");
    let second_expected = [0.75f32, -0.25, 0.5, 199.0];
    assert_eq!(&second_samples[..second_expected.len()], &second_expected);
    assert!(second_samples[second_expected.len()..]
        .iter()
        .all(|&sample| sample == 0.0));
    assert!(!first_samples
        .iter()
        .any(|sample| second_expected.contains(sample)));
    assert!(!second_samples
        .iter()
        .any(|sample| first_expected.contains(sample)));
    assert!(!transport.pause_requested.load(Ordering::Acquire));

    {
        let streamed = streamed.lock().unwrap();
        assert_eq!(streamed.len(), first_streamed_len + second_samples.len());
        assert_eq!(
            &streamed[first_streamed_len..first_streamed_len + second_expected.len()],
            &second_expected
        );
    }

    cmd_tx.send(Cmd::Shutdown).expect("shutdown");
    worker.join().expect("consumer worker");
}

#[test]
fn missing_callback_at_stop_marks_stream_for_rebuild_and_returns_samples() {
    let (_producer, consumer) = RingBuffer::<f32>::new(16_000);
    let transport = Arc::new(CaptureTransportState::default());
    let stream_error = Arc::new(AtomicBool::new(false));
    let observed_error = Arc::clone(&stream_error);
    let (cmd_tx, cmd_rx) = mpsc::channel();
    let worker_transport = Arc::clone(&transport);
    let worker = thread::spawn(move || {
        run_consumer(
            CaptureProcessor::new(16_000, None, None, None, Instant::now()),
            consumer,
            cmd_rx,
            worker_transport,
            stream_error,
        );
    });

    let (ready_tx, _ready_rx) = mpsc::channel();
    cmd_tx
        .send(Cmd::Start(VadPolicy::Disabled, Instant::now(), ready_tx))
        .expect("start");
    let (reply_tx, reply_rx) = mpsc::channel();
    cmd_tx.send(Cmd::Stop(reply_tx)).expect("stop");

    let samples = reply_rx
        .recv_timeout(Duration::from_secs(3))
        .expect("pause timeout still returns captured samples");
    assert!(samples.is_empty());
    worker.join().expect("consumer exits after pause timeout");
    assert!(observed_error.load(Ordering::Acquire));
}

#[test]
fn detects_coreaudio_config_error() {
    assert!(is_no_input_device_error(
        "Failed to fetch preferred config: A backend-specific error has occurred: An unknown error unknown to the coreaudio-rs API occurred"
    ));
}

#[test]
fn does_not_match_other_errors_for_no_device() {
    assert!(!is_no_input_device_error("permission denied"));
    assert!(!is_no_input_device_error("device not found"));
}

// ---------------------------------------------------------------------------
// Part B — Earshot-path composition tests (SORAVO-NEW)
// ---------------------------------------------------------------------------
// The production `VadBackend::Earshot` stack — `SmoothedVad(EarshotVad)` with
// `frames_for_duration_ms` timings through `CaptureProcessor::handle_frame` —
// exercised with deterministic audio. Upstream has no equivalent: its tests
// cover scripted detectors only.

/// R1-GAP-009 silence: digital silence through the production Earshot stack
/// produces no samples and no callback traffic — nothing reaches STT.
#[test]
fn earshot_path_silence_yields_no_samples() {
    let mut harness = earshot_harness(16_000, VadPolicy::Offline);
    harness
        .processor
        .process_raw_chunk(&silence_16k(40), ChunkDisposition::Capture);
    expect_ready(&harness.ready_rx);
    let samples = harness.processor.finish_recording();
    assert!(
        samples.is_empty(),
        "silence must not reach transcription, got {} samples",
        samples.len()
    );
    assert!(harness.captured.lock().unwrap().is_empty());
    assert!(harness.frame_lengths.lock().unwrap().is_empty());
}

/// R1-GAP-009 voice onset: the first confirmed speech emits the full prefill
/// backlog in one burst (pre-roll protects the first phoneme — 05 contract),
/// and the recording total equals burst + sustained frames.
#[test]
fn earshot_path_voice_onset_emits_full_prefill_backlog() {
    let mut harness = earshot_harness(16_000, VadPolicy::Offline);
    // 32 silent frames fill the 30-frame prefill window; 12 tone frames voice
    // onset (4 consecutive) plus 8 sustained frames.
    let mut input = silence_16k(32);
    input.extend_from_slice(&tone_16k(12));
    harness
        .processor
        .process_raw_chunk(&input, ChunkDisposition::Capture);
    expect_ready(&harness.ready_rx);
    let samples = harness.processor.finish_recording();

    let lengths = harness.frame_lengths.lock().unwrap();
    // Prefill window (29) + onset frame = 30 buffered frames in one burst.
    assert_eq!(
        lengths[0],
        30 * FRAME_SAMPLES,
        "onset must emit the full prefill backlog first, got {:?}",
        lengths.as_slice()
    );
    // 8 sustained tone frames follow singly, then nothing (no trailing audio
    // to hang over).
    assert_eq!(
        *lengths,
        [&[30 * FRAME_SAMPLES][..], &[FRAME_SAMPLES; 8]].concat()
    );
    assert_eq!(samples.len(), 30 * FRAME_SAMPLES + 8 * FRAME_SAMPLES);
    // Dual delivery: the live callback stream equals the stopped buffer.
    assert_eq!(*harness.captured.lock().unwrap(), samples);
}

/// R1-GAP-009 sustained speech: once onset confirms, every speech frame passes
/// through singly in order.
///
/// Detector conditioning note (real-`EarshotVad` behavior, characterized here,
/// not assumed): the Handy-derived detector is stateful — a fresh detector fed
/// immediate tone needs ~10 frames to adapt, while one conditioned on ambient
/// silence (the production reality: recordings open on room tone) confirms
/// onset at exactly the 4th consecutive voiced frame. 40 leading silence
/// frames condition it deterministically.
#[test]
fn earshot_path_sustained_speech_passes_through_frame_by_frame() {
    let mut harness = earshot_harness(16_000, VadPolicy::Offline);
    let mut input = silence_16k(40);
    input.extend_from_slice(&tone_16k(20));
    harness
        .processor
        .process_raw_chunk(&input, ChunkDisposition::Capture);
    expect_ready(&harness.ready_rx);
    let samples = harness.processor.finish_recording();

    let lengths = harness.frame_lengths.lock().unwrap();
    // Onset confirms at the 4th tone frame: full 30-frame prefill burst (26
    // silence + 4 tone), then 16 sustained singles.
    assert_eq!(lengths[0], 30 * FRAME_SAMPLES);
    assert_eq!(&lengths[1..], &[FRAME_SAMPLES; 16]);
    assert_eq!(samples.len(), 46 * FRAME_SAMPLES);
}

/// R1-GAP-009 speech termination: post-speech silence is held for AT LEAST
/// the offline hangover tail (29 frames — the mechanical floor, exact), then
/// cut cleanly with no second speech segment.
///
/// Detector settling note: the stateful detector voices a few decaying frames
/// after loud tone ends (observed: 5), refreshing the hangover — so the total
/// tail exceeds 29 by a small contiguous decay extension. What is asserted:
/// the 29-frame mechanical floor, contiguity (extension adjoins the hangover,
/// proving decay rather than a re-triggered onset, which would open a fresh
/// 29-frame tail), and a clean terminal cut. Frame-exact at the smoothing
/// layer, where hangover mechanics — not ML scores — decide the floor.
#[test]
fn earshot_path_termination_holds_offline_hangover_then_cuts() {
    let mut vad = SmoothedVad::new(
        Box::new(EarshotVad::new(EARSHOT_THRESHOLD).expect("EarshotVad constructs")),
        frames_for_duration_ms(VAD_PREFILL_MS, FRAME_SAMPLES),
        frames_for_duration_ms(VAD_OFFLINE_HANGOVER_MS, FRAME_SAMPLES),
        frames_for_duration_ms(VAD_ONSET_MS, FRAME_SAMPLES),
    );
    // Condition on room tone (see sustained-speech note), establish speech,
    // then cut to silence and watch every trailing frame.
    for frame in silence_16k(40).chunks_exact(FRAME_SAMPLES) {
        let _ = vad.push_frame(frame);
    }
    let tone = tone_16k(12);
    for frame in tone.chunks_exact(FRAME_SAMPLES) {
        let _ = vad.push_frame(frame);
    }
    let silence = silence_16k(60);
    let mut tail: Vec<bool> = Vec::new();
    for frame in silence.chunks_exact(FRAME_SAMPLES) {
        tail.push(vad.is_voice(frame).expect("VAD classifies"));
    }
    // Mechanical floor: the first 29 post-tone frames are always speech.
    assert_eq!(&tail[..29], &[true; 29]);
    // Decay extension, if any, is contiguous with the hangover: from the first
    // cut frame on, everything stays cut — no re-triggered speech segment.
    let cut = tail.iter().position(|&speech| !speech).expect("tail cuts");
    assert!(tail[cut..].iter().all(|&speech| !speech));
    // And the extension is small: no fresh 29-frame tail (no re-onset).
    assert!(
        cut < 29 + 29,
        "tail cut at frame {cut}: a second onset would reopen a full tail"
    );
}

/// R1-GAP-009 VAD transitions across policies: the Streaming profile holds a
/// 104-frame tail where Offline already cuts. Proves `begin_recording` applies
/// the per-policy hangover through `set_hangover_frames`.
///
/// Both stacks see identical histories (conditioned, then the same tone and
/// silence), so detector settling extends both tails equally and cancels out
/// of the differential: streaming minus offline is exactly the 104 − 29 frame
/// policy gap. 140 trailing frames let both tails terminate fully.
#[test]
fn earshot_path_streaming_tail_outlasts_offline() {
    let mut offline = earshot_harness(16_000, VadPolicy::Offline);
    let mut streaming = earshot_harness(16_000, VadPolicy::Streaming);
    let mut input = silence_16k(40);
    input.extend_from_slice(&tone_16k(12));
    input.extend_from_slice(&silence_16k(140));
    offline
        .processor
        .process_raw_chunk(&input, ChunkDisposition::Capture);
    streaming
        .processor
        .process_raw_chunk(&input, ChunkDisposition::Capture);
    expect_ready(&offline.ready_rx);
    expect_ready(&streaming.ready_rx);
    let offline_samples = offline.processor.finish_recording();
    let streaming_samples = streaming.processor.finish_recording();

    // The policy gap survives settling exactly: 104 − 29 hangover frames.
    assert_eq!(
        streaming_samples.len() - offline_samples.len(),
        (104 - 29) * FRAME_SAMPLES
    );
    // Floors: tone (12) + full offline tail (29) each, plus any settling.
    assert!(offline_samples.len() >= (12 + 29) * FRAME_SAMPLES);
    assert!(streaming_samples.len() >= (12 + 104) * FRAME_SAMPLES);
}

/// R1-GAP-007 capture contract: with VAD disabled, silence passes through
/// untouched — VAD controls recognition work, not capture (02 requirement).
#[test]
fn earshot_path_disabled_policy_passes_silence_untouched() {
    let mut harness = earshot_harness(16_000, VadPolicy::Disabled);
    let input = silence_16k(4);
    harness
        .processor
        .process_raw_chunk(&input, ChunkDisposition::Capture);
    expect_ready(&harness.ready_rx);
    let samples = harness.processor.finish_recording();
    assert_eq!(samples, input);
}

/// R1-GAP-009 lifecycle isolation: `begin_recording` resets detector,
/// resampler, and buffers — a silent second recording stays empty and a third
/// still detects speech. Finishing without beginning is empty.
#[test]
fn earshot_path_reset_isolates_recordings() {
    let frame_lengths = Arc::new(Mutex::new(Vec::new()));
    let captured = Arc::new(Mutex::new(Vec::new()));
    let lengths_cb = Arc::clone(&frame_lengths);
    let captured_cb = Arc::clone(&captured);
    let mut processor = CaptureProcessor::new(
        16_000,
        Some(earshot_production_config()),
        None,
        Some(Arc::new(move |frame: &[f32]| {
            lengths_cb.lock().unwrap().push(frame.len());
            captured_cb.lock().unwrap().extend_from_slice(frame);
        })),
        Instant::now(),
    );
    let begin = |processor: &mut CaptureProcessor| {
        let (ready_tx, ready_rx) = mpsc::channel();
        processor.begin_recording(VadPolicy::Offline, ready_tx);
        ready_rx
    };

    // Recording 1: speech in, speech out.
    let ready_rx = begin(&mut processor);
    processor.process_raw_chunk(&tone_16k(12), ChunkDisposition::Capture);
    expect_ready(&ready_rx);
    assert!(!processor.finish_recording().is_empty());

    // Recording 2: silence in, nothing out — no state leaked from recording 1.
    let ready_rx = begin(&mut processor);
    processor.process_raw_chunk(&silence_16k(40), ChunkDisposition::Capture);
    expect_ready(&ready_rx);
    assert!(processor.finish_recording().is_empty());

    // Recording 3: the reset detector still hears speech.
    let ready_rx = begin(&mut processor);
    processor.process_raw_chunk(&tone_16k(12), ChunkDisposition::Capture);
    expect_ready(&ready_rx);
    assert!(!processor.finish_recording().is_empty());

    // No `begin_recording` since the last finish: nothing to flush.
    assert!(processor.finish_recording().is_empty());
}

/// R1-GAP-007 frame/chunk boundary: `finish_recording` flushes a partial
/// trailing frame zero-padded to the full backend frame.
#[test]
fn earshot_path_finish_flushes_partial_frame_with_zero_pad() {
    let mut harness = earshot_harness(16_000, VadPolicy::Disabled);
    let input = vec![0.25f32; 100];
    harness
        .processor
        .process_raw_chunk(&input, ChunkDisposition::Capture);
    expect_ready(&harness.ready_rx);
    let samples = harness.processor.finish_recording();
    assert_eq!(samples.len(), FRAME_SAMPLES);
    assert_eq!(&samples[..100], &input[..]);
    assert!(samples[100..].iter().all(|&s| s == 0.0));
}

/// R1-GAP-009 failure path: a VAD classification error fails open — the frame
/// is kept, never silently dropped (`handle_frame` `unwrap_or(Speech)`).
/// `EarshotVad` rejects non-finite input, which exercises exactly this branch.
#[test]
fn earshot_path_vad_error_fails_open() {
    let mut harness = earshot_harness(16_000, VadPolicy::Offline);
    let mut bad = vec![0.0f32; FRAME_SAMPLES];
    bad[0] = f32::NAN;
    harness
        .processor
        .process_raw_chunk(&bad, ChunkDisposition::Capture);
    expect_ready(&harness.ready_rx);
    let samples = harness.processor.finish_recording();
    assert_eq!(samples.len(), FRAME_SAMPLES);
    assert!(samples.iter().any(|s| s.is_nan()));
}

/// R1-GAP-009 end-of-recording diagnostic: `tail_report` accounts the
/// withheld onset tail (2 voiced frames, onset unconfirmed) with the real
/// detector — the scripted-detector case already proven upstream.
#[test]
fn earshot_path_tail_report_accounts_withheld_onset() {
    let mut vad = SmoothedVad::new(
        Box::new(EarshotVad::new(EARSHOT_THRESHOLD).expect("EarshotVad constructs")),
        frames_for_duration_ms(VAD_PREFILL_MS, FRAME_SAMPLES),
        frames_for_duration_ms(VAD_OFFLINE_HANGOVER_MS, FRAME_SAMPLES),
        frames_for_duration_ms(VAD_ONSET_MS, FRAME_SAMPLES),
    );
    for frame in silence_16k(30).chunks_exact(FRAME_SAMPLES) {
        assert!(!vad.is_voice(frame).expect("VAD classifies"));
    }
    let tone = tone_16k(2);
    for frame in tone.chunks_exact(FRAME_SAMPLES) {
        assert!(!vad.is_voice(frame).expect("VAD classifies"));
    }
    let report = vad.tail_report().expect("smoothed VAD always reports");
    assert_eq!(report.withheld_frames, 30);
    assert_eq!(report.withheld_voiced_frames, 2);
    assert_eq!(report.onset_counter, 2);
    assert!(!report.in_speech);
}

/// R1-GAP-007 device-format path: a 48 kHz capture rate resamples to 16 kHz
/// backend frames and still detects speech — format handling without hardware.
#[test]
fn earshot_path_device_rate_format_still_detects_speech() {
    let mut harness = earshot_harness(48_000, VadPolicy::Offline);
    // 2 s of 48 kHz tone, fed in device-sized chunks.
    let input: Vec<f32> = (0..96_000)
        .map(|i| 0.5 * (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48_000.0).sin())
        .collect();
    for chunk in input.chunks(4800) {
        harness
            .processor
            .process_raw_chunk(chunk, ChunkDisposition::Capture);
    }
    expect_ready(&harness.ready_rx);
    let samples = harness.processor.finish_recording();
    assert!(
        !samples.is_empty(),
        "resampled speech must survive VAD gating"
    );
    assert_eq!(samples.len() % FRAME_SAMPLES, 0);
    // Backend-sized frames throughout; the onset burst aggregates the prefill
    // backlog, so emissions are multiples of — not always exactly — one frame.
    assert!(harness
        .frame_lengths
        .lock()
        .unwrap()
        .iter()
        .all(|&len| len % FRAME_SAMPLES == 0 && len >= FRAME_SAMPLES));
}
