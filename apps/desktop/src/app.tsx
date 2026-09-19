import { useEffect, useState } from "react";
import {
  getRuntimeStatus,
  onPing,
  onSessionChanged,
  ping,
  sessionTransition,
  type PingReply,
  type RuntimeStatus,
  type SessionPhase,
  type SessionTransition,
} from "./ipc";
import { Pill } from "./components/pill";

export const PHASE_LABEL: Record<SessionPhase, string> = {
  IDLE: "Ready",
  STARTING: "Starting",
  LISTENING: "Listening",
  TRANSCRIBING: "Transcribing",
  FINALIZING: "Finalizing",
  DONE: "Done",
  ERROR: "Error",
};

export function App() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [message, setMessage] = useState("Connecting to local runtime…");
  const [phase, setPhase] = useState<SessionPhase>("IDLE");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [lastTransition, setLastTransition] = useState<SessionTransition | null>(null);
  const [pendingTransition, setPendingTransition] = useState<SessionPhase | null>(null);
  const [pingReply, setPingReply] = useState<PingReply | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let unsubSession: (() => void) | undefined;
    let unsubPing: (() => void) | undefined;
    let disposed = false;

    getRuntimeStatus()
      .then((next) => {
        if (disposed) return;
        setStatus(next);
        setPhase(next.phase);
        setSessionId(next.sessionId);
        setMessage("Runtime ready");
        setConnected(next.ready);
      })
      .catch(() => {
        if (disposed) return;
        setMessage("Web preview — native runtime not connected");
        setConnected(false);
      });

    onSessionChanged((payload) => {
      if (disposed) return;
      setPhase(payload.transition.phase);
      setSessionId(payload.transition.sessionId);
      setLastTransition(payload.transition);
      setPendingTransition(null);
    }).then((unlisten) => {
      unsubSession = unlisten;
    });

    onPing((payload) => {
      if (disposed) return;
      setPingReply({ sequence: payload.sequence, timestampMs: payload.timestampMs });
    }).then((unlisten) => {
      unsubPing = unlisten;
    });

    return () => {
      disposed = true;
      unsubSession?.();
      unsubPing?.();
    };
  }, []);

  const hasSession = sessionId !== null && phase !== "IDLE";

  async function handleSessionStart() {
    if (phase !== "IDLE") return;
    try {
      setPendingTransition("STARTING");
      await sessionTransition("STARTING");
    } catch {
      setPendingTransition(null);
    }
  }

  async function handleSessionStop() {
    if (phase === "IDLE") return;
    try {
      setPendingTransition("DONE");
      await sessionTransition("DONE");
    } catch {
      setPendingTransition(null);
    }
  }

  function probeRuntime() {
    ping().then((reply) => setPingReply(reply));
  }

  return (
    <main className="shell">
      <aside>
        <div className="logo">
          <span>◉</span> Soravo
        </div>
        <nav aria-label="Settings sections">
          <button className="active" type="button">Overview</button>
          <button type="button">General</button>
          <button type="button">Microphone</button>
          <button type="button">Shortcut</button>
          <button type="button">Models</button>
          <button type="button">Privacy</button>
          <button type="button">Diagnostics</button>
        </nav>
        <small>Local-first dictation</small>
      </aside>

      <section className="content">
        <header>
          <div>
            <p className="eyebrow">DESKTOP SHELL</p>
            <h1>Ready when you are.</h1>
          </div>
          <span className="status">
            <i /> {message}
          </span>
        </header>

        <article className="primary">
          <div>
            <p>DICTATION</p>
            <h2>{PHASE_LABEL[phase]}</h2>
            <span>
              {hasSession
                ? `Session #${sessionId} in flight`
                : "Your audio pipeline will be warmed before a session starts."}
            </span>
            <div className="session-controls">
              {phase === "IDLE" && (
                <button type="button" onClick={handleSessionStart} className="session-start">
                  Start session
                </button>
              )}
              {phase !== "IDLE" && (
                <button type="button" onClick={handleSessionStop} className="session-stop">
                  End session
                </button>
              )}
            </div>
          </div>
          <Pill />
        </article>

        <div className="cards">
          <article>
            <p>PRIVACY</p>
            <h3>Local by default</h3>
            <span>Audio and transcript content stay on this device.</span>
          </article>
          <article>
            <p>MODEL</p>
            <h3>Not installed</h3>
            <span>Model downloads and verification arrive after benchmarking.</span>
          </article>
          <article>
            <p>RUNTIME</p>
            <h3>{status?.version ?? "Preview"}</h3>
            <span>
              {connected ? `Native core connected ${lastTransition ? `· seq ${lastTransition.sequence}` : ""}` : "No native connection"}
            </span>
          </article>
        </div>

        <article className="notice">
          <strong>Foundation state</strong>
          <p>
            Speech recognition, microphone access, global shortcuts, and text insertion are
            deliberately unavailable until their dedicated, testable phases. Runtime ping:
            <button type="button" className="ghost-link" onClick={probeRuntime}>
              probe
            </button>
            {pingReply ? ` seq ${pingReply.sequence} @ ${pingReply.timestampMs}ms` : ""}
          </p>
        </article>
      </section>
    </main>
  );
}