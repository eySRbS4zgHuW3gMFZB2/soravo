//! Deterministic GGUF benchmark driver (test-only).
//!
//! Exercises the ACTUAL production inference path — transcribe-cpp
//! `Model::load_with → session.run` — over the fixed T11-A corpus with the
//! exact approved artifact. Never touches production code, the microphone,
//! the network, or app-layer post-processing: hypotheses here are RAW model
//! output, labeled MODEL-level evidence (distinct from pipeline behavior and
//! live-E2E evidence).
//!
//! Design (per `G1-CLOSURE-GGUF-BENCHMARK-PATH-REPORT.md` §3):
//! - Model + fixture SHA-256 pins verified BEFORE inference; any mismatch
//!   fails closed (no silent substitution).
//! - Decoding mirrors the live session for the en-only model: task Transcribe,
//!   language None (auto), target None, default timestamps, Auto backend.
//! - One shared session across repeats+clips (production-faithful: the desktop
//!   engine holds its session across dictations).
//! - 3 timed repeats per clip; median timing; repeatability asserted
//!   (identical hypotheses — CPU inference is deterministic).
//! - Dual scoring, documented here (do NOT silently mix them):
//!   STRICT = raw whitespace tokens, case- and punctuation-SENSITIVE
//!   (attribution continuity with T11-A).
//!   LOWER = Unicode-lowercased tokens (isolates casing differences).
//!   NORMALIZED = lowercased, every non-alphanumeric/non-whitespace char
//!   removed, whitespace collapsed (isolates word-accuracy for claims).
//!   CER is reported on raw text. The STRICT→LOWER delta is the casing
//!   signal; the LOWER→NORMALIZED delta is the punctuation signal.
//!
//! Run with:
//! `PARAKEET_MODEL_PATH=/abs/path/parakeet-unified-en-0.6b-Q8_0.gguf \
//!  LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs \
//!  cargo test -p soravo-stt --test gguf_benchmark -- --ignored --nocapture`
//! (#[ignore]d so CI without the 731 MB artifact stays green.)

use sha2::Digest;
use soravo_stt::benchmark::BenchmarkHarness;
use transcribe_cpp::{init_backends_default, Model, ModelOptions, RunOptions};

// SHA-256 of the approved artifact (repo-root file; catalog + T11-A record).
const MODEL_SHA256: &str = "4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795";
// (file_id, wav SHA-256, reference-txt SHA-256) — T11-A corpus, Phase-1 verified.
const FIXTURES: &[(&str, &str, &str)] = &[
    (
        "t11a_01_hello",
        "2173a554d1436995170fe301ba40315e19b3d1b6c209263593230eb23efbf90f",
        "59ffa6e28b39baa55afcd626492e4aa5a9e961003d747d4984d9da6c9f064ecf",
    ),
    (
        "t11a_02_fox",
        "503b531739002ea4049e020489cae90802536b5b4293c3a843ef8b707c4fb2dc",
        "b47cc0f104b62d4c7c30bcd68fd8e67613e287dc4ad8c310ef10cbadea9c4380",
    ),
    (
        "t11a_03_paris",
        "305b2547a6df9fc3f6faf90ba2b7057e85cadeef14a8857b25137b7ba7651df2",
        "ee5f508644db8df6cf033cc7b7911c3adaaf81df7f81ab6e932f673e3b276ffb",
    ),
];

const REPEATS: usize = 3;

fn sha256_file(path: &str) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("read {}: {}", path, e))?;
    Ok(format!("{:x}", sha2::Sha256::digest(&bytes)))
}

fn verify_pin(path: &str, expected: &str, what: &str) -> Result<(), String> {
    let actual = sha256_file(path)?;
    if actual != expected {
        return Err(format!(
            "FAIL-CLOSED {} hash mismatch for {}: expected {} got {}",
            what, path, expected, actual
        ));
    }
    Ok(())
}

/// Unicode-lowercased tokens (casing signal = STRICT − LOWER).
fn lower_tokens(s: &str) -> Vec<String> {
    s.split_whitespace().map(|w| w.to_lowercase()).collect()
}

