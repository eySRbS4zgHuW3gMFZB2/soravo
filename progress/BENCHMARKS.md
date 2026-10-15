# Benchmarks

> Superseded 2026-10-15 (history retained, not rewritten): this file formerly
> read "No STT engine benchmark has been run. Per `12_BENCHMARK_PROTOCOL.md`,
> no production inference backend or public performance claim may be selected
> before a reproducible Parakeet-versus-Whisper benchmark." Transcription
> benchmarks HAVE now been run (Tier-A smoke + Tier-B full, below). The
> Parakeet-versus-Whisper comparison and any production-backend selection or
> public performance claim remain unmeasured — see *Unmeasured*.

## Evidence scope

Every result below is **MODEL-level** evidence: raw `transcribe-cpp`
(`Model::load_with → session.run`) output for the pinned Parakeet Unified EN
0.6B Q8_0 artifact
(SHA-256 `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795`).
It is **not** application-level capture, partial-transcript, post-processing,
insertion or overlay acceptance — those remain unmeasured.

## Tier-A smoke — 12-clip subset (2026-10-15, PR #126)

- Runner `crates/stt/tests/librispeech_tier_a.rs` @ `067f3390` (branch
  `bench/tier-a-librispeech-smoke`): deterministic 12-clip subset (first
  utterance of the 12 lowest `test-clean` speaker IDs), corpus FLAC SHA-256
  pins enforced fail-closed, anchored reference lookup, corpus-level WER.
- Model-gated re-run 12/12 green per the PR #126 commit record; 7 fast
  regression tests pass.
- Numeric aggregate is not committed to canonical docs → values UNKNOWN here
  (see PR #126 branch artifacts). **A smoke benchmark, NOT a full acceptance
  result.**

## Tier-B full — all 2,620 `test-clean` utterances (2026-10-15)

- Runner `crates/stt/tests/librispeech_tier_b.rs` @ `49c157d3` (branch
  `bench/tier-b-librispeech-full`): deterministic discovery of every utterance
  ID from all 87 `*.trans.txt` files, sorted. **2620 attempted / 2620
  completed / 0 failed. Exclusions: none.**
- Corpus: local `LibriSpeech/test-clean` (2620 FLAC, 87 `.trans.txt`);
  decoded offline with `flac -d` into a scratch dir (originals untouched);
  16 kHz mono asserted per clip. Model SHA-256 verified fail-closed before
  inference. Offline run; no cloud transcription service.
- Corpus-level aggregates — strict preserved, normalizations precisely defined
  in the runner header (no punctuation-normalized metric; strict never
  replaced):
  - strict WER **0.9867** (51875/52576 ref words) — case- and
    punctuation-sensitive against uppercase references; the launch model emits
    cased, punctuated text (e.g. `He hoped … sauce,`).
  - lower WER **0.1047** (5506/52576) — Unicode-lowercased tokens; the
    accuracy signal for this model.
  - strict CER **0.8203** (230934/281530 ref chars); lower CER **0.0216**.
  - Totals: 52576 reference words, 281530 reference characters.
- Performance (AMD Ryzen 5 5600 VM, 4 CPUs, 7.6 GiB RAM, Ubuntu 24.04, release
  profile): audio total 19452.5 s (5.4 h), inference total 2856.1 s, overall
  RTF **0.147x**, model load 0.8 s; first 12 clips 2-repeat inference identical
  (repeatability), single inference per clip afterwards.
- Artifacts: manifest `crates/stt/tests/evidence/tier_b_manifest.json`
  (committed, byte-identical to the runner output); per-clip JSONL
  (`tier_b_clips.jsonl`, 2620 lines, independently re-summed to the same
  totals, zero duplicate IDs) and the raw run log stay outside git under
  `/tmp/librispeech-tier-b/`.
- Reproduction (from a clean worktree at the runner commit; corpus + model
  read-only; libs are gitignored build artifacts):
  `PARAKEET_MODEL_PATH=<abs>/parakeet-unified-en-0.6b-Q8_0.gguf
  LIBRISPEECH_TIER_B_DIR=<scratch>/wav LIBRISPEECH_REF_DIR=<abs>/LibriSpeech/test-clean
  LIBRISPEECH_OUT_DIR=<scratch>/out TIER_B_RUNNER_VERSION=49c157d3
  LD_LIBRARY_PATH=<checkout>/apps/desktop/src-tauri/transcribe-libs
  cargo test --release -p soravo-stt --test librispeech_tier_b
  librispeech_tier_b_full -- --ignored --nocapture`
  (WAV scratch must first be decoded: `flac -d` each `test-clean` FLAC to
  `<scratch>/wav/<utterance-id>.wav`; resume is checkpoint-safe via
  `tier_b_clips.jsonl` bound to the run by a `tier_b_run.json` header
  (model SHA-256 + corpus root; mismatched or headerless checkpoints fail
  closed — review fix `87b878dd`, 16 regression tests green).

## Unmeasured (UNKNOWN or BLOCKED — not claimed as passed)

- Whisper-side comparison and any production-backend selection: UNKNOWN (no
  Whisper run; `12_BENCHMARK_PROTOCOL.md` gate still open).
- Application-level capture latency, first-partial/finalization,
  duplicate/revision rates, overlay/insertion behaviour: UNKNOWN.
- Punctuation/capitalization/named-entity preservation as acceptance metrics:
  UNKNOWN (punctuation/casing observed informally, not acceptance-measured).
- Resource profiling beyond RTF/load (peak RAM, CPU%): UNKNOWN.
- Commercial redistribution clearance: BLOCKED — separate model
  licensing/installer Notice gate (existing licensing PR); nothing here grants
  it.
