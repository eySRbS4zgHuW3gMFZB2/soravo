import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MODEL_DOWNLOAD_CANCELLED_EVENT,
  MODEL_DOWNLOAD_COMPLETE_EVENT,
  MODEL_DOWNLOAD_FAILED_EVENT,
  MODEL_DOWNLOAD_PROGRESS_EVENT,
  MODEL_STATE_CHANGED_EVENT,
  MODEL_VERIFICATION_COMPLETED_EVENT,
  MODEL_VERIFICATION_STARTED_EVENT,
  MODELS_UPDATED_EVENT,
  MODEL_DELETED_EVENT,
  type DownloadProgress,
  type ModelDownloadFailed,
  type ModelInfo,
  type ModelStateEvent,
} from "./ipc";
import {
  applyDownloadCancelled,
  applyDownloadProgress,
  applyModelStateChanged,
  applyModelsUpdated,
  applyVerificationCompleted,
  applyVerificationStarted,
  cancelModelDownload,
  createModelFeed,
  entryStatus,
  isDownloadable,
  isVisibleEntry,
  refreshModelFeed,
  selectModel,
  startDownload,
  subscribeModelFeed,
  visibleEntries,
  type ModelFeedState,
} from "./model-feed";

const invoke = vi.hoisted(() => vi.fn());
const listen = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

/**
 * R1-GAP-017 — model selector / settings real-data + download wiring proof
 * over the mocked IPC boundary. Same mock conventions as
 * `injection-feed.test.ts` (hoisted `invoke`/`listen`, real Tauri
 * event-envelope unwrapping in `ipc.ts`).
 *
 * Canonical rule under test: the selector renders catalog-derived entries
 * from `get_available_models`, installed/downloaded state and the active
 * model come from the backend (`is_downloaded`, `get_current_model`),
 * selection goes through `set_active_model` exactly once, downloads go
 * through `download_model` exactly once with progress/completion/failure
 * proven only by backend events plus a backend re-read — the UI never
 * invents availability or completion. No test touches the network or a
 * production model.
 */

type Captured = { event: string; handler: (event: { payload: unknown }) => void };

let captured: Captured[];
let catalog: ModelInfo[];
let currentModel: string;
let failCommands: Record<string, string>;

function hfEntry(overrides: Partial<ModelInfo> & { id: string }): ModelInfo {
  return {
    name: overrides.id,
    description: `Test model ${overrides.id}`,
    filename: `${overrides.id}.gguf`,
    source: { HuggingFace: { repo_id: "test-org/test-model", revision: "abc123" } },
    size_mb: 500,
    is_downloaded: false,
    is_downloading: false,
    partial_size: 0,
    is_directory: false,
    engine_type: "TranscribeCpp",
    accuracy_score: 0.9,
    speed_score: 0.8,
    supports_translation: false,
    is_recommended: false,
    supported_languages: ["en"],
    supports_language_selection: false,
    is_custom: false,
    supports_streaming: true,
    supports_language_detection: false,
    ...overrides,
  };
}

function downloadedEntry(id: string): ModelInfo {
  return hfEntry({ id, is_downloaded: true, is_recommended: true });
}

function markDownloaded(id: string): void {
  catalog = catalog.map((entry) =>
    entry.id === id ? { ...entry, is_downloaded: true } : entry
  );
}

function soleCallArgs(command: string): unknown {
  const calls = invokeCalls(command);
  if (calls.length !== 1 || calls[0] === undefined) {
    throw new Error(`expected exactly one call to ${command}`);
  }
  return calls[0][1];
}

beforeEach(() => {
  invoke.mockReset();
  listen.mockReset();
  captured = [];
  catalog = [
    downloadedEntry("test-org/model-a.gguf"),
    hfEntry({ id: "test-org/model-b.gguf" }),
  ];
  currentModel = "test-org/model-a.gguf";
  failCommands = {};
  listen.mockImplementation((event: string, handler: (event: { payload: unknown }) => void) => {
    captured.push({ event, handler });
    return Promise.resolve(vi.fn());
  });
  invoke.mockImplementation((command: string, args?: Record<string, unknown>) => {
    const failure = failCommands[command];
    if (failure !== undefined) {
      return Promise.reject(new Error(failure));
    }
    switch (command) {
      case "get_available_models":
        return Promise.resolve(catalog.map((entry) => ({ ...entry })));
      case "get_current_model":
        return Promise.resolve(currentModel);
      case "set_active_model":
        currentModel = args?.["modelId"] as string;
        return Promise.resolve(undefined);
      case "download_model":
      case "cancel_download":
        return Promise.resolve(undefined);
      default:
        return Promise.reject(new Error(`unexpected command ${command}`));
    }
  });
});

