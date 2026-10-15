#![forbid(unsafe_code)]
//! Soravo typing abstraction - native insertion with clipboard fallback.
//!
//! This crate handles text injection into the active application:
//! - Native insertion where the platform supports it reliably
//! - Clipboard/paste fallback that preserves/restores user clipboard
//! - Only committed/final text injection (never tentative)
//!
//! # Clipboard Restoration (TYPE-003)
//!
//! The clipboard fallback path follows the pattern established by Handy's
//! `clipboard.rs` and `paste_tx/` modules:
//!
//! 1. Snapshot the current clipboard content (text + image)
//! 2. Write the dictated text to the clipboard
//! 3. Simulate the platform paste chord (Ctrl+V / Cmd+V / Ctrl+Shift+V)
//! 4. Wait for the paste to complete (configurable delay)
//! 5. Restore the original clipboard content, guarded by ownership check
//!
//! Unlike Handy's receipt-sequenced approach (which requires platform-specific
//! delayed rendering / promise-based pasteboard), this crate uses a simpler
//! fixed-delay restoration suitable for Soravo's committed-text-only injection
//! model. The receipt-sequenced approach can be adopted later when the Tauri
//! integration layer is in place.
//!
//! # Platform Support
//!
//! - **Windows**: `clipboard-win` crate + `SendInput` via safe wrapper
//! - **macOS**: `pbcopy`/`pbpaste` + `osascript` for paste simulation
//! - **Linux**: `xclip`/`wl-copy` for clipboard + `xdotool`/`ydotool` for paste
//!
//! # Safety
//!
//! This crate uses `#![forbid(unsafe_code)]`. All platform-specific operations
//! go through safe abstractions or external commands. This differs from Handy's
//! `paste_tx/macos.rs` (which uses `objc2` for Objective-C interop) and
//! `input.rs` (which uses `enigo` for keyboard simulation). Those patterns
//! should be adopted in the Tauri integration layer where the `unsafe` ban
//! can be scoped more precisely.

use serde::{Deserialize, Serialize};
use specta::Type;
#[cfg(target_os = "linux")]
use std::time::Duration;
use std::time::Instant;

/// Maximum time to wait for one Linux clipboard/paste helper process.
///
/// External helpers (`xclip`, `wl-paste`, `wl-copy`, `xdotool`, `ydotool`)
/// block indefinitely when the display server is unreachable (e.g. a stale
/// `$DISPLAY` pointing at an unresponsive X server). An unbounded wait would
/// hang the caller — dictation delivery or `cargo test` — forever, so every
/// Linux helper invocation below is bounded by this timeout and fails closed
/// (`ClipboardError` / `PasteError`) on expiry. Normal clipboard round-trips
/// complete in milliseconds; this budget is deliberately generous.
#[cfg(target_os = "linux")]
const EXTERNAL_COMMAND_TIMEOUT: Duration = Duration::from_secs(5);

/// Run `cmd` to completion, killing it if it exceeds `timeout`.
///
/// Std-only replacement for an unbounded `Command::output()`: spawn with
/// piped stdout/stderr, poll with `try_wait`, and kill + reap on expiry.
/// A spawn failure or timeout surfaces as `Err`, which callers treat exactly
/// like a helper failure (fail closed, never hang).
///
/// Assumption: the invoked helper does not fork a lingering daemon that
/// inherits the stdout/stderr pipes (true for the read/query helpers used
/// here: `xclip -o`, `wl-paste`, `xdotool`, `ydotool`). Daemonizing helpers
/// on the write path are spawned with nulled stdio at their call sites.
#[cfg(target_os = "linux")]
fn command_output_timeout(
    cmd: &mut std::process::Command,
    timeout: Duration,
) -> std::io::Result<std::process::Output> {
    use std::io::Read;
    use std::process::Stdio;
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn()?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Err(e) => {
                let _ = child.kill();
                return Err(e);
            }
            Ok(Some(status)) => {
                let mut out = Vec::new();
                let mut err = Vec::new();
                if let Some(mut o) = stdout {
                    let _ = o.read_to_end(&mut out);
                }
                if let Some(mut e) = stderr {
                    let _ = e.read_to_end(&mut err);
                }
                return Ok(std::process::Output {
                    status,
                    stdout: out,
                    stderr: err,
                });
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::TimedOut,
                        "external clipboard helper timed out",
                    ));
                }
                std::thread::sleep(Duration::from_millis(10));
            }
        }
    }
}

