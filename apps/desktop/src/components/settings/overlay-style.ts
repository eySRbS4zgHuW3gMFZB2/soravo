import type { OverlayStyleSetting } from "../../ipc";

/**
 * R1 overlay-style selector - pure option metadata over the canonical
 * `AppSettings.overlay_style` contract (`OverlayStyle::{None,Minimal,Live}`,
 * lowercase serde wire values).
 *
 * The backend owns the effective value (fresh-install default, stored
 * preference, invalid-input fallback); this module never invents a default.
 * Labels/descriptions use the existing product vocabulary (`settings.rs`:
 * Minimal/Live share one pill base, Live grows into the panel that shows
 * live transcription text; None hides the overlay entirely).
 */

export type OverlayStyleOption = {
  value: OverlayStyleSetting;
  label: string;
  description: string;
};

export const OVERLAY_STYLE_OPTIONS: OverlayStyleOption[] = [
  {
    value: "none",
    label: "Hidden",
    description:
      "No floating pill appears during dictation. Recording, transcription, and text insertion keep working.",
  },
  {
    value: "minimal",
    label: "Compact pill",
    description:
      "A small floating pill shows the dictation status and the transcript preview while you dictate into other applications.",
  },
  {
    value: "live",
    label: "Live panel",
    description:
      "A larger floating panel shows the live transcription text as you speak, then the final text.",
  },
];

export function isOverlayStyleSetting(value: unknown): value is OverlayStyleSetting {
  return value === "none" || value === "minimal" || value === "live";
}

/**
 * Validate a wire value read from the backend. Valid values pass through
 * verbatim (including a deliberately stored `"none"` - an explicit user
 * preference is never rewritten). Anything else falls back to `"minimal"`,
 * mirroring the backend `parse_overlay_style` contract, so the selector
 * always renders a determinate state.
 */
export function parseOverlayStyleSetting(value: unknown): OverlayStyleSetting {
  return isOverlayStyleSetting(value) ? value : "minimal";
}

export function describeOverlayStyleSetting(value: OverlayStyleSetting): string {
  const found = OVERLAY_STYLE_OPTIONS.find((option) => option.value === value);
  return found ? found.description : "";
}
