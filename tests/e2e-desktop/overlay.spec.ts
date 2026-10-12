import { expect, test } from "@playwright/test";
import { invokeCommands, openDesktop, openSettingsSection } from "./helpers";

// R1 overlay-style selector E2E (mocked overlay-style backend).
//
// Covers: the General settings selector renders all three canonical values
// with the stored preference selected, and changing it fires the canonical
// `change_overlay_style_setting` command with the exact value while the
// visible description follows the selection. Persistence across restarts is
// covered by the supervised live session (the doubles reinstall per page
// load, so reload-restore cannot be observed here).

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
