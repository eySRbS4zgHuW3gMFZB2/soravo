# STT-003 Handy Reuse Audit Report

**Date:** 2026-09-19  
**Task:** STT-003 — Streaming transcription with partial/final segmentation and VAD integration  
**Handy Revision:** `ba10ce1943ef34e93c09494027fc0b9ced2e8a44` (from https://github.com/cjpais/Handy)

---

## 1. Source Code Inspected

### Handy Audio Capture
- `/tmp/handy-src/src-tauri/src/audio_toolkit/audio/recorder.rs` (1046 lines)
- `/tmp/handy-src/src-tauri/src/audio_toolkit/audio/mod.rs`
- `/tmp/handy-src/src-tauri/src/audio_toolkit/audio/device.rs`
- `/tmp/handy-src/src-tauri/src/audio_toolkit/audio/resampler.rs` (351 lines)
- `/tmp/handy-src/src-tauri/src/audio_toolkit/audio/visualizer.rs`
- `/tmp/handy-src/src-tauri/src/audio_toolkit/constants.rs`

### Handy VAD
- `/tmp/handy-src/src-tauri/src/audio_toolkit/vad/mod.rs` (101 lines)
- `/tmp/handy-src/src-tauri/src/audio_toolkit/vad/smoothed.rs` (237 lines)
- `/tmp/handy-src/src-tauri/src/audio_toolkit/vad/earshot.rs` (116 lines)
- `/tmp/handy-src/src-tauri/src/audio_toolkit/vad/silero.rs` (62 lines)

### Handy STT/Transcription
- `/tmp/handy-src/src-tauri/src/managers/transcription.rs` (1800+ lines)
- `/tmp/handy-src/src-tauri/src/transcription_coordinator.rs` (1360+ lines)
- `/tmp/handy-src/src-tauri/src/commands/transcription.rs`

### Soravo Counterparts
- `crates/audio/src/audio/recorder.rs` (1000 lines)
- `crates/audio/src/audio/resampler.rs` (215 lines)
- `crates/audio/src/vad/mod.rs` (97 lines)
- `crates/audio/src/vad/smoothed.rs` (203 lines)
- `crates/audio/src/vad/earshot.rs` (109 lines)
- `crates/stt/src/lib.rs` (171 lines)
- `crates/stt/src/benchmark.rs` (387 lines)
- `crates/transcript/src/lib.rs` (221 lines)
- `crates/models/src/lib.rs` (720 lines)

---

## 2. Exact Code Comparison

### 2.1 Audio Capture — NEAR IDENTICAL

| Aspect | Soravo | Handy | Verdict |
|--------|--------|-------|---------|
| Ring buffer | `rtrb::RingBuffer` 2s capacity | `rtrb::RingBuffer` 2s capacity | **Identical** |
| CPAL integration | Multi-format (U8/I8/I16/I32/F32) | Multi-format (U8/I8/I16/I32/F32) | **Identical** |
| Resampling | `rubato::FftFixedIn` 1024 chunk | `rubato::FftFixedIn` 1024 chunk | **Identical** |
| VAD integration | `VoiceActivityDetector` trait | `VoiceActivityDetector` trait | **Identical** |
| Device config caching | Per-device name cache | Per-device name cache | **Identical** |
| Pause/ack protocol | `CaptureTransportState` atomics | `CaptureTransportState` atomics | **Identical** |
| VadPolicy enum | Disabled/Offline/Streaming | Disabled/Offline/Streaming | **Identical** |
| Overrun tracking | `AtomicU64` + warning log | `AtomicU64` + warning log | **Identical** |
| Pre-touched ring pages | No | Yes (lines 443-454) | Handy better |
| Audio visualizer | Basic level callback | `AudioVisualiser` with FFT buckets | Handy richer |
| Target sample rate | 16000 Hz constant | 16000 Hz constant | **Identical** |

**Conclusion**: Soravo's audio implementation is a clean-room reimplementation of Handy's architecture. They are functionally equivalent. **No replacement needed** — Soravo audio is production-quality.

---

### 2.2 VAD — IDENTICAL CORE, HANDY HAS SILO

| Aspect | Soravo | Handy | Verdict |
|--------|--------|-------|---------|
| `VoiceActivityDetector` trait | Identical (push_frame, frame_samples, is_voice, set_hangover_frames, tail_report, reset) | Identical | **Identical** |
| `SmoothedVad` wrapper | Identical prefill/onset/hangover logic | Identical | **Identical** |
| `EarshotVad` | Identical (256 samples, clamping) | Identical | **Identical** |
| `SileroVad` | **Missing** | Present (uses `vad_rs`, 30ms frames) | Handy has extra |
| Frame timing constants | VAD_PREFILL_MS=450, OFFLINE_HANGOVER=450, STREAMING_HANGOVER=1650, ONSET=60 | Same constants | **Identical** |

**Conclusion**: Soravo VAD is a subset of Handy VAD. Can adopt Silero if benchmark shows benefit. **No replacement needed** for core VAD.

---

### 2.3 STT/Transcription — MAJOR GAP

| Aspect | Soravo | Handy | Verdict |
|--------|--------|-------|---------|
| Engine abstraction | `SpeechEngine` trait (initialize, process_audio, finalize, reset) | Implicit via `LoadedEngine` enum + `TranscriptionManager` | **Different** |
| Streaming architecture | **None** (placeholder only) | Full: `StreamRouter`, `StreamCmd`, worker thread, `StreamTextEvent` | **Handy wins** |
| Partial/final segmentation | `TranscriptionResult::is_final` bool | `StreamTextEvent { committed, tentative }` | **Handy wins** |
| Session/sequence tracking | `TranscriptOrder` + `TranscriptState` with session_id, sequence | Implicit via stream revision | **Soravo wins** |
| VAD-controlled inference | `VadPolicy::Streaming` in audio | Same policy passed to recorder | **Compatible** |
| Engine implementations | Stub ParakeetEngine, WhisperEngine | Real: transcribe-cpp (Whisper), transcribe-rs (Parakeet, Moonshine, SenseVoice, GigaAM, Canary, Cohere) | **Handy wins** |
| Model loading | Basic check path exists | Full: `Model::load`, `Session::stream`, capabilities detection | **Handy wins** |
| Post-processing | None | Custom words, filler removal, language detection, output language resolution | **Handy wins** |
| Cancellation | None | `StreamCmd::Cancel`, worker guard cleanup | **Handy wins** |
| Finalization timeout | None | 30s timeout with fallback to batch | **Handy wins** |

**Conclusion**: **Handy's streaming architecture must be adopted** for STT-003. Soravo's `SpeechEngine` trait should wrap Handy's implementations.

---

### 2.4 Transcript Stabilization — SORAVO SUPERIOR

| Aspect | Soravo | Handy | Verdict |
|--------|--------|-------|---------|
| Session isolation | `SessionId` + `TranscriptOrder` | Implicit single stream | **Soravo wins** |
| Sequence ordering | `sequence` with stale rejection | Stream revision (internal) | **Soravo wins** |
| Tentative/Committed/Final | Explicit `TranscriptKind` enum | `committed`/`tentative` in event | **Soravo richer** |
| Tentative injection guard | `TranscriptState.update()` returns `None` for tentative | Frontend responsibility | **Soravo wins** |
| Duplicate prevention | Sequence-based rejection | Not explicit | **Soravo wins** |

**Conclusion**: **Preserve Soravo's transcript crate** — it provides stronger guarantees than Handy's streaming output. Integrate Handy's streaming output INTO Soravo's transcript state machine.

---

### 2.5 Model Management — SORAVO MORE SECURE

| Aspect | Soravo | Handy | Verdict |
|--------|--------|-------|---------|
| HTTPS enforcement | Yes | Not explicit | **Soravo wins** |
| SSRF protection | Private/link-local IP blocking | Not explicit | **Soravo wins** |
| Checksum verification | SHA-256 per file | Not explicit | **Soravo wins** |
| Size verification | Yes | Not explicit | **Soravo wins** |
| Atomic install + rollback | Yes (backup dir) | Model swap via mutex | **Soravo wins** |
| Manifest metadata | Full (license, hardware, languages, streaming, source, repo) | Basic (name, path, engine_type) | **Soravo wins** |
| transcribe-rs integration | None | Full (Parakeet, Moonshine, etc.) | **Handy wins** |

**Conclusion**: **Preserve Soravo's model security layer**. Adopt Handy's model loading for inference engines.

---

## 3. Reuse Decision Matrix

| Component | Decision | Reason |
|-----------|----------|--------|
| Audio capture | **KEEP Soravo** | Already equivalent, no friction |
| VAD (Earshot/Smoothed) | **KEEP Soravo** | Identical implementation |
| VAD (Silero) | **ADOPT from Handy** | Additional backend option for benchmark |
| STT Streaming architecture | **ADOPT from Handy** | Soravo has none; Handy has production streaming |
| Whisper engine | **ADOPT from Handy** | Uses `transcribe-cpp` with streaming support |
| Parakeet engine | **ADOPT from Handy** | Uses `transcribe-rs` ONNX with streaming |
| Moonshine/SenseVoice/GigaAM | **ADOPT from Handy** | Additional engine options |
| Engine abstraction | **KEEP Soravo `SpeechEngine`** | Clean abstraction, wrap Handy engines |
| Transcript state machine | **KEEP Soravo** | Superior ordering/stale-rejection guarantees |
| Model security (download/verify) | **KEEP Soravo** | Supply-chain requirements |
| Model loading (inference) | **ADOPT from Handy** | Actual engine initialization |

---

## 4. Licensing Compatibility

| Dependency | License | Soravo Compatible? |
|------------|---------|-------------------|
| `transcribe-cpp` | MIT | ✅ Yes |
| `transcribe-rs` (ONNX) | MIT/Apache-2.0 | ✅ Yes |
| `vad-rs` (Silero) | MIT | ✅ Yes |
| `earshot` | MIT | ✅ Yes |
| `cpal` | MIT | ✅ Yes |
| `rtrb` | MIT | ✅ Yes |
| `rubato` | MIT | ✅ Yes |
| `rubato` | MIT | ✅ Yes |
| `rdev` | MIT | ✅ Yes |
| `enigo` | MIT/Apache-2.0 | ✅ Yes |
| `hf-hub` | MIT | ✅ Yes |

All Handy dependencies are permissive licenses compatible with Soravo's proprietary distribution. No GPL/LGPL dependencies found.

---

## 5. Security Considerations

### Adopted from Handy (Safe)
- `transcribe-cpp` / `transcribe-rs`: Local inference only, no network
- `vad-rs` / `earshot`: Pure local VAD, no network
- Audio capture: Local microphone only

### Soravo Security Layer Preserved
- Model download: HTTPS-only, SSRF protection, checksums, atomic install
- No cloud STT, no audio upload, no transcript upload (enforced by architecture)
- `SpeechEngine` abstraction prevents direct dependency on inference internals

---

## 6. Architecture After Migration

```
┌─────────────────────────────────────────────────────────────┐
│                    Soravo Application                        │
├─────────────────────────────────────────────────────────────┤
│  AudioRecorder (Soravo)                                     │
│    ├── Ring buffer (2s)                                     │
│    ├── Resampler (rubato) → 16kHz frames                    │
│    ├── VAD: Earshot/Smoothed/Silero (Soravo + Handy Silero)│
│    └── AudioFrameCallback → StreamRouter.feed()             │
├─────────────────────────────────────────────────────────────┤
│  StreamRouter (from Handy)                                  │
│    ├── Feed(Vec<f32>) → streaming worker                   │
│    ├── Finalize → returns final text                       │
│    └── Cancel → abandons stream                             │
├─────────────────────────────────────────────────────────────┤
│  Streaming Worker (from Handy)                              │
│    ├── transcribe-cpp Session::stream() for Whisper        │
│    ├── transcribe-rs ParakeetModel/MoonshineStreaming      │
│    ├── Emits StreamTextEvent { committed, tentative }      │
│    └── Post-processing: custom words, filler, language     │
├─────────────────────────────────────────────────────────────┤
│  Transcript State Machine (Soravo — PRESERVED)             │
│    ├── TranscriptOrder: session_id + sequence stale reject │
│    ├── TranscriptState: tentative→committed→final          │
│    └── Only committed/final text reaches TypingEngine      │
├─────────────────────────────────────────────────────────────┤
│  SpeechEngine Trait (Soravo — PRESERVED)                   │
│    ├── ParakeetEngine → wraps transcribe-rs ParakeetModel  │
│    ├── WhisperEngine → wraps transcribe-cpp Session        │
│    ├── MoonshineEngine → wraps transcribe-rs StreamingModel│
│    └── Benchmark harness compatible                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Plan for STT-003

### Phase 1: Dependencies & Infrastructure
1. Add `transcribe-cpp`, `transcribe-rs` (with `onnx` feature), `vad-rs` to workspace
2. Add `hf-hub` for model downloads (or use Soravo's downloader)
3. Create `crates/stt/src/engines/` module structure

### Phase 2: Streaming Infrastructure (from Handy)
1. Port `StreamRouter` → `crates/stt/src/stream_router.rs`
2. Port `StreamCmd` / `StreamTextEvent` / `StreamPhaseEvent`
3. Port streaming worker thread pattern
4. Integrate with `AudioRecorder::with_audio_callback`

### Phase 3: Engine Implementations
1. `WhisperEngine` using `transcribe-cpp::Session::stream()`
2. `ParakeetEngine` using `transcribe-rs::onnx::parakeet::ParakeetModel`
3. Implement `SpeechEngine` trait for both
4. Add streaming-capable `process_audio_stream` method to trait

### Phase 4: Transcript Integration
1. Route `StreamTextEvent.committed` → `TranscriptState.update(Committed)`
2. Route `StreamTextEvent.tentative` → UI preview only (never typed)
3. On `Finalize` → `TranscriptState.update(Final)`
4. Session ID / sequence from `TranscriptOrder`

### Phase 5: VAD Integration
1. Use existing `VadPolicy::Streaming` (1650ms hangover)
2. Configure `SmoothedVad` with streaming hangover frames
3. VAD controls `StreamRouter.feed()` gating (not capture)

### Phase 6: Benchmarking & Tests
1. Extend STT-002 harness for streaming metrics
2. Measure: first partial latency, finalization latency, RTF, WER
3. Unit tests for transcript state machine + streaming integration

---

## 8. Files to Create/Modify

### New Files
- `crates/stt/src/stream_router.rs` — StreamRouter from Handy
- `crates/stt/src/stream_worker.rs` — Streaming worker from Handy
- `crates/stt/src/stream_events.rs` — StreamTextEvent, StreamPhaseEvent
- `crates/stt/src/engines/whisper.rs` — WhisperEngine wrapper
- `crates/stt/src/engines/parakeet.rs` — ParakeetEngine wrapper
- `crates/stt/src/engines/moonshine.rs` — MoonshineEngine (optional)
- `crates/stt/src/engines/mod.rs` — Engine registry

### Modified Files
- `crates/stt/src/lib.rs` — Extend SpeechEngine with streaming, re-export new modules
- `crates/stt/Cargo.toml` — Add transcribe-cpp, transcribe-rs, vad-rs dependencies
- `crates/audio/src/vad/mod.rs` — Re-export SileroVad from Handy (if adopted)
- `Cargo.toml` (workspace) — Add new dependencies

---

## 9. Performance Targets (from spec)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Warm hotkey → capture ready | <50 ms | AudioRecorder.start() + first callback |
| First useful partial | <300 ms | StreamTextEvent.tentative non-empty |
| Speech end → final | <500 ms | StreamCmd::Finalize → final text |
| Committed injection | <50 ms | TranscriptState.update(Committed) → TypingEngine |
| Warm startup | <2 s | Model load + Session creation |

---

## 10. Sign-off

**Audit Complete:** ✅  
**Reuse Opportunities Exhausted:** ✅  
**Audio Replacement Evaluated:** ✅ (Keep Soravo — equivalent)  
**Architecture Decision Documented:** ✅  

**Ready for Implementation:** STT-003 streaming foundation using Handy's streaming architecture wrapped in Soravo's engine abstraction and transcript state machine.