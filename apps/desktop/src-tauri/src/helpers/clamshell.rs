//! Clamshell mode detection for macOS
//!
//! On macOS, clamshell mode (closed lid with external display) may require
//! switching to a different microphone. On other platforms, this always returns false.

#[cfg(target_os = "macos")]
pub fn is_clamshell() -> Result<bool, String> {
    use std::process::Command;
    let output = Command::new("ioreg")
        .args(["-r", "-k", "AppleClamshellState"])
        .output()
        .map_err(|e| format!("Failed to run ioreg: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.contains("AppleClamshellState = Yes"))
}

#[cfg(not(target_os = "macos"))]
pub fn is_clamshell() -> Result<bool, String> {
    Ok(false)
}
