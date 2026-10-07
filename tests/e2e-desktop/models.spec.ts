import { expect, test } from "@playwright/test";
import { e2eCall, invokeCommands, openDesktop, openSettingsSection } from "./helpers";

// R1-GAP-028 — desktop model selection/download E2E (mocked models).
//
// Covers: catalog display from the canonical `get_available_models` contract,
// model selection through `set_active_model` (downloaded-only validation),
// and the download progress → completion → installed flow. The catalog is a
// deterministic double (`parakeet-ready` installed+active, `whisper-large`
// available): no real download, no licence implications, no network.

test.describe("desktop model selection", () => {
  test("catalog shows the active downloaded model as ready", async ({ page }) => {
    await openDesktop(page, "ready");
    await openSettingsSection(page, "Models");

    await expect(page.getByLabel("Engine")).toBeVisible();
    await expect(page.getByLabel("Model")).toBeVisible();
    // The ready double is selected and marked active by the backend read.
    await expect(page.getByLabel("Model")).toHaveValue("parakeet-ready");
    await expect(page.getByText("Ready (active)")).toBeVisible();
  });

  test("selecting a not-downloaded model is refused without invoking", async ({ page }) => {
    await openDesktop(page, "ready");
    await openSettingsSection(page, "Models");

    // Switch to the engine that owns the not-installed double, then pick
    // it: selection is refused by the canonical contract (downloaded-only)
    // with an explicit error — no `set_active_model` fires, nothing moves.
    await page.getByLabel("Engine").selectOption("TranscribeCpp");
    await page.getByLabel("Model").selectOption("whisper-large-mock");
    await expect(page.getByText("Model not downloaded: whisper-large-mock")).toBeVisible();
    expect(await invokeCommands(page)).not.toContain("set_active_model");
  });

  test("download progress, cancel, completion, then activation", async ({ page }) => {
    await openDesktop(page, "download-pending");
    await openSettingsSection(page, "Models");

    // Pre-selected not-installed entry: the reachable pre-download state.
    await expect(page.getByLabel("Model")).toHaveValue("whisper-large-mock");
    await expect(page.getByText("Not installed", { exact: true })).toBeVisible();

    // Starting the download shows deterministic progress; cancelling
    // returns to the pre-download state with no install.
    await page.getByRole("button", { name: "Download" }).click();
    await expect(page.getByText(/Downloading/)).toBeVisible();
    await page.getByRole("button", { name: "Cancel download" }).click();
    await expect(page.getByText("Not installed", { exact: true })).toBeVisible();

    // Re-start and complete: the backend confirms the installed flag.
    await page.getByRole("button", { name: "Download" }).click();
    await expect(page.getByText(/Downloading/)).toBeVisible();
    await e2eCall(page, `completeDownload("whisper-large-mock")`);
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();

    // Now selection succeeds through the canonical contract and the
    // backend confirms the active marker.
    await page.getByLabel("Model").selectOption("");
    await page.getByLabel("Model").selectOption("whisper-large-mock");
    await expect(page.getByText("Ready (active)")).toBeVisible();
    expect(await invokeCommands(page)).toContain("set_active_model");
  });

  test("empty catalog degrades to an explicit select-a-model state", async ({ page }) => {
    await openDesktop(page, "no-models");
    await openSettingsSection(page, "Models");

    await expect(page.getByText("Select a model")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" })).toHaveCount(0);
  });
});
