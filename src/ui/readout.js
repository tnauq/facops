// The temporary text readout for milestone 1. The real HUD replaces it in milestone 3.

import { formatClock, gw, results } from '../core/index.js';

// MW to GW at two decimals. Rounds in whole MW tens first, so 475 MW reads 0.48, not 0.47.
export const gwText = (mw) => (Math.round(mw / 10) / 100).toFixed(2);

const BAND_WORD = { green: 'Green', yellow: 'Yellow', red: 'Red' };

/** One line of plain text: time, load, band and the Stability meter, or the result once the round is over. */
export function readoutText(state, { auto = false } = {}) {
  if (state.over) {
    const r = results(state);
    return `Round over at ${formatClock(r.seconds)}. Delivered ${r.energyGwh.toFixed(2)} GWh. Reload to play again.`;
  }
  const load = gw(state);
  const parts = [
    formatClock(state.t),
    `Load ${gwText(load.deliveredMw)} / ${gwText(load.capacityMw)} GW`,
    BAND_WORD[load.band],
    `Stability ${Math.ceil(state.meter)}`,
    `Alarms ${state.alarms.length}`,
  ];
  if (auto) parts.push('Auto');
  return parts.join('   ·   ');
}
