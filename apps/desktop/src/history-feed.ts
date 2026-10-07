import {
  deleteHistoryEntry,
  getHistoryEntries,
  onHistoryUpdate,
  retryHistoryEntryTranscription,
  toggleHistoryEntrySaved,
  type HistoryEntry,
  type HistoryUpdatePayload,
} from "./ipc";

/**
 * R1-GAP-018 — history fold over the EXISTING Handy-derived backend contract
 * (`managers/history.rs` + `commands/history.rs`).
 *
 * What this module does (adapted from Handy `HistorySettings.tsx` behavior,
 * reshaped to the repo's `model-feed.ts` / `session-feed.ts` fold pattern):
 * - loads entries newest-first from `get_history_entries` (never invented);
 * - pages by cursor (exclusive upper id bound) with `HISTORY_PAGE_SIZE`;
 * - routes save-toggles through `toggle_history_entry_saved`, deletions
 *   through `delete_history_entry`, re-transcriptions through
 *   `retry_history_entry_transcription` — each exactly once per intent;
 * - applies `history-update-payload` bus events (`added` → prepend,
 *   `updated` → replace; `deleted` / `toggled` carry only the id and are
 *   owned by the optimistic update, so the echo is ignored — Handy parity).
 *
 * What this module does NOT do (backend-owned, reused verbatim):
 * - entry shape, ordering, pagination, retention, persistence
 *   (`HistoryManager` — untouched);
 * - audio playback (no `@tauri-apps/plugin-fs` in the dependency graph;
 *   adding it would violate the prefer-zero-deps rule — deferred);
 * - recordings-folder opening (`open_recordings_folder` exists backend-side
 *   but is not registered on the invoke handler and no Soravo UI consumes
 *   it — deferred with the audio path).
 */

/** Handy `HistorySettings` page size parity. */
export const HISTORY_PAGE_SIZE = 30;

export type HistoryFeedState = {
  /** Backend-ordered entries, newest first. Empty until the first load. */
  entries: HistoryEntry[];
  /** Backend `has_more` from the last page read. */
  hasMore: boolean;
  /** True once the first refresh completed (success or failure). */
  loaded: boolean;
  /** A page fetch is currently in flight (re-entrancy guard). */
  loading: boolean;
  /** Last refresh failure; null when the last refresh succeeded. */
  loadError: string | null;
  /** Delete invokes currently in flight (exactly-once guard per id). */
  pendingDeletes: Record<number, boolean>;
  /** Save-toggle invokes currently in flight (exactly-once guard per id). */
  pendingToggles: Record<number, boolean>;
  /** Retry invokes currently in flight (exactly-once guard per id). */
  pendingRetries: Record<number, boolean>;
  /** Last terminal action failure per entry id (delete/toggle/retry). */
  errors: Record<number, string>;
};

export function createHistoryFeed(): HistoryFeedState {
  return {
    entries: [],
    hasMore: false,
    loaded: false,
    loading: false,
    loadError: null,
    pendingDeletes: {},
    pendingToggles: {},
    pendingRetries: {},
    errors: {},
  };
}

function findEntry(
  state: HistoryFeedState,
  id: number
): HistoryEntry | undefined {
  return state.entries.find((entry) => entry.id === id);
}

/**
 * Canonical display text for an entry. Soravo-owned rule, consistent with
 * the tray's `last_transcript_text` (`tray.rs`): the post-processed result
 * wins when present, otherwise the raw transcription. Deliberate Handy
 * difference: Handy `HistorySettings` renders `transcription_text` only,
 * which would make history copy disagree with tray copy.
 */
export function historyDisplayText(entry: HistoryEntry): string {
  return entry.post_processed_text ?? entry.transcription_text;
}

/** An entry has renderable text (empty transcriptions render as failed). */
export function hasHistoryText(entry: HistoryEntry): boolean {
  return historyDisplayText(entry).trim().length > 0;
}

/**
 * Load the first page from the backend. Entries are replaced wholesale —
 * the backend is the source of truth, so a refresh never merges stale rows.
 * A failed refresh keeps the previous entries and records `loadError`.
 */
export async function refreshHistoryFeed(
  state: HistoryFeedState
): Promise<void> {
  if (state.loading) {
    return;
  }
  state.loading = true;
  try {
    const page = await getHistoryEntries(undefined, HISTORY_PAGE_SIZE);
    state.entries = page.entries;
    state.hasMore = page.has_more;
    state.loaded = true;
    state.loadError = null;
  } catch (e) {
    state.loaded = true;
    state.loadError = e instanceof Error ? e.message : String(e);
  } finally {
    state.loading = false;
  }
}

/**
 * Append the next page after the current oldest entry. No-op while a fetch
 * is in flight, before the first load, or when the backend reports no more
 * pages. Appended rows are deduplicated by id, so a repeated cursor can
 * never conjure duplicate rows.
 */
export async function loadMoreHistoryFeed(
  state: HistoryFeedState
): Promise<void> {
  if (state.loading || !state.loaded || !state.hasMore) {
    return;
  }
  const oldest = state.entries[state.entries.length - 1];
  if (oldest === undefined) {
    return;
  }
  state.loading = true;
  try {
    const page = await getHistoryEntries(oldest.id, HISTORY_PAGE_SIZE);
    const known = new Set(state.entries.map((entry) => entry.id));
    for (const entry of page.entries) {
      if (!known.has(entry.id)) {
        known.add(entry.id);
        state.entries.push(entry);
      }
    }
    state.hasMore = page.has_more;
    state.loadError = null;
  } catch (e) {
    state.loadError = e instanceof Error ? e.message : String(e);
  } finally {
    state.loading = false;
  }
}

