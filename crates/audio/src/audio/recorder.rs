use std::{
    io::Error,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc, Arc, Mutex,
    },
    time::{Duration, Instant},
};

use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    Device, Sample, SizedSample,
};
use rtrb::{Consumer, Producer, RingBuffer};

use crate::audio::resampler::FrameResampler;
use crate::constants;
use crate::vad::{self, VadFrame};

pub(crate) enum Cmd {
    Start(VadPolicy, Instant, mpsc::Sender<()>),
    Stop(mpsc::Sender<Vec<f32>>),
    Shutdown,
}

#[derive(Default)]
pub(crate) struct CaptureTransportState {
    pause_requested: AtomicBool,
    pause_acknowledged: AtomicBool,
    overrun_samples: AtomicU64,
}

/// How 16 kHz mono frames should be filtered for one recording session.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum VadPolicy {
    Disabled,
    Offline,
    Streaming,
}

#[derive(Clone)]
struct VadConfig {
    detector: Arc<Mutex<Box<dyn vad::VoiceActivityDetector>>>,
    frame_samples: usize,
    offline_hangover_frames: usize,
    streaming_hangover_frames: usize,
}

impl VadConfig {
    fn hangover_for(&self, policy: VadPolicy) -> usize {
        match policy {
            VadPolicy::Streaming => self.streaming_hangover_frames,
            VadPolicy::Offline | VadPolicy::Disabled => self.offline_hangover_frames,
        }
    }
}

pub type AudioFrameCallback = Arc<dyn Fn(&[f32]) + Send + Sync + 'static>;
pub type LevelCallback = Arc<dyn Fn(Vec<f32>) + Send + Sync + 'static>;

pub struct AudioRecorder {
    device: Option<Device>,
    cmd_tx: Option<mpsc::Sender<Cmd>>,
    worker_handle: Option<std::thread::JoinHandle<()>>,
    vad: Option<VadConfig>,
    level_cb: Option<LevelCallback>,
    audio_cb: Option<AudioFrameCallback>,
    selected_channel: Option<usize>,
    config_cache: Arc<Mutex<Option<(String, cpal::SupportedStreamConfig)>>>,
    stream_error: Arc<AtomicBool>,
}

