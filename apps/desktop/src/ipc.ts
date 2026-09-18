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

/** Hotkey types mirroring Rust hotkeys crate. */
export type Modifiers = {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
};

export type KeyCode = 
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M"
  | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"
  | "DIGIT0" | "DIGIT1" | "DIGIT2" | "DIGIT3" | "DIGIT4"
  | "DIGIT5" | "DIGIT6" | "DIGIT7" | "DIGIT8" | "DIGIT9"
  | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12"
  | "ESCAPE" | "BACKSPACE" | "DELETE" | "END" | "ENTER" | "HOME" | "INSERT" | "SPACE" | "TAB"
  | "ARROWDOWN" | "ARROWLEFT" | "ARROWRIGHT" | "ARROWUP"
  | "VOLUME_DOWN" | "VOLUME_UP" | "MUTE";

export type HotkeyBinding = {
  modifiers: Modifiers;
  key: KeyCode;
};

export type InteractionMode = "hold_to_talk" | "toggle_to_talk";

export type HotkeyConfig = {
  binding: HotkeyBinding | null;
  mode: InteractionMode;
  enabled: boolean;
};

export type HotkeyResult = 
  | { status: "success"; message: string }
  | { status: "invalid"; code: string; message: string }
  | { status: "conflict"; conflicting_app: string; message: string };

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

// Hotkey commands

export function hotkeyConfig(): Promise<HotkeyConfig> {
  return invoke<HotkeyConfig>("hotkey_config");
}

export function setHotkeyConfig(config: HotkeyConfig): Promise<HotkeyResult> {
  return invoke<HotkeyResult>("set_hotkey_config", { config });
}

export function hotkeyStart(): Promise<HotkeyResult> {
  return invoke<HotkeyResult>("hotkey_start");
}

export function hotkeyStop(): Promise<HotkeyResult> {
  return invoke<HotkeyResult>("hotkey_stop");
}

export function hotkeyToggle(): Promise<HotkeyResult> {
  return invoke<HotkeyResult>("hotkey_toggle");
}

export function hotkeyRecording(): Promise<boolean> {
  return invoke<boolean>("hotkey_recording");
}

export function hotkeyCheckConflicts(binding: HotkeyBinding | null): Promise<HotkeyResult> {
  return invoke<HotkeyResult>("hotkey_check_conflicts", { binding });
}