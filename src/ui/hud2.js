// What the pass 2 HUD strip shows (pass 2 spec 7.3). Pure. Same shape as pass 1's hudModel,
// so the same drawing code paints it: the load in MW against online capacity, and a note with
// "Hall 3 of 8".

import { formatClock, load } from '../core/index2.js';

/** { clock, load, band, meter, note }. */
export function hudModel2(state, { auto = false } = {}) {
  const l = load(state);
  const parts = [`Hall ${state.halls} of ${state.config.maxHalls}`];
  if (auto) parts.push('Auto');
  else if (state.config.oneTap) parts.push('One-tap');
  return {
    clock: formatClock(state.t),
    load: `${Math.round(l.deliveredMw)} / ${Math.round(l.capacityMw)} MW`,
    band: l.band,
    meter: Math.max(0, Math.min(100, state.meter)),
    note: parts.join(' · '),
  };
}