impl AudioRecorder {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(AudioRecorder {
            device: None,
            cmd_tx: None,
            worker_handle: None,
            vad: None,
            level_cb: None,
            audio_cb: None,
            selected_channel: None,
            config_cache: Arc::new(Mutex::new(None)),
            stream_error: Arc::new(AtomicBool::new(false)),
        })
    }

    pub fn with_vad(
        mut self,
        detector: Box<dyn vad::VoiceActivityDetector>,
        offline_hangover_frames: usize,
        streaming_hangover_frames: usize,
    ) -> Self {
        let frame_samples = detector.frame_samples();
        assert!(frame_samples > 0, "VAD frame size must be non-zero");
        self.vad = Some(VadConfig {
            detector: Arc::new(Mutex::new(detector)),
            frame_samples,
            offline_hangover_frames,
            streaming_hangover_frames,
        });
        self
    }

    pub fn with_level_callback<F>(mut self, cb: F) -> Self
    where
        F: Fn(Vec<f32>) + Send + Sync + 'static,
    {
        self.level_cb = Some(Arc::new(cb));
        self
    }

    pub fn with_audio_callback<F>(mut self, cb: F) -> Self
    where
        F: Fn(&[f32]) + Send + Sync + 'static,
    {
        self.audio_cb = Some(Arc::new(cb));
        self
    }

    pub fn with_selected_channel(mut self, channel: Option<u16>) -> Self {
        self.set_selected_channel(channel);
        self
    }

    pub fn set_selected_channel(&mut self, channel: Option<u16>) {
        self.selected_channel = channel.map(usize::from);
    }

    pub fn open(&mut self, device: Option<Device>) -> Result<(), Box<dyn std::error::Error>> {
        if self.worker_handle.is_some() {
            if !self.needs_reopen() {
                return Ok(());
            }
            log::warn!("Capture stream failed; rebuilding microphone stream");
            self.close()?;
        }

        self.stream_error.store(false, Ordering::Relaxed);

        let (cmd_tx, cmd_rx) = mpsc::channel::<Cmd>();
        let (init_tx, init_rx) = mpsc::sync_channel::<Result<(), String>>(1);

        let host = crate::get_cpal_host();
        let device = match device {
            Some(dev) => dev,
            None => host
                .default_input_device()
                .ok_or_else(|| Error::new(std::io::ErrorKind::NotFound, "No input device found"))?,
        };

        let thread_device = device.clone();
        let vad = self.vad.clone();
        let level_cb = self.level_cb.clone();
        let audio_cb = self.audio_cb.clone();
        let selected_channel = self.selected_channel;
        let config_cache = Arc::clone(&self.config_cache);
        let stream_error = Arc::clone(&self.stream_error);

        let worker = std::thread::spawn(move || {
            let transport = Arc::new(CaptureTransportState::default());
            let init_result =
                (|| -> Result<(cpal::Stream, u32, Consumer<f32>), String> {
                    let config_started = Instant::now();
                    let device_name = thread_device.name().unwrap_or_default();
                    let cached_config = config_cache
                        .lock()
                        .unwrap()
                        .as_ref()
                        .filter(|(name, _)| !device_name.is_empty() && *name == device_name)
                        .map(|(_, cfg)| cfg.clone());
                    let config_was_cached = cached_config.is_some();
                    let config = match cached_config {
                        Some(cfg) => cfg,
                        None => AudioRecorder::get_preferred_config(&thread_device)
                            .map_err(|e| format!("Failed to fetch preferred config: {e}"))?,
                    };
                    let config_elapsed = config_started.elapsed();

                    let sample_rate = config.sample_rate().0;
                    let channels = config.channels() as usize;

                    log::info!(
                        "Using device: {:?}\nSample rate: {}\nChannels: {}\nFormat: {:?}",
                        thread_device.name(),
                        sample_rate,
                        channels,
                        config.sample_format()
                    );

                    if let Some(channel) = selected_channel {
                        if channel < channels {
                            log::info!("Using selected input channel: {}", channel + 1);
                        } else {
                            log::warn!(
                                "Selected input channel {} out of range; averaging all channels",
                                channel + 1
                            );
                        }
                    } else {
                        log::info!("Averaging all {} input channels", channels);
                    }

                    let build_started = Instant::now();
                    let (stream, sample_consumer) = match config.sample_format() {
                        cpal::SampleFormat::U8 => AudioRecorder::build_stream::<u8>(
                            &thread_device,
                            &config,
                            channels,
                            selected_channel,
                            Arc::clone(&transport),
                            Arc::clone(&stream_error),
                        ),
                        cpal::SampleFormat::I8 => AudioRecorder::build_stream::<i8>(
                            &thread_device,
                            &config,
                            channels,
                            selected_channel,
                            Arc::clone(&transport),
                            Arc::clone(&stream_error),
                        ),
                        cpal::SampleFormat::I16 => AudioRecorder::build_stream::<i16>(
                            &thread_device,
                            &config,
                            channels,
                            selected_channel,
                            Arc::clone(&transport),
                            Arc::clone(&stream_error),
                        ),
                        cpal::SampleFormat::I32 => AudioRecorder::build_stream::<i32>(
                            &thread_device,
                            &config,
                            channels,
                            selected_channel,
                            Arc::clone(&transport),
                            Arc::clone(&stream_error),
                        ),
                        cpal::SampleFormat::F32 => AudioRecorder::build_stream::<f32>(
                            &thread_device,
                            &config,
                            channels,
                            selected_channel,
                            Arc::clone(&transport),
                            Arc::clone(&stream_error),
                        ),
                        sample_format => {
                            return Err(format!("Unsupported sample format: {sample_format:?}"));
                        }
                    }
                    .map_err(|e| format!("Failed to build input stream: {e}"))?;
                    let build_elapsed = build_started.elapsed();

                    let play_started = Instant::now();
                    stream
                        .play()
                        .map_err(|e| format!("Failed to start microphone stream: {e}"))?;
                    log::debug!(
                    "mic worker init: fetch_config={:?} (cached={}) build_stream={:?} play={:?}",
                    config_elapsed, config_was_cached, build_elapsed, play_started.elapsed()
                );

                    if !config_was_cached && !device_name.is_empty() {
                        *config_cache.lock().unwrap() = Some((device_name, config));
                    }

                    Ok((stream, sample_rate, sample_consumer))
                })();

            match init_result {
                Ok((stream, sample_rate, sample_consumer)) => {
                    let _ = init_tx.send(Ok(()));
                    let stream_running_at = Instant::now();
                    let processor = CaptureProcessor::new(
                        sample_rate,
                        vad,
                        level_cb,
                        audio_cb,
                        stream_running_at,
                    );
                    run_consumer(
                        processor,
                        sample_consumer,
                        cmd_rx,
                        transport,
                        Arc::clone(&stream_error),
                    );
                    drop(stream);
                }
                Err(error_message) => {
                    *config_cache.lock().unwrap() = None;
                    log::error!("{error_message}");
                    let _ = init_tx.send(Err(error_message));
                }
            }
        });

        match init_rx.recv() {
            Ok(Ok(())) => {
                self.device = Some(device);
                self.cmd_tx = Some(cmd_tx);
                self.worker_handle = Some(worker);
                Ok(())
            }
            Ok(Err(error_message)) => {
                let _ = worker.join();
                let kind = if is_microphone_access_denied(&error_message) {
                    std::io::ErrorKind::PermissionDenied
                } else {
                    std::io::ErrorKind::Other
                };
                Err(Box::new(Error::new(kind, error_message)))
            }
            Err(recv_error) => {
                let _ = worker.join();
                Err(Box::new(Error::other(format!(
                    "Failed to initialize microphone worker: {recv_error}"
                ))))
            }
        }
    }

    pub fn start(
        &self,
        vad_policy: VadPolicy,
    ) -> Result<mpsc::Receiver<()>, Box<dyn std::error::Error>> {
        let tx = self
            .cmd_tx
            .as_ref()
            .ok_or_else(|| Error::other("Recorder is not open"))?;
        let (ready_tx, ready_rx) = mpsc::channel();
        tx.send(Cmd::Start(vad_policy, Instant::now(), ready_tx))?;
        Ok(ready_rx)
    }

    pub fn stop(&self) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let tx = self
            .cmd_tx
            .as_ref()
            .ok_or_else(|| Error::other("Recorder is not open"))?;
        let (resp_tx, resp_rx) = mpsc::channel();
        tx.send(Cmd::Stop(resp_tx))?;
        Ok(resp_rx.recv()?)
    }

    pub fn needs_reopen(&self) -> bool {
        self.stream_error.load(Ordering::Relaxed)
            || self
                .worker_handle
                .as_ref()
                .is_some_and(|handle| handle.is_finished())
    }

    pub fn close(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(tx) = self.cmd_tx.take() {
            let _ = tx.send(Cmd::Shutdown);
        }
        if let Some(handle) = self.worker_handle.take() {
            let _ = handle.join();
        }
        self.device = None;
        Ok(())
    }

    fn build_stream<T>(
        device: &cpal::Device,
        config: &cpal::SupportedStreamConfig,
        channels: usize,
        selected_channel: Option<usize>,
        transport: Arc<CaptureTransportState>,
        stream_error: Arc<AtomicBool>,
    ) -> Result<(cpal::Stream, Consumer<f32>), cpal::BuildStreamError>
    where
        T: Sample + SizedSample + Copy + Send + 'static,
        f32: cpal::FromSample<T>,
    {
        let ring_capacity = config.sample_rate().0 as usize * constants::AUDIO_RING_SECONDS;
        let (mut sample_producer, sample_consumer) = RingBuffer::new(ring_capacity);

        let use_channel = selected_channel.filter(|&channel| channel < channels);
        let callback_transport = Arc::clone(&transport);
        let stream_cb = move |data: &[T], _: &cpal::InputCallbackInfo| {
            Self::write_input_to_ring(
                data,
                channels,
                use_channel,
                &mut sample_producer,
                &callback_transport,
            );
        };

        let stream = device.build_input_stream(
            &config.clone().into(),
            stream_cb,
            move |_err| {
                stream_error.store(true, Ordering::Release);
            },
            None,
        )?;
        Ok((stream, sample_consumer))
    }

    pub(crate) fn write_input_to_ring<T>(
        data: &[T],
        channels: usize,
        use_channel: Option<usize>,
        producer: &mut Producer<f32>,
        transport: &CaptureTransportState,
    ) where
        T: Sample + SizedSample + Copy,
        f32: cpal::FromSample<T>,
    {
        if transport.pause_requested.load(Ordering::Acquire)
            && transport.pause_acknowledged.load(Ordering::Acquire)
        {
            return;
        }

        let frame_count = data.len() / channels;
        let writable_frames = producer.slots().min(frame_count);
        let written = if writable_frames == 0 {
            0
        } else {
            let chunk = producer
                .write_chunk_uninit(writable_frames)
                .expect("the producer just reported this many writable slots");
            if channels == 1 {
                chunk.fill_from_iter(
                    data.iter()
                        .take(writable_frames)
                        .map(|&sample| sample.to_sample::<f32>()),
                )
            } else if let Some(channel) = use_channel {
                chunk.fill_from_iter(
                    data.chunks_exact(channels)
                        .take(writable_frames)
                        .map(|frame| frame[channel].to_sample::<f32>()),
                )
            } else {
                chunk.fill_from_iter(data.chunks_exact(channels).take(writable_frames).map(
                    |frame| {
                        frame
                            .iter()
                            .map(|&sample| sample.to_sample::<f32>())
                            .sum::<f32>()
                            / channels as f32
                    },
                ))
            }
        };
        debug_assert_eq!(written, writable_frames);

        let dropped = frame_count - written;
        if dropped > 0 {
            transport
                .overrun_samples
                .fetch_add(dropped as u64, Ordering::Relaxed);
        }

        acknowledge_pause_after_write(transport);
    }

    pub fn preferred_input_channel_count(
        device: &cpal::Device,
    ) -> Result<u16, Box<dyn std::error::Error>> {
        Ok(Self::get_preferred_config(device)?.channels())
    }

    fn get_preferred_config(
        device: &cpal::Device,
    ) -> Result<cpal::SupportedStreamConfig, Box<dyn std::error::Error>> {
        let default_config = device.default_input_config()?;
        let target_rate = default_config.sample_rate();

        let supported_configs = match device.supported_input_configs() {
            Ok(configs) => configs,
            Err(e) => {
                log::warn!("Could not enumerate input configs ({e}), using device default");
                return Ok(default_config);
            }
        };
        let mut best_config: Option<cpal::SupportedStreamConfigRange> = None;

        for config_range in supported_configs {
            if config_range.min_sample_rate() <= target_rate
                && config_range.max_sample_rate() >= target_rate
            {
                match best_config {
                    None => best_config = Some(config_range),
                    Some(ref current) => {
                        let score = |fmt: cpal::SampleFormat| match fmt {
                            cpal::SampleFormat::F32 => 4,
                            cpal::SampleFormat::I16 => 3,
                            cpal::SampleFormat::I32 => 2,
                            _ => 1,
                        };
                        if score(config_range.sample_format()) > score(current.sample_format()) {
                            best_config = Some(config_range);
                        }
                    }
                }
            }
        }

        if let Some(config) = best_config {
            return Ok(config.with_sample_rate(target_rate));
        }

        log::warn!(
            "No supported config matched device default rate {:?}, using default config",
            target_rate
        );
        Ok(default_config)
    }
}

