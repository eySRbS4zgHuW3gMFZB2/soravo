import { useEffect, useState } from "react";
import {
  changeOverlayStyle,
  getOverlayStyle,
  type OverlayStyleSetting,
} from "../../ipc";
import {
  describeOverlayStyleSetting,
  OVERLAY_STYLE_OPTIONS,
  parseOverlayStyleSetting,
} from "./overlay-style";

// R1 overlay-style selector: the Settings UI for the canonical
// `AppSettings.overlay_style`. Reads the effective stored value (never the
// fresh-install default) and writes through the existing Handy-derived
// `change_overlay_style_setting` backend, which persists the canonical store,
// refreshes the overlay-enabled cache, and repositions a live overlay - so
// the change applies immediately with no restart and no config-file edit.
export function OverlayStyleSetting() {
  const [style, setStyle] = useState<OverlayStyleSetting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getOverlayStyle()
      .then((value) => {
        setStyle(parseOverlayStyleSetting(value));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const handleChange = (value: string) => {
    if (busy) return;
    const next = parseOverlayStyleSetting(value);
    const previous = style;
    setError(null);
    setBusy(true);
    // Optimistic display; reverted below if the backend write fails, so the
    // selector never claims a preference that is not stored.
    setStyle(next);
    changeOverlayStyle(next)
      .then(() => undefined)
      .catch((e) => {
        setStyle(previous);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  if (error && style === null) {
    return <div className="settings-error">Error: {error}</div>;
  }

  if (style === null) {
    return <div className="settings-loading">Loading overlay settings...</div>;
  }

  return (
    <OverlayStyleSelect
      value={style}
      disabled={busy}
      error={error}
      onChange={handleChange}
    />
  );
}

export function OverlayStyleSelect({
  value,
  disabled,
  error,
  onChange,
}: {
  value: OverlayStyleSetting;
  disabled: boolean;
  error: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="settings-group">
      <legend>Recording overlay</legend>
      <div className="settings-row">
        <label htmlFor="overlay-style">Floating pill</label>
        <select
          id="overlay-style"
          value={value}
          disabled={disabled}
          aria-describedby="overlay-style-description"
          onChange={(e) => onChange(e.target.value)}
        >
          {OVERLAY_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <p id="overlay-style-description" className="settings-hint">
        {describeOverlayStyleSetting(value)}
      </p>
      <p className="settings-hint">Applies immediately - no restart needed.</p>
      {error && <div className="settings-error">Error: {error}</div>}
    </fieldset>
  );
}
