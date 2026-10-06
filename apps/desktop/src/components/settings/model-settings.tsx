import { useEffect, useRef, useState } from "react";
import type { ModelSettings } from "../../ipc";
import { loadSettings, updateModelSettings } from "../../ipc";
import {
  createModelFeed,
  engineOf,
  entryStatus,
  refreshModelFeed,
  selectModel,
  startDownload,
  cancelModelDownload,
  subscribeModelFeed,
  visibleEntries,
  type ModelFeedState,
} from "../../model-feed";

/**
 * R1-GAP-017 — model selector wired to the real backend contract.
 *
 * Catalog entries, installed/downloaded flags, and the active model come
 * from `get_available_models` / `get_current_model` (via `model-feed.ts`);
 * selection goes through the canonical `set_active_model`; downloads go
 * through `download_model` with progress/status from the backend event bus.
 * Nothing here invents models, availability, or completion.
 *
 * Layout, controls, and interaction patterns are unchanged (engine select,
 * model select, status row). The legacy "Available" checkbox is gone: it
 * fabricated installed state by hand. The `soravo_config` store writes are
 * kept as-is for the fields that store owns (`selectedEngine`, and
 * `selectedModel` mirrored only after a successful canonical selection) —
 * unifying the two settings stores is R1-GAP-023, explicitly not this task.
 */
export function ModelSettings() {
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const feedRef = useRef<ModelFeedState | null>(null);
  if (feedRef.current === null) {
    feedRef.current = createModelFeed();
  }
  const [, setVersion] = useState(0);

  useEffect(() => {
    const feed = feedRef.current as ModelFeedState;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const bump = () => {
      if (!cancelled) {
        setVersion((v) => v + 1);
      }
    };
    loadSettings()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setSettings(res.data.model);
        } else {
          setError(res.message);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    refreshModelFeed(feed)
      .then(() => {
        if (cancelled) return;
        if (feed.loadError !== null) {
          setFeedError(feed.loadError);
        }
        bump();
        return subscribeModelFeed(feed, bump).then((unsub) => {
          unsubscribe = unsub;
        });
      })
      .catch((e: Error) => {
        if (!cancelled) setFeedError(e.message);
      });
    return () => {
      cancelled = true;
      if (unsubscribe !== null) {
        unsubscribe();
      }
    };
  }, []);

  const handleEngineChange = (engine: string) => {
    if (!settings) return;
    const updated: ModelSettings = {
      ...settings,
      selectedEngine: engine,
      selectedModel: null,
    };
    updateModelSettings(updated).then((res) => {
      if (res.success) {
        setSettings(updated);
      } else {
        setError(res.message);
      }
    });
  };

  const handleModelChange = (model: string) => {
    const feed = feedRef.current as ModelFeedState;
    if (!settings || model === "") return;
    selectModel(feed, model)
      .then((result) => {
        if (!result.ok) {
          setFeedError(result.error);
          setVersion((v) => v + 1);
          return;
        }
        setFeedError(null);
        const updated: ModelSettings = {
          ...settings,
          selectedModel: model,
          available: true,
          status: "ready",
        };
        return updateModelSettings(updated).then((res) => {
          if (res.success) {
            setSettings(updated);
          } else {
            setError(res.message);
          }
          setVersion((v) => v + 1);
        });
      })
      .catch((e: Error) => setFeedError(e.message));
  };

  const handleDownload = (model: string) => {
    const feed = feedRef.current as ModelFeedState;
    startDownload(feed, model)
      .then((result) => {
        if (!result.ok) {
          setFeedError(result.error);
        } else {
          setFeedError(null);
        }
        setVersion((v) => v + 1);
      })
      .catch((e: Error) => setFeedError(e.message));
  };

  const handleCancelDownload = (model: string) => {
    const feed = feedRef.current as ModelFeedState;
    cancelModelDownload(feed, model)
      .then(() => setVersion((v) => v + 1))
      .catch((e: Error) => setFeedError(e.message));
  };

  if (error) {
    return <div className="settings-error">Error: {error}</div>;
  }

  if (!settings) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  const feed = feedRef.current as ModelFeedState;
  const entries = visibleEntries(feed);
  const engines = Array.from(new Set(entries.map((entry) => engineOf(entry)))).sort();
  const storedEngine = settings.selectedEngine;
  const activeEngine =
    storedEngine !== null && engines.some((engine) => engine === storedEngine)
      ? storedEngine
      : (entries.find((entry) => entry.id === feed.activeModelId)?.engine_type ??
        engines[0] ??
        "");
  const engineModels = entries.filter((entry) => engineOf(entry) === activeEngine);
  const selectedId =
    settings.selectedModel && engineModels.some((entry) => entry.id === settings.selectedModel)
      ? settings.selectedModel
      : (feed.activeModelId !== "" &&
          engineModels.some((entry) => entry.id === feed.activeModelId)
          ? feed.activeModelId
          : "");
  const selectedStatus = selectedId !== "" ? entryStatus(feed, selectedId) : null;

  const renderStatus = () => {
    if (!feed.loaded) {
      return <span>Loading models…</span>;
    }
    if (selectedStatus === null) {
      return <span>Select a model</span>;
    }
    switch (selectedStatus.kind) {
      case "downloaded":
        return <span>{selectedStatus.active ? "Ready (active)" : "Ready"}</span>;
      case "downloading":
        return (
          <span>
            Downloading — {Math.floor(selectedStatus.percentage)}% ({selectedStatus.downloaded} /{" "}
            {selectedStatus.total} bytes)
          </span>
        );
      case "verifying":
        return <span>Verifying checksum…</span>;
      case "available":
        return <span>Not installed</span>;
      case "unavailable":
        return <span>{selectedStatus.reason}</span>;
      case "error":
        return <span>Error: {selectedStatus.message}</span>;
    }
  };

  const renderDownloadAction = () => {
    if (!feed.loaded || selectedId === "" || selectedStatus === null) {
      return null;
    }
    if (selectedStatus.kind === "available" || selectedStatus.kind === "error") {
      return (
        <div className="settings-row">
          <button type="button" onClick={() => handleDownload(selectedId)}>
            {selectedStatus.kind === "error" ? "Retry download" : "Download"}
          </button>
        </div>
      );
    }
    if (selectedStatus.kind === "downloading" || selectedStatus.kind === "verifying") {
      return (
        <div className="settings-row">
          <button type="button" onClick={() => handleCancelDownload(selectedId)}>
            Cancel download
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="settings-section">
      <h2>Models</h2>
      {feedError && <div className="settings-error">Error: {feedError}</div>}
      <div className="settings-row">
        <label htmlFor="engine-select">Engine</label>
        <select
          id="engine-select"
          value={activeEngine}
          onChange={(e) => handleEngineChange(e.target.value)}
        >
          <option value="">Select engine</option>
          {engines.map((engine) => (
            <option key={engine} value={engine}>
              {engine}
            </option>
          ))}
        </select>
      </div>
      {activeEngine !== "" && (
        <div className="settings-row">
          <label htmlFor="model-select">Model</label>
          <select
            id="model-select"
            value={selectedId}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            <option value="">Select model</option>
            {engineModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="settings-row">
        <label htmlFor="model-status">Status</label>
        <span>{renderStatus()}</span>
      </div>
      {renderDownloadAction()}
    </div>
  );
}
