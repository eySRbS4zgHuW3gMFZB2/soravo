import { useEffect, useState } from "react";
import {
  applySessionSnapshot,
  applySessionTransition,
  applyTranscriptUpdate,
  createSessionFeed,
  subscribePillFeed,
} from "../session-feed";
import { describePillView } from "../pill-view";
import { loadSettings, sessionSnapshot } from "../ipc";

/** Pill recording states. */
export type PillState =
  | "idle"
  | "listening"
  | "transcribing"
  | "finalizing"
  | "done"
  | "error";

/**
 * Floating pill indicator for dictation state.
 *
 * - PILL-001: State machine UI
 * - PILL-002: Animations (via CSS)
 * - PILL-003: Error state
 *
 * R1-GAP-012: state and transcript content come ONLY from the canonical typed
 * buses (`session://changed` + `transcript://update`, folded in
 * `session-feed.ts`). The previous 100 ms `hotkeyRecording()` poll is gone:
 * those commands are not registered backend-side, so the poll could never
 * observe a session — the bus is the single state source (no parallel state
 * system, no polling).
 *
 * Interaction mode comes from the live settings store (`load_settings` →
 * `Settings.hotkey.mode`). Recording itself is driven by the Handy-derived
 * global shortcut system (`src-tauri/src/shortcut/`), not by pill buttons:
 * the retired `hotkey_*` pill handlers were unregistered backend stubs, so
 * they were removed rather than re-plumbed to a fake state machine.
 */
export function Pill({
  className,
}: {
  className?: string;
}) {
  const [feed, setFeed] = useState(createSessionFeed);
  const [mode, setMode] = useState<"hold_to_talk" | "toggle_to_talk">("hold_to_talk");

  // R1-GAP-016-balance: view model over the canonical feed (session-feed.ts).
  // The canonical backend session state is the only error source — there is
  // no local hotkey-command error anymore (those commands were retired).
  const view = describePillView(feed, mode, null);
  const state = view.state;

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    // Load initial interaction mode from the live settings store.
    loadSettings()
      .then((res) => {
        if (disposed) return;
        if (res.success && res.data) {
          setMode(res.data.hotkey.mode);
        }
      })
      .catch(() => {
        // Runtime not connected - fine for web preview
      });

    // Hydrate from the canonical snapshot, then follow the live buses.
    // A slow snapshot resolving after live events arrived must not rewind
    // the feed (enforced in applySessionSnapshot via sequence guards).
    sessionSnapshot()
      .then((snapshot) => {
        if (disposed) return;
        setFeed((prev) => applySessionSnapshot(prev, snapshot));
      })
      .catch(() => {
        // Runtime not connected - fine for web preview
      });

    subscribePillFeed({
      onSession: (transition) => {
        if (disposed) return;
        setFeed((prev) => applySessionTransition(prev, transition));
      },
      onTranscript: (update) => {
        if (disposed) return;
        setFeed((prev) => applyTranscriptUpdate(prev, update));
      },
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  const pulseClass = view.pulse ? "pulse" : "";
  const errorClass = state === "error" ? "error" : "";

  return (
    <div className={`pill ${pulseClass} ${errorClass} ${className || ""}`}>
      <div className="pill-indicator" style={{ backgroundColor: view.color }} />
      <span className="pill-label" role="status" aria-live="polite">{view.label}</span>
      {view.display.kind === "committed" && (
        <span className="pill-transcript">{view.display.text}</span>
      )}
      {view.display.kind === "tentative" && (
        <span className="pill-transcript">{view.display.text}…</span>
      )}
      {view.errorText && <span className="pill-error">{view.errorText}</span>}
    </div>
  );
}
