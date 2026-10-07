import { beforeEach, describe, expect, it, vi } from "vitest";
import { HISTORY_UPDATE_EVENT, type HistoryEntry } from "./ipc";
import {
  applyHistoryAdded,
  applyHistoryUpdate,
  applyHistoryUpdated,
  createHistoryFeed,
  deleteHistoryEntryFromFeed,
  hasHistoryText,
  historyDisplayText,
  HISTORY_PAGE_SIZE,
  loadMoreHistoryFeed,
  refreshHistoryFeed,
  retryHistoryEntry,
  subscribeHistoryFeed,
  toggleHistorySaved,
} from "./history-feed";

const invoke = vi.hoisted(() => vi.fn());
const listen = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

/**
 * R1-GAP-018 — history UI fold proof over the mocked IPC boundary. Same
 * mock conventions as `model-feed.test.ts` (hoisted `invoke`/`listen`,
 * real Tauri event-envelope unwrapping in `ipc.ts`).
 *
 * Canonical rules under test: entries come from `get_history_entries`
 * newest-first with cursor pagination (`has_more`); the UI never invents
 * rows, order, or completion; delete/toggle/retry go through the exact
 * canonical commands exactly once per intent with optimistic updates that
 * revert on failure; `history-update-payload` `added`/`updated` events
 * merge without duplication while `deleted`/`toggled` echoes are ignored;
 * unmount removes the listener. No test touches SQLite, the network, or a
 * production model.
 */

type Captured = { event: string; handler: (event: { payload: unknown }) => void };

let captured: Captured[];
let pages: HistoryEntry[];
let failCommands: Record<string, string>;
let invokeDelayMs: number;

function entry(overrides: Partial<HistoryEntry> & { id: number }): HistoryEntry {
  return {
    file_name: `recording-${overrides.id}.wav`,
    timestamp: 1700000000 + overrides.id,
    saved: false,
    title: `Recording ${overrides.id}`,
    transcription_text: `transcript ${overrides.id}`,
    post_processed_text: null,
    post_process_prompt: null,
    post_process_requested: false,
    ...overrides,
  };
}

beforeEach(() => {
  invoke.mockReset();
  listen.mockReset();
  captured = [];
  // Backend serves newest-first (`ORDER BY id DESC`).
  pages = [entry({ id: 3 }), entry({ id: 2 }), entry({ id: 1 })];
  failCommands = {};
  invokeDelayMs = 0;
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
      case "get_history_entries": {
        const cursor = args?.["cursor"] as number | null;
        const limit = (args?.["limit"] as number | null) ?? HISTORY_PAGE_SIZE;
        const filtered =
          cursor === null || cursor === undefined
            ? [...pages]
            : pages.filter((known) => known.id < cursor);
        const slice = filtered.slice(0, limit);
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                entries: slice.map((known) => ({ ...known })),
                has_more: filtered.length > slice.length,
              }),
            invokeDelayMs
          )
        );
      }
      case "toggle_history_entry_saved":
      case "delete_history_entry":
      case "retry_history_entry_transcription":
        return Promise.resolve(undefined);
      default:
        return Promise.reject(new Error(`unexpected command ${command}`));
    }
  });
});

function emit(event: string, payload: unknown): void {
  const found = captured.find((c) => c.event === event);
  if (!found) throw new Error(`bus subscription missing: ${event}`);
  found.handler({ payload });
}

function invokeCalls(command: string): unknown[][] {
  return invoke.mock.calls.filter(([name]) => name === command);
}

function soleCallArgs(command: string): Record<string, unknown> {
  const calls = invokeCalls(command);
  if (calls.length !== 1 || calls[0] === undefined || calls[0][1] === undefined) {
    throw new Error(`expected exactly one call to ${command}`);
  }
  return calls[0][1] as Record<string, unknown>;
}

