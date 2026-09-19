/// Target sample rate for audio processing (Whisper standard).
pub const WHISPER_SAMPLE_RATE: u32 = 16000;

/// Ring buffer capacity in seconds. Absorbs consumer stalls without adding
/// latency during normal 10ms drains.
pub const AUDIO_RING_SECONDS: usize = 2;

/// Maximum duration of a single drain chunk to prevent consumer stalls.
pub const MAX_DRAIN_CHUNK_MS: u64 = 50;

/// Timeout for pause acknowledgement from the audio callback.
pub const PAUSE_ACK_TIMEOUT_MS: u64 = 2000;

/// Consumer poll interval when the ring is empty.
pub const CONSUMER_POLL_INTERVAL_MS: u64 = 10;
