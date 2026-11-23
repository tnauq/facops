// The ledger (pass 7 spec 6.1, M45). Pure: where the money goes, for the card that opens from the
// cash in the HUD. Now, a second: income by hall, last minute's uptime bonus, and the burn in its
// parts. The run so far: from the starting cash, everything in and out, down to the cash now.

import {
  splitOn, EQUIPMENT_BY_ID, burnParts, creditPerRow, creditsOn, customersLiveAt, economyTime, formatClock, loanLeft, loanTimeLeft, onlineHallIds, onlineRows,
} from '../core/index2.js';
import { TITLE as PROMISE_TITLE } from './promisesView.js';

const money = (n) => `${n < -0.005 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
const perSecond = (n) => `${n < -0.005 ? '−' : n > 0.005 ? '+' : ''}$${Math.abs(n).toFixed(2)}/s`;

// What each online hall's racks earn now, in dollars a second.
function incomeByHall(state) {
  const by = new Map(onlineHallIds(state).map((h) => [h, 0]));
  for (const row of onlineRows(state)) {
    const e = EQUIPMENT_BY_ID[row.id];
    by.set(e.hall, (by.get(e.hall) ?? 0) + state.equip[row.id].level * state.thermal * state.config.building.income);
  }
  return [...by].map(([hall, rate]) => ({ hall, rate }));
}

// When the service credits next double, in seconds; null before customers are live.
function nextDoubling(state) {
  const c = state.config.building.credits;
  if (!creditsOn(state) || !(c.doubling > 0)) return null;
  const since = economyTime(state) - customersLiveAt(state);
  return c.doubling - (since % c.doubling);
}

/**
 * { now: [{ label, value, note, out }], net, soFar: [{ label, value, out }], start, cash, total }.
 * now lists income (one line per online hall, then last minute's uptime bonus) and the burn, each
 * with a note ("3 techs", "$1,240 left, paid off at 5:00"). soFar runs from the starting cash to
 * `total`, which is the cash now (the screen shows both; tests check they agree).
 */
export function ledger(state) {
  const p = burnParts(state);
  const b = state.config.building;
  const now = [];
  let incomeTotal = 0;
  for (const { hall, rate } of incomeByHall(state)) {
    incomeTotal += rate;
    now.push({ label: `Hall ${hall}`, value: perSecond(rate), note: '', out: false });
  }
  if (now.length === 0) now.push({ label: 'No hall online', value: perSecond(0), note: '', out: false });
  const last = state.uptimeLast;
  if (last && last.total > 0) now.push({ label: 'Uptime bonus', value: `+${money(last.total)}`, note: `last minute, ${last.rows.length} rows`, out: false });
  if (p.loan > 0) {
    const left = loanLeft(state);
    now.push({ label: 'Loan repayment', value: perSecond(-p.loan), note: `${money(left)} left, paid off at ${formatClock(economyTime(state) + loanTimeLeft(state))}`, out: true });
  }
  if (p.secondLoan > 0) now.push({ label: 'Second loan', value: perSecond(-p.secondLoan), note: `${money(state.rescue.loanLeft)} left`, out: true });
  now.push({ label: 'Site overhead', value: perSecond(-p.overhead), note: '', out: true });
  now.push({ label: 'Upkeep', value: perSecond(-p.upkeep), note: `${p.devices} devices`, out: true });
  now.push({ label: 'Wages', value: perSecond(-p.wages), note: `${p.crew} tech${p.crew === 1 ? '' : 's'}`, out: true });
  if (b.credits && b.credits.rate > 0) {
    const next = nextDoubling(state);
    const note = next === null ? `from ${formatClock(customersLiveAt(state))}, for racks that are down` : `${money(creditPerRow(state))}/s a row short, doubles in ${formatClock(next)}`;
    now.push({ label: 'Service credits', value: perSecond(-p.credits), note, out: true });
  }
  // Pass 8 (M49): held promises, with what they pay on delivery.
  for (const h of state.promises?.held ?? []) {
    now.push({ label: `Promise: ${PROMISE_TITLE[h.key]}`, value: `+${money(h.payment)}`, note: `on delivery, ${formatClock(Math.ceil(Math.max(0, h.deadline - state.t)))} left`, out: false });
  }
  const net = incomeTotal - (p.loan + p.overhead + p.upkeep + p.wages + p.credits + p.secondLoan);

  const st = state.stats;
  const parts = st.burnParts ?? { loan: 0, overhead: 0, upkeep: 0, wages: 0 };
  const uptime = st.uptime ?? 0;
  const lines = [
    ['Earned from racks', st.earned - uptime - (st.promises ?? 0), false],
    ['Uptime bonuses', uptime, false],
    ['Promises', st.promises ?? 0, false], // pass 8 (M49): advances and payments, less advances handed back
    // Pass 9 (M57): with the split, spending reads as building the campus or keeping it running.
    ...(splitOn(state)
      ? [['Building the campus', -(st.spentProgress ?? 0), true], ['Keeping it running', -(st.spentSupport ?? 0), true]]
      : [['Spent on building', -(st.spentBuild ?? 0), true], ['Spent on hiring and upgrades', -(st.spentCrew ?? 0), true]]),
    ['Loan repaid', -parts.loan, true],
    ['Site overhead', -parts.overhead, true],
    ['Upkeep', -parts.upkeep, true],
    ['Wages', -parts.wages, true],
    ['Service credits', -(st.credits ?? 0), true],
    ['CEO fines', -(st.ceoFines ?? 0), true],
    ['Second loan', st.funding ?? 0, false], // pass 8 (M51): the funding round
    ['Second loan repaid', -(parts.secondLoan ?? 0), true],
  ];
  const start = b.startCash;
  const total = lines.reduce((sum, [, v]) => sum + v, start);
  const soFar = lines.map(([label, v, out]) => ({ label, value: money(v), raw: v, out }));
  return { now, net, netText: perSecond(net), soFar, start, startText: money(start), total, cashText: money(state.cash) };
}