fn acknowledge_pause_after_write(transport: &CaptureTransportState) {
    if transport.pause_requested.load(Ordering::Acquire) {
        transport.pause_acknowledged.store(true, Ordering::Release);
    }
}

pub fn is_microphone_access_denied(error_message: &str) -> bool {
    let normalized = error_message.to_lowercase();
    normalized.contains("access is denied")
        || normalized.contains("permission denied")
        || normalized.contains("0x80070005")
}

pub fn is_no_input_device_error(error_message: &str) -> bool {
    let normalized = error_message.to_lowercase();
    normalized.contains("no input device found")
        || (normalized.contains("failed to fetch preferred config")
            && normalized.contains("coreaudio"))
}

fn handle_frame(
    samples: &[f32],
    vad_policy: VadPolicy,
    vad: &Option<VadConfig>,
    audio_cb: &Option<AudioFrameCallback>,
    out_buf: &mut Vec<f32>,
) {
    let mut emit = |buf: &[f32]| {
        out_buf.extend_from_slice(buf);
        if let Some(cb) = audio_cb {
            cb(buf);
        }
    };

    if vad_policy == VadPolicy::Disabled {
        emit(samples);
        return;
    }

    if let Some(cfg) = vad {
        let mut detector = cfg.detector.lock().unwrap();
        match detector
            .push_frame(samples)
            .unwrap_or(vad::VadFrame::Speech(samples))
        {
            VadFrame::Speech(buf) => emit(buf),
            VadFrame::Noise => {}
        }
    } else {
        emit(samples);
    }
}

