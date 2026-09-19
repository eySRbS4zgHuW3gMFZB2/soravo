#![forbid(unsafe_code)]
//! Streaming worker thread for live transcription.
//!
//! Adapted from Handy's TranscriptionManager::run_stream_worker.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use crossbeam_channel::{Receiver, Sender};

use super::stream_events::{FinalizedStreamText, OutputLanguageEvidence, StreamTextEvent};
use super::stream_router::StreamCmd;
use super::SpeechEngine;

/// Configuration for the streaming worker.
pub struct StreamWorkerConfig {
    pub model_id: String,
    pub supported_languages: Vec<String>,
    pub output_language: OutputLanguageEvidence,
    pub text_emitter: Box<dyn Fn(&StreamTextEvent) + Send + 'static>,
    pub phase_emitter: Box<dyn Fn(super::stream_events::StreamPhaseEvent) + Send + 'static>,
    pub engine_return: Sender<Box<dyn SpeechEngine + Send>>,
}

/// Run the streaming worker loop.
///
/// This function takes ownership of the engine and runs until it receives
/// a Finalize or Cancel command. It returns the engine back to the caller
/// via the `engine_return` channel.
pub fn run_stream_worker<E>(mut engine: E, rx: Receiver<StreamCmd>, config: StreamWorkerConfig)
where
    E: SpeechEngine + Send + 'static,
{
    let _stream_active = StreamActiveGuard::new();

    // Emit initial listening phase
    (config.phase_emitter)(super::stream_events::StreamPhaseEvent::listening());

    let mut perf = StreamPerf::new();
    let mut finalize_reply: Option<Sender<Option<FinalizedStreamText>>> = None;
    let mut finalize_result: Option<Option<FinalizedStreamText>> = None;

    while let Ok(cmd) = rx.recv() {
        match cmd {
            StreamCmd::Feed(pcm) => {
                perf.record_feed(pcm.len());
                let feed_start = Instant::now();

                // Process audio through the engine
                match engine.process_audio(&pcm) {
                    Ok(results) => {
                        perf.record_compute(feed_start.elapsed());

                        for result in results {
                            if result.is_final {
                                // For final results, we still emit as committed
                                (config.text_emitter)(&StreamTextEvent::new(
                                    result.text,
                                    String::new(),
                                ));
                            } else {
                                // Partial results: emit as committed + tentative
                                // The engine should provide the split if it supports it
                                (config.text_emitter)(&StreamTextEvent::new(
                                    result.text,
                                    String::new(),
                                ));
                            }
                        }
                        perf.maybe_log();
                    }
                    Err(e) => {
                        perf.record_compute(feed_start.elapsed());
                        log::warn!("Stream feed failed: {}", e);
                    }
                }
            }
            StreamCmd::Finalize(reply) => {
                let finalize_start = Instant::now();
                let result = match engine.finalize() {
                    Ok(results) => {
                        perf.record_compute(finalize_start.elapsed());

                        let text = if results.is_empty() {
                            String::new()
                        } else {
                            // Concatenate all final results
                            results
                                .iter()
                                .map(|r| r.text.as_str())
                                .collect::<Vec<_>>()
                                .join(" ")
                        };

                        perf.log_finalized(text.len());

                        Some(FinalizedStreamText::new(
                            text,
                            config.output_language.clone(),
                            config.supported_languages.clone(),
                        ))
                    }
                    Err(e) => {
                        perf.record_compute(finalize_start.elapsed());
                        log::error!(
                            "Stream finalize failed: {}; falling back to batch transcription",
                            e
                        );
                        None
                    }
                };
                finalize_reply = Some(reply);
                finalize_result = Some(result);
                break;
            }
            StreamCmd::Cancel => {
                log::info!("Stream cancelled");
                break;
            }
        }
    }

    // Send finalize reply if we have one
    if let (Some(reply), Some(result)) = (finalize_reply, finalize_result) {
        let _ = reply.send(result);
    }

    // Return the engine to the caller
    let _ = config.engine_return.send(Box::new(engine));
}

/// RAII guard that tracks stream active state.
struct StreamActiveGuard {
    active: Arc<AtomicBool>,
}

impl StreamActiveGuard {
    fn new() -> Self {
        let active = Arc::new(AtomicBool::new(true));
        // In a real implementation, this would be shared with the manager
        // For now, just track locally
        Self { active }
    }
}

impl Drop for StreamActiveGuard {
    fn drop(&mut self) {
        self.active.store(false, Ordering::Release);
    }
}

/// Performance tracking for streaming.
struct StreamPerf {
    feed_count: u64,
    total_feed_samples: u64,
    total_compute_time: Duration,
    last_log: Instant,
}

impl StreamPerf {
    fn new() -> Self {
        Self {
            feed_count: 0,
            total_feed_samples: 0,
            total_compute_time: Duration::ZERO,
            last_log: Instant::now(),
        }
    }

    fn record_feed(&mut self, samples: usize) {
        self.feed_count += 1;
        self.total_feed_samples += samples as u64;
    }

    fn record_compute(&mut self, elapsed: Duration) {
        self.total_compute_time += elapsed;
    }

    fn maybe_log(&mut self) {
        const LOG_INTERVAL: Duration = Duration::from_secs(5);
        if self.last_log.elapsed() >= LOG_INTERVAL {
            log::debug!(
                "Stream perf: feeds={}, samples={}, compute_time={:?}",
                self.feed_count,
                self.total_feed_samples,
                self.total_compute_time
            );
            self.last_log = Instant::now();
        }
    }

    fn log_finalized(&self, chars: usize) {
        log::info!(
            "Stream finalized: {} chars, {} feeds, {:?} compute",
            chars,
            self.feed_count,
            self.total_compute_time
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crossbeam_channel::unbounded;

    #[test]
    fn stream_perf_tracks_feeds() {
        let mut perf = StreamPerf::new();
        perf.record_feed(480);
        perf.record_feed(480);
        assert_eq!(perf.feed_count, 2);
        assert_eq!(perf.total_feed_samples, 960);
    }

    #[test]
    fn stream_perf_tracks_compute() {
        let mut perf = StreamPerf::new();
        perf.record_compute(Duration::from_millis(10));
        perf.record_compute(Duration::from_millis(20));
        assert_eq!(perf.total_compute_time, Duration::from_millis(30));
    }
}
