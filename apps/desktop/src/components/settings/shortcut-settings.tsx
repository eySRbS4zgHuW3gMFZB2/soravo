import { useEffect, useState } from "react";
import { loadSettings, updateHotkeySettings, HotkeySettings } from "../../ipc";

type KeyCode =
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9"
  | "F10"
  | "F11"
  | "F12"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "Space";

const functionKEYS: KeyCode[] = [
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
  "A", "B", "C", "D", "E", "Space"
];

const MODIFIERS = ["Ctrl", "Shift", "Alt", "Meta"];

export function ShortcutSettings() {
  const [settings, setSettings] = useState<HotkeySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

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

  const startRecording = () => {
    setRecording(true);
    if (settings) {
      const updated: HotkeySettings = { ...settings, recordingInProgress: true };
      updateHotkeySettings(updated).catch(console.error);
    }
  };

  const stopRecording = () => {
    setRecording(false);
    if (settings) {
      const updated: HotkeySettings = { ...settings, recordingInProgress: false };
      updateHotkeySettings(updated).catch(console.error);
    }
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
      <div className="settings-row">
        <button type="button" onClick={startRecording} disabled={recording}>
          {recording ? "Recording..." : "Record Shortcut"}
        </button>
      </div>
      <small>
        Press the key combination you want to use. Hold+Space, Ctrl+Shift+S, etc.
      </small>
    </div>
  );
}
