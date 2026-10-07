import { useEffect, useState } from "react";
import { loadSettings, updateHotkeySettings, HotkeySettings } from "../../ipc";

export function ShortcutSettings() {
  const [settings, setSettings] = useState<HotkeySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings()
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data.hotkey);
        } else {
          setError(res.message);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  const handleModeChange = (mode: "hold_to_talk" | "toggle_to_talk") => {
    if (!settings) return;
    const updated: HotkeySettings = { ...settings, mode };
    updateHotkeySettings(updated).then((res) => {
      if (res.success) {
        setSettings(updated);
      } else {
        setError(res.message);
      }
    });
  };

  const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const updated: HotkeySettings = { ...settings, enabled: e.target.checked };
    updateHotkeySettings(updated).then((res) => {
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

  return (
    <div className="settings-section">
      <h2>Shortcut</h2>
      <div className="settings-row">
        <label htmlFor="shortcut-enable">Enable Shortcut</label>
        <input
          id="shortcut-enable"
          type="checkbox"
          checked={settings.enabled}
          onChange={handleEnabledChange}
        />
      </div>
      <div className="settings-row">
        <label htmlFor="interaction-mode">Mode</label>
        <select
          id="interaction-mode"
          value={settings.mode}
          onChange={(e) =>
            handleModeChange(
              e.target.value as "hold_to_talk" | "toggle_to_talk"
            )
          }
        >
          <option value="hold_to_talk">Hold to Talk</option>
          <option value="toggle_to_talk">Toggle to Talk</option>
        </select>
      </div>
      <div className="settings-row">
        <label>Current Shortcut</label>
        <span>
          {settings.binding ?? "Not configured"}
        </span>
      </div>
    </div>
  );
}
