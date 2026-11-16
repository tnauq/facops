// Handing over the keys (pass 5 spec 5.2). Pure: what the menu's sale button, the confirm card and
// the Commissioned card say, from the rules in src/core/game2.js (cannotSell, salePrice, score).

import { cannotSell, commissioned, salePrice, score } from '../core/index2.js';

export const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

// Why the button is greyed, in a few words.
export const SELL_WHY = {
  early: 'You can sell after the Handover',
  ceo: 'Not while the CEO is visiting',
  outage: 'Not with an outage open',
  over: 'The run is over',
};

/**
 * The menu's sale button, or null in the classic game: { label, enabled, why }. `why` says why it is
 * greyed ('' when it is not).
 */
export function sellButton(state) {
  const reason = cannotSell(state);
  if (reason === 'off') return null;
  return { label: `Hand over the keys · ${money(salePrice(state))}`, enabled: reason === null, why: reason ? SELL_WHY[reason] ?? '' : '' };
}

/** The confirm card: { title, price, score, note }. */
export function sellConfirm(state) {
  const price = salePrice(state);
  return {
    title: 'Hand over the keys?',
    price: `The campus sells for ${money(price)}${commissioned(state) ? ', with the Commissioned bonus' : ''}.`,
    score: `Your score would be ${money(score(state) + price)}: ${money(state.stats.earned)} earned plus the sale.`,
    note: 'The run ends.',
  };
}

export const COMMISSIONED_LINE = "Fine. It's finished. Don't touch anything.";

/**
 * The Commissioned card: { title, quote, price, sell, enabled } (spec 5.2). If the campus cannot be
 * sold this moment (an outage, or the CEO on site), the button is greyed and the card says why.
 */
export function commissionedCard(state) {
  const price = money(salePrice(state));
  const reason = cannotSell(state);
  const why = reason ? ` ${SELL_WHY[reason] ?? ''}: sell from the menu later.` : '';
  return {
    title: 'Commissioned · 300 MW',
    quote: `“${COMMISSIONED_LINE}”`,
    price: `Sell now for ${price}: the Commissioned price, half as much again. Or keep running for more money; the CEO can still fire you.${why}`,
    sell: `Hand over the keys · ${price}`,
    enabled: reason === null,
  };
}

export const COMMISSION_CARD_DELAY = 3.5; // game seconds of celebration before the card opens