describe("history event contract", () => {
  it("exposes the stable canonical history bus name", () => {
    expect(HISTORY_UPDATE_EVENT).toBe("history-update-payload");
  });

  it("subscribes to the history bus exactly once", async () => {
    const state = createHistoryFeed();
    const unsubscribe = await subscribeHistoryFeed(state);
    expect(listen).toHaveBeenCalledTimes(1);
    expect(captured.map((c) => c.event)).toEqual(["history-update-payload"]);
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });
});

describe("A. load history", () => {
  it("renders backend entries in backend order with cursor pagination args", async () => {
    const state = createHistoryFeed();
    expect(state.entries).toEqual([]);
    await refreshHistoryFeed(state);
    expect(state.entries.map((known) => known.id)).toEqual([3, 2, 1]);
    expect(state.loaded).toBe(true);
    expect(state.loadError).toBeNull();
    expect(soleCallArgs("get_history_entries")).toEqual({
      cursor: null,
      limit: HISTORY_PAGE_SIZE,
    });
  });

  it("appends the next page after the oldest entry without duplicates", async () => {
    pages = [
      entry({ id: 5 }),
      entry({ id: 4 }),
      entry({ id: 3 }),
      entry({ id: 2 }),
      entry({ id: 1 }),
    ];
    const state = createHistoryFeed();
    // Force two pages: first read returns 2 of 5.
    invoke.mockImplementationOnce(() =>
      Promise.resolve({
        entries: [entry({ id: 5 }), entry({ id: 4 })],
        has_more: true,
      })
    );
    await refreshHistoryFeed(state);
    expect(state.hasMore).toBe(true);
    await loadMoreHistoryFeed(state);
    expect(state.entries.map((known) => known.id)).toEqual([5, 4, 3, 2, 1]);
    const historyCalls = invokeCalls("get_history_entries");
    expect(historyCalls).toHaveLength(2);
    expect(historyCalls[0]?.[1]).toEqual({ cursor: null, limit: HISTORY_PAGE_SIZE });
    expect(historyCalls[1]?.[1]).toEqual({ cursor: 4, limit: HISTORY_PAGE_SIZE });
  });
});

describe("B. empty state", () => {
  it("represents an empty backend result without error", async () => {
    pages = [];
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    expect(state.loaded).toBe(true);
    expect(state.entries).toEqual([]);
    expect(state.hasMore).toBe(false);
    expect(state.loadError).toBeNull();
  });
});

describe("C. ordering", () => {
  it("preserves deterministic backend order verbatim", async () => {
    pages = [entry({ id: 9 }), entry({ id: 7 }), entry({ id: 8 })];
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    expect(state.entries.map((known) => known.id)).toEqual([9, 7, 8]);
  });
});

describe("D. loading", () => {
  it("reports loading during a delayed fetch and resolves cleanly", async () => {
    invokeDelayMs = 25;
    const state = createHistoryFeed();
    const pending = refreshHistoryFeed(state);
    expect(state.loading).toBe(true);
    await pending;
    expect(state.loading).toBe(false);
    expect(state.entries.map((known) => known.id)).toEqual([3, 2, 1]);
  });

  it("guards re-entrant refreshes to a single invoke", async () => {
    invokeDelayMs = 25;
    const state = createHistoryFeed();
    await Promise.all([refreshHistoryFeed(state), refreshHistoryFeed(state)]);
    expect(invokeCalls("get_history_entries")).toHaveLength(1);
    expect(state.entries.map((known) => known.id)).toEqual([3, 2, 1]);
  });
});

describe("E. error", () => {
  it("surfaces IPC failure without a fake successful state", async () => {
    failCommands["get_history_entries"] = "history.db unavailable";
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    expect(state.loaded).toBe(true);
    expect(state.loadError).toBe("history.db unavailable");
    expect(state.entries).toEqual([]);
  });

  it("keeps previous entries when a refresh fails", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    expect(state.entries).toHaveLength(3);
    failCommands["get_history_entries"] = "disk error";
    await refreshHistoryFeed(state);
    expect(state.loadError).toBe("disk error");
    expect(state.entries.map((known) => known.id)).toEqual([3, 2, 1]);
  });
});

