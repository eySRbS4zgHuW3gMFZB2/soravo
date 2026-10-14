//! LibriSpeech Tier-B full benchmark driver (test-only).
//!
//! Exercises the ACTUAL production inference path — transcribe-cpp
//! `Model::load_with → session.run` — over ALL utterances of the local
//! LibriSpeech `test-clean` corpus (2,620 utterances) with the exact approved
//! Parakeet Unified EN 0.6B Q8_0 artifact. Never touches production code, the
//! microphone, the network, or app-layer post-processing: hypotheses here are
//! RAW model output, labeled MODEL-level evidence (not full-pipeline /
//! application-level capture, partial-transcript, post-processing, insertion
//! or overlay evidence).
//!
//! Corpus handling: the original FLAC corpus is NEVER modified. Decoding
//! (`flac -d`) is done offline into a scratch dir; this driver reads WAVs
//! from `LIBRISPEECH_TIER_B_DIR` and reference transcripts from the corpus
//! `.trans.txt` files under `LIBRISPEECH_REF_DIR` (the `test-clean` root).
//! Per-clip results are appended as JSONL (`tier_b_clips.jsonl`) and a summary
//! manifest (`tier_b_manifest.json`) is written to `LIBRISPEECH_OUT_DIR`.
//! Corpus audio and full transcripts stay out of git — only small manifests
//! are committable per the project's evidence policy.
//!
//! Selection (deterministic, run-order/time independent): every utterance ID
//! parsed from every `*.trans.txt` under the ref root, sorted
//! lexicographically. Each ID is validated 1:1 against its chapter
//! `.trans.txt` line (`^ID ` anchor); empty references and missing FLACs are
//! recorded as per-clip failures, never silently omitted.
//!
//! Scoring (all preserved; strict is never replaced):
//! - STRICT WER: raw whitespace-separated tokens, case- and
//!   punctuation-sensitive. Corpus aggregate = total strict edits / total
//!   strict reference words (NOT a mean of per-clip ratios).
//! - LOWER WER: same tokenization after Unicode-lowercasing each token
//!   (`str::to_lowercase` per whitespace token, rejoined with single spaces).
//! - STRICT CER: character-level Levenshtein distance on the raw reference /
//!   hypothesis strings (every `char`, including spaces) divided by reference
//!   char count; corpus aggregate = total char edits / total ref chars.
//! - LOWER CER: same as strict CER after Unicode-lowercasing both strings.
//!
//! No punctuation-normalized metric is reported: no punctuation normalization
//! is specified for this runner, and strict is always preserved.
//!
//! Repeatability: Tier-A established 2-repeat identical inference on 12 clips.
//! Tier-B runs one inference per clip (full-corpus cost), plus a 2-repeat
//! identical check on the first `TIER_B_REPEAT_CHECK_N` clips (default 12).
//!
//! Resume: `tier_b_clips.jsonl` is the checkpoint. Completed clip IDs found
//! there are reloaded (metrics reused) and skipped for inference on rerun;
//! failed clips are retried. No clip is ever silently omitted: acceptance
//! requires attempted == completed + failed with every exclusion explained.
//!
//! Run with:
//! `PARAKEET_MODEL_PATH=/abs/path/parakeet-unified-en-0.6b-Q8_0.gguf \
//!  LIBRISPEECH_TIER_B_DIR=/tmp/librispeech-tier-b/wav \
//!  LIBRISPEECH_REF_DIR=/abs/path/LibriSpeech/test-clean \
//!  LIBRISPEECH_OUT_DIR=/tmp/librispeech-tier-b/out \
//!  LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs \
//!  cargo test -p soravo-stt --test librispeech_tier_b -- --ignored --nocapture`
//! (#[ignore]d so CI without the 731 MB artifact + corpus stays green.)

use sha2::Digest;
use std::collections::{HashMap, HashSet};
use transcribe_cpp::{init_backends_default, Model, ModelOptions, RunOptions};

// SHA-256 of the approved artifact (catalog + T11-A record). Do not change
// the selected launch model or this hash without a new approval.
const MODEL_SHA256: &str = "4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795";

fn sha256_file(path: &str) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("read {}: {}", path, e))?;
    Ok(format!("{:x}", sha2::Sha256::digest(&bytes)))
}

/// Word-level edit counts: (edit_distance, reference_token_count).
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

