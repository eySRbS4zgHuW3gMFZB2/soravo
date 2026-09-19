use rubato::{FftFixedIn, Resampler};
use std::time::Duration;

const RESAMPLER_CHUNK_SIZE: usize = 1024;

pub struct FrameResampler {
    resampler: Option<FftFixedIn<f32>>,
    chunk_in: usize,
    in_buf: Vec<f32>,
    frame_samples: usize,
    pending: Vec<f32>,
    in_hz: usize,
    out_hz: usize,
    in_count: usize,
    out_count: usize,
}

impl FrameResampler {
    pub fn new(in_hz: usize, out_hz: usize, frame_dur: Duration) -> Self {
        let frame_samples = ((out_hz as f64 * frame_dur.as_secs_f64()).round()) as usize;
        assert!(frame_samples > 0, "frame duration too short");

        let chunk_in = RESAMPLER_CHUNK_SIZE;
        let resampler = (in_hz != out_hz).then(|| {
            FftFixedIn::<f32>::new(in_hz, out_hz, chunk_in, 1, 1)
                .expect("Failed to create resampler")
        });

        Self {
            resampler,
            chunk_in,
            in_buf: Vec::with_capacity(chunk_in),
            frame_samples,
            pending: Vec::with_capacity(frame_samples),
            in_hz,
            out_hz,
            in_count: 0,
            out_count: 0,
        }
    }

    pub fn push(&mut self, mut src: &[f32], mut emit: impl FnMut(&[f32])) {
        if self.resampler.is_none() {
            self.emit_frames(src, &mut emit);
            return;
        }
        self.in_count += src.len();

        while !src.is_empty() {
            let space = self.chunk_in - self.in_buf.len();
            let take = space.min(src.len());
            self.in_buf.extend_from_slice(&src[..take]);
            src = &src[take..];

            if self.in_buf.len() == self.chunk_in {
                if let Ok(out) = self
                    .resampler
                    .as_mut()
                    .unwrap()
                    .process(&[&self.in_buf[..]], None)
                {
                    self.out_count += out[0].len();
                    self.emit_frames(&out[0], &mut emit);
                }
                self.in_buf.clear();
            }
        }
    }

    pub fn finish(&mut self, mut emit: impl FnMut(&[f32])) {
        if self.resampler.is_some() {
            if !self.in_buf.is_empty() {
                if let Ok(out) = self
                    .resampler
                    .as_mut()
                    .unwrap()
                    .process_partial(Some(&[&self.in_buf[..]]), None)
                {
                    self.out_count += out[0].len();
                    self.emit_frames(&out[0], &mut emit);
                }
                self.in_buf.clear();
            }

            if self.in_count > 0 {
                let delay = self.resampler.as_ref().unwrap().output_delay();
                let expected = self.in_count * self.out_hz / self.in_hz + delay;
                let mut rounds = 0;
                while self.out_count < expected && rounds < 8 {
                    rounds += 1;
                    if let Ok(out) = self
                        .resampler
                        .as_mut()
                        .unwrap()
                        .process_partial::<&[f32]>(None, None)
                    {
                        let take = (expected - self.out_count).min(out[0].len());
                        self.out_count += take;
                        self.emit_frames(&out[0][..take], &mut emit);
                    }
                }
            }
        }

        if !self.pending.is_empty() {
            self.pending.resize(self.frame_samples, 0.0);
            emit(&self.pending);
            self.pending.clear();
        }
    }

    pub fn reset(&mut self) {
        self.in_buf.clear();
        self.pending.clear();
        self.in_count = 0;
        self.out_count = 0;
        if let Some(ref mut resampler) = self.resampler {
            resampler.reset();
        }
    }

    fn emit_frames(&mut self, mut data: &[f32], emit: &mut impl FnMut(&[f32])) {
        while !data.is_empty() {
            let space = self.frame_samples - self.pending.len();
            let take = space.min(data.len());
            self.pending.extend_from_slice(&data[..take]);
            data = &data[take..];

            if self.pending.len() == self.frame_samples {
                emit(&self.pending);
                self.pending.clear();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sine_wave(sample_rate: usize, freq: f64, duration_secs: f64) -> Vec<f32> {
        let n = (sample_rate as f64 * duration_secs) as usize;
        (0..n)
            .map(|i| {
                (2.0 * std::f64::consts::PI * freq * i as f64 / sample_rate as f64).sin() as f32
            })
            .collect()
    }

    fn collect_output(resampler: &mut FrameResampler, input: &[f32]) -> Vec<f32> {
        let mut out = Vec::new();
        resampler.push(input, |frame| out.extend_from_slice(frame));
        out
    }

    #[test]
    fn reset_clears_in_buf_and_pending() {
        let mut r = FrameResampler::new(48000, 16000, Duration::from_millis(30));
        let partial = vec![0.5f32; 500];
        let _ = collect_output(&mut r, &partial);
        r.reset();
        let silence = vec![0.0f32; 4096];
        let out = collect_output(&mut r, &silence);
        let max_abs = out.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        assert!(max_abs < 0.01);
    }

    #[test]
    fn reset_clears_fft_overlap_buffers() {
        let mut r = FrameResampler::new(48000, 16000, Duration::from_millis(30));
        let sine = sine_wave(48000, 1000.0, 0.5);
        let _ = collect_output(&mut r, &sine);
        r.finish(|_| {});
        r.reset();
        let silence = vec![0.0f32; 4096];
        let out = collect_output(&mut r, &silence);
        let max_abs = out.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        assert!(max_abs < 0.01);
    }

    #[test]
    fn reset_between_recordings_no_crosstalk() {
        let mut r = FrameResampler::new(48000, 16000, Duration::from_millis(30));
        let ramp: Vec<f32> = (0..48000).map(|i| i as f32 / 48000.0).collect();
        let out1 = collect_output(&mut r, &ramp);
        r.finish(|_| {});
        assert!(!out1.is_empty());
        r.reset();
        let dc = vec![-0.5f32; 48000];
        let out2 = collect_output(&mut r, &dc);
        if out2.len() > 480 {
            let tail = &out2[480..];
            for (i, &s) in tail.iter().enumerate() {
                assert!(
                    (s - (-0.5)).abs() < 0.05,
                    "Recording 2 sample {} = {} (expected ~-0.5)",
                    i + 480,
                    s
                );
            }
        }
    }

    #[test]
    fn finish_flushes_resampler_delay() {
        let mut rs = FrameResampler::new(48000, 16000, Duration::from_millis(30));
        let mut input = vec![0.0f32; 4 * RESAMPLER_CHUNK_SIZE];
        input[4 * RESAMPLER_CHUNK_SIZE - 200..].fill(0.5);
        let mut out = Vec::new();
        rs.push(&input, |frame| out.extend_from_slice(frame));
        rs.finish(|frame| out.extend_from_slice(frame));
        let max_abs = out.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        assert!(max_abs > 0.3, "tail burst was lost");
    }
}
