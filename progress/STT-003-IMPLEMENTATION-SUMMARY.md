# STT-003 Implementation Summary

**Date:** 2026-09-19  
**Task:** STT-003 — Streaming transcription with partial/final segmentation and VAD integration  
**Status:** COMPLETE

---

## Overview

Implemented the streaming STT foundation for Soravo, adopting Handy's production streaming architecture while preserving Soravo's superior transcript state machine and security model.

---

## Audit Results (from STT-003-HANDY-REUSE-AUDIT.md)

| Component | Decision | Reason |
|-----------|----------|--------|
| Audio capture | **KEEP Soravo** | Already equivalent to Handy |
| VAD (Earshot/Smoothed) | **KEEP Soravo** | Identical implementation |
| VAD (Silero) | **ADOPT from Handy** | Additional backend option |
| STT Streaming architecture | **ADOPT from Handy** | Soravo had none |
| Whisper engine | **ADOPT from Handy** | Uses transcribe-cpp with streaming |
| Parakeet engine | **ADOPT from Handy** | Uses transcribe-rs ONNX |
| Engine abstraction | **KEEP Soravo** | Clean `SpeechEngine` trait |
| Transcript state machine | **KEEP Soravo** | Superior ordering guarantees |
| Model security | **KEEP Soravo** | Supply-chain requirements |

---

## Files Created

### New STT Modules
| File | Description |
|------|-------------|
| `crates/stt/src/stream_events.rs` | `StreamTextEvent`, `StreamPhaseEvent`, `FinalizedStreamText` — adapted from Handy |
| `crates/stt/src/stream_router.rs` | `StreamRouter`, `StreamCmd` — zero-overhead audio frame routing from Handy |
| `crates/stt/src/stream_worker.rs` | Streaming worker thread with `StreamWorkerConfig` — adapted from Handy |
| `crates/stt/src/engines/mod.rs` | Engine registry module |
| `crates/stt/src/engines/whisper.rs` | `WhisperEngine` using `transcribe-cpp` with streaming support |
| `crates/stt/src/engines/parakeet.rs` | `ParakeetEngine` using `transcribe-rs` ONNX runtime |

### Modified Files
| File | Changes |
|------|---------|
| `crates/stt/src/lib.rs` | Extended `SpeechEngine` with `supports_streaming()`, `supported_languages()`; re-exported new modules |
| `crates/stt/Cargo.toml` | Added dependencies: `transcribe-cpp`, `transcribe-rs`, `vad-rs`, `earshot`, `tokio`, `crossbeam-channel`, `log` |
| `crates/audio/Cargo.toml` | Updated versions to match Handy; added `vad-rs` for Silero VAD |
| `crates/audio/src/vad/mod.rs` | Exported `SileroVad` |
| `crates/audio/src/vad/silero.rs` | **NEW** — Silero VAD adapter from Handy |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Soravo Application                                               │
├─────────────────────────────────────────────────────────────────┤
│ AudioRecorder (Soravo)                                          │
│   ├── Ring buffer (2s)                                          │
│   ├── Resampler (rubato) → 16kHz frames                         │
│   ├── VAD: Earshot/Smoothed/Silero (Soravo + Handy Silero)     │
│   └── AudioFrameCallback → StreamRouter.feed()                  │
├─────────────────────────────────────────────────────────────────┤
│ StreamRouter (from Handy)                                       │
│   ├── Feed(Vec<f32>) → streaming worker                         │
│   ├── Finalize → returns final text                             │
│   └── Cancel → abandons stream                                  │
├─────────────────────────────────────────────────────────────────┤
│ Streaming Worker (from Handy)                                   │
│   ├── transcribe-cpp Session::stream() for Whisper             │
│   ├── transcribe-rs ParakeetModel for Parakeet                 │
│   ├── Emits StreamTextEvent { committed, tentative }           │
│   └── Post-processing: custom words, filler, language          │
├─────────────────────────────────────────────────────────────────┤
│ Transcript State Machine (Soravo — PRESERVED)                  │
│   ├── TranscriptOrder: session_id + sequence stale reject      │
│   ├── TranscriptState: tentative→committed→final               │
│   └── Only committed/final text reaches TypingEngine           │
├─────────────────────────────────────────────────────────────────┤
│ SpeechEngine Trait (Soravo — PRESERVED)                        │
│   ├── WhisperEngine → wraps transcribe-cpp Session             │
│   ├── ParakeetEngine → wraps transcribe-rs ParakeetModel       │
│   └── Benchmark harness compatible                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features Implemented

