#![forbid(unsafe_code)]
//! Deterministic transcript ordering primitives. This crate never types text.

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SessionId(u64);

impl SessionId {
    pub const fn new(value: u64) -> Self {
        Self(value)
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

#[cfg(test)]
mod tests {
    use super::*;
    fn update(session: u64, sequence: u64) -> TranscriptUpdate {
        TranscriptUpdate {
            session_id: SessionId::new(session),
            sequence,
            kind: TranscriptKind::Tentative,
            text: String::new(),
        }
    }
    #[test]
    fn rejects_stale_session_and_duplicate_sequence() {
        let mut order = TranscriptOrder::new(SessionId::new(9));
        assert!(order.accept(&update(9, 1)));
        assert!(!order.accept(&update(8, 2)));
        assert!(!order.accept(&update(9, 1)));
        assert!(order.accept(&update(9, 2)));
    }
}