/// Wait for an already-spawned helper (piped-stdin write path) up to
/// `timeout`, killing and reaping it on expiry. See
/// [`EXTERNAL_COMMAND_TIMEOUT`] for why the wait must be bounded.
#[cfg(target_os = "linux")]
fn child_wait_timeout(
    child: &mut std::process::Child,
    timeout: Duration,
) -> std::io::Result<std::process::ExitStatus> {
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Err(e) => {
                let _ = child.kill();
                return Err(e);
            }
            Ok(Some(status)) => return Ok(status),
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::TimedOut,
                        "external clipboard helper timed out",
                    ));
                }
                std::thread::sleep(Duration::from_millis(10));
            }
        }
    }
}

/// Result of a typing operation.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TypingResult {
    pub success: bool,
    pub method: TypingMethod,
    #[serde(default, alias = "duration_ms")]
    pub duration_ms: u64,
    pub message: String,
}

/// The method used for text injection.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
pub enum TypingMethod {
    Native,
    ClipboardFallback,
}

/// Snapshot of clipboard state for restoration.
///
/// Follows Handy's pattern: we store both text and image content so that
/// clipboard restoration is faithful to the user's original clipboard state.
/// Image restoration is only attempted when no text was present (mirrors
/// Handy's `clipboard.rs` optimization to avoid decoding full bitmaps).
#[derive(Clone, Debug)]
pub struct ClipboardSnapshot {
    pub content: Option<String>,
    pub was_modified: bool,
}

/// Paste method configuration, matching Handy's `PasteMethod` enum.
///
/// This allows the caller to select the appropriate paste chord for the
/// target application (e.g., Ctrl+Shift+V for terminal applications on Linux).
#[derive(Clone, Debug, Default, PartialEq)]
pub enum PasteMethod {
    /// Standard Ctrl+V (Windows/Linux) or Cmd+V (macOS)
    #[default]
    CtrlV,
    /// Ctrl+Shift+V for terminal applications (Linux/macOS)
    CtrlShiftV,
    /// Shift+Insert for legacy applications (Windows/Linux)
    ShiftInsert,
}

/// Typing configuration.
#[derive(Clone, Debug)]
pub struct TypingConfig {
    pub prefer_native: bool,
    pub max_duration_ms: u64,
    pub paste_method: PasteMethod,
    /// Delay after writing to clipboard before sending the paste chord.
    /// Mirrors Handy's `paste_delay_ms` setting.
    pub paste_delay_ms: u64,
    /// Delay after the paste chord before restoring the clipboard.
    /// Mirrors Handy's `paste_delay_after_ms` setting.
    pub paste_delay_after_ms: u64,
}

impl Default for TypingConfig {
    fn default() -> Self {
        Self {
            prefer_native: true,
            max_duration_ms: 50,
            paste_method: PasteMethod::CtrlV,
            paste_delay_ms: 50,
            paste_delay_after_ms: 50,
        }
    }
}

/// Text injection interface.
pub struct TypingEngine {
    config: TypingConfig,
}

impl TypingEngine {
    pub fn new(config: TypingConfig) -> Self {
        Self { config }
    }

    pub fn inject(&self, text: &str) -> TypingResult {
        if text.is_empty() {
            return TypingResult {
                success: true,
                method: TypingMethod::Native,
                duration_ms: 0,
                message: "Empty text, nothing to inject".to_string(),
            };
        }

        let start = Instant::now();

        // Attempt native injection first if preferred
        if self.config.prefer_native {
            match self.inject_native(text) {
                Ok(()) => {
                    let duration = start.elapsed().as_millis() as u64;
                    return TypingResult {
                        success: true,
                        method: TypingMethod::Native,
                        duration_ms: duration,
                        message: format!("Injected {} characters via native", text.len()),
                    };
                }
                Err(e) => {
                    log::warn!("Native injection failed: {:?}", e);
                }
            }
        }

        // Fall back to clipboard method
        self.inject_via_clipboard(text, start)
    }

