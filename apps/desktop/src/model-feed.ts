import {
  cancelDownload,
  downloadModel,
  getAvailableModels,
  getCurrentModel,
  onModelDeleted,
  onModelDownloadCancelled,
  onModelDownloadComplete,
  onModelDownloadFailed,
  onModelDownloadProgress,
  onModelStateChanged,
  onModelVerificationCompleted,
  onModelVerificationStarted,
  onModelsUpdated,
  setActiveModel,
  type DownloadProgress,
  type EngineType,
  type ModelDownloadFailed,
  type ModelInfo,
  type ModelStateEvent,
} from "./ipc";

/**
 * R1-GAP-017 — model catalog / selector / download fold over the EXISTING
 * Handy-derived backend contract (`commands/models.rs` + `ModelManager`).
 *
 * What this module does:
 * - loads the catalog from `get_available_models` (never hardcoded);
 * - reads the persisted selection from `get_current_model`;
 * - routes selection through `set_active_model` exactly once per intent;
 * - routes downloads through `download_model` exactly once per intent;
 * - derives every displayed status (downloaded / downloading / verifying /
 *   available / unavailable / error) from backend flags plus backend events —
 *   the UI never invents installed state or completion.
 *
 * What this module does NOT do (backend-owned, reused verbatim):
 * - catalog content, licensing, provenance, checksums (`catalog.json` +
 *   `catalog/mod.rs` — read-only here);
 * - download transport, resume, SHA-256 verification, atomic finalize
 *   (`managers/model/download.rs` — untouched);
 * - selection persistence / model loading (`switch_active_model` — untouched).
 *
 * Legacy-URL deprecation rule (from `model.rs::seed_catalog_models`): the UI
 * hides not-on-disk `Url` entries to deprecate legacy downloads, while
 * already-downloaded ones stay runnable. `visibleEntries` implements exactly
 * that rule — nothing is merged or removed backend-side.
 */

export type ModelEntryStatus =
  | { kind: "downloaded"; active: boolean }
  | {
      kind: "downloading";
      downloaded: number;
      total: number;
      percentage: number;
    }
  | { kind: "verifying" }
  | { kind: "available" }
  | { kind: "unavailable"; reason: string }
  | { kind: "error"; message: string };

export type ModelFeedState = {
  /** Last catalog snapshot from `get_available_models`; empty until loaded. */
  entries: ModelInfo[];
  /** Persisted canonical selection from `get_current_model` (`""` = none). */
  activeModelId: string;
  /** True once the first refresh completed (success or failure). */
  loaded: boolean;
  /** Last refresh failure; null when the last refresh succeeded. */
  loadError: string | null;
  /** Latest `model-download-progress` payload per model id. */
  progress: Record<string, DownloadProgress>;
  /** Ids inside SHA-256 verification (`model-verification-started`, not yet completed). */
  verifying: Record<string, boolean>;
  /** Last terminal failure per model id (`model-download-failed` / command error). */
  errors: Record<string, string>;
  /** Selection invoke currently in flight (exactly-once guard). */
  pendingSelection: string | null;
  /** Download invokes currently in flight (exactly-once guard). */
  pendingDownloads: Record<string, boolean>;
};

export function createModelFeed(): ModelFeedState {
  return {
    entries: [],
    activeModelId: "",
    loaded: false,
    loadError: null,
    progress: {},
    verifying: {},
    errors: {},
    pendingSelection: null,
    pendingDownloads: {},
  };
}

function findEntry(state: ModelFeedState, modelId: string): ModelInfo | undefined {
  return state.entries.find((entry) => entry.id === modelId);
}

/** Only HuggingFace-sourced entries have a download path (`download_model`
 *  rejects `Local` with "No download source for model"). */
export function isDownloadable(entry: ModelInfo): boolean {
  return typeof entry.source === "object" && "HuggingFace" in entry.source;
}

/** A `Url`-sourced entry that is not on disk is a deprecated legacy download
 *  and stays hidden; everything else (including downloaded legacy entries,
 *  custom `Local` models, and catalog entries) is listed. */
