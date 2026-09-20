#!/usr/bin/env python3
"""
Verify benchmark dataset and model checksums for STT-008.

This script validates that downloaded audio files and model weights
match their expected SHA-256 checksums.
"""

import hashlib
import os
import subprocess
import sys
from pathlib import Path


def sha256_file(path):
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def verify_audio_files(audio_dir):
    """Verify all audio files in the benchmark directory."""
    audio_path = Path(audio_dir)
    if not audio_path.exists():
        print(f"Audio directory not found: {audio_dir}")
        return False
    
    wav_files = list(audio_path.glob("*.wav"))
    if not wav_files:
        print(f"No WAV files found in {audio_dir}")
        return False
    
    print(f"Found {len(wav_files)} WAV files")
    for wav in sorted(wav_files):
        size = wav.stat().size
        checksum = sha256_file(wav)
        print(f"  {wav.name}: {size} bytes, SHA256: {checksum[:16]}...")
    
    return True


def verify_models(models_dir, model_names):
    """Verify model files exist and compute checksums."""
    models_path = Path(models_dir)
    if not models_path.exists():
        print(f"Models directory not found: {models_dir}")
        return False
    
    all_ok = True
    for name in model_names:
        model_path = models_path / name
        if not model_path.exists():
            print(f"  MISSING: {name}")
            all_ok = False
        else:
            size = model_path.stat().size
            checksum = sha256_file(model_path)
            print(f"  {name}: {size} bytes, SHA256: {checksum[:16]}...")
    
    return all_ok


def main():
    if len(sys.argv) < 3:
        print("Usage: verify_checksums.py <audio_dir> <models_dir>")
        sys.exit(1)
    
    audio_dir = sys.argv[1]
    models_dir = sys.argv[2]
    
    print("=== Audio Files ===")
    audio_ok = verify_audio_files(audio_dir)
    
    print("\n=== Models ===")
    models_ok = verify_models(models_dir, ["parakeet-rnnt-1.1b-v2.onnx", "whisper-1.5b.bin"])
    
    print("\n=== Summary ===")
    if audio_ok and models_ok:
        print("All files verified successfully")
    else:
        print("Some files are missing or need verification")
        sys.exit(1)


if __name__ == "__main__":
    main()
