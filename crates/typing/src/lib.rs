//! Text injection subsystem for Soravo (TYPE-001, native text insertion).
//!
//! Implements the platform abstraction for injecting dictated text into the
//! user's active application:
//!
//! - [`TextInserter`] — the platform abstraction implemented by every strategy.
//! - [`NativeInserter`] — native insertion via [`enigo`] on Windows, macOS, and
//!   Linux (X11).
//! - [`MockInserter`] — deterministic test double used by unit tests.
//! - [`Injector`] — the committed/final-only injection gate. It consumes
//!   [`TranscriptUpdate`]s and guarantees tentative text is never typed,
//!   stale/late/duplicate updates are ignored, and insertion failures are
//!   surfaced as typed outcomes instead of being silently dropped.
//!
//! # Privacy contract
//!
//! Dictated text SHALL never appear in logs, analytics, or error values
//! (FR-207). [`InjectionError`] deliberately carries no text payload, and its
//! [`Display`](std::fmt::Display) implementation never formats the injected
//! string.
//!
//! # Scope
//!
//! TYPE-001 covers native insertion only. The clipboard/paste fallback and
//! clipboard restoration are separate tasks (TYPE-002/TYPE-003); a fallback
//! inserter will implement the same [`TextInserter`] trait.
//!
//! Cross-kind content deduplication (a `Final` whose text repeats the last
//! committed span) is the responsibility of the transcript stabilization layer;
//! this crate guarantees a given `(kind, sequence)` is injected at most once.

#![forbid(unsafe_code)]

use std::error::Error;
use std::fmt;

use enigo::{Enigo, Keyboard, NewConError, Settings};
use serde::{Deserialize, Serialize};
use soravo_transcript::{SessionId, TranscriptKind, TranscriptUpdate};

/// Platform abstraction for injecting text into the active application.
///
/// Implementations MUST NOT embed dictated text in error values (FR-207).
pub trait TextInserter {
    /// Inject `text` into the currently focused application.
    ///
    /// Returns a text-free [`InjectionError`] when injection fails so the
    /// caller can surface the failure without leaking the dictated content.
    fn inject(&mut self, text: &str) -> Result<(), InjectionError>;

    /// Stable strategy name for diagnostics. Never includes injected text.
    fn name(&self) -> &'static str;
}

/// Stable, text-free failure class for native text insertion (FR-207).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "code", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InjectionError {
    /// Native insertion is unavailable on this platform or environment.
    Unavailable,
    /// Could not connect to the platform input system (for example, no X
    /// server on Linux, or a Wayland-only session with the X11 backend).
    ConnectionFailed,
    /// The operating system denied permission to simulate input (for example,
    /// missing macOS Accessibility permission).
    PermissionDenied,
    /// The text cannot be injected (for example, it contains NUL bytes).
    InvalidInput,
    /// The injection attempt failed while executing.
    ExecutionFailed,
}

impl fmt::Display for InjectionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::Unavailable => "native text insertion is unavailable",
            Self::ConnectionFailed => "could not connect to the platform input system",
            Self::PermissionDenied => "permission to simulate input was denied",
            Self::InvalidInput => "the text cannot be injected",
            Self::ExecutionFailed => "text injection failed while executing",
        };
        f.write_str(message)
    }
}

impl Error for InjectionError {}

/// Reason an update was intentionally not injected.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "reason", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SkipReason {
    /// Tentative text is never injected (FR-203).
    Tentative,
    /// The update carried no text to type.
    Empty,
    /// The update belongs to another or an older session.
    StaleSession,
    /// The update is stale, out-of-order, or late for its kind.
    StaleSequence,
    /// The exact `(kind, sequence)` was already injected.
    Duplicate,
}

/// Result of processing one transcript update at the injection boundary.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum InjectionOutcome {
    /// Text was delivered to the active application.
    Injected,
    /// The update was safely ignored without typing anything.
    Skipped { reason: SkipReason },
    /// Native insertion failed. Callers MUST surface this instead of silently
    /// dropping the dictated text (FR-205).
    Failed { error: InjectionError },
}

/// Committed/final-only injection gate over a [`TextInserter`].
///
/// Enforces, at the typing boundary, that tentative text is never typed and
/// that each `(kind, sequence)` update is injected at most once, in order.
/// Failures are returned as [`InjectionOutcome::Failed`] without advancing the
/// gate, so a failed update can be retried.
pub struct Injector<I: TextInserter> {
    session_id: SessionId,
    inserter: I,
    last_committed_sequence: Option<u64>,
    last_finalized_sequence: Option<u64>,
}

