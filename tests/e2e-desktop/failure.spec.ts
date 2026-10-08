import { expect, test } from "@playwright/test";
import { e2eCall, injectTexts, invokeCommands, openDesktop } from "./helpers";

// R1-GAP-028 — desktop failure/recovery E2E (mocked devices/models).
//
// Covers: backend ERROR surfacing in the pill with recovery to IDLE, and the
// account panel failing closed on sign-in (T14 STOP design — the harness
// never invents auth). No real failure is staged against hardware or network.

test.describe("desktop failure and recovery", () => {
  test("backend error surfaces in the pill and recovers to idle", async ({ page }) => {
    await openDesktop(page, "ready");
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(page.getByRole("heading", { name: "Listening" })).toBeVisible();

    await e2eCall(page, `emitSession("ERROR")`);
    await expect(page.locator(".pill.error")).toBeVisible();
    await expect(page.locator(".pill-label")).toContainText("Error");
    await expect(page.locator(".pill-error")).toBeVisible();

    // Recovery returns to a clean idle shell with no orphaned session.
    await e2eCall(page, `emitSession("IDLE")`);
    await expect(page.getByRole("heading", { name: "Ready", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start session" })).toBeVisible();
  });

  test("orphan transcript traffic after idle injects nothing", async ({ page }) => {
    await openDesktop(page, "ready");
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(page.getByRole("heading", { name: "Listening" })).toBeVisible();
    await page.getByRole("button", { name: "End session" }).click();
    await expect(page.getByRole("heading", { name: "Done" })).toBeVisible();
    await e2eCall(page, `emitSession("IDLE")`);
    await expect(page.getByRole("heading", { name: "Ready", exact: true })).toBeVisible();

    // No active session exists, so the double refuses transcript traffic —
    // nothing can reach the injection path from a dead session.
    await expect(e2eCall(page, `emitTranscript("Final", "orphan")`)).rejects.toThrow();
    expect(await injectTexts(page)).toEqual([]);
  });

  test("account sign-in fails closed by design", async ({ page }) => {
    await openDesktop(page, "ready");

    // R1-GAP-021: the panel starts the explicit browser command; the harness
    // build is unconfigured, so it fails closed (never invents auth), shows
    // the refusal, and stays on the signed-out state.
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect
      .poll(async () => (await invokeCommands(page)).filter((c) => c === "account_begin_sign_in").length)
      .toBe(1);
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    await expect(page.getByText(/fails closed/i)).toBeVisible();
  });
});
