// Device introductions after the tutorial (pass 3 spec 4b.4). Pure.
// The map has no captions, so the first Network Failure and the first Pump Overpressure of a run
// that began with the tutorial each get a one-line callout naming the device, for a few seconds, and
// so do the yard's first transformer short, RMU fault and fan failure (M30).
// An introduction never covers a CEO warning: it waits until the warning is over.
// Pass 5 (spec 3.2): the same place says when the construction loan is paid off, in every building
// run, tutorial or not; `devices: false` gives a run without the tutorial only that line.
// Pass 5 (spec 4.3): the same place introduces the CEO's strikes once, in every run, as the last
// walkthrough before them leaves.
// Pass 6 spec 5 (M40): the pumps' two new states, a CDU without glycol and a hall without water, get
// a line once each, in every building run like the loan line: they are new rules, and a player who
// learned the game before them skips the tutorial.

import { cannotSell, creditsOn, creditsRate, incomeRate, strikesToFire } from '../core/index2.js';

export const INTRO_SECONDS = 6;
export const NOTICE_SECONDS = 4; // the loan line (pass 5 spec 3.2)

export const INTRO_TEXT = {
  network: 'A rack row lost its network. Racks are the computers: down racks deliver nothing.',
  pump: "A pump's pressure is climbing. Fix it before the pipe bursts and floods two halls' coolant units.",
  // The yard (M30).
  short: 'A transformer shorted. An electrician disconnects it at the RMU, then repairs it. Left alone, the RMU goes.',
  rmu: 'An RMU failed: both sides of that half are dark. Electricians only: this is the one to run for.',
  fan: "A dry cooler's fan stopped: with no spare, its plant's chillers stop too. Left alone, the next one goes.",
  // Not a device: the construction loan (pass 5 spec 3.2).
  loan: 'Loan paid off. The money is yours now.',
  // Pass 7 spec 3.5 (M41): customers go live as the loan is paid off, so with service credits on the
  // loan's notice says that instead (customersText below); and two lines of their own.
  sale: "You can sell the campus from the menu. Buyers pay for what it earns, so sell while it's running well.",
  creditsOver: 'Credits are outrunning your income. Fix outages, or sell while you can.',
  // Pass 5 spec 4.3: once, as the last walkthrough before the strikes leaves (strikesText below).
  strikes: '',
  // Pass 6 spec 5 (M40). The water line names the hall (waterText below).
  dryCdu: 'Not enough glycol pumps: the farthest coolant unit has gone dry. Build another.',
  noWater: '',
};

/** The loan's notice once customers are live (pass 7 spec 3.5). */
export const CUSTOMERS_TEXT = "Loan paid off. Customers are live: every rack that's down now costs service credits, and they get stricter.";

/** The first hall without water (pass 6 spec 5). */
export const waterText = (hall) => `Water pumps serve two halls each. Hall ${hall} has none: it runs at half.`;

const COUNT = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/** The one line that introduces the strikes (pass 5 spec 4.3), for the configured number. */
export function strikesText(of) {
  if (of <= 1) return 'From now on, any CEO visit that sees an outage ends the run.';
  return `From now on, every CEO visit that sees an outage is a strike. ${COUNT[of] ?? of} and you're out.`;
}

// The strikes are introduced once the last walkthrough before them is over: the next visit gives strikes.
function strikesNext(state) {
  const cfg = state.config.ceo;
  return Boolean(cfg && cfg.enabled) && state.ceoWalks >= cfg.walks.length && !state.ceo && !state.over;
}

/** A fresh set of introductions: none given yet. */
export function createIntros({ devices = true } = {}) {
  return { given: new Set(), queue: [], text: '', ids: [], until: 0, devices };
}

/**
 * Advance one frame. Returns the callout to show now ('' when none). `ids` on the intros object
 * holds the alarm the current callout is about, so the screen can keep the callout clear of it.
 */
export function updateIntros(intros, state) {
  if (state.loanPaidAt !== null && state.loanPaidAt !== undefined && !intros.given.has('loan')) {
    intros.given.add('loan');
    intros.queue.push({ type: 'loan', id: null });
  }
  // Pass 7 (M41): the sale, once the Handover has come; credits passing income, once.
  if (state.handoverQueued && !intros.given.has('sale') && cannotSell(state) !== 'off') {
    intros.given.add('sale');
    intros.queue.push({ type: 'sale', id: null });
  }
  if (!intros.given.has('creditsOver') && creditsRate(state) > incomeRate(state) && creditsRate(state) > 0) {
    intros.given.add('creditsOver');
    intros.queue.push({ type: 'creditsOver', id: null });
  }
  if (!intros.given.has('strikes') && strikesNext(state)) {
    intros.given.add('strikes');
    intros.queue.push({ type: 'strikes', id: null });
  }
  // Pass 6 (M40): the pumps' supply, worked out each step in building mode.
  const sup = state.supply;
  if (sup && sup.dryCdus.size > 0 && !intros.given.has('dryCdu')) {
    intros.given.add('dryCdu');
    intros.queue.push({ type: 'dryCdu', id: null });
  }
  if (sup && sup.dryHalls.size > 0 && !intros.given.has('noWater')) {
    intros.given.add('noWater');
    intros.queue.push({ type: 'noWater', id: null, hall: Math.min(...sup.dryHalls) });
  }
  for (const a of state.alarms) {
    if (intros.devices === false) break;
    if (INTRO_TEXT[a.type] && !intros.given.has(a.type)) {
      intros.given.add(a.type);
      intros.queue.push({ type: a.type, id: a.id });
    }
  }
  if (intros.text && state.t < intros.until) return intros.text;
  intros.text = '';
  intros.ids = [];
  const warning = state.ceo !== null && state.ceo !== undefined && state.ceo.phase === 'warning';
  if (intros.queue.length > 0 && !warning) {
    const next = intros.queue.shift();
    intros.text = next.type === 'strikes' ? strikesText(strikesToFire(state)) : next.type === 'noWater' ? waterText(next.hall)
      : next.type === 'loan' && creditsOn(state) ? CUSTOMERS_TEXT : INTRO_TEXT[next.type];
    intros.ids = state.alarms.some((a) => a.id === next.id) ? [next.id] : [];
    intros.until = state.t + (next.type === 'loan' && !creditsOn(state) ? NOTICE_SECONDS : INTRO_SECONDS);
    // The strikes line must be gone before the first strike visit's warning (45 s away at least).
  }
  return intros.text;
}
