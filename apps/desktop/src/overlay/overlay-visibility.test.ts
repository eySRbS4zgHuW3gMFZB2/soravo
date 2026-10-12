import { describe, expect, it } from "vitest";
import {
  applyOverlayHide,
  applyOverlayShow,
  createOverlayVisibility,
  formatForSignal,
  selectOverlayText,
} from "./overlay-visibility";

describe("overlay visibility fold (R1 floating pill)", () => {
  it("starts hidden in the compact format", () => {
    expect(createOverlayVisibility()).toEqual({ visible: false, format: "compact" });
  });

  it("maps signals to formats: only streaming expands", () => {
    expect(formatForSignal("recording")).toBe("compact");
    expect(formatForSignal("streaming")).toBe("expanded");
    expect(formatForSignal("transcribing")).toBe("compact");
    expect(formatForSignal("processing")).toBe("compact");
  });

  it("shows the compact pill on recording/transcribing/processing", () => {
    for (const signal of ["recording", "transcribing", "processing"] as const) {
      expect(applyOverlayShow(createOverlayVisibility(), signal)).toEqual({
        visible: true,
        format: "compact",
      });
    }
  });

  it("shows the expanded card on streaming", () => {
    expect(applyOverlayShow(createOverlayVisibility(), "streaming")).toEqual({
      visible: true,
      format: "expanded",
    });
  });

  it("a later show signal re-targets the format (no stale format)", () => {
    const expanded = applyOverlayShow(createOverlayVisibility(), "streaming");
    expect(applyOverlayShow(expanded, "transcribing")).toEqual({
      visible: true,
      format: "compact",
    });
  });

  it("hide returns to hidden and resets the format", () => {
    const shown = applyOverlayShow(createOverlayVisibility(), "streaming");
    expect(applyOverlayHide(shown)).toEqual({ visible: false, format: "compact" });
  });

  it("hide without a prior show stays hidden", () => {
    expect(applyOverlayHide(createOverlayVisibility())).toEqual({
      visible: false,
      format: "compact",
    });
  });

  it("a show after a hide becomes visible again (stale hide cannot stick)", () => {
    const hidden = applyOverlayHide(applyOverlayShow(createOverlayVisibility(), "recording"));
    expect(applyOverlayShow(hidden, "recording")).toEqual({
      visible: true,
      format: "compact",
    });
  });
});

describe("overlay text source precedence (Live streaming display)", () => {
  it("prefers live stream content in the expanded card while present", () => {
    expect(
      selectOverlayText(true, { committed: "hello ", tentative: "wor" })
    ).toEqual({ kind: "stream", committed: "hello ", tentative: "wor" });
  });

  it("falls back to canonical when the stream snapshot is empty", () => {
    expect(selectOverlayText(true, { committed: "", tentative: "" })).toEqual({
      kind: "canonical",
    });
  });

  it("falls back to canonical with no stream snapshot", () => {
    expect(selectOverlayText(true, null)).toEqual({ kind: "canonical" });
  });

  it("never uses stream content in the compact pill", () => {
    expect(
      selectOverlayText(false, { committed: "hello ", tentative: "wor" })
    ).toEqual({ kind: "canonical" });
  });
});