describe("F. data refresh / remount", () => {
  it("replaces entries on refresh and dedupes repeated pages", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    await refreshHistoryFeed(state);
    expect(state.entries.map((known) => known.id)).toEqual([3, 2, 1]);
    // A remount starts from a fresh fold and re-reads canonical state.
    const remounted = createHistoryFeed();
    await refreshHistoryFeed(remounted);
    expect(remounted.entries.map((known) => known.id)).toEqual([3, 2, 1]);
  });

  it("merges added events without duplicating refreshed rows", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    applyHistoryAdded(state, entry({ id: 3, transcription_text: "newer text" }));
    expect(state.entries).toHaveLength(3);
    expect(state.entries.map((known) => known.id)).toEqual([3, 2, 1]);
    expect(state.entries[0]).toMatchObject({ id: 3, transcription_text: "newer text" });
  });

  it("does not page before the first load or past the last page", async () => {
    const state = createHistoryFeed();
    await loadMoreHistoryFeed(state);
    expect(invokeCalls("get_history_entries")).toHaveLength(0);
    await refreshHistoryFeed(state);
    expect(state.hasMore).toBe(false);
    await loadMoreHistoryFeed(state);
    expect(invokeCalls("get_history_entries")).toHaveLength(1);
  });
});

describe("G. history actions", () => {
  it("deletes through the exact canonical command and restores on failure", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    const result = await deleteHistoryEntryFromFeed(state, 2);
    expect(result).toEqual({ ok: true });
    expect(state.entries.map((known) => known.id)).toEqual([3, 1]);
    expect(soleCallArgs("delete_history_entry")).toEqual({ id: 2 });

    failCommands["delete_history_entry"] = "delete failed";
    const failed = await deleteHistoryEntryFromFeed(state, 3);
    expect(failed).toEqual({ ok: false, error: "delete failed" });
    // The row is restored to its original position with the error recorded.
    expect(state.entries.map((known) => known.id)).toEqual([3, 1]);
    expect(state.errors[3]).toBe("delete failed");
  });

  it("toggles saved through the exact canonical command with revert on failure", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    const result = await toggleHistorySaved(state, 1);
    expect(result).toEqual({ ok: true });
    expect(state.entries.find((known) => known.id === 1)?.saved).toBe(true);
    expect(soleCallArgs("toggle_history_entry_saved")).toEqual({ id: 1 });

    failCommands["toggle_history_entry_saved"] = "toggle failed";
    const failed = await toggleHistorySaved(state, 3);
    expect(failed).toEqual({ ok: false, error: "toggle failed" });
    expect(state.entries.find((known) => known.id === 3)?.saved).toBe(false);
    expect(state.errors[3]).toBe("toggle failed");
  });

  it("retries through the exact canonical command exactly once per intent", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    const result = await retryHistoryEntry(state, 2);
    expect(result).toEqual({ ok: true });
    expect(soleCallArgs("retry_history_entry_transcription")).toEqual({ id: 2 });

    failCommands["retry_history_entry_transcription"] = "no model loaded";
    const failed = await retryHistoryEntry(state, 1);
    expect(failed).toEqual({ ok: false, error: "no model loaded" });
    expect(state.errors[1]).toBe("no model loaded");
  });

  it("refuses unknown ids and in-flight duplicates without invoking", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    expect(await deleteHistoryEntryFromFeed(state, 999)).toEqual({
      ok: false,
      error: "History entry not found: 999",
    });
    expect(await toggleHistorySaved(state, 999)).toEqual({
      ok: false,
      error: "History entry not found: 999",
    });
    expect(await retryHistoryEntry(state, 999)).toEqual({
      ok: false,
      error: "History entry not found: 999",
    });
    expect(invokeCalls("delete_history_entry")).toHaveLength(0);
    expect(invokeCalls("toggle_history_entry_saved")).toHaveLength(0);
    expect(invokeCalls("retry_history_entry_transcription")).toHaveLength(0);

    invokeDelayMs = 25;
    const first = deleteHistoryEntryFromFeed(state, 1);
    const second = await deleteHistoryEntryFromFeed(state, 1);
    expect(second).toEqual({ ok: false, error: "Delete already in progress: 1" });
    expect((await first).ok).toBe(true);
    expect(invokeCalls("delete_history_entry")).toHaveLength(1);
  });
});

