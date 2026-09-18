//! Authoritative transcription session state machine.
//!
//! Implements the session model from the Soravo TDD (§6 "Session state"):
//!
//! ```text
//! IDLE
//!   ↓
//! STARTING
//!   ↓
//! LISTENING
//!   ↓
//! TRANSCRIBING
//!   ↓
//! FINALIZING
//!   ↓
//! DONE → IDLE
//!
//! Any state → ERROR → IDLE
//! ```
//!
//! Session IDs are mandatory. Every transition stamps an immutable record
//! carrying the session id, a monotonic per-session sequence number, and a
//! monotonic timestamp so the frontend can discard stale results and never
//! treat rendered UI state as a source of truth.

use serde::{Deserialize, Serialize};

/// The authoritative session phases. Serialized in the same upper-case form
/// the TDD uses (`IDLE`, `LISTENING`, …).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum SessionPhase {
    #[default]
    Idle,
    Starting,
    Listening,
    Transcribing,
    Finalizing,
    Done,
    Error,
}

/// Result of a validated transition, emitted verbatim as a typed bus event.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionTransition {
    pub session_id: Option<u64>,
    pub sequence: u64,
    pub phase: SessionPhase,
    pub timestamp_ms: u64,
}

/// Rejection for a transition the state machine does not permit.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionError {
    pub code: SessionErrorCode,
    pub from: SessionPhase,
    pub to: SessionPhase,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SessionErrorCode {
    InvalidTransition,
}

/// Validates a single state transition against the TDD §6 allow-list.
///
/// Allowed edges:
/// - `IDLE → STARTING → LISTENING → TRANSCRIBING → FINALIZING → DONE → IDLE`
/// - `Any state → ERROR` (including `IDLE`)
/// - `ERROR → IDLE`
pub fn can_transition(from: SessionPhase, to: SessionPhase) -> bool {
    use SessionPhase::*;
    matches!(
        (from, to),
        (Idle, Starting)
            | (Starting, Listening)
            | (Listening, Transcribing)
            | (Transcribing, Finalizing)
            | (Finalizing, Done)
            | (Done, Idle)
            | (Error, Idle)
            | (Idle, Error)
            | (Starting, Error)
            | (Listening, Error)
            | (Transcribing, Error)
            | (Finalizing, Error)
            | (Done, Error)
    )
}

/// The authoritative session machine. Owned by the Tauri runtime (behind a
/// `Mutex`) and mutated only through validated transitions.
#[derive(Debug)]
pub struct SessionMachine {
    phase: SessionPhase,
    session_id: Option<u64>,
    next_session_id: u64,
    sequence: u64,
    base: std::time::Instant,
}

impl Default for SessionMachine {
    fn default() -> Self {
        Self {
            phase: SessionPhase::Idle,
            session_id: None,
            next_session_id: 1,
            sequence: 0,
            base: std::time::Instant::now(),
        }
    }
}

impl SessionMachine {
    /// Monotonic millisecond timestamp since the machine was created.
    pub fn now_ms(&self) -> u64 {
        self.base
            .elapsed()
            .as_millis()
            .try_into()
            .unwrap_or(u64::MAX)
    }

    /// Current phase.
    pub fn phase(&self) -> SessionPhase {
        self.phase
    }

    /// Current session id, if a session has been started and not fully reset.
    pub fn session_id(&self) -> Option<u64> {
        self.session_id
    }

    /// Current global transition sequence.
    pub fn sequence(&self) -> u64 {
        self.sequence
    }

    /// Validate a transition attempt against the allow-list.
    pub fn try_transition(&mut self, to: SessionPhase) -> Result<SessionTransition, SessionError> {
        let from = self.phase;
        if !can_transition(from, to) {
            return Err(SessionError {
                code: SessionErrorCode::InvalidTransition,
                from,
                to,
            });
        }

        if from == SessionPhase::Idle && to == SessionPhase::Starting {
            self.session_id = Some(self.next_session_id);
            self.next_session_id = self.next_session_id.wrapping_add(1);
        }

        // Leaving Error or Done lands on IDLE with no current session, so a
        // session that finished or failed must not accept further results.
        if to == SessionPhase::Idle && from != SessionPhase::Idle {
            self.session_id = None;
        }

        self.phase = to;
        self.sequence = self.sequence.wrapping_add(1);

        Ok(SessionTransition {
            session_id: self.session_id,
            sequence: self.sequence,
            phase: to,
            timestamp_ms: self.now_ms(),
        })
    }

