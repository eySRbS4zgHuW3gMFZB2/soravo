import { useEffect, useState } from "react";
import {
  applySessionSnapshot,
  applySessionTransition,
  applyTranscriptUpdate,
  createSessionFeed,
  subscribePillFeed,
} from "../session-feed";
import { describePillView } from "../pill-view";
import {
  loadSettings,
  onHideOverlay,
  onShowOverlay,
  sessionSnapshot,
} from "../ipc";
import {
  applyOverlayHide,
  applyOverlayShow,
  createOverlayVisibility,
} from "./overlay-visibility";

/**
 * Floating dictation pill for the `recording_overlay` window.
 *
 * Reused contracts (nothing reinvented, no second system):
 * - visibility: window-scoped `show-overlay` / `hide-overlay` signals from
 *   the Handy-derived native overlay abstraction (`overlay.rs`), folded by
 *   `overlay-visibility.ts`;
 * - content: the canonical typed session/transcript buses
 *   (`session://changed` + `transcript://update`) folded by the R1-GAP-012
 *   pure fold (`session-feed.ts`) and rendered through the R1-GAP-016
 *   view model (`pill-view.ts`) — the same fold and view model as the
 *   inline pill, so both surfaces always agree.
 *
 * This surface displays state and text only. It never calls `inject_text`
 * (exactly-once insertion stays owned by `injection-feed.ts` in the main
 * window) and it never drives recording (recording stays owned by the
 * Handy-derived global shortcut system).
 *
 * Transcript text renders as React text nodes (escaped by default; never
 * `dangerouslySetInnerHTML`), so dictated content cannot inject markup.
 */
export function OverlayPill() {
  const [visibility, setVisibility] = useState(createOverlayVisibility);
  const [feed, setFeed] = useState(createSessionFeed);
  const [mode, setMode] = useState<"hold_to_talk" | "toggle_to_talk">("hold_to_talk");

  const view = describePillView(feed, mode, null);

  useEffect(() => {
    let disposed = false;
    const unsubs: Array<() => void> = [];
    const track = (promise: Promise<() => void>) => {
      promise.then((unsub) => {
        if (disposed) {
          unsub();
          return;
        }
        unsubs.push(unsub);
      });
    };

    // Interaction mode comes from the live settings store, like the inline pill.
    loadSettings()
      .then((res) => {
        if (disposed) return;
        if (res.success && res.data) {
          setMode(res.data.hotkey.mode);
        }
      })
      .catch(() => {
        // Runtime not connected — overlay stays on the default mode.
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
        // Runtime not connected — overlay stays hidden until shown.
      });

    track(
      subscribePillFeed({
        onSession: (transition) => {
          if (disposed) return;
          setFeed((prev) => applySessionTransition(prev, transition));
        },
        onTranscript: (update) => {
          if (disposed) return;
          setFeed((prev) => applyTranscriptUpdate(prev, update));
        },
      })
    );
    track(
      onShowOverlay((signal) => {
        if (disposed) return;
        setVisibility((prev) => applyOverlayShow(prev, signal));
      })
    );
    track(onHideOverlay(() => {
      if (disposed) return;
      setVisibility((prev) => applyOverlayHide(prev));
    }));

    return () => {
      disposed = true;
      for (const unsub of unsubs) unsub();
    };
  }, []);

  if (!visibility.visible) return null;

  const expanded = visibility.format === "expanded";

  return (
    <div className={`ov-stage${expanded ? " expanded" : ""}`}>
      <div
        className={`ov-pill${view.state === "error" ? " error" : ""}${view.pulse ? " pulse" : ""}`}
        role="status"
        aria-live="polite"
      >
        <div className="ov-indicator" style={{ backgroundColor: view.color }} />
        <span className="ov-label">{view.label}</span>
        {view.display.kind === "committed" && (
          <span className="ov-transcript">{view.display.text}</span>
        )}
        {view.display.kind === "tentative" && (
          <span className="ov-transcript">{view.display.text}…</span>
        )}
        {view.errorText && <span className="ov-error">{view.errorText}</span>}
      </div>
    </div>
  );
}