function emit(event: string, payload: unknown): void {
  const entry = captured.find((c) => c.event === event);
  if (!entry) throw new Error(`bus subscription missing: ${event}`);
  entry.handler({ payload });
}

function invokeCalls(command: string): unknown[][] {
  return invoke.mock.calls.filter(([name]) => name === command);
}

describe("model event contract", () => {
  it("exposes the stable canonical model bus names", () => {
    expect(MODEL_DOWNLOAD_PROGRESS_EVENT).toBe("model-download-progress");
    expect(MODEL_VERIFICATION_STARTED_EVENT).toBe("model-verification-started");
    expect(MODEL_VERIFICATION_COMPLETED_EVENT).toBe("model-verification-completed");
    expect(MODEL_DOWNLOAD_COMPLETE_EVENT).toBe("model-download-complete");
    expect(MODEL_DOWNLOAD_FAILED_EVENT).toBe("model-download-failed");
    expect(MODEL_DOWNLOAD_CANCELLED_EVENT).toBe("model-download-cancelled");
    expect(MODEL_STATE_CHANGED_EVENT).toBe("model-state-changed");
    expect(MODELS_UPDATED_EVENT).toBe("models-updated");
    expect(MODEL_DELETED_EVENT).toBe("model-deleted");
  });

  it("subscribes to every model bus exactly once", async () => {
    const state = createModelFeed();
    const unsubscribe = await subscribeModelFeed(state);
    expect(listen).toHaveBeenCalledTimes(9);
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });
});

describe("A. real catalog", () => {
  it("renders catalog-derived entries rather than hardcoded placeholders", async () => {
    const state = createModelFeed();
    expect(visibleEntries(state)).toEqual([]);
    await refreshModelFeed(state);
    const ids = visibleEntries(state).map((entry) => entry.id);
    expect(ids).toEqual(["test-org/model-a.gguf", "test-org/model-b.gguf"]);
    expect(invokeCalls("get_available_models")).toHaveLength(1);
  });

  it("records refresh failures without inventing entries", async () => {
    failCommands["get_available_models"] = "backend unavailable";
    const state = createModelFeed();
    await refreshModelFeed(state);
    expect(state.loaded).toBe(true);
    expect(state.loadError).toBe("backend unavailable");
    expect(visibleEntries(state)).toEqual([]);
  });
});

describe("B. installed state", () => {
  it("reflects downloaded vs not-downloaded from backend flags", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    expect(entryStatus(state, "test-org/model-a.gguf")).toEqual({
      kind: "downloaded",
      active: true,
    });
    expect(entryStatus(state, "test-org/model-b.gguf")).toEqual({ kind: "available" });
  });

  it("hides not-on-disk legacy URL entries but keeps downloaded ones runnable", async () => {
    catalog.push(
      {
        ...hfEntry({ id: "legacy/not-on-disk.bin" }),
        source: { Url: { url: "https://example.invalid/m.bin", sha256: null } },
      },
      {
        ...hfEntry({ id: "legacy/on-disk.bin", is_downloaded: true }),
        source: { Url: { url: "https://example.invalid/m.bin", sha256: null } },
      }
    );
    const state = createModelFeed();
    await refreshModelFeed(state);
    const ids = visibleEntries(state).map((entry) => entry.id);
    expect(ids).not.toContain("legacy/not-on-disk.bin");
    expect(ids).toContain("legacy/on-disk.bin");
    expect(entryStatus(state, "legacy/on-disk.bin")).toEqual({
      kind: "downloaded",
      active: false,
    });
  });

  it("marks sourceless on-disk entries unavailable without offering a download", async () => {
    catalog.push({ ...hfEntry({ id: "custom/local.gguf" }), source: "Local" });
    const state = createModelFeed();
    await refreshModelFeed(state);
    const entry = visibleEntries(state).find((e) => e.id === "custom/local.gguf");
    expect(entry).toBeDefined();
    expect(isDownloadable(entry as ModelInfo)).toBe(false);
    expect(entryStatus(state, "custom/local.gguf")).toEqual({
      kind: "unavailable",
      reason: "no download source",
    });
    expect(isVisibleEntry(entry as ModelInfo)).toBe(true);
  });
});

