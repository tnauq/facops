// What the pass 2 HUD strip shows (pass 2 spec 7.3). Pure. Same shape as pass 1's hudModel,
// so the same drawing code paints it: the load in MW against online capacity, and a note with
// "Hall 3 of 8" and how far the next hall's construction has got.

import { buildProgress, buildingOn, burnRate, formatClock, incomeRate, load, redSecondsLeft, stabilityOn } from '../core/index2.js';

const shortArea = (a) => (a[0] === 'h' ? `H${a.slice(1)}` : `P${a.slice(1)}`);

/**
 * The CEO's line in a few words (M17 showed it in the HUD note; since M18 the banner says it): while warning
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

const dollars = (n) => `$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

/**
 * Building mode (pass 4 spec 2.5, 3.3): the cash, what it is doing a second (income minus burn), and
 * the red countdown. { cash: "$1,240", rate: "+$85/s", falling, red: "0:12" or null }.
 */
export function moneyModel(state) {
  // Nothing burns while the tutorial's lessons run (pass 4 M27), so the rate shows income only.
  const net = incomeRate(state) - (state.scripted ? 0 : burnRate(state));
  const left = redSecondsLeft(state);
  return {
    cash: `${state.cash < 0 ? '−' : ''}${dollars(state.cash)}`,
    rate: `${net >= 0 ? '+' : '−'}${dollars(net)}/s`,
    falling: net < 0,
    red: left === null ? null : formatClock(Math.ceil(left)),
  };
}

/** { clock, load, band, meter, note, noteShort } and, in building mode, money (moneyModel). */
export function hudModel2(state, { auto = false } = {}) {
  const l = load(state);
  if (buildingOn(state)) {
    const halls = `${state.halls} hall${state.halls === 1 ? '' : 's'} online`;
    const extra = auto ? ' · Auto' : '';
    return {
      clock: formatClock(state.t),
      load: `${Math.round(l.deliveredMw)} / ${Math.round(l.capacityMw)} MW`,
      band: l.band,
      meter: stabilityOn(state) ? Math.max(0, Math.min(100, state.meter)) : null,
      money: moneyModel(state),
      note: halls + extra,
      noteShort: `${state.halls}/8 halls${extra}`,
    };
  }
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
    note: parts.join(' · '),
    // A shorter wording for narrow screens, where the note must fit before the HUD buttons.
    noteShort: [`H${state.halls}/${state.config.maxHalls}`, ...(state.halls < state.config.maxHalls ? [`next ${Math.floor(buildProgress(state) * 100)}%`] : []), ...parts.slice(2)].join(' · '),
  };
}
