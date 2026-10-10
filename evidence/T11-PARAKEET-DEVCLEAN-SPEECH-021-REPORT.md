# T11-PARAKEET-DEVCLEAN-SPEECH-021 — Real-Speech Transcription Test Report

**Date:** 2026-10-10 (UTC)
**Task:** Bounded test of SORAVO's Parakeet Unified EN 0.6B Q8_0 against real speech from `dev-clean.tar.gz`
**Branch:** `feature/parakeet-unified-en06b-impl` (worktree `.swarm-worktrees/parakeet-unified-impl`), HEAD `17f34870`
**Type:** Testing (test-only harness addition + measurement). No production changes, no merges, no pushes.
**Prior reports read:** `T10-PARAKEET-UNIFIED-IMPL-020-REPORT.md` (file) and the T10 desktop verification report (delivered in-chat 2026-10-09; no file exists for it).
**Canonical docs followed:** `03_AI_INSTRUCTIONS.md` (authority/skill-gate/Git rules), `09_SECURITY_BASELINE.md` (model supply chain, no secrets, untrusted-input handling), `11_INTERRUPTION_HANDOFF.md` (checkpoint/handoff), `12_BENCHMARK_PROTOCOL.md` (fixed hardware/audio/corpus, warm/cold awareness; this is accuracy scoring, not a latency benchmark).

---

## 1. Archive location, size, SHA-256, safe-inspection — VERIFIED

| Field | Value |
|---|---|
| Path | `/home/maya/Desktop/Soravo_Engineering_Specification_v2/dev-clean.tar.gz` (main-worktree root; archive lives outside the parakeet worktree) |
| Size | 337,926,286 bytes |
| SHA-256 | `76f87d090650617fca0cac8f88b9416e0ebf80350acb97b343a85fa903728ab3` |
| Post-test re-hash | Identical SHA-256 and size — archive unchanged (read-only listing + selective extraction only) |

Safe inspection (before extracting, nothing executed from the archive):

- `tar -tzf` listed **2943 members**; verbose listing parsed for safety: **0 absolute paths, 0 `..` entries, 0 symlinks**.
- Content types: **2703 `.flac` + 97 `.txt` + 5 `.TXT`** + directories, all under `LibriSpeech/`. No scripts, executables, or unusual file types.
- Total uncompressed size 360,289,905 bytes (~1.07x compressed) — reasonable for FLAC, no zip-bomb signal.
- Layout is the standard LibriSpeech dev-clean corpus: `LibriSpeech/dev-clean/<speaker>/<chapter>/*.flac` + `<speaker>-<chapter>.trans.txt` reference transcripts.

Extraction: only two chapter directories (`2277/149896`, `1272/128104`, 5.9 MB) into the gitignored build dir
`.swarm-worktrees/parakeet-unified-impl/target/devclean-test/` — outside tracked project files (`git status` clean of it, `git check-ignore` confirms).
That scratch dir still exists at handoff (tooling blocked its recursive deletion); it is gitignored and safe to delete.

## 2. Audio/transcript pairs selected — VERIFIED

Pairing was done by exact LibriSpeech utterance id (`<file-basename>` == transcript line prefix). Reference transcripts were never modified.

| # | Audio file (SHA-256) | Size | Observed format | Duration | Reference transcript (exact, from `.trans.txt`) |
|---|---|---|---|---|---|
| A | `1272-128104-0012.flac` (`222cd90cd9edf086096fb0abba901b772f8ca4e763d5becb803b0a7f9b16ace9`) | 107,771 B | 16000 Hz, 1 ch, FLAC | 86,080 samples = 5.38 s | `ONLY UNFORTUNATELY HIS OWN WORK NEVER DOES GET GOOD` (9 words) |
| B | `1272-128104-0008.flac` (`08a3f099d544fac5df1b6105bfd4952d911995f271b494c9a689c083c39ab855`) | 100,125 B | 16000 Hz, 1 ch, FLAC | 81,920 samples = 5.12 s | `AS FOR ETCHINGS THEY ARE OF TWO KINDS BRITISH AND FOREIGN` (11 words) |
| C | `2277-149896-0033.flac` (`23009ec1ed5c704bb4b1c0bc75953121f38b2a2136cf8380f98e512517427473`) | 51,468 B | 16000 Hz, 1 ch, FLAC | 45,520 samples = 2.85 s | `THEN HE RANG THE BELL NO ANSWER` (7 words) |

