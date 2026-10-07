import { defineConfig } from "@playwright/test";
import { devices } from "@playwright/test";

// WEB-010 browser-level E2E for the website dashboards (05_TASK_BREAKDOWN.md).
// R1-GAP-028 desktop E2E harness (mocked devices/models).
//
// Each webServer boots its Vite dev server with VITE_E2E_TEST_MODE=true so the
// dev-only harness (website: apps/website/src/test-utils/e2e-harness.tsx;
// desktop: apps/desktop/src/test-utils/e2e-harness.tsx) can inject
// deterministic in-memory doubles via the ?test-scenario query parameter.
// Production security boundaries are untouched — these are test doubles in
// dev builds only. The desktop doubles stub `window.__TAURI_INTERNALS__`
// (mocked devices/models, scripted session/transcript traffic): no
// microphone hardware, no model downloads, no network, no uploaded
// audio/transcripts. Server-side RLS/RPC authorization stays covered by the
// Supabase assertion suites and Vitest service tests; the Rust backend stays
// covered by the session-pipeline and crate suites.

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "website-chromium",
      testMatch: ["e2e/*.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        baseURL: "http://127.0.0.1:4175",
      },
    },
    {
      name: "desktop-chromium",
      testMatch: ["e2e-desktop/*.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        baseURL: "http://127.0.0.1:1420",
      },
    },
  ],
  webServer: [
    {
      command:
        "VITE_E2E_TEST_MODE=true pnpm --filter @soravo/website dev --port 4175 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:4175",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        "VITE_E2E_TEST_MODE=true pnpm --filter @soravo/desktop dev --host 127.0.0.1",
      url: "http://127.0.0.1:1420",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});