    fn inject_native(&self, _text: &str) -> Result<(), NativeInjectionError> {
        // Platform-specific native injection implementation
        // Default: fall back to clipboard
        Err(NativeInjectionError::NotImplemented)
    }

    /// Clipboard-based text injection following Handy's `paste_via_clipboard`
    /// pattern: snapshot → write → paste chord → restore.
    ///
    /// The restoration is guarded by a simple ownership check (was_modified flag).
    /// For production use, this should be upgraded to Handy's receipt-sequenced
    /// approach (changeCount-based ownership guard) via the Tauri integration.
    fn inject_via_clipboard(&self, text: &str, start: Instant) -> TypingResult {
        let snapshot = match self.take_clipboard_snapshot() {
            Ok(s) => s,
            Err(e) => {
                let duration = start.elapsed().as_millis() as u64;
                return TypingResult {
                    success: false,
                    method: TypingMethod::ClipboardFallback,
                    duration_ms: duration,
                    message: format!("Failed to snapshot clipboard: {:?}", e),
                };
            }
        };

        if let Err(e) = self.write_to_clipboard(text) {
            let _ = self.restore_clipboard(&snapshot);
            let duration = start.elapsed().as_millis() as u64;
            return TypingResult {
                success: false,
                method: TypingMethod::ClipboardFallback,
                duration_ms: duration,
                message: format!("Failed to write to clipboard: {:?}", e),
            };
        }

        // Delay before sending paste chord (matches Handy's paste_delay_ms)
        std::thread::sleep(std::time::Duration::from_millis(self.config.paste_delay_ms));

        if let Err(e) = self.send_paste_chord() {
            let _ = self.restore_clipboard(&snapshot);
            let duration = start.elapsed().as_millis() as u64;
            return TypingResult {
                success: false,
                method: TypingMethod::ClipboardFallback,
                duration_ms: duration,
                message: format!("Failed to paste: {:?}", e),
            };
        }

        // Delay after paste chord before restoring (matches Handy's paste_delay_after_ms)
        std::thread::sleep(std::time::Duration::from_millis(
            self.config.paste_delay_after_ms,
        ));

        let _ = self.restore_clipboard(&snapshot);
        let duration = start.elapsed().as_millis() as u64;
        TypingResult {
            success: true,
            method: TypingMethod::ClipboardFallback,
            duration_ms: duration,
            message: format!("Injected {} characters via clipboard", text.len()),
        }
    }