export function isVisibleEntry(entry: ModelInfo): boolean {
  if (typeof entry.source === "object" && "Url" in entry.source) {
    return entry.is_downloaded;
  }
  return true;
}

export function visibleEntries(state: ModelFeedState): ModelInfo[] {
  return state.entries.filter(isVisibleEntry);
}

export function engineOf(entry: ModelInfo): EngineType {
  return entry.engine_type;
}

/** Displayed status for one model id. Precedence: terminal error first, then
 *  verification (the later pipeline phase), then downloading, then the
 *  backend installed flag, then download availability. Anything not backed
 *  by a backend flag or event falls to `available` / `unavailable` — never
 *  to a fabricated `downloaded`. */
export function entryStatus(state: ModelFeedState, modelId: string): ModelEntryStatus {
  const entry = findEntry(state, modelId);
  if (!entry) {
    return { kind: "unavailable", reason: "unknown model" };
  }
  const error = state.errors[modelId];
  if (error !== undefined) {
    return { kind: "error", message: error };
  }
  if (state.verifying[modelId] === true) {
    return { kind: "verifying" };
  }
  const progress = state.progress[modelId];
  if (
    progress !== undefined ||
    entry.is_downloading ||
    state.pendingDownloads[modelId] === true
  ) {
    return {
      kind: "downloading",
      downloaded: progress?.downloaded ?? entry.partial_size,
      total: progress?.total ?? 0,
      percentage: progress?.percentage ?? 0,
    };
  }
  if (entry.is_downloaded) {
    return { kind: "downloaded", active: state.activeModelId === modelId };
  }
  if (isDownloadable(entry)) {
    return { kind: "available" };
  }
  return { kind: "unavailable", reason: "no download source" };
}

/**
 * Reload catalog + persisted selection from the backend. Transient overlays
 * (progress / verifying / errors / pending guards) are rebuilt purely from
 * the fresh backend flags afterwards: entries the backend reports as
 * downloaded lose any stale error/progress, and an in-flight `is_downloading`
 * flag keeps showing `downloading` until the terminal event arrives. A
 * failed refresh keeps the previous entries and records `loadError`.
 */
export async function refreshModelFeed(state: ModelFeedState): Promise<void> {
  let entries: ModelInfo[];
  let activeModelId: string;
  try {
    entries = await getAvailableModels();
    activeModelId = await getCurrentModel();
  } catch (e) {
    state.loaded = true;
    state.loadError = e instanceof Error ? e.message : String(e);
    return;
  }
  state.entries = entries;
  state.activeModelId = activeModelId;
  state.loaded = true;
  state.loadError = null;
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const modelId of Object.keys(state.progress)) {
    const entry = byId.get(modelId);
    if (entry === undefined || entry.is_downloaded || !entry.is_downloading) {
      delete state.progress[modelId];
    }
  }
  for (const modelId of Object.keys(state.verifying)) {
    const entry = byId.get(modelId);
    if (entry === undefined || entry.is_downloaded) {
      delete state.verifying[modelId];
    }
  }
  for (const modelId of Object.keys(state.errors)) {
    const entry = byId.get(modelId);
    if (entry !== undefined && (entry.is_downloaded || entry.is_downloading)) {
      delete state.errors[modelId];
    }
  }
  for (const modelId of Object.keys(state.pendingDownloads)) {
    const entry = byId.get(modelId);
    if (entry === undefined || entry.is_downloaded || !entry.is_downloading) {
      delete state.pendingDownloads[modelId];
    }
  }
  if (state.pendingSelection !== null && !byId.has(state.pendingSelection)) {
    state.pendingSelection = null;
  }
}

export type ModelActionResult = { ok: true } | { ok: false; error: string };

/**
 * Select the active model through the canonical `set_active_model` contract.
 * Only downloaded entries are selectable; the invoke fires exactly once per
 * intent (concurrent intents for the same or another model are refused while
 * one is in flight, mirroring the backend loading-slot guard). On success
 * the persisted selection is the source of truth, so `activeModelId`
 * follows; on failure nothing changes and the error is recorded for display.
 */
