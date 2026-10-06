import { describe, expect, it } from "vitest";
import {
  applySessionSnapshot,
  applySessionTransition,
  applyTranscriptUpdate,
  createSessionFeed,
  phaseToPillState,
  type SessionFeedState,
} from "./session-feed";
import type { SessionTransition, TranscriptUpdate } from "./ipc";

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

/** Drive a feed through the canonical happy-path ladder for one session. */
function startSession(feed: SessionFeedState, sessionId: number): SessionFeedState {
  let next = applySessionTransition(feed, transition(sessionId, 1, "STARTING"));
  next = applySessionTransition(next, transition(sessionId, 2, "LISTENING"));
  return next;
}

describe("session subscription (A)", () => {
  it("starts idle with no session and no text", () => {
    const feed = createSessionFeed();
    expect(feed.phase).toBe("IDLE");
    expect(feed.sessionId).toBeNull();
    expect(feed.committedText).toBeNull();
    expect(feed.tentativeText).toBeNull();
  });

  it("receives canonical session state updates through the full lifecycle", () => {
    let feed = createSessionFeed();
    // Faithful to SessionMachine: DONE → IDLE clears the session id.
    const ladder: Array<{ phase: SessionTransition["phase"]; sequence: number; sessionId: number | null }> = [
      { phase: "STARTING", sequence: 1, sessionId: 7 },
      { phase: "LISTENING", sequence: 2, sessionId: 7 },
      { phase: "TRANSCRIBING", sequence: 3, sessionId: 7 },
      { phase: "FINALIZING", sequence: 4, sessionId: 7 },
      { phase: "DONE", sequence: 5, sessionId: 7 },
      { phase: "IDLE", sequence: 6, sessionId: null },
    ];
    for (const { phase, sequence, sessionId } of ladder) {
      const next = applySessionTransition(feed, transition(sessionId, sequence, phase));
      expect(next).not.toBe(feed);
      expect(next.phase).toBe(phase);
      feed = next;
    }
    expect(feed.sessionId).toBeNull();
    expect(feed.phase).toBe("IDLE");
  });

  it("rejects stale/out-of-order and duplicate session transitions", () => {
    const feed = startSession(createSessionFeed(), 7);
    const accepted = applySessionTransition(feed, transition(7, 3, "TRANSCRIBING"));
    expect(accepted.phase).toBe("TRANSCRIBING");

    // Older sequence: stale, ignored by reference.
    expect(applySessionTransition(accepted, transition(7, 2, "LISTENING"))).toBe(accepted);
    // Same sequence replayed: duplicate, ignored by reference.
    expect(applySessionTransition(accepted, transition(7, 3, "TRANSCRIBING"))).toBe(accepted);
  });

  it("clears the session on ERROR → IDLE without leaking text", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applyTranscriptUpdate(feed, update(7, 1, "Committed", "hello"));
    feed = applySessionTransition(feed, transition(7, 3, "ERROR"));
    expect(feed.phase).toBe("ERROR");
    feed = applySessionTransition(feed, transition(null, 4, "IDLE"));
    expect(feed.sessionId).toBeNull();
    expect(feed.committedText).toBeNull();
    expect(feed.tentativeText).toBeNull();
  });

  it("does not let a slow snapshot rewind newer live state", () => {
    const feed = startSession(createSessionFeed(), 7);
    const rewound = applySessionSnapshot(feed, {
      sessionId: 7,
      phase: "STARTING",
      sequence: 1,
    });
    expect(rewound).toBe(feed);
  });

  it("accepts a snapshot as initial hydration", () => {
    const feed = applySessionSnapshot(createSessionFeed(), {

      sessionId: 9,
      phase: "LISTENING",
      sequence: 4,
    });
    expect(feed.sessionId).toBe(9);
    expect(feed.phase).toBe("LISTENING");
  });
});