### 1. Streaming Transcription with Partial/Final Segmentation
- `StreamTextEvent { committed: String, tentative: String }` — directly from Handy
- Committed text is stable (won't be rewritten)
- Tentative text is volatile (may be rewritten)
- Only committed/final text reaches the typing layer

### 2. VAD Integration
- `VadPolicy::Streaming` (1650ms hangover) for streaming models
- `VadPolicy::Offline` (450ms hangover) for batch models
- `VadPolicy::Disabled` bypasses VAD entirely
- VAD controls recognition work, NOT capture (audio always captured)

### 3. Engine Abstraction (`SpeechEngine`)
```rust
trait SpeechEngine: Send {
    fn initialize(&mut self, model_path: &str, config: &TranscriptionConfig) -> Result<(), SpeechError>;
    fn process_audio(&mut self, audio: &[f32]) -> Result<Vec<TranscriptionResult>, SpeechError>;
    fn finalize(&mut self) -> Result<Vec<TranscriptionResult>, SpeechError>;
    fn reset(&mut self);
    fn supports_streaming(&self) -> bool { false }
    fn supported_languages(&self) -> Vec<String> { vec![] }
}
```

### 4. Whisper Engine (`transcribe-cpp`)
- Streaming via `Session::stream()` with `StreamOptions`
- Committed/tentative text from `Stream::text()`
- Batch fallback via `Session::run()`
- Capability detection (streaming, translation, language detect)

### 5. Parakeet Engine (`transcribe-rs` ONNX)
- Currently batch-only (no native streaming in transcribe-rs)
- Returns final results via `process_audio`
- Future: chunked processing for partials

### 6. Silero VAD (from Handy)
- Neural VAD using `vad-rs` crate
- 30ms frames (480 samples at 16kHz)
- LSTM-based, high accuracy
- Requires ONNX model file (`silero_vad.onnx`)

---

## Performance Targets (from spec)

| Metric | Target |
|--------|--------|
| Warm hotkey → capture ready | <50 ms |
| First useful partial | <300 ms |
| Speech end → final | <500 ms |
| Committed injection | <50 ms |
| Warm startup | <2 s |

---

## Tests

All tests pass:
- **soravo-stt**: 27 tests (engine init, streaming events, router, worker perf, benchmark)
- **soravo-audio**: 27 tests (recorder, resampler, Earshot VAD, Silero VAD, Smoothed VAD)
- **soravo-transcript**: 6 tests (session isolation, ordering, tentative guard, stale rejection)
- **soravo-typing**: 9 tests (injection, clipboard, config)
- **workspace**: All crates compile and test cleanly

---

## Code Quality

- ✅ `cargo check --workspace` — clean
- ✅ `cargo clippy --workspace` — clean
- ✅ `cargo fmt --all -- --check` — clean
- ✅ `cargo test --workspace` — all pass
- ✅ `#![forbid(unsafe_code)]` on all new modules
- ✅ Proper error handling with `anyhow`/`thiserror`

---

## Integration Points (for STT-004+)

1. **AudioRecorder** → `with_audio_callback` feeds `StreamRouter.feed()`
2. **StreamRouter** → `StreamTextEvent` emitted to UI
3. **TranscriptState** → consumes committed/final, rejects tentative
4. **TypingEngine** → receives only committed/final text
5. **BenchmarkHarness** → measures streaming metrics

---

## Next Steps (STT-004)

1. Integrate `StreamRouter` with `AudioRecorder` in the desktop app
2. Connect `StreamTextEvent` emission to UI overlay
3. Wire `TranscriptState` to consume streaming output
4. Add benchmark integration for streaming metrics
5. Implement model download/verification for transcribe-cpp/transcribe-rs models
6. Add Parakeet streaming support when transcribe-rs adds it

---

## Reuse Audit Compliance

✅ **Handy source actually inspected** — `/tmp/handy-src` at pinned commit  
✅ **Reuse opportunities exhausted** — Audio/VAD kept, STT streaming adopted  
✅ **Audio replacement evaluated** — Soravo equivalent, no replacement  
✅ **Architecture documented** — This summary + STT-003-HANDY-REUSE-AUDIT.md  
✅ **Licensing verified** — All deps MIT/Apache-2.0 compatible  
✅ **Security preserved** — Soravo model security layer kept  
✅ **Tests pass** — All workspace tests green  
✅ **CI ready** — cargo check/clippy/fmt/test all clean