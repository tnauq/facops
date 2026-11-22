// The CEO's promises (pass 8 spec 6.1, M49). The CEO offers; the player chooses. Up to three offers
// wait, up to two promises are held. Part is paid on acceptance (the advance), the rest on delivery;
// a promise missed or cancelled hands its advance back, with no further fine (owner, 15 Nov).
//
// Called from step() in game2.js. Offers are drawn with their own seeded generator, so promises never
// change the alarms a run would otherwise have.

import { createRng } from './rng.js';
import { chillersNeeded, creditsRate, darkHalves, emit, onlineRows, pumpNeeds, rowUp, runningChillers } from './game2.js';
import { buildingOn } from './sites.js';

const TRADES = ['electrical', 'mechanical', 'ce', 'network'];
const GROWTH = ['lightsOn', 'hallTwo', 'moreMw', 'surge']; // surge: pass 8 M50
const PROTECTION = ['belt', 'spare', 'oneOfEach', 'quietFloor'];

/** Are promises in play? Building mode, switched on. */
export const promisesOn = (state) => buildingOn(state) && Boolean(state.config.building.promises && state.config.building.promises.enabled);

const cfgOf = (state) => state.config.building.promises;
const income = (state) => state.config.building.income;

function bState(state) {
  if (!state.promises) {
    state.promises = { offers: [], held: [], nextId: 1, nextOfferAt: null, growthNext: true, kept: 0, missed: 0, cancelled: 0, rngState: null };
  }
  return state.promises;
}

function rng(state) {
  const p = bState(state);
  const r = createRng(0);
  r.setState(p.rngState ?? ((state.seed * 2654435761 + 17) >>> 0));
  return { next: () => { const v = r.next(); p.rngState = r.getState(); return v; } };
}

// ---------------------------------------------------------------- what each promise asks for

const HALL1_ROWS = ['t', 'b'].flatMap((half) => [0, 1, 2].map((i) => `row-1-${half}-${i}`));
const hasBelt = (state) => [1, 2, 3, 4, 5, 6, 7, 8].some((h) => ['t', 'b'].every((half) => state.equip[`msb-${h}-${half}-B`].built) && state.equip[`cdu-${h}-t`].built && state.equip[`cdu-${h}-b`].built);
function hasSpare(state) {
  const n = pumpNeeds(state);
  return runningChillers(state) > chillersNeeded(state) && n.glycol.running > Math.max(n.glycol.neededForCdus, n.glycol.neededForChillers) && n.water.running > n.water.needed;
}
const hasAllTrades = (state) => TRADES.every((t) => state.techs.some((x) => x.trade === t));

/** Is promise `p` delivered now? (quietFloor is delivered by holding still: see step.) */
export function delivered(state, p) {
  switch (p.key) {
    case 'lightsOn': return HALL1_ROWS.every((id) => rowUp(state, id));
    case 'hallTwo': return state.halls >= 2;
    case 'moreMw': return onlineRows(state).length >= p.target;
    case 'belt': return hasBelt(state);
    case 'spare': return hasSpare(state);
    case 'oneOfEach': return hasAllTrades(state);
    case 'quietFloor': return state.t - p.quietSince >= cfgOf(state).quietFor - 1e-9;
    default: return false;
  }
}

// ---------------------------------------------------------------- surges (pass 8 spec 6.5, M50)

/** Are surges in play? */
export const surgesOn = (state) => promisesOn(state) && Boolean(state.config.building.surges && state.config.building.surges.enabled);

/** Is a surge running now? */
export const surging = (state) => Boolean(state.surge && state.t < state.surge.until - 1e-9);

/** The income multiplier now: `incomeFactor` during a surge, else 1. */
export const surgeIncome = (state) => (surging(state) ? state.config.building.surges.incomeFactor : 1);

/** The director's gap multiplier now: `gapFactor` during a surge, else 1. */
export const surgeGaps = (state) => (surging(state) ? state.config.building.surges.gapFactor : 1);

function surgeOffer(state) {
  if (!surgesOn(state) || surging(state) || state.halls < state.config.building.surges.fromHalls) return null;
  return { key: 'surge', window: state.config.building.surges.length, advance: 0, payment: 0 };
}

// Build an offer of this kind, or null if it is already true (an offer is never already true).
function makeOffer(state, key) {
  if (key === 'surge') return surgeOffer(state);
  const c = cfgOf(state).table[key];
  if (!c) return null;
  const base = { key, window: c.window, advance: c.advance, payment: c.payment };
  if (key === 'moreMw') {
    const now = onlineRows(state).length;
    const target = Math.max(now + 1, Math.ceil(now * 1.25));
    if (target > 48) return null;
    const money = Math.round(target * income(state) * c.seconds);
    return { ...base, target, advance: money, payment: money };
  }
  const probe = { ...base, quietSince: state.t };
  if (key !== 'quietFloor' && delivered(state, probe)) return null;
  return base;
}

const keysInUse = (p) => new Set([...p.offers, ...p.held].map((x) => x.key));

