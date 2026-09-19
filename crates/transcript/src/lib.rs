#![forbid(unsafe_code)]
//! Deterministic transcript ordering and stabilization primitives.
//! This crate never types text into applications.

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SessionId(u64);

impl SessionId {
    pub const fn new(value: u64) -> Self {
        Self(value)
    }

    pub fn from_timestamp_ms(ts: u64) -> Self {
        Self(ts)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum TranscriptKind {
    Tentative,
    Committed,
    Final,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct TranscriptUpdate {
    pub session_id: SessionId,
    pub sequence: u64,
    pub kind: TranscriptKind,
    pub text: String,
}

/// Rejects results that belong to a stale session or have already been processed.
#[derive(Debug)]
pub struct TranscriptOrder {
    session_id: SessionId,
    last_sequence: Option<u64>,
}

impl TranscriptOrder {
    pub const fn new(session_id: SessionId) -> Self {
        Self {
            session_id,
            last_sequence: None,
        }
    }

    pub fn accept(&mut self, update: &TranscriptUpdate) -> bool {
        if update.session_id != self.session_id
            || self
                .last_sequence
                .is_some_and(|last| update.sequence <= last)
        {
            return false;
        }
        self.last_sequence = Some(update.sequence);
        true
    }
}

/// Transcript state machine tracking tentative/committed/final text.
/// Prevents premature typing of tentative text and duplicate injection.
#[derive(Debug)]
pub struct TranscriptState {
    session_id: SessionId,
    last_committed_sequence: Option<u64>,
    last_finalized_sequence: Option<u64>,
    pending_tentative: Option<(u64, String)>,
}

impl TranscriptState {
    pub fn new(session_id: SessionId) -> Self {
        Self {
            session_id,
            last_committed_sequence: None,
            last_finalized_sequence: None,
            pending_tentative: None,
        }
    }

    /// Process a transcript update. Returns committed text if any.
    /// Never returns tentative text for injection.
    pub fn update(&mut self, update: TranscriptUpdate) -> Option<String> {
        if update.session_id != self.session_id {
            return None;
        }

        match update.kind {
            TranscriptKind::Tentative => {
                self.pending_tentative = Some((update.sequence, update.text));
                None
            }
            TranscriptKind::Committed => {
                if self
                    .last_committed_sequence
                    .is_some_and(|last| update.sequence <= last)
                {
                    return None;
                }
                self.last_committed_sequence = Some(update.sequence);
                Some(update.text)
            }
            TranscriptKind::Final => {
                if self
                    .last_finalized_sequence
                    .is_some_and(|last| update.sequence <= last)
                {
                    return None;
                }
                self.last_finalized_sequence = Some(update.sequence);
                // Clear pending tentative on finalization
                self.pending_tentative = None;
                Some(update.text)
            }
        }
    }

    pub fn pending_tentative_text(&self) -> Option<&str> {
        self.pending_tentative
            .as_ref()
            .map(|(_, text)| text.as_str())
    }

    pub fn session_id(&self) -> SessionId {
        self.session_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_update(
        session: u64,
        sequence: u64,
        kind: TranscriptKind,
        text: &str,
    ) -> TranscriptUpdate {
        TranscriptUpdate {
            session_id: SessionId::new(session),
            sequence,
            kind,
            text: text.to_string(),
        }
    }

    #[test]
    fn rejects_stale_session_and_duplicate_sequence() {
        let mut order = TranscriptOrder::new(SessionId::new(9));
        assert!(order.accept(&make_update(9, 1, TranscriptKind::Tentative, "")));
        assert!(!order.accept(&make_update(8, 2, TranscriptKind::Tentative, "")));
        assert!(!order.accept(&make_update(9, 1, TranscriptKind::Tentative, "")));
        assert!(order.accept(&make_update(9, 2, TranscriptKind::Tentative, "")));
    }

    #[test]
    fn transcript_state_maintains_session_isolation() {
        let mut state = TranscriptState::new(SessionId::new(42));
        assert!(
            state
                .update(make_update(42, 1, TranscriptKind::Committed, "hello"))
                .is_some()
        );
        assert!(
            state
                .update(make_update(99, 1, TranscriptKind::Committed, "world"))
                .is_none()
        );
    }

    #[test]
    fn transcript_state_prevents_duplicate_committed() {
        let mut state = TranscriptState::new(SessionId::new(1));
        assert!(
            state
                .update(make_update(1, 1, TranscriptKind::Committed, "hello"))
                .is_some()
        );
        assert!(
            state
                .update(make_update(1, 1, TranscriptKind::Committed, "duplicate"))
                .is_none()
        );
        assert!(
            state
                .update(make_update(1, 2, TranscriptKind::Committed, "world"))
                .is_some()
        );
    }

    #[test]
    fn transcript_state_prevents_tentative_injection() {
        let mut state = TranscriptState::new(SessionId::new(1));
        let result = state.update(make_update(
            1,
            1,
            TranscriptKind::Tentative,
            "tentative text",
        ));
        assert!(result.is_none(), "Tentative text must never be injected");
        assert_eq!(state.pending_tentative_text(), Some("tentative text"));
    }

    #[test]
    fn transcript_state_clears_tentative_on_finalization() {
        let mut state = TranscriptState::new(SessionId::new(1));
        state.update(make_update(1, 1, TranscriptKind::Tentative, "tentative"));
        assert!(state.pending_tentative_text().is_some());
        state.update(make_update(1, 2, TranscriptKind::Final, "final"));
        assert!(
            state.pending_tentative_text().is_none(),
            "Finalization must clear pending tentative"
        );
    }

    #[test]
    fn transcript_state_handles_stale_sequences() {
        let mut state = TranscriptState::new(SessionId::new(1));
        assert!(
            state
                .update(make_update(1, 10, TranscriptKind::Committed, "first"))
                .is_some()
        );
        assert!(
            state
                .update(make_update(1, 5, TranscriptKind::Committed, "stale"))
                .is_none()
        );
        assert!(
            state
                .update(make_update(1, 15, TranscriptKind::Committed, "second"))
                .is_some()
        );
    }
}
