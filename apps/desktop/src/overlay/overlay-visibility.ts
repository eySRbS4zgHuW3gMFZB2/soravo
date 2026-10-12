import type { OverlaySignal, StreamText } from "../ipc";

/**
 * R1 floating pill — pure overlay visibility fold.
 *
 * Visibility follows ONLY the window-scoped native signals (`show-overlay` /
 * `hide-overlay` from `overlay.rs`); pill content (state, transcript) follows
 * ONLY the canonical session/transcript buses (`session-feed.ts`). The two
 * never mix: this module owns visibility, the feed owns content, and no
 * second recording state machine exists.
 *
 * - `show` makes the overlay visible; the signal selects the format
 *   (`streaming` → expanded live card sized to the 400x120 native window,
 *   every other signal → compact pill sized to the 256x50 native window).
 * - `hide` returns to hidden (the native side unmaps the window ~300 ms
 *   later for the fade-out; a newer show invalidates a stale hide there).
 * - Stale-session and ordering protection lives in the feed (sequence
 *   guards); visibility signals carry no identity, so every signal applies.
 */

export type OverlayFormat = "compact" | "expanded";

export type OverlayVisibility = {
  visible: boolean;
  format: OverlayFormat;
};

export function createOverlayVisibility(): OverlayVisibility {
  return { visible: false, format: "compact" };
}

export function formatForSignal(signal: OverlaySignal): OverlayFormat {
  return signal === "streaming" ? "expanded" : "compact";
}

/** Fold a native show signal into visibility. Always applies. */
export function applyOverlayShow(
  state: OverlayVisibility,
  signal: OverlaySignal
): OverlayVisibility {
  return { visible: true, format: formatForSignal(signal) };
}

/** Fold a native hide signal into visibility. Always applies. */
export function applyOverlayHide(state: OverlayVisibility): OverlayVisibility {
  void state;
  return { visible: false, format: "compact" };
}

/**
 * Which transcript source the overlay card renders.
 *
 * The expanded Live card prefers the live streaming snapshot while one is
 * present; otherwise (and always in the compact pill) the canonical
 * session/transcript view model renders. Stream content is display-only and
 * never feeds state or insertion — this function only selects what is
 * painted.
 */
export type OverlayTextSource =
  | { kind: "stream"; committed: string; tentative: string }
  | { kind: "canonical" };

export function selectOverlayText(
  expanded: boolean,
  stream: StreamText | null
): OverlayTextSource {
  if (
    expanded &&
    stream !== null &&
    (stream.committed !== "" || stream.tentative !== "")
  ) {
    return { kind: "stream", committed: stream.committed, tentative: stream.tentative };
  }
  return { kind: "canonical" };
}
