// Firsts (pass 10 spec 2, M59): the tutorial is the player's first run, played as normal, that stops
// to explain each device, failure, system or action the first time it comes up. Pure.
//
// A first is either a pause (the game holds until "Got it", the camera goes to what it is about) or a
// note (a callout for NOTE_SECONDS, the game keeps running). Each shows once. Pauses are spaced at
// least PAUSE_GAP seconds apart, except a failure's, which goes ahead of anything waiting; none shows
// during a CEO warning unless it is about the CEO. The order is the run's own.
// Every line here is a draft: pass 11 rewrites all text a player sees.

import { EQUIPMENT_BY_ID, alarmCost, economyTime, hallOnline, isBuilt, isFree, msbFed } from '../core/index2.js';
import { anyHallAffordable } from './bundles.js';
import { uptimeText } from './intros.js';

export const PAUSE_GAP = 20; // seconds between pause cards (spec 2.2, starting value; screen only)
export const NOTE_SECONDS = 6; // how long a note shows
export const RACKS_AFTER = 3; // seconds after the goal card closes before the racks note, if no rack is bought
export const SHORT_FOR = 10; // seconds alarms must outnumber free techs before the short-handed card
export const LOAN_AT = 30; // seconds of economy time before the loan note

const ALARM_TEXT = {
  breaker: 'A switchboard tripped: that half is dark and earns nothing. A tech goes on their own.',
  network: 'A rack row lost its network. Down racks deliver nothing.',
  leak: 'A coolant unit is leaking. Left alone, it shuts the hall.',
  chiller: 'A chiller stopped. Too few chillers and every hall runs hot.',
  pump: "A pump's pressure is climbing. Fix it before it bursts.",
  short: 'A transformer shorted. Electricians only: disconnect it at the RMU, then repair it.',
  rmu: 'An RMU failed: both sides of that half are dark. Electricians only.',
  fan: "A dry cooler's fan stopped. With no spare, its plant's chillers stop too.",
};
const ALARM_TITLE = { breaker: 'Breaker trip', network: 'Network down', leak: 'Coolant leak', chiller: 'Chiller down', pump: 'Pump pressure', short: 'Transformer short', rmu: 'RMU fault', fan: 'Dry cooler fan' };

const ev = (events, type, test = () => true) => events.find((e) => e.type === type && test(e)) ?? null;
const hit = (target = null) => ({ target });

// A rack bought in an online hall whose half has no working switchboard: the half needs its own power.
function unpoweredRack(state, events) {
  const e = ev(events, 'buildStart', (x) => x.equipId.startsWith('row-'));
  if (!e) return null;
  const row = EQUIPMENT_BY_ID[e.equipId];
  if (!hallOnline(state, row.hall)) return null; // a hall not yet online gets the new-hall card instead
  const fed = ['A', 'B'].some((s) => isBuilt(state, `msb-${row.hall}-${row.half}-${s}`) && msbFed(state, `msb-${row.hall}-${row.half}-${s}`));
  return fed ? null : hit(`rmu-${row.hall}-${row.half}`);
}

const rowsBought = (state) => Object.keys(state.equip).filter((id) => id.startsWith('row-') && (state.equip[id].built || state.equip[id].buildEnd !== null)).length;

/**
 * The firsts, in no fixed order. Each: id, kind ('pause' | 'note'), title, text(state) and check(state,
 * events, f) returning { target } (an equipment id, or null) when it comes up. failure: a failure's
 * card goes ahead of others; ceo: may show during a CEO warning.
 */
