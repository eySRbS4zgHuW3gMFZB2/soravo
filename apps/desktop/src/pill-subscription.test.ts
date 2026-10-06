import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_CHANGED_EVENT,
  TRANSCRIPT_UPDATE_EVENT,
  onTranscriptUpdate,
  type SessionChangedPayload,
  type TranscriptUpdate,
} from "./ipc";
import {
  applySessionTransition,
  applyTranscriptUpdate,
  createSessionFeed,
  subscribePillFeed,
  type SessionFeedState,
} from "./session-feed";

const invoke = vi.hoisted(() => vi.fn());
const listen = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

/**
 * Captured `listen` callbacks. Tauri invokes these with the full event
 * envelope (`{ payload, ... }`) — the mock reproduces that envelope in
 * `emitSession` / `emitTranscript` below so the routing under test is the
 * real `onSessionChanged` / `onTranscriptUpdate` unwrapping in `ipc.ts`.
 */
type Captured = { event: string; handler: (event: { payload: unknown }) => void };

let captured: Captured[];
let unlistens: Array<() => void>;

beforeEach(() => {
  invoke.mockReset();
  listen.mockReset();
  captured = [];
  unlistens = [];
  listen.mockImplementation((event: string, handler: (event: { payload: unknown }) => void) => {
    captured.push({ event, handler });
    const unlisten = vi.fn();
    unlistens.push(unlisten);
    return Promise.resolve(unlisten);
  });
});

function emitSession(payload: SessionChangedPayload): void {
  const entry = captured.find((c) => c.event === "session://changed");
  if (!entry) throw new Error("session bus subscription missing");
  entry.handler({ payload });
}

function emitTranscript(update: TranscriptUpdate): void {
  const entry = captured.find((c) => c.event === "transcript://update");
  if (!entry) throw new Error("transcript bus subscription missing");
  entry.handler({ payload: update });
}

function sessionPayload(
  sessionId: number | null,
  sequence: number,
  phase: SessionChangedPayload["transition"]["phase"]
): SessionChangedPayload {
  return { event: "session://changed", transition: { sessionId, sequence, phase, timestampMs: 1 } };
}

function transcript(sequence: number, kind: TranscriptUpdate["kind"], text: string): TranscriptUpdate {
  return { session_id: 7, sequence, kind, text };
}

describe("pill subscription through the mocked IPC boundary (G)", () => {
  it("exposes the stable canonical event names", () => {
    expect(SESSION_CHANGED_EVENT).toBe("session://changed");
    expect(TRANSCRIPT_UPDATE_EVENT).toBe("transcript://update");
  });

  it("subscribes exactly once to each canonical bus", async () => {
    const unsubscribe = await subscribePillFeed({ onSession: () => undefined, onTranscript: () => undefined });
    expect(listen).toHaveBeenCalledTimes(2);
    expect(listen).toHaveBeenNthCalledWith(1, "session://changed", expect.any(Function));
    expect(listen).toHaveBeenNthCalledWith(2, "transcript://update", expect.any(Function));
    expect(typeof unsubscribe).toBe("function");
  });

  it("routes canonical session payloads into the feed", async () => {
    let feed: SessionFeedState = createSessionFeed();
    await subscribePillFeed({
      onSession: (t) => {
        feed = applySessionTransition(feed, t);
      },
      onTranscript: () => undefined,
    });
    emitSession(sessionPayload(7, 1, "STARTING"));
    emitSession(sessionPayload(7, 2, "LISTENING"));
    expect(feed.phase).toBe("LISTENING");
    expect(feed.sessionId).toBe(7);
  });

  it("routes transcript payloads: committed becomes final, tentative stays provisional", async () => {
    let feed: SessionFeedState = createSessionFeed();
    await subscribePillFeed({
      onSession: (t) => {
        feed = applySessionTransition(feed, t);
      },
      onTranscript: (u) => {
        feed = applyTranscriptUpdate(feed, u);
      },
    });
    emitSession(sessionPayload(7, 1, "LISTENING"));

    emitTranscript(transcript(1, "Tentative", "hel"));
    expect(feed.tentativeText).toBe("hel");
    expect(feed.committedText).toBeNull();

    emitTranscript(transcript(2, "Committed", "hello"));
    expect(feed.committedText).toBe("hello");
  });

  it("drops stale-session transcript arriving over the mocked bus", async () => {
    let feed: SessionFeedState = createSessionFeed();
    await subscribePillFeed({
      onSession: (t) => {
        feed = applySessionTransition(feed, t);
      },
      onTranscript: (u) => {
        feed = applyTranscriptUpdate(feed, u);
      },
    });
    emitSession(sessionPayload(8, 5, "LISTENING"));

    // Belongs to retired session 7: must not touch session 8's pill.
    emitTranscript(transcript(9, "Committed", "late"));
    expect(feed.committedText).toBeNull();
  });

  it("subscribes to transcript updates under the stable event name", async () => {
    const handler = vi.fn();
    await onTranscriptUpdate(handler);
    expect(listen).toHaveBeenCalledWith("transcript://update", expect.any(Function));
  });
});

describe("subscription cleanup (F)", () => {
  it("removes every bus subscription through the single combined unsubscribe", async () => {
    const unsubscribe = await subscribePillFeed({ onSession: () => undefined, onTranscript: () => undefined });
    expect(unlistens).toHaveLength(2);
    unsubscribe();
    for (const unlisten of unlistens) {
      expect(unlisten).toHaveBeenCalledTimes(1);
    }
  });
});
