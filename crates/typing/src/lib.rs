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

/// Poll interval used while waiting for a helper process to exit.
#[cfg(target_os = "linux")]
const HELPER_POLL_INTERVAL: Duration = Duration::from_millis(10);

/// The single error every bounded-helper expiry maps to. Callers translate it
/// into their existing `ClipboardError` / `PasteError` variant, so the public
/// error taxonomy is unchanged by the timeout work.
#[cfg(target_os = "linux")]
fn helper_timed_out() -> std::io::Error {
    std::io::Error::new(
        std::io::ErrorKind::TimedOut,
        "external clipboard helper timed out",
    )
}

/// Drain `reader` to EOF on a worker thread, returning a receiver for the
/// bytes.
///
/// The read must not happen on the thread that waits for exit. A helper that
/// writes more than the kernel pipe buffer (64 KiB on Linux) blocks in
/// `write(2)` until someone drains it, so a parent that waits for exit
/// *before* reading deadlocks until the timeout and then discards a perfectly
/// good result. A helper that forked a daemon holding the pipe open produces
/// the mirror problem — a read that never sees EOF — so the caller bounds how
/// long it will wait for this thread as well.
#[cfg(target_os = "linux")]
fn spawn_drain<R: std::io::Read + Send + 'static>(
    mut reader: R,
) -> std::sync::mpsc::Receiver<std::io::Result<Vec<u8>>> {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut buf = Vec::new();
        let res = reader.read_to_end(&mut buf).map(|_| buf);
        let _ = tx.send(res);
    });
    rx
}

/// Wait at most `grace` for a [`spawn_drain`] worker to deliver the complete
/// pipe contents. A pipe still held open by a forked daemon is reported as a
/// timeout so the caller fails closed rather than accepting truncated output.
#[cfg(target_os = "linux")]
fn collect_drain(
    rx: std::sync::mpsc::Receiver<std::io::Result<Vec<u8>>>,
    grace: Duration,
) -> std::io::Result<Vec<u8>> {
    match rx.recv_timeout(grace) {
        Ok(res) => res,
        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => Err(helper_timed_out()),
        Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => Err(std::io::Error::other(
            "external clipboard helper output reader terminated unexpectedly",
        )),
    }
}

/// Run `cmd` to completion, killing and reaping it if it exceeds `timeout`.
///
/// Std-only replacement for an unbounded `Command::output()`. Both output pipes
/// are drained concurrently with the wait for exit, so neither a large
/// clipboard payload nor a helper that forked a daemon holding the pipe can
/// stall the caller past the budget. A spawn failure, a timeout, and an
/// incomplete pipe all surface as `Err`, which callers treat exactly like a
/// helper failure (fail closed, never hang).
#[cfg(target_os = "linux")]
fn command_output_timeout(
    cmd: &mut std::process::Command,
    timeout: Duration,
) -> std::io::Result<std::process::Output> {
    use std::process::Stdio;
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn()?;
    let stdout = child.stdout.take().map(spawn_drain);
    let stderr = child.stderr.take().map(spawn_drain);

    let status = child_wait_timeout(&mut child, timeout)?;
    let stdout = match stdout {
        Some(rx) => collect_drain(rx, timeout)?,
        None => Vec::new(),
    };
    let stderr = match stderr {
        Some(rx) => collect_drain(rx, timeout)?,
        None => Vec::new(),
    };
    Ok(std::process::Output {
        status,
        stdout,
        stderr,
    })
}

/// Wait for an already-spawned helper up to `timeout`, killing and reaping it
/// on expiry. See [`EXTERNAL_COMMAND_TIMEOUT`] for why the wait must be bounded.
#[cfg(target_os = "linux")]
fn child_wait_timeout(
    child: &mut std::process::Child,
    timeout: Duration,
) -> std::io::Result<std::process::ExitStatus> {
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Err(e) => {
                // Reap as well as kill: dropping a `Child` does not reap, so an
                // unreaped child would linger as a zombie for the life of the
                // process.
                let _ = child.kill();
                let _ = child.wait();
                return Err(e);
            }
            Ok(Some(status)) => return Ok(status),
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(helper_timed_out());
                }
                std::thread::sleep(HELPER_POLL_INTERVAL);
            }
        }
    }
}

