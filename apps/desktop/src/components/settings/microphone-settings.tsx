import { useEffect, useState } from "react";
import type { MicrophoneSettings } from "../../ipc";
import { loadSettings, updateMicrophoneSettings } from "../../ipc";

export function MicrophoneSettings() {
  const [settings, setSettings] = useState<MicrophoneSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<string[]>([]);

  useEffect(() => {
    loadSettings()
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data.microphone);
        } else {
          setError(res.message);
        }
      })
      .catch((e) => setError(e.message));

    // Simulated device list - in real impl, use audio device enumeration
    setDevices(["System Default", "Built-in Microphone", "External USB Mic"]);
  }, []);

  const handleDeviceChange = (index: string) => {
    if (!settings) return;
    const updated: MicrophoneSettings = {
      ...settings,
      selectedDeviceIndex: index || null,
      selectedDeviceName: index ? devices[Number(index)] ?? null : null,
      deviceAvailable: true,
    };
    updateMicrophoneSettings(updated).then((res) => {
      if (res.success) {
        setSettings(updated);
      } else {
        setError(res.message);
      }
    });
  };

  const handleAutoFallbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const updated: MicrophoneSettings = {
      ...settings,
      autoFallback: e.target.checked,
    };
    updateMicrophoneSettings(updated).then((res) => {
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
      <h2>Microphone</h2>
      <div className="settings-row">
        <label htmlFor="device-select">Input Device</label>
        <select
          id="device-select"
          value={settings.selectedDeviceIndex ?? ""}
          onChange={(e) => handleDeviceChange(e.target.value)}
        >
          <option value="">System Default</option>
          {devices.map((device, i) => (
            <option key={device} value={i.toString()}>
              {device}
            </option>
          ))}
        </select>
      </div>
      <div className="settings-row">
        <label htmlFor="device-status">Status</label>
        <span className={settings.deviceAvailable ? "status-ok" : "status-error"}>
          {settings.deviceAvailable ? "Available" : "Not Available"}
        </span>
      </div>
      <div className="settings-row">
        <label htmlFor="auto-fallback">Auto Fallback</label>
        <input
          id="auto-fallback"
          type="checkbox"
          checked={settings.autoFallback}
          onChange={handleAutoFallbackChange}
        />
      </div>
      <small>
        When enabled, will automatically switch to an available device if
        current device disconnects.
      </small>
    </div>
  );
}
