import { describe, expect, it } from "vitest";
import {
  applySessionTransition,
  applyTranscriptUpdate,
  createSessionFeed,
  phaseToPillState,
  type SessionFeedState,
} from "./session-feed";
import type { SessionTransition, TranscriptUpdate } from "./ipc";

/**
 * R1-GAP-005/006 — pill/overlay regression for the new session↔recording
 * coupling (consumer-side only; no pill rewrite).
 *
 * Replays the exact event script the Rust `SessionPipeline` integration tests
 * prove the coupling emits (mock audio → mock STT → transcript event →
 * canonical bus: STARTING → LISTENING → TRANSCRIBING → Tentative →
 * FINALIZING → Final → DONE → IDLE) through the R1-GAP-012 pure fold and
 * asserts the pill-visible outcome:
 * - tentative stays a preview (never final output);
 * - final becomes the committed output exactly once;
 * - completion clears the session without leaking text across epochs.
 */

function transition(
  sessionId: number | null,
  sequence: number,
  phase: SessionTransition["phase"]
): SessionTransition {
  return { sessionId, sequence, phase, timestampMs: 1000 + sequence };
}

function update(
  session_id: number,
  sequence: number,
  kind: TranscriptUpdate["kind"],
  text: string
): TranscriptUpdate {
  return { session_id, sequence, kind, text };
}

/** The pipeline's normal-session script for session 7 (bus order). */
function replayNormalSession(feed: SessionFeedState): SessionFeedState {
  let next = applySessionTransition(feed, transition(7, 1, "STARTING"));
  next = applySessionTransition(next, transition(7, 2, "LISTENING"));
  next = applySessionTransition(next, transition(7, 3, "TRANSCRIBING"));
  next = applyTranscriptUpdate(next, update(7, 1, "Tentative", "hel"));
  next = applySessionTransition(next, transition(7, 4, "FINALIZING"));
  next = applyTranscriptUpdate(next, update(7, 2, "Final", "hello world"));
  next = applySessionTransition(next, transition(7, 5, "DONE"));
  next = applySessionTransition(next, transition(null, 6, "IDLE"));
  return next;
}

describe("session↔recording pipeline traffic reaches the pill fold", () => {
  it("tentative is a preview only; final commits once; idle clears", () => {
    let feed = createSessionFeed();
    feed = applySessionTransition(feed, transition(7, 1, "STARTING"));
    feed = applySessionTransition(feed, transition(7, 2, "LISTENING"));
    expect(phaseToPillState(feed.phase)).toBe("listening");

    feed = applySessionTransition(feed, transition(7, 3, "TRANSCRIBING"));
    feed = applyTranscriptUpdate(feed, update(7, 1, "Tentative", "hel"));
    expect(feed.tentativeText).toBe("hel");
    expect(feed.committedText).toBeNull();

    feed = applySessionTransition(feed, transition(7, 4, "FINALIZING"));
    expect(phaseToPillState(feed.phase)).toBe("finalizing");
    feed = applyTranscriptUpdate(feed, update(7, 2, "Final", "hello world"));
    expect(feed.committedText).toBe("hello world");
    expect(feed.tentativeText).toBeNull();

    // Duplicate final redelivery is rejected: same reference, text unchanged.
    const before = feed;
    feed = applyTranscriptUpdate(feed, update(7, 2, "Final", "hello world"));
    expect(feed).toBe(before);

    feed = applySessionTransition(feed, transition(7, 5, "DONE"));
    expect(phaseToPillState(feed.phase)).toBe("done");
    expect(feed.committedText).toBe("hello world");

    feed = applySessionTransition(feed, transition(null, 6, "IDLE"));
    expect(feed.phase).toBe("IDLE");
    expect(feed.sessionId).toBeNull();
    expect(feed.committedText).toBeNull();
    expect(feed.tentativeText).toBeNull();
  });

  it("full replay helper matches the pipeline script end-state", () => {
    const feed = replayNormalSession(createSessionFeed());
    expect(feed.phase).toBe("IDLE");
    expect(feed.sessionId).toBeNull();
    expect(feed.committedText).toBeNull();
  });

  it("a stale session result cannot update the active session", () => {
    let feed = replayNormalSession(createSessionFeed());
    // Session 8 starts; session 7's delayed duplicate arrives late.
    feed = applySessionTransition(feed, transition(8, 7, "STARTING"));
    const before = feed;
    feed = applyTranscriptUpdate(feed, update(7, 3, "Committed", "stale from 7"));
    expect(feed).toBe(before);
    expect(feed.sessionId).toBe(8);
    expect(feed.committedText).toBeNull();
  });
});
