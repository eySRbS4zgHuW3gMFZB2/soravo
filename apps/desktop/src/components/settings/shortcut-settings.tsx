import { useEffect, useRef, useState } from "react";
import {
  loadSettings,
  updateHotkeySettings,
  HotkeySettings,
  changeHotkeyBinding,
  resetHotkeyBinding,
  suspendHotkeyBindings,
  resumeHotkeyBindings,
  formatHotkeyFromKeyboardEvent,
} from "../../ipc";

// G2 hotkey-rebind exposure: the settings display rebinds the canonical
// `transcribe` binding. Commit, validation, persistence, and rollback all
// reuse the existing Handy-derived `change_binding` backend; this component
// only captures the combo (DOM keydown) and mirrors the committed value into
// the compatibility display via the pre-existing `update_hotkey_settings`
// (compat-owned write — no settings source-of-truth change, per ADR-032).
const TRANSCRIBE_BINDING_ID = "transcribe";

export function ShortcutSettings() {
  const [settings, setSettings] = useState<HotkeySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Guards against double-commit from key auto-repeat during capture.
  const commitDone = useRef(false);

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

  const stopCapture = () => {
    // Best-effort restore: re-register every binding from settings. Idempotent
    // backend-side; a failure here only logs, the commit already stands.
    resumeHotkeyBindings().catch(() => undefined);
    setCapturing(false);
  };

  const startCapture = () => {
    if (!settings || capturing || busy) return;
    setError(null);
    commitDone.current = false;
    // Suspend registered shortcuts so the old combo cannot fire (or swallow
    // keystrokes) mid-capture — the same precaution the HandyKeys recorder
    // takes backend-side. Best-effort: capture still works if this fails.
    suspendHotkeyBindings().catch(() => undefined);
    setCapturing(true);
  };

  const commitCapture = (combo: string) => {
    if (commitDone.current || !settings) return;
    commitDone.current = true;
    setBusy(true);
    changeHotkeyBinding(TRANSCRIBE_BINDING_ID, combo)
      .then((res) => {
        if (!res.success || !res.binding) {
          setError(res.error ?? "Failed to change shortcut");
          return;
        }
        // Mirror the committed canonical value into the compatibility display
        // (compat-owned write; the canonical store already holds it).
        const updated: HotkeySettings = {
          ...settings,
          binding: res.binding.current_binding,
        };
        return updateHotkeySettings(updated).then((saveRes) => {
          if (!saveRes.success) {
            setError(saveRes.message);
            return;
          }
          // Reload to confirm the persisted display value round-trips.
          return loadSettings().then((reload) => {
            if (reload.success && reload.data) {
              setSettings(reload.data.hotkey);
            } else {
              setSettings(updated);
            }
          });
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setBusy(false);
        stopCapture();
      });
  };

  const commitCaptureRef = useRef(commitCapture);
  commitCaptureRef.current = commitCapture;

  useEffect(() => {
    if (!capturing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      // Escape cancels capture — it never commits (Escape is also the
      // dynamic cancel binding, so committing it would be ambiguous).
      if (e.key === "Escape") {
        stopCapture();
        return;
      }
      const combo = formatHotkeyFromKeyboardEvent(e);
      if (combo === null) return; // modifier-only: keep waiting
      commitCaptureRef.current(combo);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      // Unmount-during-capture safety: re-register from settings. Idempotent
      // backend-side; the normal path already resumed in `stopCapture`.
      resumeHotkeyBindings().catch(() => undefined);
    };
  }, [capturing]);

  const handleReset = () => {
    if (!settings || capturing || busy) return;
    setError(null);
    setBusy(true);
    resetHotkeyBinding(TRANSCRIBE_BINDING_ID)
      .then((res) => {
        if (!res.success || !res.binding) {
          setError(res.error ?? "Failed to reset shortcut");
          return;
        }
        const updated: HotkeySettings = {
          ...settings,
          binding: res.binding.current_binding,
        };
        return updateHotkeySettings(updated).then((saveRes) => {
          if (!saveRes.success) {
            setError(saveRes.message);
            return;
          }
          setSettings(updated);
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
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
          {capturing ? "Press keys… (Esc to cancel)" : (settings.binding ?? "Not configured")}
        </span>
      </div>
      <div className="settings-row">
        {capturing ? (
          <button type="button" onClick={stopCapture} disabled={busy}>
            Cancel
          </button>
        ) : (
          <button type="button" onClick={startCapture} disabled={busy}>
            Change shortcut…
          </button>
        )}
        <button type="button" onClick={handleReset} disabled={capturing || busy}>
          Reset to default
        </button>
      </div>
    </div>
  );
}
