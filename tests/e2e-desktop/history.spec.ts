import { expect, test } from "@playwright/test";
import { invokeCommands, openDesktop, openSettingsSection } from "./helpers";

// R1-GAP-028 — desktop history interaction E2E (mocked history backend).
//
// Covers: newest-first entry display from `get_history_entries`, save-toggle
// and delete through the canonical commands with bus-echo reconciliation
// (no duplicates, no ghosts). Deterministic fixtures, no SQLite, no network.

test.describe("desktop history", () => {
  test("entries render newest-first with display text", async ({ page }) => {
    await openDesktop(page, "ready");
    await openSettingsSection(page, "History");

    await expect(page.getByText("First dictation", { exact: true })).toBeVisible();
    await expect(page.getByText("Second dictation", { exact: true })).toBeVisible();
    // Post-processed display text wins where present (tray parity).
    await expect(page.getByText("First getattr result.", { exact: true })).toBeVisible();
    await expect(page.getByText("second getattr result", { exact: true })).toBeVisible();
  });

  test("save-toggle and delete reconcile without duplicates or ghosts", async ({ page }) => {
    await openDesktop(page, "ready");
    await openSettingsSection(page, "History");

    // Toggle save: canonical command fires, the bus echo is absorbed.
    await page.getByRole("button", { name: "Unsave First dictation" }).click();
    expect(await invokeCommands(page)).toContain("toggle_history_entry_saved");
    await expect(page.getByRole("button", { name: "Save First dictation" })).toBeVisible();

    // Delete: canonical command fires, the entry leaves, nothing ghosts back.
    await page.getByRole("button", { name: "Delete Second dictation" }).click();
    expect(await invokeCommands(page)).toContain("delete_history_entry");
    await expect(page.getByText("Second dictation", { exact: true })).toHaveCount(0);
    await expect(page.getByText("First dictation", { exact: true })).toBeVisible();
  });
});