describe("committed transcript (B)", () => {
  it("updates final output on Committed", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applyTranscriptUpdate(feed, update(7, 1, "Committed", "hello"));
    expect(feed.committedText).toBe("hello");
  });

  it("updates final output on Final and clears the tentative preview", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applyTranscriptUpdate(feed, update(7, 1, "Tentative", "hel"));
    expect(feed.tentativeText).toBe("hel");
    feed = applyTranscriptUpdate(feed, update(7, 2, "Final", "hello"));
    expect(feed.committedText).toBe("hello");
    expect(feed.tentativeText).toBeNull();
  });

  it("advances final output on strictly newer Committed text", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applyTranscriptUpdate(feed, update(7, 1, "Committed", "hello"));
    feed = applyTranscriptUpdate(feed, update(7, 2, "Committed", "hello world"));
    expect(feed.committedText).toBe("hello world");
  });
});

describe("tentative transcript (C)", () => {
  it("never promotes tentative text to final output", () => {
    const feed = startSession(createSessionFeed(), 7);
    const next = applyTranscriptUpdate(feed, update(7, 1, "Tentative", "draft"));
    expect(next).not.toBe(feed);
    expect(next.tentativeText).toBe("draft");
    expect(next.committedText).toBeNull();
  });

  it("keeps tentative previews from overwriting committed output", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applyTranscriptUpdate(feed, update(7, 1, "Committed", "hello"));
    feed = applyTranscriptUpdate(feed, update(7, 2, "Tentative", "hello wo"));
    expect(feed.committedText).toBe("hello");
    expect(feed.tentativeText).toBe("hello wo");
  });
});

describe("stale session (D)", () => {
  it("ignores transcript from an old session", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applySessionTransition(feed, transition(7, 3, "DONE"));
    feed = applySessionTransition(feed, transition(null, 4, "IDLE"));
    feed = applySessionTransition(feed, transition(8, 5, "LISTENING"));
    const ignored = applyTranscriptUpdate(feed, update(7, 9, "Committed", "late old text"));
    expect(ignored).toBe(feed);
    expect(feed.committedText).toBeNull();
  });

  it("ignores transcript while no session is active", () => {
    const feed = createSessionFeed();
    expect(applyTranscriptUpdate(feed, update(7, 1, "Committed", "x"))).toBe(feed);
  });

  it("clears text buffers on session-epoch change", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applyTranscriptUpdate(feed, update(7, 1, "Committed", "hello"));
    feed = applyTranscriptUpdate(feed, update(7, 2, "Tentative", "wor"));
    feed = applySessionTransition(feed, transition(8, 3, "LISTENING"));
    expect(feed.committedText).toBeNull();
    expect(feed.tentativeText).toBeNull();
    // The new session starts its own transcript ordering from scratch.
    feed = applyTranscriptUpdate(feed, update(8, 1, "Committed", "new"));
    expect(feed.committedText).toBe("new");
  });
});

describe("duplicate/stale result (E)", () => {
  it("does not duplicate final output on replayed updates", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applyTranscriptUpdate(feed, update(7, 1, "Final", "hello"));
    const replayed = applyTranscriptUpdate(feed, update(7, 1, "Final", "hello"));
    expect(replayed).toBe(feed);
    expect(feed.committedText).toBe("hello");
  });

  it("rejects older sequences after newer text was accepted", () => {
    let feed = startSession(createSessionFeed(), 7);
    feed = applyTranscriptUpdate(feed, update(7, 10, "Committed", "newer"));
    const stale = applyTranscriptUpdate(feed, update(7, 5, "Committed", "older"));
    expect(stale).toBe(feed);
    expect(feed.committedText).toBe("newer");
  });
});

describe("canonical phase mapping", () => {
  it("covers the full canonical lifecycle", () => {
    expect(phaseToPillState("IDLE")).toBe("idle");
    expect(phaseToPillState("STARTING")).toBe("listening");
    expect(phaseToPillState("LISTENING")).toBe("listening");
    expect(phaseToPillState("TRANSCRIBING")).toBe("transcribing");
    expect(phaseToPillState("FINALIZING")).toBe("finalizing");
    expect(phaseToPillState("DONE")).toBe("done");
    expect(phaseToPillState("ERROR")).toBe("error");
  });
});
