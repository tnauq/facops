// What the HUD strip shows (spec section 6.3), worked out from the game state. Pure.

import { formatClock, gw } from '../core/index.js';
import { gwText } from './readout.js';

export const BAND_COLOR = { green: '#2E9E6B', yellow: '#D99A1C', red: '#D9483B' };
// A shape as well as a color, so the band never depends on color vision.
export const BAND_SHAPE = { green: 'circle', yellow: 'triangle', red: 'square' };

/** { clock, load, band, meter } where meter is the Stability meter from 0 to 100. */
export function hudModel(state) {
  const load = gw(state);
  return {
    clock: formatClock(state.t),
    load: `${gwText(load.deliveredMw)} / ${gwText(load.capacityMw)} GW`,
    band: load.band,
    meter: Math.max(0, Math.min(100, state.meter)),
  };
}