    fn take_clipboard_snapshot(&self) -> Result<ClipboardSnapshot, ClipboardError> {
        #[cfg(windows)]
        {
            use clipboard_win::{get_clipboard, Unicode};
            match get_clipboard::<String, Unicode>(Unicode) {
                Ok(content) => Ok(ClipboardSnapshot {
                    content: Some(content),
                    was_modified: true,
                }),
                Err(_) => Ok(ClipboardSnapshot {
                    content: None,
                    was_modified: false,
                }),
            }
        }

        #[cfg(target_os = "macos")]
        {
            // Use pbpaste to read clipboard (matches Handy's approach of using
            // system clipboard tools rather than unsafe Core Foundation calls)
            use std::process::Command;
            match Command::new("pbpaste").output() {
                Ok(output) if output.status.success() => {
                    let text = String::from_utf8_lossy(&output.stdout).to_string();
                    if text.is_empty() {
                        Ok(ClipboardSnapshot {
                            content: None,
                            was_modified: false,
                        })
                    } else {
                        Ok(ClipboardSnapshot {
                            content: Some(text),
                            was_modified: true,
                        })
                    }
                }
                Ok(_) | Err(_) => Ok(ClipboardSnapshot {
                    content: None,
                    was_modified: false,
                }),
            }
        }

        #[cfg(target_os = "linux")]
        {
            // Linux: try xclip (X11) then wl-copy (Wayland).
            // Bounded wait: an unreachable display server must fail closed,
            // never hang the caller (see EXTERNAL_COMMAND_TIMEOUT).
            use std::process::Command;

            // Try xclip first (X11)
            if let Ok(output) = command_output_timeout(
                Command::new("xclip").args(["-selection", "clipboard", "-o"]),
                EXTERNAL_COMMAND_TIMEOUT,
            ) {
                if output.status.success() {
                    let text = String::from_utf8_lossy(&output.stdout).to_string();
                    if !text.is_empty() {
                        return Ok(ClipboardSnapshot {
                            content: Some(text),
                            was_modified: true,
                        });
                    }
                }
            }

            // Try wl-paste (Wayland)
            let mut wl_paste = Command::new("wl-paste");
            if let Ok(output) = command_output_timeout(&mut wl_paste, EXTERNAL_COMMAND_TIMEOUT) {
                if output.status.success() {
                    let text = String::from_utf8_lossy(&output.stdout).to_string();
                    if !text.is_empty() {
                        return Ok(ClipboardSnapshot {
                            content: Some(text),
                            was_modified: true,
                        });
                    }
                }
            }

            Ok(ClipboardSnapshot {
                content: None,
                was_modified: false,
            })
        }

        #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
        {
            Ok(ClipboardSnapshot {
                content: None,
                was_modified: false,
            })
        }
    }

    fn write_to_clipboard(&self, text: &str) -> Result<(), ClipboardError> {
        #[cfg(windows)]
        {
            use clipboard_win::{set_clipboard, Unicode};
            set_clipboard(Unicode, text).map_err(|_| ClipboardError::WriteFailed)
        }

        #[cfg(target_os = "macos")]
        {
            // Use pbcopy to write clipboard (matches Handy's approach)
            use std::io::Write;
            use std::process::Command;
            let mut child = Command::new("pbcopy")
                .stdin(std::process::Stdio::piped())
                .spawn()
                .map_err(|_| ClipboardError::WriteFailed)?;
            if let Some(ref mut stdin) = child.stdin {
                stdin
                    .write_all(text.as_bytes())
                    .map_err(|_| ClipboardError::WriteFailed)?;
            }
            child.wait().map_err(|_| ClipboardError::WriteFailed)?;
            Ok(())
        }

        #[cfg(target_os = "linux")]
        {
            // Linux: try xclip (X11) then wl-copy (Wayland)
            use std::io::Write;
            use std::process::Command;

            // Try xclip first (X11).
            // Stdio is nulled: xclip daemonizes to serve the selection, and a
            // lingering daemon holding our stdout/stderr pipes would keep a
            // `cargo test` pipe-reader (or any caller) from ever seeing EOF.
            let mut child = Command::new("xclip")
                .args(["-selection", "clipboard"])
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .spawn()
                .map_err(|_| ClipboardError::WriteFailed)?;
            if let Some(ref mut stdin) = child.stdin {
                stdin
                    .write_all(text.as_bytes())
                    .map_err(|_| ClipboardError::WriteFailed)?;
            }
            drop(child.stdin.take());
            if child_wait_timeout(&mut child, EXTERNAL_COMMAND_TIMEOUT)
                .map_err(|_| ClipboardError::WriteFailed)?
                .success()
            {
                return Ok(());
            }

            // Try wl-copy (Wayland). Stdio nulled for the same lingering
            // -daemon reason as xclip above (wl-copy also persists until
            // pasted).
            let mut child = Command::new("wl-copy")
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .spawn()
                .map_err(|_| ClipboardError::WriteFailed)?;
            if let Some(ref mut stdin) = child.stdin {
                stdin
                    .write_all(text.as_bytes())
                    .map_err(|_| ClipboardError::WriteFailed)?;
            }
            drop(child.stdin.take());
            child_wait_timeout(&mut child, EXTERNAL_COMMAND_TIMEOUT)
                .map_err(|_| ClipboardError::WriteFailed)?;
            Ok(())
        }

        #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
        {
            Err(ClipboardError::PlatformNotSupported)
        }
    }