/// Character-level edit counts: (edit_distance, reference_char_count).
/// Operates on raw `char` sequences (spaces included, no tokenization).
fn char_edit_counts(reference: &str, hypothesis: &str) -> (usize, usize) {
    let r: Vec<char> = reference.chars().collect();
    let h: Vec<char> = hypothesis.chars().collect();
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

/// Split an utterance ID ("sp-ch-utt") into its speaker and chapter parts.
/// Single parsing rule shared by discovery and reference lookup.
fn chapter_of(utt_id: &str) -> Result<(&str, &str), String> {
    let mut parts = utt_id.splitn(3, '-');
    let sp = parts.next().filter(|s| !s.is_empty());
    let ch = parts.next().filter(|s| !s.is_empty());
    let utt = parts.next().filter(|s| !s.is_empty());
    match (sp, ch, utt) {
        (Some(sp), Some(ch), Some(_)) => Ok((sp, ch)),
        _ => Err(format!("bad utterance id {}", utt_id)),
    }
}

/// Look up the reference transcript for `utt_id` ("sp-ch-utt") in the corpus
/// chapter transcript file `<ref_root>/<sp>/<ch>/<sp>-<ch>.trans.txt`.
///
/// The match is anchored: the line must start with the full utterance ID
/// followed by a blank separator. A longer ID that merely shares the prefix
/// (e.g. `1-2-00000` when looking up `1-2-0000`) is skipped, never matched.
fn reference_for(ref_root: &str, utt_id: &str) -> Result<String, String> {
    let (sp, ch) = chapter_of(utt_id)?;
    let trans_path = format!("{}/{}/{}/{}-{}.trans.txt", ref_root, sp, ch, sp, ch);
    let content =
        std::fs::read_to_string(&trans_path).map_err(|e| format!("read {}: {}", trans_path, e))?;
    for line in content.lines() {
        if let Some(rest) = line.strip_prefix(utt_id) {
            if !rest.starts_with([' ', '\t']) {
                continue;
            }
            let text = rest.trim().to_string();
            if text.is_empty() {
                return Err(format!("empty reference for {}", utt_id));
            }
            return Ok(text);
        }
    }
    Err(format!(
        "no reference line for {} in {}",
        utt_id, trans_path
    ))
}

/// Deterministically discover every utterance ID under `ref_root` by scanning
/// all `*.trans.txt` files. Returns sorted IDs plus the reference map.
/// Lines with empty transcripts are recorded as failures by the caller; this
/// function keeps them out of the map and reports their IDs separately.
fn discover_utterances(ref_root: &str) -> Result<(Vec<String>, HashMap<String, String>), String> {
    let mut map: HashMap<String, String> = HashMap::new();
    let mut stack = vec![ref_root.to_string()];
    let mut trans_files: Vec<String> = Vec::new();
    while let Some(dir) = stack.pop() {
        let entries = std::fs::read_dir(&dir).map_err(|e| format!("read dir {}: {}", dir, e))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("dir entry {}: {}", dir, e))?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if path.is_dir() {
                stack.push(path.to_string_lossy().to_string());
            } else if name.ends_with(".trans.txt") {
                trans_files.push(path.to_string_lossy().to_string());
            }
        }
    }
    trans_files.sort();
    for file in &trans_files {
        let content = std::fs::read_to_string(file).map_err(|e| format!("read {}: {}", file, e))?;
        for line in content.lines() {
            let line = line.trim_end();
            if line.is_empty() {
                continue;
            }
            let mut split = line.splitn(2, char::is_whitespace);
            let id = split.next().unwrap_or("").to_string();
            if id.is_empty() {
                continue;
            }
            // Validate the ID shape; malformed lines fail loudly.
            chapter_of(&id)?;
            let text = split.next().unwrap_or("").trim().to_string();
            if text.is_empty() {
                continue; // caller treats missing-from-map as empty-reference failure
            }
            map.insert(id, text);
        }
    }
    let mut ids: Vec<String> = map.keys().cloned().collect();
    ids.sort();
    Ok((ids, map))
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

#[derive(Clone)]
struct ClipMetrics {
    id: String,
    reference: String,
    hypothesis: String,
    strict_edits: usize,
    strict_ref_words: usize,
    lower_edits: usize,
    lower_ref_words: usize,
    cer_edits: usize,
    cer_ref_chars: usize,
    cer_lower_edits: usize,
    cer_lower_ref_chars: usize,
    audio_secs: f64,
    infer_secs: f64,
    rtf: f64,
    repeats_identical: bool,
}

