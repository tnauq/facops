// The hire and upgrade card (pass 4 spec 2.6, 3.3, M26). Pure.
// The crew bar ends with a Hire card; tapping it opens this card over the game (which waits). Every
// trade can be hired and every upgrade bought, for money; a button is greyed when the cash is short
// or the upgrade is at its limit.

import { TRADES, UPGRADES, priceOf } from '../core/index2.js';

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const HIRE_ORDER = ['electrical', 'mechanical', 'ce', 'network'];

/** { title, cashText, items: [{ action, kind, trade | upgrade, title, detail, priceText, enabled }] }. */
export function shopModel(state) {
  const hirePrice = priceOf(state, 'hire');
  const upPrice = priceOf(state, 'upgrade');
  const hires = HIRE_ORDER.map((trade) => {
    const have = state.techs.filter((t) => t.trade === trade).length;
    return {
      action: `hire-${trade}`,
      kind: 'hire',
      trade,
      title: TRADES[trade].label,
      detail: have === 0 ? 'None yet' : `${have} on the crew`,
      priceText: money(hirePrice),
      enabled: state.cash >= hirePrice,
    };
  });
  const ups = Object.values(UPGRADES).map((u) => {
    const level = state.upgrades[u.id];
    const full = level >= u.max;
    return {
      action: `upgrade-${u.id}`,
      kind: 'upgrade',
      upgrade: u.id,
      title: u.max > 1 ? `${u.label} ${Math.min(level + 1, u.max)}/${u.max}` : u.label,
      detail: full ? 'Done' : u.text,
      priceText: full ? '' : money(upPrice),
      enabled: !full && state.cash >= upPrice,
    };
  });
  return { title: 'Hire and upgrade', cashText: `Cash ${money(state.cash)} · wages $${state.config.building.burn.wages.toFixed(2)}/s a tech`, items: [...hires, ...ups] };
}

/** The crew bar's Hire card text: { title, price }. */
export const hireCardText = (state) => ({ title: 'Hire', price: money(priceOf(state, 'hire')) });
