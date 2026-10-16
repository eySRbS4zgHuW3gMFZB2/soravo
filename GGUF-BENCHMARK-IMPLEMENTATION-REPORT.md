# GGUF BENCHMARK HARNESS — IMPLEMENTATION REPORT

**Date:** 2026-10-10 · **Branch:** `feature/r1-gap-021-desktop-auth` · **HEAD:** `18bc2133` (unchanged, uncommitted)
**Authorization:** `G1-CLOSURE-GGUF-BENCHMARK-PATH-REPORT.md` §3 as source of truth. G1 closed; model behavior
accepted; no pipeline/cloud/custom-words/UI changes (none made). Normal session, no Swarm.

## 1. Implementation and file list

- NEW `crates/stt/tests/gguf_benchmark.rs` (test-only driver + regression tests; only new code file):
  hash-gated load (`Model::load_with` + `ModelOptions::default`, Auto backend), one shared session
  (production-faithful), 3 timed repeats/clip with median + identical-text repeatability assert, STRICT /
  LOWER / NORMALIZED WER + raw CER via `BenchmarkHarness::{calculate_wer,calculate_cer}`, human table +
  deterministic hand-rolled JSON block (no new deps for output), `#[ignore]`d model test (CI convention).
- EDIT `crates/stt/Cargo.toml`: + `sha2 = "0.10"` under `[dev-dependencies]` (test-only pin verification).
- EDIT `crates/stt/src/benchmark.rs`: removed dead `initialize("dummy",…)` re-init from
  `benchmark_engine_batch` (T11-A find; unconditional failure for every engine). Streaming twin untouched
  (follow-up, out of scope).
- NEW corpus already in place from T11-A (reused, re-verified): `crates/stt/tests/fixtures/{audio ×3,
  ground_truth ×3}`.
- `crates/stt/tests/t11a_raw_parakeet.rs` (T11-A evidence probe) KEPT as-is (preservation rule).

## 2. Hashes (all re-verified Phase 1; driver fails closed on any mismatch)

- Model: `parakeet-unified-en-0.6b-Q8_0.gguf`, 731,357,568 B,
  SHA-256 `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795` (matches catalog + T11-A).
- Fixtures audio: `2173a554…b3d1b6c`, `503b5317…47c4fb2d`, `305b2547…51df2` (match T11-A record).
- References (canonicalized here — trailing `\n`, harness trims identically):
  `59ffa6e2…f064ecf`, `b47cc0f1…a9c4380`, `ee5f5086…b276ffb`.
- Fail-closed PROVEN in-run: a mistranscribed pin in my first draft aborted the test before inference
  (`FAIL-CLOSED fixture hash mismatch … t11a_03_paris.wav`); corrected pin re-verified, run green.

## 3. Inference path and parameters (== production batch path)

`transcribe_cpp::init_backends_default()` → `Model::load_with(path, &ModelOptions::default())`
→ `model.session()` → `session.run(&pcm_f32_16k_mono, &RunOptions{ ..Default::default() })`
(Task::Transcribe default; language None/auto, target None — the live-session plan for the en-only model
per `transcribe_cpp_run_plan`; T11-A probe used `Some("en")` with identical transcripts).
Backends resolved: Vulkan present-no-device, CPU `libggml-cpu-haswell.so` bound; `parakeet: promoted 48
conv pointwise weights F16→F32` (same line as live runs). No mic, network, VAD, or pipeline transforms.

## 4. Commands, exit codes, results

- `cargo test -p soravo-stt --test gguf_benchmark` → **ok, 7 passed, 1 ignored** (unit/regression only).
- `PARAKEET_MODEL_PATH=<abs Q8_0> LD_LIBRARY_PATH=apps/desktop/src-tauri/transcribe-libs
  cargo test -p soravo-stt --test gguf_benchmark -- --ignored --nocapture` → **ok, 28.95 s.**
- Benchmark output (MODEL-level, raw; corpus n=3 — NOT statistically representative):

| Clip | Audio | Infer (median) | RTF | WER strict / lower / normalized | CER | Repeats |
|---|---|---|---|---|---|---|
| hello | 6.00 s | 1.103 s | 0.18× | 0.6000 / 0.6000 / 0.3000 | 0.2826 | identical |
| fox | 6.00 s | 1.146 s | 0.19× | 0.0000 / 0.0000 / 0.0000 | 0.0000 | identical |
| paris | 6.00 s | 1.116 s | 0.19× | 0.1111 / 0.1111 / 0.0000 | 0.0213 | identical |

  Model load 1.19 s (subsequent loads cached by harness run). Hypotheses byte-identical to the T11-A
  probe (`Hi, how are you? I hope you're well` / fox perfect / paris minus the June comma).
- Signal separation (read directly off the columns): casing signal (strict−lower) = **0.0000 on all
  clips** — no capitalization deviation anywhere; punctuation signal (lower−normalized) = 0.0 (fox),
  0.1111 (paris comma deletion), 0.3000 (hello, mixed with word substitutions). Reinforces G1 MODEL verdict.
- Skipped: full workspace suites, whisper/ONNX paths (no artifact), streaming benchmark (dead re-init
  left in place per scope), `benchmark_parakeet_batch` (pre-existing ONNX/GGUF family mismatch — still
  fails as documented; NOT re-run after T11-A since nothing about it changed).
- Not executed as passing: nothing claimed beyond the commands above. No test weakened
  (the formerly-failing dummy path was removed as dead code, not relaxed).

## 5. Disk and dependencies

- 9.4 → 9.3 GB free across the task (peak stayed ≈ 2–3 GB as assessed; no broad build).
- `Cargo.lock`: R1 pre-existing delta stands; my change adds ONE edge (`soravo-stt` → already-locked
  `sha2 0.10.9`). No new package, no new source download (build succeeded offline against the lockfile).
  Full lockfile diff is dominated by R1 manifest deps (keyring, deep-link plugin, desktop-auth crate).

## 6. Limitations and follow-ups

- n=3 fixed clips; timing includes 6 s clips with leading/trailing silence (RTF understated vs live
  speech segments); memory/CPU columns intentionally 0 (no profiler — not fabricated).
- `benchmark_engine_streaming` dead re-init + ONNX-only `ParakeetEngine` remain (T11 automation needs an
  ONNX artifact or transcribe-cpp engine adapter; G4/G8).
- Live-mic, pipeline, and model evidence stay labeled separately (this report is MODEL-level only).

## 7. Status updates and handoff

- G8 (reproducible benchmark): corpus + deterministic GGUF driver now exist; full T11 acceptance still
  needs corpus extension + latency/resource profiling — record G8 as ADVANCED, not closed. No edit made to
  `CORE-COMPLETION-AUDIT-REPORT.md` (this report is the status record; historical numbering preserved).
- Diff review: production behavior untouched (desktop crates, pipeline, settings, UI, auth, payments
  unmodified); R1 dirty/untracked work intact; only additions are the driver, corpus (T11-A), dev-dep,
  harness dead-code removal, and this report. No commit/push. Next safe action: owner-selected follow-up
  (corpus extension, streaming fix, or unrelated gap); rerun command in §4 is stateless.
