import { useEffect, useState } from "react";
import { loadSettings, Settings } from "../../ipc";

export function GeneralSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings()
      .then((res) => {
        if (res.success) {
          setSettings(res.data);
        } else {
          setError(res.message);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="settings-error">Error: {error}</div>;
  }

  if (!settings) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-section">
      <h2>General</h2>
      <div className="settings-row">
        <label>Schema Version</label>
        <span>{settings.schema.version}</span>
      </div>
      <div className="settings-row">
        <label>Last Migrated</label>
        <span>{settings.schema.lastMigrated ?? "Never"}</span>
      </div>
    </div>
  );
}
