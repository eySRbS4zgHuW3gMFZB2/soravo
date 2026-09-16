import { expect, test } from "@playwright/test";
import { E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD } from "../../apps/website/src/test-utils/e2e-fixtures";
import { openWithHeading, scenarioUrl } from "./helpers";

test.describe("unauthenticated access (anon scenario)", () => {
  test("account route is guarded until sign-in", async ({ page }) => {
    await openWithHeading(page, "/account", "anon", "Sign in to view your account.");
    await page.getByRole("link", { name: "Go to sign in" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account." })).toBeVisible();
  });

  test("admin route is guarded until sign-in", async ({ page }) => {
    await openWithHeading(page, "/admin", "anon", "Sign in to view the owner dashboard.");
  });
});

test.describe("sign-in flow (anon scenario)", () => {
  test("signs in and lands on a populated account dashboard", async ({ page }) => {
    await openWithHeading(page, "/login", "anon", "Sign in to your account.");
    await page.getByLabel("Email").fill(E2E_LOGIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_LOGIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/account");
    await expect(page.getByRole("heading", { name: "Your account dashboard." })).toBeVisible();
    await expect(page.getByText("Signed in as").locator("..")).toContainText(E2E_LOGIN_EMAIL);
  });

  test("a failed sign-in collapses to the generic message, never raw server detail", async ({ page }) => {
    await openWithHeading(page, "/login", "anon", "Sign in to your account.");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("We couldn't sign you in. Check your email and password, then try again."),
    ).toBeVisible();
    await expect(page.getByText("Invalid login credentials")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Sign in to your account." })).toBeVisible();
  });

  test("account shows empty states when a fresh user has no records", async ({ page }) => {
    await openWithHeading(page, "/login", "anon", "Sign in to your account.");
    await page.getByLabel("Email").fill(E2E_LOGIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_LOGIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/account");

    await expect(
      page.getByText("No license records to show yet. Purchase and billing arrive in a later milestone."),
    ).toBeVisible();
    await expect(
      page.getByText("No devices recorded yet. This one appears once the desktop app signs in."),
    ).toBeVisible();
    await expect(page.getByText("No active sessions to show.")).toBeVisible();
  });

  test("display name and password updates follow the account flows", async ({ page }) => {
    await page.goto(scenarioUrl("/login", "anon"));
    await page.getByLabel("Email").fill(E2E_LOGIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_LOGIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/account");

    await page.getByLabel("Display name").fill("Ada Lovelace");
    await page.getByRole("button", { name: "Save display name" }).click();
    await expect(page.getByText("Display name updated.")).toBeVisible();

    await page.getByLabel(/New password/).fill("a-very-long-new-password");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password updated. Use it next time you sign in.")).toBeVisible();
  });
});

test.describe("signed-in standard user (user scenario)", () => {
  test("account dashboard renders profile and empty states", async ({ page }) => {
    await openWithHeading(page, "/account", "user", "Your account dashboard.");
    await expect(page.getByText("Signed in as").locator("..")).toContainText("tester@example.com");
    await expect(page.getByText("Profile ready")).toBeVisible();
    await expect(page.getByText("No devices recorded yet. This one appears once the desktop app signs in.")).toBeVisible();
  });

  test("sign out locally returns the account to the guard state", async ({ page }) => {
    await openWithHeading(page, "/account", "user", "Your account dashboard.");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sign in to view your account." })).toBeVisible();
  });
});