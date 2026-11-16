// What the round-over card shows (spec section 10), from results(state). Pure.

import { loanText } from '../core/index2.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Only the escalations that happened, so the line stays short on a phone. The Copy text keeps all five.
export function escalationsText(r) {
  const parts = [
    [r.rowShutdowns, 'row shutdown', 'row shutdowns'],
    [r.hallDark, 'dark hall', 'dark halls'],
    [r.spreads, 'network spread', 'network spreads'],
    [r.bursts, 'pump burst', 'pump bursts'],
    [r.secondChillers, 'second chiller', 'second chillers'],
    // Pass 2 only; pass 1 results have none of these, so they never show there.
    [r.halfDark, 'half hall dark', 'half halls dark'],
    [r.leakSpreads, 'leak to a second CDU', 'leaks to a second CDU'],
  ].filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many));
  return parts.length > 0 ? parts.join(', ') : 'none';
}

const SHORT = { electrical: 'Elec', mechanical: 'Mech', ce: 'CE', network: 'Net' };
const UPGRADE_NAME = { carts: 'Carts', tools: 'Better tools', radios: 'Radios' };

// Pass 2 (spec 7.5): halls reached takes the third headline spot; share of possible, crew and
// upgrades join the list. Delivery times are in the Copy text, which has room for them.
function addPass2(r, big, lines) {
  const share = big[2].value;
  big[2] = { value: `${r.halls} of 8`, label: r.fullCampus ? 'halls · full campus' : 'halls' };
  lines.splice(1, 0, ['Of possible energy', share]);
  const crew = {};
  for (const t of r.crew) crew[t] = (crew[t] ?? 0) + 1;
  lines.push(['Crew', Object.entries(crew).map(([t, n]) => `${n} ${SHORT[t] ?? t}`).join(', ')]);
  // Pass 3 (spec 4.6): the CEO's visits.
  if (r.ceoVisits !== undefined) {
    lines.splice(1, 0, ['CEO', `${plural(r.ceoVisits, 'visit', 'visits')} survived, ${plural(r.ceoSightings, 'unattended alarm', 'unattended alarms')} seen`]);
  }
  const ups = r.picks.filter((p) => !p.card.startsWith('hire ')).map((p) => UPGRADE_NAME[p.card] ?? p.card);
  lines.push(['Upgrades', ups.length > 0 ? ups.join(', ') : 'none']);
}

/**
 * { big, lines, bestLine, title }.
 * big: the headline numbers, shown large: time survived, energy delivered, share of possible.
 * lines: [label, value] rows for the smaller list underneath.
 */
export function resultsPanel(r, record, formatClock) {
  const big = [
    { value: formatClock(r.seconds), label: 'survived' },
    { value: `${r.energyGwh.toFixed(2)} GWh`, label: 'delivered' },
    { value: pct(r.shareOfPossible), label: 'of possible' },
  ];
  const cleared = r.cleared > 0;
  const lines = [
    ['Green / yellow / red', `${pct(r.green)} / ${pct(r.yellow)} / ${pct(r.red)}`],
    ['Alarms', `${r.raised} raised, ${r.cleared} cleared`],
    ['Time to clear', cleared ? `${r.averageClear.toFixed(1)} s average, ${Math.round(r.longestAlarm)} s longest` : 'none cleared'],
    ['Escalations', escalationsText(r)],
    ['Redirects', String(r.redirects)],
    ['Matching hat', cleared ? `${pct(r.matchedShare)} of fixes` : 'no fixes'],
  ];
  if (r.halls !== undefined) addPass2(r, big, lines);
  // Pass 4 (spec 2.5): in building mode the score is money earned; it takes the middle headline.
  if (r.building) {
    big[1] = { value: `$${Math.round(r.earned).toLocaleString('en-US')}`, label: 'earned' };
    lines.splice(0, 0, ['Money', `$${Math.round(r.spent).toLocaleString('en-US')} spent building, $${Math.round(r.burned).toLocaleString('en-US')} burned · ${r.energyGwh.toFixed(2)} GWh`]);
    if (loanText(r)) lines.splice(1, 0, ['Loan', loanText(r).replace(/^Loan /, '')]); // pass 5 spec 3.2
  }
  const bestScore = Number.isFinite(record.best.earned) ? `$${Math.round(record.best.earned).toLocaleString('en-US')}` : `${record.best.energyGwh.toFixed(2)} GWh`;
  const bestLine = record.isNew ? 'New best!' : `Best: ${bestScore} in ${formatClock(record.best.seconds)}`;
  // The card's heading: who ended the run.
  const title = r.firedByCeo ? 'Fired by the CEO' : r.bankrupt ? 'Went broke' : 'Round over';
  return { big, lines, bestLine, title };
}
