import { useEffect, useState } from "react";
import { getRuntimeStatus, type RuntimeStatus } from "./ipc";

export function App() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [message, setMessage] = useState("Connecting to local runtime…");
  useEffect(() => { getRuntimeStatus().then((next) => { setStatus(next); setMessage("Runtime ready"); }).catch(() => setMessage("Web preview — native runtime not connected")); }, []);
  return <main className="shell">
    <aside><div className="logo"><span>◉</span> Soravo</div><nav aria-label="Settings sections"><button className="active">Overview</button><button>General</button><button>Microphone</button><button>Shortcut</button><button>Models</button><button>Privacy</button><button>Diagnostics</button></nav><small>Local-first dictation</small></aside>
    <section className="content"><header><div><p className="eyebrow">DESKTOP SHELL</p><h1>Ready when you are.</h1></div><span className="status"><i /> {message}</span></header>
      <article className="primary"><div><p>DICTATION</p><h2>Not recording</h2><span>Your audio pipeline will be warmed before a session starts.</span></div><button disabled title="Hotkey support arrives in Phase 7">Start dictation</button></article>
      <div className="cards"><article><p>PRIVACY</p><h3>Local by default</h3><span>Audio and transcript content stay on this device.</span></article><article><p>MODEL</p><h3>Not installed</h3><span>Model downloads and verification arrive after benchmarking.</span></article><article><p>RUNTIME</p><h3>{status?.version ?? "Preview"}</h3><span>{status?.localOnly ? "Native core connected" : "No native connection"}</span></article></div>
      <article className="notice"><strong>Foundation state</strong><p>Speech recognition, microphone access, global shortcuts, and text insertion are deliberately unavailable until their dedicated, testable phases.</p></article>
    </section>
  </main>;
}
