// What the pass 2 HUD strip shows (pass 2 spec 7.3). Pure. Same shape as pass 1's hudModel,
// so the same drawing code paints it: the load in MW against online capacity, and a note with
// "Hall 3 of 8" and how far the next hall's construction has got.

import { promiseNote } from './promisesView.js';
import { perkNote } from './perksView.js';
import { enduranceNote } from './enduranceView.js';
import { buildProgress, buildingOn, deadlineAt, deadlineLeft, finishOn, burnRate, creditsRate, formatClock, incomeRate, load, loanLeft, redSecondsLeft, stabilityOn, strikesToFire } from '../core/index2.js';

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
  const strike = c.strike && !c.zeroTolerance ? `strike ${c.strikeNumber} of ${strikesToFire(state)}` : null;
  const stake = c.zeroTolerance ? 'zero tolerance' : strike ?? `−${c.cost}`;
  const when = c.phase === 'warning' ? `CEO ${formatClock(Math.max(0, Math.ceil(c.warningEnd - state.t)))}` : 'CEO in';
  const nextWord = c.nextIsZeroTolerance ? 'zero tolerance' : c.nextIsStrike ? 'strikes' : null;
  const next = nextWord && c.phase === 'warning' ? ` · next: ${nextWord}` : '';
  return {
    long: `${when} ${c.phase === 'warning' ? '· ' : ''}${areas} · ${stake}${next}`,
    short: `${when} ${c.zeroTolerance ? 'ZT' : strike ? `S${c.strikeNumber}/${strikesToFire(state)}` : stake}`,
  };
}

export const UPTIME_SHOW = 2; // seconds the HUD shows a minute's uptime bonus (spec 4.1)
export const RUNWAY_MAX = 300; // seconds: a runway longer than 5:00 is not shown (spec 7.3)

