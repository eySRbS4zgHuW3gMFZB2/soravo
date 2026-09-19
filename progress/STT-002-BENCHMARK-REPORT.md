# STT-002: Benchmark Dataset/Harness - Implementation Report

## Status: Completed

## Branch: feature/stt-002-benchmark-harness

## PR: #33

---

## Handy Code Reuse Analysis

### Source Inspected
- Repository: https://github.com/cjpais/Handy
- License: MIT
- Commit: ba10ce1943ef34e93c09494027fc0b9ced2e8a44

### Files Examined
- `src-tauri/src/catalog/mod.rs`: references benchmark metadata on model cards (descriptive only; no executable harness)
- `src-tauri/src/audio_toolkit/text.rs`: Levenshtein edit distance used for custom-word fuzzy matching (not a Word Error Rate engine)

### Analysis Results
**No Handy code reused for STT-002.**

**Justification:**
1. STT-002 requires benchmarking infrastructure that does not exist in Handy
2. Benchmark harness is Soravo-specific (measuring Parakeet vs Whisper per Soravo spec §12)
3. WER/CER calculation algorithms are standard edit-distance algorithms, not Handy-specific
4. No existing Handy benchmark infrastructure to audit or reuse, so implementation is Soravo-specific and written from scratch

---

## Implementation Details

### Modules Added
| File | Purpose | Lines |
|------|---------|-------|
| crates/stt/src/benchmark.rs | Benchmark harness with WER/CER calculation | ~385 |
| crates/stt/src/lib.rs | Expose `pub mod benchmark;` | +1 |

### Key Features
- `BenchmarkConfig`: Configuration for benchmark runs (audio dir, ground-truth dir, sample rate, warmup/benchmark run counts)
- `BenchmarkRun`: Single run results (latency, WER, CER, memory, CPU)
- `EngineBenchmark`: Aggregated results per engine
- `BenchmarkHarness`: Main benchmark engine
- WER calculation: edit distance on word tokens
- CER calculation: edit distance on character tokens

### Tests
```
running 7 tests
test benchmark::tests::test_calculate_cer_empty ... ok
test benchmark::tests::test_calculate_wer_identical ... ok
test benchmark::tests::test_calculate_wer_substitution ... ok
test benchmark::tests::test_calculate_cer_substitution ... ok
test benchmark::tests::test_calculate_cer_identical ... ok
test benchmark::tests::test_calculate_wer_empty ... ok
test tests::test_parakeet_engine_initialization ... ok

test result: ok. 7 passed; 0 failed
```

### Verification (final state on this PR head)
- `cargo fmt --all -- --check`: clean
- `cargo clippy --workspace --all-targets -- -D warnings`: clean. 8 clippy lints were exposed
  by adding `crates/stt` to the workspace (4 needless range loops, 2 derivable `Default`
  impls, 1 `map_or`, 1 `or_insert_with`) and are fixed in this PR.
- `cargo test --workspace`: all crates pass; `soravo-stt` 7/7

## Security Checks
- Secret scan: No findings
- SAST scan: No findings
- Cargo audit: 1 pre-existing low-severity advisory (`h2` 0.3.27, GHSA-q83h-524g-xf6h),
  pulled via `soravo-models -> reqwest 0.11 -> hyper 0.14`; identical on `main`, not
  introduced by this work

## Known Limitations (scaffolding for STT-003/004, finalized in STT-008)
- Latency currently measures the engine-init closure only; `first_partial_ms` is a placeholder
- WER/CER/memory/CPU values are placeholder constants until real engines land
- No capture-start / first-stable-partial latency, no punctuation/capitalization/NER,
  no stability or packaging metrics yet
- No benchmark results reported — none are fabricated in this PR

## Next Steps
- STT-003: Parakeet adapter
- STT-004: Whisper adapter
- STT-008: Benchmark report + ADR

## Summary
Implemented STT-002 benchmark harness from scratch. No Handy code could be reused as benchmarking infrastructure is Soravo-specific. Ready for STT-003/004 adapter implementations.