import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { changeOverlayStyle, getOverlayStyle } from "../../ipc";
import {
  describeOverlayStyleSetting,
  isOverlayStyleSetting,
  OVERLAY_STYLE_OPTIONS,
  parseOverlayStyleSetting,
} from "./overlay-style";
import { OverlayStyleSelect } from "./overlay-style-setting";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

beforeEach(() => {
  invoke.mockReset();
});

describe("overlay-style options (R1 selector metadata)", () => {
  it("exposes exactly the three canonical values with labels and descriptions", () => {
    expect(OVERLAY_STYLE_OPTIONS.map((option) => option.value)).toEqual([
      "none",
      "minimal",
      "live",
    ]);
    for (const option of OVERLAY_STYLE_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    }
    const descriptions = new Set(OVERLAY_STYLE_OPTIONS.map((option) => option.description));
    expect(descriptions.size).toBe(3);
  });

  it("describes each value including the hidden state", () => {
    expect(describeOverlayStyleSetting("none")).toMatch(/no floating pill/i);
    expect(describeOverlayStyleSetting("minimal")).toMatch(/small floating pill/i);
    expect(describeOverlayStyleSetting("live")).toMatch(/live transcription/i);
  });
});

describe("overlay-style parsing (stored-preference contract)", () => {
  it("passes every canonical value through verbatim", () => {
    expect(parseOverlayStyleSetting("none")).toBe("none");
    expect(parseOverlayStyleSetting("minimal")).toBe("minimal");
    expect(parseOverlayStyleSetting("live")).toBe("live");
  });

  it("never rewrites an explicitly stored none", () => {
    // A deliberately stored `"none"` is a user preference, not a missing
    // value — the selector must display it, not migrate it.
    expect(isOverlayStyleSetting("none")).toBe(true);
    expect(parseOverlayStyleSetting("none")).toBe("none");
  });

  it("falls back to minimal on missing or invalid values, mirroring the backend", () => {
    for (const invalid of [null, undefined, "", "bottom", "off", "NONE", 42, {}]) {
      expect(parseOverlayStyleSetting(invalid)).toBe("minimal");
      expect(isOverlayStyleSetting(invalid)).toBe(false);
    }
  });
});

describe("overlay-style ipc wrappers", () => {
  it("reads through get_overlay_style_setting", async () => {
    invoke.mockResolvedValue("minimal");
    await expect(getOverlayStyle()).resolves.toBe("minimal");
    expect(invoke).toHaveBeenCalledWith("get_overlay_style_setting");
  });

  it("writes through change_overlay_style_setting with the exact value", async () => {
    invoke.mockResolvedValue(null);
    await changeOverlayStyle("live");
    expect(invoke).toHaveBeenCalledWith("change_overlay_style_setting", {
      style: "live",
    });
    await changeOverlayStyle("none");
    expect(invoke).toHaveBeenCalledWith("change_overlay_style_setting", {
      style: "none",
    });
  });

  it("propagates backend failures so the UI can revert the display", async () => {
    invoke.mockRejectedValue(new Error("unknown-command"));
    await expect(changeOverlayStyle("minimal")).rejects.toThrow("unknown-command");
  });
});

describe("OverlayStyleSelect rendering", () => {
  it("renders all supported values with the stored one selected", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayStyleSelect, {
        value: "none",
        disabled: false,
        error: null,
        onChange: () => undefined,
      })
    );
    expect(html).toMatch(/<legend>Recording overlay<\/legend>/);
    expect(html).toMatch(/id="overlay-style"/);
    expect(html).toMatch(/aria-describedby="overlay-style-description"/);
    for (const value of ["none", "minimal", "live"]) {
      expect(html).toContain(`value="${value}"`);
    }
    // The stored preference is the selected option, not the default.
    expect(html).toMatch(/<option value="none" selected="">/);
    expect(html).toContain("No floating pill appears during dictation.");
  });

  it("marks the control disabled while a write is in flight", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayStyleSelect, {
        value: "minimal",
        disabled: true,
        error: null,
        onChange: () => undefined,
      })
    );
    expect(html).toMatch(/<select[^>]*disabled/);
  });

  it("surfaces write errors without losing the selector", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayStyleSelect, {
        value: "live",
        disabled: false,
        error: "backend unavailable",
        onChange: () => undefined,
      })
    );
    expect(html).toContain("backend unavailable");
    expect(html).toContain('value="live"');
  });
});