/// Feed `data` to an already-spawned helper's stdin, then wait for it to exit
/// within `timeout`.
///
/// The write runs on its own thread and is bounded by the same budget. That
/// matters for the exact failure this crate is hardened against: `xclip`
/// connects to the X server *before* it reads stdin, so against a stale
/// `$DISPLAY` it never drains the pipe, and a payload larger than the 64 KiB
/// pipe buffer would block an unbounded `write_all` forever — reintroducing the
/// very hang the timeout exists to prevent.
#[cfg(target_os = "linux")]
fn child_write_timeout(
    child: &mut std::process::Child,
    data: &[u8],
    timeout: Duration,
) -> std::io::Result<std::process::ExitStatus> {
    use std::io::Write;

    let write = child.stdin.take().map(|mut stdin| {
        let payload = data.to_vec();
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let res = stdin.write_all(&payload);
            // Dropping `stdin` closes the write end so the helper sees EOF
            // before we start waiting on its exit.
            drop(stdin);
            let _ = tx.send(res);
        });
        rx
    });

    let status = child_wait_timeout(child, timeout);

    // The helper has now exited (or been killed), so the pipe it was reading
    // is closed and the writer must unblock. Bounded regardless: never block
    // the caller on a writer we no longer control.
    let write_err = write.and_then(|rx| match rx.recv_timeout(timeout) {
        Ok(Err(e)) => Some(e),
        _ => None,
    });

    match status {
        // A timeout is the more informative failure; the kill inside
        // `child_wait_timeout` is what releases the writer.
        Err(e) => Err(e),
        Ok(status) => match write_err {
            Some(e) => Err(e),
            None => Ok(status),
        },
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
            if child_write_timeout(&mut child, text.as_bytes(), EXTERNAL_COMMAND_TIMEOUT)
                .map_err(|_| ClipboardError::WriteFailed)?
                .success()
            {
                return Ok(());
            }

            // Try wl-copy (Wayland). Stdio nulled for the same lingering
            // -daemon reason as xclip above (wl-copy also persists until
            // pasted). Its exit status is checked: a non-zero exit means
            // nothing was placed on the clipboard, and reporting that as
            // success would silently drop the dictated text.
            let mut child = Command::new("wl-copy")
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .spawn()
                .map_err(|_| ClipboardError::WriteFailed)?;
            let status = child_write_timeout(&mut child, text.as_bytes(), EXTERNAL_COMMAND_TIMEOUT)
                .map_err(|_| ClipboardError::WriteFailed)?;
            if !status.success() {
                return Err(ClipboardError::WriteFailed);
            }
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

    // --- Coverage for the lifecycle edge cases the helper primitives own ---

    /// Output larger than the 64 KiB pipe buffer must be returned in full.
    ///
    /// A parent that waits for exit before draining the pipe deadlocks here:
    /// the child blocks in `write(2)` with a full buffer, so it never exits and
    /// the wait times out. This is the shape of `xclip -o` against a clipboard
    /// holding a large selection, and losing it would silently drop the user's
    /// clipboard snapshot (and so skip restoration).
    #[cfg(target_os = "linux")]
    #[test]
    fn test_command_output_timeout_drains_output_larger_than_pipe_buffer() {
        const PAYLOAD: usize = 1024 * 1024;
        let mut cmd = std::process::Command::new("sh");
        cmd.args(["-c", &format!("head -c {} /dev/zero", PAYLOAD)]);
        let start = Instant::now();
        let out = command_output_timeout(&mut cmd, Duration::from_secs(30))
            .expect("a large but finite payload must not deadlock the pipe");
        assert!(out.status.success());
        assert_eq!(
            out.stdout.len(),
            PAYLOAD,
            "every byte the helper wrote must reach the caller"
        );
        assert!(
            start.elapsed() < Duration::from_secs(20),
            "large payload must complete well inside the budget"
        );
    }

    /// A helper that exits promptly but leaves a grandchild holding the stdout
    /// pipe open must not stall the caller.
    ///
    /// `sh -c 'sleep 2 &'` exits at once while the backgrounded child inherits
    /// the pipe, so a plain `read_to_end` would not see EOF for two seconds.
    /// The bounded drain reports that as a timeout instead of returning
    /// truncated output as if it were complete. The sleep is short on purpose:
    /// this must fail an assertion, never hang the test binary.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_command_output_timeout_does_not_wait_on_inherited_pipe() {
        let mut cmd = std::process::Command::new("sh");
        cmd.args(["-c", "sleep 2 & exit 0"]);
        let start = Instant::now();
        let result = command_output_timeout(&mut cmd, Duration::from_millis(300));
        assert_eq!(
            result
                .expect_err("an inherited pipe must not be read to completion")
                .kind(),
            std::io::ErrorKind::TimedOut
        );
        assert!(
            start.elapsed() < Duration::from_secs(1),
            "must give up on the inherited pipe within the budget"
        );
    }

    /// A missing helper is a spawn failure, not a timeout, and must stay `Err`.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_command_output_timeout_propagates_spawn_failure() {
        let mut cmd = std::process::Command::new("soravo-typing-no-such-helper-9f2a");
        let err = command_output_timeout(&mut cmd, Duration::from_secs(5))
            .expect_err("a missing helper must not report success");
        assert_eq!(err.kind(), std::io::ErrorKind::NotFound);
    }

    /// A helper that exits non-zero is reported through the exit status, not as
    /// an `Err`: the caller decides what a non-zero status means.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_command_output_timeout_surfaces_nonzero_exit_status() {
        let mut cmd = std::process::Command::new("sh");
        cmd.args(["-c", "exit 3"]);
        let out = command_output_timeout(&mut cmd, Duration::from_secs(5))
            .expect("a non-zero exit is still an observed run, not an error");
        assert_eq!(out.status.code(), Some(3));
    }

    /// stderr is drained on the same budget as stdout.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_command_output_timeout_captures_stderr() {
        let mut cmd = std::process::Command::new("sh");
        cmd.args(["-c", "echo oops >&2"]);
        let out = command_output_timeout(&mut cmd, Duration::from_secs(5)).expect("must succeed");
        assert!(out.status.success());
        assert_eq!(out.stderr, b"oops\n");
    }

    /// The stdin write must be bounded too.
    ///
    /// This is the stale-`$DISPLAY` shape: the helper never reads stdin, so an
    /// unbounded `write_all` of a payload larger than the pipe buffer blocks
    /// forever. `sh -c 'sleep 30'` stands in for `xclip` blocked on the X
    /// connection.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_child_write_timeout_bounds_a_helper_that_never_reads_stdin() {
        let payload = vec![b'x'; 1024 * 1024];
        let mut child = std::process::Command::new("sh")
            .args(["-c", "sleep 30"])
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("helper must spawn");
        let start = Instant::now();
        let err = child_write_timeout(&mut child, &payload, Duration::from_millis(300))
            .expect_err("a helper that never drains stdin must not block the caller");
        assert_eq!(err.kind(), std::io::ErrorKind::TimedOut);
        assert!(
            start.elapsed() < Duration::from_secs(10),
            "the write and the wait must share one bounded budget"
        );
    }

    /// The successful write path: the helper consumes stdin, exits cleanly, and
    /// the exit status is handed back for the caller's fail-closed check.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_child_write_timeout_returns_status_for_a_cooperative_helper() {
        let mut child = std::process::Command::new("cat")
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("cat must spawn");
        let status = child_write_timeout(&mut child, b"dictated text", Duration::from_secs(10))
            .expect("a helper that drains stdin must succeed");
        assert!(
            status.success(),
            "the exit status must reach the caller so a non-zero exit cannot be mistaken for a successful clipboard write"
        );
    }

    /// A helper that exits non-zero after draining stdin still yields its
    /// status, which is what stops `wl-copy` from being reported as a
    /// successful clipboard write.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_child_write_timeout_surfaces_failing_helper_status() {
        let mut child = std::process::Command::new("sh")
            .args(["-c", "cat > /dev/null; exit 1"])
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("helper must spawn");
        let status =
            child_write_timeout(&mut child, b"text", Duration::from_secs(10)).expect("must report");
        assert!(!status.success());
    }

    /// A helper that dies without draining stdin yields a broken pipe, not a
    /// hang and not a success.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_child_write_timeout_reports_broken_pipe() {
        let payload = vec![b'x'; 1024 * 1024];
        let mut child = std::process::Command::new("sh")
            .args(["-c", "exit 0"])
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("helper must spawn");
        let err = child_write_timeout(&mut child, &payload, Duration::from_secs(10))
            .expect_err("a helper that exits without draining stdin cannot have stored the text");
        assert_eq!(err.kind(), std::io::ErrorKind::BrokenPipe);
    }

    /// A timed-out child must be reaped, not left as a zombie.
    #[cfg(target_os = "linux")]
    #[test]
    fn test_child_wait_timeout_reaps_the_killed_child() {
        let mut child = std::process::Command::new("sleep")
            .arg("30")
            .spawn()
            .expect("sleep must spawn");
        let pid = child.id();
        let err = child_wait_timeout(&mut child, Duration::from_millis(200))
            .expect_err("sleep 30 must exceed the budget");
        assert_eq!(err.kind(), std::io::ErrorKind::TimedOut);
        // `try_wait` after the timeout must report the already-reaped status,
        // which only holds if the zombie was collected.
        assert!(
            child.try_wait().expect("try_wait must not error").is_some(),
            "the killed child must be reaped, not left as a zombie (pid {pid})"
        );
    }
}