Format values (rate/channels/sample count) were observed through the actual decode path (rodio `Decoder`), not assumed from the corpus README. No resampling or preprocessing was required: 16 kHz mono matches the pipeline input. The harness refuses any other format loudly (assert, not silent conversion).

## 3. Model artifact identity and SHA-256 verification — VERIFIED

- Artifact: `/home/maya/Desktop/Soravo_Engineering_Specification_v2/parakeet-unified-en-0.6b-Q8_0.gguf`
- Size 731,357,568 bytes, SHA-256 `4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795` — matches `catalog.json` and the T10 report.
- Verified **inside every inference run** (size + SHA-256 asserts precede loading; all 4 runs passed them) and once more by shell re-hash after testing (unchanged).

## 4. Inference route, commands, source revision — VERIFIED

- Source revision for all runs: worktree HEAD `17f34870` + the test-only change described in §11.
- Route: the new `#[ignore]`d test `managers::transcription::tests::realmodel_parakeet_devclean_file_transcription`
  exercises the **production path with no alternate implementation**: `init_transcribe_backend()` (as production startup does) →
  `Model::load_with` (transcribe-cpp 0.2.4, CPU backend) → `model.session()` → `session.run(&audio, &RunOptions { task: Transcribe, language: en })`.
  The only difference from the T10 synthetic-audio test is the audio source: caller-supplied FLAC decoded with rodio 0.21.1
  (already a main dependency, symphonia-flac), yielding pipeline-native `f32` samples.
- Env-gated (`SORAVO_PARAKEET_UNIFIED_GGUF`, `SORAVO_DEVCLEAN_FLAC`, `SORAVO_DEVCLEAN_REF`); prints RAW output, timings, and WER; asserts identity + inference success only (WER is measured, never gated).
- Example command (sample A):
  `SORAVO_PARAKEET_UNIFIED_GGUF=<model> SORAVO_DEVCLEAN_FLAC=$PWD/target/devclean-test/.../1272-128104-0012.flac SORAVO_DEVCLEAN_REF="ONLY UNFORTUNATELY HIS OWN WORK NEVER DOES GET GOOD" cargo test -p soravo-desktop --lib -- --ignored realmodel_parakeet_devclean_file_transcription --nocapture`
- **Tauri CLI route:** re-confirmed BLOCKED on the current revision — the prebuilt `target/debug/soravo-desktop --list-models`
  still exits 101 with `state() called before manage() for tauri_plugin_deep_link…` before any transcription. The plugin was
  not disabled, the panic was not hidden, and CLI success is not claimed. The unit-harness route above was used instead.

## 5. Raw outputs vs references (verbatim)

- **A:** RAW `>>>only, unfortunately, his own work never does get good.<<<` vs REF `>>>ONLY UNFORTUNATELY HIS OWN WORK NEVER DOES GET GOOD<<<`
- **B:** RAW `>>>As for etchings, they are of two kinds British and foreign.<<<` vs REF `>>>AS FOR ETCHINGS THEY ARE OF TWO KINDS BRITISH AND FOREIGN<<<`
- **C:** RAW `>>>Then he rang the bell no answer.<<<` vs REF `>>>THEN HE RANG THE BELL NO ANSWER<<<`
- **A-repeat:** RAW identical to A (`>>>only, unfortunately, his own work never does get good.<<<`)
- No empty outputs, no inference failures occurred (nothing omitted).

## 6. Per-sample and aggregate WER — VERIFIED

Normalization (documented, applied identically to both sides): lowercase → keep `a-z 0-9 '`, drop all other punctuation → split on whitespace.
`WER = (substitutions + deletions + insertions) / reference word count`, word-level Levenshtein, tie-break sub > del > ins.

| Sample | n (ref words) | Sub | Del | Ins | WER |
|---|---|---|---|---|---|
| A (1272-…-0012) | 9 | 0 | 0 | 0 | 0.0000 |
| B (1272-…-0008) | 11 | 0 | 0 | 0 | 0.0000 |
| C (2277-…-0033) | 7 | 0 | 0 | 0 | 0.0000 |
| A-repeat | 9 | 0 | 0 | 0 | 0.0000 |
| **Aggregate (A+B+C)** | **27** | **0** | **0** | **0** | **0.0000** |

Punctuation/capitalization (scored separately, not in WER): every raw output carries model-style casing and commas/periods
(e.g. `only, unfortunately, … good.`); all such differences vanish under normalization. No word errors remain after normalization on any sample. Three short read-speech samples do **not** prove general accuracy — reported as measured, nothing more.