export async function selectModel(
  state: ModelFeedState,
  modelId: string
): Promise<ModelActionResult> {
  const entry = findEntry(state, modelId);
  if (entry === undefined) {
    return { ok: false, error: `Model not found: ${modelId}` };
  }
  if (!entry.is_downloaded) {
    return { ok: false, error: `Model not downloaded: ${modelId}` };
  }
  if (state.pendingSelection !== null) {
    return { ok: false, error: "Model selection already in progress" };
  }
  state.pendingSelection = modelId;
  try {
    await setActiveModel(modelId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    state.pendingSelection = null;
    state.errors[modelId] = message;
    return { ok: false, error: message };
  }
  state.pendingSelection = null;
  state.activeModelId = modelId;
  delete state.errors[modelId];
  return { ok: true };
}

/**
 * Start (or resume) a download through the canonical `download_model`
 * contract, exactly once per model. Already-downloaded entries and
 * in-flight downloads never re-invoke; entries without a download source
 * (`Local` custom models) are refused without invoking. Progress and the
 * terminal outcome arrive via events — this returning `ok` means the backend
 * accepted the request, NOT that the model is installed.
 */
export async function startDownload(
  state: ModelFeedState,
  modelId: string
): Promise<ModelActionResult> {
  const entry = findEntry(state, modelId);
  if (entry === undefined) {
    return { ok: false, error: `Model not found: ${modelId}` };
  }
  if (entry.is_downloaded) {
    return { ok: false, error: `Model already downloaded: ${modelId}` };
  }
  if (entry.is_downloading || state.pendingDownloads[modelId] === true) {
    return { ok: false, error: `Download already in progress: ${modelId}` };
  }
  if (!isDownloadable(entry)) {
    return { ok: false, error: `No download source for model: ${modelId}` };
  }
  state.pendingDownloads[modelId] = true;
  delete state.errors[modelId];
  try {
    await downloadModel(modelId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    delete state.pendingDownloads[modelId];
    state.errors[modelId] = message;
    return { ok: false, error: message };
  }
  return { ok: true };
}

/**
 * Request cancellation through `cancel_download`. State changes only when the
 * backend confirms via `model-download-cancelled` (handled by
 * `applyDownloadCancelled`, which refreshes from the backend) — a requested
 * cancel is never displayed as completed.
 */
export async function cancelModelDownload(
  state: ModelFeedState,
  modelId: string
): Promise<void> {
  await cancelDownload(modelId);
}

/** Record a `model-download-progress` payload for a known catalog entry.
 *  Payloads for unknown ids are ignored so the bus can never conjure a
 *  phantom model row. */
export function applyDownloadProgress(
  state: ModelFeedState,
  progress: DownloadProgress
): void {
  if (findEntry(state, progress.model_id) === undefined) {
    return;
  }
  state.progress[progress.model_id] = progress;
  delete state.errors[progress.model_id];
}

export function applyVerificationStarted(
  state: ModelFeedState,
  modelId: string
): void {
  if (findEntry(state, modelId) === undefined) {
    return;
  }
  state.verifying[modelId] = true;
}

export function applyVerificationCompleted(
  state: ModelFeedState,
  modelId: string
): void {
  delete state.verifying[modelId];
}

/**
 * Handle `model-download-complete`: the installed flag is re-read from the
 * backend (`refreshModelFeed`), never set locally — only a refreshed
 * `is_downloaded` proves installation.
 */
export async function applyDownloadComplete(
  state: ModelFeedState,
  modelId: string
): Promise<void> {
  delete state.progress[modelId];
  delete state.verifying[modelId];
  delete state.pendingDownloads[modelId];
  delete state.errors[modelId];
  if (findEntry(state, modelId) === undefined) {
    return;
  }
  await refreshModelFeed(state);
}

/**
 * Handle `model-download-failed`: the failure surfaces with the backend's
 * message and the model is exactly as (not) installed as the backend says —
 * never marked downloaded, and the UI stays recoverable (a later
 * `startDownload` clears the error and re-invokes once).
 */
export function applyDownloadFailed(
  state: ModelFeedState,
  failure: ModelDownloadFailed
): void {
  delete state.progress[failure.model_id];
  delete state.verifying[failure.model_id];
  delete state.pendingDownloads[failure.model_id];
  if (findEntry(state, failure.model_id) === undefined) {
    return;
  }
  state.errors[failure.model_id] = failure.error;
}

/**
 * Handle `model-download-cancelled`: drop transient download state and
 * re-read the backend flags (the backend keeps the partial for resume, so
 * only the backend knows the true `partial_size` / `is_downloading`).
 * Cancellation is never displayed as completion.
 */
export async function applyDownloadCancelled(
  state: ModelFeedState,
  modelId: string
): Promise<void> {
  delete state.progress[modelId];
  delete state.verifying[modelId];
  delete state.pendingDownloads[modelId];
  delete state.errors[modelId];
  if (findEntry(state, modelId) === undefined) {
    return;
  }
  await refreshModelFeed(state);
}

/**
 * Handle `model-state-changed`: `selection_changed` / `loading_completed`
 * move the active marker to the backend-confirmed model; `loading_failed`
 * surfaces the backend error without moving the marker.
 */
export function applyModelStateChanged(
  state: ModelFeedState,
  event: ModelStateEvent
): void {
  if (event.event_type === "selection_changed" || event.event_type === "loading_completed") {
    if (event.model_id !== null && findEntry(state, event.model_id) !== undefined) {
      state.activeModelId = event.model_id;
      delete state.errors[event.model_id];
    }
    return;
  }
  if (event.event_type === "loading_failed" && event.model_id !== null) {
    if (findEntry(state, event.model_id) !== undefined) {
      state.errors[event.model_id] = event.error ?? "Model load failed";
    }
  }
}

/** Handle `models-updated` / `model-deleted`: re-read the catalog. */
export async function applyModelsUpdated(state: ModelFeedState): Promise<void> {
  await refreshModelFeed(state);
}

export async function applyModelDeleted(state: ModelFeedState): Promise<void> {
  await refreshModelFeed(state);
}

/**
 * Subscribe to the model event buses exactly once each. Returns a combined
 * unsubscribe. Terminal download events refresh from the backend so the
 * installed flag is always backend-read, never locally inferred. `onChange`
 * fires after every applied event (and again once an async backend re-read
 * settles) so UI consumers re-render without polling.
 */
export async function subscribeModelFeed(
  state: ModelFeedState,
  onChange: () => void = () => undefined
): Promise<() => void> {
  const unlistens = [
    await onModelDownloadProgress((progress) => {
      applyDownloadProgress(state, progress);
      onChange();
    }),
    await onModelVerificationStarted((modelId) => {
      applyVerificationStarted(state, modelId);
      onChange();
    }),
    await onModelVerificationCompleted((modelId) => {
      applyVerificationCompleted(state, modelId);
      onChange();
    }),
    await onModelDownloadComplete((modelId) => {
      onChange();
      void applyDownloadComplete(state, modelId).then(onChange);
    }),
    await onModelDownloadFailed((failure) => {
      applyDownloadFailed(state, failure);
      onChange();
    }),
    await onModelDownloadCancelled((modelId) => {
      onChange();
      void applyDownloadCancelled(state, modelId).then(onChange);
    }),
    await onModelStateChanged((event) => {
      applyModelStateChanged(state, event);
      onChange();
    }),
    await onModelsUpdated(() => {
      onChange();
      void applyModelsUpdated(state).then(onChange);
    }),
    await onModelDeleted(() => {
      onChange();
      void applyModelDeleted(state).then(onChange);
    }),
  ];
  return () => {
    for (const unlisten of unlistens) {
      unlisten();
    }
  };
}
