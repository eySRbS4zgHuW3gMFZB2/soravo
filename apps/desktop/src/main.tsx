import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");
const rootElement: HTMLElement = root;

// R1-GAP-028: browser-level E2E tests drive a dev-only harness instead of the
// native Tauri runtime (`?test-scenario=<name>`). The guard below is INLINED
// so that in a production build `import.meta.env.DEV` compiles to `false` and
// Rollup eliminates the whole branch — the harness module is never emitted,
// and it never runs during ordinary development. Same pattern as the website
// `e2e-harness.tsx` (WEB-010).

const e2eHarnessEnabled =
  import.meta.env.DEV && import.meta.env.VITE_E2E_TEST_MODE === "true";

if (e2eHarnessEnabled) {
  import("./test-utils/e2e-harness").then(({ renderE2EApp }) => {
    renderE2EApp(rootElement);
  });
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
