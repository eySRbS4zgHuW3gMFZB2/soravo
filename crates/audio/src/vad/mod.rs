use anyhow::Result;

use crate::constants;

/// Duration constants for VAD timing (in milliseconds).
pub const VAD_PREFILL_MS: u64 = 450;
pub const VAD_OFFLINE_HANGOVER_MS: u64 = 450;
pub const VAD_STREAMING_HANGOVER_MS: u64 = 1650;
pub const VAD_ONSET_MS: u64 = 60;

/// Convert a VAD timing duration to whole detector frames, rounding up so an
/// alternate backend never shortens the onset, pre-roll, or hangover tail.
pub const fn frames_for_duration_ms(duration_ms: u64, frame_samples: usize) -> usize {
    assert!(frame_samples > 0, "frame size must be non-zero");
    let numerator = duration_ms * constants::WHISPER_SAMPLE_RATE as u64;
    let denominator = frame_samples as u64 * 1000;
    numerator.div_ceil(denominator) as usize
}

/// A single frame classification from the VAD.
pub enum VadFrame<'a> {
    /// Speech — may aggregate several frames (prefill + current + hangover).
    Speech(&'a [f32]),
    /// Non-speech (silence, noise). Downstream code can ignore it.
    Noise,
}

impl<'a> VadFrame<'a> {
    #[inline]
    pub fn is_speech(&self) -> bool {
        matches!(self, VadFrame::Speech(_))
    }
}

/// Trait for voice activity detection backends.
pub trait VoiceActivityDetector: Send + Sync {
    /// Feed one backend-sized frame, get a keep/drop decision.
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<VadFrame<'a>>;

    /// Required number of mono 16 kHz samples per prediction.
    fn frame_samples(&self) -> usize;

    /// Convenience boolean classification.
    fn is_voice(&mut self, frame: &[f32]) -> Result<bool> {
        Ok(self.push_frame(frame)?.is_speech())
    }

    /// Set the post-speech hangover tail (in backend-sized frames).
    fn set_hangover_frames(&mut self, _frames: usize) {}

    /// End-of-recording diagnostic snapshot.
    fn tail_report(&self) -> Option<VadTailReport> {
        None
    }

    fn reset(&mut self) {}
}

/// End-of-recording snapshot of a smoothing detector's state.
#[derive(Debug, Clone, Copy)]
pub struct VadTailReport {
    /// Trailing frames buffered but never emitted downstream.
    pub withheld_frames: usize,
    /// How many of those withheld frames the inner VAD classified as voiced.
    pub withheld_voiced_frames: usize,
    pub in_speech: bool,
    /// Voiced frames counted toward an unconfirmed speech onset.
    pub onset_counter: usize,
    pub hangover_counter: usize,
}

mod earshot;
mod silero;
mod smoothed;

pub use earshot::EarshotVad;
pub use silero::SileroVad;
pub use smoothed::SmoothedVad;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn duration_profiles_preserve_earshot_timings() {
        assert_eq!(frames_for_duration_ms(VAD_PREFILL_MS, 256), 29);
        assert_eq!(frames_for_duration_ms(VAD_OFFLINE_HANGOVER_MS, 256), 29);
        assert_eq!(frames_for_duration_ms(VAD_STREAMING_HANGOVER_MS, 256), 104);
        assert_eq!(frames_for_duration_ms(VAD_ONSET_MS, 256), 4);
    }

    #[test]
    fn duration_profiles_preserve_30ms_frame_timings() {
        assert_eq!(frames_for_duration_ms(VAD_PREFILL_MS, 480), 15);
        assert_eq!(frames_for_duration_ms(VAD_OFFLINE_HANGOVER_MS, 480), 15);
        assert_eq!(frames_for_duration_ms(VAD_STREAMING_HANGOVER_MS, 480), 55);
        assert_eq!(frames_for_duration_ms(VAD_ONSET_MS, 480), 2);
    }
}