/**
 * Apply an `added` bus event: prepend the saved entry. If the id is already
 * present (save-then-event race against a refresh), the row is replaced
 * instead of duplicated.
 */
export function applyHistoryAdded(
  state: HistoryFeedState,
  entry: HistoryEntry
): void {
  const index = state.entries.findIndex((known) => known.id === entry.id);
  if (index === -1) {
    state.entries.unshift(entry);
  } else {
    state.entries[index] = entry;
  }
}

/** Apply an `updated` bus event: replace the row; unknown ids are ignored
 *  so the bus can never conjure a phantom row. */
export function applyHistoryUpdated(
  state: HistoryFeedState,
  entry: HistoryEntry
): void {
  const index = state.entries.findIndex((known) => known.id === entry.id);
  if (index !== -1) {
    state.entries[index] = entry;
  }
}

export type HistoryActionResult = { ok: true } | { ok: false; error: string };

function actionError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Delete an entry through the canonical `delete_history_entry` contract,
 * exactly once per intent. The row is removed optimistically and restored
 * to its original position on failure, so a failed delete never loses
 * backend state locally.
 */
export async function deleteHistoryEntryFromFeed(
  state: HistoryFeedState,
  id: number
): Promise<HistoryActionResult> {
  if (state.pendingDeletes[id] === true) {
    return { ok: false, error: `Delete already in progress: ${id}` };
  }
  const index = state.entries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return { ok: false, error: `History entry not found: ${id}` };
  }
  const removed = state.entries[index] as HistoryEntry;
  state.pendingDeletes[id] = true;
  delete state.errors[id];
  state.entries.splice(index, 1);
  try {
    await deleteHistoryEntry(id);
  } catch (e) {
    const message = actionError(e);
    state.entries.splice(Math.min(index, state.entries.length), 0, removed);
    delete state.pendingDeletes[id];
    state.errors[id] = message;
    return { ok: false, error: message };
  }
  delete state.pendingDeletes[id];
  return { ok: true };
}

/**
 * Flip the saved flag through `toggle_history_entry_saved`, exactly once
 * per intent. Optimistic flip with revert on failure (Handy parity). The
 * `toggled` bus echo carries only the id, so it is intentionally not
 * applied as a second flip.
 */
export async function toggleHistorySaved(
  state: HistoryFeedState,
  id: number
): Promise<HistoryActionResult> {
  const entry = findEntry(state, id);
  if (entry === undefined) {
    return { ok: false, error: `History entry not found: ${id}` };
  }
  if (state.pendingToggles[id] === true) {
    return { ok: false, error: `Save toggle already in progress: ${id}` };
  }
  state.pendingToggles[id] = true;
  delete state.errors[id];
  entry.saved = !entry.saved;
  try {
    await toggleHistoryEntrySaved(id);
  } catch (e) {
    const message = actionError(e);
    entry.saved = !entry.saved;
    delete state.pendingToggles[id];
    state.errors[id] = message;
    return { ok: false, error: message };
  }
  delete state.pendingToggles[id];
  return { ok: true };
}

/**
 * Re-transcribe an entry through `retry_history_entry_transcription`,
 * exactly once per intent. A returning `ok` means the backend accepted and
 * ran the request — the refreshed text arrives via the `updated` bus event
 * (the backend emits it on every successful `update_transcription`), never
 * by local invention. Failure records the backend message on the row.
 */
export async function retryHistoryEntry(
  state: HistoryFeedState,
  id: number
): Promise<HistoryActionResult> {
  if (findEntry(state, id) === undefined) {
    return { ok: false, error: `History entry not found: ${id}` };
  }
  if (state.pendingRetries[id] === true) {
    return { ok: false, error: `Retry already in progress: ${id}` };
  }
  state.pendingRetries[id] = true;
  delete state.errors[id];
  try {
    await retryHistoryEntryTranscription(id);
  } catch (e) {
    const message = actionError(e);
    delete state.pendingRetries[id];
    state.errors[id] = message;
    return { ok: false, error: message };
  }
  delete state.pendingRetries[id];
  return { ok: true };
}

/** Route one bus payload into the fold (`added`/`updated` only). */
export function applyHistoryUpdate(
  state: HistoryFeedState,
  payload: HistoryUpdatePayload
): void {
  if (payload.action === "added") {
    applyHistoryAdded(state, payload.entry);
  } else if (payload.action === "updated") {
    applyHistoryUpdated(state, payload.entry);
  }
  // `deleted` / `toggled` carry only the id and are owned by the optimistic
  // update above — the echo is intentionally ignored (Handy parity).
}

/**
 * Subscribe to the history bus exactly once. `onChange` fires after every
 * applied event so UI consumers re-render without polling. Returns a
 * combined unsubscribe for unmount cleanup.
 */
export async function subscribeHistoryFeed(
  state: HistoryFeedState,
  onChange: () => void = () => undefined
): Promise<() => void> {
  const unlisten = await onHistoryUpdate((payload) => {
    applyHistoryUpdate(state, payload);
    onChange();
  });
  return () => {
    unlisten();
  };
}
