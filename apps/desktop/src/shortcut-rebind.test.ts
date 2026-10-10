import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeHotkeyBinding,
  resetHotkeyBinding,
  suspendHotkeyBindings,
  resumeHotkeyBindings,
  formatHotkeyFromKeyboardEvent,
} from "./ipc";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

beforeEach(() => {
  invoke.mockReset();
});

function keyEvent(overrides: Partial<{
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}> = {}) {
  return {
    key: " ",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...overrides,
  };
}

describe("G2 hotkey-rebind combo formatting", () => {
  it("formats ctrl+space like the shipped default", () => {
    expect(formatHotkeyFromKeyboardEvent(keyEvent({ key: " ", ctrlKey: true }))).toBe(
      "ctrl+space",
    );
  });

  it("orders modifiers ctrl/shift/alt/super before the key", () => {
    expect(
      formatHotkeyFromKeyboardEvent(
        keyEvent({ key: "F13", ctrlKey: true, shiftKey: true }),
      ),
    ).toBe("ctrl+shift+f13");
  });

  it("maps meta to the backend-accepted super token", () => {
    expect(formatHotkeyFromKeyboardEvent(keyEvent({ key: " ", metaKey: true }))).toBe(
      "super+space",
    );
  });

  it("passes a bare letter through lowercased", () => {
    expect(formatHotkeyFromKeyboardEvent(keyEvent({ key: "K" }))).toBe("k");
  });

  it("returns null for modifier-only keydowns (combo incomplete)", () => {
    expect(formatHotkeyFromKeyboardEvent(keyEvent({ key: "Control", ctrlKey: true }))).toBeNull();
    expect(formatHotkeyFromKeyboardEvent(keyEvent({ key: "Shift", shiftKey: true }))).toBeNull();
    expect(formatHotkeyFromKeyboardEvent(keyEvent({ key: "Alt", altKey: true }))).toBeNull();
    expect(formatHotkeyFromKeyboardEvent(keyEvent({ key: "Meta", metaKey: true }))).toBeNull();
  });
});

describe("G2 hotkey-rebind bridge commands", () => {
  it("commits through the change_binding command", () => {
    changeHotkeyBinding("transcribe", "ctrl+space");
    expect(invoke).toHaveBeenCalledWith("change_binding", {
      id: "transcribe",
      binding: "ctrl+space",
    });
  });

  it("resets through the reset_binding command", () => {
    resetHotkeyBinding("transcribe");
    expect(invoke).toHaveBeenCalledWith("reset_binding", { id: "transcribe" });
  });

  it("suspends captures through suspend_all_bindings", () => {
    suspendHotkeyBindings();
    expect(invoke).toHaveBeenCalledWith("suspend_all_bindings");
  });

  it("resumes captures through resume_all_bindings", () => {
    resumeHotkeyBindings();
    expect(invoke).toHaveBeenCalledWith("resume_all_bindings");
  });
});
