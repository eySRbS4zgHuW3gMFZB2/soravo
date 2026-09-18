import { useEffect, useState } from "react";
import { hotkeyConfig, hotkeyRecording, hotkeyStart, hotkeyStop, hotkeyToggle } from "../ipc";

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
 */
export function Pill({
  className,
}: {
  className?: string;
}) {
  const [state, setState] = useState<PillState>("idle");
  const [mode, setMode] = useState<"hold_to_talk" | "toggle_to_talk">("hold_to_talk");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load initial hotkey config
    hotkeyConfig()
      .then((config) => {
        setMode(config.mode);
      })
      .catch(() => {
        // Runtime not connected - fine for web preview
      });

    // Poll recording state for toggle mode
    const interval = setInterval(() => {
      hotkeyRecording()
        .then((recording) => {
          setState(recording ? "listening" : "idle");
        })
        .catch(() => {
          // Ignore connection errors
        });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleActivate = async () => {
    setError(null);
    try {
      if (mode === "hold_to_talk") {
        const result = await hotkeyStart();
        if (result.status === "success") {
          setState("listening");
        } else {
          setError(result.message);
        }
      } else {
        const result = await hotkeyToggle();
        if (result.status === "success") {
          setState((prev) => (prev === "listening" ? "idle" : "listening"));
        } else {
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
        if (result.status === "success") {
          setState("idle");
        } else {
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
