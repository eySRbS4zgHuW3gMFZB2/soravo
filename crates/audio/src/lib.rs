pub mod audio;
pub mod constants;
pub mod vad;

pub use audio::{AudioRecorder, VadPolicy};
pub use constants::*;
pub use vad::{VadFrame, VadTailReport, VoiceActivityDetector};

pub(crate) fn get_cpal_host() -> cpal::Host {
    cpal::default_host()
}
