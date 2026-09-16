import { defineConfig } from "@playwright/test";
import { devices } from "@playwright/test";

// WEB-010 browser-level E2E for the website dashboards (05_TASK_BREAKDOWN.md).
//
// The webServer boots the Vite dev server with VITE_E2E_TEST_MODE=true so the
// dev-only harness (apps/website/src/test-utils/e2e-harness.tsx) can inject a
// deterministic in-memory auth/dashboard client via the ?test-scenario query
// parameter. Production security boundaries are untouched — this is a test
// double in a dev build only, and server-side RLS/RPC authorization stays
// covered by the Supabase assertion suites and Vitest service tests.

export default defineConfig({
  testDir: "./tests/e2e",
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
    baseURL: "http://127.0.0.1:4175",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command:
      "VITE_E2E_TEST_MODE=true pnpm --filter @soravo/website dev --port 4175 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});