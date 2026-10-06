import { describe, expect, it } from "vitest";
import {
  applySessionTransition,
  createSessionFeed,
  type SessionFeedState,
} from "./session-feed";
import { describePillView } from "./pill-view";
import type { SessionTransition } from "./ipc";

function transition(
  sessionId: number | null,
  sequence: number,
  phase: SessionTransition["phase"],
): SessionTransition {
  return { sessionId, sequence, phase, timestampMs: 1000 + sequence };
}

function drive(feed: SessionFeedState, sessionId: number | null, seq: number, phase: SessionTransition["phase"]): SessionFeedState {
  return applySessionTransition(feed, transition(sessionId, seq, phase));
}

describe("pill-view idle", () => {
  it("idle shows start and no stop", () => {
    const feed = createSessionFeed();
    const view = describePillView(feed, "hold_to_talk", null);
    expect(view.state).toBe("idle");
    expect(view.label).toBe("Ready");
    expect(view.showStart).toBe(true);
    expect(view.showStop).toBe(false);
    expect(view.pulse).toBe(false);
    expect(view.errorText).toBeNull();
    expect(view.display.kind).toBe("none");
  });
});

describe("pill-view active phases afford stop", () => {
  it.each([["LISTENING", "listening", "Listening..."], ["TRANSCRIBING", "transcribing", "Transcribing..."], ["FINALIZING", "finalizing", "Finalizing..."]] as const)(
    "%s maps and affords stop",
    (phase, state, label) => {
      let feed = createSessionFeed();
      feed = drive(feed, 7, 1, "STARTING");
      feed = drive(feed, 7, 2, phase);
      for (const mode of ["hold_to_talk", "toggle_to_talk"] as const) {
        const view = describePillView(feed, mode, null);
        expect(view.state).toBe(state);
        expect(view.label).toBe(label);
        expect(view.showStop).toBe(true);
        expect(view.showStart).toBe(false);
        expect(view.color).toBe("#10b981");
      }
    },
  );

  it("listening and transcribing pulse, finalizing does not", () => {
    let feed = createSessionFeed();
    feed = drive(feed, 7, 1, "STARTING");
    const listening = drive(feed, 7, 2, "LISTENING");
    expect(describePillView(listening, "hold_to_talk", null).pulse).toBe(true);
    const transcribing = drive(listening, 7, 3, "TRANSCRIBING");
    expect(describePillView(transcribing, "hold_to_talk", null).pulse).toBe(true);
    const finalizing = drive(transcribing, 7, 4, "FINALIZING");
    expect(describePillView(finalizing, "hold_to_talk", null).pulse).toBe(false);
  });
});

describe("pill-view done and error", () => {
  it("done is stable with no stop and no start", () => {
    let feed = createSessionFeed();
    feed = drive(feed, 7, 1, "STARTING");
    feed = drive(feed, 7, 2, "LISTENING");
    feed = drive(feed, 7, 3, "TRANSCRIBING");
    feed = drive(feed, 7, 4, "FINALIZING");
    feed = drive(feed, 7, 5, "DONE");
    const view = describePillView(feed, "toggle_to_talk", null);
    expect(view.state).toBe("done");
    expect(view.label).toBe("Done");
    expect(view.showStop).toBe(false);
    expect(view.showStart).toBe(false);
    expect(view.pulse).toBe(false);
  });

  it("backend ERROR surfaces generic text when no local error", () => {
    let feed = createSessionFeed();
    feed = drive(feed, 7, 1, "STARTING");
    feed = drive(feed, 7, 2, "ERROR");
    const view = describePillView(feed, "hold_to_talk", null);
    expect(view.state).toBe("error");
    expect(view.errorText).toBe("Session error");
    expect(view.color).toBe("#ef4444");
  });

  it("backend ERROR preserves local error text", () => {
    let feed = createSessionFeed();
    feed = drive(feed, 7, 1, "STARTING");
    feed = drive(feed, 7, 2, "ERROR");
    const view = describePillView(feed, "hold_to_talk", "Failed to activate hotkey");
    expect(view.errorText).toBe("Failed to activate hotkey");
  });
});

describe("pill-view text display", () => {
  it("prefers committed over tentative", () => {
    const feed: SessionFeedState = {
      ...createSessionFeed(),
      phase: "LISTENING",
      sessionId: 7,
      sequence: 2,
      initialized: true,
      committedText: "hello",
      tentativeText: "hello wo",
      transcriptSequence: 2,
    };
    const view = describePillView(feed, "hold_to_talk", null);
    expect(view.display).toEqual({ kind: "committed", text: "hello" });
  });

  it("shows tentative preview when no committed text", () => {
    const feed: SessionFeedState = {
      ...createSessionFeed(),
      phase: "LISTENING",
      sessionId: 7,
      sequence: 2,
      initialized: true,
      committedText: null,
      tentativeText: "hel",
      transcriptSequence: 1,
    };
    const view = describePillView(feed, "hold_to_talk", null);
    expect(view.display).toEqual({ kind: "tentative", text: "hel" });
  });
});

describe("pill-view rapid ladder", () => {
  it("traverses STARTING to IDLE through all balance states", () => {
    let feed = createSessionFeed();
    const ladder: Array<{ phase: SessionTransition["phase"]; seq: number; sid: number | null; state: string }> = [
      { phase: "STARTING", seq: 1, sid: 7, state: "listening" },
      { phase: "LISTENING", seq: 2, sid: 7, state: "listening" },
      { phase: "TRANSCRIBING", seq: 3, sid: 7, state: "transcribing" },
      { phase: "FINALIZING", seq: 4, sid: 7, state: "finalizing" },
      { phase: "DONE", seq: 5, sid: 7, state: "done" },
      { phase: "IDLE", seq: 6, sid: null, state: "idle" },
    ];
    for (const { phase, seq, sid, state } of ladder) {
      feed = drive(feed, sid, seq, phase);
      expect(describePillView(feed, "hold_to_talk", null).state).toBe(state);
    }
  });
});
