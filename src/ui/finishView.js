// The win card (pass 9 spec 3.2, M54). Pure: what it says, from results(state).

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

export const WIN_LINE = "Fine. It's finished. I'll take it from here.";

/** { title, time, score, quote } for a won run, or null. */
export function winCard(r, formatClock) {
  if (!r.won) return null;
  return {
    title: 'Campus handed over',
    time: `Finished in ${formatClock(r.wonAt)}`,
    score: `Score ${money(r.score)} · compute delivered (${r.energyGwh.toFixed(2)} GWh)`,
    quote: `“${WIN_LINE}”`,
  };
}
