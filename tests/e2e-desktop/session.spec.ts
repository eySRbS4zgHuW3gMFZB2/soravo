import { expect, test } from "@playwright/test";
import { e2eCall, injectTexts, invokeCommands, openDesktop, sessionState } from "./helpers";

// R1-GAP-028 — desktop session lifecycle E2E (mocked devices/models).
//
// Covers: deterministic startup, session start/stop, state transitions,
// transcript delivery (tentative preview vs committed/final), finalization,
// exactly-once text injection, and cleanup between runs. Real user-visible
// behavior of the SHIPPED shell (`app.tsx` + pill + feeds) over
// deterministic doubles — no microphone, no model downloads, no network.

test.describe("desktop session lifecycle", () => {
  test("deterministic startup: ready shell, no session, no leaks", async ({ page }) => {
    await openDesktop(page, "ready");

    await expect(page.getByRole("heading", { name: "Ready", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start session" })).toBeVisible();
    await expect(page.getByText("Your audio pipeline will be warmed")).toBeVisible();

    const state = await sessionState(page);
    expect(state).toEqual({ sessionId: null, phase: "IDLE", sequence: 0 });
    expect(await injectTexts(page)).toEqual([]);
  });

  test("session start/stop drives the canonical ladder", async ({ page }) => {
    await openDesktop(page, "ready");

    await page.getByRole("button", { name: "Start session" }).click();
    await expect(page.getByRole("heading", { name: "Listening" })).toBeVisible();
    await expect(page.getByText(/Session #\d+ in flight/)).toBeVisible();
    await expect(page.getByRole("button", { name: "End session" })).toBeVisible();

    const started = await sessionState(page);
    expect(started.phase).toBe("LISTENING");
    expect(started.sessionId).not.toBeNull();

    await page.getByRole("button", { name: "End session" }).click();
    await expect(page.getByRole("heading", { name: "Done" })).toBeVisible();

    const done = await sessionState(page);
    expect(done.phase).toBe("DONE");
    expect(done.sessionId).toBe(started.sessionId);
  });

  test("transcript delivery: tentative previews, committed/final inject exactly once", async ({
    page,
  }) => {
    await openDesktop(page, "ready");
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(page.getByRole("heading", { name: "Listening" })).toBeVisible();

    // Tentative text previews in the pill but is NEVER injected.
    await e2eCall(page, `emitTranscript("Tentative", "hello wor")`);
    await expect(page.locator(".pill-transcript")).toContainText("hello wor");
    expect(await injectTexts(page)).toEqual([]);

    // Committed text is stable: displayed AND injected exactly once.
    await e2eCall(page, `emitTranscript("Committed", "hello world")`);
    await expect(page.locator(".pill-transcript")).toContainText("hello world");
    await expect.poll(() => injectTexts(page)).toEqual(["hello world"]);

    // Final text completes the turn: injected exactly once more.
    await e2eCall(page, `emitTranscript("Final", "hello world.")`);
    await expect.poll(() => injectTexts(page)).toEqual(["hello world", "hello world."]);

    // The injection path used the canonical command.
    expect(await invokeCommands(page)).toContain("inject_text");
  });

  test("cleanup: a fresh load carries no stale session or transcript", async ({ page }) => {
    await openDesktop(page, "ready");
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(page.getByRole("heading", { name: "Listening" })).toBeVisible();
    await e2eCall(page, `emitTranscript("Final", "stale probe")`);
    await expect.poll(() => injectTexts(page)).toEqual(["stale probe"]);

    await page.goto(`/?test-scenario=ready`);
    await openDesktop(page, "ready");

    const state = await sessionState(page);
    expect(state).toEqual({ sessionId: null, phase: "IDLE", sequence: 0 });
    expect(await injectTexts(page)).toEqual([]);
    await expect(page.locator(".pill-transcript")).toHaveCount(0);
  });
});
