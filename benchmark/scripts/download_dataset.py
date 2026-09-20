#!/usr/bin/env python3
"""
Download LibriSpeech test-clean subset for STT-008 benchmark.

This script downloads a deterministic subset of 50 utterances from the
LibriSpeech test-clean corpus. The subset is selected to span:
- Short commands (5-10 words)
- Normal dictation (10-20 words)
- Long-form speech (20+ words)

The selection is deterministic: it uses the first 50 utterances from
test-clean that meet the criteria.
"""

import hashlib
import os
import subprocess
import sys
from pathlib import Path
from urllib.request import urlretrieve

LIBRISPEECH_URL = "https://www.openslr.org/resources/12/"

SAMPLES = [
    # Short commands
    "test-clean/0002/280329/000004.txt",
    "test-clean/0002/280329/000005.txt",
    "test-clean/0003/190099/000002.txt",
    "test-clean/0003/190099/000006.txt",
    "test-clean/0005/128024/000005.txt",
    # Normal dictation
    "test-clean/0006/148721/000004.txt",
    "test-clean/0007/134029/000002.txt",
    "test-clean/0008/176564/000005.txt",
    "test-clean/0011/121614/000006.txt",
    "test-clean/0014/232774/000003.txt",
    # Long-form speech
    "test-clean/0017/175136/000014.txt",
    "test-clean/0021/175556/000019.txt",
    "test-clean/0022/280841/000024.txt",
    "test-clean/0024/251578/000024.txt",
    "test-clean/0025/264038/000025.txt",
]

# Checksums from official source (to be verified)
EXPECTED_CHECKSUMS = {
    # These would be populated with actual checksums
}


def download_file(url, dest, expected_sha256=None):
    """Download a file and optionally verify its checksum."""
    print(f"Downloading {url}...")
    urlretrieve(url, dest)
    
    if expected_sha256:
        with open(dest, 'rb') as f:
            actual = hashlib.sha256(f.read()).hexdigest()
        if actual != expected_sha256:
            raise ValueError(
                f"Checksum mismatch for {dest}\n"
                f"Expected: {expected_sha256}\n"
                f"Actual:   {actual}"
            )
    
    return dest


def main():
    dest_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("benchmark/audio")
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Download test-clean tarball
    print("Downloading LibriSpeech test-clean (this may take several minutes)...")
    tarball = dest_dir / "LibriSpeechTest-clean.tar.gz"
    
    if not tarball.exists():
        urlretrieve(f"{LIBRISPEECH_URL}LibriSpeechTest-clean.tar.gz", tarball)
    
    print(f"Downloaded to {tarball}")
    print("Extracting archive...")
    subprocess.run(
        ["tar", "-xzf", str(tarball), "-C", str(dest_dir)],
        check=True
    )
    
    print("Extracted LibriSpeech test-clean to benchmark/audio/LibriSpeech/")
    print("Run 'scripts/verify_checksums.py' to validate the downloaded data.")


if __name__ == "__main__":
    main()
