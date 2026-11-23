// Endurance on the screen (pass 9 spec 5, M56). Pure: the HUD's note and the start and level-up lines.
// (The run-over card's Endurance line is in src/ui/results.js.)

import { heat } from '../core/index2.js';

const times = (h) => `${h.toFixed(2).replace(/0$/, '')}×`;

/** The HUD note's lead in endurance: { long: "Endurance · level 3 · 1.21×", short: "L3 · 1.21×" }, else null. */
export function enduranceNote(state) {
  const e = state.endurance;
  if (!e || state.over) return null;
  const h = times(heat(state));
  return { long: `Endurance · level ${e.level} · ${h}`, short: `L${e.level} · ${h}` };
}

export const ENDURANCE_START = 'Endurance. Every minute is a new level: more alarms, closer CEO visits, and compute pays more. How long can you last?';

/** The callout as a level comes: "Level 4: alarms 1.33× as often, compute pays 1.33×." */
export const levelLine = (level, h) => `Level ${level}: alarms ${times(h)} as often, compute pays ${times(h)}.`;