describe("H. text integrity", () => {
  it("prefers post-processed text and falls back to raw transcription", () => {
    const processed = entry({ id: 1, post_processed_text: "polished text" });
    expect(historyDisplayText(processed)).toBe("polished text");
    const raw = entry({ id: 2 });
    expect(historyDisplayText(raw)).toBe("transcript 2");
    expect(hasHistoryText(raw)).toBe(true);
    expect(hasHistoryText(entry({ id: 3, transcription_text: "   " }))).toBe(false);
  });
});

describe("I. subscription cleanup", () => {
  it("applies added/updated events and removes the listener on unmount", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    const unlistens: (() => void)[] = [];
    listen.mockImplementationOnce(
      (event: string, handler: (event: { payload: unknown }) => void) => {
        captured.push({ event, handler });
        const unlisten = vi.fn();
        unlistens.push(unlisten);
        return Promise.resolve(unlisten);
      }
    );
    const seen: number[] = [];
    const unsubscribe = await subscribeHistoryFeed(state, () => {
      seen.push(state.entries.length);
    });
    emit(HISTORY_UPDATE_EVENT, {
      action: "added",
      entry: entry({ id: 4 }),
    });
    expect(state.entries.map((known) => known.id)).toEqual([4, 3, 2, 1]);
    emit(HISTORY_UPDATE_EVENT, {
      action: "updated",
      entry: entry({ id: 2, transcription_text: "re-transcribed" }),
    });
    expect(
      state.entries.find((known) => known.id === 2)?.transcription_text
    ).toBe("re-transcribed");
    // Unknown updates never conjure phantom rows.
    emit(HISTORY_UPDATE_EVENT, {
      action: "updated",
      entry: entry({ id: 999 }),
    });
    expect(state.entries).toHaveLength(4);
    // `deleted` / `toggled` echoes are owned by the optimistic update.
    emit(HISTORY_UPDATE_EVENT, { action: "deleted", id: 4 });
    emit(HISTORY_UPDATE_EVENT, { action: "toggled", id: 3 });
    expect(state.entries.map((known) => known.id)).toEqual([4, 3, 2, 1]);
    expect(seen.length).toBeGreaterThan(0);

    unsubscribe();
    expect(unlistens).toHaveLength(1);
    expect(unlistens[0]).toHaveBeenCalledTimes(1);
  });

  it("applies updates through the pure reducer without a subscription", () => {
    const state = createHistoryFeed();
    applyHistoryUpdate(state, { action: "added", entry: entry({ id: 1 }) });
    applyHistoryUpdate(state, {
      action: "updated",
      entry: entry({ id: 1, saved: true }),
    });
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]?.saved).toBe(true);
    applyHistoryUpdated(state, entry({ id: 4242 }));
    expect(state.entries).toHaveLength(1);
  });
});

describe("J. Handy adaptation regression", () => {
  it("never double-mutates from an action echo", async () => {
    const state = createHistoryFeed();
    await refreshHistoryFeed(state);
    await subscribeHistoryFeed(state);
    // Toggle once, then receive the backend `toggled` echo: still flipped once.
    await toggleHistorySaved(state, 1);
    expect(state.entries.find((known) => known.id === 1)?.saved).toBe(true);
    emit(HISTORY_UPDATE_EVENT, { action: "toggled", id: 1 });
    expect(state.entries.find((known) => known.id === 1)?.saved).toBe(true);
    // Delete once, then receive the backend `deleted` echo: still gone once.
    await deleteHistoryEntryFromFeed(state, 2);
    emit(HISTORY_UPDATE_EVENT, { action: "deleted", id: 2 });
    expect(state.entries.map((known) => known.id)).toEqual([3, 1]);
  });
});
