import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { changeOverlayPosition, getOverlayPosition } from "../../ipc";
import {
  describeOverlayPositionSetting,
  isOverlayPositionSetting,
  OVERLAY_POSITION_OPTIONS,
  parseOverlayPositionSetting,
} from "./overlay-position";
import { OverlayPositionSelect } from "./overlay-position-setting";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

beforeEach(() => {
  invoke.mockReset();
});

describe("overlay-position options (R1 selector metadata)", () => {
  it("exposes exactly the two canonical values with labels and descriptions", () => {
    expect(OVERLAY_POSITION_OPTIONS.map((option) => option.value)).toEqual([
      "top",
      "bottom",
    ]);
    for (const option of OVERLAY_POSITION_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    }
    const descriptions = new Set(OVERLAY_POSITION_OPTIONS.map((option) => option.description));
    expect(descriptions.size).toBe(2);
  });

  it("describes each edge including the bottom default", () => {
    expect(describeOverlayPositionSetting("top")).toMatch(/top edge/i);
    expect(describeOverlayPositionSetting("bottom")).toMatch(/bottom edge/i);
  });
});

describe("overlay-position parsing (stored-preference contract)", () => {
  it("passes every canonical value through verbatim", () => {
    expect(parseOverlayPositionSetting("top")).toBe("top");
    expect(parseOverlayPositionSetting("bottom")).toBe("bottom");
  });

  it("folds the retired none and any invalid value onto bottom, mirroring the backend", () => {
    // `"none"` is retired as a position (visibility is owned by
    // overlay_style); the backend deserializes it to Bottom via serde alias
    // and folds it there on write. The selector must agree, never invent a
    // third state.
    for (const invalid of ["none", null, undefined, "", "center", "TOP", 42, {}]) {
      expect(parseOverlayPositionSetting(invalid)).toBe("bottom");
      expect(isOverlayPositionSetting(invalid)).toBe(false);
    }
  });
});

describe("overlay-position ipc wrappers", () => {
  it("reads through get_overlay_position_setting", async () => {
    invoke.mockResolvedValue("bottom");
    await expect(getOverlayPosition()).resolves.toBe("bottom");
    expect(invoke).toHaveBeenCalledWith("get_overlay_position_setting");
  });

  it("writes through change_overlay_position_setting with the exact value", async () => {
    invoke.mockResolvedValue(null);
    await changeOverlayPosition("top");
    expect(invoke).toHaveBeenCalledWith("change_overlay_position_setting", {
      position: "top",
    });
    await changeOverlayPosition("bottom");
    expect(invoke).toHaveBeenCalledWith("change_overlay_position_setting", {
      position: "bottom",
    });
  });

  it("propagates backend failures so the UI can revert the display", async () => {
    invoke.mockRejectedValue(new Error("unknown-command"));
    await expect(changeOverlayPosition("top")).rejects.toThrow("unknown-command");
  });

  it("never routes through inject_text or session commands", async () => {
    invoke.mockResolvedValue("top");
    await getOverlayPosition();
    invoke.mockResolvedValue(null);
    await changeOverlayPosition("bottom");
    const invoked = invoke.mock.calls.map((call) => call[0]);
    expect(invoked).toEqual([
      "get_overlay_position_setting",
      "change_overlay_position_setting",
    ]);
    expect(invoked).not.toContain("inject_text");
    expect(invoked).not.toContain("session_transition");
  });
});

describe("OverlayPositionSelect rendering", () => {
  it("renders both edges with the stored one selected", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayPositionSelect, {
        value: "bottom",
        disabled: false,
        error: null,
        onChange: () => undefined,
      })
    );
    expect(html).toMatch(/<legend>Overlay position<\/legend>/);
    expect(html).toMatch(/id="overlay-position"/);
    expect(html).toMatch(/aria-describedby="overlay-position-description"/);
    for (const value of ["top", "bottom"]) {
      expect(html).toContain(`value="${value}"`);
    }
    // The stored preference is the selected option, not the default.
    expect(html).toMatch(/<option value="bottom" selected="">/);
    expect(html).toContain("near the bottom edge");
  });

  it("marks the control disabled while a write is in flight", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayPositionSelect, {
        value: "top",
        disabled: true,
        error: null,
        onChange: () => undefined,
      })
    );
    expect(html).toMatch(/<select[^>]*disabled/);
  });

  it("surfaces write errors without losing the selector", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayPositionSelect, {
        value: "top",
        disabled: false,
        error: "backend unavailable",
        onChange: () => undefined,
      })
    );
    expect(html).toContain("backend unavailable");
    expect(html).toContain('value="top"');
  });
});