export const FIRSTS = [
  // The goal and the build.
  { id: 'goal', kind: 'pause', title: 'Finish the campus', ceo: true,
    text: () => "Your job: get all 48 rack rows running before the board's deadline. Then the CEO signs it off.",
    check: (state) => (state.t >= 0.5 ? hit(null) : null) },
  { id: 'racks', kind: 'note', text: () => 'Racks earn money. Tap a + on a rack spot.',
    // Only once the goal's card has been closed (lastPauseEnd is set when a card closes).
    check: (state, events, f) => (Number.isFinite(f.lastPauseEnd) && !f.current && state.t - f.lastPauseEnd >= RACKS_AFTER && rowsBought(state) <= 2 ? hit('row-1-t-2') : null) },
  { id: 'buildCard', kind: 'note', text: () => 'Progress pieces get you closer to finished. Support pieces keep you safe.',
    check: (state, events, f) => (f.marks.has('buildCard') ? hit(null) : null) },
  { id: 'contractors', kind: 'note', text: (state) => `A contractor builds it in ${state.config.building.buildTime} s. Running, it costs a little upkeep.`,
    check: (state, events) => (ev(events, 'buildStart') ? hit(null) : null) },
  { id: 'bottomHalf', kind: 'pause', title: 'Each half needs power',
    text: () => 'Each half needs its own power: an RMU outside, a transformer, then a switchboard inside.',
    check: unpoweredRack },
  // Failures, the first of each kind.
  ...Object.keys(ALARM_TEXT).map((type) => ({
    id: `alarm-${type}`, kind: 'pause', title: ALARM_TITLE[type], failure: true, text: () => ALARM_TEXT[type],
    check: (state, events) => {
      const e = ev(events, 'spawn', (x) => x.alarmType === type);
      return e ? hit(e.equipId) : null;
    },
  })),
  { id: 'keptLit', kind: 'note', text: () => "The backup carried the load. That's what support is for.",
    check: (state, events) => {
      const e = ev(events, 'spawn', (x) => x.alarmType === 'breaker');
      if (!e) return null;
      const alarm = state.alarms.find((a) => a.id === e.alarmId);
      return alarm && alarmCost(state, alarm) === 0 ? hit(e.equipId) : null;
    } },
  { id: 'warning', kind: 'pause', title: 'A warning', failure: true,
    text: () => 'A wrench means a device is about to fail. A tech who gets there in time stops it.',
    check: (state, events) => {
      const e = ev(events, 'warning');
      return e ? hit(e.equipId) : null;
    } },
  { id: 'dryCdu', kind: 'pause', title: 'Not enough glycol', text: () => 'A coolant unit has no glycol: build glycol pumps at the plant. Each serves two units.',
    check: (state, events) => {
      const e = ev(events, 'cduDry');
      return e ? hit(e.equipId) : null;
    } },
  { id: 'noWater', kind: 'pause', title: 'A hall without water', text: () => 'Water pumps serve two halls each. A hall without water runs at half.',
    check: (state, events) => (ev(events, 'hallDry') ? hit(null) : null) },
  // Growing.
  { id: 'newHall', kind: 'pause', title: 'A new hall',
    text: () => 'A new hall needs power, a coolant unit and, every two halls, a water pump. Then racks.',
    check: (state, events) => {
      const e = ev(events, 'buildStart', (x) => EQUIPMENT_BY_ID[x.equipId].hall && EQUIPMENT_BY_ID[x.equipId].hall !== 1);
      return e ? hit(e.equipId) : null;
    } },
  { id: 'hall2', kind: 'note', text: () => 'Two halls. The strip at the bottom shows the whole campus: tap it to look around.',
    check: (state) => (state.halls >= 2 ? hit(null) : null) },
  { id: 'shortHanded', kind: 'pause', title: 'Short-handed',
    text: () => 'More failures than techs. Hire from the crew bar: a matching hat fixes faster.',
    check: (state, events, f) => {
      const waiting = state.alarms.filter((a) => a.techId === null).length;
      const free = state.techs.filter((t) => isFree(t)).length;
      if (waiting > free) f.shortSince ??= state.t;
      else f.shortSince = null;
      return f.shortSince !== null && state.t - f.shortSince >= SHORT_FOR ? hit('hire') : null;
    } },
  { id: 'bundles', kind: 'note', text: () => "Tap a hall's name to buy what it needs in one go.",
    // After the first rack is bought, so the player has met a build card before being shown bundles.
    check: (state) => (state.halls < 8 && !state.scripted && rowsBought(state) > 2 && anyHallAffordable(state) ? hit(null) : null) },
  { id: 'hall3', kind: 'note', text: () => 'Layers show one system at a time: power, cooling or crew.',
    check: (state) => (state.halls >= 3 ? hit(null) : null) },
  { id: 'posts', kind: 'note', text: () => 'Tap a tech, then a hall on the strip, to post them there.',
    check: (state) => (state.techs.length >= 4 ? hit(null) : null) },
  // Money and customers.
  { id: 'loan', kind: 'note', text: (state) => `The construction loan: $${state.config.building.burn.loanRate} a second until it's paid. Tap the cash for the ledger.`,
    check: (state) => (state.config.building.burn.loan > 0 && economyTime(state) >= LOAN_AT ? hit(null) : null) },
  { id: 'customers', kind: 'pause', title: 'Customers are live',
    text: () => "Loan paid off. Customers are live: every rack that's down now costs service credits.",
    check: (state, events) => (ev(events, 'customersLive') ? hit(null) : null) },
  { id: 'uptime', kind: 'note', text: (state) => uptimeText(state.config.building.uptime.bonus),
    check: (state, events) => (ev(events, 'uptimeBonus', (e) => e.total > 0) ? hit(null) : null) },
  // The CEO and the finish.
  { id: 'ceo', kind: 'pause', title: 'The CEO is coming', ceo: true,
    text: () => 'The CEO is coming. Every outage they see costs you. Fix what you can before they arrive.',
    check: (state, events) => (ev(events, 'ceoWarning') ? hit(null) : null) },
  { id: 'promise', kind: 'pause', title: "The CEO's promises",
    text: () => 'The CEO makes promises to the board. Take one for cash now and more when you deliver. Tap the note at the top.',
    check: (state, events) => (ev(events, 'promiseOffered') ? hit(null) : null) },
  { id: 'handover', kind: 'pause', title: 'The Handover',
    text: () => 'Halfway there. You can sell early from the menu, but only finishing wins.',
    check: (state) => (state.handoverQueued ? hit(null) : null) },
  { id: 'strikes', kind: 'pause', title: 'Strikes', ceo: true,
    text: () => "From now on, every outage the CEO sees is a strike. Three and you're out.",
    check: (state, events) => (ev(events, 'ceoWarning', (e) => e.strike) ? hit(null) : null) },
  { id: 'deadline', kind: 'pause', title: 'Five minutes',
    text: () => 'The board wants this in five minutes.',
    check: (state, events) => (ev(events, 'deadlineSoon', (e) => e.left === 300) ? hit(null) : null) },
];