describe("C. active model", () => {
  it("routes selection through set_active_model exactly once and follows it", async () => {
    markDownloaded("test-org/model-b.gguf");
    const state = createModelFeed();
    await refreshModelFeed(state);
    const result = await selectModel(state, "test-org/model-b.gguf");
    expect(result).toEqual({ ok: true });
    expect(soleCallArgs("set_active_model")).toEqual({
      modelId: "test-org/model-b.gguf",
    });
    expect(entryStatus(state, "test-org/model-b.gguf")).toEqual({
      kind: "downloaded",
      active: true,
    });
  });

  it("refuses non-downloaded models without invoking", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    const result = await selectModel(state, "test-org/model-b.gguf");
    expect(result.ok).toBe(false);
    expect(invokeCalls("set_active_model")).toHaveLength(0);
    expect(state.activeModelId).toBe("test-org/model-a.gguf");
  });

  it("keeps the prior selection when the backend rejects the switch", async () => {
    markDownloaded("test-org/model-b.gguf");
    failCommands["set_active_model"] = "Model load already in progress";
    const state = createModelFeed();
    await refreshModelFeed(state);
    const result = await selectModel(state, "test-org/model-b.gguf");
    expect(result.ok).toBe(false);
    expect(state.activeModelId).toBe("test-org/model-a.gguf");
    expect(entryStatus(state, "test-org/model-b.gguf").kind).toBe("error");
  });
});

describe("D. download start", () => {
  it("invokes download_model exactly once per intent", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    const first = await startDownload(state, "test-org/model-b.gguf");
    expect(first).toEqual({ ok: true });
    const second = await startDownload(state, "test-org/model-b.gguf");
    expect(second.ok).toBe(false);
    expect(invokeCalls("download_model")).toHaveLength(1);
    expect(soleCallArgs("download_model")).toEqual({
      modelId: "test-org/model-b.gguf",
    });
  });

  it("never invokes for already-downloaded or sourceless models", async () => {
    catalog.push({ ...hfEntry({ id: "custom/local.gguf" }), source: "Local" });
    const state = createModelFeed();
    await refreshModelFeed(state);
    expect((await startDownload(state, "test-org/model-a.gguf")).ok).toBe(false);
    expect((await startDownload(state, "custom/local.gguf")).ok).toBe(false);
    expect(invokeCalls("download_model")).toHaveLength(0);
  });

  it("surfaces a rejected download request as an error, not as installed", async () => {
    failCommands["download_model"] = "Model not found: test-org/model-b.gguf";
    const state = createModelFeed();
    await refreshModelFeed(state);
    const result = await startDownload(state, "test-org/model-b.gguf");
    expect(result.ok).toBe(false);
    const status = entryStatus(state, "test-org/model-b.gguf");
    expect(status.kind).toBe("error");
    expect(status).not.toEqual({ kind: "downloaded", active: false });
  });
});

describe("E. download progress", () => {
  it("reflects deterministic progress events for the downloading model", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    await subscribeModelFeed(state);
    const progress: DownloadProgress = {
      model_id: "test-org/model-b.gguf",
      downloaded: 125829120,
      total: 503316480,
      percentage: 25,
    };
    emit(MODEL_DOWNLOAD_PROGRESS_EVENT, progress);
    expect(entryStatus(state, "test-org/model-b.gguf")).toEqual({
      kind: "downloading",
      downloaded: 125829120,
      total: 503316480,
      percentage: 25,
    });
  });

  it("ignores progress for ids outside the catalog (no phantom rows)", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    await subscribeModelFeed(state);
    applyDownloadProgress(state, {
      model_id: "phantom/model.gguf",
      downloaded: 10,
      total: 100,
      percentage: 10,
    });
    expect(visibleEntries(state).map((e) => e.id)).not.toContain("phantom/model.gguf");
    expect(entryStatus(state, "phantom/model.gguf")).toEqual({
      kind: "unavailable",
      reason: "unknown model",
    });
  });

  it("shows the verifying phase between bytes-complete and installed", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    applyVerificationStarted(state, "test-org/model-b.gguf");
    expect(entryStatus(state, "test-org/model-b.gguf")).toEqual({ kind: "verifying" });
    applyVerificationCompleted(state, "test-org/model-b.gguf");
    expect(entryStatus(state, "test-org/model-b.gguf")).toEqual({ kind: "available" });
  });
});

describe("F. download completion", () => {
  it("proves installation by backend re-read, then allows selection", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    await subscribeModelFeed(state);
    await startDownload(state, "test-org/model-b.gguf");
    markDownloaded("test-org/model-b.gguf");
    const readsBefore = invokeCalls("get_available_models").length;
    emit(MODEL_DOWNLOAD_COMPLETE_EVENT, "test-org/model-b.gguf");
    await Promise.resolve();
    await Promise.resolve();
    expect(invokeCalls("get_available_models").length).toBeGreaterThan(readsBefore);
    expect(entryStatus(state, "test-org/model-b.gguf")).toEqual({
      kind: "downloaded",
      active: false,
    });
    expect(await selectModel(state, "test-org/model-b.gguf")).toEqual({ ok: true });
  });
});

