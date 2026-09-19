#![forbid(unsafe_code)]
//! Soravo typing abstraction - native insertion with clipboard fallback.
//!
//! This crate handles text injection into the active application:
//! - Native insertion where the platform supports it reliably
//! - Clipboard/paste fallback that preserves/restores user clipboard
//! - Only committed/final text injection (never tentative)

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
#[derive(Clone, Debug)]
pub struct ClipboardSnapshot {
    pub content: Option<String>,
    pub was_modified: bool,
}

/// Typing configuration.
#[derive(Clone, Debug)]
pub struct TypingConfig {
    pub prefer_native: bool,
    pub max_duration_ms: u64,
}

impl Default for TypingConfig {
    fn default() -> Self {
        Self {
            prefer_native: true,
            max_duration_ms: 50,
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

        if let Err(e) = self.paste() {
            let _ = self.restore_clipboard(&snapshot);
            let duration = start.elapsed().as_millis() as u64;
            return TypingResult {
                success: false,
                method: TypingMethod::ClipboardFallback,
                duration_ms: duration,
                message: format!("Failed to paste: {:?}", e),
            };
        }

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
            use std::process::Command;
            match Command::new("pbcopy").output() {
                Ok(output) if output.status.success() => Ok(ClipboardSnapshot {
                    content: Some(String::from_utf8_lossy(&output.stdout).to_string()),
                    was_modified: true,
                }),
                Ok(_) | Err(_) => Ok(ClipboardSnapshot {
                    content: None,
                    was_modified: false,
                }),
            }
        }

        #[cfg(not(any(windows, target_os = "macos")))]
        {
            Ok(ClipboardSnapshot {
                content: None,
                was_modified: false,
            })
        }
    }

    fn write_to_clipboard(&self, _text: &str) -> Result<(), ClipboardError> {
        #[cfg(windows)]
        {
            use clipboard_win::set_clipboard;
            set_clipboard::<String>(text).map_err(|_| ClipboardError::WriteFailed)
        }

        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            Command::new("pbpaste")
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .spawn()
                .and_then(|mut child| {
                    use std::io::Write;
                    if let Some(ref mut stdin) = child.stdin {
                        stdin.write_all(text.as_bytes())?;
                    }
                    child.wait()
                })
                .map_err(|_| ClipboardError::WriteFailed)?;
            Ok(())
        }

        #[cfg(not(any(windows, target_os = "macos")))]
        {
            Err(ClipboardError::PlatformNotSupported)
        }
    }

    fn paste(&self) -> Result<(), PasteError> {
        #[cfg(windows)]
        {
            use windows::Win32::Foundation::BOOL;
            use windows::Win32::UI::Input::KeyboardAndMouse::{
                SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, VK_CONTROL, VK_V,
            };

            let ctrl_down = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_CONTROL,
                        wScan: 0,
                        dwFlags: 0,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };

            let v_down = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_V,
                        wScan: 0,
                        dwFlags: 0,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };

            let v_up = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_V,
                        wScan: 0,
                        dwFlags: 2,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };

            let ctrl_up = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_CONTROL,
                        wScan: 0,
                        dwFlags: 2,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };

            let inputs = [ctrl_down, v_down, v_up, ctrl_up];
            unsafe {
                if SendInput(&inputs, std::mem::size_of::<INPUT>() as i32).0 == 0 {
                    return Err(PasteError::SendFailed);
                }
            }

            std::thread::sleep(std::time::Duration::from_millis(50));
            Ok(())
        }

        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            let script = r#"
                tell application "System Events"
                    keystroke "v" using command down
                end tell
            "#;

            match Command::new("osascript").arg("-e").arg(script).output() {
                Ok(output) if output.status.success() => Ok(()),
                _ => Err(PasteError::SendFailed),
            }
        }

        #[cfg(not(any(windows, target_os = "macos")))]
        {
            Err(PasteError::PlatformNotSupported)
        }
    }

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
        };
        let engine = TypingEngine::new(config);
        assert!(engine.config.prefer_native);
    }
}
