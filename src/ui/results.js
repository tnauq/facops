// What the round-over card shows (spec section 10), from results(state). Pure.

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
  ].filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many));
  return parts.length > 0 ? parts.join(', ') : 'none';
}

/**
 * { big, lines, bestLine }.
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
  const bestLine = record.isNew ? 'New best!' : `Best: ${record.best.energyGwh.toFixed(2)} GWh in ${formatClock(record.best.seconds)}`;
  return { big, lines, bestLine };
}
