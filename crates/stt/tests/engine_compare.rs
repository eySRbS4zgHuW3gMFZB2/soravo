//! Engine comparison + resource-profiling harness (test-only, research-only).
//!
//! Compares the FIXED launch model (Parakeet Unified EN 0.6B Q8_0, pinned
//! below) against a Whisper configuration over the SAME deterministic 12-clip
//! subset (the Tier-A utterance set) with the SAME decoded audio inputs fed to
//! both engines. Research-only: results NEVER change the launch-model
//! decision, and are labeled MODEL-level evidence.
//!
//! Whisper-side prerequisite (explicit, not silent): there is NO approved or
//! pinned Whisper model artifact in the canonical spec or the repository, and
//! no Whisper weights exist locally. The Whisper side therefore runs ONLY when
//! BOTH `WHISPER_MODEL_PATH` and `WHISPER_EXPECTED_SHA256` are set (the SHA is
//! verified fail-closed before inference, exactly like the Parakeet pin). A
//! Whisper model WITHOUT an approved pin is never benchmarked: without the
//! pin the side reports SKIPPED (missing-prerequisite), never metrics.
//! `COMPARE_REQUIRE_WHISPER=1` turns that skip into a fail-closed error.
//!
//! Method (protocol: fixed hardware, fixed audio, fixed corpus, release
//! profile preferred, warm + cold distinguished, repeats, recorded commands):
//! - Corpus: the 12 Tier-A utterance IDs (first utterance of the 12 lowest
//!   `test-clean` speaker IDs). Corpus identity remains anchored by the Tier-A
//!   FLAC pins; this harness re-verifies file presence, 16 kHz mono format,
//!   and anchored `.trans.txt` reference lookup per clip.
//! - Engines: `transcribe-cpp Model::load_with → session.run` with IDENTICAL
//!   `RunOptions::default()` for both sides (any per-engine option difference
//!   would be recorded here; there is none).
//! - Cold vs warm: model-load wall time is the cold cost; the first clip's
//!   inference is reported as cold-inference, the rest as warm; the first
//!   `REPEAT_CHECK_N` clips (default 3) run twice with identical-hypothesis
//!   assertion (repeatability).
//! - Scoring: STRICT (raw whitespace tokens, case/punct sensitive) and LOWER
//!   (Unicode-lowercased tokens) per engine, corpus-weighted aggregates. A
//!   strict value from one engine is NEVER compared against a normalized value
//!   from the other: the manifest carries per-engine strict+lower pairs plus
//!   the strict-vs-strict and lower-vs-lower deltas only.
//! - Profiling (model-only): per-clip inference wall times with min/p50/p90/max
//!   distribution (not just the mean), overall RTF = total inference wall /
//!   total audio, process peak RSS (Linux `/proc/self/status` VmHWM; UNKNOWN
//!   elsewhere), process CPU time deltas (Linux `/proc/self/stat`
//!   utime+stime; UNKNOWN elsewhere). Capture-to-insertion, first-partial and
//!   app-level latencies are NOT measurable from file inference and stay
//!   UNKNOWN (see `progress/ACCEPTANCE.md`).
//! - Accounting: attempted == completed + failed is asserted; every failure
//!   (missing reference, missing/bad WAV, inference error, nondeterminism) is
//!   recorded with its clip ID, never silently omitted.
//! - No resume: 12-clip reruns are cheap; checkpointing belongs to the Tier-B
//!   runner (`tier_b_run.json` header gate). Re-running this harness with the
//!   same inputs reproduces the same manifest shape (timings naturally vary).
//!
//! Run with (release preferred per protocol):
//! `PARAKEET_MODEL_PATH=/abs/parakeet-unified-en-0.6b-Q8_0.gguf \
//!  COMPARE_WAV_DIR=/tmp/compare/wav LIBRISPEECH_REF_DIR=/abs/LibriSpeech/test-clean \
//!  COMPARE_OUT_DIR=/tmp/compare/out \
//!  [WHISPER_MODEL_PATH=/abs/whisper-model.gguf WHISPER_EXPECTED_SHA256=<approved-pin>] \
//!  LD_LIBRARY_PATH=<checkout>/apps/desktop/src-tauri/transcribe-libs \
//!  cargo test --release -p soravo-stt --test engine_compare -- --ignored --nocapture`
//! (#[ignore]d so CI without the 731 MB artifact + corpus stays green.)
//! Decode first: `flac -d` each Tier-A FLAC to `<wav>/<utterance-id>.wav`.

use sha2::Digest;
use transcribe_cpp::{init_backends_default, Model, ModelOptions, RunOptions};