impl<I: TextInserter> Injector<I> {
    /// Bind an injector to a single transcription session.
    pub fn new(session_id: SessionId, inserter: I) -> Self {
        Self {
            session_id,
            inserter,
            last_committed_sequence: None,
            last_finalized_sequence: None,
        }
    }

    /// The session this injector is bound to.
    pub fn session_id(&self) -> SessionId {
        self.session_id
    }

    /// The underlying inserter strategy.
    pub fn inserter(&self) -> &I {
        &self.inserter
    }

    /// The underlying inserter strategy (mutable).
    pub fn inserter_mut(&mut self) -> &mut I {
        &mut self.inserter
    }

    /// Process one transcript update.
    ///
    /// Only `Committed` and `Final` updates are injected; `Tentative` updates
    /// are always skipped (FR-203). Returns the outcome so the caller can
    /// surface failures (FR-205).
    pub fn process(&mut self, update: TranscriptUpdate) -> InjectionOutcome {
        if update.kind == TranscriptKind::Tentative {
            return InjectionOutcome::Skipped {
                reason: SkipReason::Tentative,
            };
        }
        if update.session_id != self.session_id {
            return InjectionOutcome::Skipped {
                reason: SkipReason::StaleSession,
            };
        }
        if update.text.is_empty() {
            return InjectionOutcome::Skipped {
                reason: SkipReason::Empty,
            };
        }

        let counter = match update.kind {
            TranscriptKind::Committed => &mut self.last_committed_sequence,
            TranscriptKind::Final => &mut self.last_finalized_sequence,
            TranscriptKind::Tentative => unreachable!("filtered above"),
        };

        match *counter {
            Some(last) if update.sequence < last => {
                return InjectionOutcome::Skipped {
                    reason: SkipReason::StaleSequence,
                };
            }
            Some(last) if update.sequence == last => {
                return InjectionOutcome::Skipped {
                    reason: SkipReason::Duplicate,
                };
            }
            _ => {}
        }

        match self.inserter.inject(&update.text) {
            Ok(()) => {
                *counter = Some(update.sequence);
                InjectionOutcome::Injected
            }
            Err(error) => InjectionOutcome::Failed { error },
        }
    }
}

/// Native text insertion backed by [`enigo`].
///
/// Connects to the platform input system lazily on first injection so the
/// strategy can be constructed (and unit-tests of the pure error mapping can
/// run) without an active display session. On Linux the default X11 backend is
/// used; a Wayland-only session surfaces [`InjectionError::ConnectionFailed`],
/// which the fallback strategy (TYPE-002) will handle later.
pub struct NativeInserter {
    inner: Option<Enigo>,
}

impl NativeInserter {
    /// Construct a native inserter. No platform connection is opened yet.
    pub fn new() -> Self {
        Self { inner: None }
    }

    fn connect(&mut self) -> Result<&mut Enigo, InjectionError> {
        if self.inner.is_none() {
            self.inner = Some(Enigo::new(&Settings::default()).map_err(map_connect_error)?);
        }
        // The branch above just populated the field.
        Ok(self
            .inner
            .as_mut()
            .expect("native connection was just initialized"))
    }
}

impl Default for NativeInserter {
    fn default() -> Self {
        Self::new()
    }
}

impl TextInserter for NativeInserter {
    fn inject(&mut self, text: &str) -> Result<(), InjectionError> {
        self.connect()?
            .text(text)
            .map_err(|error| map_text_error(&error))
    }

    fn name(&self) -> &'static str {
        "native"
    }
}

fn map_connect_error(error: NewConError) -> InjectionError {
    match error {
        NewConError::NoPermission => InjectionError::PermissionDenied,
        NewConError::EstablishCon(_) | NewConError::Reply | NewConError::NoEmptyKeycodes => {
            InjectionError::ConnectionFailed
        }
    }
}

fn map_text_error(error: &enigo::InputError) -> InjectionError {
    match error {
        enigo::InputError::InvalidInput(_) => InjectionError::InvalidInput,
        enigo::InputError::Mapping(_)
        | enigo::InputError::Unmapping(_)
        | enigo::InputError::NoEmptyKeycodes
        | enigo::InputError::Simulate(_) => InjectionError::ExecutionFailed,
    }
}

