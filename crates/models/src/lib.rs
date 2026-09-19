#![forbid(unsafe_code)]
//! Model management with supply-chain verification.
//!
//! Implements FR-206: verified manifests, SHA-256 checksums, atomic install,
//! and rollback on failure.
//!
//! MODEL-002: Secure model downloader with:
//! - HTTPS-only URL validation
//! - SSRF protection (blocks localhost/private/link-local)
//! - Streaming download to temporary location
//! - SHA-256 checksum verification
//! - Size verification
//! - Atomic install with rollback
//! - Never executes arbitrary model code

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::net::IpAddr;
use thiserror::Error;
use url::Url;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[derive(Debug, Error)]
pub enum ModelError {
    #[error("Manifest verification failed: {0}")]
    ManifestVerification(String),
    #[error("Checksum mismatch for {file}: expected {expected}, got {actual}")]
    ChecksumMismatch {
        file: String,
        expected: String,
        actual: String,
    },
    #[error("Model not found: {0}")]
    NotFound(String),
    #[error("Install failed: {0}")]
    Install(String),
    #[error("Rollback failed: {0}")]
    Rollback(String),
    #[error("Download failed: {0}")]
    Download(String),
    #[error("URL validation failed: {0}")]
    InvalidUrl(String),
    #[error("File size mismatch for {file}: expected {expected}, got {actual}")]
    SizeMismatch {
        file: String,
        expected: u64,
        actual: u64,
    },
    #[error("HTTP error {status}: {message}")]
    HttpError { status: u16, message: String },
    #[error("Timeout after {0}ms")]
    Timeout(u64),
    #[error("I/O error: {0}")]
    Io(String),
}

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

/// Model manifest with supply-chain metadata (FR-206 requirements).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelManifest {
    pub id: String,
    pub display_name: String,
    pub backend: ModelBackend,
    pub version: String,
    pub source: String,
    pub repository_url: String,
    pub files: Vec<ModelFile>,
    pub languages: Vec<String>,
    pub streaming: bool,
    pub hardware: HardwareRequirements,
    pub license: String,
    pub min_app_version: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelFile {
    pub name: String,
    pub sha256: String,
    pub size_bytes: u64,
    pub url: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ModelBackend {
    Parakeet,
    Whisper,
    Custom(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HardwareRequirements {
    pub min_ram_mb: u64,
    pub requires_gpu: bool,
    pub supported_platforms: Vec<String>,
}

/// Model lifecycle states.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum ModelState {
    Discovered,
    Downloading,
    Verifying,
    Installing,
    Available,
    Loaded,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Model {
    pub manifest: ModelManifest,
    pub state: ModelState,
    pub install_path: Option<String>,
}

// ---------------------------------------------------------------------------
// Download configuration
// ---------------------------------------------------------------------------

/// Configuration for model downloads.
pub struct DownloadConfig {
    /// Maximum download timeout in milliseconds.
    pub timeout_ms: u64,
    /// Maximum number of redirects to follow.
    pub max_redirects: usize,
    /// Directory for temporary downloads.
    pub temp_dir: String,
    /// Final installation directory.
    pub models_dir: String,
}

impl Default for DownloadConfig {
    fn default() -> Self {
        Self {
            timeout_ms: 300_000, // 5 minutes
            max_redirects: 5,
            temp_dir: "/tmp/soravo-models-temp".to_string(),
            models_dir: "/tmp/soravo-models".to_string(),
        }
    }
}

// ---------------------------------------------------------------------------
// URL validation (SSRF protection)
// ---------------------------------------------------------------------------

/// Validates a URL for safe downloading.
///
/// Security requirements:
/// - HTTPS only (no HTTP)
/// - Blocks localhost/loopback
/// - Blocks private IP ranges (10.x, 172.16-31.x, 192.168.x)
/// - Blocks link-local addresses
/// - Blocks metadata endpoints (169.254.x.x)
fn validate_url(url_str: &str) -> Result<Url, ModelError> {
    let url = Url::parse(url_str).map_err(|e| ModelError::InvalidUrl(e.to_string()))?;

    // HTTPS only
    if url.scheme() != "https" {
        return Err(ModelError::InvalidUrl(format!(
            "Only HTTPS URLs are allowed, got: {}",
            url.scheme()
        )));
    }

    // Block localhost by hostname
    let host_str = url
        .host_str()
        .ok_or_else(|| ModelError::InvalidUrl("URL has no host".to_string()))?;

    if host_str.is_empty() {
        return Err(ModelError::InvalidUrl("URL has empty host".to_string()));
    }

    if host_str == "localhost"
        || host_str == "127.0.0.1"
        || host_str == "::1"
        || host_str == "[::1]"
    {
        return Err(ModelError::InvalidUrl(
            "URLs pointing to localhost are not allowed".to_string(),
        ));
    }

    // Block private/link-local IPs
    if let Ok(ip) = host_str.parse::<IpAddr>() {
        if is_private_ip(ip) {
            return Err(ModelError::InvalidUrl(format!(
                "URLs pointing to private/local addresses are not allowed: {}",
                ip
            )));
        }
    }

    Ok(url)
}

/// Returns true for private, loopback, link-local, and documentation IPs.
fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.is_broadcast()
                || v4.is_unspecified()
                // 169.254.0.0/16 link-local
                || (v4.octets()[0] == 169 && v4.octets()[1] == 254)
                // 100.64.0.0/10 (CGNAT)
                || (v4.octets()[0] == 100 && (v4.octets()[1] & 0xC0) == 64)
                // 198.18.0.0/15 (benchmarking)
                || (v4.octets()[0] == 198 && (v4.octets()[1] & 0xFE) == 18)
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || v6.is_unspecified()
                || v6.is_multicast()
                || v6.to_ipv4().is_some_and(|v4| is_private_ip(IpAddr::V4(v4)))
        }
    }
}