fn drain_available_samples(
    consumer: &mut Consumer<f32>,
    max_samples: usize,
    mut process: impl FnMut(&[f32]),
) -> usize {
    let available = consumer.slots().min(max_samples);
    if available == 0 {
        return 0;
    }

    let chunk = consumer
        .read_chunk(available)
        .expect("reported audio ring slots must be readable");
    let (first, second) = chunk.as_slices();
    if !first.is_empty() {
        process(first);
    }
    if !second.is_empty() {
        process(second);
    }
    chunk.commit_all();
    available
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ChunkDisposition {
    Capture,
    Discard,
}

pub(crate) struct CaptureProcessor {
    in_sample_rate: u32,
    vad: Option<VadConfig>,
    #[allow(dead_code)]
    level_cb: Option<LevelCallback>,
    audio_cb: Option<AudioFrameCallback>,
    stream_running_at: Instant,
    frame_resampler: FrameResampler,
    max_drain_samples: usize,
    first_chunk_logged: bool,
    vad_policy: VadPolicy,
    processed_samples: Vec<f32>,
    awaiting_first_captured_chunk: Option<Instant>,
    capture_ready_tx: Option<mpsc::Sender<()>>,
    total_dropped_samples: u64,
    overrun_warning_logged: bool,
}

impl CaptureProcessor {
    fn new(
        in_sample_rate: u32,
        vad: Option<VadConfig>,
        #[allow(dead_code)] level_cb: Option<LevelCallback>,
        audio_cb: Option<AudioFrameCallback>,
        stream_running_at: Instant,
    ) -> Self {
        let frame_samples = vad.as_ref().map_or(
            (constants::WHISPER_SAMPLE_RATE * 30 / 1000) as usize,
            |config| config.frame_samples,
        );
        let frame_duration =
            Duration::from_secs_f64(frame_samples as f64 / constants::WHISPER_SAMPLE_RATE as f64);
        let frame_resampler = FrameResampler::new(
            in_sample_rate as usize,
            constants::WHISPER_SAMPLE_RATE as usize,
            frame_duration,
        );

        let max_drain_samples = ((in_sample_rate as u128 * constants::MAX_DRAIN_CHUNK_MS as u128)
            / 1_000)
            .max(1) as usize;

        Self {
            in_sample_rate,
            vad,
            level_cb,
            audio_cb,
            stream_running_at,
            frame_resampler,
            max_drain_samples,
            first_chunk_logged: false,
            vad_policy: VadPolicy::Offline,
            processed_samples: Vec::new(),
            awaiting_first_captured_chunk: None,
            capture_ready_tx: None,
            total_dropped_samples: 0,
            overrun_warning_logged: false,
        }
    }

    fn begin_recording(&mut self, policy: VadPolicy, ready_tx: mpsc::Sender<()>) {
        self.awaiting_first_captured_chunk = Some(Instant::now());
        self.capture_ready_tx = Some(ready_tx);
        self.total_dropped_samples = 0;
        self.overrun_warning_logged = false;
        self.vad_policy = policy;
        self.processed_samples.clear();
        self.frame_resampler.reset();
        if policy != VadPolicy::Disabled {
            if let Some(cfg) = &self.vad {
                let mut detector = cfg.detector.lock().unwrap();
                detector.set_hangover_frames(cfg.hangover_for(policy));
                detector.reset();
            }
        }
    }

    fn cancel_ready_signal(&mut self) {
        self.capture_ready_tx = None;
        self.awaiting_first_captured_chunk = None;
    }

    fn drain(&mut self, consumer: &mut Consumer<f32>, disposition: ChunkDisposition) -> usize {
        let max_samples = self.max_drain_samples;
        drain_available_samples(consumer, max_samples, |raw| {
            self.process_raw_chunk(raw, disposition)
        })
    }

    fn process_raw_chunk(&mut self, raw: &[f32], disposition: ChunkDisposition) {
        let chunk_ms = raw.len() as f64 * 1000.0 / self.in_sample_rate as f64;
        if !self.first_chunk_logged {
            self.first_chunk_logged = true;
            log::debug!(
                "first audio samples arrived {:?} after stream start ({:.1}ms drained)",
                self.stream_running_at.elapsed(),
                chunk_ms
            );
        }

        if disposition == ChunkDisposition::Discard {
            return;
        }

        let vad_policy = self.vad_policy;
        self.frame_resampler.push(raw, |frame: &[f32]| {
            handle_frame(
                frame,
                vad_policy,
                &self.vad,
                &self.audio_cb,
                &mut self.processed_samples,
            )
        });

        if let Some(started) = self.awaiting_first_captured_chunk.take() {
            log::debug!(
                "first captured samples ({:.1}ms) processed {:?} after Cmd::Start",
                chunk_ms,
                started.elapsed()
            );
        }
        if let Some(ready_tx) = self.capture_ready_tx.take() {
            let _ = ready_tx.send(());
        }
    }

    fn observe_overrun(&mut self, samples: u64) {
        if samples == 0 {
            return;
        }
        self.total_dropped_samples = self.total_dropped_samples.saturating_add(samples);
        if !self.overrun_warning_logged {
            self.overrun_warning_logged = true;
            log::warn!(
                "Microphone capture ring dropped {samples} samples; continuing the active recording"
            );
        }
    }

    fn finish_recording(&mut self) -> Vec<f32> {
        let vad_policy = self.vad_policy;
        self.frame_resampler.finish(|frame: &[f32]| {
            handle_frame(
                frame,
                vad_policy,
                &self.vad,
                &self.audio_cb,
                &mut self.processed_samples,
            )
        });

        if self.total_dropped_samples > 0 {
            log::warn!(
                "Active recording completed after dropping {} microphone samples",
                self.total_dropped_samples
            );
        }
        std::mem::take(&mut self.processed_samples)
    }
}

pub(crate) fn run_consumer(
    mut processor: CaptureProcessor,
    mut sample_consumer: Consumer<f32>,
    cmd_rx: mpsc::Receiver<Cmd>,
    transport: Arc<CaptureTransportState>,
    stream_error: Arc<AtomicBool>,
) {
    let mut recording = false;
    let mut stream_error_logged = false;
    let poll_interval = Duration::from_millis(constants::CONSUMER_POLL_INTERVAL_MS);
    let pause_timeout = Duration::from_millis(constants::PAUSE_ACK_TIMEOUT_MS);

    loop {
        let mut command = if sample_consumer.slots() > 0 {
            match cmd_rx.try_recv() {
                Ok(command) => Some(command),
                Err(mpsc::TryRecvError::Empty) => None,
                Err(mpsc::TryRecvError::Disconnected) => return,
            }
        } else {
            match cmd_rx.recv_timeout(poll_interval) {
                Ok(command) => Some(command),
                Err(mpsc::RecvTimeoutError::Timeout) => None,
                Err(mpsc::RecvTimeoutError::Disconnected) => return,
            }
        };

        loop {
            if let Some(cmd) = command.take() {
                match cmd {
                    Cmd::Start(policy, sent_at, ready_tx) => {
                        log::debug!("Cmd::Start processed {:?} after send", sent_at.elapsed(),);
                        transport.overrun_samples.store(0, Ordering::Release);
                        processor.begin_recording(policy, ready_tx);
                        recording = true;
                    }
                    Cmd::Stop(reply_tx) => {
                        processor
                            .observe_overrun(transport.overrun_samples.swap(0, Ordering::AcqRel));
                        recording = false;
                        processor.cancel_ready_signal();

                        transport.pause_acknowledged.store(false, Ordering::Relaxed);
                        transport.pause_requested.store(true, Ordering::Release);
                        let pause_started = Instant::now();
                        while !transport.pause_acknowledged.load(Ordering::Acquire)
                            && pause_started.elapsed() < pause_timeout
                        {
                            let drained =
                                processor.drain(&mut sample_consumer, ChunkDisposition::Capture);
                            if drained == 0 {
                                std::thread::sleep(Duration::from_millis(1));
                            }
                        }

                        let pause_timed_out = !transport.pause_acknowledged.load(Ordering::Acquire);
                        if pause_timed_out {
                            log::warn!("Timed out waiting for the microphone callback to pause");
                            stream_error.store(true, Ordering::Release);
                        }

                        while processor.drain(&mut sample_consumer, ChunkDisposition::Capture) > 0 {
                        }

                        processor
                            .observe_overrun(transport.overrun_samples.swap(0, Ordering::AcqRel));
                        let samples = processor.finish_recording();
                        if !pause_timed_out {
                            transport.pause_acknowledged.store(false, Ordering::Relaxed);
                            transport.pause_requested.store(false, Ordering::Release);
                        }
                        let _ = reply_tx.send(samples);

                        if pause_timed_out {
                            return;
                        }
                    }
                    Cmd::Shutdown => {
                        transport.pause_requested.store(true, Ordering::Release);
                        return;
                    }
                }
            }

            command = match cmd_rx.try_recv() {
                Ok(command) => Some(command),
                Err(mpsc::TryRecvError::Empty) => break,
                Err(mpsc::TryRecvError::Disconnected) => return,
            };
        }

        let disposition = if recording {
            ChunkDisposition::Capture
        } else {
            ChunkDisposition::Discard
        };
        processor.drain(&mut sample_consumer, disposition);

        let overrun_samples = transport.overrun_samples.swap(0, Ordering::AcqRel);
        if recording {
            processor.observe_overrun(overrun_samples);
        }

        if stream_error.load(Ordering::Acquire) && !stream_error_logged {
            log::error!("Microphone backend reported a stream error; it will be rebuilt");
            stream_error_logged = true;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rtrb::RingBuffer;

    #[test]
    fn unopened_recorder_does_not_need_reopen() {
        let recorder = AudioRecorder::new().expect("recorder");
        assert!(!recorder.needs_reopen());
    }

    #[test]
    fn stream_error_requires_reopen() {
        let recorder = AudioRecorder::new().expect("recorder");
        recorder.stream_error.store(true, Ordering::Relaxed);
        assert!(recorder.needs_reopen());
    }

    #[test]
    fn callback_writes_mono_samples() {
        let (mut producer, mut consumer) = RingBuffer::<f32>::new(8);
        let transport = CaptureTransportState::default();
        AudioRecorder::write_input_to_ring(
            &[0.25f32, -0.5, 1.0],
            1,
            None,
            &mut producer,
            &transport,
        );
        let mut output = [0.0; 3];
        consumer.pop_entire_slice(&mut output).expect("samples");
        assert_eq!(output, [0.25, -0.5, 1.0]);
    }

    #[test]
    fn callback_downmixes_multichannel_input() {
        let transport = CaptureTransportState::default();
        let (mut producer, mut consumer) = RingBuffer::<f32>::new(4);
        AudioRecorder::write_input_to_ring(
            &[1.0f32, 3.0, -1.0, 1.0],
            2,
            None,
            &mut producer,
            &transport,
        );
        let mut output = [0.0; 2];
        consumer
            .pop_entire_slice(&mut output)
            .expect("averaged samples");
        assert_eq!(output, [2.0, 0.0]);
    }

    #[test]
    fn callback_selects_specific_channel() {
        let transport = CaptureTransportState::default();
        let (mut producer, mut consumer) = RingBuffer::<f32>::new(4);
        AudioRecorder::write_input_to_ring(
            &[1.0f32, 3.0, -1.0, 1.0],
            2,
            Some(1),
            &mut producer,
            &transport,
        );
        let mut output = [0.0; 2];
        consumer
            .pop_entire_slice(&mut output)
            .expect("selected samples");
        assert_eq!(output, [3.0, 1.0]);
    }

    #[test]
    fn callback_forwards_boundary_block_then_stays_silent() {
        let (mut producer, mut consumer) = RingBuffer::<f32>::new(8);
        let transport = CaptureTransportState::default();

        transport.pause_requested.store(true, Ordering::Release);
        AudioRecorder::write_input_to_ring(&[1.0f32, 2.0], 1, None, &mut producer, &transport);
        assert!(transport.pause_acknowledged.load(Ordering::Acquire));
        assert_eq!(consumer.slots(), 2);

        AudioRecorder::write_input_to_ring(&[3.0f32], 1, None, &mut producer, &transport);
        assert_eq!(consumer.slots(), 2);
        assert_eq!(transport.overrun_samples.load(Ordering::Relaxed), 0);

        transport.pause_acknowledged.store(false, Ordering::Relaxed);
        transport.pause_requested.store(false, Ordering::Release);
        AudioRecorder::write_input_to_ring(&[4.0f32], 1, None, &mut producer, &transport);
        let mut output = [0.0; 3];
        consumer.pop_entire_slice(&mut output).expect("samples");
        assert_eq!(output, [1.0, 2.0, 4.0]);
    }

    #[test]
    fn callback_counts_dropped_audio() {
        let (mut producer, mut consumer) = RingBuffer::<f32>::new(2);
        let transport = CaptureTransportState::default();
        AudioRecorder::write_input_to_ring(&[1.0f32, 2.0, 3.0], 1, None, &mut producer, &transport);
        let mut captured = [0.0; 2];
        consumer
            .pop_entire_slice(&mut captured)
            .expect("partial callback audio");
        assert_eq!(captured, [1.0, 2.0]);
        assert_eq!(transport.overrun_samples.load(Ordering::Relaxed), 1);
    }

    #[test]
    fn detects_access_is_denied() {
        assert!(is_microphone_access_denied("Access is denied"));
    }

    #[test]
    fn detects_permission_denied() {
        assert!(is_microphone_access_denied("permission denied"));
    }

    #[test]
    fn detects_windows_error_code() {
        assert!(is_microphone_access_denied("WASAPI error: 0x80070005"));
    }

    #[test]
    fn does_not_match_unrelated_errors() {
        assert!(!is_microphone_access_denied("device not found"));
    }

    #[test]
    fn detects_no_input_device() {
        assert!(is_no_input_device_error("No input device found"));
    }
}
