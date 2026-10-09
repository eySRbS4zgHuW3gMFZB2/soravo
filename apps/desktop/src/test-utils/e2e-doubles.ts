// R1-GAP-028 — deterministic desktop E2E doubles (mocked devices/models).
//
// Dev-only Tauri test double installed by `e2e-harness.tsx` (which `main.tsx`
// loads solely when `DEV && VITE_E2E_TEST_MODE === "true"`). It stubs
// `window.__TAURI_INTERNALS__.invoke` / `transformCallback` /
// `unregisterCallback` — the exact seam `@tauri-apps/api@2` (`core.js`,
// `event.js`) calls — so the SHIPPED frontend (`app.tsx`, pill, feeds,
// settings, history, model selector) runs unmodified in a plain Chromium
// driven by Playwright.
//
// What is mocked (deterministic, local, no hardware/network/downloads):
// - audio devices: the microphone UI owns a simulated device list already
//   (`microphone-settings.tsx` — no IPC enumeration exists); the doubles own
//   the persisted settings (`load_settings` / `update_*`) around it.
// - models: a two-entry catalog double (`parakeet-ready` downloaded+active,
//   `whisper-large` available) with download progress/completion/cancel and
//   canonical `set_active_model` validation (rejects not-downloaded).
// - session/transcript/injection/history/account/ping IPC + the typed event
//   buses (`session://changed`, `transcript://update`, model + history
//   buses). Tests drive backend traffic explicitly through
//   `window.__SORAVO_E2E__` — no timers, no polling, no flakes.
//
// Production boundaries preserved: `account_sign_in` fails closed (T14 STOP
// design), `inject_text` semantics stay committed/final-only in the app
// layer, and this module ships in no production bundle (harness-gated).

import type {
  HistoryEntry,
  ModelInfo,
  PaginatedHistory,
  SessionPhase,
} from "../ipc";
import {
  HISTORY_UPDATE_EVENT,
  MODEL_DOWNLOAD_CANCELLED_EVENT,
  MODEL_DOWNLOAD_COMPLETE_EVENT,
  MODEL_DOWNLOAD_PROGRESS_EVENT,
  MODEL_STATE_CHANGED_EVENT,
  MODELS_UPDATED_EVENT,
  SESSION_CHANGED_EVENT,
  TRANSCRIPT_UPDATE_EVENT,
} from "../ipc";

export type E2EScenario = "ready" | "no-models" | "download-pending";

export function resolveScenario(raw: string | null): E2EScenario {
  if (raw === "no-models") return "no-models";
  if (raw === "download-pending") return "download-pending";
  return "ready";
}

type SessionState = {
  sessionId: number | null;
  phase: SessionPhase;
  sequence: number;
};

type InvokeCall = { cmd: string; args: Record<string, unknown> };

type Internals = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  transformCallback: (cb: (msg: unknown) => void) => number;
  unregisterCallback: (id: number) => void;
};

export type E2EControl = {
  scenario: E2EScenario;
  /** Full deterministic session snapshot (mirrors `session_snapshot`). */
  sessionState: () => SessionState;
  /** Every `invoke` the app issued since install/reset (in order). */
  invokeCalls: () => InvokeCall[];
  /** Every text passed to `inject_text` (in order). */
  injectTexts: () => string[];
  /** Drive one canonical session transition onto `session://changed`. */
  emitSession: (phase: SessionPhase) => void;
  /** Drive one transcript update onto `transcript://update`. */
  emitTranscript: (
    kind: "Tentative" | "Committed" | "Final",
    text: string,
  ) => void;
  /** Finish an in-flight mocked download (marks installed + emits buses). */
  completeDownload: (modelId: string) => void;
  /** Fail an in-flight mocked download (emits the failure bus). */
  failDownload: (modelId: string, error: string) => void;
  /** Restore pristine scenario state (proves no stale leaks between runs). */
  reset: () => void;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: Internals;
    __SORAVO_E2E__?: E2EControl;
  }
}

