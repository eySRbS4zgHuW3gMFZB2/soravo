import { useEffect, useRef, useState } from "react";
import { Check, Copy, RotateCcw, Star, Trash2 } from "lucide-react";
import {
  createHistoryFeed,
  deleteHistoryEntryFromFeed,
  hasHistoryText,
  historyDisplayText,
  loadMoreHistoryFeed,
  refreshHistoryFeed,
  retryHistoryEntry,
  subscribeHistoryFeed,
  toggleHistorySaved,
  type HistoryFeedState,
} from "../../history-feed";

/**
 * R1-GAP-018 — history list wired to the real backend contract.
 *
 * Entries, order, pagination, and mutation outcomes all come from
 * `get_history_entries` / the canonical action commands (via
 * `history-feed.ts`); the component never invents rows, order, or
 * completion. Adapted from Handy `HistorySettings.tsx` with Soravo-owned
 * differences: no i18n (Soravo has none), no toast library (inline errors
 * per the repo's `settings-error` convention), no audio player (no
 * `@tauri-apps/plugin-fs` in the dependency graph — deferred), an explicit
 * Load-more button instead of an IntersectionObserver sentinel (deterministic
 * and keyboard-reachable), and display text following the tray's
 * post-processed-first rule so history copy agrees with tray copy.
 */
export function HistorySettings() {
  const feedRef = useRef<HistoryFeedState | null>(null);
  if (feedRef.current === null) {
    feedRef.current = createHistoryFeed();
  }
  const [, setVersion] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    const feed = feedRef.current as HistoryFeedState;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const bump = () => {
      if (!cancelled) {
        setVersion((v) => v + 1);
      }
    };
    refreshHistoryFeed(feed)
      .then(() => {
        if (cancelled) return;
        bump();
        return subscribeHistoryFeed(feed, bump).then((unsub) => {
          unsubscribe = unsub;
        });
      })
      .catch(() => {
        if (!cancelled) bump();
      });
    return () => {
      cancelled = true;
      if (unsubscribe !== null) {
        unsubscribe();
      }
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
    };
  }, []);

  const feed = feedRef.current as HistoryFeedState;

  const handleCopy = (id: number, text: string) => {
    if (text.trim().length === 0) return;
    const clipboard = navigator.clipboard;
    if (!clipboard) {
      feed.errors[id] = "Clipboard unavailable";
      setVersion((v) => v + 1);
      return;
    }
    clipboard.writeText(text).then(
      () => {
        setCopiedId(id);
        if (copyTimer.current !== null) {
          window.clearTimeout(copyTimer.current);
        }
        copyTimer.current = window.setTimeout(() => setCopiedId(null), 2000);
      },
      () => {
        feed.errors[id] = "Copy failed";
        setVersion((v) => v + 1);
      }
    );
  };

  const handleToggleSaved = (id: number) => {
    toggleHistorySaved(feed, id).then(() => setVersion((v) => v + 1));
  };

  const handleDelete = (id: number) => {
    deleteHistoryEntryFromFeed(feed, id).then(() => setVersion((v) => v + 1));
  };

  const handleRetry = (id: number) => {
    retryHistoryEntry(feed, id).then(() => setVersion((v) => v + 1));
  };

  const handleLoadMore = () => {
    loadMoreHistoryFeed(feed).then(() => setVersion((v) => v + 1));
  };

  const handleReload = () => {
    refreshHistoryFeed(feed).then(() => setVersion((v) => v + 1));
  };

  if (!feed.loaded) {
    return (
      <div className="settings-section">
        <h2>History</h2>
        <p className="settings-loading" role="status">
          Loading history…
        </p>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h2>History</h2>
      {feed.loadError !== null && (
        <p className="settings-error" role="alert">
          {feed.loadError}{" "}
          <button type="button" className="ghost-link" onClick={handleReload}>
            Retry
          </button>
        </p>
      )}
      {feed.entries.length === 0 ? (
        <p className="settings-loading" role="status">
          No transcriptions yet. Dictate something and it will appear here.
        </p>
      ) : (
        <>
          <ul className="history-list">
            {feed.entries.map((entry) => {
              const text = historyDisplayText(entry);
              const hasText = hasHistoryText(entry);
              const entryError = feed.errors[entry.id];
              const retrying = feed.pendingRetries[entry.id] === true;
              const date = new Date(entry.timestamp * 1000);
              return (
                <li key={entry.id} className="history-entry">
                  <div className="history-entry-head">
                    <div>
                      <p className="history-entry-title">{entry.title}</p>
                      <time
                        className="history-entry-date"
                        dateTime={date.toISOString()}
                      >
                        {date.toLocaleString()}
                      </time>
                    </div>
                    <div
                      className="history-entry-actions"
                      role="group"
                      aria-label={`Actions for ${entry.title}`}
                    >
                      <button
                        type="button"
                        title="Copy text"
                        aria-label={`Copy text of ${entry.title}`}
                        disabled={!hasText || retrying}
                        onClick={() => handleCopy(entry.id, text)}
                      >
                        {copiedId === entry.id ? (
                          <Check width={16} height={16} aria-hidden="true" />
                        ) : (
                          <Copy width={16} height={16} aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        title={entry.saved ? "Unsave" : "Save"}
                        aria-label={`${entry.saved ? "Unsave" : "Save"} ${entry.title}`}
                        aria-pressed={entry.saved}
                        disabled={retrying}
                        onClick={() => handleToggleSaved(entry.id)}
                      >
                        <Star
                          width={16}
                          height={16}
                          aria-hidden="true"
                          fill={entry.saved ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        type="button"
                        title="Re-transcribe"
                        aria-label={`Re-transcribe ${entry.title}`}
                        disabled={retrying}
                        onClick={() => handleRetry(entry.id)}
                      >
                        <RotateCcw width={16} height={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        aria-label={`Delete ${entry.title}`}
                        disabled={retrying}
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 width={16} height={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="history-entry-text">
                    {retrying
                      ? "Re-transcribing…"
                      : hasText
                        ? text
                        : "Transcription failed."}
                  </p>
                  {entryError !== undefined && (
                    <p className="history-entry-error" role="alert">
                      {entryError}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {feed.hasMore && (
            <button
              type="button"
              className="history-load-more"
              disabled={feed.loading}
              onClick={handleLoadMore}
            >
              {feed.loading ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
