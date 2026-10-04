//! Minimal 16 kHz mono PCM16 WAV helpers for the desktop shell.
//!
//! Recordings handled here are single-channel 16 kHz `f32` samples (see
//! `WHISPER_SAMPLE_RATE` in the audio manager). The writer emits a canonical
//! 44-byte header + `data` chunk; the reader walks subchunks so files with
//! extra chunks still parse. No third-party dependency: std only.

use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;

/// Sample rate (Hz) of the recordings this module persists.
pub const WAV_SAMPLE_RATE: u32 = 16_000;
/// Channel count of the recordings this module persists.
pub const WAV_CHANNELS: u16 = 1;

fn write_u16_le(buf: &mut Vec<u8>, v: u16) {
    buf.extend_from_slice(&v.to_le_bytes());
}

fn write_u32_le(buf: &mut Vec<u8>, v: u32) {
    buf.extend_from_slice(&v.to_le_bytes());
}

fn read_u16_le(b: &[u8]) -> u16 {
    u16::from_le_bytes([b[0], b[1]])
}

fn read_u32_le(b: &[u8]) -> u32 {
    u32::from_le_bytes([b[0], b[1], b[2], b[3]])
}

/// Persist 16 kHz mono samples as 16-bit PCM WAV.
pub fn save_wav_file(path: &Path, samples: &[f32]) -> Result<(), String> {
    let mut out = Vec::with_capacity(44 + samples.len() * 2);
    out.extend_from_slice(b"RIFF");
    write_u32_le(&mut out, 36 + (samples.len() as u32) * 2);
    out.extend_from_slice(b"WAVE");
    out.extend_from_slice(b"fmt ");
    write_u32_le(&mut out, 16);
    write_u16_le(&mut out, 1); // PCM
    write_u16_le(&mut out, WAV_CHANNELS);
    write_u32_le(&mut out, WAV_SAMPLE_RATE);
    write_u32_le(&mut out, WAV_SAMPLE_RATE * u32::from(WAV_CHANNELS) * 2);
    write_u16_le(&mut out, WAV_CHANNELS * 2); // block align
    write_u16_le(&mut out, 16); // bits per sample
    out.extend_from_slice(b"data");
    write_u32_le(&mut out, (samples.len() as u32) * 2);
    for s in samples {
        let clamped = s.clamp(-1.0, 1.0);
        out.extend_from_slice(&((clamped * 32767.0) as i16).to_le_bytes());
    }
    File::create(path)
        .and_then(|mut f| f.write_all(&out).map(|()| f))
        .and_then(|mut f| f.flush())
        .map_err(|e| format!("failed to write {}: {e}", path.display()))?;
    Ok(())
}

struct WavHeader {
    channels: u16,
    data_bytes: usize,
}

fn parse_wav_header(bytes: &[u8]) -> Result<(WavHeader, usize), String> {
    if bytes.len() < 12 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("not a WAV file (missing RIFF/WAVE)".to_string());
    }
    let mut pos = 12;
    let mut channels: Option<u16> = None;
    let mut data: Option<(usize, usize)> = None;
    while pos + 8 <= bytes.len() {
        let id = &bytes[pos..pos + 4];
        let size = read_u32_le(&bytes[pos + 4..pos + 8]) as usize;
        let body = pos + 8;
        if body + size > bytes.len() {
            return Err("truncated WAV chunk".to_string());
        }
        if id == b"fmt " {
            if size < 16 {
                return Err("invalid WAV fmt chunk".to_string());
            }
            let format = read_u16_le(&bytes[body..body + 2]);
            if format != 1 {
                return Err(format!("unsupported WAV format {format} (expected PCM)"));
            }
            channels = Some(read_u16_le(&bytes[body + 2..body + 4]));
            let bits = read_u16_le(&bytes[body + 14..body + 16]);
            if bits != 16 {
                return Err(format!("unsupported WAV bit depth {bits} (expected 16)"));
            }
        } else if id == b"data" {
            data = Some((body, size));
        }
        pos = body + size + (size & 1);
    }
    match (channels, data) {
        (Some(channels), Some((offset, size))) => Ok((
            WavHeader {
                channels,
                data_bytes: size,
            },
            offset,
        )),
        _ => Err("WAV file is missing fmt or data chunk".to_string()),
    }
}

/// Load 16-bit PCM WAV samples as mono `f32` (multi-channel input is averaged).
pub fn read_wav_samples(path: &Path) -> Result<Vec<f32>, String> {
    let mut bytes = Vec::new();
    File::open(path)
        .and_then(|mut f| f.read_to_end(&mut bytes))
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let (header, offset) = parse_wav_header(&bytes)?;
    if header.channels == 0 {
        return Err("WAV file reports zero channels".to_string());
    }
    let frames = header.data_bytes / (2 * usize::from(header.channels));
    let mut samples = Vec::with_capacity(frames);
    for frame in 0..frames {
        let mut acc = 0.0f32;
        for ch in 0..usize::from(header.channels) {
            let at = offset + (frame * usize::from(header.channels) + ch) * 2;
            let v = i16::from_le_bytes([bytes[at], bytes[at + 1]]);
            acc += f32::from(v) / 32768.0;
        }
        samples.push(acc / header.channels as f32);
    }
    Ok(samples)
}

/// Verify a file previously written by [`save_wav_file`]: valid header and
/// exactly `expected_samples` mono samples.
pub fn verify_wav_file(path: &Path, expected_samples: usize) -> Result<(), String> {
    let samples = read_wav_samples(path)?;
    if samples.len() != expected_samples {
        return Err(format!(
            "WAV sample count mismatch: expected {expected_samples}, found {}",
            samples.len()
        ));
    }
    Ok(())
}
