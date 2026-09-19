#![forbid(unsafe_code)]
//! STT engine implementations.

pub mod parakeet;
pub mod whisper;

pub use parakeet::ParakeetEngine;
pub use whisper::WhisperEngine;
