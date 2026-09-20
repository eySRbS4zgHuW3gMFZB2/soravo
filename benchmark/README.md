# STT-008 Benchmark Dataset and Model Manifest

## Overview

This directory contains the manifest and acquisition documentation for the real benchmark
dataset and model artifacts required to execute STT-008 (Whisper and Parakeet performance
benchmarking).

## Storage Policy

Audio files and model binaries are NOT committed to Git. They are downloaded locally
following the procedures documented below. See `.gitignore` for excluded paths.

## Dataset

### Selected: LibriSpeech

- **Official Source**: https://www.openslr.org/12
- **Dataset Version**: LibriSpeech 1.0 (test-clean subset)
- **License**: Public Domain (no restrictions on use or redistribution)
- **Audio Format**: 16-bit WAV, 16kHz sample rate
- **Language**: English
- **Transcript Availability**: Included (text files)
- **Subset Used**: test-clean (2,620 utterances, ~5.5 hours)

**Rationale**: LibriSpeech test-clean is the industry-standard benchmark for English ASR.
It provides stable versioning, clear licensing, and widely accepted WER/CER metrics.

### Sample Selection

For initial benchmarking, we use a deterministic subset of test-clean:
- 50 utterances spanning:
  - Short commands (5-10 words)
  - Normal dictation (10-20 words)
  - Long-form speech (20+ words)
- All samples from distinct speakers to avoid speaker bias

## Models

### Whisper

- **Exact Model**: whisper-1.5B
- **Version/Revision**: official release
- **Source**: Hugging Face (https://huggingface.co/openai/whisper-1.5b)
- **Format**: ONNX (for transcribe-rs compatibility) or native model
- **License**: MIT (OpenAI Whisper)
- **Expected Path**: `~/.soravo/models/whisper-1.5b/`

### Parakeet

- **Exact Model**: parakeet-rnnt-1.1b-v2
- **Version/Revision**: v2
- **Source**: NVIDIA (https://github.com/NVIDIA/NeMo)
- **Format**: ONNX (for transcribe-rs compatibility)
- **License**: Apache 2.0
- **Expected Path**: `~/.soravo/models/parakeet-rnnt-1.1b-v2/`

## Directory Structure

```
benchmark/
├── manifest.json
├── README.md
├── scripts/
│   ├── download_dataset.py
│   ├── download_models.sh
│   └── verify_checksums.py
└── checksums/
    ├── dataset.tsv
    └── models.tsv
```

## Acquisition Procedure

1. Run `scripts/download_dataset.py` to download LibriSpeech test-clean subset
2. Run `scripts/download_models.sh` to download Whisper and Parakeet models
3. Verify all checksums using `scripts/verify_checksums.py`
4. Confirm model files are discoverable by the Soravo engines

## Reproducibility

Any developer following this document's procedures should obtain identical checksums
and be able to run the benchmark with the same input data.

## License Summary

- LibriSpeech: Public Domain
- Whisper: MIT
- Parakeet: Apache 2.0

All selected artifacts have permissive licensing compatible with Soravo's commercial
distribution.
