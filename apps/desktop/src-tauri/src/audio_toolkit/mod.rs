//! Audio toolkit module - provides audio capture and VAD functionality.
//!
//! This module integrates audio capture capabilities with voice activity detection.
//! It re-exports the soravo-audio crate functionality for use by the desktop shell.

pub use soravo_audio::{AudioRecorder, VadPolicy};
pub use soravo_audio::audio::{list_input_devices, list_output_devices, CpalDeviceInfo};
pub use soravo_audio::vad::{
    EarshotVad, SileroVad, SmoothedVad, VoiceActivityDetector, VadFrame, VadTailReport,
    VAD_PREFILL_MS, VAD_OFFLINE_HANGOVER_MS, VAD_STREAMING_HANGOVER_MS, VAD_ONSET_MS,
    frames_for_duration_ms,
};

pub mod vad;
