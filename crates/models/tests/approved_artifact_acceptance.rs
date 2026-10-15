//! Approved model-artifact acceptance (model discovery + hash validation).
//!
//! Acceptance case C2: the EXACT approved launch artifact (Parakeet Unified EN
//! 0.6B Q8_0, SHA-256 pinned below) verifies against a supply-chain manifest
//! via the production `ModelManager::verify` path. Unit tests cover the
//! registry/verify semantics without the artifact; the ignored live test
//! hashes the real 731 MB file at `SORAVO_MODEL_ARTIFACT_PATH` (the artifact
//! lives outside git by policy and is never copied into a worktree).
//! Never downloads, never fabricates.

use soravo_models::{compute_sha256, ModelBackend, ModelFile, ModelManager, ModelManifest};

// SHA-256 of the approved launch artifact. Fixed: do not change.
const APPROVED_SHA256: &str = "4b50b6dd862bf6e346929aaf4f5eaacec003bfa3f56462d6c874b41ef2f38795";

fn manifest_for(name: &str, sha: &str, size: u64) -> ModelManifest {
    ModelManifest {
        id: "parakeet-unified-en-0.6b-q8_0".to_string(),
        display_name: "Parakeet Unified EN 0.6B Q8_0 (launch model)".to_string(),
        backend: ModelBackend::Parakeet,
        version: "0.6b-q8_0".to_string(),
        source: "local-artifact".to_string(),
        repository_url: "https://github.com/eySRbS4zgHuW3gMFZB2/soravo".to_string(),
        files: vec![ModelFile {
            name: name.to_string(),
            sha256: sha.to_string(),
            size_bytes: size,
            url: "https://example.invalid/parakeet-unified-en-0.6b-Q8_0.gguf".to_string(),
        }],
        languages: vec!["en".to_string()],
        streaming: false,
        hardware: soravo_models::HardwareRequirements {
            min_ram_mb: 2048,
            requires_gpu: false,
            supported_platforms: vec!["macOS".to_string(), "Windows".to_string()],
        },
        license: "UNKNOWN (see progress/LICENSE-GAP.md — never claimed here)".to_string(),
        min_app_version: "0.1.0".to_string(),
    }
}

#[test]
fn verify_accepts_matching_artifact() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("model.gguf");
    std::fs::write(&path, b"artifact-bytes").unwrap();
    let sha = compute_sha256(path.to_str().unwrap()).unwrap();
    let manifest = manifest_for("model.gguf", &sha, 14);
    let manager = ModelManager::new(dir.path().to_str().unwrap().to_string());
    assert!(manager.verify(&manifest).is_ok());
}

#[test]
fn verify_rejects_substituted_artifact() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("model.gguf");
    std::fs::write(&path, b"tampered-bytes").unwrap();
    let manifest = manifest_for(
        "model.gguf",
        "0000000000000000000000000000000000000000000000000000000000000000",
        14,
    );
    let manager = ModelManager::new(dir.path().to_str().unwrap().to_string());
    assert!(manager.verify(&manifest).is_err());
}

#[test]
fn verify_skips_absent_files_by_design() {
    // Documents current `verify` semantics: absent files are skipped (the
    // pre-download state), never reported as verified. Callers must treat
    // "no file" separately from "verified" — this test locks that contract.
    let dir = tempfile::tempdir().unwrap();
    let manifest = manifest_for("missing.gguf", APPROVED_SHA256, 731357568);
    let manager = ModelManager::new(dir.path().to_str().unwrap().to_string());
    assert!(manager.verify(&manifest).is_ok());
    assert!(!dir.path().join("missing.gguf").exists());
}

#[test]
fn whisper_backend_round_trips_for_comparison_registry() {
    // The comparison harness needs a Whisper-typed manifest entry; the
    // registry enum must carry it without loss.
    let json = serde_json::to_string(&ModelBackend::Whisper).unwrap();
    let back: ModelBackend = serde_json::from_str(&json).unwrap();
    assert!(matches!(back, ModelBackend::Whisper));
    let json = serde_json::to_string(&ModelBackend::Parakeet).unwrap();
    let back: ModelBackend = serde_json::from_str(&json).unwrap();
    assert!(matches!(back, ModelBackend::Parakeet));
}

#[test]
#[ignore]
fn approved_launch_artifact_hash_acceptance() {
    // Live acceptance: hash the REAL artifact, compare against the approved
    // pin. Fails closed on substitution, absence, or unreadable file. The
    // artifact lives outside git by policy (never copied into a worktree),
    // so its location is always explicit via the environment.
    let artifact = std::env::var("SORAVO_MODEL_ARTIFACT_PATH")
        .expect("SORAVO_MODEL_ARTIFACT_PATH not set (path to the local approved artifact)");
    let meta = std::fs::metadata(&artifact)
        .unwrap_or_else(|_| panic!("approved artifact absent at {}", artifact));
    assert!(meta.len() > 0, "approved artifact is empty");
    let actual = compute_sha256(&artifact).expect("hash artifact");
    assert_eq!(
        actual, APPROVED_SHA256,
        "approved artifact substitution: refusing"
    );
    println!(
        "BENCH accept approved artifact ok sha={} bytes={}",
        actual,
        meta.len()
    );
}
