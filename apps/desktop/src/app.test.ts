import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_CHANGED_EVENT,
  PING_EVENT,
  getRuntimeStatus,
  ping,
  sessionTransition,
  sessionReset,
  onSessionChanged,
  onPing,
} from "./ipc";
import { PHASE_LABEL } from "./app";

const invoke = vi.hoisted(() => vi.fn());
const listen = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

beforeEach(() => {
  invoke.mockReset();
  listen.mockReset();
});

describe("runtime bridge events", () => {
  it("exposes the typed session event contract", () => {
    expect(SESSION_CHANGED_EVENT).toBe("session://changed");
    expect(PING_EVENT).toBe("runtime://ping");
  });

  it("subscribes to session transitions under the stable event name", async () => {
    const handler = vi.fn();
    listen.mockResolvedValueOnce(() => undefined);
    await onSessionChanged(handler);
    expect(listen).toHaveBeenCalledWith("session://changed", expect.any(Function));
  });

  it("subscribes to runtime pings under the ping event name", async () => {
    listen.mockResolvedValueOnce(() => undefined);
    await onPing(() => undefined);
    expect(listen).toHaveBeenCalledWith("runtime://ping", expect.any(Function));
  });
});

describe("runtime bridge commands", () => {
  it("invokes runtime_status through the expected command", () => {
    getRuntimeStatus();
    expect(invoke).toHaveBeenCalledWith("runtime_status");
  });

  it("routes session transitions to the machine command", () => {
    sessionTransition("LISTENING");
    expect(invoke).toHaveBeenCalledWith("session_transition", { target: "LISTENING" });
  });

  it("routes session reset to the machine command", () => {
    sessionReset();
    expect(invoke).toHaveBeenCalledWith("session_reset");
  });

  it("probes the runtime through ping", () => {
    ping();
    expect(invoke).toHaveBeenCalledWith("ping");
  });
});

describe("shell copy", () => {
  it("maps every session phase to a stable label", () => {
    expect(PHASE_LABEL.IDLE).toBe("Ready");
    expect(PHASE_LABEL.LISTENING).toBe("Listening");
    expect(PHASE_LABEL.ERROR).toBe("Error");
  });
});