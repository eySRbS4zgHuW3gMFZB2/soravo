import { useEffect, useState } from "react";
import {
  changeOverlayPosition,
  getOverlayPosition,
  type OverlayPositionSetting,
} from "../../ipc";
import {
  describeOverlayPositionSetting,
  OVERLAY_POSITION_OPTIONS,
  parseOverlayPositionSetting,
} from "./overlay-position";

// R1 overlay-position selector: the Settings UI for the canonical
// `AppSettings.overlay_position`. Reads the effective stored value and
// writes through the existing Handy-derived
// `change_overlay_position_setting` backend, which persists the canonical
// store and repositions the native overlay in place - so the change applies
// immediately with no restart and no config-file edit.
export function OverlayPositionSetting() {
  const [position, setPosition] = useState<OverlayPositionSetting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getOverlayPosition()
      .then((value) => {
        setPosition(parseOverlayPositionSetting(value));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const handleChange = (value: string) => {
    if (busy) return;
    const next = parseOverlayPositionSetting(value);
    const previous = position;
    setError(null);
    setBusy(true);
    // Optimistic display; reverted below if the backend write fails, so the
    // selector never claims a preference that is not stored.
    setPosition(next);
    changeOverlayPosition(next)
      .then(() => undefined)
      .catch((e) => {
        setPosition(previous);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  if (error && position === null) {
    return <div className="settings-error">Error: {error}</div>;
  }

  if (position === null) {
    return <div className="settings-loading">Loading overlay settings...</div>;
  }

  return (
    <OverlayPositionSelect
      value={position}
      disabled={busy}
      error={error}
      onChange={handleChange}
    />
  );
}

export function OverlayPositionSelect({
  value,
  disabled,
  error,
  onChange,
}: {
  value: OverlayPositionSetting;
  disabled: boolean;
  error: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="settings-group">
      <legend>Overlay position</legend>
      <div className="settings-row">
        <label htmlFor="overlay-position">Screen edge</label>
        <select
          id="overlay-position"
          value={value}
          disabled={disabled}
          aria-describedby="overlay-position-description"
          onChange={(e) => onChange(e.target.value)}
        >
          {OVERLAY_POSITION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <p id="overlay-position-description" className="settings-hint">
        {describeOverlayPositionSetting(value)}
      </p>
      <p className="settings-hint">Applies immediately - no restart needed.</p>
      {error && <div className="settings-error">Error: {error}</div>}
    </fieldset>
  );
}
