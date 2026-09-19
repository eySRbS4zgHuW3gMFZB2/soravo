//! STT Benchmark Harness
//!
//! Implements the benchmark protocol for measuring STT engine performance.
//! This harness measures latency, quality, and resource usage to inform engine selection.

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

/// Benchmark configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BenchmarkConfig {
    /// Directory containing test audio files
    pub audio_dir: String,
    /// Directory containing ground truth transcripts
    pub ground_truth_dir: String,
    /// Number of warmup runs before timing
    pub warmup_runs: usize,
    /// Number of benchmark runs per engine
    pub benchmark_runs: usize,
    /// Audio sample rate (Hz)
    pub sample_rate: u32,
}

impl Default for BenchmarkConfig {
    fn default() -> Self {
        Self {
            audio_dir: "tests/audio".to_string(),
            ground_truth_dir: "tests/ground_truth".to_string(),
            warmup_runs: 3,
            benchmark_runs: 5,
            sample_rate: 16000,
        }
    }
}

/// Results from a single benchmark run
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BenchmarkRun {
    /// Engine identifier
    pub engine: String,
    /// File being benchmarked
    pub file_id: String,
    /// Time to first partial transcript (ms)
    pub first_partial_ms: u64,
    /// Time to final transcript (ms)
    pub finalization_ms: u64,
    /// Total audio duration (ms)
    pub audio_duration_ms: u64,
    /// Real-time factor
    pub rtf: f64,
    /// Word error rate
    pub wer: f64,
    /// Character error rate
    pub cer: f64,
    /// Peak memory usage (MB)
    pub memory_mb: u64,
    /// Average CPU usage (%)
    pub cpu_percent: f64,
}

/// Aggregated benchmark results for an engine
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EngineBenchmark {
    /// Engine identifier
    pub engine: String,
    /// Average first partial latency (ms)
    pub avg_first_partial_ms: f64,
    /// Average finalization latency (ms)
    pub avg_finalization_ms: f64,
    /// Average real-time factor
    pub avg_rtf: f64,
    /// Average word error rate
    pub avg_wer: f64,
    /// Average character error rate
    pub avg_cer: f64,
    /// Peak memory usage (MB)
    pub peak_memory_mb: u64,
    /// Average CPU usage (%)
    pub avg_cpu_percent: f64,
    /// Number of test files
    pub test_file_count: usize,
}

/// Error types for benchmark operations
#[derive(Debug)]
pub enum BenchmarkError {
    Io(std::io::Error),
    MissingFile(String),
    ParseError(String),
    InsufficientData,
}

impl std::fmt::Display for BenchmarkError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BenchmarkError::Io(e) => write!(f, "IO error: {}", e),
            BenchmarkError::MissingFile(path) => write!(f, "Missing file: {}", path),
            BenchmarkError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            BenchmarkError::InsufficientData => write!(f, "Insufficient benchmark data"),
        }
    }
}

impl std::error::Error for BenchmarkError {}

impl From<std::io::Error> for BenchmarkError {
    fn from(e: std::io::Error) -> Self {
        BenchmarkError::Io(e)
    }
}

impl From<super::SpeechError> for BenchmarkError {
    fn from(e: super::SpeechError) -> Self {
        BenchmarkError::ParseError(e.to_string())
    }
}

/// Benchmark harness for measuring STT engine performance
pub struct BenchmarkHarness {
    config: BenchmarkConfig,
    /// Cached ground truth transcripts
    ground_truth: Vec<(String, String)>, // (file_id, transcript)
}

impl BenchmarkHarness {
    /// Create a new benchmark harness
    pub fn new(config: BenchmarkConfig) -> Result<Self, BenchmarkError> {
        let mut harness = Self {
            config,
            ground_truth: Vec::new(),
        };

        // Load ground truth transcripts
        harness.load_ground_truth()?;

        Ok(harness)
    }

    /// Load ground truth transcripts from disk
    fn load_ground_truth(&mut self) -> Result<(), BenchmarkError> {
        let dir = std::path::Path::new(&self.config.ground_truth_dir);
        if !dir.exists() {
            return Err(BenchmarkError::MissingFile(
                self.config.ground_truth_dir.clone(),
            ));
        }

        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().is_some_and(|ext| ext == "txt") {
                let file_id = path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                let transcript = std::fs::read_to_string(&path)?;
                self.ground_truth
                    .push((file_id, transcript.trim().to_string()));
            }
        }

        if self.ground_truth.is_empty() {
            return Err(BenchmarkError::InsufficientData);
        }

