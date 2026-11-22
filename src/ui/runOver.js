// The run-over card's voice (pass 7 spec 6.2, M45). Pure: the CEO's parting line, chosen from the
// run's own numbers (the first that applies), and the ledger's run-so-far totals for the card and
// the Copy text.

import { EQUIPMENT, priceOf } from '../core/index2.js';
import { ledger } from './ledger.js';

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const built = (state, id) => Boolean(state.equip[id] && state.equip[id].built);

/**
 * What the backups cost that never had anything to cover: each half's B transformer and switchboard
 * where that half never had a breaker trip or a transformer short, and each hall's second coolant
 * unit where neither unit ever leaked.
 */
export function idleBackupSpend(state) {
  const troubled = state.stats.troubled ?? {};
  let total = 0;
  for (const e of EQUIPMENT) {
    if (e.type === 'msb' && e.side === 'B' && built(state, e.id) && !troubled[`${e.hall}-${e.half}`]) {
      total += priceOf(state, e.id);
      const x = `xfmr-${e.hall}-${e.half}-B`;
      if (built(state, x)) total += priceOf(state, x);
    }
    // A hall with both coolant units: the bottom one counts as the backup.
    if (e.type === 'cdu' && e.half === 'b' && built(state, e.id) && built(state, `cdu-${e.hall}-t`) && !troubled[`${e.hall}`]) total += priceOf(state, e.id);
  }
  return total;
}

const anyB = (state) => EQUIPMENT.some((e) => e.type === 'msb' && e.side === 'B' && built(state, e.id));

/** The CEO's parting line for a building run: the first of the starting set that applies. */
export function partingLine(state, r) {
  if (r.won) return "Fine. It's finished. I'll take it from here."; // pass 9 (M54)
  if (r.sold && r.finish) return 'Sold before it was finished. Bold. Also, sold.';
  if (r.sold && r.commissioned) return "Pleasure doing business. Don't call me.";
  if (r.firedByCeo && !anyB(state)) return 'Not one backup. Bold. Also, fired.';
  const idle = r.firedByCeo ? idleBackupSpend(state) : 0;
  if (idle > 0) return `You spent ${money(idle)} on backups that never tripped.`;
  if (r.bankrupt && r.seconds - (state.economyStart ?? 0) < (state.config.building.burn.loanRate > 0 ? state.config.building.burn.loan / state.config.building.burn.loanRate : 300)) return 'The loan wanted its money. So did I.';
  if (r.brokeOnCredits) return "Our customers have sent a thank-you card. It's an invoice.";
  if (r.hallsEverDry > 0) return 'Half the building ran at half. I did the maths.';
  return "I'll get an AI to run this.";
}

/** The ledger's run so far, as [label, value] lines for the card (starting cash first, cash last). */
export function soFarLines(state) {
  const l = ledger(state);
  return [['Starting cash', l.startText], ...l.soFar.filter((x) => Math.abs(x.raw) >= 0.5).map((x) => [x.label, x.value]), ['Cash at the end', l.cashText]];
}

/** The same, as plain text for the Copy button. */
export const soFarText = (state) => `Ledger: ${soFarLines(state).map(([k, v]) => `${k} ${v}`).join(' | ')}`;
