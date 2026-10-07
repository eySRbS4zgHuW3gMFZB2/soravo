import type { Page } from "@playwright/test";

// R1-GAP-028 desktop E2E helpers.
//
// Every test boots the desktop Vite dev server with VITE_E2E_TEST_MODE=true
// and opens `?test-scenario=<name>`, which installs the deterministic Tauri
// doubles (mocked devices/models, no microphone, no downloads, no network).
// Backend traffic is driven explicitly through `window.__SORAVO_E2E__` —
// never timers, never polling.

export type DesktopScenario = "ready" | "no-models" | "download-pending";

/** Opens the desktop shell with the harness scenario and waits for boot. */
export async function openDesktop(page: Page, scenario: DesktopScenario): Promise<void> {
  await page.goto(`/?test-scenario=${scenario}`);
  await page.getByRole("heading", { name: "Ready when you are." }).waitFor();
  await page.getByText("Runtime ready").waitFor();
}

/** Calls a `window.__SORAVO_E2E__` control method inside the page. */
export async function e2eCall<T>(page: Page, expression: string): Promise<T> {
  return page.evaluate(`window.__SORAVO_E2E__.${expression}`) as Promise<T>;
}

/** Session snapshot from the doubles (authoritative test oracle). */
export async function sessionState(page: Page): Promise<{
  sessionId: number | null;
  phase: string;
  sequence: number;
}> {
  return e2eCall(page, "sessionState()");
}

/** Every `invoke` command the app issued, in order. */
export async function invokeCommands(page: Page): Promise<string[]> {
  const calls = await e2eCall<Array<{ cmd: string }>>(page, "invokeCalls()");
  return calls.map((c) => c.cmd);
}

/** Every text the app passed to `inject_text`, in order. */
export async function injectTexts(page: Page): Promise<string[]> {
  return e2eCall(page, "injectTexts()");
}

/** Opens Settings and selects a section tab. */
export async function openSettingsSection(page: Page, section: string): Promise<void> {
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Settings" }).click();
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: section }).click();
}
