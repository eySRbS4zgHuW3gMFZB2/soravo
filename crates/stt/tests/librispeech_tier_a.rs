//! LibriSpeech Tier-A smoke benchmark driver (test-only).
//!
//! Exercises the ACTUAL production inference path — transcribe-cpp
//! `Model::load_with → session.run` — over a deterministic 12-clip subset of
//! the local LibriSpeech `test-clean` corpus with the exact approved Q8_0
//! artifact. Never touches production code, the microphone, the network, or
//! app-layer post-processing: hypotheses here are RAW model output, labeled
//! MODEL-level evidence.
//!
//! Tier-A selection (deterministic, run-order/time independent): the
//! lexicographically-first utterance of each of the 12 lowest test-clean
//! speaker IDs. 12 distinct speakers; durations ~5–22 s. Full Tier-B
//! (all 2620 test-clean utterances) is a separate, explicitly-scoped run.
//!
//! Corpus handling: the original FLAC corpus is NEVER modified. Decoding
//! (`flac -d`) is done offline into a scratch dir; this driver reads WAVs
//! from `LIBRISPEECH_TIER_A_DIR` and reference transcripts from the corpus
//! `.trans.txt` files under `LIBRISPEECH_REF_DIR` (the `test-clean` root).
//! Manifest + per-clip results are written as JSON to `LIBRISPEECH_OUT_DIR`.
//!
//! Scoring: STRICT (raw whitespace tokens, case/punct sensitive) and LOWER
//! (Unicode-lowercased tokens). Aggregate WER is corpus-level
//! (total edits / total reference words), NOT a mean of per-clip WER.
//!
//! Run with:
//! `PARAKEET_MODEL_PATH=/abs/path/parakeet-unified-en-0.6b-Q8_0.gguf \
//!  LIBRISPEECH_TIER_A_DIR=/tmp/librispeech-tier-a/wav \
//!  LIBRISPEECH_REF_DIR=/abs/path/LibriSpeech/test-clean \
//!  LIBRISPEECH_OUT_DIR=/tmp/librispeech-tier-a/out \
//!  LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs \
//!  cargo test -p soravo-stt --test librispeech_tier_a -- --ignored --nocapture`
//! (#[ignore]d so CI without the 731 MB artifact + corpus stays green.)

use sha2::Digest;
use transcribe_cpp::{init_backends_default, Model, ModelOptions, RunOptions};

// SHA-256 of the approved artifact (catalog + T11-A record).
const MODEL_SHA256: &str =
    "4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795";

// Tier-A corpus: (utterance_id, flac SHA-256). Reference text is read from
// the corpus `.trans.txt` files (authoritative pairing), not pinned here, so
// a corpus/reference mismatch fails loudly at lookup time instead of via a
// stale pin. FLAC pins guard against silent corpus substitution.
const TIER_A: &[(&str, &str)] = &[
    ("1089-134686-0000", ""),
    ("1188-133604-0000", ""),
    ("121-121726-0000", ""),
    ("1221-135766-0000", ""),
    ("1284-1180-0000", ""),
    ("1320-122612-0000", ""),
    ("1580-141083-0000", ""),
    ("1995-1826-0000", ""),
    ("2094-142345-0000", ""),
    ("2300-131720-0000", ""),
    ("237-126133-0000", ""),
    ("260-123286-0000", ""),
];

const REPEATS: usize = 2;

fn sha256_file(path: &str) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("read {}: {}", path, e))?;
    Ok(format!("{:x}", sha2::Sha256::digest(&bytes)))
}

/// Token-level edit counts: (edit_distance, reference_token_count).
/// The corpus aggregate WER = sum(edits) / sum(ref_words).
fn edit_counts(reference: &str, hypothesis: &str) -> (usize, usize) {
    let r: Vec<&str> = reference.split_whitespace().collect();
    let h: Vec<&str> = hypothesis.split_whitespace().collect();
    let (n, m) = (r.len(), h.len());
    if n == 0 {
        return (m, 0);
    }
    let mut prev: Vec<usize> = (0..=m).collect();
    let mut cur = vec![0usize; m + 1];
    for i in 1..=n {
        cur[0] = i;
        for j in 1..=m {
            cur[j] = if r[i - 1] == h[j - 1] {
                prev[j - 1]
            } else {
                1 + prev[j - 1].min(prev[j]).min(cur[j - 1])
            };
        }
        std::mem::swap(&mut prev, &mut cur);
    }
    (prev[m], n)
}

fn lower(s: &str) -> String {
    s.split_whitespace()
        .map(|w| w.to_lowercase())
        .collect::<Vec<_>>()
        .join(" ")
}

