import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../app";
import { createScenarioClient, resolveScenario } from "./e2e-fixtures";

// WEB-010 dev-only E2E harness (browser build).
//
// main.tsx imports this module only when `import.meta.env.DEV &&
// VITE_E2E_TEST_MODE === "true"`, so it never ships in a production bundle. It
// reads the `?test-scenario=<name>` query parameter, builds the matching
// in-memory Supabase test double, and renders the real app with that client
// injected through AuthProvider. No scenario → the anonymous ("inert") session,
// which is what the unauthenticated guard and sign-in tests exercise.

export function renderE2EApp(root: HTMLElement): void {
  const params = new URLSearchParams(window.location.search);
  const scenario = resolveScenario(params.get("test-scenario"));
  const client = createScenarioClient(scenario);
  createRoot(root).render(
    <StrictMode>
      <App client={client} />
    </StrictMode>,
  );
}