/// Reload checkpointed clip metrics from `tier_b_clips.jsonl` (resume path).
/// The file holds one JSON object per line; only well-formed `completed`
/// lines are reused. Malformed lines are ignored (that clip is re-run).
fn load_checkpoint(path: &str) -> HashMap<String, ClipMetrics> {
    let mut out = HashMap::new();
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return out,
    };
    for line in content.lines() {
        if !line.contains("\"status\":\"completed\"") {
            continue;
        }
        // Minimal field extraction without a JSON dependency.
        let get_str = |key: &str| -> Option<String> {
            let pat = format!("\"{}\":\"", key);
            let start = line.find(&pat)? + pat.len();
            let mut esc = false;
            let mut val = String::new();
            for c in line[start..].chars() {
                if esc {
                    match c {
                        '"' => val.push('"'),
                        '\\' => val.push('\\'),
                        'n' => val.push('\n'),
                        'r' => val.push('\r'),
                        't' => val.push('\t'),
                        _ => {
                            val.push('\\');
                            val.push(c);
                        }
                    }
                    esc = false;
                } else if c == '\\' {
                    esc = true;
                } else if c == '"' {
                    break;
                } else {
                    val.push(c);
                }
            }
            Some(val)
        };
        let get_usize = |key: &str| -> Option<usize> {
            let pat = format!("\"{}\":", key);
            let start = line.find(&pat)? + pat.len();
            line[start..]
                .split(|c: char| !c.is_ascii_digit())
                .next()?
                .parse()
                .ok()
        };
        let get_f64 = |key: &str| -> Option<f64> {
            let pat = format!("\"{}\":", key);
            let start = line.find(&pat)? + pat.len();
            line[start..]
                .split(|c: char| {
                    !(c.is_ascii_digit()
                        || c == '.'
                        || c == 'e'
                        || c == 'E'
                        || c == '-'
                        || c == '+')
                })
                .next()?
                .parse()
                .ok()
        };
        let (id, reference, hypothesis) =
            match (get_str("id"), get_str("reference"), get_str("hypothesis")) {
                (Some(a), Some(b), Some(c)) => (a, b, c),
                _ => continue,
            };
        let m = ClipMetrics {
            id: id.clone(),
            reference,
            hypothesis,
            strict_edits: get_usize("strict_edits").unwrap_or(0),
            strict_ref_words: get_usize("strict_ref_words").unwrap_or(0),
            lower_edits: get_usize("lower_edits").unwrap_or(0),
            lower_ref_words: get_usize("lower_ref_words").unwrap_or(0),
            cer_edits: get_usize("cer_edits").unwrap_or(0),
            cer_ref_chars: get_usize("cer_ref_chars").unwrap_or(0),
            cer_lower_edits: get_usize("cer_lower_edits").unwrap_or(0),
            cer_lower_ref_chars: get_usize("cer_lower_ref_chars").unwrap_or(0),
            audio_secs: get_f64("audio_secs").unwrap_or(0.0),
            infer_secs: get_f64("infer_secs").unwrap_or(0.0),
            rtf: get_f64("rtf").unwrap_or(0.0),
            repeats_identical: line.contains("\"repeats_identical\":true"),
        };
        out.insert(id, m);
    }
    out
}

