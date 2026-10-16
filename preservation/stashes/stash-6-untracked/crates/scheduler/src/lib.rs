#![forbid(unsafe_code)]
//! STT scheduler and state management.
//!
//! Coordinates transcription sessions, result scheduling, and state transitions.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SchedulerError {
    #[error("Invalid state transition: {0}")]
    InvalidTransition(String),
    #[error("Session expired: {0}")]
    SessionExpired(String),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum TranscriptionState {
    Idle,
    Recording,
    Processing,
    Injecting,
    Error(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub state: TranscriptionState,
    pub started_at_ms: u64,
    pub last_activity_ms: u64,
}

impl Session {
    pub fn new(id: String) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        Self {
            id,
            state: TranscriptionState::Idle,
            started_at_ms: now,
            last_activity_ms: now,
        }
    }

    pub fn update_activity(&mut self) {
        self.last_activity_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
    }
}

pub struct SttScheduler {
    current_session: Option<Session>,
    max_idle_ms: u64,
}

impl Default for SttScheduler {
    fn default() -> Self {
        Self {
            current_session: None,
            max_idle_ms: 30000, // 30 second idle timeout
        }
    }
}

impl SttScheduler {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn start_session(&mut self, session_id: String) -> Result<Session, SchedulerError> {
        let session = Session::new(session_id);
        self.current_session = Some(session.clone());
        Ok(session)
    }

    pub fn end_session(&mut self) -> Option<Session> {
        self.current_session.take()
    }

    pub fn transition_state(&mut self, new_state: TranscriptionState) -> Result<(), SchedulerError> {
        if let Some(ref mut session) = self.current_session {
            session.state = new_state;
            session.update_activity();
            Ok(())
        } else {
            Err(SchedulerError::InvalidTransition("No active session".to_string()))
        }
    }

    pub fn check_timeout(&self) -> Result<(), SchedulerError> {
        if let Some(ref session) = self.current_session {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            
            if now - session.last_activity_ms > self.max_idle_ms {
                return Err(SchedulerError::SessionExpired(session.id.clone()));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_lifecycle() {
        let mut scheduler = SttScheduler::new();
        let session = scheduler.start_session("test_session".to_string()).unwrap();
        assert_eq!(session.state, TranscriptionState::Idle);
    }

    #[test]
    fn test_state_transition() {
        let mut scheduler = SttScheduler::new();
        scheduler.start_session("test".to_string()).unwrap();
        assert!(scheduler.transition_state(TranscriptionState::Recording).is_ok());
    }
}