// `@tauri-apps/api` already declares
// `window.__TAURI_EVENT_PLUGIN_INTERNALS__` (non-optional) in its own types,
// so the doubles assign through it without redeclaring the global.

const E2E_VERSION = "0.1.0-e2e";

function readyModel(): ModelInfo {
  return {
    id: "parakeet-ready",
    name: "Parakeet Mock (ready)",
    description: "Deterministic E2E double — downloaded and active.",
    filename: "parakeet-mock.bin",
    source: "Local",
    size_mb: 42,
    is_downloaded: true,
    is_downloading: false,
    partial_size: 0,
    is_directory: false,
    engine_type: "Parakeet",
    accuracy_score: 0.9,
    speed_score: 0.9,
    supports_translation: false,
    is_recommended: true,
    supported_languages: ["en"],
    supports_language_selection: false,
    is_custom: false,
    supports_streaming: true,
    supports_language_detection: false,
    attribution: null,
  };
}

function availableModel(): ModelInfo {
  return {
    ...readyModel(),
    id: "whisper-large-mock",
    name: "Whisper Mock (not installed)",
    description: "Deterministic E2E double — available, never downloaded.",
    filename: "whisper-mock.bin",
    // Only HuggingFace-sourced entries have a download path
    // (`model-feed.ts isDownloadable`); `Local` would refuse with
    // "No download source for model".
    source: { HuggingFace: { repo_id: "e2e/whisper-mock", revision: "e2e" } },
    is_downloaded: false,
    engine_type: "TranscribeCpp",
    is_recommended: false,
  };
}

function historyFixtures(): HistoryEntry[] {
  return [
    {
      id: 2,
      file_name: "e2e-second.txt",
      timestamp: 1_769_000_002,
      saved: false,
      title: "Second dictation",
      transcription_text: "second getattr result",
      post_processed_text: null,
      post_process_prompt: null,
      post_process_requested: false,
    },
    {
      id: 1,
      file_name: "e2e-first.txt",
      timestamp: 1_769_000_001,
      saved: true,
      title: "First dictation",
      transcription_text: "first getattr result",
      post_processed_text: "First getattr result.",
      post_process_prompt: null,
      post_process_requested: false,
    },
  ];
}

function defaultSettings(scenario: E2EScenario) {
  // `download-pending` persists a pre-selected not-installed model — the
  // only reachable pre-download state, mirroring a catalog entry chosen
  // before its asset arrived (selection itself stays downloaded-only).
  if (scenario === "download-pending") {
    return {
      schema: { version: 1, lastMigrated: null },
      microphone: {
        selectedDeviceIndex: "0",
        selectedDeviceName: "Mock Microphone",
        deviceAvailable: true,
        autoFallback: true,
      },
      hotkey: {
        binding: null,
        mode: "hold_to_talk" as const,
        enabled: true,
        recordingInProgress: false,
      },
      model: {
        selectedEngine: "TranscribeCpp",
        selectedModel: "whisper-large-mock",
        available: false,
        status: "not_installed" as const,
      },
    };
  }
  return {
    schema: { version: 1, lastMigrated: null },
    microphone: {
      selectedDeviceIndex: "0",
      selectedDeviceName: "Mock Microphone",
      deviceAvailable: true,
      autoFallback: true,
    },
    hotkey: {
      binding: null,
      mode: "hold_to_talk" as const,
      enabled: true,
      recordingInProgress: false,
    },
    model: {
      selectedEngine: "Parakeet",
      selectedModel: scenario === "ready" ? "parakeet-ready" : null,
      available: scenario === "ready",
      status: (scenario === "ready" ? "ready" : "not_installed") as
        | "not_installed"
        | "downloading"
        | "verifying"
        | "ready"
        | "error",
    },
  };
}

