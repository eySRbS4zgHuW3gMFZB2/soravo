import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_CHANGED_EVENT,
  TRANSCRIPT_UPDATE_EVENT,
  type SessionChangedPayload,
  type SessionTransition,
  type TranscriptUpdate,
  type TypingResult,
} from "./ipc";
import {
  applyInjectionSession,
  applyInjectionSnapshot,
  applyInjectionTranscript,
  createInjectionController,
  decideInjection,
  fireInjection,
  subscribeInjectionFeed,
  type InjectionController,
} from "./injection-feed";

const invoke = vi.hoisted(() => vi.fn());
const listen = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

/**
 * R1-GAP-015 — frontend `inject_text` wiring proof over the mocked IPC
 * boundary. Same mock conventions as `pill-subscription.test.ts` (hoisted
 * `invoke`/`listen`, real Tauri event-envelope unwrapping in `ipc.ts`).
 *
 * Canonical rule under test (mirrors `TranscriptState::update` + v6 §05):
 * tentative = UI only (never injected); committed/final = injectable exactly
 * once per `session_id:sequence` for the CURRENT active session.
 */

type Captured = { event: string; handler: (event: { payload: unknown }) => void };

let captured: Captured[];
let unlistens: Array<() => void>;

function okResult(): TypingResult {
  return { success: true, method: "Native", durationMs: 1, message: "ok" };
}

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
  invoke.mockImplementation((command: string) => {
    if (command === "inject_text") {
      return Promise.resolve(okResult());
    }
    return Promise.reject(new Error(`unexpected command ${command}`));
  });
});