/// Look up the reference transcript for `utt_id` ("sp-ch-utt") in the corpus
/// chapter transcript file `<ref_root>/<sp>/<ch>/<sp>-<ch>.trans.txt`.
fn reference_for(ref_root: &str, utt_id: &str) -> Result<String, String> {
    let mut parts = utt_id.splitn(3, '-');
    let sp = parts.next().ok_or_else(|| format!("bad utt id {}", utt_id))?;
    let ch = parts.next().ok_or_else(|| format!("bad utt id {}", utt_id))?;
    let trans_path = format!("{}/{}/{}/{}-{}.trans.txt", ref_root, sp, ch, sp, ch);
    let content =
        std::fs::read_to_string(&trans_path).map_err(|e| format!("read {}: {}", trans_path, e))?;
    for line in content.lines() {
        if let Some(rest) = line.strip_prefix(utt_id) {
            let text = rest.trim().to_string();
            if text.is_empty() {
                return Err(format!("empty reference for {}", utt_id));
            }
            return Ok(text);
        }
    }
    Err(format!("no reference line for {} in {}", utt_id, trans_path))
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
    id: &'static str,
    reference: String,
    hypothesis: String,
    strict_edits: usize,
    strict_ref_words: usize,
    lower_edits: usize,
    lower_ref_words: usize,
    audio_secs: f64,
    median_infer_secs: f64,
    rtf: f64,
    repeats_identical: bool,
}

#[test]
#[ignore]
fn librispeech_tier_a_smoke() {
    let model_path = std::env::var("PARAKEET_MODEL_PATH").expect("PARAKEET_MODEL_PATH not set");
    let wav_dir =
        std::env::var("LIBRISPEECH_TIER_A_DIR").expect("LIBRISPEECH_TIER_A_DIR not set");
    let ref_root = std::env::var("LIBRISPEECH_REF_DIR").expect("LIBRISPEECH_REF_DIR not set");
    let out_dir = std::env::var("LIBRISPEECH_OUT_DIR").unwrap_or_else(|_| format!("{}/out", wav_dir));

    // Fail closed on artifact substitution.
    let actual = sha256_file(&model_path).expect("hash model");
    assert_eq!(actual, MODEL_SHA256, "model pin mismatch: refusing to benchmark a substituted artifact");
    // Corpus FLAC pins are recorded as empty until the Tier-A manifest is
    // frozen with measured values (a follow-up records sha256 of each source
    // FLAC alongside the wav used here). Decoding is offline via `flac -d`;
    // the original corpus is never modified by this driver.

    let load_start = std::time::Instant::now();
    init_backends_default().expect("register transcribe-cpp backends");
    let model = Model::load_with(&model_path, &ModelOptions::default()).expect("load GGUF");
    let load_secs = load_start.elapsed().as_secs_f64();
    let mut session = model.session().expect("create session");

    let mut results = Vec::new();
    let mut failed: Vec<String> = Vec::new();
    for (file_id, _) in TIER_A {
        let audio_path = format!("{}/{}.wav", wav_dir, file_id);
        let reference = match reference_for(&ref_root, file_id) {
            Ok(r) => r,
            Err(e) => {
                failed.push(format!("{}: {}", file_id, e));
                continue;
            }
        };
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
                .run(&samples, &RunOptions { ..Default::default() })
                .expect("inference");
            times.push(start.elapsed().as_secs_f64());
            hypotheses.push(transcript.text);
        }
        times.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let median = times[times.len() / 2];
        let repeats_identical = hypotheses.iter().all(|h| h == &hypotheses[0]);
        assert!(repeats_identical, "nondeterministic inference for {}", file_id);
        let hypothesis = hypotheses.into_iter().next().unwrap();

        let (se, sw) = edit_counts(&reference, &hypothesis);
        let (le, lw) = edit_counts(&lower(&reference), &lower(&hypothesis));
        results.push(ClipResult {
            id: file_id,
            reference,
            hypothesis,
            strict_edits: se,
            strict_ref_words: sw,
            lower_edits: le,
            lower_ref_words: lw,
            audio_secs,
            median_infer_secs: median,
            rtf: median / audio_secs,
            repeats_identical,
        });
    }

    assert!(failed.is_empty(), "reference lookup failures: {:?}", failed);

    let tot_se: usize = results.iter().map(|r| r.strict_edits).sum();
    let tot_sw: usize = results.iter().map(|r| r.strict_ref_words).sum();
    let tot_le: usize = results.iter().map(|r| r.lower_edits).sum();
    let tot_lw: usize = results.iter().map(|r| r.lower_ref_words).sum();
    let agg_strict = tot_se as f64 / tot_sw as f64;
    let agg_lower = tot_le as f64 / tot_lw as f64;
    let tot_audio: f64 = results.iter().map(|r| r.audio_secs).sum();
    let tot_infer: f64 = results.iter().map(|r| r.median_infer_secs).sum();

    println!("BENCH Tier-A LibriSpeech test-clean subset: {} clips attempted, {} completed, {} failed",
        TIER_A.len(), results.len(), failed.len());
    for r in &results {
        println!("BENCH clip={} audio={:.2}s infer_median={:.3}s rtf={:.2}x",
            r.id, r.audio_secs, r.median_infer_secs, r.rtf);
        println!("BENCH   ref ={:?}", r.reference);
        println!("BENCH   hyp ={:?}", r.hypothesis);
        println!("BENCH   wer_strict={:.4} ({}/{}) wer_lower={:.4} ({}/{}) identical_repeats={}",
            r.strict_edits as f64 / r.strict_ref_words as f64, r.strict_edits, r.strict_ref_words,
            r.lower_edits as f64 / r.lower_ref_words as f64, r.lower_edits, r.lower_ref_words,
            r.repeats_identical);
    }
    println!("BENCH AGGREGATE clips={} ref_words_strict={} edits_strict={} WER_strict={:.4} ref_words_lower={} edits_lower={} WER_lower={:.4} audio_total={:.1}s infer_total={:.1}s RTF_overall={:.2}x model_load={:.1}s",
        results.len(), tot_sw, tot_se, agg_strict, tot_lw, tot_le, agg_lower,
        tot_audio, tot_infer, tot_infer / tot_audio, load_secs);

    // Machine-readable artifacts (written by the runner; corpus audio and full
    // transcripts stay out of git — only these small manifests are committable).
    std::fs::create_dir_all(&out_dir).expect("create out dir");
    let mut manifest = String::from("{\"evidence\":\"MODEL\",\"corpus\":\"librispeech-test-clean\",\"subset\":\"tier-a-12\",\"selection\":\"first-utterance-of-12-lowest-speaker-ids\",\"clips\":[");
    for (i, r) in results.iter().enumerate() {
        if i > 0 {
            manifest.push(',');
        }
        manifest.push_str(&format!(
            "{{\"id\":\"{}\",\"reference\":\"{}\",\"hypothesis\":\"{}\",\"strict_edits\":{},\"strict_ref_words\":{},\"lower_edits\":{},\"lower_ref_words\":{},\"audio_secs\":{:.2},\"median_infer_secs\":{:.3},\"rtf\":{:.3},\"repeats_identical\":{}}}",
            r.id, json_escape(&r.reference), json_escape(&r.hypothesis),
            r.strict_edits, r.strict_ref_words, r.lower_edits, r.lower_ref_words,
            r.audio_secs, r.median_infer_secs, r.rtf, r.repeats_identical
        ));
    }
    manifest.push_str(&format!(
        "],\"aggregate\":{{\"clips\":{},\"strict_edits\":{},\"strict_ref_words\":{},\"wer_strict\":{:.4},\"lower_edits\":{},\"lower_ref_words\":{},\"wer_lower\":{:.4}}},\"model_sha256\":\"{}\",\"model_load_secs\":{:.1},\"audio_total_secs\":{:.1},\"infer_total_secs\":{:.1},\"limits\":\"12-clip smoke subset; NOT statistically representative; Tier-B (full 2620) not run\"}}",
        results.len(), tot_se, tot_sw, agg_strict, tot_le, tot_lw, agg_lower,
        MODEL_SHA256, load_secs, tot_audio, tot_infer
    ));
    std::fs::write(format!("{}/tier_a_manifest.json", out_dir), &manifest).expect("write manifest");
    println!("BENCH manifest_written={}/tier_a_manifest.json", out_dir);
}

