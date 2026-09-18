import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/** Mirrors `crate::session::SessionPhase` (SCREAMING_SNAKE_CASE serde). */
export type SessionPhase =
  | "IDLE"
  | "STARTING"
  | "LISTENING"
  | "TRANSCRIBING"
  | "FINALIZING"
  | "DONE"
  | "ERROR";

/** Mirrors `crate::commands::RuntimeStatus`. */
export type RuntimeStatus = {
  version: string;
  phase: SessionPhase;
  sessionId: number | null;
  sequence: number;
  localOnly: boolean;
  ready: boolean;
};

/** Mirrors `crate::commands::SessionSnapshot`. */
export type SessionSnapshot = {
  sessionId: number | null;
  phase: SessionPhase;
  sequence: number;
};

/** Mirrors `crate::session::SessionTransition`. */
export type SessionTransition = {
  sessionId: number | null;
  sequence: number;
  phase: SessionPhase;
  timestampMs: number;
};

/** Mirrors `crate::commands::PingReply`. */
export type PingReply = {
  sequence: number;
  timestampMs: number;
};

/** Mirrors `crate::events::SessionChangedPayload`. */
export type SessionChangedPayload = {
  event: "session://changed";
  transition: SessionTransition;
};

/** Mirrors `crate::events::PingPayload`. */
export type PingPayload = {
  event: "runtime://ping";
  sequence: number;
  timestampMs: number;
};

export const SESSION_CHANGED_EVENT = "session://changed";
export const PING_EVENT = "runtime://ping";

export function getRuntimeStatus(): Promise<RuntimeStatus> {
  return invoke<RuntimeStatus>("runtime_status");
}

export function ping(): Promise<PingReply> {
  return invoke<PingReply>("ping");
}

export function sessionSnapshot(): Promise<SessionSnapshot> {
  return invoke<SessionSnapshot>("session_snapshot");
}

export function sessionTransition(target: SessionPhase): Promise<SessionTransition> {
  return invoke<SessionTransition>("session_transition", { target });
}

export function sessionReset(): Promise<SessionTransition> {
  return invoke<SessionTransition>("session_reset");
}

export function emitPing(): Promise<PingReply> {
  return invoke<PingReply>("emit_ping");
}

/** Subscribe to authoritative session transitions. Returns an unsubscribe fn. */
export function onSessionChanged(
  handler: (payload: SessionChangedPayload) => void
): Promise<UnlistenFn> {
  return listen<SessionChangedPayload>(SESSION_CHANGED_EVENT, (event) =>
    handler(event.payload)
  );
}

/** Subscribe to runtime ping events. Returns an unsubscribe fn. */
export function onPing(handler: (payload: PingPayload) => void): Promise<UnlistenFn> {
  return listen<PingPayload>(PING_EVENT, (event) => handler(event.payload));
}