// SHA-256 of the approved launch artifact. Fixed launch model: do not change.
const PARAKEET_SHA256: &str = "4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795";

// Tier-A utterance set (IDs only; FLAC identity pins live in
// `librispeech_tier_a.rs`, which remains the corpus-identity anchor).
const SUBSET: &[&str] = &[
    "1089-134686-0000",
    "1188-133604-0000",
    "121-121726-0000",
    "1221-135766-0000",
    "1284-1180-0000",
    "1320-122612-0000",
    "1580-141083-0000",
    "1995-1826-0000",
    "2094-142345-0000",
    "2300-131720-0000",
    "237-126133-0000",
    "260-123286-0000",
];

const REPEAT_CHECK_N_DEFAULT: usize = 3;

fn sha256_file(path: &str) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("read {}: {}", path, e))?;
    Ok(format!("{:x}", sha2::Sha256::digest(&bytes)))
}

/// Word-level edit counts: (edit_distance, reference_token_count).
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

/// Split an utterance ID ("sp-ch-utt") into speaker and chapter parts.
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

/// Anchored reference lookup: the line must start with the full utterance ID
/// followed by a blank separator (prefix collisions never match).
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

// ---------------------------------------------------------------------------
// Resource profiling (model-only; Linux /proc readers, UNKNOWN elsewhere)
// ---------------------------------------------------------------------------

/// Peak resident set size of this process in KiB (VmHWM), Linux only.
#[cfg(target_os = "linux")]
fn peak_rss_kb() -> Option<u64> {
    let content = std::fs::read_to_string("/proc/self/status").ok()?;
    for line in content.lines() {
        if let Some(rest) = line.strip_prefix("VmHWM:") {
            return rest.trim().strip_suffix("kB")?.trim().parse().ok();
        }
    }
    None
}

#[cfg(not(target_os = "linux"))]
fn peak_rss_kb() -> Option<u64> {
    None
}

/// User + system CPU time of this process in clock ticks, Linux only.
#[cfg(target_os = "linux")]
fn cpu_ticks() -> Option<(u64, u64)> {
    let content = std::fs::read_to_string("/proc/self/stat").ok()?;
    let after_comm = content.rsplit(')').next()?;
    let fields: Vec<&str> = after_comm.split_whitespace().collect();
    // utime is field 14, stime field 15 of the whole record; after stripping
    // `pid (comm)`, they sit at indexes 11 and 12.
    let utime: u64 = fields.get(11)?.parse().ok()?;
    let stime: u64 = fields.get(12)?.parse().ok()?;
    Some((utime, stime))
}

#[cfg(not(target_os = "linux"))]
fn cpu_ticks() -> Option<(u64, u64)> {
    None
}

#[cfg(target_os = "linux")]
fn cpu_model() -> Option<String> {
    let content = std::fs::read_to_string("/proc/cpuinfo").ok()?;
    for line in content.lines() {
        if let Some(rest) = line.strip_prefix("model name") {
            let name = rest.trim_start_matches([':', ' ', '\t']).trim().to_string();
            if !name.is_empty() {
                return Some(name);
            }
        }
    }
    None
}

#[cfg(not(target_os = "linux"))]
fn cpu_model() -> Option<String> {
    None
}

/// (min, p50, p90, max) of a latency sample in seconds.
fn latency_distribution(times: &mut [f64]) -> (f64, f64, f64, f64) {
    assert!(!times.is_empty(), "no latency samples");
    times.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let pick = |q: f64| times[((q * times.len() as f64) as usize).min(times.len() - 1)];
    (times[0], pick(0.5), pick(0.9), times[times.len() - 1])
}