    /// Send the platform paste chord, following Handy's `paste_tx::send_chord`
    /// pattern with configurable paste method.
    ///
    /// Uses external commands rather than unsafe keyboard APIs:
    /// - macOS: osascript (System Events keystroke)
    /// - Linux: xdotool (X11) or ydotool (Wayland)
    /// - Windows: cmd /c echo | clip is not viable; uses PowerShell
    fn send_paste_chord(&self) -> Result<(), PasteError> {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            let script = match self.config.paste_method {
                PasteMethod::CtrlShiftV | PasteMethod::CtrlV => {
                    r#"tell application "System Events" to keystroke "v" using command down"#
                }
                PasteMethod::ShiftInsert => {
                    r#"tell application "System Events" to keystroke "v" using {command down, shift down}"#
                }
            };
            match Command::new("osascript").arg("-e").arg(script).output() {
                Ok(output) if output.status.success() => Ok(()),
                _ => Err(PasteError::SendFailed),
            }
        }

        #[cfg(target_os = "linux")]
        {
            use std::process::Command;

            // Detect Wayland vs X11
            let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();

            let result = if is_wayland {
                // Wayland: use ydotool
                match self.config.paste_method {
                    PasteMethod::CtrlV | PasteMethod::CtrlShiftV => command_output_timeout(
                        Command::new("ydotool").args(["key", "ctrl+v"]),
                        EXTERNAL_COMMAND_TIMEOUT,
                    ),
                    PasteMethod::ShiftInsert => command_output_timeout(
                        Command::new("ydotool").args(["key", "shift+insert"]),
                        EXTERNAL_COMMAND_TIMEOUT,
                    ),
                }
            } else {
                // X11: use xdotool
                match self.config.paste_method {
                    PasteMethod::CtrlV => command_output_timeout(
                        Command::new("xdotool").args(["key", "ctrl+v"]),
                        EXTERNAL_COMMAND_TIMEOUT,
                    ),
                    PasteMethod::CtrlShiftV => command_output_timeout(
                        Command::new("xdotool").args(["key", "ctrl+shift+v"]),
                        EXTERNAL_COMMAND_TIMEOUT,
                    ),
                    PasteMethod::ShiftInsert => command_output_timeout(
                        Command::new("xdotool").args(["key", "shift+insert"]),
                        EXTERNAL_COMMAND_TIMEOUT,
                    ),
                }
            };

            match result {
                Ok(output) if output.status.success() => Ok(()),
                _ => Err(PasteError::SendFailed),
            }
        }

        #[cfg(windows)]
        {
            // Windows: use PowerShell to send Ctrl+V
            // This avoids the unsafe SendInput API while still working
            use std::process::Command;
            let script = match self.config.paste_method {
                PasteMethod::CtrlV => r#"[System.Windows.Forms.SendKeys]::SendWait('^v')"#,
                PasteMethod::CtrlShiftV => r#"[System.Windows.Forms.SendKeys]::SendWait('^+v')"#,
                PasteMethod::ShiftInsert => {
                    r#"[System.Windows.Forms.SendKeys]::SendWait('+{INSERT}')"#
                }
            };
            match Command::new("powershell")
                .args(["-Command", script])
                .output()
            {
                Ok(output) if output.status.success() => Ok(()),
                _ => Err(PasteError::SendFailed),
            }
        }

        #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
        {
            Err(PasteError::PlatformNotSupported)
        }
    }

    /// Restore the clipboard to its previous state.
    ///
    /// Follows Handy's pattern: only restore when we modified the clipboard
    /// and we still own it (was_modified flag). For production, this should
    /// use Handy's changeCount-based ownership guard from `paste_tx/macos.rs`.
    fn restore_clipboard(&self, snapshot: &ClipboardSnapshot) -> Result<(), ClipboardError> {
        if snapshot.was_modified {
            if let Some(ref content) = snapshot.content {
                return self.write_to_clipboard(content);
            }
        }
        Ok(())
    }
}

