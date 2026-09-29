//! Audio toolkit module - provides audio capture and VAD functionality.
//!
//! This module integrates audio capture capabilities with voice activity detection.
//! It re-exports the soravo-audio crate functionality for use by the desktop shell.

pub mod audio;
pub mod post_process;
pub mod vad;
pub mod wav;

pub use audio::{
    is_microphone_access_denied, is_no_input_device_error, list_input_devices, list_output_devices,
    AudioRecorder, CpalDeviceInfo, VadPolicy,
};
pub use post_process::{
    apply_custom_words, detect_output_language, normalize_transcription_output,
    remove_filler_words, OutputLanguageEvidence,
};
pub use soravo_audio::vad::{
    frames_for_duration_ms, EarshotVad, SileroVad, SmoothedVad, VadFrame, VadTailReport,
    VoiceActivityDetector, VAD_OFFLINE_HANGOVER_MS, VAD_ONSET_MS, VAD_PREFILL_MS,
    VAD_STREAMING_HANGOVER_MS,
};
pub use wav::{read_wav_samples, save_wav_file, verify_wav_file};

pub fn get_cpal_host() -> cpal::Host {
    cpal::default_host()
}