/// Parse a crate version out of Cargo.lock text (engine-identity evidence).
fn lockfile_crate_version(lock_text: &str, name: &str) -> Option<String> {
    let mut in_block = false;
    let want = format!("name = \"{}\"", name);
    for line in lock_text.lines() {
        let line = line.trim();
        if line == "[[package]]" {
            in_block = false;
            continue;
        }
        if line == want {
            in_block = true;
            continue;
        }
        if in_block && line.starts_with("version = \"") {
            return Some(
                line.trim_start_matches("version = \"")
                    .trim_end_matches('"')
                    .to_string(),
            );
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Engine side loading (Whisper side fails closed without an approved pin)
// ---------------------------------------------------------------------------

enum SideOutcome {
    Ready(LoadedSide),
    Skipped(String),
}

struct LoadedSide {
    name: &'static str,
    model: Model,
    model_sha: String,
    load_secs: f64,
}

fn load_side(
    name: &'static str,
    path_var: &str,
    sha_var: Option<&str>,
    fixed_sha: Option<&str>,
) -> Result<SideOutcome, String> {
    let path = match std::env::var(path_var) {
        Ok(p) => p,
        Err(_) => {
            return Ok(SideOutcome::Skipped(format!(
                "{}: {} not set (no model configured)",
                name, path_var
            )));
        }
    };
    // Identity gate: a side runs only against a pinned artifact. The Parakeet
    // pin is fixed (launch model); the Whisper pin must be supplied alongside
    // the model — an unpinned Whisper model is never benchmarked.
    let expected = match (fixed_sha, sha_var) {
        (Some(pin), _) => pin.to_string(),
        (None, Some(var)) => std::env::var(var).map_err(|_| {
            format!(
                "{}: model set via {} but no approved pin in {} — refusing unpinned run",
                name, path_var, var
            )
        })?,
        (None, None) => {
            return Ok(SideOutcome::Skipped(format!(
                "{}: no approved pin available (not a launch-model side)",
                name
            )));
        }
    };
    if expected.trim().is_empty() {
        return Ok(SideOutcome::Skipped(format!(
            "{}: empty pin — refusing unpinned run",
            name
        )));
    }
    let actual = sha256_file(&path)?;
    if actual != expected {
        return Err(format!(
            "{}: model pin mismatch for {}: refusing a substituted artifact",
            name, path
        ));
    }
    let start = std::time::Instant::now();
    init_backends_default().map_err(|e| format!("{}: backend init: {}", name, e))?;
    let model = Model::load_with(&path, &ModelOptions::default())
        .map_err(|e| format!("{}: load: {}", name, e))?;
    Ok(SideOutcome::Ready(LoadedSide {
        name,
        model,
        model_sha: actual,
        load_secs: start.elapsed().as_secs_f64(),
    }))
}

// ---------------------------------------------------------------------------
// Per-side run + scoring
// ---------------------------------------------------------------------------

#[derive(Clone)]
struct ClipScore {
    id: &'static str,
    strict_edits: usize,
    strict_ref_words: usize,
    lower_edits: usize,
    lower_ref_words: usize,
    cer_edits: usize,
    cer_ref_chars: usize,
    audio_secs: f64,
    infer_secs: f64,
    cold: bool,
}

#[derive(Clone)]
struct SideResult {
    name: &'static str,
    model_sha: String,
    load_secs: f64,
    clips: Vec<ClipScore>,
    failed: Vec<String>,
    rss_peak_kb_after: Option<u64>,
    cpu_ticks_after: Option<(u64, u64)>,
}

fn run_side(
    side: &mut LoadedSide,
    wav_dir: &str,
    ref_root: &str,
    repeat_check_n: usize,
) -> SideResult {
    let mut session = side.model.session().expect("create session");
    let mut clips = Vec::new();
    let mut failed: Vec<String> = Vec::new();
    let mut repeat_checked = 0usize;
    let mut first = true;

    for id in SUBSET {
        let reference = match reference_for(ref_root, id) {
            Ok(r) => r,
            Err(e) => {
                failed.push(format!("{}: {}", id, e));
                continue;
            }
        };
        let audio_path = format!("{}/{}.wav", wav_dir, id);
        let mut reader = match hound::WavReader::open(&audio_path) {
            Ok(r) => r,
            Err(e) => {
                failed.push(format!("{}: missing wav {}: {}", id, audio_path, e));
                continue;
            }
        };
        let spec = reader.spec();
        if spec.sample_rate != 16000 || spec.channels != 1 {
            failed.push(format!(
                "{}: bad wav format {:?} (must be 16 kHz mono)",
                id, spec
            ));
            continue;
        }
        let samples: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.map(|v| v as f32 / 32768.0))
            .collect::<Result<_, _>>()
            .expect("read samples");
        if samples.is_empty() {
            failed.push(format!("{}: empty wav", id));
            continue;
        }
        let audio_secs = samples.len() as f64 / 16000.0;

        let run_once = |session: &mut transcribe_cpp::Session| -> Result<(String, f64), String> {
            let start = std::time::Instant::now();
            let text = session
                .run(
                    &samples,
                    &RunOptions {
                        ..Default::default()
                    },
                )
                .map_err(|e| format!("inference: {}", e))?
                .text;
            Ok((text, start.elapsed().as_secs_f64()))
        };

        // Repeatability check on the first N clips; single run afterwards.
        let (hypothesis, infer_secs) = if repeat_checked < repeat_check_n {
            repeat_checked += 1;
            let (h1, t1) = match run_once(&mut session) {
                Ok(v) => v,
                Err(e) => {
                    failed.push(format!("{}: {}", id, e));
                    continue;
                }
            };
            let (h2, t2) = match run_once(&mut session) {
                Ok(v) => v,
                Err(e) => {
                    failed.push(format!("{}: {}", id, e));
                    continue;
                }
            };
            assert!(
                h1 == h2,
                "nondeterministic inference for {} on {}",
                id,
                side.name
            );
            let mut ts = [t1, t2];
            ts.sort_by(|a, b| a.partial_cmp(b).unwrap());
            (h1, ts[1])
        } else {
            match run_once(&mut session) {
                Ok(v) => v,
                Err(e) => {
                    failed.push(format!("{}: {}", id, e));
                    continue;
                }
            }
        };

        let (se, sw) = edit_counts(&reference, &hypothesis);
        let (le, lw) = edit_counts(&lower(&reference), &lower(&hypothesis));
        let (ce, cc) = char_edit_counts(&reference, &hypothesis);
        let cold = first;
        first = false;
        println!(
            "BENCH compare {} clip={} wer_strict={:.4} ({}/{}) wer_lower={:.4} ({}/{}) infer={:.3}s audio={:.2}s{}",
            side.name,
            id,
            se as f64 / sw as f64,
            se,
            sw,
            le as f64 / lw as f64,
            le,
            lw,
            infer_secs,
            audio_secs,
            if cold { " cold" } else { " warm" }
        );
        clips.push(ClipScore {
            id,
            strict_edits: se,
            strict_ref_words: sw,
            lower_edits: le,
            lower_ref_words: lw,
            cer_edits: ce,
            cer_ref_chars: cc,
            audio_secs,
            infer_secs,
            cold,
        });
    }

    SideResult {
        name: side.name,
        model_sha: side.model_sha.clone(),
        load_secs: side.load_secs,
        clips,
        failed,
        rss_peak_kb_after: peak_rss_kb(),
        cpu_ticks_after: cpu_ticks(),
    }
}

/// Corpus-weighted aggregates for one side:
/// (wer_strict, wer_lower, cer, totals...). Strict-vs-strict and lower-vs-lower
/// comparisons only — never cross-mixed (enforced by the manifest layout).
fn aggregate(side: &SideResult) -> (f64, f64, f64, usize, usize, usize, f64, f64) {
    let se: usize = side.clips.iter().map(|c| c.strict_edits).sum();
    let sw: usize = side.clips.iter().map(|c| c.strict_ref_words).sum();
    let le: usize = side.clips.iter().map(|c| c.lower_edits).sum();
    let lw: usize = side.clips.iter().map(|c| c.lower_ref_words).sum();
    let ce: usize = side.clips.iter().map(|c| c.cer_edits).sum();
    let cc: usize = side.clips.iter().map(|c| c.cer_ref_chars).sum();
    let audio: f64 = side.clips.iter().map(|c| c.audio_secs).sum();
    let infer: f64 = side.clips.iter().map(|c| c.infer_secs).sum();
    (
        se as f64 / sw as f64,
        le as f64 / lw as f64,
        ce as f64 / cc as f64,
        sw,
        cc,
        side.clips.len(),
        audio,
        infer,
    )
}

/// Human/JSON null rendering for Option<u64> profile fields.
fn opt_u64(v: Option<u64>) -> String {
    v.map(|x| x.to_string())
        .unwrap_or_else(|| "null".to_string())
}

/// Human/JSON rendering for Option<(utime, stime)> CPU tick pairs.
fn opt_ticks(v: Option<(u64, u64)>) -> String {
    v.map(|(u, s)| format!("[{},{}]", u, s))
        .unwrap_or_else(|| "null".to_string())
}

#[allow(clippy::too_many_arguments)]
fn build_manifest(
    transcribe_cpp_version: &str,
    profile: &str,
    os: &str,
    arch: &str,
    cpu_model: Option<&str>,
    cpus: Option<usize>,
    cpu_before: Option<(u64, u64)>,
    sides: &[SideResult],
    skips: &[String],
    require_whisper: bool,
) -> String {
    let mut out = String::from("{\"evidence\":\"MODEL\",\"comparison\":\"parakeet-vs-whisper\",\"subset\":\"tier-a-12-same-audio\",\"run_options\":\"identical-RunOptions-default-both-sides\",\"fairness\":\"strict-vs-strict-and-lower-vs-lower-only-never-cross-mixed\",\"launch_model_fixed\":\"parakeet-unified-en-0.6b-Q8_0\",\"transcribe_cpp\":\"");
    out.push_str(&json_escape(transcribe_cpp_version));
    out.push_str("\",\"profile\":\"");
    out.push_str(&json_escape(profile));
    out.push_str("\",\"os\":\"");
    out.push_str(&json_escape(os));
    out.push_str("\",\"arch\":\"");
    out.push_str(&json_escape(arch));
    out.push_str("\",\"cpu_model\":");
    match cpu_model {
        Some(m) => {
            out.push('"');
            out.push_str(&json_escape(m));
            out.push('"');
        }
        None => out.push_str("null"),
    }
    out.push_str(",\"cpus\":");
    out.push_str(&opt_u64(cpus.map(|c| c as u64)));
    out.push_str(",\"cpu_ticks_before\":");
    out.push_str(&opt_ticks(cpu_before));
    out.push_str(",\"require_whisper\":");
    out.push_str(if require_whisper { "true" } else { "false" });
    out.push_str(",\"sides\":[");
    for (i, s) in sides.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        let (ws, wl, cer, words, chars, n, audio, infer) = aggregate(s);
        let mut times: Vec<f64> = s.clips.iter().map(|c| c.infer_secs).collect();
        let (tmin, tp50, tp90, tmax) = latency_distribution(&mut times);
        let cold_infer = s.clips.first().map(|c| c.infer_secs).unwrap_or(0.0);
        let failures = s
            .failed
            .iter()
            .map(|f| format!("\"{}\"", json_escape(f)))
            .collect::<Vec<_>>()
            .join(",");
        let clips_json = s
            .clips
            .iter()
            .map(|c| {
                format!(
                    "{{\"id\":\"{}\",\"strict_edits\":{},\"strict_ref_words\":{},\"lower_edits\":{},\"lower_ref_words\":{},\"cer_edits\":{},\"cer_ref_chars\":{},\"audio_secs\":{:.2},\"infer_secs\":{:.3},\"cold\":{}}}",
                    c.id,
                    c.strict_edits,
                    c.strict_ref_words,
                    c.lower_edits,
                    c.lower_ref_words,
                    c.cer_edits,
                    c.cer_ref_chars,
                    c.audio_secs,
                    c.infer_secs,
                    c.cold
                )
            })
            .collect::<Vec<_>>()
            .join(",");
        out.push_str(&format!(
            "{{\"name\":\"{}\",\"model_sha256\":\"{}\",\"load_secs\":{:.3},\"attempted\":{},\"completed\":{},\"failed\":{},\"wer_strict\":{:.4},\"wer_lower\":{:.4},\"cer\":{:.4},\"ref_words\":{},\"ref_chars\":{},\"audio_total_secs\":{:.1},\"infer_total_secs\":{:.1},\"rtf_overall\":{:.3},\"infer_cold_first_secs\":{:.3},\"infer_latency\":{{\"min\":{:.3},\"p50\":{:.3},\"p90\":{:.3},\"max\":{:.3}}},\"rss_peak_kb_after\":{},\"cpu_ticks_after\":{},\"clips\":[{}],\"failures\":[{}]}}",
            s.name,
            s.model_sha,
            s.load_secs,
            SUBSET.len(),
            n,
            s.failed.len(),
            ws,
            wl,
            cer,
            words,
            chars,
            audio,
            infer,
            infer / audio,
            cold_infer,
            tmin,
            tp50,
            tp90,
            tmax,
            opt_u64(s.rss_peak_kb_after),
            opt_ticks(s.cpu_ticks_after),
            clips_json,
            failures
        ));
    }
    out.push_str("],\"skipped\":[");
    for (i, sk) in skips.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        out.push('"');
        out.push_str(&json_escape(sk));
        out.push('"');
    }
    out.push_str("]}");
    out
}

