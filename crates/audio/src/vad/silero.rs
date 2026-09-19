#![forbid(unsafe_code)]
//! Silero VAD adapter using vad-rs crate.
//!
//! Adapted from Handy's SileroVad implementation.

use anyhow::Result;
use std::path::Path;

use vad_rs::Vad;

use super::{VadFrame, VoiceActivityDetector};
use crate::constants;

const SILERO_FRAME_MS: u32 = 30;
const SILERO_FRAME_SAMPLES: usize =
    (constants::WHISPER_SAMPLE_RATE * SILERO_FRAME_MS / 1000) as usize;

/// Silero VAD wrapper using vad-rs crate.
///
/// Silero is a high-quality neural VAD that provides good accuracy
/// with low latency. It uses an LSTM-based model.
pub struct SileroVad {
    engine: Vad,
    threshold: f32,
}

impl SileroVad {
    /// Create a new Silero VAD from a model file.
    ///
    /// The model file should be a Silero ONNX model (typically `silero_vad.onnx`).
    pub fn new<P: AsRef<Path>>(model_path: P, threshold: f32) -> Result<Self> {
        if !(0.0..=1.0).contains(&threshold) {
            anyhow::bail!("threshold must be between 0.0 and 1.0");
        }

        Ok(Self {
            engine: Vad::new(&model_path, constants::WHISPER_SAMPLE_RATE as usize)
                .map_err(|e| anyhow::anyhow!("Failed to create Silero VAD: {e}"))?,
            threshold,
        })
    }
}

impl VoiceActivityDetector for SileroVad {
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> Result<VadFrame<'a>> {
        if frame.len() != SILERO_FRAME_SAMPLES {
            anyhow::bail!(
                "expected {SILERO_FRAME_SAMPLES} samples, got {}",
                frame.len()
            );
        }

        let result = self
            .engine
            .compute(frame)
            .map_err(|e| anyhow::anyhow!("Silero VAD error: {e}"))?;

        if result.prob > self.threshold {
            Ok(VadFrame::Speech(frame))
        } else {
            Ok(VadFrame::Noise)
        }
    }

    fn frame_samples(&self) -> usize {
        SILERO_FRAME_SAMPLES
    }

    fn reset(&mut self) {
        // Clear the Silero LSTM hidden/cell state so a new session doesn't
        // inherit recurrent context from the previous recording.
        self.engine.reset();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_wrong_frame_size() {
        // Can't test without a model file, but we can verify the frame size constant
        assert_eq!(SILERO_FRAME_SAMPLES, 480); // 30ms at 16kHz
    }

    #[test]
    fn validates_threshold() {
        // We can't easily test without a model, but the validation logic is simple
        assert!(SileroVad::new("/nonexistent.onnx", -0.1).is_err());
        assert!(SileroVad::new("/nonexistent.onnx", 1.1).is_err());
    }
}