// The next offer: the build order first (Lights on, then Hall two), then any; from the third hall
// growth and protection alternate.
function nextOffer(state) {
  const p = bState(state);
  const used = keysInUse(p);
  const ok = (key) => !used.has(key) && makeOffer(state, key);
  for (const key of ['lightsOn', 'hallTwo']) {
    if (p.firstDone?.[key]) continue;
    (p.firstDone ??= {})[key] = true; // offered now, or already true: the order moves on
    const o = ok(key);
    if (o) return o;
  }
  let pool;
  if (state.halls >= 3) {
    pool = p.growthNext ? GROWTH : PROTECTION;
    p.growthNext = !p.growthNext;
  } else pool = [...GROWTH, ...PROTECTION];
  const options = pool.map(ok).filter(Boolean);
  if (options.length === 0) return null;
  const r = rng(state);
  return options[Math.floor(r.next() * options.length)];
}

// ---------------------------------------------------------------- commands

function pay(state, dollars) {
  state.cash += dollars;
  state.stats.earned += dollars;
  state.stats.promises = (state.stats.promises ?? 0) + dollars;
}

/** Accept an offer. Returns { ok } or { ok: false, reason }. */
export function takePromise(state, id) {
  if (!promisesOn(state) || state.over) return { ok: false, reason: 'off' };
  const p = bState(state);
  const o = p.offers.find((x) => x.id === id);
  if (!o) return { ok: false, reason: 'no such offer' };
  // A surge (M50) is not a promise: it starts at once, holds no place, and pays nothing up front.
  if (o.key === 'surge') {
    if (state.ceo || surging(state)) return { ok: false, reason: state.ceo ? 'ceo' : 'surging' };
    p.offers = p.offers.filter((x) => x !== o);
    state.surge = { until: state.t + state.config.building.surges.length, startedAt: state.t };
    p.surges = (p.surges ?? 0) + 1;
    emit(state, 'surgeStart', { id, until: state.surge.until });
    return { ok: true };
  }
  if (p.held.length >= cfgOf(state).held) return { ok: false, reason: 'full' };
  p.offers = p.offers.filter((x) => x !== o);
  const held = { ...o, takenAt: state.t, deadline: state.t + o.window, quietSince: state.t };
  p.held.push(held);
  if (held.advance > 0) pay(state, held.advance);
  emit(state, 'promiseTaken', { id, key: o.key, advance: held.advance });
  return { ok: true };
}

// Hand back the advance (a miss or a cancel). It can put the cash in the red: the countdown decides.
function handBack(state, held, kind) {
  const p = bState(state);
  p.held = p.held.filter((x) => x !== held);
  if (held.advance > 0) pay(state, -held.advance);
  p[kind] += 1;
  emit(state, kind === 'missed' ? 'promiseMissed' : 'promiseCancelled', { id: held.id, key: held.key, advance: held.advance });
}

/** Cancel a held promise: its advance goes back. */
export function cancelPromise(state, id) {
  if (!promisesOn(state) || state.over) return { ok: false, reason: 'off' };
  const held = bState(state).held.find((x) => x.id === id);
  if (!held) return { ok: false, reason: 'no such promise' };
  handBack(state, held, 'cancelled');
  return { ok: true };
}

// ---------------------------------------------------------------- the step

/** Offers and held promises, each step. */
export function promisesStep(state) {
  if (!promisesOn(state) || state.scripted || state.over) return;
  const c = cfgOf(state);
  const p = bState(state);
  // Held promises: delivered, or missed at the deadline.
  for (const h of [...p.held]) {
    if (h.key === 'quietFloor' && (darkHalves(state) > 0 || creditsRate(state) > 0)) h.quietSince = state.t;
    if (delivered(state, h)) {
      p.held = p.held.filter((x) => x !== h);
      pay(state, h.payment);
      p.kept += 1;
      emit(state, 'promiseKept', { id: h.id, key: h.key, payment: h.payment });
    } else if (state.t >= h.deadline - 1e-9) handBack(state, h, 'missed');
  }
  if (state.surge && !surging(state)) {
    emit(state, 'surgeEnd', {});
    state.surge = null;
  }
  // Offers: replaced after `offerLife` (at once); dropped if they came true meanwhile.
  const before = p.offers.length;
  p.offers = p.offers.filter((o) => {
    if (state.t - o.offeredAt >= c.offerLife - 1e-9) return false;
    if (o.key === 'surge') return true;
    return o.key === 'quietFloor' || !delivered(state, { ...o, quietSince: state.t });
  });
  const replace = before - p.offers.length; // each expired or fulfilled offer is replaced at once
  // New offers: none during a CEO visit; one every `offerGap` seconds, up to `offers` on the table.
  if (state.ceo) return;
  if (p.nextOfferAt === null) p.nextOfferAt = state.t;
  let n = replace;
  if (state.t >= p.nextOfferAt - 1e-9) {
    n += 1;
    p.nextOfferAt = state.t + c.offerGap;
  }
  for (let i = 0; i < n && p.offers.length < c.offers; i++) {
    const o = nextOffer(state);
    if (!o) break;
    const offer = { ...o, id: p.nextId++, offeredAt: state.t };
    p.offers.push(offer);
    emit(state, 'promiseOffered', { id: offer.id, key: offer.key });
  }
}

/** Seconds left on a held promise (for the screen). */
export const promiseLeft = (state, held) => Math.max(0, held.deadline - state.t);
