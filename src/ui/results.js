// What the round-over card shows (spec section 10), from results(state). Pure.

import { formatClock, loanText } from '../core/index2.js';

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

/** Pass 6 (M39): "2 CDUs without glycol, 1 hall without water", leaving out a zero. */
export function pumpsShortText(r) {
  const parts = [];
  if (r.cdusEverDry > 0) parts.push(`${plural(r.cdusEverDry, 'CDU', 'CDUs')} without glycol`);
  if (r.hallsEverDry > 0) parts.push(`${plural(r.hallsEverDry, 'hall', 'halls')} without water`);
  return parts.join(', ');
}

const dollars = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
// The highest milestone reached (pass 5 spec 5.2).
export const MILESTONE = { ribbon: 'Ribbon-cutting', handover: 'Handover', commissioned: 'Commissioned' };

const NUMBER = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

/** "Fired by the CEO: three strikes" when strikes did it (pass 5 spec 4.2), else "Fired by the CEO". */
export function firedTitle(r) {
  if (!(r.strikesToFire > 1 && r.strikes >= r.strikesToFire)) return 'Fired by the CEO';
  return `Fired by the CEO: ${NUMBER[r.strikes] ?? r.strikes} strikes`;
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
  if (r.building && Number.isFinite(r.score)) {
    // Pass 5 (spec 5.2): how the run ended (the title), then the score, then the highest milestone.
    big[0] = { value: dollars(r.score), label: r.sold ? 'score · earned + sale' : 'score · earned' };
    big[1] = { value: MILESTONE[r.milestone] ?? 'None', label: 'reached' };
    big[2] = { value: formatClock(r.seconds), label: `survived · ${r.halls} of 8 halls` };
    if (r.sold) lines.splice(0, 0, ['Sale', `${dollars(r.salePrice)}${r.commissioned ? ', Commissioned: half as much again' : ''}`]);
  }
  // Pass 9 (M54): with the win at the finish, the score is the compute delivered, and a win shows its time.
  if (r.building && r.finish) {
    big[0] = { value: dollars(r.score), label: 'score · compute delivered' };
    big[1] = r.won ? { value: formatClock(r.wonAt), label: 'finished in' } : { value: MILESTONE[r.milestone] ?? 'None', label: 'reached' };
    if (r.won) big[2] = { value: `${r.energyGwh.toFixed(2)} GWh`, label: 'delivered · 8 of 8 halls' };
    if (r.sold) lines[0] = ['Sale', `The buyer paid ${dollars(r.salePrice)}`];
  }
  if (r.building) {
    if (!Number.isFinite(r.score)) big[1] = { value: `$${Math.round(r.earned).toLocaleString('en-US')}`, label: 'earned' };
    lines.splice(r.sold ? 1 : 0, 0, ['Money', `$${Math.round(r.earned).toLocaleString('en-US')} earned, $${Math.round(r.spent).toLocaleString('en-US')} spent building, $${Math.round(r.burned).toLocaleString('en-US')} burned · ${r.energyGwh.toFixed(2)} GWh`]);
    if (loanText(r)) lines.splice(r.sold ? 2 : 1, 0, ['Loan', loanText(r).replace(/^Loan /, '')]); // pass 5 spec 3.2
    // Pass 7 spec 4.1 (M42): uptime bonuses, when any were paid.
    if (r.uptime > 0) lines.push(['Uptime bonuses', dollars(r.uptime)]);
    // Pass 7 spec 3.5 (M41): service credits, only when any were charged.
    if (r.credits > 0.5) lines.push(['Service credits', dollars(r.credits)]);
    // Pass 6 (M39): only when the pumps ever fell short, so a clean run keeps a short card.
    if (r.cdusEverDry > 0 || r.hallsEverDry > 0) lines.push(['Pumps short', pumpsShortText(r)]);
  }
  const bestScore = Number.isFinite(record.best.score) ? dollars(record.best.score) : Number.isFinite(record.best.earned) ? `$${Math.round(record.best.earned).toLocaleString('en-US')}` : `${record.best.energyGwh.toFixed(2)} GWh`;
  const bestLine = record.isNew ? 'New best!' : `Best: ${bestScore} in ${formatClock(record.best.seconds)}`;
  // Pass 5 spec 4.2: the minute of each strike.
  if (r.strikes > 0) lines.splice(r.building ? 1 : 0, 0, ['Strikes', `${r.strikes} of ${r.strikesToFire} · ${r.strikeTimes.map(formatClock).join(', ')}`]);
  // The card's heading: who ended the run.
  const title = r.won ? 'Campus handed over' : r.sold && r.finish ? 'Sold early' : r.sold ? (r.commissioned ? 'Commissioned and sold' : 'Sold') : r.firedByCeo ? firedTitle(r) : r.bankrupt ? (r.brokeOnCredits ? 'Went broke: service credits' : 'Went broke') : 'Round over';
  return { big, lines, bestLine, title };
}