## 7. Load time, inference time, failures, warnings — VERIFIED

| Run | Model load | Inference | Audio |
|---|---|---|---|
| A | 1083 ms | 732 ms | 5.38 s (RTF ≈ 0.14) |
| B | 940 ms | 875 ms | 5.12 s (RTF ≈ 0.17) |
| C | 747 ms | 416 ms | 2.85 s (RTF ≈ 0.15) |
| A-repeat | 745 ms | 801 ms | 5.38 s |

No failures, no empty outputs, no memory problems, no audio conversion required. Compiler/lint state: `cargo fmt --check` clean, `cargo clippy -p soravo-desktop --lib --tests` clean (one `needless_range_loop` found in the new scorer during development and fixed before testing). Full suite after the change: **321 passed, 0 failed, 2 ignored** (was 320/1; delta is the new scorer unit test passing + the new ignored file test).

## 8. Audio-file inference — VERIFIED

Real-speech file inference through the production transcribe-cpp path succeeded on 3/3 samples across 2 speakers plus one identical repeat.

## 9. Tauri CLI panic — BLOCKED (route), documented

Re-confirmed on the current revision (exit 101, deep-link `manage()` panic, §4). It blocked the headless `--transcribe-file` path; it did **not** block this test, which used the unit harness on the same production path. No fix attempted (pre-existing, outside this bounded test task).

## 10. Unexecuted tests and remaining blockers — NOT EXECUTED / DEFERRED

- Microphone capture and OS-level text insertion: **NOT EXECUTED** here by design — an audio-file test cannot verify them; they remain the separate desktop checks from the T10 verification.
- Larger corpus subset (dozens of utterances, noisy/accented speech, long-form): **DEFERRED** — 3 short clean samples are sufficient to prove the path but not to characterize accuracy.
- Streaming-overlay run with this model: **NOT EXECUTED**.
- Release readiness / legal sign-off (Handy redistribution authorization, GGUF conversion-record linkage): **DEFERRED**, unchanged from T10.

## 11. Files changed and regression tests

- `apps/desktop/src-tauri/src/managers/transcription.rs` (**test-only**, inside `mod tests`; zero production-logic lines touched):
  `devclean_normalize` + `word_error_counts` helpers, a fast non-ignored scorer unit test
  (`devclean_word_error_counts_known_alignment`, runs in the normal suite), and the `#[ignore]`d env-gated
  `realmodel_parakeet_devclean_file_transcription`. No registry, gate, licensing, payment, website, transcript, or weight changes; no weakened assertions (full suite green).
- New file: this report (`T11-PARAKEET-DEVCLEAN-SPEECH-021-REPORT.md`, worktree root, untracked — same convention as the T10 reports).
- Scratch audio under `target/devclean-test/` (gitignored, 5.9 MB) retained at handoff; safe to delete.

## 12. Resumable handoff

- Worktree state: branch `feature/parakeet-unified-en06b-impl`, HEAD `17f34870`, the same 6 modified files (only `transcription.rs`
  grew: +292/−0 vs base in the diff hunk range), nothing staged/committed/pushed. Main-worktree R1 dirt and all pre-existing
  reports/untracked files preserved; `dev-clean.tar.gz` and the model artifact re-hashed identical after testing.
- To resume/extend: extract more chapters to `target/devclean-test/`, rerun the §4 command with new `SORAVO_DEVCLEAN_FLAC`/`_REF`
  values, and append rows to the §6 table. For release: still needs reviewer + legal sign-off; do not merge PR #115 as part of any follow-up.
- Do NOT change: registry entries, gate logic, engine/audio/insertion code, reference transcripts, model weights, or the R1 worktree.

## Conclusion

Real-speech inference **works**: the approved Parakeet Unified EN 0.6B Q8_0 artifact, loaded through SORAVO's production transcribe-cpp path, transcribed 3/3 LibriSpeech dev-clean utterances (2 speakers, 2.9–5.4 s) with **aggregate WER 0.0000** (0 errors / 27 reference words; only casing/punctuation differ, reported separately), deterministically (repeat run byte-identical), locally (no cloud involvement), at ~0.15 real-time factor on this 4-CPU VM. This verifies the **audio-file inference path and measured quality on clean read speech only** — it does not verify microphone capture, OS text insertion, or release readiness.