/** Yield the event loop so fire-and-forget `fireInjection` promises settle. */
function flushInjections(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function emitSession(sessionId: number | null, sequence: number, phase: SessionTransition["phase"]): void {
  const entry = captured.find((c) => c.event === "session://changed");
  if (!entry) throw new Error("session bus subscription missing");
  const payload: SessionChangedPayload = {
    event: "session://changed",
    transition: { sessionId, sequence, phase, timestampMs: 1000 + sequence },
  };
  entry.handler({ payload });
}

function emitTranscript(update: TranscriptUpdate): void {
  const entry = captured.find((c) => c.event === "transcript://update");
  if (!entry) throw new Error("transcript bus subscription missing");
  entry.handler({ payload: update });
}

function update(session_id: number, sequence: number, kind: TranscriptUpdate["kind"], text: string): TranscriptUpdate {
  return { session_id, sequence, kind, text };
}

function injectCalls(): Array<{ text: string }> {
  return invoke.mock.calls
    .filter(([command]) => command === "inject_text")
    .map(([, args]) => args as { text: string });
}

describe("injection subscription wiring", () => {
  it("exposes the stable canonical event names and subscribes once per bus", async () => {
    expect(SESSION_CHANGED_EVENT).toBe("session://changed");
    expect(TRANSCRIPT_UPDATE_EVENT).toBe("transcript://update");
    const controller = createInjectionController();
    const unsubscribe = await subscribeInjectionFeed(controller);
    expect(listen).toHaveBeenCalledTimes(2);
    expect(listen).toHaveBeenNthCalledWith(1, "session://changed", expect.any(Function));
    expect(listen).toHaveBeenNthCalledWith(2, "transcript://update", expect.any(Function));
    expect(typeof unsubscribe).toBe("function");
  });
});

describe("A. FINAL injection", () => {
  it("invokes inject_text exactly once with the exact final text", async () => {
    const controller = createInjectionController();
    await subscribeInjectionFeed(controller);
    emitSession(7, 1, "STARTING");
    emitSession(7, 2, "LISTENING");
    emitTranscript(update(7, 1, "Final", "hello world"));
    await flushInjections();
    expect(invoke).toHaveBeenCalledWith("inject_text", { text: "hello world" });
    expect(injectCalls()).toHaveLength(1);
    expect(controller.injectedCount).toBe(1);
    expect(controller.lastError).toBeNull();
  });
});

describe("B. TENTATIVE never injected", () => {
  it("routes tentative to preview only and never calls inject_text", async () => {
    const controller = createInjectionController();
    await subscribeInjectionFeed(controller);
    emitSession(7, 1, "STARTING");
    emitSession(7, 2, "LISTENING");
    emitTranscript(update(7, 1, "Tentative", "hel"));
    emitTranscript(update(7, 2, "Tentative", "hell"));
    await flushInjections();
    expect(injectCalls()).toHaveLength(0);
    expect(controller.feed.tentativeText).toBe("hell");
    expect(controller.feed.committedText).toBeNull();
    expect(controller.injectedCount).toBe(0);
  });
});

describe("C. COMMITTED semantics", () => {
  it("injects accepted committed text exactly once (canonical: committed is stable/injectable)", async () => {
    const controller = createInjectionController();
    await subscribeInjectionFeed(controller);
    emitSession(7, 1, "STARTING");
    emitSession(7, 2, "LISTENING");
    emitTranscript(update(7, 1, "Committed", "hello"));
    await flushInjections();
    expect(injectCalls()).toEqual([{ text: "hello" }]);
    // Redelivery of the same logical committed update injects nothing more.
    emitTranscript(update(7, 1, "Committed", "hello"));
    await flushInjections();
    expect(injectCalls()).toHaveLength(1);
  });
});

describe("D. STALE SESSION", () => {
  it("rejects session A's final after session B is active", async () => {
    const controller = createInjectionController();
    await subscribeInjectionFeed(controller);
    emitSession(8, 7, "STARTING");
    emitSession(8, 8, "LISTENING");
    // Delayed result from retired session 7: must never inject.
    emitTranscript(update(7, 9, "Final", "late from A"));
    await flushInjections();
    expect(injectCalls()).toHaveLength(0);
    expect(controller.feed.sessionId).toBe(8);
    // Session B's own final injects normally.
    emitTranscript(update(8, 9, "Final", "bee"));
    await flushInjections();
    expect(injectCalls()).toEqual([{ text: "bee" }]);
  });

  it("rejects transcript while no session is active", () => {
    const controller = createInjectionController();
    const decision = applyInjectionTranscript(controller, update(7, 1, "Final", "orphan"));
    expect(decision).toBeNull();
    expect(controller.injected.size).toBe(0);
  });
});

describe("E. DUPLICATE FINAL", () => {
  it("injects the same logical final exactly once across redeliveries", async () => {
    const controller = createInjectionController();
    await subscribeInjectionFeed(controller);
    emitSession(7, 1, "STARTING");
    emitSession(7, 2, "LISTENING");
    const final = update(7, 2, "Final", "hello world");
    emitTranscript(final);
    emitTranscript(final);
    emitTranscript({ ...final });
    await flushInjections();
    expect(injectCalls()).toEqual([{ text: "hello world" }]);
  });
});

describe("F. ORDERING", () => {
  it("injects only at committed/final points, never partial tentative text", async () => {
    const controller = createInjectionController();
    await subscribeInjectionFeed(controller);
    emitSession(7, 1, "STARTING");
    emitSession(7, 2, "LISTENING");
    emitTranscript(update(7, 1, "Tentative", "hel"));
    emitTranscript(update(7, 2, "Committed", "hello"));
    emitTranscript(update(7, 3, "Final", "hello world"));
    await flushInjections();
    expect(injectCalls()).toEqual([{ text: "hello" }, { text: "hello world" }]);
    expect(injectCalls().some(({ text }) => text === "hel")).toBe(false);
  });

  it("rejects out-of-order transcript sequences", () => {
    const controller = createInjectionController();
    applyInjectionSession(controller, { sessionId: 7, sequence: 2, phase: "LISTENING", timestampMs: 1 });
    expect(applyInjectionTranscript(controller, update(7, 5, "Committed", "new"))).not.toBeNull();
    // Older sequence after a newer one: canonical fold rejects → no decision.
    expect(applyInjectionTranscript(controller, update(7, 3, "Committed", "stale"))).toBeNull();
  });
});

describe("G. CLEANUP", () => {
  it("removes every bus subscription and injects nothing post-unmount", async () => {
    const controller = createInjectionController();
    const unsubscribe = await subscribeInjectionFeed(controller);
    expect(unlistens).toHaveLength(2);
    unsubscribe();
    for (const unlisten of unlistens) {
      expect(unlisten).toHaveBeenCalledTimes(1);
    }
    // Post-unmount traffic (even through a stale captured handler) is inert.
    emitSession(7, 1, "LISTENING");
    emitTranscript(update(7, 1, "Final", "ghost"));
    await flushInjections();
    expect(injectCalls()).toHaveLength(0);
    expect(controller.feed.sessionId).toBeNull();
  });
});

describe("H. IPC FAILURE", () => {
  it("records a rejected invoke without false success and without retry", async () => {
    invoke.mockRejectedValueOnce(new Error("backend down"));
    const controller = createInjectionController();
    const failures: Array<{ reason: string }> = [];
    await subscribeInjectionFeed(controller, {
      onInjectionError: (failure) => {
        failures.push(failure);
      },
    });
    emitSession(7, 1, "LISTENING");
    emitTranscript(update(7, 1, "Final", "hello"));
    await flushInjections();
    expect(injectCalls()).toHaveLength(1);
    expect(controller.injectedCount).toBe(0);
    expect(controller.lastError?.reason).toBe("backend down");
    expect(failures).toHaveLength(1);
    // Session state preserved: still on session 7, feed intact.
    expect(controller.feed.sessionId).toBe(7);
    expect(controller.feed.committedText).toBe("hello");
    // Redelivery does not retry: the identity was consumed by the attempt.
    emitTranscript(update(7, 1, "Final", "hello"));
    await flushInjections();
    expect(injectCalls()).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });

  it("treats a success:false result as failure, never as success", async () => {
    invoke.mockImplementationOnce(() =>
      Promise.resolve({ success: false, method: "ClipboardFallback", durationMs: 2, message: "paste failed" })
    );
    const controller = createInjectionController();
    await subscribeInjectionFeed(controller);
    emitSession(7, 1, "LISTENING");
    emitTranscript(update(7, 1, "Final", "hello"));
    await flushInjections();
    expect(controller.injectedCount).toBe(0);
    expect(controller.lastError?.reason).toBe("paste failed");
  });
});

describe("I. REPLAY / REMOUNT", () => {
  it("re-subscribing the retained controller never double-injects", async () => {
    const controller = createInjectionController();
    const first = await subscribeInjectionFeed(controller);
    emitSession(7, 1, "LISTENING");
    emitTranscript(update(7, 2, "Final", "hello world"));
    await flushInjections();
    expect(injectCalls()).toHaveLength(1);
    first();

    // Component remount: same retained controller, fresh bus replay.
    const second = await subscribeInjectionFeed(controller);
    expect(listen).toHaveBeenCalledTimes(4);
    emitSession(7, 3, "LISTENING");
    emitTranscript(update(7, 2, "Final", "hello world"));
    await flushInjections();
    expect(injectCalls()).toHaveLength(1);
    second();
  });

  it("the identity key set alone rejects replays even when the fold accepts", () => {
    const controller = createInjectionController();
    applyInjectionSession(controller, { sessionId: 7, sequence: 2, phase: "LISTENING", timestampMs: 1 });
    const decision = applyInjectionTranscript(controller, update(7, 2, "Final", "hello"));
    expect(decision).not.toBeNull();
    const key = decision?.key ?? "";
    // Simulate a fold that accepts the replay (new ref, same session) while
    // the retained key memory already holds the identity: still no decision.
    const replayedFeed = { ...controller.feed };
    const replayed = decideInjection(
      controller.feed,
      replayedFeed,
      update(7, 2, "Final", "hello"),
      new Set([key])
    );
    expect(replayed).toBeNull();
  });
});

describe("J. END-TO-END CONTRACT REPLAY", () => {
  it("START → LISTENING → tentative → committed → final → DONE → IDLE injects committed+final once each", async () => {
    const controller: InjectionController = createInjectionController();
    const seen: string[] = [];
    const fire = async (kind: TranscriptUpdate["kind"], text: string, sequence: number) => {
      const decision = applyInjectionTranscript(controller, update(7, sequence, kind, text));
      if (decision === null) return;
      const result = await fireInjection(controller, decision, update(7, sequence, kind, text));
      if (result?.success) seen.push(decision.text);
    };

    applyInjectionSession(controller, { sessionId: 7, sequence: 1, phase: "STARTING", timestampMs: 1 });
    applyInjectionSession(controller, { sessionId: 7, sequence: 2, phase: "LISTENING", timestampMs: 2 });
    await fire("Tentative", "hel", 1);
    expect(seen).toEqual([]);
    applyInjectionSession(controller, { sessionId: 7, sequence: 3, phase: "TRANSCRIBING", timestampMs: 3 });
    await fire("Committed", "hello", 2);
    applyInjectionSession(controller, { sessionId: 7, sequence: 4, phase: "FINALIZING", timestampMs: 4 });
    await fire("Final", "hello world", 3);
    // Duplicate final redelivery: no second injection.
    await fire("Final", "hello world", 3);
    applyInjectionSession(controller, { sessionId: 7, sequence: 5, phase: "DONE", timestampMs: 5 });
    expect(controller.feed.committedText).toBe("hello world");
    applyInjectionSession(controller, { sessionId: null, sequence: 6, phase: "IDLE", timestampMs: 6 });

    expect(seen).toEqual(["hello", "hello world"]);
    expect(injectCalls().map(({ text }) => text)).toEqual(["hello", "hello world"]);
    expect(controller.feed.phase).toBe("IDLE");
    expect(controller.feed.sessionId).toBeNull();
    expect(controller.feed.committedText).toBeNull();
  });
});

describe("snapshot hydration", () => {
  it("hydrates mid-session mounts without rewinding live state", () => {
    const controller = createInjectionController();
    applyInjectionSnapshot(controller, { sessionId: 7, phase: "LISTENING", sequence: 2 });
    expect(controller.feed.sessionId).toBe(7);
    const decision = applyInjectionTranscript(controller, update(7, 3, "Final", "hello"));
    expect(decision).not.toBeNull();

    const live = createInjectionController();
    applyInjectionSession(live, { sessionId: 7, sequence: 9, phase: "FINALIZING", timestampMs: 1 });
    const before = live.feed;
    // A stale snapshot (older sequence) must not rewind live state.
    applyInjectionSnapshot(live, { sessionId: 7, phase: "LISTENING", sequence: 2 });
    expect(live.feed).toBe(before);
  });
});