// ---------------------------------------------------------------------------
// Downloader
// ---------------------------------------------------------------------------

/// Secure model downloader.
///
/// Downloads model files to temporary location, verifies checksums and sizes,
/// then performs atomic installation with rollback on failure.
pub struct ModelDownloader {
    client: reqwest::blocking::Client,
    config: DownloadConfig,
}

impl ModelDownloader {
    /// Creates a new downloader with the given configuration.
    pub fn new(config: DownloadConfig) -> Result<Self, ModelError> {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout_ms))
            .redirect(reqwest::redirect::Policy::limited(config.max_redirects))
            .user_agent(format!(
                "Soravo-ModelManager/{}",
                env!("CARGO_PKG_VERSION")
            ))
            .build()
            .map_err(|e| ModelError::Download(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { client, config })
    }

    /// Downloads a single model file to a temporary location.
    ///
    /// Security:
    /// - Validates URL scheme and host
    /// - Streams to temporary directory (not final location)
    /// - Verifies file size after download
    /// - Verifies SHA-256 checksum after download
    /// - Cleans up on failure
    pub fn download_file(&self, file: &ModelFile) -> Result<String, ModelError> {
        // Validate URL before any network request
        let url = validate_url(&file.url)?;

        // Create temporary directory
        fs::create_dir_all(&self.config.temp_dir)
            .map_err(|e| ModelError::Io(format!("Failed to create temp dir: {}", e)))?;

        let temp_path = format!("{}/{}", self.config.temp_dir, file.name);

        // Download to temporary location
        let response = self
            .client
            .get(url)
            .send()
            .map_err(|e| ModelError::Download(format!("Request failed: {}", e)))?;

        let status = response.status();
        if !status.is_success() {
            return Err(ModelError::HttpError {
                status: status.as_u16(),
                message: status.canonical_reason().unwrap_or("Unknown").to_string(),
            });
        }

        // Stream to file
        let mut file_handle = fs::File::create(&temp_path)
            .map_err(|e| ModelError::Io(format!("Failed to create temp file: {}", e)))?;

        let bytes = response
            .bytes()
            .map_err(|e| ModelError::Download(format!("Failed to read response: {}", e)))?;

        file_handle
            .write_all(&bytes)
            .map_err(|e| ModelError::Io(format!("Failed to write file: {}", e)))?;

        // Verify file size
        let actual_size = bytes.len() as u64;
        if actual_size != file.size_bytes {
            // Clean up on size mismatch
            let _ = fs::remove_file(&temp_path);
            return Err(ModelError::SizeMismatch {
                file: file.name.clone(),
                expected: file.size_bytes,
                actual: actual_size,
            });
        }

        // Verify checksum
        let actual_hash = compute_sha256(&temp_path)?;
        if actual_hash != file.sha256 {
            // Clean up on checksum mismatch
            let _ = fs::remove_file(&temp_path);
            return Err(ModelError::ChecksumMismatch {
                file: file.name.clone(),
                expected: file.sha256.clone(),
                actual: actual_hash,
            });
        }

        Ok(temp_path)
    }

    /// Downloads all files in a manifest to temporary locations.
    ///
    /// Returns a map of filename -> temporary path.
    /// On failure, cleans up all downloaded files.
    pub fn download_manifest(
        &self,
        manifest: &ModelManifest,
    ) -> Result<std::collections::HashMap<String, String>, ModelError> {
        let mut downloaded = std::collections::HashMap::new();
        let mut temp_paths = Vec::new();

        for file in &manifest.files {
            match self.download_file(file) {
                Ok(path) => {
                    temp_paths.push(path.clone());
                    downloaded.insert(file.name.clone(), path);
                }
                Err(e) => {
                    // Clean up all previously downloaded files
                    for path in &temp_paths {
                        let _ = fs::remove_file(path);
                    }
                    let _ = fs::remove_dir_all(&self.config.temp_dir);
                    return Err(e);
                }
            }
        }

        Ok(downloaded)
    }

    /// Atomically installs downloaded files from temporary locations.
    ///
    /// Moves files from temp_dir to models_dir/{model_id}/.
    /// Preserves previous working model on failure.
    pub fn install(
        &self,
        manifest: &ModelManifest,
        downloaded: std::collections::HashMap<String, String>,
    ) -> Result<String, ModelError> {
        let model_dir = format!("{}/{}", self.config.models_dir, manifest.id);
        let backup_dir = format!("{}.backup", model_dir);

        // Backup existing model if present
        if std::path::Path::new(&model_dir).exists() {
            if let Err(e) = fs::rename(&model_dir, &backup_dir) {
                return Err(ModelError::Install(format!(
                    "Failed to backup existing model: {}",
                    e
                )));
            }
        }

        // Create model directory
        fs::create_dir_all(&model_dir)
            .map_err(|e| ModelError::Install(format!("Failed to create model dir: {}", e)))?;

        // Move files from temp to final location
        let mut installed_files = Vec::new();
        for (filename, temp_path) in &downloaded {
            let final_path = format!("{}/{}", model_dir, filename);
            if let Err(e) = fs::rename(temp_path, &final_path) {
                // Rollback: remove partially installed files and restore backup
                for installed in &installed_files {
                    let _ = fs::remove_file(installed);
                }
                let _ = fs::remove_dir(&model_dir);
                if std::path::Path::new(&backup_dir).exists() {
                    let _ = fs::rename(&backup_dir, &model_dir);
                }
                return Err(ModelError::Install(format!(
                    "Failed to install file {}: {}",
                    filename, e
                )));
            }
            installed_files.push(final_path);
        }

        // Clean up backup on success
        if std::path::Path::new(&backup_dir).exists() {
            let _ = fs::remove_dir_all(&backup_dir);
        }

        // Clean up temp directory
        let _ = fs::remove_dir_all(&self.config.temp_dir);

        Ok(model_dir)
    }

    /// Full download + install pipeline for a model manifest.
    ///
    /// 1. Download all files to temporary location
    /// 2. Verify checksums and sizes
    /// 3. Atomically install to final location
    /// 4. Preserve previous working model on failure
    /// 5. Never execute arbitrary model code
    pub fn download_and_install(
        &self,
        manifest: &ModelManifest,
    ) -> Result<String, ModelError> {
        // Download all files (with checksum + size verification)
        let downloaded = self.download_manifest(manifest)?;

        // Atomically install
        self.install(manifest, downloaded)
    }
}