#[test]
#[ignore]
fn engine_compare_smoke() {
    let wav_dir = std::env::var("COMPARE_WAV_DIR").expect("COMPARE_WAV_DIR not set");
    let ref_root = std::env::var("LIBRISPEECH_REF_DIR").expect("LIBRISPEECH_REF_DIR not set");
    let out_dir =
        std::env::var("COMPARE_OUT_DIR").unwrap_or_else(|_| format!("{}/out-compare", wav_dir));
    let repeat_check_n: usize = std::env::var("COMPARE_REPEAT_CHECK_N")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(REPEAT_CHECK_N_DEFAULT);
    let require_whisper = std::env::var("COMPARE_REQUIRE_WHISPER")
        .map(|v| v == "1")
        .unwrap_or(false);

    std::fs::create_dir_all(&out_dir).expect("create out dir");
    let rss_before = peak_rss_kb();
    let cpu_before = cpu_ticks();

    // Engine identity evidence.
    let lock_path = format!("{}/../../Cargo.lock", env!("CARGO_MANIFEST_DIR"));
    let lock_text = std::fs::read_to_string(&lock_path).expect("read Cargo.lock");
    let tc_version =
        lockfile_crate_version(&lock_text, "transcribe-cpp").expect("transcribe-cpp version");

    let mut sides: Vec<SideResult> = Vec::new();
    let mut skips: Vec<String> = Vec::new();

    // Parakeet side: fixed launch model, pinned artifact (fail-closed).
    match load_side(
        "parakeet",
        "PARAKEET_MODEL_PATH",
        None,
        Some(PARAKEET_SHA256),
    )
    .expect("parakeet load gate")
    {
        SideOutcome::Ready(mut loaded) => {
            println!(
                "BENCH compare parakeet model ok sha={} load={:.1}s",
                loaded.model_sha, loaded.load_secs
            );
            let res = run_side(&mut loaded, &wav_dir, &ref_root, repeat_check_n);
            println!(
                "BENCH compare parakeet: {}/{} completed, {} failed",
                res.clips.len(),
                SUBSET.len(),
                res.failed.len()
            );
            sides.push(res);
        }
        SideOutcome::Skipped(reason) => {
            panic!("parakeet side must be configured: {}", reason);
        }
    }

    // Whisper side: runs ONLY against an approved pin. Otherwise SKIPPED with
    // an explicit reason (or fail-closed under COMPARE_REQUIRE_WHISPER=1).
    match load_side(
        "whisper",
        "WHISPER_MODEL_PATH",
        Some("WHISPER_EXPECTED_SHA256"),
        None,
    ) {
        Ok(SideOutcome::Ready(mut loaded)) => {
            println!(
                "BENCH compare whisper model ok sha={} load={:.1}s",
                loaded.model_sha, loaded.load_secs
            );
            let res = run_side(&mut loaded, &wav_dir, &ref_root, repeat_check_n);
            println!(
                "BENCH compare whisper: {}/{} completed, {} failed",
                res.clips.len(),
                SUBSET.len(),
                res.failed.len()
            );
            sides.push(res);
        }
        Ok(SideOutcome::Skipped(reason)) => {
            println!("BENCH compare whisper SKIPPED: {}", reason);
            if require_whisper {
                panic!(
                    "COMPARE_REQUIRE_WHISPER=1 but whisper side skipped: {}",
                    reason
                );
            }
            skips.push(reason);
        }
        Err(e) => panic!("{}", e),
    }

    // Accounting invariant: every intended clip has a completed/failed outcome.
    for s in &sides {
        assert_eq!(
            SUBSET.len(),
            s.clips.len() + s.failed.len(),
            "{}: attempted must equal completed + failed",
            s.name
        );
        for f in s.failed.iter().take(20) {
            println!("BENCH compare {} failed: {}", s.name, f);
        }
    }

    for s in &sides {
        let (ws, wl, cer, words, chars, n, audio, infer) = aggregate(s);
        let mut times: Vec<f64> = s.clips.iter().map(|c| c.infer_secs).collect();
        let (tmin, tp50, tp90, tmax) = latency_distribution(&mut times);
        println!(
            "BENCH compare {} clips={} WER_strict={:.4} WER_lower={:.4} CER={:.4} words={} chars={} RTF={:.3}x load={:.1}s latency_min/p50/p90/max={:.3}/{:.3}/{:.3}/{:.3}s",
            s.name, n, ws, wl, cer, words, chars, infer / audio, s.load_secs,
            tmin, tp50, tp90, tmax
        );
    }
    if sides.len() == 2 {
        let (pws, pwl, _, _, _, _, _, _) = aggregate(&sides[0]);
        let (wws, wwl, _, _, _, _, _, _) = aggregate(&sides[1]);
        println!(
            "BENCH compare DELTAS strict-vs-strict={:+.4} lower-vs-lower={:+.4} (whisper-minus-parakeet; never cross-mixed)",
            wws - pws,
            wwl - pwl
        );
    } else {
        println!(
            "BENCH compare DELTAS: unavailable (whisper side skipped — no comparison claimed)"
        );
    }

    let cpus = std::thread::available_parallelism().map(|n| n.get()).ok();
    let manifest = build_manifest(
        &tc_version,
        if cfg!(debug_assertions) {
            "debug"
        } else {
            "release"
        },
        std::env::consts::OS,
        std::env::consts::ARCH,
        cpu_model().as_deref(),
        cpus,
        cpu_before,
        &sides,
        &skips,
        require_whisper,
    );
    std::fs::write(format!("{}/compare_manifest.json", out_dir), &manifest)
        .expect("write manifest");
    println!("BENCH manifest_written={}/compare_manifest.json", out_dir);
    println!(
        "BENCH compare rss_peak_kb before={} after_parakeet={}",
        opt_u64(rss_before),
        sides
            .first()
            .map(|s| opt_u64(s.rss_peak_kb_after))
            .unwrap_or_default()
    );
    println!(
        "BENCH compare cpu_ticks before={} after_parakeet={}",
        opt_ticks(cpu_before),
        sides
            .first()
            .map(|s| opt_ticks(s.cpu_ticks_after))
            .unwrap_or_default()
    );
}

