import { createRoot } from "react-dom/client";
import { App } from "../app";
import { installDoubles, resolveScenario } from "./e2e-doubles";

// R1-GAP-028 dev-only desktop E2E harness (browser build).
//
// `main.tsx` imports this module only when `import.meta.env.DEV &&
// VITE_E2E_TEST_MODE === "true"`, so it never ships in a production bundle.
// It reads `?test-scenario=<name>`, installs the deterministic Tauri doubles
// (`e2e-doubles.ts`: mocked devices/models, scripted session/transcript
// traffic, no microphone, no downloads, no network), and renders the REAL
// app — the same `App` component production mounts — over those doubles.
// Playwright drives backend traffic explicitly through
// `window.__SORAVO_E2E__` (`page.evaluate`), so every run is deterministic.
//
// Production security/privacy boundaries are untouched: account sign-in
// fails closed in the doubles, no secret is minted, and server-side
// authorization stays covered by the Rust suites and the Supabase tests.

export function renderE2EApp(root: HTMLElement): void {
  const params = new URLSearchParams(window.location.search);
  const scenario = resolveScenario(params.get("test-scenario"));
  installDoubles(scenario);
  // NOTE: intentionally WITHOUT `<StrictMode>`. Production mounts
  // `<StrictMode><App /></StrictMode>` (see `main.tsx`), which is inert in
  // production React builds (effects run once). Under the dev server,
  // StrictMode double-mounts every effect: `history-feed.ts`
  // `refreshHistoryFeed` carries a `loading` re-entry guard, so the remount
  // returns early while the first load is still in flight, and the first
  // mount's cancelled continuation is the only one that would re-render —
  // leaving History stuck on "Loading history…" in DEV ONLY (production is
  // unaffected). Mounting the same `App` without the dev double-invoke
  // observes exactly the production effect lifecycle. This is harness-only;
  // no production behavior is changed to satisfy tests.
  createRoot(root).render(<App />);
}
