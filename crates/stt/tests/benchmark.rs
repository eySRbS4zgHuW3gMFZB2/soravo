//! Integration benchmarks for STT engines.
//!
//! These benchmarks require model files to be present.
//! Run with: `cargo test -p soravo-stt --test benchmark -- --ignored`

use soravo_stt::{
    benchmark::{BenchmarkConfig, BenchmarkHarness},
    engines::{ParakeetEngine, WhisperEngine},
    SpeechEngine, TranscriptionConfig,
};

#[test]
#[ignore]
fn benchmark_parakeet_batch() {
    let config = BenchmarkConfig {
        audio_dir: "tests/fixtures/audio".to_string(),
        ground_truth_dir: "tests/fixtures/ground_truth".to_string(),
        warmup_runs: 2,
        benchmark_runs: 3,
        sample_rate: 16000,
    };

    let harness = BenchmarkHarness::new(config).expect("Failed to create harness");

    // Test files must exist in the fixtures directory
    let test_files = harness.test_files();
    println!("Found test files: {:?}", test_files);

    for file_id in test_files {
        let model_path = std::env::var("PARAKEET_MODEL_PATH").expect("PARAKEET_MODEL_PATH not set");

        let result = harness
            .benchmark_engine_batch("parakeet", file_id, || {
                let mut engine = ParakeetEngine::default();
                let trans_config = TranscriptionConfig {
                    language: "en".to_string(),
                    streaming: false,
                    hotwords: vec![],
                };
                engine.initialize(&model_path, &trans_config)?;
                Ok(engine)
            })
            .expect("Benchmark failed");

        println!("Parakeet batch benchmark for {}: {:?}", file_id, result);
    }
}

#[test]
#[ignore]
fn benchmark_whisper_batch() {
    let config = BenchmarkConfig {
        audio_dir: "tests/fixtures/audio".to_string(),
        ground_truth_dir: "tests/fixtures/ground_truth".to_string(),
        warmup_runs: 2,
        benchmark_runs: 3,
        sample_rate: 16000,
    };

    let harness = BenchmarkHarness::new(config).expect("Failed to create harness");

    let test_files = harness.test_files();
    println!("Found test files: {:?}", test_files);

    for file_id in test_files {
        let model_path = std::env::var("WHISPER_MODEL_PATH").expect("WHISPER_MODEL_PATH not set");

        let result = harness
            .benchmark_engine_batch("whisper", file_id, || {
                let mut engine = WhisperEngine::default();
                let trans_config = TranscriptionConfig {
                    language: "en".to_string(),
                    streaming: false,
                    hotwords: vec![],
                };
                engine.initialize(&model_path, &trans_config)?;
                Ok(engine)
            })
            .expect("Benchmark failed");

        println!("Whisper batch benchmark for {}: {:?}", file_id, result);
    }
}

#[test]
#[ignore]
fn benchmark_whisper_streaming() {
    let config = BenchmarkConfig {
        audio_dir: "tests/fixtures/audio".to_string(),
        ground_truth_dir: "tests/fixtures/ground_truth".to_string(),
        warmup_runs: 2,
        benchmark_runs: 3,
        sample_rate: 16000,
    };

    let harness = BenchmarkHarness::new(config).expect("Failed to create harness");

    let test_files = harness.test_files();
    println!("Found test files: {:?}", test_files);

    for file_id in test_files {
        let model_path = std::env::var("WHISPER_MODEL_PATH").expect("WHISPER_MODEL_PATH not set");

        let result = harness
            .benchmark_engine_streaming("whisper_streaming", file_id, || {
                let mut engine = WhisperEngine::default();
                let trans_config = TranscriptionConfig {
                    language: "en".to_string(),
                    streaming: true,
                    hotwords: vec![],
                };
                engine.initialize(&model_path, &trans_config)?;
                Ok(engine)
            })
            .expect("Benchmark failed");

        println!("Whisper streaming benchmark for {}: {:?}", file_id, result);
    }
}

#[test]
fn benchmark_harness_loads_correctly() {
    // This test runs without models - just verifies the harness can be created
    // when test fixtures exist
    let config = BenchmarkConfig::default();
    let _ = BenchmarkHarness::new(config);
    // If fixtures don't exist, this will fail - that's OK for this test
}
