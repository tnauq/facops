// Screen regions (spec section 6.1) and the layout of the HUD strip (6.3). Pure: give it the
// canvas size in CSS pixels, get rectangles back.

export const HUD_HEIGHT = 34;
const CREW_WIDTH = 76;
const RAIL_WIDTH = 104;

/** { hud, crew, rail, map } as rectangles { x, y, w, h }, for a canvas W x H. */
export function regions(W, H) {
  return {
    hud: { x: 0, y: 0, w: W, h: HUD_HEIGHT },
    crew: { x: 0, y: HUD_HEIGHT, w: CREW_WIDTH, h: H - HUD_HEIGHT },
    rail: { x: W - RAIL_WIDTH, y: HUD_HEIGHT, w: RAIL_WIDTH, h: H - HUD_HEIGHT },
    map: { x: 80, y: 36, w: W - 188, h: H - 40 },
  };
}

// The crew bar and the alarm rail arrive in milestone 4. Until then the map uses the full width
// below the HUD, so the sides of the phone are not left empty.
export function mapRectBeforeRails(W, H) {
  return { x: 8, y: HUD_HEIGHT + 2, w: W - 16, h: H - HUD_HEIGHT - 6 };
}

export const BUTTON_WIDTH = 44;
// Buttons are drawn 44 x 34 to fit the strip, but their tap area reaches 10 px below it so it is
// the full 44 x 44 the touch rule asks for. Buttons are hit-tested before anything else.
export const BUTTON_TAP_HEIGHT = 44;
export const METER_WIDTH = 200;
export const METER_HEIGHT = 12;

/**
 * Where each HUD item sits, left to right: clock, band mark and load, "Stability" and its bar,
 * then the settings and pause buttons at the right end. x values are left edges; cy is the
 * strip's vertical middle.
 */
export function hudLayout(W) {
  const cy = HUD_HEIGHT / 2;
  return {
    cy,
    clock: { x: 10 },
    bandMark: { cx: 66, size: 12 },
    load: { x: 78 },
    meterLabel: { x: 200 },
    meter: { x: 254, y: cy - METER_HEIGHT / 2, w: METER_WIDTH, h: METER_HEIGHT },
    note: { x: 254 + METER_WIDTH + 12 }, // free space, used for "Auto" while the scripted player plays
    buttons: [
      { id: 'settings', x: W - 2 * BUTTON_WIDTH, y: 0, w: BUTTON_WIDTH, h: HUD_HEIGHT },
      { id: 'pause', x: W - BUTTON_WIDTH, y: 0, w: BUTTON_WIDTH, h: HUD_HEIGHT },
    ],
  };
}

/** The HUD buttons as tap targets for hitTest: as drawn, but 44 px tall. */
export function hudButtonTargets(W) {
  return hudLayout(W).buttons.map((b) => ({ ...b, h: BUTTON_TAP_HEIGHT }));
}