export const FIRST_BY_ID = Object.fromEntries(FIRSTS.map((f) => [f.id, f]));

/** A fresh set of firsts: none seen. */
export function createFirsts() {
  // opened: the parts of the screen that have appeared (src/ui/opening.js, M61).
  return { seen: new Set(), marks: new Set(), queue: [], current: null, note: null, lastPauseEnd: -Infinity, shortSince: null, opened: [] };
}

/** The screen reports a first that only it can see ('buildCard': a build card opened). */
export function markFirst(f, id) {
  if (f) f.marks.add(id);
}

/**
 * Advance one frame with this frame's events. Returns { pause, note }: the pause card to show
 * ({ id, title, text, target }) or null, and the note's text ('' when none).
 */
export function updateFirsts(f, state, events) {
  for (const first of FIRSTS) {
    if (f.seen.has(first.id)) continue;
    if (first.id !== 'goal' && !f.seen.has('goal')) continue; // the goal always comes first
    const found = first.check(state, events, f);
    if (!found) continue;
    f.seen.add(first.id);
    f.queue.push({ id: first.id, kind: first.kind, title: first.title ?? '', text: first.text(state), target: found.target, failure: Boolean(first.failure), ceo: Boolean(first.ceo), at: state.t });
  }
  // Notes: one at a time, never over a pause card.
  if (f.note && state.t >= f.note.until) f.note = null;
  if (!f.note && !f.current) {
    const i = f.queue.findIndex((q) => q.kind === 'note');
    if (i >= 0) {
      const [n] = f.queue.splice(i, 1);
      f.note = { id: n.id, text: n.text, target: n.target, until: state.t + NOTE_SECONDS };
    }
  }
  if (!f.current) f.current = nextPause(f, state);
  // One voice: a pause card takes over from a note, which waits to show again after it.
  if (f.current && f.note) {
    f.queue.unshift({ id: f.note.id, kind: 'note', text: f.note.text, target: f.note.target });
    f.note = null;
  }
  return { pause: f.current, note: f.note ? f.note.text : '' };
}

// The next pause card due: the newest failure first, then the oldest waiting; spaced PAUSE_GAP apart
// (a failure's card is never held back by the spacing); during a CEO warning only the CEO's own.
function nextPause(f, state) {
  const warning = Boolean(state.ceo && state.ceo.phase === 'warning');
  const ok = (q) => q.kind === 'pause' && (!warning || q.ceo);
  const failures = f.queue.filter((q) => ok(q) && q.failure);
  let pick = failures.length ? failures[failures.length - 1] : null;
  if (!pick && state.t - f.lastPauseEnd >= PAUSE_GAP) pick = f.queue.find(ok) ?? null;
  if (!pick) return null;
  f.queue.splice(f.queue.indexOf(pick), 1);
  return pick;
}

/** "Got it": the pause card closes, and the spacing starts from now. */
export function closeFirst(f, state) {
  if (!f || !f.current) return;
  f.current = null;
  f.lastPauseEnd = state.t;
}

/** As plain data for a save, and back (pass 7 M44: a resumed run keeps what it has seen). */
export const firstsToSave = (f) => (f ? { ...f, seen: [...f.seen], marks: [...f.marks] } : null);
export const firstsFromSave = (s) => (s ? { ...createFirsts(), ...s, seen: new Set(s.seen ?? []), marks: new Set(s.marks ?? []), lastPauseEnd: s.lastPauseEnd ?? -Infinity } : null);
