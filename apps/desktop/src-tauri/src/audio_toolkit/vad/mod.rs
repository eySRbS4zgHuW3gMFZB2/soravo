//! Voice Activity Detection (VAD) re-exports for the desktop shell.
//!
//! The implementation lives in `soravo-audio`; this module re-exports the
//! exact surface the desktop managers consume so `crate::audio_toolkit::vad`
//! paths resolve without a duplicate stack (see 04_HANDY_FORK_AND_REUSE_POLICY).

pub use soravo_audio::vad::{
    frames_for_duration_ms, EarshotVad, SileroVad, SmoothedVad, VadFrame, VadTailReport,
    VoiceActivityDetector, VAD_OFFLINE_HANGOVER_MS, VAD_ONSET_MS, VAD_PREFILL_MS,
    VAD_STREAMING_HANGOVER_MS,
};
