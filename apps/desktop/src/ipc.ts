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

/**
 * Mirrors `soravo-transcript::TranscriptKind` (unit variants, verbatim names).
 * `Tentative` text is a volatile preview and must never be treated as
 * committed/final output; only `Committed`/`Final` text is stable.
 */
export type TranscriptKind = "Tentative" | "Committed" | "Final";

/**
 * Mirrors `soravo-transcript::TranscriptUpdate`.
 *
 * NOTE on casing: unlike the `session.rs`/`events.rs` shapes (which use
 * `#[serde(rename_all = "camelCase")]`), `TranscriptUpdate` carries NO
 * `rename_all`, so the wire keys stay `snake_case`. This mirror preserves the
 * wire shape verbatim (`session_id`, not `sessionId`) so a future Rust
 * producer emitting this exact struct deserializes without translation.
 * `session_id` is the `soravo-transcript::SessionId` newtype (`u64` → number)
 * and, together with `sequence`, is the stale/duplicate rejection key
 * (`TranscriptOrder::accept` / `SessionMachine::is_current` semantics).
 */
export type TranscriptUpdate = {
  session_id: number;
  sequence: number;
  kind: TranscriptKind;
  text: string;
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

/** Mirrors `soravo_typing::TypingMethod` (unit variants). */
export type TypingMethod = "Native" | "ClipboardFallback";

/** Mirrors `soravo_typing::TypingResult` (camelCase serde). */
export type TypingResult = {
  success: boolean;
  method: TypingMethod;
  durationMs: number;
  message: string;
};

export const SESSION_CHANGED_EVENT = "session://changed";
export const PING_EVENT = "runtime://ping";
export const TYPING_RESULT_EVENT = "typing://result";
/**
 * Typed transcript-update channel on the existing Tauri event bus.
 * URI-scheme follows the existing `session://changed` / `runtime://ping` /
 * `typing://result` convention. Payload is the verbatim `TranscriptUpdate`
 * mirror above — no new payload contract is introduced.
 */
export const TRANSCRIPT_UPDATE_EVENT = "transcript://update";

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

/**
 * Inject committed/final text into the active application.
 * Mirrors the `inject_text` Rust command (`text: String -> TypingResult`).
 * Length validation (100KB bound) and error contract live server-side;
 * this wrapper preserves the command/arg names verbatim.
 */
export function injectText(text: string): Promise<TypingResult> {
  return invoke<TypingResult>("inject_text", { text });
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

/**
 * Subscribe to typed transcript updates on the existing event bus.
 * The payload contract is the reused `TranscriptUpdate` mirror (session id +
 * sequence + kind + text); kind/ordering/staleness interpretation lives in the
 * subscriber (see `session-feed.ts`), mirroring `soravo-transcript`
 * (`TranscriptOrder` / `TranscriptState`) semantics. Returns an unsubscribe fn.
 */
export function onTranscriptUpdate(
  handler: (update: TranscriptUpdate) => void
): Promise<UnlistenFn> {
  return listen<TranscriptUpdate>(TRANSCRIPT_UPDATE_EVENT, (event) =>
    handler(event.payload)
  );
}

/**
 * Subscribe to text-injection results emitted by `inject_text`.
 * No UI flow subscribes yet — exported for future Soravo wiring only.
 * Returns an unsubscribe fn.
 */
export function onTypingResult(
  handler: (payload: TypingResult) => void
): Promise<UnlistenFn> {
  return listen<TypingResult>(TYPING_RESULT_EVENT, (event) =>
    handler(event.payload)
  );
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

// Settings types
export type SchemaInfo = {
  version: number;
  lastMigrated: number | null;
};

export type MicrophoneSettings = {
  selectedDeviceIndex: string | null;
  selectedDeviceName: string | null;
  deviceAvailable: boolean;
  autoFallback: boolean;
};

export type HotkeySettings = {
  binding: string | null;
  mode: "hold_to_talk" | "toggle_to_talk";
  enabled: boolean;
  recordingInProgress: boolean;
};

export type ModelSettings = {
  selectedEngine: string | null;
  selectedModel: string | null;
  available: boolean;
  status: "not_installed" | "downloading" | "verifying" | "ready" | "error";
};

export type Settings = {
  schema: SchemaInfo;
  microphone: MicrophoneSettings;
  hotkey: HotkeySettings;
  model: ModelSettings;
};

export type SettingsResponse = {
  success: boolean;
  message: string;
  data: Settings | null;
};

export function loadSettings(): Promise<SettingsResponse> {
  return invoke<SettingsResponse>("load_settings");
}

export function saveSettings(settings: Settings): Promise<SettingsResponse> {
  return invoke<SettingsResponse>("save_settings", { settings });
}

export function updateMicrophoneSettings(settings: MicrophoneSettings): Promise<SettingsResponse> {
  return invoke<SettingsResponse>("update_microphone_settings", { settings });
}

export function updateHotkeySettings(settings: HotkeySettings): Promise<SettingsResponse> {
  return invoke<SettingsResponse>("update_hotkey_settings", { settings });
}

export function updateModelSettings(settings: ModelSettings): Promise<SettingsResponse> {
  return invoke<SettingsResponse>("update_model_settings", { settings });
}

// Model catalog / management types and commands.
//
// R1-GAP-017 — the settings model selector previously used hardcoded engine /
// model lists and a UI-local store only. The mirrors below bind it to the
// real Handy-derived backend contract (`commands/models.rs` + `ModelManager`):
// catalog entries come from `get_available_models`, selection goes through
// `set_active_model` (canonical `AppSettings.selected_model` persistence +
// load), downloads go through `download_model`, and progress/status arrive on
// the existing Tauri event bus. Serde shapes are mirrored verbatim
// (snake_case wire keys; externally-tagged `ModelSource` / `EngineType`
// variant names), so no translation layer is introduced.

/** Mirrors `crate::managers::model::ModelSource` (externally tagged). */
export type ModelSource =
  | { Url: { url: string; sha256: string | null } }
  | { HuggingFace: { repo_id: string; revision: string } }
  | "Local";

/** Mirrors `crate::managers::model::EngineType` (unit variants, verbatim). */
export type EngineType =
  | "TranscribeCpp"
  | "Parakeet"
  | "Moonshine"
  | "MoonshineStreaming"
  | "SenseVoice"
  | "GigaAM"
  | "Canary"
  | "Cohere";

/** Mirrors `crate::managers::model::ModelInfo` (snake_case wire keys). */
export type ModelInfo = {
  id: string;
  name: string;
  description: string;
  filename: string;
  source: ModelSource;
  size_mb: number;
  is_downloaded: boolean;
  is_downloading: boolean;
  partial_size: number;
  is_directory: boolean;
  engine_type: EngineType;
  accuracy_score: number;
  speed_score: number;
  supports_translation: boolean;
  is_recommended: boolean;
  supported_languages: string[];
  supports_language_selection: boolean;
  is_custom: boolean;
  supports_streaming: boolean;
  supports_language_detection: boolean;
};

/** Mirrors `crate::managers::model::DownloadProgress` (snake_case wire keys). */
export type DownloadProgress = {
  model_id: string;
  downloaded: number;
  total: number;
  percentage: number;
};

/** Mirrors `crate::managers::transcription::ModelStateEvent`. */
export type ModelStateEvent = {
  event_type: string;
  model_id: string | null;
  model_name: string | null;
  error: string | null;
};

/** Mirrors the `model-download-failed` payload (`{model_id, error}`). */
export type ModelDownloadFailed = {
  model_id: string;
  error: string;
};

export const MODEL_DOWNLOAD_PROGRESS_EVENT = "model-download-progress";
export const MODEL_VERIFICATION_STARTED_EVENT = "model-verification-started";
export const MODEL_VERIFICATION_COMPLETED_EVENT = "model-verification-completed";
export const MODEL_DOWNLOAD_COMPLETE_EVENT = "model-download-complete";
export const MODEL_DOWNLOAD_FAILED_EVENT = "model-download-failed";
export const MODEL_DOWNLOAD_CANCELLED_EVENT = "model-download-cancelled";
export const MODEL_STATE_CHANGED_EVENT = "model-state-changed";
export const MODELS_UPDATED_EVENT = "models-updated";
export const MODEL_DELETED_EVENT = "model-deleted";

export function getAvailableModels(): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>("get_available_models");
}

export function getModelInfo(modelId: string): Promise<ModelInfo | null> {
  return invoke<ModelInfo | null>("get_model_info", { modelId });
}

export function rescanLocalModels(): Promise<void> {
  return invoke<void>("rescan_local_models");
}

/**
 * Start (or resume) downloading a catalog model.
 * Progress arrives on `model-download-progress`; completion, failure, and
 * cancellation arrive on their respective events — the returned promise
 * resolving does NOT by itself mean the file is installed (only the
 * completion event plus a refreshed `is_downloaded` flag prove that).
 */
export function downloadModel(modelId: string): Promise<void> {
  return invoke<void>("download_model", { modelId });
}

export function cancelDownload(modelId: string): Promise<void> {
  return invoke<void>("cancel_download", { modelId });
}

/**
 * Switch the active model through the canonical contract: validates the
 * model is downloaded, persists `AppSettings.selected_model`, and loads it
 * (unless unload is set to Immediately). Rejects for unknown or
 * not-downloaded models without changing persisted state.
 */
export function setActiveModel(modelId: string): Promise<void> {
  return invoke<void>("set_active_model", { modelId });
}

/** The persisted canonical selection (`AppSettings.selected_model`). */
export function getCurrentModel(): Promise<string> {
  return invoke<string>("get_current_model");
}

export function getTranscriptionModelStatus(): Promise<string | null> {
  return invoke<string | null>("get_transcription_model_status");
}

export function onModelDownloadProgress(
  handler: (progress: DownloadProgress) => void
): Promise<UnlistenFn> {
  return listen<DownloadProgress>(MODEL_DOWNLOAD_PROGRESS_EVENT, (event) =>
    handler(event.payload)
  );
}

export function onModelVerificationStarted(
  handler: (modelId: string) => void
): Promise<UnlistenFn> {
  return listen<string>(MODEL_VERIFICATION_STARTED_EVENT, (event) =>
    handler(event.payload)
  );
}

export function onModelVerificationCompleted(
  handler: (modelId: string) => void
): Promise<UnlistenFn> {
  return listen<string>(MODEL_VERIFICATION_COMPLETED_EVENT, (event) =>
    handler(event.payload)
  );
}

export function onModelDownloadComplete(
  handler: (modelId: string) => void
): Promise<UnlistenFn> {
  return listen<string>(MODEL_DOWNLOAD_COMPLETE_EVENT, (event) =>
    handler(event.payload)
  );
}

export function onModelDownloadFailed(
  handler: (failure: ModelDownloadFailed) => void
): Promise<UnlistenFn> {
  return listen<ModelDownloadFailed>(MODEL_DOWNLOAD_FAILED_EVENT, (event) =>
    handler(event.payload)
  );
}

export function onModelDownloadCancelled(
  handler: (modelId: string) => void
): Promise<UnlistenFn> {
  return listen<string>(MODEL_DOWNLOAD_CANCELLED_EVENT, (event) =>
    handler(event.payload)
  );
}

export function onModelStateChanged(
  handler: (event: ModelStateEvent) => void
): Promise<UnlistenFn> {
  return listen<ModelStateEvent>(MODEL_STATE_CHANGED_EVENT, (event) =>
    handler(event.payload)
  );
}

export function onModelsUpdated(handler: () => void): Promise<UnlistenFn> {
  return listen<null>(MODELS_UPDATED_EVENT, () => handler());
}

export function onModelDeleted(
  handler: (modelId: string) => void
): Promise<UnlistenFn> {
  return listen<string>(MODEL_DELETED_EVENT, (event) =>
    handler(event.payload)
  );
}

// Account types and commands

export type AccountState = "SignedOut" | "SignedIn" | "NeedsRefresh" | "Unavailable";

export type AccountSnapshot = {
  state: AccountState;
  user_id: string | null;
  entitlement_active: boolean;
  is_offline: boolean;
};

export type AccountResult = {
  success: boolean;
  message: string;
};

export function getAccountSnapshot(): Promise<AccountSnapshot> {
  return invoke<AccountSnapshot>("get_account_snapshot");
}

export function accountSignIn(): Promise<AccountResult> {
  return invoke<AccountResult>("account_sign_in");
}

export function accountSignOut(): Promise<AccountResult> {
  return invoke<AccountResult>("account_sign_out");
}