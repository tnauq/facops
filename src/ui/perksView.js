// The pick of two and the rescue call on the screen (pass 8 spec 7.3, M51). Pure.

import { callOpen, cannotSell, formatClock, onlineHallIds, perksRunning, promisesOn, rescueOn } from '../core/index2.js';

const money = (n) => `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

export const PERK_TITLE = {
  bulk: 'Bulk order', signing: 'Signing bonus', fast: 'Fast contractor', warranty: 'Warranty', loyal: 'Loyal customers', patient: 'Patient customers',
};

/** One line on what a perk does, from the config. */
export function perkLine(state, perk) {
  const c = state.config.building.perks;
  switch (perk) {
    case 'bulk': return `The next ${c.bulkRows} rack rows are half price`;
    case 'signing': return 'The next hire is free; wages still apply';
    case 'fast': return `Builds take ${c.fastBuild} s for ${formatClock(c.fastSeconds)}`;
    case 'warranty': return `Nothing in one hall you choose can fail for ${formatClock(c.warrantySeconds)}`;
    case 'loyal': return `The uptime bonus is doubled for ${formatClock(c.loyalSeconds)}`;
    case 'patient': return `No service credits for ${formatClock(c.patientSeconds)}`;
    default: return '';
  }
}

export const PERK_QUOTE = '“Fine. Have a treat.”';

/** The pick of two: { quote, perks: [{ perk, title, line }] }, or null with no offer. */
export function perkCard(state) {
  const offer = state.perks && state.perks.offer;
  if (!offer) return null;
  return { quote: PERK_QUOTE, perks: offer.map((perk) => ({ perk, title: PERK_TITLE[perk], line: perkLine(state, perk) })) };
}

/** Halls the Warranty can cover: the online ones (all eight if none yet). */
export const warrantyHalls = (state) => {
  const halls = onlineHallIds(state);
  return halls.length ? halls : [1, 2, 3, 4, 5, 6, 7, 8];
};

/** The HUD note's perk part: the perk running with the least time left, "Fast contractor · 1:20", or null. */
export function perkNote(state) {
  const timed = perksRunning(state).filter((p) => p.left !== undefined).sort((a, b) => a.left - b.left);
  if (timed.length === 0) return null;
  const left = formatClock(Math.ceil(timed[0].left));
  return { long: `${PERK_TITLE[timed[0].perk]} · ${left}`, short: left };
}

/** The rescue call: { title, cash, countdown, ways: [{ action, label, line }] } while the call is open, else null. */
export function rescueCard(state) {
  if (!rescueOn(state) || !callOpen(state)) return null;
  const r = state.config.building.rescue;
  const ways = [];
  if (!state.rescue.funded) ways.push({ action: 'rescue-fund', label: 'Funding round', line: `${money(r.funding)} now, repaid at ${money(r.rate)} a second. Once a run.` });
  if (promisesOn(state) && (state.promises?.offers ?? []).some((o) => o.advance > 0)) ways.push({ action: 'rescue-offers', label: 'Take one of my offers', line: 'A promise with an advance pays cash now' });
  if (cannotSell(state) === null) ways.push({ action: 'rescue-sell', label: 'Sell the campus', line: 'Hand over the keys; the run ends' });
  return {
    title: 'The CEO is on the phone',
    cash: `Cash ${money(state.cash)}`,
    countdown: `When you hang up, you have ${formatClock(state.config.building.debtGrace)} to get back above $0.`,
    ways,
  };
}