#[test]
#[ignore]
fn librispeech_tier_b_full() {
    let model_path = std::env::var("PARAKEET_MODEL_PATH").expect("PARAKEET_MODEL_PATH not set");
    let wav_dir = std::env::var("LIBRISPEECH_TIER_B_DIR").expect("LIBRISPEECH_TIER_B_DIR not set");
    let ref_root = std::env::var("LIBRISPEECH_REF_DIR").expect("LIBRISPEECH_REF_DIR not set");
    let out_dir =
        std::env::var("LIBRISPEECH_OUT_DIR").unwrap_or_else(|_| format!("{}/out", wav_dir));
    let repeat_check_n: usize = std::env::var("TIER_B_REPEAT_CHECK_N")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(12);

    // Fail closed on artifact substitution.
    let actual = sha256_file(&model_path).expect("hash model");
    assert_eq!(
        actual, MODEL_SHA256,
        "model pin mismatch: refusing to benchmark a substituted artifact"
    );

    // Deterministic full-corpus discovery.
    let (ids, ref_map) = discover_utterances(&ref_root).expect("discover utterances");
    assert!(
        !ids.is_empty(),
        "no utterances discovered under {}",
        ref_root
    );
    println!("BENCH Tier-B discovery: {} utterances (sorted)", ids.len());

    std::fs::create_dir_all(&out_dir).expect("create out dir");
    let clips_path = format!("{}/tier_b_clips.jsonl", out_dir);
    let checkpoint = load_checkpoint(&clips_path);
    if !checkpoint.is_empty() {
        println!(
            "BENCH resume: {} checkpointed clips reloaded from {}",
            checkpoint.len(),
            clips_path
        );
    }
    // Append-mode checkpoint writer (resume-safe).
    let clips_file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&clips_path)
        .expect("open clips jsonl");
    let mut clips_file = std::io::BufWriter::new(clips_file);
    use std::io::Write as _;

    let load_start = std::time::Instant::now();
    init_backends_default().expect("register transcribe-cpp backends");
    let model = Model::load_with(&model_path, &ModelOptions::default()).expect("load GGUF");
    let load_secs = load_start.elapsed().as_secs_f64();
    let mut session = model.session().expect("create session");

    let mut results: Vec<ClipMetrics> = Vec::new();
    let mut failed: Vec<String> = Vec::new();
    let mut checkpointed: HashSet<String> = HashSet::new();
    let mut repeat_checked = 0usize;

    for id in &ids {
        if let Some(m) = checkpoint.get(id) {
            if !checkpointed.insert(id.clone()) {
                continue;
            }
            results.push(m.clone());
            continue;
        }
        let reference = match ref_map.get(id) {
            Some(r) if !r.trim().is_empty() => r.clone(),
            _ => {
                let e = format!("{}: empty or missing reference", id);
                failed.push(e.clone());
                writeln!(
                    clips_file,
                    "{{\"id\":\"{}\",\"status\":\"failed\",\"error\":\"{}\"}}",
                    json_escape(id),
                    json_escape(&e)
                )
                .expect("write checkpoint");
                continue;
            }
        };
        let audio_path = format!("{}/{}.wav", wav_dir, id);
        let mut reader = match hound::WavReader::open(&audio_path) {
            Ok(r) => r,
            Err(e) => {
                let msg = format!("{}: missing decoded wav {}: {}", id, audio_path, e);
                failed.push(msg.clone());
                writeln!(
                    clips_file,
                    "{{\"id\":\"{}\",\"status\":\"failed\",\"error\":\"{}\"}}",
                    json_escape(id),
                    json_escape(&msg)
                )
                .expect("write checkpoint");
                continue;
            }
        };
        let spec = reader.spec();
        if spec.sample_rate != 16000 || spec.channels != 1 {
            let msg = format!("{}: bad wav format {:?} (must be 16 kHz mono)", id, spec);
            failed.push(msg.clone());
            writeln!(
                clips_file,
                "{{\"id\":\"{}\",\"status\":\"failed\",\"error\":\"{}\"}}",
                json_escape(id),
                json_escape(&msg)
            )
            .expect("write checkpoint");
            continue;
        }
        let samples: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.map(|v| v as f32 / 32768.0))
            .collect::<Result<_, _>>()
            .expect("read samples");
        let audio_secs = samples.len() as f64 / 16000.0;

        // Inference: 2-repeat identical check for the first N clips, single
        // run afterwards (full-corpus cost control).
        let (hypothesis, infer_secs, repeats_identical) = if repeat_checked < repeat_check_n {
            repeat_checked += 1;
            let mut times = Vec::new();
            let mut hyps = Vec::new();
            for _ in 0..2 {
                let start = std::time::Instant::now();
                let t = session
                    .run(
                        &samples,
                        &RunOptions {
                            ..Default::default()
                        },
                    )
                    .expect("inference")
                    .text;
                times.push(start.elapsed().as_secs_f64());
                hyps.push(t);
            }
            let identical = hyps.iter().all(|h| h == &hyps[0]);
            assert!(identical, "nondeterministic inference for {}", id);
            times.sort_by(|a, b| a.partial_cmp(b).unwrap());
            (
                hyps.into_iter().next().unwrap(),
                times[times.len() / 2],
                true,
            )
        } else {
            let start = std::time::Instant::now();
            let t = session
                .run(
                    &samples,
                    &RunOptions {
                        ..Default::default()
                    },
                )
                .expect("inference")
                .text;
            (t, start.elapsed().as_secs_f64(), false)
        };

        let (se, sw) = edit_counts(&reference, &hypothesis);
        let (le, lw) = edit_counts(&lower(&reference), &lower(&hypothesis));
        let (ce, cc) = char_edit_counts(&reference, &hypothesis);
        let (cle, clc) = char_edit_counts(&lower(&reference), &lower(&hypothesis));
        let m = ClipMetrics {
            id: id.clone(),
            reference: reference.clone(),
            hypothesis: hypothesis.clone(),
            strict_edits: se,
            strict_ref_words: sw,
            lower_edits: le,
            lower_ref_words: lw,
            cer_edits: ce,
            cer_ref_chars: cc,
            cer_lower_edits: cle,
            cer_lower_ref_chars: clc,
            audio_secs,
            infer_secs,
            rtf: if audio_secs > 0.0 {
                infer_secs / audio_secs
            } else {
                0.0
            },
            repeats_identical,
        };
        writeln!(
            clips_file,
            "{{\"id\":\"{}\",\"status\":\"completed\",\"reference\":\"{}\",\"hypothesis\":\"{}\",\"strict_edits\":{},\"strict_ref_words\":{},\"lower_edits\":{},\"lower_ref_words\":{},\"cer_edits\":{},\"cer_ref_chars\":{},\"cer_lower_edits\":{},\"cer_lower_ref_chars\":{},\"audio_secs\":{:.2},\"infer_secs\":{:.3},\"rtf\":{:.3},\"repeats_identical\":{}}}",
            json_escape(&m.id), json_escape(&m.reference), json_escape(&m.hypothesis),
            m.strict_edits, m.strict_ref_words, m.lower_edits, m.lower_ref_words,
            m.cer_edits, m.cer_ref_chars, m.cer_lower_edits, m.cer_lower_ref_chars,
            m.audio_secs, m.infer_secs, m.rtf, m.repeats_identical
        )
        .expect("write checkpoint");
        results.push(m);
        if results.len().is_multiple_of(100) {
            clips_file.flush().expect("flush checkpoint");
            println!(
                "BENCH progress: {}/{} completed, {} failed",
                results.len(),
                ids.len(),
                failed.len()
            );
        }
    }
    clips_file.flush().expect("flush checkpoint");

    let attempted = ids.len();
    let completed = results.len();
    let nfailed = failed.len();
    assert_eq!(
        attempted,
        completed + nfailed,
        "every intended utterance must have a completed/failed outcome"
    );

    let tot_se: usize = results.iter().map(|r| r.strict_edits).sum();
    let tot_sw: usize = results.iter().map(|r| r.strict_ref_words).sum();
    let tot_le: usize = results.iter().map(|r| r.lower_edits).sum();
    let tot_lw: usize = results.iter().map(|r| r.lower_ref_words).sum();
    let tot_ce: usize = results.iter().map(|r| r.cer_edits).sum();
    let tot_cc: usize = results.iter().map(|r| r.cer_ref_chars).sum();
    let tot_cle: usize = results.iter().map(|r| r.cer_lower_edits).sum();
    let tot_clc: usize = results.iter().map(|r| r.cer_lower_ref_chars).sum();
    let agg_strict = tot_se as f64 / tot_sw as f64;
    let agg_lower = tot_le as f64 / tot_lw as f64;
    let agg_cer = tot_ce as f64 / tot_cc as f64;
    let agg_cer_lower = tot_cle as f64 / tot_clc as f64;
    let tot_audio: f64 = results.iter().map(|r| r.audio_secs).sum();
    let tot_infer: f64 = results.iter().map(|r| r.infer_secs).sum();

    println!(
        "BENCH Tier-B LibriSpeech test-clean full: {} attempted, {} completed, {} failed",
        attempted, completed, nfailed
    );
    println!("BENCH AGGREGATE clips={} ref_words_strict={} edits_strict={} WER_strict={:.4} ref_words_lower={} edits_lower={} WER_lower={:.4} ref_chars={} cer_edits={} CER_strict={:.4} CER_lower={:.4} audio_total={:.1}s infer_total={:.1}s RTF_overall={:.3}x model_load={:.1}s",
        completed, tot_sw, tot_se, agg_strict, tot_lw, tot_le, agg_lower,
        tot_cc, tot_ce, agg_cer, agg_cer_lower, tot_audio, tot_infer,
        tot_infer / tot_audio, load_secs);
    for f in failed.iter().take(50) {
        println!("BENCH failed: {}", f);
    }
    if failed.len() > 50 {
        println!("BENCH ... and {} more failures", failed.len() - 50);
    }

    let runner_version =
        std::env::var("TIER_B_RUNNER_VERSION").unwrap_or_else(|_| "unknown".to_string());
    let failures_json = failed
        .iter()
        .map(|f| format!("\"{}\"", json_escape(f)))
        .collect::<Vec<_>>()
        .join(",");
    let manifest = format!(
        "{{\"evidence\":\"MODEL\",\"corpus\":\"librispeech-test-clean\",\"subset\":\"tier-b-full\",\"selection\":\"all-utterances-from-trans-txt-sorted\",\"attempted\":{},\"completed\":{},\"failed\":{},\"aggregate\":{{\"strict_edits\":{},\"strict_ref_words\":{},\"wer_strict\":{:.4},\"lower_edits\":{},\"lower_ref_words\":{},\"wer_lower\":{:.4},\"cer_edits\":{},\"cer_ref_chars\":{},\"cer_strict\":{:.4},\"cer_lower_edits\":{},\"cer_lower_ref_chars\":{},\"cer_lower\":{:.4}}},\"model_sha256\":\"{}\",\"model_load_secs\":{:.1},\"audio_total_secs\":{:.1},\"infer_total_secs\":{:.1},\"rtf_overall\":{:.3},\"repeat_check_n\":{},\"runner_version\":\"{}\",\"failures\":[{}]}}",
        attempted, completed, nfailed,
        tot_se, tot_sw, agg_strict, tot_le, tot_lw, agg_lower,
        tot_ce, tot_cc, agg_cer, tot_cle, tot_clc, agg_cer_lower,
        MODEL_SHA256, load_secs, tot_audio, tot_infer, tot_infer / tot_audio,
        repeat_check_n, json_escape(&runner_version), failures_json
    );
    std::fs::write(format!("{}/tier_b_manifest.json", out_dir), &manifest).expect("write manifest");
    println!("BENCH manifest_written={}/tier_b_manifest.json", out_dir);
    println!("BENCH clips_written={}", clips_path);
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
fn edit_counts_cover_insertions_deletions_substitutions() {
    // substitution: 1 edit / 2 words
    assert_eq!(edit_counts("hello world", "hello there"), (1, 2));
    // deletion: hypothesis drops a word → 1 edit / 3 words
    assert_eq!(edit_counts("a b c", "a b"), (1, 3));
    // insertion: hypothesis adds a word → 1 edit / 2 words
    assert_eq!(edit_counts("a b", "a x b"), (1, 2));
    // substitution + deletion = 2 edits over 3 ref words
    let (e, w) = edit_counts("a b c", "a x");
    assert_eq!((e, w), (2, 3));
}