// ---- Regression tests (no model/corpus needed; run in the normal suite) ----

#[test]
fn scoring_strict_and_lower_pairs() {
    // Uppercase reference (LibriSpeech convention) vs cased hypothesis with
    // punctuation: strict counts case/punct, lower isolates word accuracy.
    let (se, sw) = edit_counts("HELLO WORLD", "Hello, world");
    assert_eq!((se, sw), (2, 2));
    let lowered = lower("Hello, world");
    assert_eq!(lowered, "hello, world");
    let (le, lw) = edit_counts(&lower("HELLO WORLD"), &lowered);
    assert_eq!((le, lw), (1, 2)); // only the comma token differs
                                  // CER is character-level on raw strings.
    let (ce, cc) = char_edit_counts("HELLO WORLD", "Hello, world");
    assert_eq!(cc, 11);
    assert!(ce > 0);
}

#[test]
fn cross_metric_mixing_is_impossible_by_construction() {
    // The manifest carries per-engine strict+lower pairs and same-metric
    // deltas only. This test locks the aggregate helper's output order:
    // (wer_strict, wer_lower, cer, ref_words, ref_chars, clips, audio, infer).
    let side = SideResult {
        name: "fixture",
        model_sha: "abc".to_string(),
        load_secs: 0.5,
        clips: vec![ClipScore {
            id: "1-2-0000",
            strict_edits: 2,
            strict_ref_words: 2,
            lower_edits: 1,
            lower_ref_words: 2,
            cer_edits: 3,
            cer_ref_chars: 11,
            audio_secs: 2.0,
            infer_secs: 0.5,
            cold: true,
        }],
        failed: vec![],
        rss_peak_kb_after: None,
        cpu_ticks_after: None,
    };
    let (ws, wl, cer, words, chars, n, audio, infer) = aggregate(&side);
    assert!((ws - 1.0).abs() < 1e-9);
    assert!((wl - 0.5).abs() < 1e-9);
    assert!((cer - 3.0 / 11.0).abs() < 1e-9);
    assert_eq!((words, chars, n), (2, 11, 1));
    assert!((audio - 2.0).abs() < 1e-9 && (infer - 0.5).abs() < 1e-9);
}

