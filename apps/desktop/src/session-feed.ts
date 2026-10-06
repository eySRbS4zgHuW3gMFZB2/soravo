import {
  onSessionChanged,
  onTranscriptUpdate,
  type SessionPhase,
  type SessionSnapshot,
  type SessionTransition,
  type TranscriptUpdate,
} from "./ipc";
import type { PillState } from "./components/pill";

/**
 * R1-GAP-012 — pill/overlay subscription fold over the EXISTING typed
 * session/transcript event bus.
 *
 * Reused contracts (nothing reinvented, no second system):
 * - session lifecycle: `session://changed` / `SessionTransition`
 *   (`src-tauri/src/events.rs`, `src-tauri/src/session.rs`), subscribed via
 *   the existing `onSessionChanged` helper; initial hydration via the
 *   existing `session_snapshot` command.
 * - transcript semantics: `soravo-transcript::TranscriptUpdate` /
 *   `TranscriptKind::{Tentative,Committed,Final}` (`crates/transcript`),
 *   subscribed via `onTranscriptUpdate` (`ipc.ts`); ordering/staleness rules
 *   below mirror `TranscriptOrder::accept` / `TranscriptState::update` and
 *   `SessionMachine::is_current`.
 *
 * Rules enforced here (not in the component):
 * 1. Only `Committed`/`Final` updates may become final output (`committedText`).
 *    `Tentative` updates are stored as a provisional preview only and can
 *    never promote themselves to `committedText`.
 * 2. Stale/out-of-order session transitions (`sequence` not strictly
 *    increasing) are rejected — the backend sequence is authoritative.
 * 3. Transcript updates from a non-current session, or received while no
 *    session is active, are rejected.
 * 4. Duplicate/stale transcript updates (`sequence` not strictly increasing
 *    within the session) are rejected, so final output is never duplicated.
 * 5. A session-epoch change (including back to `IDLE`/`null`) clears both
 *    text buffers, so a late event from an earlier session can never update
 *    the current session's pill.
 *
 * All `apply*` functions are pure and return the SAME state reference when
 * the input is rejected, so callers (and tests) can distinguish
 * applied-vs-ignored without extra signalling.
 */

/** Pill-visible fold of the canonical session + transcript buses. */
export type SessionFeedState = {
  phase: SessionPhase;
  sessionId: number | null;
  /** Last accepted session-bus sequence. Backend monotonicity is authoritative. */
  sequence: number;
  initialized: boolean;
  /** Latest committed/final text of the current session. The ONLY final output. */
  committedText: string | null;
  /** Latest tentative preview of the current session. Never final output. */
  tentativeText: string | null;
  /** Last accepted transcript sequence within the current session. */
  transcriptSequence: number | null;
};

export function createSessionFeed(): SessionFeedState {
  return {
    phase: "IDLE",
    sessionId: null,
    sequence: 0,
    initialized: false,
    committedText: null,
    tentativeText: null,
    transcriptSequence: null,
  };
}

function applySessionRecord(
  state: SessionFeedState,
  record: { sessionId: number | null; sequence: number; phase: SessionFeedState["phase"] }
): SessionFeedState {
  if (state.initialized && record.sequence <= state.sequence) {
    return state;
  }
  const epochChanged = state.sessionId !== record.sessionId;
  return {
    phase: record.phase,
    sessionId: record.sessionId,
    sequence: record.sequence,
    initialized: true,
    committedText: epochChanged ? null : state.committedText,
    tentativeText: epochChanged ? null : state.tentativeText,
    transcriptSequence: epochChanged ? null : state.transcriptSequence,
  };
}

/** Fold a canonical session transition into the feed. Stale → same ref. */
export function applySessionTransition(
  state: SessionFeedState,
  transition: SessionTransition
): SessionFeedState {
  return applySessionRecord(state, transition);
}

/**
 * Fold an initial snapshot into the feed. A snapshot older than already-seen
 * live state must not rewind it (e.g. a slow `session_snapshot` resolving
 * after `session://changed` events arrived).
 */
export function applySessionSnapshot(
  state: SessionFeedState,
  snapshot: SessionSnapshot
): SessionFeedState {
  return applySessionRecord(state, snapshot);
}

/**
 * Fold a typed transcript update into the feed.
 * - wrong session / no active session → rejected (same ref);
 * - duplicate/stale sequence → rejected (same ref);
 * - `Tentative` → provisional preview only, never final output;
 * - `Committed`/`Final` → final output (replace-on-newer, never duplicated);
 *   `Final` additionally clears the provisional preview (mirrors
 *   `TranscriptState`, which clears pending tentative on finalization).
 */
export function applyTranscriptUpdate(
  state: SessionFeedState,
  update: TranscriptUpdate
): SessionFeedState {
  if (state.sessionId === null) {
    return state;
  }
  if (update.session_id !== state.sessionId) {
    return state;
  }
  if (state.transcriptSequence !== null && update.sequence <= state.transcriptSequence) {
    return state;
  }
  if (update.kind === "Tentative") {
    return {
      ...state,
      tentativeText: update.text,
      transcriptSequence: update.sequence,
    };
  }
  return {
    ...state,
    committedText: update.text,
    tentativeText: update.kind === "Final" ? null : state.tentativeText,
    transcriptSequence: update.sequence,
  };
}

/**
 * Canonical session phase → pill display state.
 * The pill has no warming state, so `STARTING` renders as `listening`
 * (microphone warming immediately before capture); the canonical phase is
 * still tracked verbatim in the feed. Every other phase maps 1:1, so the
 * pill now traverses the full canonical lifecycle instead of only
 * idle/listening.
 */
export function phaseToPillState(phase: SessionFeedState["phase"]): PillState {
  switch (phase) {
    case "IDLE":
      return "idle";
    case "STARTING":
    case "LISTENING":
      return "listening";
    case "TRANSCRIBING":
      return "transcribing";
    case "FINALIZING":
      return "finalizing";
    case "DONE":
      return "done";
    case "ERROR":
      return "error";
  }
}

/**
 * Subscribe once to each canonical bus and route events to the given
 * handlers. Exactly one `listen` per bus (no duplicate subscriptions);
 * resolves to a single combined unsubscribe for lifecycle cleanup.
 * Post-unmount guarding is the caller's job (disposed flag, as in `app.tsx`).
 */
export function subscribePillFeed(handlers: {
  onSession: (transition: SessionTransition) => void;
  onTranscript: (update: TranscriptUpdate) => void;
}): Promise<() => void> {
  return Promise.all([
    onSessionChanged((payload) => handlers.onSession(payload.transition)),
    onTranscriptUpdate((update) => handlers.onTranscript(update)),
  ]).then(([unSession, unTranscript]) => () => {
    unSession();
    unTranscript();
  });
}
