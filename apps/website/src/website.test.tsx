import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "./app";

afterEach(cleanup);
afterEach(() => {
  vi.unstubAllEnvs();
  window.umami = undefined;
});

async function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
  await screen.findByRole("main");
}

describe("website shell", () => {
  it("renders the landing page privacy promise", async () => {
    await renderAt("/");
    expect(await screen.findByText(/privacy commitment/i)).toBeTruthy();
  });

  it("renders dedicated core content pages", async () => {
    await renderAt("/privacy");
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toContain("words are not");
  });

  it("shows the not-found page for unknown routes", async () => {
    await renderAt("/does-not-exist");
    expect(await screen.findByText(/this page does not exist/i)).toBeTruthy();
  });

  it("states the focused product scope on the landing", async () => {
    await renderAt("/");
    expect(await screen.findByText(/not a meeting intelligence platform/i)).toBeTruthy();
  });

  it("renders features capabilities as cards with proper heading hierarchy", async () => {
    await renderAt("/features");
    const h3s = await screen.findAllByRole("heading", { level: 3 });
    expect(h3s.length).toBeGreaterThanOrEqual(6);
    expect(await screen.findByText(/configurable global hotkey/i)).toBeTruthy();
  });

  it("labels pricing targets as evaluated, not offers", async () => {
    await renderAt("/pricing");
    const evaluated = await screen.findAllByText(/evaluated target/i);
    expect(evaluated.length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText(/nothing is billed today/i)).toBeTruthy();
  });

  it("shows staged download cards with checksum verification note", async () => {
    await renderAt("/download");
    const noBuild = await screen.findAllByText(/no build yet/i);
    expect(noBuild.length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText(/SHA-256 checksums/i)).toBeTruthy();
  });

  it("renders the expanded FAQ with cost and verification answers", async () => {
    await renderAt("/faq");
    expect(await screen.findByText(/how much will soravo cost/i)).toBeTruthy();
    expect(await screen.findByText(/how will downloads be verified/i)).toBeTruthy();
  });

  it("states the precise on-device boundary and analytics split on privacy", async () => {
    await renderAt("/privacy");
    const keystrokes = await screen.findAllByText(/keystrokes/i);
    expect(keystrokes.length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText(/Umami/)).toBeTruthy();
    expect(await screen.findByText(/account, entitlement, device, and session metadata/i)).toBeTruthy();
    expect(await screen.findByText(/no cloud transcript synchronization/i)).toBeTruthy();
  });

  it("frames terms as prepared, not binding, and not billed", async () => {
    await renderAt("/terms");
    expect(await screen.findByText(/nothing below is a binding offer/i)).toBeTruthy();
    expect(await screen.findByText(/nothing is billed today/i)).toBeTruthy();
    expect(await screen.findByText(/provided as-is, without warranty/i)).toBeTruthy();
  });

  it("frames refund as prepared with the payment flow and not yet applicable", async () => {
    await renderAt("/refund");
    expect(await screen.findByText(/nothing is billed today/i)).toBeTruthy();
    expect(await screen.findByText(/no refund or cancellation process exists/i)).toBeTruthy();
  });

  it("provides a working support launcher with a documented response commitment", async () => {
    await renderAt("/support");
    expect(await screen.findByText(/two business days/i)).toBeTruthy();
    expect((await screen.findByRole("button", { name: /email the team/i })).getAttribute("href")).toBe(
      "mailto:support@soravo.app",
    );
    expect(await screen.findByText(/never need to send audio or dictated transcripts/i)).toBeTruthy();
  });

  it("reports the pricing launch-list CTA as a website-behavior signup event", async () => {
    vi.stubEnv("VITE_UMAMI_HOST_URL", "https://analytics.example.com");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "abc-123");
    const track = vi.fn();
    window.umami = { track };
    await renderAt("/pricing");
    fireEvent.click(await screen.findByRole("button", { name: /join the launch list/i }));
    expect(track).toHaveBeenCalledWith("signup cta", { source: "pricing" });
  });
});

describe("accessibility", () => {
  it("renders a skip link targeting #main", async () => {
    await renderAt("/");
    const link = screen.getByRole("link", { name: /skip to content/i });
    expect(link.getAttribute("href")).toBe("#main");
  });

  it("renders main landmark with id main", async () => {
    await renderAt("/");
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
  });

  it("labels the header navigation as Main navigation", async () => {
    await renderAt("/");
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeTruthy();
  });

  it("labels the footer navigation as Legal and account links", async () => {
    await renderAt("/");
    expect(screen.getByRole("navigation", { name: /legal and account links/i })).toBeTruthy();
  });

  it("renders exactly one h1 per page", async () => {
    await renderAt("/");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    cleanup();
    await renderAt("/features");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("treats render-override CTA buttons as non-native buttons", async () => {
    await renderAt("/features");
    const button = await screen.findByRole("button", { name: /get soravo/i });
    expect(button.tagName).toBe("A");
    expect(button.getAttribute("role")).toBe("button");
    expect(button.getAttribute("tabindex")).toBe("0");
  });

  it("keeps disabled buttons as button semantics", async () => {
    await renderAt("/pricing");
    const buttons = await screen.findAllByRole("button", { name: /coming soon/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0]!.tagName).toBe("BUTTON");
  });
});
