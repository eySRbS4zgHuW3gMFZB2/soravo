# G1 CLOSURE & GGUF BENCHMARK PATH REPORT

**Date:** 2026-10-10 · **Branch:** `feature/r1-gap-021-desktop-auth` · **HEAD:** `18bc2133` (unchanged)
**Disk:** 9.4 GB free · **Mode:** investigation + planning only. No behavior changes, builds, or benchmarks run.
No commit/push. Normal session, no Swarm.

## 1. G1 disposition: CLOSED

G1 (CORE gap register row 97) required: corpus hashes, raw model outputs, diff table, pipeline-neutrality
proof, owner direction question. All five are in `T11-A-PUNCTUATION-ATTRIBUTION-REPORT.md` (verified intact
this session: 1/1 evidence test, 43/43 + 18/18 transform tests, three SHA-recorded clips with verbatim
diffs, MODEL verdict). Owner decision (this task's instruction) recorded verbatim into the authoritative
record via dated amendment appended to `CORE-COMPLETION-AUDIT-REPORT.md` (history above the line untouched):

- Punctuation variation ACCEPTED as model behavior. No pipeline fix warranted.
- Cloud polish stays OFF by default and deferred. No network processing of dictated text.
- Custom-words mitigation deferred pending benchmark evidence. Not implemented.
- Accuracy conclusions limited to the three tested clips (fox WER 0.0; hello word-variation; paris −1 comma).
- Harness mismatch remains outstanding (this report).

## 2. Benchmark-harness root cause (traced to exact lines, not inferred)

- Entry: `crates/stt/tests/benchmark.rs::benchmark_parakeet_batch` (#[ignore]) → factory inits
  `ParakeetEngine` (transcribe-rs) with `PARAKEET_MODEL_PATH` → `BenchmarkHarness::benchmark_engine_batch`
  (`crates/stt/src/benchmark.rs:357+`) loads `tests/fixtures/audio/{id}.wav` via hound (16-bit mono) and
  scores whitespace-tokenized WER/CER (case/punct-sensitive — suitable for attribution, NOT standard WER).
- Why ONNX is required: `ParakeetEngine::load` → transcribe-rs 0.3.11
  `src/onnx/parakeet/mod.rs:95` `load(model_dir: &Path, …)` joins `encoder-model[-quant].onnx`,
  `decoder_joint-model[-quant].onnx`, `nemo128.onnx`, `vocab.txt` inside a DIRECTORY. Passing the GGUF
  file path makes it look for `<….gguf>/encoder-model.onnx` → observed error, reproduced 2026-10-10.
  (Side note: that engine also applies its own token capitalization step at `parakeet/mod.rs:394` —
  irrelevant to GGUF runs, recorded so scorings are never mixed across engines.)
- Production GGUF path actually used by SORAVO (desktop `managers/transcription.rs:591-607, 1330-1356`):
  `transcribe_cpp::init_backends_default()` → `Model::load_with(path, &ModelOptions::default())`
  (Backend Auto → CPU fallback logged) → `model.session()` → `session.run(&pcm_f32_16k_mono,
  &RunOptions{ task: Transcribe, language, target_language, ..default() })` → `Transcript.text`.
  Live-session decoding params for the en-only model with `selected_language: "auto"`:
  task Transcribe, language None (auto), target None (from `transcribe_cpp_run_plan`, lines 1743-1769).
- Fixtures/scoring/utilities that already exist: `crates/stt/tests/fixtures/{audio,ground_truth}/`
  (3 WAVs + refs, SHAs in T11-A report); `BenchmarkHarness::{calculate_wer,calculate_cer,get_ground_truth}`;
  hound i16→f32/32768 loading pattern (lib lines 376-385, mirrored in test).
- Test-only invocation of the production path WITHOUT behavior change: PROVEN — T11-A's
  `crates/stt/tests/t11a_raw_parakeet.rs` does exactly this (new test file only; zero production edits;
  ran green in 7.01 s). Preconditions that made it work: `PARAKEET_MODEL_PATH` = SHA-verified Q8_0 bytes,
  `LD_LIBRARY_PATH` = staged transcribe-libs (dynamic backends), fixtures present.
- Incidental repair already applied (T11-A): dead `initialize("dummy",…)` re-init removed from
  `benchmark_engine_batch` (it unconditionally failed every engine). Same dead block still sits in
  `benchmark_engine_streaming` (untouched — follow-up when streaming is benchmarked).

## 3. Proposed GGUF benchmark specification (not implemented — awaiting approval)

- **Engine:** transcribe-cpp 0.2.4 (lockfile-pinned) via a test-only driver modeled on `t11a_raw_parakeet.rs`
  (extend it: N repeats, median timing, per-file WER/CER via `BenchmarkHarness`). No production edits.
- **Artifact:** repo-root `parakeet-unified-en-0.6b-Q8_0.gguf`, SHA-256 re-verified at run start
  (`4b50b6dd…2f38795`, 731,357,568 B). No substitute model/engine (single-file GGUF ≠ ONNX dir).
- **Decoding params (mirror live):** task Transcribe, language None (auto), target None, default
  timestamps; CPU backend (record bound backend/device from `model.backend()`); document that T11-A's
  probe used language `Some("en")` with identical outcomes on this en-only model.
- **Corpus:** the 3 fixed WAVs + refs (SHAs in T11-A report) as seed; EXTEND before any claim
  (punctuation-heavy, names, numbers, fast speech per doc-16; synthetic labeled, no private audio).
  NEVER claim representative accuracy from 3 clips.
- **Scoring (dual, labeled):** (a) STRICT (raw whitespace tokens — punctuation/case-sensitive, for
  attribution continuity); (b) NORMALIZED (lowercased, punctuation-stripped — for word-accuracy claims).
  Report both + CER; latency/RTF from median timed runs (reliable in-process); memory/CPU fields stay
  0/unmeasured until profiling exists (harness already records them as such — do not fabricate).
- **Separation labels on every number:** MODEL accuracy (raw harness) vs PIPELINE behavior (transform unit
  tests, existing) vs LIVE E2E (T22 mic runs) — never blended.
- **Commands (pattern, exact paths at execution time):**
  `PARAKEET_MODEL_PATH=<abs Q8_0> LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs cargo test -p soravo-stt --test <gguf-bench-test> -- --nocapture`
  Artifacts: console RAW lines + a results report file with corpus/model SHAs, per-file table, params.
- **Prerequisites/risks:** 9.4 GB free now; measured peak ≈ 2–3 GB — re-verify before running; needs the
  staged transcribe-libs (present) and fixtures (present); whisper/ONNX comparison out of scope until a
  matching artifact exists; microphone/GUI NOT involved (deliberately — reproducibility).
- **Acceptance for the future implementation task:** harness test runs green on all corpus files; report
  contains SHAs, params, dual scores, latency/RTF, and the three separation labels; no production file
  modified; no accuracy claim beyond the corpus.

## 4. Next safe action

Approve the §3 implementation task (test-only driver + corpus extension + evidence report), or redirect to
a different gap (G2/G4/G6 per CORE register). This report makes no code change and starts no benchmark.
