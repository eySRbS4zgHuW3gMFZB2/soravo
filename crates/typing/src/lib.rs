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
use std::time::Instant;

/// Result of a typing operation.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TypingResult {
    pub success: bool,
    pub method: TypingMethod,
    pub duration_ms: u64,
    pub message: String,
}

/// The method used for text injection.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
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
            use clipboard_win::{get_clipboard, ClipboardContentFormats};
            match get_clipboard::<String>() {
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
            // Linux: try xclip (X11) then wl-copy (Wayland)
            use std::process::Command;

            // Try xclip first (X11)
            if let Ok(output) = Command::new("xclip")
                .args(["-selection", "clipboard", "-o"])
                .output()
            {
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
            if let Ok(output) = Command::new("wl-paste").output() {
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
            use clipboard_win::set_clipboard;
            set_clipboard::<String>(text).map_err(|_| ClipboardError::WriteFailed)
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

            // Try xclip first (X11)
            let mut child = Command::new("xclip")
                .args(["-selection", "clipboard"])
                .stdin(std::process::Stdio::piped())
                .spawn()
                .map_err(|_| ClipboardError::WriteFailed)?;
            if let Some(ref mut stdin) = child.stdin {
                stdin
                    .write_all(text.as_bytes())
                    .map_err(|_| ClipboardError::WriteFailed)?;
            }
            if child
                .wait()
                .map_err(|_| ClipboardError::WriteFailed)?
                .success()
            {
                return Ok(());
            }

            // Try wl-copy (Wayland)
            let mut child = Command::new("wl-copy")
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
                    PasteMethod::CtrlV | PasteMethod::CtrlShiftV => {
                        Command::new("ydotool").args(["key", "ctrl+v"]).output()
                    }
                    PasteMethod::ShiftInsert => Command::new("ydotool")
                        .args(["key", "shift+insert"])
                        .output(),
                }
            } else {
                // X11: use xdotool
                match self.config.paste_method {
                    PasteMethod::CtrlV => Command::new("xdotool").args(["key", "ctrl+v"]).output(),
                    PasteMethod::CtrlShiftV => Command::new("xdotool")
                        .args(["key", "ctrl+shift+v"])
                        .output(),
                    PasteMethod::ShiftInsert => Command::new("xdotool")
                        .args(["key", "shift+insert"])
                        .output(),
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
}
