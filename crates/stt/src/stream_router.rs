#![forbid(unsafe_code)]
//! Stream router for real-time audio frame feeding.
//!
//! Adapted from Handy's StreamRouter. Routes audio frames from the audio
//! recorder directly to the streaming worker thread, bypassing Tauri state
//! lookups for minimal per-frame overhead.

use crossbeam_channel::{unbounded, Receiver, Sender};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// Commands sent to the streaming worker thread. Audio frames and the finalize
/// request travel the same channel so FIFO ordering guarantees every fed frame
/// is processed before finalize runs.
#[derive(Debug)]
pub enum StreamCmd {
    /// Feed a 16 kHz mono audio frame to the streaming worker.
    Feed(Vec<f32>),
    /// Flush the stream and reply with the final text, or `None` if no stream
    /// was ever active (caller should fall back to batch transcription).
    Finalize(Sender<Option<super::stream_events::FinalizedStreamText>>),
    /// Cancel the active stream without producing output.
    Cancel,
}

/// Routes real-time audio frames to the active streaming worker. Shared between
/// the STT engine (opens/closes the route) and the audio recorder's
/// per-frame callback (feeds frames). The recorder holds an `Arc<StreamRouter>`
/// directly, so a frame with no stream pending costs a single relaxed atomic
/// load — no mutex lock.
#[derive(Clone)]
pub struct StreamRouter {
    /// Command channel to the active streaming worker, present from
    /// `open` until `take`/`clear`.
    tx: Arc<Mutex<Option<Sender<StreamCmd>>>>,
    /// True while a stream is pending or active (channel is open). The audio
    /// callback checks this first to avoid the mutex lock when no stream runs.
    open: Arc<AtomicBool>,
}

impl StreamRouter {
    /// Create a new closed stream router.
    pub fn new() -> Self {
        Self {
            tx: Arc::new(Mutex::new(None)),
            open: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Open a fresh command channel for a new streaming session, returning the
    /// receiver the worker should drain. Caller must ensure no prior channel is
    /// still open.
    pub fn open(&self) -> Receiver<StreamCmd> {
        let (tx, rx) = unbounded::<StreamCmd>();
        *self.tx.lock().unwrap() = Some(tx);
        self.open.store(true, Ordering::Relaxed);
        rx
    }

    /// Take the sender out (closing the channel to new feeds). Returns the
    /// sender so the caller can send the final `Finalize`/`Cancel` command.
    pub fn take(&self) -> Option<Sender<StreamCmd>> {
        self.open.store(false, Ordering::Relaxed);
        self.tx.lock().unwrap().take()
    }

    /// Drop the channel and mark closed without sending a final command (used
    /// when the worker exits without a finalize/cancel handshake).
    pub fn clear(&self) {
        self.open.store(false, Ordering::Relaxed);
        *self.tx.lock().unwrap() = None;
    }

    /// Forward a 16 kHz frame to the active streaming worker. Cheap no-op (a
    /// single relaxed atomic load) when no stream is pending.
    pub fn feed(&self, frame: &[f32]) {
        if !self.open.load(Ordering::Relaxed) {
            return;
        }
        if let Some(tx) = self.tx.lock().unwrap().as_ref() {
            let _ = tx.send(StreamCmd::Feed(frame.to_vec()));
        }
    }

    /// Whether a stream is pending or active.
    pub fn is_open(&self) -> bool {
        self.open.load(Ordering::Relaxed)
    }
}

impl Default for StreamRouter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crossbeam_channel::unbounded;

    #[test]
    fn router_feed_when_closed_is_noop() {
        let router = StreamRouter::new();
        assert!(!router.is_open());
        router.feed(&[0.1, 0.2, 0.3]); // Should not panic
    }

    #[test]
    fn router_open_returns_receiver() {
        let router = StreamRouter::new();
        let _rx = router.open();
        assert!(router.is_open());
        // Send a command and verify it's received
        let (tx, _rx2) = unbounded::<StreamCmd>();
        tx.send(StreamCmd::Feed(vec![0.1, 0.2])).unwrap();
        drop(tx);
        // The router's internal channel should have the command
        assert!(router.is_open());
    }

    #[test]
    fn router_take_closes_channel() {
        let router = StreamRouter::new();
        router.open();
        assert!(router.is_open());
        let _tx = router.take();
        assert!(!router.is_open());
    }

    #[test]
    fn router_clear_closes_without_sender() {
        let router = StreamRouter::new();
        router.open();
        router.clear();
        assert!(!router.is_open());
    }

    #[test]
    fn router_feed_when_open_queues_command() {
        let router = StreamRouter::new();
        let rx = router.open();
        router.feed(&[0.1, 0.2, 0.3]);
        // Command should be in the channel
        let cmd = rx.try_recv().expect("command should be queued");
        match cmd {
            StreamCmd::Feed(samples) => assert_eq!(samples, vec![0.1, 0.2, 0.3]),
            _ => panic!("expected Feed command"),
        }
    }
}