describe("G. download failure", () => {
  it("surfaces the backend error, stays not-installed, and stays recoverable", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    await subscribeModelFeed(state);
    await startDownload(state, "test-org/model-b.gguf");
    const failure: ModelDownloadFailed = {
      model_id: "test-org/model-b.gguf",
      error: "server returned HTTP 404",
    };
    emit(MODEL_DOWNLOAD_FAILED_EVENT, failure);
    const status = entryStatus(state, "test-org/model-b.gguf");
    expect(status).toEqual({ kind: "error", message: "server returned HTTP 404" });
    const retry = await startDownload(state, "test-org/model-b.gguf");
    expect(retry).toEqual({ ok: true });
    expect(invokeCalls("download_model")).toHaveLength(2);
  });

  it("a backend refresh showing downloaded clears the stale error", async () => {
    const state: ModelFeedState = {
      ...createModelFeed(),
      errors: { "test-org/model-b.gguf": "server returned HTTP 404" },
    };
    markDownloaded("test-org/model-b.gguf");
    await refreshModelFeed(state);
    expect(entryStatus(state, "test-org/model-b.gguf")).toEqual({
      kind: "downloaded",
      active: false,
    });
  });
});

describe("H. cancellation", () => {
  it("never displays a cancelled download as complete", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    await subscribeModelFeed(state);
    await startDownload(state, "test-org/model-b.gguf");
    emit(MODEL_DOWNLOAD_PROGRESS_EVENT, {
      model_id: "test-org/model-b.gguf",
      downloaded: 50,
      total: 100,
      percentage: 50,
    } satisfies DownloadProgress);
    await cancelModelDownload(state, "test-org/model-b.gguf");
    expect(invokeCalls("cancel_download")).toHaveLength(1);
    await applyDownloadCancelled(state, "test-org/model-b.gguf");
    const status = entryStatus(state, "test-org/model-b.gguf");
    expect(status).not.toEqual({ kind: "downloaded", active: false });
    expect(status).not.toEqual({ kind: "error", message: expect.anything() });
  });
});

describe("I. reload / persistence", () => {
  it("reads the active model from the canonical persisted backend state", async () => {
    const first = createModelFeed();
    await refreshModelFeed(first);
    expect(first.activeModelId).toBe("test-org/model-a.gguf");
    currentModel = "test-org/model-b.gguf";
    const second = createModelFeed();
    await refreshModelFeed(second);
    expect(second.activeModelId).toBe("test-org/model-b.gguf");
  });

  it("follows backend state-change events for the active marker", async () => {
    markDownloaded("test-org/model-b.gguf");
    const state = createModelFeed();
    await refreshModelFeed(state);
    const changed: ModelStateEvent = {
      event_type: "selection_changed",
      model_id: "test-org/model-b.gguf",
      model_name: "Model B",
      error: null,
    };
    applyModelStateChanged(state, changed);
    expect(state.activeModelId).toBe("test-org/model-b.gguf");
    applyModelStateChanged(state, {
      event_type: "loading_failed",
      model_id: "test-org/model-b.gguf",
      model_name: "Model B",
      error: "incompatible backend",
    });
    expect(state.activeModelId).toBe("test-org/model-b.gguf");
    expect(entryStatus(state, "test-org/model-b.gguf").kind).toBe("error");
  });

  it("refreshes the catalog when the backend announces updates", async () => {
    const state = createModelFeed();
    await refreshModelFeed(state);
    const readsBefore = invokeCalls("get_available_models").length;
    catalog.push(hfEntry({ id: "test-org/model-c.gguf", is_downloaded: true }));
    await applyModelsUpdated(state);
    expect(invokeCalls("get_available_models").length).toBe(readsBefore + 1);
    expect(visibleEntries(state).map((e) => e.id)).toContain("test-org/model-c.gguf");
  });
});

describe("J. no fake state", () => {
  it("starts empty and derives everything from backend reads and events", async () => {
    const state = createModelFeed();
    expect(state.entries).toEqual([]);
    expect(state.activeModelId).toBe("");
    expect(state.loaded).toBe(false);
    await refreshModelFeed(state);
    expect(state.loaded).toBe(true);
    expect(invokeCalls("get_available_models")).toHaveLength(1);
    expect(invokeCalls("get_current_model")).toHaveLength(1);
  });
});