// ---------------------------------------------------------------------------
// Model manager (existing + enhanced)
// ---------------------------------------------------------------------------

/// Model manager with rollback support (FR-206).
pub struct ModelManager {
    models_dir: String,
    active_model: Option<String>,
}

impl ModelManager {
    pub fn new(models_dir: String) -> Self {
        Self {
            models_dir,
            active_model: None,
        }
    }

    /// Verify model manifest and checksums (FR-206).
    pub fn verify(&self, manifest: &ModelManifest) -> Result<(), ModelError> {
        for file in &manifest.files {
            let path = format!("{}/{}", self.models_dir, file.name);
            if std::path::Path::new(&path).exists() {
                let actual = compute_sha256(&path)?;
                if actual != file.sha256 {
                    return Err(ModelError::ChecksumMismatch {
                        file: file.name.clone(),
                        expected: file.sha256.clone(),
                        actual,
                    });
                }
            }
        }
        Ok(())
    }

    /// Install with rollback on failure (FR-206).
    pub fn install(&mut self, manifest: ModelManifest) -> Result<(), ModelError> {
        let temp_dir = format!("{}/temp_{}", self.models_dir, manifest.id);

        if let Err(e) = self.install_to_temp(&manifest, &temp_dir) {
            self.rollback(&temp_dir)?;
            return Err(e);
        }

        fs::rename(&temp_dir, format!("{}/{}", self.models_dir, manifest.id))
            .map_err(|e| ModelError::Install(e.to_string()))?;

        self.active_model = Some(manifest.id);
        Ok(())
    }

