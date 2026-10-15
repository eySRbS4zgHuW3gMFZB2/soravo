//! Deterministic integrity guard for the **committed** bundled model assets.
//!
//! Why this exists: the Silero VAD ONNX weights, their MIT notice and their
//! provenance manifest are *committed to git* and packaged into every
//! distributable bundle via `bundle.resources` (`resources/**/*`).
//! `12_SECURITY_BASELINE.md` requires recorded checksums and provenance for
//! models, and `17_RELEASE_RUNBOOK.md` requires recorded, reproducible
//! artifact checksums. Nothing in CI previously bound the shipped bytes to
//! their recorded provenance, so a corrupted, truncated or accidentally
//! modified asset would still have shipped with a green build.
//!
//! This test is deterministic and offline: it recomputes the SHA-256 of the
//! committed asset and license notice and asserts they match the values
//! recorded in `SILERO_VAD_PROVENANCE.json`. It replaces no release step and
//! claims no real-device/on-hardware acceptance; it guards the artifact bytes
//! and their provenance only. Native injection/live-STT behaviour is covered
//! elsewhere and is out of scope here.

use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

fn models_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/models")
}

fn sha256_file(path: &Path) -> String {
    let bytes = fs::read(path).unwrap_or_else(|e| panic!("read {}: {e}", path.display()));
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    format!("{:x}", hasher.finalize())
}

/// The MIT copyright-and-permission notice ships alongside the weights; a
/// bundle missing it is not redistributable. Guard its presence exactly.
#[test]
fn bundled_vad_resource_set_is_complete() {
    let dir = models_dir();
    let mut names: Vec<String> = fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("read_dir {}: {e}", dir.display()))
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    assert_eq!(
        names,
        vec![
            "SILERO_VAD_LICENSE_MIT.txt".to_string(),
            "SILERO_VAD_PROVENANCE.json".to_string(),
            "silero_vad_v4.onnx".to_string(),
        ],
        "bundled model resource set drifted — the VAD weights, the MIT notice \
         and the provenance manifest must all ship together"
    );
}

/// The shipped ONNX bytes must equal the SHA-256 and byte size recorded in the
/// committed provenance manifest. This is the artifact-integrity invariant the
/// security baseline and release runbook require for bundled models.
#[test]
fn bundled_vad_matches_committed_provenance() {
    let dir = models_dir();
    let provenance_raw = fs::read_to_string(dir.join("SILERO_VAD_PROVENANCE.json"))
        .expect("read bundled provenance manifest");
    let provenance: Value =
        serde_json::from_str(&provenance_raw).expect("provenance manifest is valid JSON");

    let expected_sha = provenance["asset"]["sha256"]
        .as_str()
        .expect("provenance records asset.sha256");
    let expected_size = provenance["asset"]["byte_size"]
        .as_u64()
        .expect("provenance records asset.byte_size");

    let asset_path = dir.join("silero_vad_v4.onnx");
    let actual_size = fs::metadata(&asset_path)
        .unwrap_or_else(|e| panic!("stat {}: {e}", asset_path.display()))
        .len();
    assert_eq!(
        actual_size, expected_size,
        "bundled VAD byte size drifted from committed provenance"
    );

    let actual_sha = sha256_file(&asset_path);
    assert_eq!(
        actual_sha, expected_sha,
        "bundled VAD SHA-256 drifted from committed provenance — the shipped \
         asset no longer matches its recorded checksum"
    );
}

/// The bundled MIT notice must byte-match the SHA-256 recorded in provenance,
/// so the copyright-and-permission notice that satisfies MIT redistribution is
/// provably the intended text. Also guards that the manifest's recorded
/// repo-relative path matches where the asset actually lives.
#[test]
fn bundled_vad_license_notice_matches_provenance() {
    let dir = models_dir();
    let provenance_raw = fs::read_to_string(dir.join("SILERO_VAD_PROVENANCE.json"))
        .expect("read bundled provenance manifest");
    let provenance: Value =
        serde_json::from_str(&provenance_raw).expect("provenance manifest is valid JSON");

    let expected = provenance["license"]["file_sha256"]
        .as_str()
        .expect("provenance records license.file_sha256");
    let actual = sha256_file(&dir.join("SILERO_VAD_LICENSE_MIT.txt"));
    assert_eq!(
        actual, expected,
        "bundled Silero VAD MIT notice drifted from its recorded SHA-256"
    );

    let recorded_local_path = provenance["asset"]["local_path"]
        .as_str()
        .expect("provenance records asset.local_path");
    assert_eq!(
        recorded_local_path,
        "apps/desktop/src-tauri/resources/models/silero_vad_v4.onnx"
    );
}
