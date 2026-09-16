import { expect, test } from "@playwright/test";
import { openWithHeading, scenarioUrl } from "./helpers";

test.describe("public navigation (anon/inert)", () => {
  test("top navigation reaches the main public pages", async ({ page }) => {
    await page.goto(scenarioUrl("/", "anon"));
    await expect(page.getByRole("heading", { name: /Keep it yours/ })).toBeVisible();

    await page.getByRole("link", { name: "Features" }).click();
    await expect(page.getByRole("heading", { name: "Built for professionals." })).toBeVisible();

    await page.getByRole("link", { name: "Pricing" }).click();
    await expect(page.getByRole("heading", { name: "Transparent pricing. No data trade." })).toBeVisible();

    await page.getByRole("link", { name: "FAQ" }).click();
    await expect(page.getByRole("heading", { name: "Good questions." })).toBeVisible();

    await page.getByRole("link", { name: "Get Soravo" }).click();
    await expect(page.getByRole("heading", { name: "Install Soravo on your desktop." })).toBeVisible();
  });

  test("footer account link opens the sign-in page", async ({ page }) => {
    await openWithHeading(page, "/", "anon", /Keep it yours/);
    await page.getByRole("link", { name: "Account", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account." })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("an unknown route renders the not-found page", async ({ page }) => {
    await openWithHeading(page, "/no-such-page", "anon", "This page does not exist.");
    await expect(page.getByRole("link", { name: "Back to the home page" })).toBeVisible();
  });
});

test.describe("basic accessibility structure (WEB-010)", () => {
  test("exposes skip link, banner, main, and contentinfo landmarks", async ({ page }) => {
    await openWithHeading(page, "/", "anon", /Keep it yours/);

    await expect(page.getByRole("link", { name: "Skip to content" })).toBeVisible();
    await page.getByRole("link", { name: "Skip to content" }).focus();
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("interactive pages have single page-level headings and labeled forms", async ({ page }) => {
    await openWithHeading(page, "/login", "anon", "Sign in to your account.");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel(/^Password/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
});