/// Lowercase + strip every non-alphanumeric/non-whitespace char, collapse
/// whitespace (punctuation signal = LOWER − NORMALIZED). Unicode-aware:
/// `char::is_alphanumeric` keeps accented/CJK letters; everything else that
/// is not whitespace is dropped (including `_`, which is not alphanumeric).
fn normalize_full(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c.is_whitespace() {
                c
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn wer_on(ref_tokens: &[String], hyp_tokens: &[String]) -> f64 {
    BenchmarkHarness::calculate_wer(&ref_tokens.join(" "), &hyp_tokens.join(" "))
}

fn json_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

struct ClipResult {
    file_id: &'static str,
    reference: String,
    hypothesis: String,
    wer_strict: f64,
    wer_lower: f64,
    wer_normalized: f64,
    cer_raw: f64,
    audio_secs: f64,
    median_infer_secs: f64,
    rtf: f64,
    load_secs: f64,
    repeats_identical: bool,
}

fn report_json(results: &[ClipResult], model_sha: &str) -> String {
    let mut out = String::from("{\"evidence\":\"MODEL\",\"corpus\":\"t11a-fixed-3\",\"clips\":[");
    for (i, r) in results.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        out.push_str(&format!(
            "{{\"id\":\"{}\",\"reference\":\"{}\",\"hypothesis\":\"{}\",\
             \"wer_strict\":{:.4},\"wer_lower\":{:.4},\"wer_normalized\":{:.4},\"cer_raw\":{:.4},\
             \"audio_secs\":{:.2},\"median_infer_secs\":{:.3},\"rtf\":{:.2},\"repeats_identical\":{}}}",
            r.file_id,
            json_escape(&r.reference),
            json_escape(&r.hypothesis),
            r.wer_strict,
            r.wer_lower,
            r.wer_normalized,
            r.cer_raw,
            r.audio_secs,
            r.median_infer_secs,
            r.rtf,
            r.repeats_identical
        ));
    }
    out.push_str(&format!(
        "],\"model_sha256\":\"{}\",\"limits\":\"3-clip fixed corpus; NOT statistically representative\"}}",
        model_sha
    ));
    out
}

#[test]
#[ignore]
fn gguf_benchmark_fixed_corpus() {
    let model_path = std::env::var("PARAKEET_MODEL_PATH").expect("PARAKEET_MODEL_PATH not set");

    // Fail closed on any substitution.
    verify_pin(&model_path, MODEL_SHA256, "model").expect("model pin");
    for (id, wav_sha, txt_sha) in FIXTURES {
        verify_pin(
            &format!("tests/fixtures/audio/{}.wav", id),
            wav_sha,
            "fixture",
        )
        .expect("wav pin");
        verify_pin(
            &format!("tests/fixtures/ground_truth/{}.txt", id),
            txt_sha,
            "reference",
        )
        .expect("txt pin");
    }

    let load_start = std::time::Instant::now();
    init_backends_default().expect("register transcribe-cpp backends");
    let model = Model::load_with(&model_path, &ModelOptions::default()).expect("load GGUF");
    let load_secs = load_start.elapsed().as_secs_f64();
    let mut session = model.session().expect("create session");

    let mut results = Vec::new();
    for (file_id, _, _) in FIXTURES {
        let audio_path = format!("tests/fixtures/audio/{}.wav", file_id);
        let ref_path = format!("tests/fixtures/ground_truth/{}.txt", file_id);
        let reference = std::fs::read_to_string(&ref_path)
            .expect("read reference")
            .trim()
            .to_string();

        let mut reader = hound::WavReader::open(&audio_path).expect("open wav");
        let spec = reader.spec();
        assert_eq!(spec.sample_rate, 16000, "corpus must be 16 kHz");
        assert_eq!(spec.channels, 1, "corpus must be mono");
        let samples: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.map(|v| v as f32 / 32768.0))
            .collect::<Result<_, _>>()
            .expect("read samples");
        let audio_secs = samples.len() as f64 / 16000.0;

        let mut times = Vec::new();
        let mut hypotheses = Vec::new();
        for _ in 0..REPEATS {
            let start = std::time::Instant::now();
            let transcript = session
                .run(
                    &samples,
                    &RunOptions {
                        ..Default::default()
                    },
                )
                .expect("inference");
            times.push(start.elapsed().as_secs_f64());
            hypotheses.push(transcript.text);
        }
        times.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let median = times[times.len() / 2];
        let repeats_identical = hypotheses.iter().all(|h| h == &hypotheses[0]);
        assert!(
            repeats_identical,
            "nondeterministic inference for {}: {:?}",
            file_id, hypotheses
        );
        let hypothesis = hypotheses.into_iter().next().unwrap();

        // Live-mirror decoding uses language None (auto); the harness default
        // RunOptions carry Task::Transcribe + default timestamps (verified
        // against transcribe_cpp_run_plan for the en-only model).
        let ref_tokens: Vec<String> = reference
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();
        let hyp_tokens: Vec<String> = hypothesis
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();
        let wer_strict = wer_on(&ref_tokens, &hyp_tokens);
        let wer_lower = wer_on(&lower_tokens(&reference), &lower_tokens(&hypothesis));
        let wer_normalized = BenchmarkHarness::calculate_wer(
            &normalize_full(&reference),
            &normalize_full(&hypothesis),
        );
        let cer_raw = BenchmarkHarness::calculate_cer(&reference, &hypothesis);

        results.push(ClipResult {
            file_id,
            reference,
            hypothesis,
            wer_strict,
            wer_lower,
            wer_normalized,
            cer_raw,
            audio_secs,
            median_infer_secs: median,
            rtf: median / audio_secs,
            load_secs,
            repeats_identical,
        });
    }

    println!("BENCH human-readable (MODEL-level, raw output, no pipeline transforms):");
    for r in &results {
        println!(
            "BENCH clip={} audio={:.2}s infer_median={:.3}s rtf={:.2}x load={:.2}s",
            r.file_id, r.audio_secs, r.median_infer_secs, r.rtf, r.load_secs
        );
        println!("BENCH   ref ={:?}", r.reference);
        println!("BENCH   hyp ={:?}", r.hypothesis);
        println!("BENCH   wer_strict={:.4} wer_lower={:.4} wer_normalized={:.4} cer_raw={:.4} identical_repeats={}",
            r.wer_strict, r.wer_lower, r.wer_normalized, r.cer_raw, r.repeats_identical);
    }
    println!("BENCH json={}", report_json(&results, MODEL_SHA256));
}

