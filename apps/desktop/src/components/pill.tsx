import { useEffect, useState } from "react";
import {
  applySessionSnapshot,
  applySessionTransition,
  applyTranscriptUpdate,
  createSessionFeed,
  phaseToPillState,
  subscribePillFeed,
} from "../session-feed";
import { hotkeyConfig, hotkeyStart, hotkeyStop, hotkeyToggle, sessionSnapshot } from "../ipc";

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
 * system, no polling). Button interaction (hold/toggle) is unchanged; on
 * success the pill waits for the canonical bus event instead of optimistically
 * rewriting state locally.
 */
export function Pill({
  className,
}: {
  className?: string;
}) {
  const [feed, setFeed] = useState(createSessionFeed);
  const [mode, setMode] = useState<"hold_to_talk" | "toggle_to_talk">("hold_to_talk");
  const [error, setError] = useState<string | null>(null);

  const state = phaseToPillState(feed.phase);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    // Load initial hotkey config
    hotkeyConfig()
      .then((config) => {
        if (disposed) return;
        setMode(config.mode);
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

  const handleActivate = async () => {
    setError(null);
    try {
      if (mode === "hold_to_talk") {
        const result = await hotkeyStart();
        if (result.status !== "success") {
          setError(result.message);
        }
      } else {
        const result = await hotkeyToggle();
        if (result.status !== "success") {
          setError(result.message);
        }
      }
    } catch {
      setError("Failed to activate hotkey");
    }
  };

  const handleDeactivate = async () => {
    setError(null);
    try {
      if (mode === "hold_to_talk") {
        const result = await hotkeyStop();
        if (result.status !== "success") {
          setError(result.message);
        }
      }
    } catch {
      setError("Failed to deactivate");
    }
  };

  const stateLabel: Record<PillState, string> = {
    idle: "Ready",
    listening: "Listening...",
    transcribing: "Transcribing...",
    finalizing: "Finalizing...",
    done: "Done",
    error: "Error",
  };

  const pulseClass = state === "listening" ? "pulse" : "";
  const errorClass = state === "error" ? "error" : "";
  const statusColor = state === "listening" ? "#10b981" : state === "error" ? "#ef4444" : "#6b7280";

  return (
    <div className={`pill ${pulseClass} ${errorClass} ${className || ""}`}>
      <div className="pill-indicator" style={{ backgroundColor: statusColor }} />
      <span className="pill-label">{stateLabel[state]}</span>
      {feed.committedText && (
        <span className="pill-transcript">{feed.committedText}</span>
      )}
      {!feed.committedText && feed.tentativeText && (
        <span className="pill-transcript">{feed.tentativeText}…</span>
      )}
      {error && <span className="pill-error">{error}</span>}
      {state === "idle" && mode === "hold_to_talk" && (
        <button className="pill-activate" onMouseDown={handleActivate} onMouseUp={handleDeactivate} onMouseLeave={handleDeactivate}
          onTouchStart={handleActivate} onTouchEnd={handleDeactivate}
        >
          Hold to talk
        </button>
      )}
      {state === "idle" && mode === "toggle_to_talk" && (
        <button className="pill-activate" onClick={handleActivate}>
          Tap to talk
        </button>
      )}
      {state === "listening" && mode === "toggle_to_talk" && (
        <button className="pill-deactivate" onClick={handleDeactivate}>
          Tap to stop
        </button>
      )}
    </div>
  );
}
