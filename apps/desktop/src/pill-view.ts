import { phaseToPillState, type SessionFeedState } from "./session-feed";
import type { PillState } from "./components/pill";

export type PillViewMode = "hold_to_talk" | "toggle_to_talk";

export type PillDisplay =
  | { kind: "none" }
  | { kind: "committed"; text: string }
  | { kind: "tentative"; text: string };

export type PillView = {
  state: PillState;
  label: string;
  color: string;
  pulse: boolean;
  showStart: boolean;
  showStop: boolean;
  errorText: string | null;
  display: PillDisplay;
};

export const PILL_LABEL: Record<PillState, string> = {
  idle: "Ready",
  listening: "Listening...",
  transcribing: "Transcribing...",
  finalizing: "Finalizing...",
  done: "Done",
  error: "Error",
};

/**
 * R1-GAP-016-balance — pure pill view model over the canonical feed.
 *
 * Reuses (never duplicates):
 * - `phaseToPillState` for phase → pill state (R1-GAP-012, `session-feed.ts`);
 * - `SessionFeedState` committed/tentative buffers (committed preferred,
 *   tentative preview only, never stable).
 *
 * Balance added over R1-GAP-012 (which drove idle/listening):
 * - transcribing/finalizing are active (green) with stop afforded;
 * - backend ERROR surfaces even with no local hotkey error;
 * - DONE is terminal-stable (no stop/start until IDLE returns it there).
 */
export function describePillView(
  feed: SessionFeedState,
  mode: PillViewMode,
  localError: string | null,
): PillView {
  void mode;
  const state = phaseToPillState(feed.phase);
  const label = PILL_LABEL[state];
  const color =
    state === "error"
      ? "#ef4444"
      : state === "listening" || state === "transcribing" || state === "finalizing"
        ? "#10b981"
        : "#6b7280";
  const pulse = state === "listening" || state === "transcribing";
  const showStart = state === "idle";
  const showStop =
    state === "listening" || state === "transcribing" || state === "finalizing";
  const errorText = state === "error" ? (localError ?? "Session error") : localError;
  const display: PillDisplay = feed.committedText
    ? { kind: "committed", text: feed.committedText }
    : feed.tentativeText
      ? { kind: "tentative", text: feed.tentativeText }
      : { kind: "none" };
  return { state, label, color, pulse, showStart, showStop, errorText, display };
}