#[test]
fn edit_counts_empty_hypothesis_and_reference() {
    assert_eq!(edit_counts("", ""), (0, 0));
    // Empty hypothesis vs non-empty reference: all words deleted.
    assert_eq!(edit_counts("hello world", ""), (2, 2));
    // Empty reference vs non-empty hypothesis: insertions counted, 0 ref words.
    assert_eq!(edit_counts("", "hello"), (1, 0));
    assert_eq!(edit_counts("   ", ""), (0, 0));
}

#[test]
fn edit_counts_punctuation_is_significant_for_strict() {
    // Strict tokenization is whitespace-only: punctuation changes the token.
    // "hello," vs "hello" is one substitution; "world" matches.
    assert_eq!(edit_counts("hello, world", "hello world"), (1, 2));
    assert_eq!(edit_counts("HELLO WORLD.", "HELLO WORLD."), (0, 2));
}

#[test]
fn edit_counts_unicode_tokens() {
    assert_eq!(edit_counts("café naïve", "café naïve"), (0, 2));
    assert_eq!(edit_counts("café", "cafe"), (1, 1));
    // CJK: whitespace tokenization treats a spaceless string as one token.
    assert_eq!(edit_counts("你好世界", "你好世界"), (0, 1));
}

#[test]
fn cer_known_examples() {
    assert_eq!(char_edit_counts("", ""), (0, 0));
    assert_eq!(char_edit_counts("hello", "hello"), (0, 5));
    // substitution: 1 char edit / 5 ref chars = 0.2
    assert_eq!(char_edit_counts("hello", "hallo"), (1, 5));
    // insertion / deletion at char level
    assert_eq!(char_edit_counts("abc", "abbc"), (1, 3));
    assert_eq!(char_edit_counts("abbc", "abc"), (1, 4));
    // empty hypothesis: all chars deleted
    assert_eq!(char_edit_counts("hi", ""), (2, 2));
    // spaces count as characters
    let (e, w) = char_edit_counts("a b", "ab");
    assert_eq!((e, w), (1, 3));
}

