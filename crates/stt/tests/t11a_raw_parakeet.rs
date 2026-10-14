//! T11-A punctuation/capitalization attribution — raw model evidence.
//!
//! Runs the EXACT selected artifact (`PARAKEET_MODEL_PATH`, the Q8_0 GGUF)
//! through the SAME backend the desktop app uses (transcribe-cpp, Auto/CPU)
//! over fixed corpus WAVs, and prints the RAW model text for diffing against
//! references. Bypasses every app-layer transform by construction, so any
//! punctuation/capitalization deviation in the printed hypothesis is model
//! output, not pipeline rewriting.
//!
//! This is an evidence run, not a gate: it fails loudly on infrastructure
//! errors (missing files/model) but never on transcript mismatch — the
//! verdict lives in the T11-A report.
//!
//! Run with:
//! `PARAKEET_MODEL_PATH=/abs/path/parakeet-unified-en-0.6b-Q8_0.gguf \
//!  LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs \
//!  cargo test -p soravo-stt --test t11a_raw_parakeet -- --ignored --nocapture`
//!
//! #[ignore]d: requires the 731 MB model artifact, absent on CI runners
//! (same convention as the other model-gated benchmark tests).

use soravo_stt::benchmark::{BenchmarkConfig, BenchmarkHarness};
use transcribe_cpp::{init_backends_default, Model, ModelOptions, RunOptions};

#[test]
#[ignore]
fn t11a_raw_parakeet_transcripts() {
    let model_path = std::env::var("PARAKEET_MODEL_PATH").expect("PARAKEET_MODEL_PATH not set");
    assert!(
        std::path::Path::new(&model_path).exists(),
        "model file missing: {}",
        model_path
    );

    let config = BenchmarkConfig {
        audio_dir: "tests/fixtures/audio".to_string(),
        ground_truth_dir: "tests/fixtures/ground_truth".to_string(),
        warmup_runs: 0,
        benchmark_runs: 1,
        sample_rate: 16000,
    };
    let harness = BenchmarkHarness::new(config).expect("load corpus fixtures");
    let file_ids: Vec<String> = harness.test_files().into_iter().cloned().collect();
    assert!(
        !file_ids.is_empty(),
        "no ground-truth fixtures found under tests/fixtures/ground_truth"
    );

    init_backends_default().expect("register transcribe-cpp backends");
    let model = Model::load_with(&model_path, &ModelOptions::default())
        .expect("load Q8_0 GGUF via transcribe-cpp");

    for file_id in file_ids {
        let audio_path = format!("tests/fixtures/audio/{}.wav", file_id);
        let mut reader = hound::WavReader::open(&audio_path).expect("open corpus wav");
        let spec = reader.spec();
        assert_eq!(spec.sample_rate, 16000, "corpus must be 16 kHz");
        assert_eq!(spec.channels, 1, "corpus must be mono");
        let samples: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.map(|v| v as f32 / 32768.0))
            .collect::<Result<_, _>>()
            .expect("read corpus samples");
        assert!(!samples.is_empty(), "empty audio: {}", file_id);

        let reference = harness
            .get_ground_truth(&file_id)
            .cloned()
            .unwrap_or_default();

        let mut session = model.session().expect("create session");
        let transcript = session
            .run(
                &samples,
                &RunOptions {
                    language: Some("en".to_string()),
                    ..Default::default()
                },
            )
            .expect("inference");
        let hypothesis = transcript.text.clone();

        let wer = BenchmarkHarness::calculate_wer(&reference, &hypothesis);
        let cer = BenchmarkHarness::calculate_cer(&reference, &hypothesis);

        println!("RAW file_id={}", file_id);
        println!("RAW reference ={:?}", reference);
        println!("RAW hypothesis={:?}", hypothesis);
        println!("RAW wer={:.4} cer={:.4}", wer, cer);
    }
}