export function installDoubles(scenario: E2EScenario): E2EControl {
  let session: SessionState = { sessionId: null, phase: "IDLE", sequence: 0 };
  let calls: InvokeCall[] = [];
  let injectTexts: string[] = [];
  let models: ModelInfo[] = scenario === "no-models" ? [] : [readyModel(), availableModel()];
  let activeModelId = scenario === "no-models" ? "" : "parakeet-ready";
  let settings = defaultSettings(scenario);
  let history: HistoryEntry[] = historyFixtures();
  let nextSessionId = 7;
  let nextEventId = 1;
  let nextCallbackId = 1;
  const callbacks = new Map<number, (msg: unknown) => void>();
  const listeners = new Map<string, Map<number, number>>();

  function dispatch(event: string, payload: unknown): void {
    const subs = listeners.get(event);
    if (!subs) return;
    for (const callbackId of subs.values()) {
      const cb = callbacks.get(callbackId);
      if (cb) cb({ event, payload });
    }
  }

  function emitSessionChanged(): void {
    dispatch(SESSION_CHANGED_EVENT, {
      event: SESSION_CHANGED_EVENT,
      transition: {
        sessionId: session.sessionId,
        sequence: session.sequence,
        phase: session.phase,
        timestampMs: 1_769_000_000 + session.sequence,
      },
    });
  }

  function transitionTo(phase: SessionPhase): void {
    // Mirrors the canonical machine: DONE → IDLE (and any → IDLE) clears
    // the session identity; ERROR preserves it until cleanup.
    const sessionId = phase === "IDLE" ? null : session.sessionId;
    session = { sessionId, phase, sequence: session.sequence + 1 };
    emitSessionChanged();
  }

  async function invoke(cmd: string, args: Record<string, unknown> = {}): Promise<unknown> {
    calls.push({ cmd, args });
    switch (cmd) {
      case "runtime_status":
        return {
          version: E2E_VERSION,
          phase: session.phase,
          sessionId: session.sessionId,
          sequence: session.sequence,
          localOnly: true,
          ready: true,
        };
      case "ping":
      case "emit_ping":
        return { sequence: calls.length, timestampMs: 1_769_000_100 };
      case "session_snapshot":
        return { sessionId: session.sessionId, phase: session.phase, sequence: session.sequence };
      case "session_transition": {
        const target = (args as { target?: SessionPhase }).target;
        if (target === "STARTING" && session.phase === "IDLE") {
          session = { sessionId: nextSessionId++, phase: "STARTING", sequence: session.sequence + 1 };
          transitionTo("LISTENING");
          return { sessionId: session.sessionId, sequence: session.sequence, phase: session.phase, timestampMs: 1_769_000_100 };
        }
        if (target === "DONE" && session.phase !== "IDLE") {
          transitionTo("DONE");
          return { sessionId: session.sessionId, sequence: session.sequence, phase: session.phase, timestampMs: 1_769_000_100 };
        }
        if (target === "IDLE") {
          session = { sessionId: null, phase: "IDLE", sequence: session.sequence + 1 };
          emitSessionChanged();
          return { sessionId: null, sequence: session.sequence, phase: "IDLE", timestampMs: 1_769_000_100 };
        }
        throw new Error(`E2E double: illegal transition ${session.phase} -> ${String(target)}`);
      }
      case "session_reset":
        session = { sessionId: null, phase: "IDLE", sequence: session.sequence + 1 };
        emitSessionChanged();
        return { sessionId: null, sequence: session.sequence, phase: "IDLE", timestampMs: 1_769_000_100 };
      case "inject_text": {
        const text = (args as { text?: unknown }).text;
        if (typeof text !== "string") throw new Error("E2E double: inject_text requires text");
        injectTexts.push(text);
        return { success: true, method: "Native", durationMs: 1, message: "ok (e2e double)" };
      }
      case "plugin:event|listen": {
        const { event, handler } = args as { event?: string; handler?: number };
        if (typeof event !== "string" || typeof handler !== "number" || !callbacks.has(handler)) {
          throw new Error("E2E double: bad plugin:event|listen args");
        }
        const eventId = nextEventId++;
        let subs = listeners.get(event);
        if (!subs) {
          subs = new Map();
          listeners.set(event, subs);
        }
        subs.set(eventId, handler);
        return eventId;
      }
      case "plugin:event|unlisten": {
        const { event, eventId } = args as { event?: string; eventId?: number };
        if (typeof event === "string" && typeof eventId === "number") {
          listeners.get(event)?.delete(eventId);
        }
        return null;
      }
      case "load_settings":
        return { success: true, message: "ok (e2e double)", data: structuredClone(settings) };
      case "save_settings":
      case "update_microphone_settings":
      case "update_hotkey_settings":
      case "update_model_settings": {
        const next = (args as { settings?: unknown }).settings;
        if (next !== undefined && cmd === "save_settings") {
          settings = next as typeof settings;
        } else if (next !== undefined) {
          const key =
            cmd === "update_microphone_settings"
              ? "microphone"
              : cmd === "update_hotkey_settings"
                ? "hotkey"
                : "model";
          settings = { ...settings, [key]: next };
        }
        return { success: true, message: "ok (e2e double)", data: structuredClone(settings) };
      }
      case "get_available_models":
        return structuredClone(models);
      case "get_current_model":
        return activeModelId;
      case "get_model_info": {
        const modelId = (args as { modelId?: string }).modelId;
        return structuredClone(models.find((m) => m.id === modelId) ?? null);
      }
      case "rescan_local_models":
        return null;
      case "download_model": {
        const modelId = (args as { modelId?: string }).modelId;
        const entry = models.find((m) => m.id === modelId);
        if (!entry || entry.is_downloaded) throw new Error("E2E double: unknown or already-downloaded model");
        entry.is_downloading = true;
        entry.partial_size = 50;
        dispatch(MODEL_DOWNLOAD_PROGRESS_EVENT, {
          model_id: modelId,
          downloaded: 50,
          total: 100,
          percentage: 50,
        });
        return null;
      }
      case "cancel_download": {
        const modelId = (args as { modelId?: string }).modelId;
        const entry = models.find((m) => m.id === modelId);
        if (entry) {
          entry.is_downloading = false;
          entry.partial_size = 0;
        }
        dispatch(MODEL_DOWNLOAD_CANCELLED_EVENT, modelId);
        return null;
      }
      case "set_active_model": {
        const modelId = (args as { modelId?: string }).modelId;
        const entry = typeof modelId === "string" ? models.find((m) => m.id === modelId) : undefined;
        if (!entry || !entry.is_downloaded) {
          throw new Error("E2E double: model not downloaded");
        }
        activeModelId = entry.id;
        dispatch(MODEL_STATE_CHANGED_EVENT, {
          event_type: "selection_changed",
          model_id: modelId,
          model_name: entry.name,
          error: null,
        });
        return null;
      }
      case "get_transcription_model_status":
        return activeModelId === "" ? null : `ready:${activeModelId} (e2e double)`;
      case "get_history_entries": {
        const { cursor, limit } = args as { cursor?: number | null; limit?: number | null };
        const capped = Math.min(limit ?? 30, 100);
        const visible =
          cursor === null || cursor === undefined ? history : history.filter((e) => e.id < cursor);
        const page = visible.slice(0, capped);
        const lastEntry = page.length > 0 ? page[page.length - 1] : undefined;
        const lastId = lastEntry !== undefined ? lastEntry.id : null;
        const result: PaginatedHistory = {
          entries: structuredClone(page),
          // Newest-first: more remains exactly when an entry is older than
          // the last one on this page.
          has_more: lastId !== null && history.some((e) => e.id < lastId),
        };
        return result;
      }
      case "toggle_history_entry_saved": {
        const id = (args as { id?: number }).id;
        const entry = history.find((e) => e.id === id);
        if (entry) entry.saved = !entry.saved;
        dispatch(HISTORY_UPDATE_EVENT, { action: "toggled", id });
        return null;
      }
      case "delete_history_entry": {
        const id = (args as { id?: number }).id;
        history = history.filter((e) => e.id !== id);
        dispatch(HISTORY_UPDATE_EVENT, { action: "deleted", id });
        return null;
      }
      case "retry_history_entry_transcription": {
        const id = (args as { id?: number }).id;
        const entry = history.find((e) => e.id === id);
        if (entry) dispatch(HISTORY_UPDATE_EVENT, { action: "updated", entry: structuredClone(entry) });
        return null;
      }
      case "get_account_snapshot":
        return { state: "SignedOut", user_id: null, entitlement_active: false, is_offline: false };
      case "account_sign_in":
        // Fails closed by design (T14 STOP): the harness never invents auth.
        return { success: false, message: "E2E harness: sign-in disabled (fails closed)" };
      case "account_begin_sign_in":
        // R1-GAP-021: same fail-closed contract under the explicit browser
        // command (unconfigured build in the harness — never invents auth).
        return { success: false, message: "E2E harness: sign-in disabled (fails closed)", url: null };
      case "account_refresh_session":
        return { success: false, message: "E2E harness: session refresh disabled (fails closed)" };
      case "account_sign_out":
        return { success: true, message: "ok (e2e double)" };
      default:
        throw new Error(`E2E double: unhandled command ${cmd}`);
    }
  }

  const control: E2EControl = {
    scenario,
    sessionState: () => ({ ...session }),
    invokeCalls: () => [...calls],
    injectTexts: () => [...injectTexts],
    emitSession: (phase) => transitionTo(phase),
    emitTranscript: (kind, text) => {
      if (session.sessionId === null) throw new Error("E2E double: no active session for transcript");
      session = { ...session, sequence: session.sequence + 1 };
      dispatch(TRANSCRIPT_UPDATE_EVENT, {
        session_id: session.sessionId,
        sequence: session.sequence,
        kind,
        text,
      });
    },
    completeDownload: (modelId) => {
      const entry = models.find((m) => m.id === modelId);
      if (!entry) throw new Error("E2E double: unknown model");
      entry.is_downloading = false;
      entry.is_downloaded = true;
      entry.partial_size = 0;
      dispatch(MODEL_DOWNLOAD_COMPLETE_EVENT, modelId);
      dispatch(MODELS_UPDATED_EVENT, null);
    },
    failDownload: (modelId, error) => {
      const entry = models.find((m) => m.id === modelId);
      if (entry) {
        entry.is_downloading = false;
        entry.partial_size = 0;
      }
      dispatch("model-download-failed", { model_id: modelId, error });
    },
    reset: () => {
      session = { sessionId: null, phase: "IDLE", sequence: 0 };
      calls = [];
      injectTexts = [];
      models = scenario === "no-models" ? [] : [readyModel(), availableModel()];
      activeModelId = scenario === "no-models" ? "" : "parakeet-ready";
      settings = defaultSettings(scenario);
      history = historyFixtures();
    },
  };

  window.__TAURI_INTERNALS__ = {
    invoke: (cmd, args) => invoke(cmd, args ?? {}),
    transformCallback: (cb) => {
      const id = nextCallbackId++;
      callbacks.set(id, cb);
      return id;
    },
    unregisterCallback: (id) => {
      callbacks.delete(id);
    },
  };
  // `@tauri-apps/api@2 event.js _unlisten` calls this global FIRST (before
  // its `plugin:event|unlisten` invoke): without it every component unmount
  // — including React StrictMode's dev double-invoke — throws an unhandled
  // rejection. It owns the same listener registry the doubles dispatch to.
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: (event: string, eventId: number) => {
      listeners.get(event)?.delete(eventId);
    },
  } as unknown as Window["__TAURI_EVENT_PLUGIN_INTERNALS__"];
  window.__SORAVO_E2E__ = control;
  return control;
}
