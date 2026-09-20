# STT-008 Data Acquisition Final Report

**Branch**: feature/STT-008-data  
**Status**: BLOCKED

## Dataset

**Selected**: LibriSpeech test-clean
- **Official Source**: https://www.openslr.org/12
- **Version**: 1.0
- **License**: Public Domain
- **Audio Format**: 16-bit WAV, 16kHz, mono
- **Language**: English
- **Samples Selected**: 50 deterministic subset
- **Total Size**: ~200MB (subset) / ~1.1GB (full test-clean)
- **Transcripts**: Included as UTF-8 text
- **Redistribution**: Allowed
- **WER/CER Suitable**: Yes (industry standard)

## Whisper

**Exact Model**: TBD - Blocked
- **Issue**: No official checksums published
- **Intended Source**: OpenAI (https://github.com/openai/whisper)
- **Format**: Binary weights
- **Size**: ~3GB
- **Action Required**: Verify exact model variant with official checksums

## Parakeet

**Exact Model**: TBD - Blocked
- **Issue**: NVIDIA does not distribute ONNX weights directly
- **Intended Source**: NVIDIA NeMo
- **Format Required**: ONNX (for transcribe-rs)
- **Size**: ~4.4GB
- **Action Required**: Convert NeMo model to ONNX using NVIDIA toolkit

## Handy Reuse

**Relevant Implementation Inspected**: None

The current repository does not contain a pinned Handy fork or Handy source
code. Per the SORAVO_HANDY_CODE_REUSE_REPORT.md, Handy was approved for V1
reuse but the actual Handy revision has not been imported.

**Reuse Status**: Unable to reuse Handy's model acquisition approach because
Handy's codebase is not present in the repository.

## Repository

**Starting Main SHA**: 216cf23a7959840a3f830e187445968f6fc57dc7

**Branch**: feature/STT-008-data

**Files Created**:
- benchmark/manifest.json
- benchmark/README.md
- benchmark/STATUS.md
- benchmark/scripts/download_dataset.py
- benchmark/scripts/verify_checksums.py
- benchmark/checksums/manifest.tsv

**Tests**: Not run (benchmark fixtures do not exist)

**CI**: Not run (no changes to CI configuration)

**PR Number**: None (blocked)

## Benchmark Readiness

**BLOCKED**

### Exact Blockers

1. **Whisper model**: No official source with verified checksums
2. **Parakeet model**: ONNX conversion required from NeMo source
3. **Model verification**: transcribe-rs/NeMo integration compatibility unverified
4. **Storage**: ~8GB required exceeds low-storage VM constraints

### Missing Artifacts

1. Verified Whisper model weights with official checksum
2. Converted Parakeet ONNX model with verified checksum
3. Downloaded LibriSpeech audio with verified checksums

### Required Actions

1. Obtain official Whisper model download URL with SHA-256 checksum
2. Convert NVIDIA NeMo Parakeet model to ONNX format
3. Verify exact model variant compatibility with transcribe-rs
4. Secure adequate storage (~10GB free)

**No fake fixtures or fabricated benchmarks were created.**
