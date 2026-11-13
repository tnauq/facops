// What the pass 2 HUD strip shows (pass 2 spec 7.3). Pure. Same shape as pass 1's hudModel,
// so the same drawing code paints it: the load in MW against online capacity, and a note with
// "Hall 3 of 8" and how far the next hall's construction has got.

import { buildProgress, formatClock, load } from '../core/index2.js';

const shortArea = (a) => (a[0] === 'h' ? `H${a.slice(1)}` : `P${a.slice(1)}`);

/**
 * The CEO's line for the HUD note (pass 3 spec 4.7, as plain text until M18): while warning
 * "CEO 0:15 · H4, H5 · −50", while visiting "CEO in H4, H5 · −50"; "zero tolerance" in place of
 * the cost when one sighting ends the run. Returns { long, short } or null between visits.
 */
export function ceoNote(state) {
  const c = state.ceo;
  if (!c) return null;
  const areas = c.areas.length > 4 ? 'every hall' : c.areas.map(shortArea).join(', ');
  const stake = c.zeroTolerance ? 'zero tolerance' : `−${c.cost}`;
  const when = c.phase === 'warning' ? `CEO ${formatClock(Math.max(0, Math.ceil(c.warningEnd - state.t)))}` : 'CEO in';
  const next = c.nextIsZeroTolerance && c.phase === 'warning' ? ' · next: zero tolerance' : '';
  return {
    long: `${when} ${c.phase === 'warning' ? '· ' : ''}${areas} · ${stake}${next}`,
    short: `${when} ${c.zeroTolerance ? 'ZT' : stake}`,
  };
}

/** { clock, load, band, meter, note, noteShort }. */
export function hudModel2(state, { auto = false } = {}) {
  const l = load(state);
  const ceo = ceoNote(state);
  const parts = [`Hall ${state.halls} of ${state.config.maxHalls}`];
  // The next hall is built on a timer (spec 4.6); say how far along it is.
  if (state.halls < state.config.maxHalls) parts.push(`Hall ${state.halls + 1} ${Math.floor(buildProgress(state) * 100)}% built`);
  if (auto) parts.push('Auto');
  else if (state.config.oneTap) parts.push('One-tap');
  return {
    clock: formatClock(state.t),
    load: `${Math.round(l.deliveredMw)} / ${Math.round(l.capacityMw)} MW`,
    band: l.band,
    meter: Math.max(0, Math.min(100, state.meter)),
    // While the CEO is announced or visiting, that comes first (and alone on a narrow screen).
    note: ceo ? `${ceo.long} · ${parts[0]}` : parts.join(' · '),
    noteLong2: ceo ? ceo.long : null,
    // A shorter wording for narrow screens, where the note must fit before the HUD buttons.
    noteShort: ceo ? ceo.short : [`H${state.halls}/${state.config.maxHalls}`, ...(state.halls < state.config.maxHalls ? [`next ${Math.floor(buildProgress(state) * 100)}%`] : []), ...parts.slice(2)].join(' · '),
  };
}