/// Deterministic test double for [`TextInserter`].
#[derive(Default)]
pub struct MockInserter {
    injected: Vec<String>,
    inject_count: usize,
    fail_with: Option<InjectionError>,
}

impl MockInserter {
    /// A mock that records every successfully injected string.
    pub fn new() -> Self {
        Self::default()
    }

    /// A mock that fails every injection with `error`.
    pub fn failing(error: InjectionError) -> Self {
        Self {
            fail_with: Some(error),
            ..Self::default()
        }
    }

    /// Texts delivered so far, in injection order.
    pub fn injected(&self) -> &[String] {
        &self.injected
    }

    /// Total number of injection attempts (successes and failures).
    pub fn inject_count(&self) -> usize {
        self.inject_count
    }
}

impl TextInserter for MockInserter {
    fn inject(&mut self, text: &str) -> Result<(), InjectionError> {
        self.inject_count += 1;
        match self.fail_with {
            Some(error) => Err(error),
            None => {
                self.injected.push(text.to_owned());
                Ok(())
            }
        }
    }

    fn name(&self) -> &'static str {
        "mock"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn update(session: u64, sequence: u64, kind: TranscriptKind, text: &str) -> TranscriptUpdate {
        TranscriptUpdate {
            session_id: SessionId::new(session),
            sequence,
            kind,
            text: text.to_string(),
        }
    }

    fn committed(session: u64, sequence: u64, text: &str) -> TranscriptUpdate {
        update(session, sequence, TranscriptKind::Committed, text)
    }

    fn final_(session: u64, sequence: u64, text: &str) -> TranscriptUpdate {
        update(session, sequence, TranscriptKind::Final, text)
    }

    fn tentative(session: u64, sequence: u64, text: &str) -> TranscriptUpdate {
        update(session, sequence, TranscriptKind::Tentative, text)
    }

