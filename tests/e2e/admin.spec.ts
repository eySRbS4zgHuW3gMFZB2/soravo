import { expect, test } from "@playwright/test";
import { openWithHeading, scenarioUrl } from "./helpers";

test.describe("admin authorization (WEB-010)", () => {
  test("a signed-in non-admin sees the owner-only block, never dashboard data", async ({ page }) => {
    await openWithHeading(page, "/admin", "user", "Owner access required.");
    await expect(page.getByText("This area is restricted to the product owner.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to your account" })).toBeVisible();
    await expect(page.getByText("Registered users")).toHaveCount(0);
  });
});

test.describe("admin dashboard aggregates (admin scenario)", () => {
  test("renders the overview stat cards with exact aggregates", async ({ page }) => {
    await openWithHeading(page, "/admin", "admin", "Owner dashboard.");

    await expect(page.getByText("Registered users")).toBeVisible();
    await expect(page.getByText("128", { exact: true })).toBeVisible();

    await expect(page.getByText("Paid users")).toBeVisible();
    await expect(page.getByText("12", { exact: true })).toBeVisible();

    await expect(page.getByText("Active (last 30 days)")).toBeVisible();
    await expect(page.getByText("38", { exact: true })).toBeVisible();

    await expect(page.getByText("Registered devices")).toBeVisible();
    await expect(page.getByText("44", { exact: true })).toBeVisible();
    await expect(page.getByText("31 macOS · 11 Windows · 2 Linux · 2 revoked")).toBeVisible();
  });

  test("renders growth controls and the subscription and lifetime distributions", async ({ page }) => {
    await openWithHeading(page, "/admin", "admin", "Owner dashboard.");

    const group = page.getByRole("group", { name: "Growth granularity" });
    await expect(group.getByRole("button", { name: "Per day" })).toHaveAttribute("aria-pressed", "true");
    await expect(group.getByRole("button", { name: "Per week" })).toHaveAttribute("aria-pressed", "false");
    await expect(group.getByRole("button", { name: "Per month" })).toHaveAttribute("aria-pressed", "false");

    await group.getByRole("button", { name: "Per week" }).click();
    await expect(group.getByRole("button", { name: "Per week" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "New user growth" })).toBeVisible();

    await expect(page.getByText("Monthly subscriptions")).toBeVisible();
    await expect(page.getByText("Subscription count: 425")).toBeVisible();

    await expect(page.getByText("Lifetime licences")).toBeVisible();
    await expect(page.getByText("Licence count: 124")).toBeVisible();

    await expect(page.getByText("Snapshot generated 2026-09-16 12:00:00Z (UTC).")).toBeVisible();
  });
});

test.describe("admin user directory (admin scenario)", () => {
  test("renders the first page of 25 users and pages forward", async ({ page }) => {
    await openWithHeading(page, "/admin", "admin", "Owner dashboard.");

    const directory = page.getByRole("region", { name: "User directory" });
    await expect(directory.getByText("Showing 25 users")).toBeVisible();
    await expect(directory.getByText("More results available.")).toBeVisible();
    await expect(directory.locator(".directory-user")).toHaveCount(25);
    await expect(directory.getByText("usr-000001")).toBeVisible();

    const pagination = page.getByRole("navigation", { name: "User directory pagination" });
    await expect(pagination.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(pagination.getByRole("button", { name: "Next page" })).toBeEnabled();

    await pagination.getByRole("button", { name: "Next page" }).click();
    await expect(directory.getByText("Showing 2 users")).toBeVisible();
    await expect(directory.locator(".directory-user")).toHaveCount(2);
    await expect(directory.getByText("usr-000026")).toBeVisible();
    await expect(directory.getByText("usr-000027")).toBeVisible();
    await expect(directory.getByText("More results available.")).toHaveCount(0);
    await expect(pagination.getByRole("button", { name: "Previous page" })).toBeEnabled();
  });

  test("search filters the directory by display name and email", async ({ page }) => {
    await openWithHeading(page, "/admin", "admin", "Owner dashboard.");

    const directory = page.getByRole("region", { name: "User directory" });
    await page.getByLabel("Search users").fill("gina");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(directory.getByText("gina@example.com")).toBeVisible({ timeout: 8_000 });
    await expect(directory.getByText("Showing 1 user")).toBeVisible();
    await expect(directory.locator(".directory-user")).toHaveCount(1);
  });

  test("a no-match search shows the empty result state", async ({ page }) => {
    await openWithHeading(page, "/admin", "admin", "Owner dashboard.");

    await page.getByLabel("Search users").fill("zzz-no-match");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page.getByText("No users match \"zzz-no-match\".")).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("admin account dashboard (admin scenario)", () => {
  test("renders populated entitlement, device, and session records", async ({ page }) => {
    await openWithHeading(page, "/account", "admin", "Your account dashboard.");

    await expect(page.getByText("Lifetime licence")).toBeVisible();
    await expect(page.getByText("Soravo Desktop")).toBeVisible();
    await expect(page.getByText("Lifetime — no renewal")).toBeVisible();

    await expect(page.getByText("dev-0000abcd")).toBeVisible();
    await expect(page.getByText("ses-0000wxyz")).toBeVisible();
    await expect(page.getByText("1.4.2", { exact: true })).toBeVisible();
  });
});