//! Audio device/query helpers for the desktop shell.
//!
//! The implementation lives in `soravo-audio`; this module re-exports the
//! exact surface the desktop commands and managers consume
//! (`crate::audio_toolkit::audio` paths) without a duplicate stack
//! (see 04_HANDY_FORK_AND_REUSE_POLICY).

pub use soravo_audio::audio::recorder::{is_microphone_access_denied, is_no_input_device_error};
pub use soravo_audio::audio::{
    list_input_devices, list_output_devices, AudioRecorder, CpalDeviceInfo,
};