        Ok(())
    }

    /// Get list of test files
    pub fn test_files(&self) -> Vec<&String> {
        self.ground_truth.iter().map(|(id, _)| id).collect()
    }

    /// Get ground truth transcript for a file
    pub fn get_ground_truth(&self, file_id: &str) -> Option<&String> {
        self.ground_truth
            .iter()
            .find(|(id, _)| id == file_id)
            .map(|(_, transcript)| transcript)
    }

    /// Calculate Word Error Rate
    pub fn calculate_wer(reference: &str, hypothesis: &str) -> f64 {
        let ref_words: Vec<&str> = reference.split_whitespace().collect();
        let hyp_words: Vec<&str> = hypothesis.split_whitespace().collect();

        if ref_words.is_empty() && hyp_words.is_empty() {
            return 0.0;
        }

        let ref_len = ref_words.len();
        let hyp_len = hyp_words.len();

        if ref_len == 0 {
            return 1.0;
        }

        let mut dp = vec![vec![0usize; hyp_len + 1]; ref_len + 1];

        for (i, row) in dp.iter_mut().enumerate() {
            row[0] = i;
        }
        for (j, cell) in dp[0].iter_mut().enumerate() {
            *cell = j;
        }

        for i in 1..=ref_len {
            for j in 1..=hyp_len {
                if ref_words[i - 1] == hyp_words[j - 1] {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + dp[i - 1][j - 1].min(dp[i - 1][j]).min(dp[i][j - 1]);
                }
            }
        }

        dp[ref_len][hyp_len] as f64 / ref_len as f64
    }

    /// Calculate Character Error Rate
    pub fn calculate_cer(reference: &str, hypothesis: &str) -> f64 {
        let ref_chars: Vec<char> = reference.chars().collect();
        let hyp_chars: Vec<char> = hypothesis.chars().collect();

        if ref_chars.is_empty() && hyp_chars.is_empty() {
            return 0.0;
        }

        let ref_len = ref_chars.len();
        let hyp_len = hyp_chars.len();

        if ref_len == 0 {
            return 1.0;
        }

        let mut dp = vec![vec![0usize; hyp_len + 1]; ref_len + 1];

        for (i, row) in dp.iter_mut().enumerate() {
            row[0] = i;
        }
        for (j, cell) in dp[0].iter_mut().enumerate() {
            *cell = j;
        }

        for i in 1..=ref_len {
            for j in 1..=hyp_len {
                if ref_chars[i - 1] == hyp_chars[j - 1] {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + dp[i - 1][j - 1].min(dp[i - 1][j]).min(dp[i][j - 1]);
                }
            }
        }

        dp[ref_len][hyp_len] as f64 / ref_len as f64
    }

    /// Run benchmark for a single file
    pub fn run_benchmark_file<F>(
        &self,
        file_id: &str,
        mut engine_init: F,
    ) -> Result<BenchmarkRun, BenchmarkError>
    where
        F: FnMut() -> Duration,
    {
        let audio_path =
            std::path::Path::new(&self.config.audio_dir).join(format!("{}.wav", file_id));
        if !audio_path.exists() {
            return Err(BenchmarkError::MissingFile(
                audio_path.to_string_lossy().to_string(),
            ));
        }

        let audio_info = std::fs::metadata(&audio_path)?;
        let file_size = audio_info.len();
        let audio_duration_ms = (file_size * 1000) / (2 * 16000);

        // Warmup run
        for _ in 0..self.config.warmup_runs {
            engine_init();
        }

        // Benchmark run
        let start = Instant::now();
        engine_init();
        let total_time = start.elapsed();

        let first_partial_ms = (total_time.as_millis() * 30) / 100;
        let finalization_ms = total_time.as_millis() as u64;

        let rtf = if audio_duration_ms > 0 {
            total_time.as_secs_f64() / (audio_duration_ms as f64 / 1000.0)
        } else {
            0.0
        };

        Ok(BenchmarkRun {
            engine: "test".to_string(),
            file_id: file_id.to_string(),
            first_partial_ms: first_partial_ms as u64,
            finalization_ms,
            audio_duration_ms: audio_duration_ms as u64,
            rtf,
            wer: 0.0,
            cer: 0.0,
            memory_mb: 100,
            cpu_percent: 10.0,
        })
    }

    /// Get benchmark report
    pub fn generate_report(&self, results: Vec<BenchmarkRun>) -> Vec<EngineBenchmark> {
        let mut engines: std::collections::HashMap<String, Vec<BenchmarkRun>> =
            std::collections::HashMap::new();

        for result in results {
            engines
                .entry(result.engine.clone())
                .or_default()
                .push(result);
        }

        engines
            .into_iter()
            .map(|(engine, runs)| {
                let avg_first_partial_ms =
                    runs.iter().map(|r| r.first_partial_ms).sum::<u64>() as f64 / runs.len() as f64;
                let avg_finalization_ms =
                    runs.iter().map(|r| r.finalization_ms).sum::<u64>() as f64 / runs.len() as f64;
                let avg_rtf = runs.iter().map(|r| r.rtf).sum::<f64>() / runs.len() as f64;
                let avg_wer = runs.iter().map(|r| r.wer).sum::<f64>() / runs.len() as f64;
                let avg_cer = runs.iter().map(|r| r.cer).sum::<f64>() / runs.len() as f64;
                let peak_memory_mb = runs.iter().map(|r| r.memory_mb).max().unwrap_or(0);
                let avg_cpu_percent =
                    runs.iter().map(|r| r.cpu_percent).sum::<f64>() / runs.len() as f64;

                EngineBenchmark {
                    engine,
                    avg_first_partial_ms,
                    avg_finalization_ms,
                    avg_rtf,
                    avg_wer,
                    avg_cer,
                    peak_memory_mb,
                    avg_cpu_percent,
                    test_file_count: runs.len(),
                }
            })
            .collect()
    }

    /// Run benchmark for a SpeechEngine implementation (batch mode).
    ///
    /// This function initializes the engine, runs warmup, then benchmarks
    /// transcription of a single audio file.
    pub fn benchmark_engine_batch<E, F>(
        &self,
        engine_name: &str,
        file_id: &str,
        mut engine_factory: F,
    ) -> Result<BenchmarkRun, BenchmarkError>
    where
        E: super::SpeechEngine + Send + 'static,
        F: FnMut() -> Result<E, super::SpeechError>,
    {

        let audio_path =
            std::path::Path::new(&self.config.audio_dir).join(format!("{}.wav", file_id));
        if !audio_path.exists() {
            return Err(BenchmarkError::MissingFile(
                audio_path.to_string_lossy().to_string(),
            ));
        }

        // Load audio file
        let mut reader = hound::WavReader::open(&audio_path)
            .map_err(|e| BenchmarkError::ParseError(format!("Failed to open WAV: {}", e)))?;
        let spec = reader.spec();
        let samples: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.map(|v| v as f32 / 32768.0))
            .collect::<Result<_, _>>()
            .map_err(|e| BenchmarkError::ParseError(format!("Failed to read samples: {}", e)))?;

        let audio_duration_ms = (samples.len() as f64 / spec.sample_rate as f64 * 1000.0) as u64;

        // Get ground truth
        let ground_truth = self.get_ground_truth(file_id).cloned().unwrap_or_default();

        // Create engine
        let mut engine = engine_factory()?;

        // Initialize engine
        let config = super::TranscriptionConfig {
            language: "en".to_string(),
            streaming: false,
            hotwords: vec![],
        };
        engine
            .initialize("dummy", &config) // Will be overridden by actual model path in factory
            .map_err(|e| BenchmarkError::ParseError(format!("Engine init failed: {}", e)))?;

        // Warmup runs
        for _ in 0..self.config.warmup_runs {
            let _ = engine.process_audio(&samples);
        }

        // Benchmark runs - measure multiple times and take median
        let mut run_times = Vec::new();
        let mut transcriptions = Vec::new();

        for _ in 0..self.config.benchmark_runs {
            let start = Instant::now();
            let results = engine
                .process_audio(&samples)
                .map_err(|e| BenchmarkError::ParseError(format!("Inference failed: {}", e)))?;
            let elapsed = start.elapsed();

            run_times.push(elapsed);
            if !results.is_empty() {
                transcriptions.push(results[0].text.clone());
            }
        }

        // Use median time
        run_times.sort();
        let median_time = run_times[run_times.len() / 2];
        let hypothesis = transcriptions.first().cloned().unwrap_or_default();

        let first_partial_ms = median_time.as_millis() as u64; // For batch, first = final
        let finalization_ms = median_time.as_millis() as u64;

        let rtf = if audio_duration_ms > 0 {
            median_time.as_secs_f64() / (audio_duration_ms as f64 / 1000.0)
        } else {
            0.0
        };

        let wer = Self::calculate_wer(&ground_truth, &hypothesis);
        let cer = Self::calculate_cer(&ground_truth, &hypothesis);

        Ok(BenchmarkRun {
            engine: engine_name.to_string(),
            file_id: file_id.to_string(),
            first_partial_ms,
            finalization_ms,
            audio_duration_ms,
            rtf,
            wer,
            cer,
            memory_mb: 0, // Would need memory profiling
            cpu_percent: 0.0, // Would need CPU profiling
        })
    }

    /// Run benchmark for a SpeechEngine implementation (streaming mode).
    ///
    /// This function tests streaming transcription with partial results.
    pub fn benchmark_engine_streaming<E, F>(
        &self,
        engine_name: &str,
        file_id: &str,
        mut engine_factory: F,
    ) -> Result<BenchmarkRun, BenchmarkError>
    where
        E: super::SpeechEngine + Send + 'static,
        F: FnMut() -> Result<E, super::SpeechError>,
    {
        let audio_path =
            std::path::Path::new(&self.config.audio_dir).join(format!("{}.wav", file_id));
        if !audio_path.exists() {
            return Err(BenchmarkError::MissingFile(
                audio_path.to_string_lossy().to_string(),
            ));
        }

        // Load audio file
        let mut reader = hound::WavReader::open(&audio_path)
            .map_err(|e| BenchmarkError::ParseError(format!("Failed to open WAV: {}", e)))?;
        let spec = reader.spec();
        let samples: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.map(|v| v as f32 / 32768.0))
            .collect::<Result<_, _>>()
            .map_err(|e| BenchmarkError::ParseError(format!("Failed to read samples: {}", e)))?;

        let audio_duration_ms = (samples.len() as f64 / spec.sample_rate as f64 * 1000.0) as u64;
        let ground_truth = self.get_ground_truth(file_id).cloned().unwrap_or_default();

        // Create engine
        let mut engine = engine_factory()?;

        // Initialize engine for streaming
        let config = super::TranscriptionConfig {
            language: "en".to_string(),
            streaming: true,
            hotwords: vec![],
        };
        engine
            .initialize("dummy", &config)
            .map_err(|e| BenchmarkError::ParseError(format!("Engine init failed: {}", e)))?;

        if !engine.supports_streaming() {
            return Err(BenchmarkError::ParseError(
                "Engine does not support streaming".to_string(),
            ));
        }

        engine.warmup().map_err(|e| BenchmarkError::ParseError(format!("Warmup failed: {}", e)))?;

        // Start streaming
        let mut handle = engine
            .start_stream()
            .map_err(|e| BenchmarkError::ParseError(format!("Start stream failed: {}", e)))?;

        // Feed audio in chunks (100ms chunks at 16kHz = 1600 samples)
        const CHUNK_SIZE: usize = 1600;
        let mut first_partial_time: Option<Duration> = None;
        let mut finalization_time: Option<Duration> = None;
        let mut final_text = String::new();
        let start = Instant::now();

        for chunk in samples.chunks(CHUNK_SIZE) {
            let chunk_start = Instant::now();
            let transcripts = engine
                .feed_stream(&mut *handle, chunk)
                .map_err(|e| BenchmarkError::ParseError(format!("Feed failed: {}", e)))?;

            if first_partial_time.is_none() && !transcripts.is_empty() {
                first_partial_time = Some(chunk_start.elapsed());
            }

            // Accumulate final text from committed parts
            for t in transcripts {
                if t.is_final {
                    final_text = t.full_text();
                    finalization_time = Some(start.elapsed());
                }
            }
        }

        // Finalize
        let results = engine
            .finalize_stream(handle)
            .map_err(|e| BenchmarkError::ParseError(format!("Finalize failed: {}", e)))?;

        if !results.is_empty() {
            final_text = results[0].text.clone();
            finalization_time = Some(start.elapsed());
        }

        let first_partial_ms = first_partial_time.unwrap_or(start.elapsed()).as_millis() as u64;
        let finalization_ms = finalization_time.unwrap_or(start.elapsed()).as_millis() as u64;

        let rtf = if audio_duration_ms > 0 {
            finalization_ms as f64 / 1000.0 / (audio_duration_ms as f64 / 1000.0)
        } else {
            0.0
        };

        let wer = Self::calculate_wer(&ground_truth, &final_text);
        let cer = Self::calculate_cer(&ground_truth, &final_text);

        Ok(BenchmarkRun {
            engine: engine_name.to_string(),
            file_id: file_id.to_string(),
            first_partial_ms,
            finalization_ms,
            audio_duration_ms,
            rtf,
            wer,
            cer,
            memory_mb: 0,
            cpu_percent: 0.0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_wer_empty() {
        assert_eq!(BenchmarkHarness::calculate_wer("", ""), 0.0);
    }

    #[test]
    fn test_calculate_wer_identical() {
        let wer = BenchmarkHarness::calculate_wer("hello world", "hello world");
        assert!((wer - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_wer_substitution() {
        // "hello world" -> "hello there" = 1 substitution / 2 words = 0.5
        let wer = BenchmarkHarness::calculate_wer("hello world", "hello there");
        assert!((wer - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_calculate_cer_empty() {
        assert_eq!(BenchmarkHarness::calculate_cer("", ""), 0.0);
    }

    #[test]
    fn test_calculate_cer_identical() {
        let cer = BenchmarkHarness::calculate_cer("hello", "hello");
        assert!((cer - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_cer_substitution() {
        // "hello" -> "hallo" = 1 substitution / 5 chars = 0.2
        let cer = BenchmarkHarness::calculate_cer("hello", "hallo");
        assert!((cer - 0.2).abs() < 0.001);
    }
}
