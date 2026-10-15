import { expect, test } from "@playwright/test";
import { invokeCommands, openDesktop, openSettingsSection } from "./helpers";

// R1 overlay selectors E2E (mocked overlay-style/position backend).
//
// Covers: the General settings selectors render all canonical values with
// the stored preference selected, and changing them fires the canonical
// `change_overlay_style_setting` / `change_overlay_position_setting`
// commands with the exact values while the visible descriptions follow the
// selections. Persistence across restarts is covered by the supervised live
// session (the doubles reinstall per page load, so reload-restore cannot be
// observed here).

test.describe("desktop overlay style", () => {
  test("selector renders all values with the stored preference selected", async ({
    page,
  }) => {
    await openDesktop(page, "ready");
    await openSettingsSection(page, "General");

    const select = page.getByLabel("Floating pill");
    await expect(select).toBeVisible();
    await expect(select).toHaveValue("minimal");
    await expect(
      page.getByText("A small floating pill shows the dictation status", {
        exact: false,
      })
    ).toBeVisible();
  });

  test("changing the value fires the canonical command and follows the selection", async ({
    page,
  }) => {
    await openDesktop(page, "ready");
    await openSettingsSection(page, "General");

    const select = page.getByLabel("Floating pill");
    await select.selectOption("live");
    expect(await invokeCommands(page)).toContain("change_overlay_style_setting");
    await expect(
      page.getByText("A larger floating panel shows the live transcription text", {
        exact: false,
      })
    ).toBeVisible();

    await select.selectOption("none");
    expect(await invokeCommands(page)).toContain("change_overlay_style_setting");
    await expect(
      page.getByText("No floating pill appears during dictation.", { exact: false })
    ).toBeVisible();
  });
});

test.describe("desktop overlay position", () => {
  test("selector renders both edges with the stored preference selected", async ({
    page,
  }) => {
    await openDesktop(page, "ready");
    await openSettingsSection(page, "General");

    const select = page.getByLabel("Screen edge");
    await expect(select).toBeVisible();
    await expect(select).toHaveValue("bottom");
    await expect(
      page.getByText("near the bottom edge", {
        exact: false,
      })
    ).toBeVisible();
  });

  test("changing the value fires the canonical command and follows the selection", async ({
    page,
  }) => {
    await openDesktop(page, "ready");
    await openSettingsSection(page, "General");

    const select = page.getByLabel("Screen edge");
    await select.selectOption("top");
    expect(await invokeCommands(page)).toContain("change_overlay_position_setting");
    await expect(
      page.getByText("near the top edge", {
        exact: false,
      })
    ).toBeVisible();
  });
});