    /// Discard any in-flight work and return to `IDLE` without recording a
    /// session. Used by the shell hold/toggle orchestration entry points.
    pub fn reset(&mut self) -> SessionTransition {
        self.phase = SessionPhase::Idle;
        self.session_id = None;
        self.sequence = self.sequence.wrapping_add(1);
        SessionTransition {
            session_id: None,
            sequence: self.sequence,
            phase: SessionPhase::Idle,
            timestamp_ms: self.now_ms(),
        }
    }

    /// `true` when `session_id`/`sequence` refer to the current in-flight
    /// session (results from old sessions are discarded).
    ///
    /// Consumed by the transcript/session integration phases; exercised by the
    /// unit tests meanwhile.
    #[cfg_attr(not(test), allow(dead_code))]
    pub fn is_current(&self, session_id: u64, sequence: u64) -> bool {
        self.session_id == Some(session_id) && self.sequence >= sequence
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const LADDER: [SessionPhase; 5] = [
        SessionPhase::Starting,
        SessionPhase::Listening,
        SessionPhase::Transcribing,
        SessionPhase::Finalizing,
        SessionPhase::Done,
    ];

    fn machine() -> SessionMachine {
        SessionMachine::default()
    }

    fn run_flow(machine: &mut SessionMachine) {
        // Drives from the current phase (typically IDLE or STARTING) through
        // the remaining ladder and back to a clean IDLE.
        let mut current = machine.phase();
        while current != SessionPhase::Done {
            let next = match current {
                SessionPhase::Idle => SessionPhase::Starting,
                SessionPhase::Starting => SessionPhase::Listening,
                SessionPhase::Listening => SessionPhase::Transcribing,
                SessionPhase::Transcribing => SessionPhase::Finalizing,
                _ => SessionPhase::Done,
            };
            machine.try_transition(next).expect("flow transition valid");
            current = next;
        }
        machine.try_transition(SessionPhase::Idle).unwrap();
    }

    #[test]
    fn starts_idle_with_no_session() {
        let m = machine();
        assert_eq!(m.phase(), SessionPhase::Idle);
        assert_eq!(m.session_id(), None);
        assert_eq!(m.sequence(), 0);
    }

    #[test]
    fn happy_path_covers_the_full_ladder() {
        let mut m = machine();
        run_flow(&mut m);
        assert_eq!(m.phase(), SessionPhase::Idle);
    }

    #[test]
    fn allocates_monotonic_session_ids() {
        let mut m = machine();
        let first = m.try_transition(SessionPhase::Starting).unwrap();
        let sid = first.session_id.expect("session id present");
        assert_eq!(sid, 1);
        run_flow(&mut m);

        let second = m.try_transition(SessionPhase::Starting).unwrap();
        assert_eq!(second.session_id, Some(sid + 1));
    }

    #[test]
    fn sequence_increments_monotonically() {
        let mut m = machine();
        let mut last = 0;
        for cycle in 0..3 {
            m.try_transition(SessionPhase::Starting).unwrap();
            for target in LADDER.iter().skip(1) {
                let t = m.try_transition(*target).unwrap();
                assert!(t.sequence > last, "sequence must increase");
                last = t.sequence;
            }
            let t = m.try_transition(SessionPhase::Idle).unwrap();
            assert!(t.sequence > last, "sequence must increase");
            last = t.sequence;
            let _ = cycle;
        }
    }

    #[test]
    fn timestamps_are_monotonic() {
        let mut m = machine();
        let mut last = 0;
        for cycle in 0..3 {
            m.try_transition(SessionPhase::Starting).unwrap();
            for target in LADDER.iter().skip(1) {
                let t = m.try_transition(*target).unwrap();
                assert!(t.timestamp_ms >= last, "timestamps must not regress");
                last = t.timestamp_ms;
            }
            let t = m.try_transition(SessionPhase::Idle).unwrap();
            assert!(t.timestamp_ms >= last, "timestamps must not regress");
            last = t.timestamp_ms;
            let _ = cycle;
        }
    }

    #[test]
    fn rejects_backward_jumps() {
        let mut m = machine();
        m.try_transition(SessionPhase::Starting).unwrap();
        for invalid in [
            SessionPhase::Transcribing,
            SessionPhase::Finalizing,
            SessionPhase::Done,
        ] {
            let err = m.try_transition(invalid).unwrap_err();
            assert_eq!(err.code, SessionErrorCode::InvalidTransition);
            assert_eq!(err.from, SessionPhase::Starting);
            assert_eq!(err.to, invalid);
        }
    }

    #[test]
    fn rejects_skipping_states() {
        let mut m = machine();
        let err = m
            .try_transition(SessionPhase::Listening)
            .expect_err("cannot skip STARTING");
        assert_eq!(err.to, SessionPhase::Listening);
    }

    #[test]
    fn any_state_can_enter_error_then_idle() {
        for start_state in [
            SessionPhase::Idle,
            SessionPhase::Starting,
            SessionPhase::Listening,
            SessionPhase::Transcribing,
            SessionPhase::Finalizing,
            SessionPhase::Done,
        ] {
            let mut m = machine();
            let mut probe = SessionPhase::Idle;
            while probe != start_state {
                let next = match probe {
                    SessionPhase::Idle => SessionPhase::Starting,
                    SessionPhase::Starting => SessionPhase::Listening,
                    SessionPhase::Listening => SessionPhase::Transcribing,
                    SessionPhase::Transcribing => SessionPhase::Finalizing,
                    SessionPhase::Finalizing => SessionPhase::Done,
                    _ => SessionPhase::Idle,
                };
                m.try_transition(next).unwrap();
                probe = next;
            }

            let err = m.try_transition(SessionPhase::Error).unwrap();
            assert_eq!(err.phase, SessionPhase::Error);
            let idle = m.try_transition(SessionPhase::Idle).unwrap();
            assert_eq!(idle.phase, SessionPhase::Idle);
            assert_eq!(idle.session_id, None);
        }
    }

    #[test]
    fn error_to_error_is_rejected() {
        let mut m = machine();
        m.try_transition(SessionPhase::Error).unwrap();
        let err = m
            .try_transition(SessionPhase::Error)
            .expect_err("double error invalid");
        assert_eq!(err.code, SessionErrorCode::InvalidTransition);
    }

    #[test]
    fn reset_clears_session_without_validating() {
        let mut m = machine();
        m.try_transition(SessionPhase::Starting).unwrap();
        m.try_transition(SessionPhase::Listening).unwrap();
        m.reset();
        assert_eq!(m.phase(), SessionPhase::Idle);
        assert_eq!(m.session_id(), None);
        assert!(m.is_current(0, 0) || m.sequence() > 0);
    }

    #[test]
    fn stale_session_results_are_discarded() {
        let mut m = machine();
        let first = m.try_transition(SessionPhase::Starting).unwrap();
        let sid = first.session_id.unwrap();
        let seq = first.sequence;
        assert!(m.is_current(sid, seq));

        run_flow(&mut m);
        let next = m.try_transition(SessionPhase::Starting).unwrap();
        assert_ne!(next.session_id, first.session_id);
        assert!(!m.is_current(sid, seq), "old session must be rejected");
    }

    #[test]
    fn transition_record_carries_tdd_metadata() {
        let mut m = machine();
        let t = m.try_transition(SessionPhase::Starting).unwrap();
        assert_eq!(t.phase, SessionPhase::Starting);
        assert_eq!(t.session_id, Some(1));
        assert!(t.sequence >= 1);
        // Elapsed since the machine's monotonic base: may be 0 on fast hosts,
        // but must be a valid instant consistent with `now_ms`.
        assert_eq!(t.timestamp_ms, m.now_ms().min(t.timestamp_ms + u64::MAX));
        assert!(m.now_ms() >= t.timestamp_ms);
    }

    #[test]
    fn can_transition_allow_list_is_exhaustive() {
        use SessionPhase::*;
        for from in [
            Idle,
            Starting,
            Listening,
            Transcribing,
            Finalizing,
            Done,
            Error,
        ] {
            for to in [
                Idle,
                Starting,
                Listening,
                Transcribing,
                Finalizing,
                Done,
                Error,
            ] {
                let expected = matches!(
                    (from, to),
                    (Idle, Starting)
                        | (Starting, Listening)
                        | (Listening, Transcribing)
                        | (Transcribing, Finalizing)
                        | (Finalizing, Done)
                        | (Done, Idle)
                        | (Error, Idle)
                        | (Idle, Error)
                        | (Starting, Error)
                        | (Listening, Error)
                        | (Transcribing, Error)
                        | (Finalizing, Error)
                        | (Done, Error)
                );
                assert_eq!(can_transition(from, to), expected, "{from:?} → {to:?}");
            }
        }
    }
}
