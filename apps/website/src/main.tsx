import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { loadAnalytics } from "./lib/analytics";
import "./styles.css";

// WEB-010: browser-level E2E tests drive a dev-only harness instead of the
// real Supabase network stack (`?test-scenario=<name>`). The guard below is
// INLINED so that in a production build `import.meta.env.DEV` compiles to
// `false` and Rollup eliminates the whole `false && …` branch — the harness
// module is never emitted, and it never runs during ordinary development.
// No scenario query → the harness defaults to the anonymous ("inert") session.

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element is missing");
const root: HTMLElement = rootElement;

loadAnalytics();

function renderApp() {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

const e2eHarnessEnabled = import.meta.env.DEV && import.meta.env.VITE_E2E_TEST_MODE === "true";

if (e2eHarnessEnabled) {
  import("./test-utils/e2e-harness").then(({ renderE2EApp }) => {
    renderE2EApp(root);
  });
} else {
  renderApp();
}