    #[test]
    fn tentative_never_injected() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        let outcome = injector.process(tentative(1, 1, "not yet final"));
        assert_eq!(
            outcome,
            InjectionOutcome::Skipped {
                reason: SkipReason::Tentative
            }
        );
        assert_eq!(injector.inserter().injected(), &[] as &[String]);
    }

    #[test]
    fn committed_injected_exactly_once() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(committed(1, 1, "hello")),
            InjectionOutcome::Injected
        );
        assert_eq!(injector.inserter().injected(), &["hello".to_string()]);
    }

    #[test]
    fn final_injected() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(final_(1, 1, "final text")),
            InjectionOutcome::Injected
        );
        assert_eq!(injector.inserter().injected(), &["final text".to_string()]);
    }

    #[test]
    fn duplicate_same_sequence_not_reinjected() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(committed(1, 1, "hello")),
            InjectionOutcome::Injected
        );
        let outcome = injector.process(committed(1, 1, "hello"));
        assert_eq!(
            outcome,
            InjectionOutcome::Skipped {
                reason: SkipReason::Duplicate
            }
        );
        assert_eq!(injector.inserter().inject_count(), 1);
    }

    #[test]
    fn stale_sequence_rejected() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(committed(1, 10, "first")),
            InjectionOutcome::Injected
        );
        let outcome = injector.process(committed(1, 5, "late"));
        assert_eq!(
            outcome,
            InjectionOutcome::Skipped {
                reason: SkipReason::StaleSequence
            }
        );
        assert_eq!(injector.inserter().injected(), &["first".to_string()]);
    }

    #[test]
    fn stale_session_rejected() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        let outcome = injector.process(committed(99, 1, "foreign"));
        assert_eq!(
            outcome,
            InjectionOutcome::Skipped {
                reason: SkipReason::StaleSession
            }
        );
        assert_eq!(injector.inserter().inject_count(), 0);
    }

    #[test]
    fn empty_text_skipped() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        let outcome = injector.process(committed(1, 1, ""));
        assert_eq!(
            outcome,
            InjectionOutcome::Skipped {
                reason: SkipReason::Empty
            }
        );
        assert_eq!(injector.inserter().inject_count(), 0);
    }

    #[test]
    fn committed_and_final_counters_are_independent() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(committed(1, 3, "a")),
            InjectionOutcome::Injected
        );
        assert_eq!(
            injector.process(final_(1, 2, "b")),
            InjectionOutcome::Injected
        );
        assert_eq!(
            injector.process(final_(1, 1, "c")),
            InjectionOutcome::Skipped {
                reason: SkipReason::StaleSequence
            }
        );
        assert_eq!(
            injector.inserter().injected(),
            &["a".to_string(), "b".to_string()]
        );
    }

    #[test]
    fn given_sequence_advances_across_kinds() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(committed(1, 1, "hi")),
            InjectionOutcome::Injected
        );
        assert_eq!(
            injector.process(tentative(1, 2, "hi")),
            InjectionOutcome::Skipped {
                reason: SkipReason::Tentative
            }
        );
        assert_eq!(
            injector.process(committed(1, 2, "hello")),
            InjectionOutcome::Injected
        );
        assert_eq!(
            injector.inserter().injected(),
            &["hi".to_string(), "hello".to_string()]
        );
    }

    #[test]
    fn failure_is_surfaced_and_gate_does_not_advance() {
        let mut injector = Injector::new(
            SessionId::new(1),
            MockInserter::failing(InjectionError::ExecutionFailed),
        );
        assert_eq!(
            injector.process(committed(1, 1, "precious")),
            InjectionOutcome::Failed {
                error: InjectionError::ExecutionFailed
            }
        );
        // Nothing was delivered on the failed attempt.
        assert_eq!(injector.inserter().injected(), &[] as &[String]);

        // A healthy inserter retrying the same update succeeds (gate did not advance).
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(committed(1, 1, "precious")),
            InjectionOutcome::Injected
        );
        assert_eq!(injector.inserter().injected(), &["precious".to_string()]);
    }

    #[test]
    fn failure_is_never_followed_by_duplicate_delivery() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(committed(1, 1, "x")),
            InjectionOutcome::Injected
        );
        assert_eq!(
            injector.process(committed(1, 1, "x")),
            InjectionOutcome::Skipped {
                reason: SkipReason::Duplicate
            }
        );
        assert_eq!(injector.inserter().inject_count(), 1);
    }

    #[test]
    fn injection_order_is_preserved() {
        let mut injector = Injector::new(SessionId::new(1), MockInserter::new());
        assert_eq!(
            injector.process(committed(1, 1, "one")),
            InjectionOutcome::Injected
        );
        assert_eq!(
            injector.process(committed(1, 2, "two")),
            InjectionOutcome::Injected
        );
        assert_eq!(
            injector.process(committed(1, 3, "three")),
            InjectionOutcome::Injected
        );
        assert_eq!(
            injector.inserter().injected(),
            &["one".to_string(), "two".to_string(), "three".to_string()]
        );
    }

    #[test]
    fn errors_are_text_free_and_serializable() {
        let error = InjectionError::ExecutionFailed;
        assert!(!error.to_string().contains("precious"));
        let json = serde_json::to_string(&error).expect("error serializes");
        assert!(!json.contains("precious"));
        let outcome_json = serde_json::to_string(&InjectionOutcome::Injected).expect("serializes");
        assert_eq!(outcome_json, r#"{"status":"injected"}"#);
    }

    #[test]
    fn mock_records_name_and_counts() {
        let mut mock = MockInserter::failing(InjectionError::Unavailable);
        assert_eq!(mock.name(), "mock");
        let _ = mock.inject("nope");
        assert_eq!(mock.inject_count(), 1);
        assert_eq!(mock.injected(), &[] as &[String]);
    }

    #[test]
    fn native_connect_error_mapping_covers_all_variants() {
        // Pure mapping; does not require a display connection.
        let permission = crate::map_connect_error(NewConError::NoPermission);
        assert_eq!(permission, InjectionError::PermissionDenied);
        for error in [
            NewConError::EstablishCon("display not found"),
            NewConError::Reply,
            NewConError::NoEmptyKeycodes,
        ] {
            assert_eq!(
                crate::map_connect_error(error),
                InjectionError::ConnectionFailed
            );
        }
    }

    #[test]
    fn native_text_error_mapping_covers_all_variants() {
        let invalid = enigo::InputError::InvalidInput("invalid input");
        assert_eq!(
            crate::map_text_error(&invalid),
            InjectionError::InvalidInput
        );
        for error in [
            enigo::InputError::Mapping("keysym".into()),
            enigo::InputError::Unmapping("keysym".into()),
            enigo::InputError::NoEmptyKeycodes,
            enigo::InputError::Simulate("protocol error"),
        ] {
            assert_eq!(
                crate::map_text_error(&error),
                InjectionError::ExecutionFailed
            );
        }
    }

    #[test]
    fn native_inserter_constructs_without_connection() {
        let inserter = NativeInserter::new();
        assert_eq!(inserter.name(), "native");
    }
}
