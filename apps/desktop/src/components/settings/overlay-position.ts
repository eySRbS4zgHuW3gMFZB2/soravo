import type { OverlayPositionSetting } from "../../ipc";

/**
 * R1 overlay-position selector - pure option metadata over the canonical
 * `AppSettings.overlay_position` contract (`OverlayPosition::{Top,Bottom}`,
 * lowercase serde wire values).
 *
 * The backend owns the effective value (stored preference, legacy alias,
 * invalid-input fallback); this module never invents a default. The retired
 * `"none"` position is a visibility concern owned by `overlay_style`, so it
 * is not offered here: a legacy stored `"none"` deserializes to `"bottom"`
 * at load (`settings.rs` serde alias) and the getter only ever returns
 * `"top"` or `"bottom"`.
 */

export type OverlayPositionOption = {
  value: OverlayPositionSetting;
  label: string;
  description: string;
};

export const OVERLAY_POSITION_OPTIONS: OverlayPositionOption[] = [
  {
    value: "top",
    label: "Top",
    description:
      "The floating pill appears near the top edge of the screen with the active display.",
  },
  {
    value: "bottom",
    label: "Bottom",
    description:
      "The floating pill appears near the bottom edge of the screen with the active display.",
  },
];

export function isOverlayPositionSetting(value: unknown): value is OverlayPositionSetting {
  return value === "top" || value === "bottom";
}

/**
 * Validate a wire value read from the backend. Valid values pass through
 * verbatim. Anything else (including the retired `"none"`) falls back to
 * `"bottom"`, mirroring the backend `change_overlay_position_setting`
 * contract, so the selector always renders a determinate state.
 */
export function parseOverlayPositionSetting(value: unknown): OverlayPositionSetting {
  return isOverlayPositionSetting(value) ? value : "bottom";
}

export function describeOverlayPositionSetting(value: OverlayPositionSetting): string {
  const found = OVERLAY_POSITION_OPTIONS.find((option) => option.value === value);
  return found ? found.description : "";
}
