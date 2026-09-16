import type { Page } from "@playwright/test";

// WEB-010 E2E helpers.
//
// Every scenario uses the dev-only harness (`?test-scenario=`) which injects a
// deterministic in-memory Supabase double, so no test depends on external
// services, seed data, or timing.

export type E2EScenario = "anon" | "user" | "admin";

/** URL for a path + harness scenario, e.g. scenarioUrl("/admin", "admin"). */
export function scenarioUrl(path: string, scenario: E2EScenario): string {
  return `${path}?test-scenario=${scenario}`;
}

/** Opens the app with the harness scenario and waits for the app shell. */
export async function openApp(page: Page, path: string, scenario: E2EScenario): Promise<void> {
  await page.goto(scenarioUrl(path, scenario));
}

/** Opens the app and waits for a named heading to be visible. */
export async function openWithHeading(
  page: Page,
  path: string,
  scenario: E2EScenario,
  heading: string,
): Promise<void> {
  await openApp(page, path, scenario);
  await page.getByRole("heading", { name: heading }).waitFor();
}

/** Waits for text that appears only after the account/admin dashboard loads. */
export async function waitForText(page: Page, text: string): Promise<void> {
  await page.getByText(text).waitFor();
}