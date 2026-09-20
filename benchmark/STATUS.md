# STT-008 Data Acquisition Status

**Branch**: feature/STT-008-data  
**Created**: 2026-09-21  
**Current SHA**: 216cf23a (main)

## Summary

**STATUS: BLOCKED - Pending model source verification**

The benchmark infrastructure exists in the codebase but requires:
1. Real benchmark audio with verified transcripts
2. Verified model artifacts with official checksums
3. Legal confirmation of redistribution rights

## Infrastructure Status

### Present ✅

- `crates/stt/src/benchmark.rs` - Benchmark harness with WER/CER calculation
- `crates/stt/tests/benchmark.rs` - Integration tests (require real models)
- `crates/models/src/lib.rs` - Model manifest with checksum verification
- `crates/stt/src/engines/` - Parakeet and Whisper engine implementations

### Missing ❌

- `benchmark/manifest.json` - Created (this task)
- `benchmark/scripts/download_dataset.py` - Created (this task)
- `benchmark/scripts/verify_checksums.py` - Created (this task)
- Actual audio files
- Actual model weights
- Verified checksums

## Dataset Decision

**Selected**: LibriSpeech test-clean
- Source: https://www.openslr.org/12
- License: Public Domain
- Format: 16kHz WAV with text transcripts
- Size: 5.5 hours full, ~200MB for 50-sample subset

## Model Decisions

### Parakeet
**Current Status**: BLOCKED

- Intended source: NVIDIA NeMo
- Format required: ONNX (for transcribe-rs)
- Issue: NVIDIA does not distribute pre-converted ONNX weights
- Action required: Convert NeMo model to ONNX (requires NVIDIA NeMo toolkit)

### Whisper
**Current Status**: BLOCKED

- Intended source: OpenAI
- Format required: Binary (for transcribe-cpp)
- Issue: No official checksums published for model weights
- Action required: Verify exact model variant and source

## Blockers

1. **Model source verification**: Cannot determine exact model variant
2. **Checksum verification**: No official checksums available
3. **Format compatibility**: Need to verify transcribe-rs/NeMo integration

## Next Steps

1. Contact NVIDIA NeMo team for official ONNX export procedure
2. Contact OpenAI for official model download with checksums
3. Document exact model variant names from transcribe-rs/NeMo documentation
4. Wait for official sources before downloading artifacts

## Resource Requirements

Estimated storage needed: ~8GB
- LibriSpeech subset: ~200MB
- Parakeet model: ~4.4GB
- Whisper model: ~3GB

This exceeds previous low-storage VM constraints.
