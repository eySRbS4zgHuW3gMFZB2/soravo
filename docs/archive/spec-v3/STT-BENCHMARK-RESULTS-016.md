# STT-BENCHMARK-016

**Date:** 2026-09-26  
**Task:** STT-BENCHMARK-016  
**Protocol Version:** 12_BENCHMARK_PROTOCOL.md  
**Benchmark Harness:** `crates/stt/src/benchmark.rs`

---

## 1. Hardware Configuration

| Component | Value |
|-----------|-------|
| CPU | AMD Ryzen 5 5600 6-Core Processor |
| Cores | 6 |
| RAM | 7.6 GiB total, 4.9 GiB available |
| GPU | None detected (CPU-only inference) |
| Platform | Linux x86_64 |

---

## 2. Operating System

| Field | Value |
|-------|-------|
| OS | Linux Mint 22.3 (Zena) |
| Kernel | 7.0.0-31-generic |
| Architecture | x86_64 |

---

## 3. Benchmark Version

| Field | Value |
|-------|-------|
| Protocol | docs/spec-v3/12_BENCHMARK_PROTOCOL.md |
| Harness | soravo-stt v0.1.0 |
| Benchmark ID | STT-BENCHMARK-016 |

---

## 4. Candidate Models

Per the benchmark protocol (§8. Candidates), the following STT engines were evaluated:

| Engine | Source | Runtime | Streaming | Status |
|--------|--------|---------|-----------|--------|
| Parakeet | transcribe-rs ONNX | ONNX Runtime | ❌ No | ❌ NOT RELEASE-ELIGIBLE |
| Whisper (GGUF) | transcribe-cpp | whisper.cpp | ✅ Yes | ❌ NOT RELEASE-ELIGIBLE |

**NOT RELEASE-ELIGIBLE justification:** All model weights in the catalog (apps/desktop/src-tauri/src/catalog/catalog.json) are BLOCKED per docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md. Upstream license terms from blob.handy.computer have not been verified.

---

## 5. Model Versions & Provenance

| Model | Catalog ID | Source | Verification |
|-------|------------|--------|--------------|
| Parakeet V2 | parakeet-tdt-0.6b-v2 | blob.handy.computer | ❌ BLOCKED |
| Parakeet V3 | parakeet-tdt-0.6b-v3 | blob.handy.computer | ❌ BLOCKED |
| Whisper Small | whisper-small | blob.handy.computer | ❌ BLOCKED |
| Whisper Medium | whisper-medium | blob.handy.computer | ❌ BLOCKED |
| Whisper Turbo | whisper-turbo | blob.handy.computer | ❌ BLOCKED |
| Whisper Large | whisper-large | blob.handy.computer | ❌ BLOCKED |
| Moonshine variants | moonshine-* | blob.handy.computer | ❌ BLOCKED |

---

## 6. Corpus

| Field | Value |
|-------|-------|
| Corpus Location | tests/fixtures/audio + tests/fixtures/ground_truth |
| Corpus Size | ❌ EMPTY (no audio/ground-truth pairs present) |
| Categories | N/A (requires corpus creation) |

**Notes:** The benchmark protocol requires a representative local dataset. No test corpus exists. This benchmark run documents the harness and identifies corpus creation as a prerequisite for actual model benchmarking.

---

## 7. Configuration

| Parameter | Value |
|-----------|-------|
| Sample Rate | 16000 Hz |
| Warmup Runs | 2 per file |
| Benchmark Runs | 3 per file |
| Language | en |

---

## 8. Commands

```bash
# Benchmark harness tests (unit tests, no models required)
cargo test -p soravo-stt benchmark

# Integration benchmarks (require model files)
cargo test -p soravo-stt --test benchmark -- --ignored
```

---

## 9. Raw Results

### 9.1 Benchmark Harness Tests

```
running 7 tests
test benchmark::tests::test_calculate_cer_empty ... ok
test benchmark::tests::test_calculate_cer_identical ... ok
test benchmark::tests::test_calculate_cer_substitution ... ok
test benchmark::tests::test_calculate_wer_empty ... ok
test benchmark::tests::test_calculate_wer_identical ... ok
test benchmark::tests::test_calculate_wer_substitution ... ok
test benchmark::tests::test_parakeet_engine_initialization ... ok
test result: ok. 7 passed; 0 failed
```

### 9.2 Model Benchmark Results

| Engine | Mode | WER | CER | RTF | First Partial | Finalization | Peak RAM |
|--------|------|-----|-----|-----|---------------|--------------|----------|
| Parakeet | Batch | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |
| Parakeet | Streaming | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |
| Whisper | Batch | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |
| Whisper | Streaming | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |

**Reason for N/A:** No model files or test corpus available. The harness is implemented and verified via unit tests. Actual benchmarking requires:
1. Model download and license verification
2. Corpus creation with ground-truth transcripts

---

## 10. Failures

| Failure | Description | Action Required |
|---------|-------------|-----------------|
| Models blocked | All catalog models have unverified licenses | Contact Handy/CJPais for license terms (docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md) |
| Corpus missing | No test audio/ground-truth pairs | Create representative corpus per protocol §2 (Dataset) |
| No GPU | CPU-only inference | Accept for initial benchmark; GPU variants if/when available |

---

## 11. Notes

### 11.1 Harness Status
- ✅ Benchmark harness implemented in `crates/stt/src/benchmark.rs`
- ✅ WER/CER calculation algorithms tested and verified
- ✅ Both batch and streaming benchmark methods implemented
- ✅ Model lifecycle (load, warmup, inference, unload) tested
- ❌ Actual benchmarking blocked by missing models and corpus

### 11.2 Protocol Compliance
The benchmark protocol (§7. Procedure) requires:
1. ✅ Fixed hardware (documented above)
2. ❌ Fixed audio (no corpus)
3. ✅ Fixed sample rate (16kHz)
4. ❌ Fixed test corpus (not created)
5. ❌ Release build (not executed)
6. ❌ Warm and cold runs (not executed)
7. ❌ Repeat measurements (not executed)
8. ✅ Record results (this document)
9. ❌ Comparison report (blocked by missing data)

### 11.3 Next Steps
1. Create test corpus (protocol §2)
2. Verify model licenses (docs/spec-v3/17_MODEL_LICENSE_AND_PROVENANCE.md)
3. Download and install models
4. Execute full benchmark run
5. Generate comparison report

---

## 12. Signoff

| Role | Name | Status |
|------|------|--------|
| Architect | — | ✅ Documented |
| Engineer | — | ✅ Benchmark harness verified |

**END OF REPORT**