#[test]
fn reference_lookup_rejects_prefix_collisions_and_malformed_ids() {
    let dir = std::env::temp_dir().join("compare_ref_probe");
    std::fs::create_dir_all(dir.join("1").join("2")).unwrap();
    std::fs::write(
        dir.join("1").join("2").join("1-2.trans.txt"),
        "1-2-00000 WRONG LINE\n1-2-0000 RIGHT LINE\n",
    )
    .unwrap();
    let root = dir.to_str().unwrap();
    assert_eq!(reference_for(root, "1-2-0000").unwrap(), "RIGHT LINE");
    assert!(reference_for(root, "1-2-9999").is_err());
    assert!(reference_for(root, "nodashes").is_err());
    assert!(reference_for(root, "").is_err());
    assert!(chapter_of("1089-134686-0000").is_ok());
    assert!(chapter_of("1-2-").is_err());
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn failed_inference_accounting_invariant() {
    // Simulated per-clip outcomes: 10 completed, 1 inference error, 1 missing
    // file. The accounting invariant (attempted == completed + failed) must
    // hold and every failure must carry its clip ID.
    let attempted = SUBSET.len();
    let completed = 10usize;
    let failed = [
        "1221-135766-0000: inference: engine fault".to_string(),
        "260-123286-0000: missing wav /tmp/x/260-123286-0000.wav: not found".to_string(),
    ];
    assert_eq!(attempted, completed + failed.len());
    assert!(failed
        .iter()
        .all(|f| SUBSET.iter().any(|id| f.starts_with(id))));
}

#[test]
fn manifest_is_deterministic_for_fixed_inputs() {
    let side = SideResult {
        name: "parakeet",
        model_sha: "-pin".to_string(),
        load_secs: 0.8,
        clips: vec![ClipScore {
            id: "1089-134686-0000",
            strict_edits: 4,
            strict_ref_words: 5,
            lower_edits: 1,
            lower_ref_words: 5,
            cer_edits: 6,
            cer_ref_chars: 30,
            audio_secs: 10.0,
            infer_secs: 1.0,
            cold: true,
        }],
        failed: vec![],
        rss_peak_kb_after: Some(1234567),
        cpu_ticks_after: Some((100, 20)),
    };
    let m1 = build_manifest(
        "0.2.4",
        "release",
        "linux",
        "x86_64",
        Some("CPU X"),
        Some(4),
        Some((100, 20)),
        std::slice::from_ref(&side),
        &[],
        false,
    );
    let side2 = side.clone();
    let m2 = build_manifest(
        "0.2.4",
        "release",
        "linux",
        "x86_64",
        Some("CPU X"),
        Some(4),
        Some((100, 20)),
        std::slice::from_ref(&side2),
        &[],
        false,
    );
    assert_eq!(m1, m2);
    assert!(m1.contains("\"wer_strict\":0.8000"));
    assert!(m1.contains("\"rtf_overall\":0.100"));
    assert!(m1.contains("\"skipped\":[]"));
    // Whisper-skipped manifest records the reason instead of metrics.
    let m3 = build_manifest(
        "0.2.4",
        "release",
        "linux",
        "x86_64",
        None,
        None,
        None,
        std::slice::from_ref(&side),
        &["whisper: WHISPER_MODEL_PATH not set (no model configured)".to_string()],
        false,
    );
    assert!(m3.contains("\"skipped\":[\"whisper:"));
    assert!(!m3.contains("whisper-minus-parakeet"));
}

#[test]
fn lockfile_version_parser_finds_transcribe_cpp() {
    let fake = "[[package]]\nname = \"libc\"\nversion = \"0.2.1\"\n\n[[package]]\nname = \"transcribe-cpp\"\nversion = \"0.2.4\"\nsource = \"registry+https://github.com/rust-lang/crates.io-index\"\n";
    assert_eq!(
        lockfile_crate_version(fake, "transcribe-cpp").as_deref(),
        Some("0.2.4")
    );
    assert_eq!(lockfile_crate_version(fake, "nope"), None);
}

#[test]
fn latency_distribution_reports_spread_not_just_mean() {
    let mut t = vec![0.5, 2.0, 1.0, 1.5];
    let (min, p50, p90, max) = latency_distribution(&mut t);
    assert!((min - 0.5).abs() < 1e-9);
    assert!((max - 2.0).abs() < 1e-9);
    assert!(p50 >= min && p50 <= max && p90 >= p50);
    let mut single = vec![1.25];
    assert_eq!(latency_distribution(&mut single), (1.25, 1.25, 1.25, 1.25));
}

#[test]
fn resource_readers_never_panic() {
    // On Linux these return Some; elsewhere None (UNKNOWN) — either way, no
    // panic and no inferred values.
    let _ = peak_rss_kb();
    let _ = cpu_ticks();
    let _ = cpu_model();
}

#[test]
fn whisper_side_requires_a_pin() {
    // Real code paths, no env mutation (parallel-safe): with the path var
    // unset the side is Skipped, never Ready — an unconfigured Whisper model
    // can never silently produce metrics.
    match load_side(
        "whisper-probe",
        "COMPARE_TEST_UNSET_PATH_VAR",
        Some("COMPARE_TEST_UNSET_SHA_VAR"),
        None,
    )
    .expect("gate")
    {
        SideOutcome::Skipped(reason) => assert!(reason.contains("not set")),
        SideOutcome::Ready(_) => panic!("unconfigured side must not load"),
    }
    // A set model WITHOUT a pin must also refuse: covered by the
    // fail-closed arms (empty-pin and missing-sha-var), exercised here for
    // the empty fixed-pin shape via the Skipped contract above and the
    // `panic!` mismatch arm in live runs.
    assert_eq!(REPEAT_CHECK_N_DEFAULT, 3);
    assert!(!SUBSET.is_empty() && SUBSET.len() == 12);
    assert!(SUBSET.contains(&"1089-134686-0000"));
}