const dollars = (n) => `$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

/**
 * Building mode (pass 4 spec 2.5, 3.3): the cash, what it is doing a second (income minus burn), and
 * the red countdown. { cash: "$1,240", rate: "+$85/s", falling, red: "0:12" or null, loan: "Loan $940"
 * or null, loanShare: 0..1 still owed, runway: "0:38" or null, credits: "credits −$48/s" or null }.
 */
export function moneyModel(state) {
  // Nothing burns while the tutorial's lessons run (pass 4 M27), so the rate shows income only.
  const net = incomeRate(state) - (state.scripted ? 0 : burnRate(state));
  const left = redSecondsLeft(state);
  const owed = loanLeft(state);
  return {
    cash: `${state.cash < 0 ? '−' : ''}${dollars(state.cash)}`,
    rate: `${net >= 0 ? '+' : '−'}${dollars(net)}/s`,
    falling: net < 0,
    red: left === null ? null : formatClock(Math.ceil(left)),
    // Pass 5 spec 3.2: what is left on the construction loan, and the share still owed (for the bar).
    loan: owed > 0 ? `Loan ${dollars(Math.ceil(owed))}` : null,
    loanShare: owed > 0 ? owed / state.config.building.burn.loan : 0,
    // Pass 5 spec 7.3: while the cash is falling, how long it lasts at this rate ("0:38"); none when
    // rising, already in the red (the red countdown says it), or more than RUNWAY_MAX away.
    runway: net < 0 && state.cash > 0 && state.cash / -net <= RUNWAY_MAX ? formatClock(Math.floor(state.cash / -net)) : null,
    // Pass 7 spec 3.5: while service credits are charged, what they cost a second ("credits −$48/s").
    credits: !state.scripted && creditsRate(state) > 0.005 ? `credits −${dollars(creditsRate(state))}/s` : null,
    // Pass 7 spec 4.1 (M42): for UPTIME_SHOW seconds after a minute's uptime bonus, "+$1,240 uptime".
    uptime: state.uptimeLast && state.uptimeLast.total > 0 && state.t - state.uptimeLast.t < UPTIME_SHOW ? `+${dollars(state.uptimeLast.total)} uptime` : null,
  };
}

/**
 * Pass 9 (M55): the board's deadline for the note: "Due 16:00" (the run's clock), or from 5:00 left
 * "3:12 left", with `urgent` set; null when there is none running.
 */
export function deadlineNote(state) {
  const left = deadlineLeft(state);
  if (left === null) return null;
  const urgent = left <= (state.config.building.deadline.marks?.[0] ?? 300);
  return { text: urgent ? `${formatClock(Math.ceil(left))} left` : `Due ${formatClock(deadlineAt(state))}`, urgent };
}

/** The HUD note's wordings, longest first, with the deadline (M55). */
function noteWordings(state, extra) {
  const list = noteWordingsBase(state, extra);
  // Pass 9 (M56): in endurance the level and heat lead, and are what a narrow phone shows.
  const en = enduranceNote(state);
  // (The HUD fits the first wording that fits of the first, second and last: keep it to three.)
  if (en) return [`${en.long} · ${list[0]}`, en.long, en.short];
  const d = deadlineNote(state);
  if (!d) return list;
  // In the last minutes the deadline leads, and is all a narrow phone shows. Before then it trails the
  // longer wordings (the note is fitted longest first), so the shortest wording stays the usual one.
  if (d.urgent) return [...list.map((w) => `${d.text} · ${w}`), d.text];
  return [...list.slice(0, -1).map((w) => `${w} · ${d.text}`), list[list.length - 1]];
}

/** The HUD note's wordings, longest first: a promise (M49) first, then the loan, then the halls. */
function noteWordingsBase(state, extra) {
  // Pass 8: a surge or a held promise first, then a perk's countdown (M51), then the offers waiting.
  const pn = promiseNote(state);
  const promise = pn && !pn.long.startsWith('CEO:') ? pn : (perkNote(state) ?? pn);
  const base = noteBase(state, extra);
  if (!promise) return base;
  return [`${promise.long} · ${base[0]}`, `${promise.long} · ${base[base.length - 1]}`, promise.long, promise.short];
}

function noteBase(state, extra) {
  const halls = `${state.halls} hall${state.halls === 1 ? '' : 's'} online`;
  const short = `${state.halls}/8 halls`;
  const owed = loanLeft(state);
  // Pass 9 (M54): with the win at the finish, the note leads with the score, the compute delivered.
  if (finishOn(state)) {
    const score = dollars(state.stats.delivered ?? 0);
    const loanPart = owed > 0 ? `Loan ${dollars(Math.ceil(owed))} · ` : '';
    return [`${loanPart}Delivered ${score} · ${halls}${extra}`, `Delivered ${score} · ${short}${extra}`, `Delivered ${score}`, score];
  }
  if (owed <= 0) return [halls + extra, short + extra];
  const loan = `Loan ${dollars(Math.ceil(owed))}`;
  return [`${loan} · ${halls}${extra}`, `${loan} · ${short}`, loan];
}

/**
 * The CEO's strikes for the HUD (pass 5 spec 4.2): { given, of } from the first strike on, else null.
 * Pass 3's zero tolerance (one strike) never shows them: its one strike ends the run.
 */
export function strikesModel(state) {
  const given = state.ceoStrikes ?? 0;
  const of = strikesToFire(state);
  return given > 0 && of > 1 ? { given: Math.min(given, of), of } : null;
}

/** { clock, load, band, meter, note, noteShort, strikes } and, in building mode, money (moneyModel). */
export function hudModel2(state, { auto = false } = {}) {
  const l = load(state);
  if (buildingOn(state)) {
    const extra = auto ? ' · Auto' : '';
    const [note, ...shorter] = noteWordings(state, extra);
    return {
      clock: formatClock(state.t),
      load: `${Math.round(l.deliveredMw)} / ${Math.round(l.capacityMw)} MW`,
      band: l.band,
      meter: stabilityOn(state) ? Math.max(0, Math.min(100, state.meter)) : null,
      money: moneyModel(state),
      note,
      noteShort: shorter[0],
      noteShorter: shorter.at(-1), // the shortest wording (M49: a promise's time left, "1:50")
      strikes: strikesModel(state),
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
    strikes: strikesModel(state),
    note: parts.join(' · '),
    // A shorter wording for narrow screens, where the note must fit before the HUD buttons.
    noteShort: [`H${state.halls}/${state.config.maxHalls}`, ...(state.halls < state.config.maxHalls ? [`next ${Math.floor(buildProgress(state) * 100)}%`] : []), ...parts.slice(2)].join(' · '),
  };
}