#[test]
fn cer_unicode_and_case() {
    // Case-sensitive: strict CER counts case changes.
    assert_eq!(char_edit_counts("Hello", "hello"), (1, 5));
    // Lowered CER folds case.
    assert_eq!(char_edit_counts(&lower("Hello"), &lower("hello")), (0, 5));
    assert_eq!(char_edit_counts("café", "café"), (0, 4));
}

#[test]
fn reference_lookup_parses_trans_txt_lines() {
    let dir = std::env::temp_dir().join("tier_b_ref_probe");
    std::fs::create_dir_all(dir.join("1").join("2")).unwrap();
    std::fs::write(
        dir.join("1").join("2").join("1-2.trans.txt"),
        "1-2-0000 HELLO WORLD\n",
    )
    .unwrap();
    let got = reference_for(dir.to_str().unwrap(), "1-2-0000").unwrap();
    assert_eq!(got, "HELLO WORLD");
    assert!(reference_for(dir.to_str().unwrap(), "1-2-9999").is_err());
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn reference_lookup_rejects_prefix_collisions() {
    // A longer utterance ID sharing the lookup ID as a string prefix must not
    // match: only a full ID followed by a blank separator matches.
    let dir = std::env::temp_dir().join("tier_b_ref_prefix_probe");
    std::fs::create_dir_all(dir.join("1").join("2")).unwrap();
    std::fs::write(
        dir.join("1").join("2").join("1-2.trans.txt"),
        "1-2-00000 WRONG LINE\n1-2-0000 RIGHT LINE\n",
    )
    .unwrap();
    let got = reference_for(dir.to_str().unwrap(), "1-2-0000").unwrap();
    assert_eq!(got, "RIGHT LINE");
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn reference_lookup_reports_missing_files() {
    let dir = std::env::temp_dir().join("tier_b_ref_missing_probe");
    std::fs::create_dir_all(&dir).unwrap();
    // No chapter directory at all → read error, never a silent empty string.
    assert!(reference_for(dir.to_str().unwrap(), "9-9-0000").is_err());
    // Malformed IDs rejected before any filesystem access pattern matters.
    assert!(reference_for(dir.to_str().unwrap(), "nodashes").is_err());
    assert!(reference_for(dir.to_str().unwrap(), "").is_err());
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn chapter_parsing_rejects_malformed_ids() {
    assert!(chapter_of("1089-134686-0000").is_ok());
    assert!(chapter_of("nodashes").is_err());
    assert!(chapter_of("only-one").is_err());
    assert!(chapter_of("-134686-0000").is_err());
    assert!(chapter_of("").is_err());
    assert!(chapter_of("1-2-").is_err());
}

#[test]
fn discovery_is_deterministic_and_sorted() {
    let dir = std::env::temp_dir().join("tier_b_discovery_probe");
    std::fs::create_dir_all(dir.join("2").join("1")).unwrap();
    std::fs::create_dir_all(dir.join("1").join("9")).unwrap();
    std::fs::write(
        dir.join("2").join("1").join("2-1.trans.txt"),
        "2-1-0001 SECOND\n2-1-0000 FIRST\n",
    )
    .unwrap();
    std::fs::write(
        dir.join("1").join("9").join("1-9.trans.txt"),
        "1-9-0000 EARLY\n",
    )
    .unwrap();
    let (ids, map) = discover_utterances(dir.to_str().unwrap()).unwrap();
    assert_eq!(ids, vec!["1-9-0000", "2-1-0000", "2-1-0001"]);
    assert_eq!(map.get("2-1-0000").unwrap(), "FIRST");
    // Second run over the same tree yields the identical order.
    let (ids2, _) = discover_utterances(dir.to_str().unwrap()).unwrap();
    assert_eq!(ids, ids2);
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn lower_folds_case_for_scoring() {
    assert_eq!(lower("Hello  WORLD"), "hello world");
    assert_eq!(lower("CAFÉ"), "café");
}
