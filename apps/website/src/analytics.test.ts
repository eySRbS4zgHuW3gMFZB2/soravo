import { afterEach, describe, expect, it, vi } from "vitest";

async function loadAnalyticsModule() {
  vi.resetModules();
  return await import("./lib/analytics");
}

describe("website analytics boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.querySelectorAll("script[data-website-id]").forEach((node) => node.remove());
    window.umami = undefined;
  });

  it("stays inert when no Umami configuration exists", async () => {
    const { loadAnalytics, trackEvent, isAnalyticsEnabled } = await loadAnalyticsModule();
    expect(isAnalyticsEnabled()).toBe(false);
    loadAnalytics();
    expect(document.head.querySelector("script[data-website-id]")).toBeNull();
    expect(() => trackEvent("signup cta", { source: "pricing" })).not.toThrow();
  });

  it("never reports website-behavior events when analytics is disabled", async () => {
    const track = vi.fn();
    window.umami = { track };
    const { trackEvent } = await loadAnalyticsModule();
    trackEvent("signup cta", { source: "pricing" });
    expect(track).not.toHaveBeenCalled();
  });

  it("injects the tracker once when a configured host and website ID exist", async () => {
    vi.stubEnv("VITE_UMAMI_HOST_URL", "https://analytics.example.com");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "abc-123");
    const { loadAnalytics, isAnalyticsEnabled } = await loadAnalyticsModule();
    expect(isAnalyticsEnabled()).toBe(true);
    loadAnalytics();
    const script = document.head.querySelector("script[data-website-id]");
    expect(script).not.toBeNull();
    expect(script?.getAttribute("src")).toBe("https://analytics.example.com/script.js");
    expect(script?.getAttribute("data-website-id")).toBe("abc-123");
    expect(script?.getAttribute("data-host-url")).toBe("https://analytics.example.com");
    expect(script?.getAttribute("data-exclude-search")).toBe("true");
    expect(script?.getAttribute("data-exclude-hash")).toBe("true");
    loadAnalytics();
    expect(document.head.querySelectorAll("script[data-website-id]")).toHaveLength(1);
  });

  it("rejects non-http(s) hosts instead of injecting them", async () => {
    vi.stubEnv("VITE_UMAMI_HOST_URL", "javascript:alert(1)");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "abc-123");
    const { loadAnalytics, isAnalyticsEnabled } = await loadAnalyticsModule();
    expect(isAnalyticsEnabled()).toBe(true);
    loadAnalytics();
    expect(document.head.querySelector("script[data-website-id]")).toBeNull();
  });

  it("reports website-behavior events through the tracker when enabled", async () => {
    vi.stubEnv("VITE_UMAMI_HOST_URL", "https://analytics.example.com");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "abc-123");
    const track = vi.fn();
    window.umami = { track };
    const { trackEvent } = await loadAnalyticsModule();
    trackEvent("signup cta", { source: "support" });
    expect(track).toHaveBeenCalledWith("signup cta", { source: "support" });
  });
});