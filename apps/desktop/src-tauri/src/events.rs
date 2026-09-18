//! Typed event bus for the Soravo desktop shell.
//!
//! Events cross the IPC boundary with strongly-typed payloads. The frontend
//! mirrors these shapes in `src/ipc.ts`; the Rust side is the source of truth
//! (the TDD requires the frontend never be treated as the source of truth for
//! session state).

use serde::Serialize;

use crate::session::SessionTransition;

/// Event name for authoritative session state changes.
pub const SESSION_CHANGED_EVENT: &str = "session://changed";
/// Event name for the runtime ping round-trip demos.
pub const PING_EVENT: &str = "runtime://ping";

/// Payload broadcast whenever the session machine accepts a transition.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionChangedPayload<'a> {
    /// The event name this payload travels under.
    pub event: &'static str,
    /// Transition record: session id, monotonic sequence, phase, timestamp.
    pub transition: &'a SessionTransition,
}

impl<'a> SessionChangedPayload<'a> {
    pub const fn new(transition: &'a SessionTransition) -> Self {
        Self {
            event: SESSION_CHANGED_EVENT,
            transition,
        }
    }
}

/// Payload for the runtime ping round-trip.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingPayload {
    pub event: &'static str,
    pub sequence: u64,
    pub timestamp_ms: u64,
}

impl PingPayload {
    pub const fn new(sequence: u64, timestamp_ms: u64) -> Self {
        Self {
            event: PING_EVENT,
            sequence,
            timestamp_ms,
        }
    }
}
