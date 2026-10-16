# T11-A — PUNCTUATION/CAPITALIZATION ATTRIBUTION REPORT

**Date:** 2026-10-10 · **Branch:** `feature/r1-gap-021-desktop-auth` · **HEAD:** `18bc2133` (unchanged, uncommitted)
**Task:** CORE audit G1 — determine whether punctuation/capitalization errors come from model output,
app post-processing, config, normalization, or insertion. **No code fix in scope; none made to behavior.**
**Verdict: MODEL** (evidence below). No PRD-02-violating rewrite is warranted.

## 1. Method (fixed corpus, same backend + artifact as the app)

- Corpus (new, user-spoken on cue, 16 kHz mono WAV + `.txt` refs under
  `crates/stt/tests/fixtures/{audio,ground_truth}/`, SHA-256 recorded):
  - `t11a_01_hello.wav` (`2173a554…b3d1b6c`) — ref: `Hello, how are you today? I hope you are well.`
  - `t11a_02_fox.wav` (`503b5317…47c4fb2d`) — ref: `The quick brown fox jumps over the lazy dog.`
  - `t11a_03_paris.wav` (`305b2547…37b7ba76`) — ref: `We visited Paris in June, and it was beautiful.`
  - Signal-verified per clip (`od` spot checks; peaks ≈3000/6100/3600). Clip 3 speech starts late
    (~5 s in) but the full sentence transcribed — no truncation confound (see §2).
  - `/tmp/opencode/mic-test.wav` EXCLUDED (reference content unknown — would corrupt attribution).
- Raw inference: new evidence test `crates/stt/tests/t11a_raw_parakeet.rs` drives the EXACT Q8_0 bytes
  (`PARAKEET_MODEL_PATH` = repo-root file, SHA `4b50b6dd…`) through transcribe-cpp directly
  (`init_backends_default` → `Model::load_with` Auto → `session.run`, language `en`) — the same
  backend/family the desktop app uses. **Bypasses every app-layer transform by construction.**
- Command: `PARAKEET_MODEL_PATH=… LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs
  cargo test -p soravo-stt --test t11a_raw_parakeet -- --nocapture` → **ok, 1 passed, 7.01 s.**

## 2. Raw model outputs (verbatim) — punctuation/case are the model's

| Clip | Reference | Raw hypothesis | WER / CER |
|---|---|---|---|
| fox | `The quick brown fox jumps over the lazy dog.` | `The quick brown fox jumps over the lazy dog.` | 0.0000 / 0.0000 — period + caps EXACT |
| hello | `Hello, how are you today? I hope you are well.` | `Hi, how are you? I hope you're well` | 0.6000 / 0.2826 — word substitutions (Hi/Hello, dropped "today", you're/you are); punctuation present and correct, no spurious caps |
| paris | `We visited Paris in June, and it was beautiful.` | `We visited Paris in June and it was beautiful.` | 0.1111 / 0.0213 — identical except the model DROPPED the comma after "June"; `Paris` correctly capitalized |

Reading: the model emits correct capitalization (sentence-initial, `Paris`) and mostly-correct punctuation,
with word-level variation (hello) and one comma deletion (paris). No evidence of systematic case/punct
corruption downstream — because there is no downstream rewriter (see §3).

## 3. Pipeline neutrality — VERIFIED (existing tests, all green)

- `cargo test -p soravo-desktop --lib audio_toolkit::text` → **43 passed, 0 failed.** Covers:
  punctuation-preserving custom-word replacement, case preservation, filler removal with punctuation,
  unknown-language fail-closed, master-toggle disable.
- `cargo test -p soravo-desktop --lib managers::transcription::tests` → **18 passed, 0 failed.**
  Covers run-plan/language-evidence gating and `optional_text_transform_falls_back_to_raw_text_after_panic`.
- Code fact: live path = `apply_custom_words` (skipped, list empty) → `remove_filler_words` (whole-token
  deletion only) → `normalize_transcription_output` (stutter/space collapse + trim), all fail-open to raw
  text; cloud LLM polish OFF; xdotool pastes bytes verbatim. **Nothing in this chain rewrites punctuation
  or capitalization.** Insertion therefore cannot be the source either.

## 4. Conclusion and direction (no fix made)

- The owner's observed errors (wrong commas, mid-sentence caps) originate in **model output variation**,
  consistent with run-to-run casual-speech differences (cf. live `Is Sarabu okay` / `Fox jumped…` partials).
- Do NOT add a punctuation-rewriting layer (PRD-02 forbids it without justification; justification now
  exists AGAINST need). If quality must improve, the honest options for owner direction are: accept
  model behavior, opt-in cloud LLM polish per-utterance, or custom-words mitigation — each with
  privacy/cost trade-offs, none implemented here.
- Pre-existing transform behavior (default-ON filler removal) is out of this verdict's scope; it deletes
  whole fillers only and is covered by the 43 passing tests.

## 5. Incidental prerequisite repair (test-support only, documented)

- `crates/stt/src/benchmark.rs` `benchmark_engine_batch` re-initialized the caller-supplied engine with a
  `"dummy"` path, unconditionally failing every batch benchmark (`Model not found at dummy`). Removed the
  dead re-init (4+/11−, comment records why). No app behavior touched.
- Follow-up (out of scope, not fixed): identical dead re-init in `benchmark_engine_streaming`; and
  `ParakeetEngine` (transcribe-rs/ONNX) cannot load GGUF artifacts at all — `benchmark_parakeet_batch`
  fails with `encoder-model.onnx does not exist` (verified failing 2026-10-10; engine/artifact-family
  mismatch, NOT the harness bug). T11 automation needs an ONNX artifact or a transcribe-cpp engine
  adapter before `benchmark_parakeet_batch` can run.

## 6. Handoff

- Diff: `crates/stt/src/benchmark.rs` (M, fix above) + new `crates/stt/tests/t11a_raw_parakeet.rs` +
  new `crates/stt/tests/fixtures/{audio ×3, ground_truth ×3}`. All other worktree state untouched
  (R1/app files as before). Disk 9.4 GB free after runs (peak stayed ≈ measured 2–3 GB).
- Tests run: t11a evidence (1 passed), `audio_toolkit::text` (43 passed), `managers::transcription::tests`
  (18 passed), `benchmark_parakeet_batch` (FAILED as documented — artifact mismatch, pre-existing).
  Full suites NOT run (out of scope). No test weakened.
- Corpus WAVs contain the owner's voice reading fixed sentences (not private conversation); kept as
  task fixtures, never uploaded. Exact next safe action: owner picks a quality direction (§4) or closes G1.