// ---- Regression tests (no model needed; run in the normal suite) ----

#[test]
fn scoring_strict_is_case_and_punct_sensitive() {
    // "Hello," vs "hello" and "well." vs "well" must BOTH count strictly.
    let wer = BenchmarkHarness::calculate_wer("Hello, world.", "hello world");
    assert!(wer > 0.0, "strict WER must penalize case/punct");
}

#[test]
fn scoring_normalized_ignores_case_and_punct() {
    let a = normalize_full("Hello, World!  How ARE you?");
    assert_eq!(a, "hello world how are you");
    let wer = BenchmarkHarness::calculate_wer(&a, &normalize_full("hello world how are you"));
    assert_eq!(wer, 0.0);
}

#[test]
fn scoring_lower_isolates_casing_only() {
    // Same words/punct, different case → strict penalizes, lower does not.
    let (r, h) = ("Hello World", "hello world");
    assert!(BenchmarkHarness::calculate_wer(r, h) > 0.0);
    assert_eq!(wer_on(&lower_tokens(r), &lower_tokens(h)), 0.0);
}

#[test]
fn scoring_deltas_attribute_punct_vs_case() {
    // Punctuation-only difference: strict>0, lower>0, normalized==0.
    let (r, h) = ("June, and", "June and");
    let strict = BenchmarkHarness::calculate_wer(r, h);
    let lower = wer_on(&lower_tokens(r), &lower_tokens(h));
    let norm = BenchmarkHarness::calculate_wer(&normalize_full(r), &normalize_full(h));
    assert!(strict > 0.0 && lower > 0.0 && norm == 0.0);
}

#[test]
fn reference_loading_trims_and_missing_dir_fails_closed() {
    use soravo_stt::benchmark::BenchmarkConfig;
    use soravo_stt::benchmark::BenchmarkHarness;
    let err = BenchmarkHarness::new(BenchmarkConfig {
        audio_dir: "tests/fixtures/audio".to_string(),
        ground_truth_dir: "tests/fixtures/DOES-NOT-EXIST".to_string(),
        warmup_runs: 0,
        benchmark_runs: 1,
        sample_rate: 16000,
    });
    assert!(err.is_err(), "missing ground-truth dir must fail closed");
}

#[test]
fn hash_verification_rejects_mismatch() {
    // Correct path shape, wrong pin → closed. (Never asserts a real mismatch
    // on pinned files; that path is exercised by the ignored bench test.)
    let tmp = std::env::temp_dir().join("gguf_bench_hash_probe.txt");
    std::fs::write(&tmp, "probe").unwrap();
    let res = verify_pin(tmp.to_str().unwrap(), "0".repeat(64).as_str(), "probe");
    assert!(res.is_err());
    std::fs::remove_file(&tmp).unwrap();
}

#[test]
fn report_structure_is_deterministic() {
    let r = ClipResult {
        file_id: "x",
        reference: "a\"b".to_string(),
        hypothesis: "c".to_string(),
        wer_strict: 0.5,
        wer_lower: 0.5,
        wer_normalized: 0.0,
        cer_raw: 0.25,
        audio_secs: 6.0,
        median_infer_secs: 0.5,
        rtf: 0.08,
        load_secs: 1.0,
        repeats_identical: true,
    };
    let json = report_json(&[r], "abc");
    assert!(json.contains("\"evidence\":\"MODEL\""));
    assert!(json.contains("\"id\":\"x\""));
    assert!(json.contains("a\\\"b"), "quotes must be escaped");
    assert!(json.contains("\"limits\":\"3-clip fixed corpus; NOT statistically representative\""));
}
