import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HIDE_OVERLAY_EVENT,
  SHOW_OVERLAY_EVENT,
  onHideOverlay,
  onShowOverlay,
  type OverlaySignal,
} from "../ipc";
import {
  applyOverlayHide,
  applyOverlayShow,
  createOverlayVisibility,
  type OverlayVisibility,
} from "./overlay-visibility";
import {
  applySessionTransition,
  applyTranscriptUpdate,
  createSessionFeed,
  subscribePillFeed,
  type SessionFeedState,
} from "../session-feed";
import type { SessionChangedPayload, TranscriptUpdate } from "../ipc";

const listen = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

type Captured = { event: string; handler: (event: { payload: unknown }) => void };

let captured: Captured[];

beforeEach(() => {
  listen.mockReset();
  captured = [];
  listen.mockImplementation((event: string, handler: (event: { payload: unknown }) => void) => {
    captured.push({ event, handler });
    return Promise.resolve(vi.fn());
  });
});

function emit(event: string, payload: unknown): void {
  const entry = captured.find((c) => c.event === event);
  if (!entry) throw new Error(`overlay bus subscription missing: ${event}`);
  entry.handler({ payload });
}

/**
 * The overlay wires the SAME canonical buses as the inline pill (one fold,
 * two surfaces) plus the two window-scoped native visibility signals. This
 * locks the contract: visibility from `overlay.rs` signals, content from the
 * canonical session/transcript buses, no second state machine.
 */
describe("overlay subscription wiring (R1 floating pill)", () => {
  it("exposes the stable native overlay event names", () => {
    expect(SHOW_OVERLAY_EVENT).toBe("show-overlay");
    expect(HIDE_OVERLAY_EVENT).toBe("hide-overlay");
  });

  it("subscribes to both native signals and both canonical buses", async () => {
    await subscribePillFeed({ onSession: () => undefined, onTranscript: () => undefined });
    await onShowOverlay(() => undefined);
    await onHideOverlay(() => undefined);
    const events = captured.map((c) => c.event);
    expect(events).toContain("session://changed");
    expect(events).toContain("transcript://update");
    expect(events).toContain("show-overlay");
    expect(events).toContain("hide-overlay");
  });

  it("routes show/hide signals into visibility and session/transcript into the shared fold", async () => {
    let visibility: OverlayVisibility = createOverlayVisibility();
    let feed: SessionFeedState = createSessionFeed();
    await subscribePillFeed({
      onSession: (t) => {
        feed = applySessionTransition(feed, t);
      },
      onTranscript: (u) => {
        feed = applyTranscriptUpdate(feed, u);
      },
    });
    await onShowOverlay((signal: OverlaySignal) => {
      visibility = applyOverlayShow(visibility, signal);
    });
    await onHideOverlay(() => {
      visibility = applyOverlayHide(visibility);
    });

    // Native show → visible compact; canonical session → listening content.
    emit("show-overlay", "recording");
    expect(visibility).toEqual({ visible: true, format: "compact" });
    emit("session://changed", {
      event: "session://changed",
      transition: { sessionId: 7, sequence: 1, phase: "LISTENING", timestampMs: 1 },
    } satisfies SessionChangedPayload);
    expect(feed.phase).toBe("LISTENING");

    // Canonical transcript → preview + final through the shared fold.
    emit("transcript://update", {
      session_id: 7,
      sequence: 1,
      kind: "Tentative",
      text: "hel",
    } satisfies TranscriptUpdate);
    expect(feed.tentativeText).toBe("hel");
    expect(feed.committedText).toBeNull();
    emit("transcript://update", {
      session_id: 7,
      sequence: 2,
      kind: "Final",
      text: "hello",
    } satisfies TranscriptUpdate);
    expect(feed.committedText).toBe("hello");

    // Streaming show → expanded; native hide → hidden with content retained.
    emit("show-overlay", "streaming");
    expect(visibility).toEqual({ visible: true, format: "expanded" });
    emit("hide-overlay", undefined);
    expect(visibility).toEqual({ visible: false, format: "compact" });
    expect(feed.committedText).toBe("hello");
  });

  it("drops stale-session transcript exactly like the inline pill", async () => {
    let feed: SessionFeedState = createSessionFeed();
    await subscribePillFeed({
      onSession: (t) => {
        feed = applySessionTransition(feed, t);
      },
      onTranscript: (u) => {
        feed = applyTranscriptUpdate(feed, u);
      },
    });
    emit("session://changed", {
      event: "session://changed",
      transition: { sessionId: 8, sequence: 5, phase: "LISTENING", timestampMs: 1 },
    } satisfies SessionChangedPayload);
    emit("transcript://update", {
      session_id: 7,
      sequence: 9,
      kind: "Committed",
      text: "late",
    } satisfies TranscriptUpdate);
    expect(feed.committedText).toBeNull();
  });
});