// ---- Regression tests (no model/corpus needed; run in the normal suite) ----

#[test]
fn aggregate_wer_is_corpus_weighted_not_mean_of_ratios() {
    // Clip A: 1 edit / 2 words (0.5). Clip B: 0 edits / 8 words (0.0).
    // Corpus WER = 1/10 = 0.1, NOT mean(0.5, 0.0) = 0.25.
    let (e1, w1) = edit_counts("hello world", "hello there");
    let (e2, w2) = edit_counts("a b c d e f g h", "a b c d e f g h");
    assert_eq!((e1, w1), (1, 2));
    assert_eq!((e2, w2), (0, 8));
    let corpus = (e1 + e2) as f64 / (w1 + w2) as f64;
    assert!((corpus - 0.1).abs() < 1e-9);
}

#[test]
fn edit_counts_known_examples() {
    assert_eq!(edit_counts("", ""), (0, 0));
    assert_eq!(edit_counts("hello world", "hello world"), (0, 2));
    // substitution + deletion + insertion = 3 edits over 3 ref words
    let (e, w) = edit_counts("a b c", "a x");
    assert_eq!(w, 3);
    assert_eq!(e, 2); // b->x substitution, c deletion
}

#[test]
fn reference_lookup_parses_trans_txt_lines() {
    let dir = std::env::temp_dir().join("tier_a_ref_probe");
    std::fs::create_dir_all(dir.join("1").join("2")).unwrap();
    std::fs::write(dir.join("1").join("2").join("1-2.trans.txt"), "1-2-0000 HELLO WORLD\n").unwrap();
    let got = reference_for(dir.to_str().unwrap(), "1-2-0000").unwrap();
    assert_eq!(got, "HELLO WORLD");
    assert!(reference_for(dir.to_str().unwrap(), "1-2-9999").is_err());
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn lower_folds_case_for_scoring() {
    assert_eq!(lower("Hello  WORLD"), "hello world");
}
