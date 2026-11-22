// The pick of two and the rescue call (pass 8 spec 7, M51).
//
// The pick of two: when a CEO visit ends with no sightings, the CEO offers two perks, drawn with their
// own seeded generator, and the player takes one. Each perk loosens a limit for a while; none adds a
// mechanic. The offer waits until it is taken (the screen holds the game while its card is open).
//
// The rescue call: the first time the cash goes below $0 in a run, the CEO calls. The red countdown
// waits until the call is closed. One way out is a funding round, once per run: cash at once, and a
// second loan repaid at a fixed rate.

import { createRng } from './rng.js';
import { buildingOn } from './sites.js';
import { emit } from './game2.js';

export const PERKS = ['bulk', 'signing', 'fast', 'warranty', 'loyal', 'patient'];

const pcfg = (state) => state.config.building.perks;
const rcfg = (state) => state.config.building.rescue;

/** Is the pick of two in play? */
export const perksOn = (state) => buildingOn(state) && Boolean(pcfg(state) && pcfg(state).enabled);
/** Is the rescue call in play? */
export const rescueOn = (state) => buildingOn(state) && Boolean(rcfg(state) && rcfg(state).enabled);

function perkState(state) {
  state.perks ??= { offer: null, bulkRows: 0, freeHire: false, fastUntil: 0, warranty: null, loyalUntil: 0, patientUntil: 0, taken: [], rngState: null };
  return state.perks;
}

// The two perks offered: distinct, seeded apart from the run's alarms.
function drawTwo(state) {
  const p = perkState(state);
  const r = createRng(0);
  r.setState(p.rngState ?? ((state.seed * 40503 + 101) >>> 0));
  const pool = [...PERKS];
  const out = [];
  for (let i = 0; i < 2; i++) out.push(pool.splice(Math.floor(r.next() * pool.length), 1)[0]);
  p.rngState = r.getState();
  return out;
}

/** Called by the CEO when a visit ends: a clean one earns the pick of two. */
export function visitEnded(state, sightings) {
  if (!perksOn(state) || state.over || sightings > 0) return;
  const p = perkState(state);
  if (p.offer) return; // one pick at a time
  p.offer = drawTwo(state);
  emit(state, 'perkOffered', { perks: [...p.offer] });
}

/** Take one of the two perks offered. Warranty needs a hall. Returns { ok } or { ok: false, reason }. */
export function choosePerk(state, perk, hall = null) {
  const p = perkState(state);
  if (!p.offer || !p.offer.includes(perk)) return { ok: false, reason: 'not offered' };
  if (perk === 'warranty' && !(hall >= 1 && hall <= 8)) return { ok: false, reason: 'hall' };
  const c = pcfg(state);
  if (perk === 'bulk') p.bulkRows += c.bulkRows;
  if (perk === 'signing') p.freeHire = true;
  if (perk === 'fast') p.fastUntil = state.t + c.fastSeconds;
  if (perk === 'warranty') p.warranty = { hall, until: state.t + c.warrantySeconds };
  if (perk === 'loyal') p.loyalUntil = state.t + c.loyalSeconds;
  if (perk === 'patient') p.patientUntil = state.t + c.patientSeconds;
  p.offer = null;
  p.taken.push(perk);
  emit(state, 'perkTaken', { perk, hall });
  return { ok: true };
}

// ---------------------------------------------------------------- what the perks change

/** What building this costs now: a rack row is half price while Bulk order lasts. */
export function bulkFactor(state, type) {
  const p = state.perks;
  return type === 'row' && p && p.bulkRows > 0 ? pcfg(state).bulkFactor : 1;
}
/** A row bought: one fewer at the bulk price. */
export function usedBulk(state, type) {
  if (type === 'row' && state.perks && state.perks.bulkRows > 0) state.perks.bulkRows -= 1;
}
/** The next hire is free (wages still apply). */
export const freeHire = (state) => Boolean(state.perks && state.perks.freeHire);
export const usedFreeHire = (state) => { if (state.perks) state.perks.freeHire = false; };
/** Build time now: Fast contractor's while it lasts. */
export const buildTimeNow = (state) => (state.perks && state.t < state.perks.fastUntil - 1e-9 ? pcfg(state).fastBuild : state.config.building.buildTime);
/** Can nothing in this hall fail now (Warranty)? */
export const underWarranty = (state, hall) => Boolean(state.perks && state.perks.warranty && state.perks.warranty.hall === hall && state.t < state.perks.warranty.until - 1e-9);
/** The uptime bonus multiplier now (Loyal customers). */
export const loyalFactor = (state) => (state.perks && state.t < state.perks.loyalUntil - 1e-9 ? pcfg(state).loyalFactor : 1);
/** Are service credits waived now (Patient customers)? */
export const patient = (state) => Boolean(state.perks && state.t < state.perks.patientUntil - 1e-9);

/** Perks running now, for the HUD: [{ perk, left }] (seconds), plus Bulk order's rows and a free hire. */
export function perksRunning(state) {
  const p = state.perks;
  if (!p) return [];
  const out = [];
  const timed = [['fast', p.fastUntil], ['loyal', p.loyalUntil], ['patient', p.patientUntil], ['warranty', p.warranty ? p.warranty.until : 0]];
  for (const [perk, until] of timed) if (state.t < until - 1e-9) out.push({ perk, left: until - state.t });
  if (p.bulkRows > 0) out.push({ perk: 'bulk', rows: p.bulkRows });
  if (p.freeHire) out.push({ perk: 'signing' });
  return out;
}

// ---------------------------------------------------------------- the rescue call

/** Called when the cash first goes below $0: the CEO calls, once per run. */
export function maybeCall(state) {
  if (!rescueOn(state) || state.over) return false;
  state.rescue ??= { called: false, open: false, funded: false, loanLeft: 0 };
  if (state.rescue.called) return false;
  state.rescue.called = true;
  state.rescue.open = true;
  emit(state, 'rescueCall', {});
  return true;
}

/** Is the call open now? The red countdown waits while it is. */
export const callOpen = (state) => Boolean(state.rescue && state.rescue.open);

/** Hang up: the countdown starts (if still in the red). */
export function closeCall(state) {
  if (!callOpen(state)) return { ok: false };
  state.rescue.open = false;
  emit(state, 'rescueClosed', {});
  return { ok: true };
}

/** The funding round: once per run, cash now and a second loan. */
export function takeFunding(state) {
  if (!rescueOn(state) || state.over) return { ok: false, reason: 'off' };
  state.rescue ??= { called: false, open: false, funded: false, loanLeft: 0 };
  if (state.rescue.funded) return { ok: false, reason: 'used' };
  const c = rcfg(state);
  state.rescue.funded = true;
  state.rescue.loanLeft = c.funding;
  state.cash += c.funding;
  state.stats.funding = (state.stats.funding ?? 0) + c.funding;
  emit(state, 'funding', { amount: c.funding });
  return { ok: true };
}

/** The second loan's repayment now, in dollars a second. */
export const secondLoanRate = (state) => (state.rescue && state.rescue.loanLeft > 0 ? rcfg(state).rate : 0);

/** Repay the second loan for dt seconds (called from the burn). */
export function repaySecondLoan(state, dt) {
  if (!state.rescue || !(state.rescue.loanLeft > 0)) return;
  state.rescue.loanLeft = Math.max(0, state.rescue.loanLeft - rcfg(state).rate * dt);
}