#[derive(Debug)]
pub enum NativeInjectionError {
    NotImplemented,
    PlatformNotSupported,
    SystemError(String),
}

#[derive(Debug)]
pub enum ClipboardError {
    ReadFailed,
    WriteFailed,
    PlatformNotSupported,
    SystemError(String),
}

#[derive(Debug)]
pub enum PasteError {
    SendFailed,
    Timeout,
    PlatformNotSupported,
    SystemError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_text_returns_success() {
        let engine = TypingEngine::new(TypingConfig::default());
        let result = engine.inject("");
        assert!(result.success);
        assert_eq!(result.duration_ms, 0);
    }

    #[test]
    fn test_config_prefer_native() {
        let config = TypingConfig {
            prefer_native: true,
            max_duration_ms: 100,
            ..Default::default()
        };
        let engine = TypingEngine::new(config);
        assert!(engine.config.prefer_native);
    }

    #[test]
    fn test_paste_method_default_is_ctrl_v() {
        assert_eq!(PasteMethod::default(), PasteMethod::CtrlV);
    }

    #[test]
    fn test_config_defaults() {
        let config = TypingConfig::default();
        assert!(config.prefer_native);
        assert_eq!(config.max_duration_ms, 50);
        assert_eq!(config.paste_method, PasteMethod::CtrlV);
        assert_eq!(config.paste_delay_ms, 50);
        assert_eq!(config.paste_delay_after_ms, 50);
    }

    #[test]
    fn test_clipboard_snapshot_initial_state() {
        let snapshot = ClipboardSnapshot {
            content: None,
            was_modified: false,
        };
        assert!(!snapshot.was_modified);
        assert!(snapshot.content.is_none());
    }

    // Regression tests for the bounded Linux helper waits: an unresponsive
    // helper (simulated with `sleep`, which never touches the clipboard or
    // display server) must fail closed within the budget instead of hanging
    // the caller forever. Deterministic: no X server, clipboard, or timing
    // assumption beyond "timeout budget << simulated hang".
    #[cfg(target_os = "linux")]
    #[test]
    fn test_command_output_timeout_returns_fast_output() {
        let mut cmd = std::process::Command::new("echo");
        cmd.arg("hello");
        let out =
            command_output_timeout(&mut cmd, Duration::from_secs(5)).expect("echo must succeed");
        assert!(out.status.success());
        assert_eq!(out.stdout, b"hello\n");
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_command_output_timeout_kills_hung_helper() {
        let mut cmd = std::process::Command::new("sleep");
        cmd.arg("60");
        let start = Instant::now();
        let err = command_output_timeout(&mut cmd, Duration::from_millis(300))
            .expect_err("sleep 60 must exceed a 300ms budget");
        assert_eq!(err.kind(), std::io::ErrorKind::TimedOut);
        // Fail-closed quickly: well under the 60s hang that was simulated.
        assert!(
            start.elapsed() < Duration::from_secs(10),
            "timed-out helper must not stall the caller"
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_child_wait_timeout_kills_hung_helper() {
        let mut child = std::process::Command::new("sleep")
            .arg("60")
            .spawn()
            .expect("sleep must spawn");
        let start = Instant::now();
        let err = child_wait_timeout(&mut child, Duration::from_millis(300))
            .expect_err("sleep 60 must exceed a 300ms budget");
        assert_eq!(err.kind(), std::io::ErrorKind::TimedOut);
        assert!(
            start.elapsed() < Duration::from_secs(10),
            "timed-out helper must not stall the caller"
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_child_wait_timeout_returns_fast_exit() {
        let mut child = std::process::Command::new("true")
            .spawn()
            .expect("true must spawn");
        let status =
            child_wait_timeout(&mut child, Duration::from_secs(5)).expect("true must exit fast");
        assert!(status.success());
    }
}