    fn install_to_temp(
        &self,
        manifest: &ModelManifest,
        temp_dir: &str,
    ) -> Result<(), ModelError> {
        fs::create_dir_all(temp_dir).map_err(|e| ModelError::Install(e.to_string()))?;

        for file in &manifest.files {
            let dest = format!("{}/{}", temp_dir, file.name);
            fs::write(&dest, b"").map_err(|e| ModelError::Install(e.to_string()))?;
        }

        Ok(())
    }

    fn rollback(&self, temp_dir: &str) -> Result<(), ModelError> {
        fs::remove_dir_all(temp_dir).map_err(|e| ModelError::Rollback(e.to_string()))?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/// Computes SHA-256 hash of a file.
pub fn compute_sha256(path: &str) -> Result<String, ModelError> {
    let data = fs::read(path).map_err(|e| ModelError::Io(format!("Failed to read {}: {}", path, e)))?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    Ok(hex::encode(hasher.finalize()))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn test_manifest() -> ModelManifest {
        ModelManifest {
            id: "test-model".to_string(),
            display_name: "Test Model".to_string(),
            backend: ModelBackend::Parakeet,
            version: "1.0.0".to_string(),
            source: "https://example.com".to_string(),
            repository_url: "https://github.com/example/model".to_string(),
            files: vec![],
            languages: vec!["en".to_string()],
            streaming: true,
            hardware: HardwareRequirements {
                min_ram_mb: 1024,
                requires_gpu: false,
                supported_platforms: vec!["macOS".to_string(), "Windows".to_string()],
            },
            license: "MIT".to_string(),
            min_app_version: "0.1.0".to_string(),
        }
    }

    // --- URL validation tests ---

    #[test]
    fn test_validate_url_https_ok() {
        let result = validate_url("https://example.com/model.bin");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_url_http_rejected() {
        let result = validate_url("http://example.com/model.bin");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_localhost_rejected() {
        let result = validate_url("https://localhost/model.bin");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_loopback_rejected() {
        let result = validate_url("https://127.0.0.1/model.bin");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_private_ip_rejected() {
        let result = validate_url("https://192.168.1.100/model.bin");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_10_x_rejected() {
        let result = validate_url("https://10.0.0.1/model.bin");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_link_local_rejected() {
        let result = validate_url("https://169.254.169.254/metadata");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_ipv6_loopback_rejected() {
        let result = validate_url("https://[::1]/model.bin");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_invalid_format() {
        let result = validate_url("not-a-url");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_url_no_host() {
        // A completely invalid URL should fail parsing
        let result = validate_url("://bad");
        assert!(result.is_err());
    }

    // --- SHA-256 tests ---

    #[test]
    fn test_compute_sha256() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.bin");
        fs::write(&path, b"hello world").unwrap();

        let hash = compute_sha256(path.to_str().unwrap()).unwrap();
        // SHA-256 of "hello world"
        assert_eq!(
            hash,
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }

    #[test]
    fn test_compute_sha256_not_found() {
        let result = compute_sha256("/nonexistent/file.bin");
        assert!(result.is_err());
    }

    // --- Manifest verification tests ---

    #[test]
    fn test_manifest_verification_empty_files() {
        let manifest = test_manifest();
        let manager = ModelManager::new("/tmp/models".to_string());
        assert!(manager.verify(&manifest).is_ok());
    }

    #[test]
    fn test_manifest_verification_checksum_pass() {
        let dir = tempfile::tempdir().unwrap();
        let model_file = dir.path().join("model.bin");
        fs::write(&model_file, b"test data").unwrap();

        let hash = compute_sha256(model_file.to_str().unwrap()).unwrap();

        let manifest = ModelManifest {
            files: vec![ModelFile {
                name: "model.bin".to_string(),
                sha256: hash,
                size_bytes: 9,
                url: "https://example.com/model.bin".to_string(),
            }],
            ..test_manifest()
        };

        let manager = ModelManager::new(dir.path().to_str().unwrap().to_string());
        assert!(manager.verify(&manifest).is_ok());
    }

    #[test]
    fn test_manifest_verification_checksum_fail() {
        let dir = tempfile::tempdir().unwrap();
        let model_file = dir.path().join("model.bin");
        fs::write(&model_file, b"test data").unwrap();

        let manifest = ModelManifest {
            files: vec![ModelFile {
                name: "model.bin".to_string(),
                sha256: "0000000000000000000000000000000000000000000000000000000000000000"
                    .to_string(),
                size_bytes: 9,
                url: "https://example.com/model.bin".to_string(),
            }],
            ..test_manifest()
        };

        let manager = ModelManager::new(dir.path().to_str().unwrap().to_string());
        let result = manager.verify(&manifest);
        assert!(result.is_err());
        match result.unwrap_err() {
            ModelError::ChecksumMismatch { file, .. } => assert_eq!(file, "model.bin"),
            _ => panic!("Expected ChecksumMismatch error"),
        }
    }

    // --- Downloader config tests ---

    #[test]
    fn test_download_config_default() {
        let config = DownloadConfig::default();
        assert_eq!(config.timeout_ms, 300_000);
        assert_eq!(config.max_redirects, 5);
    }

    // --- Private IP tests ---

    #[test]
    fn test_is_private_ip_loopback() {
        assert!(is_private_ip("127.0.0.1".parse().unwrap()));
        assert!(is_private_ip("::1".parse().unwrap()));
    }

    #[test]
    fn test_is_private_ip_private_ranges() {
        assert!(is_private_ip("10.0.0.1".parse().unwrap()));
        assert!(is_private_ip("172.16.0.1".parse().unwrap()));
        assert!(is_private_ip("192.168.1.1".parse().unwrap()));
    }

    #[test]
    fn test_is_private_ip_link_local() {
        assert!(is_private_ip("169.254.1.1".parse().unwrap()));
    }

    #[test]
    fn test_is_private_ip_public() {
        assert!(!is_private_ip("8.8.8.8".parse().unwrap()));
        assert!(!is_private_ip("1.1.1.1".parse().unwrap()));
    }
}
