import { useEffect, useState } from "react";
import type { ModelSettings } from "../../ipc";
import { loadSettings, updateModelSettings } from "../../ipc";

const ENGINES = ["whisper", "parakeet", "local"];

const MODELS: Record<string, string[]> = {
  whisper: ["whisper-tiny", "whisper-base", "whisper-small"],
  parakeet: ["parakeet-1.1b", "parakeet-2.4b"],
  local: ["local-model-v1"],
};

export function ModelSettings() {
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings()
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data.model);
        } else {
          setError(res.message);
        }
      })
      .catch((e) => setError(e.message));
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
    if (!settings) return;
    const updated: ModelSettings = {
      ...settings,
      selectedModel: model,
    };
    updateModelSettings(updated).then((res) => {
      if (res.success) {
        setSettings(updated);
      } else {
        setError(res.message);
      }
    });
  };

  const handleAvailableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const updated: ModelSettings = {
      ...settings,
      available: e.target.checked,
      status: e.target.checked ? "ready" : "not_installed",
    };
    updateModelSettings(updated).then((res) => {
      if (res.success) {
        setSettings(updated);
      } else {
        setError(res.message);
      }
    });
  };

  if (error) {
    return <div className="settings-error">Error: {error}</div>;
  }

  if (!settings) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  const selectedModels = settings.selectedEngine
    ? MODELS[settings.selectedEngine] ?? []
    : [];

  return (
    <div className="settings-section">
      <h2>Models</h2>
      <div className="settings-row">
        <label htmlFor="engine-select">Engine</label>
        <select
          id="engine-select"
          value={settings.selectedEngine ?? ""}
          onChange={(e) => handleEngineChange(e.target.value)}
        >
          <option value="">Select engine</option>
          {ENGINES.map((engine) => (
            <option key={engine} value={engine}>
              {engine}
            </option>
          ))}
        </select>
      </div>
      {settings.selectedEngine && (
        <div className="settings-row">
          <label htmlFor="model-select">Model</label>
          <select
            id="model-select"
            value={settings.selectedModel ?? ""}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            <option value="">Select model</option>
            {selectedModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="settings-row">
        <label htmlFor="model-status">Status</label>
        <span>
          {settings.status}
        </span>
      </div>
      <div className="settings-row">
        <label htmlFor="model-available">Available</label>
        <input
          id="model-available"
          type="checkbox"
          checked={settings.available}
          onChange={handleAvailableChange}
        />
      </div>
      {settings.status === "not_installed" && (
        <small>Models will be downloaded and verified after benchmarking.</small>
      )}
    </div>
  );
}
