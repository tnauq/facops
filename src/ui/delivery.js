// What the Delivery card shows (pass 2 spec 7.4): which hall came online, Plant B at hall 6, and
// either the tech who joined or the three cards to pick from. Pure.

import { TRADES, UPGRADES } from '../core/index2.js';

const article = (word) => (/^[aeiou]/i.test(word) ? 'An' : 'A');

/** One pick card as the screen shows it: { kind, trade or upgrade, title, detail }. */
export function cardView(state, card) {
  if (card.kind === 'hire') {
    const have = state.techs.filter((t) => t.trade === card.trade).length;
    return {
      kind: 'hire',
      trade: card.trade,
      title: `Hire ${TRADES[card.trade].label}`,
      detail: have === 0 ? 'None on the crew yet' : `${have} on the crew now`,
    };
  }
  const u = UPGRADES[card.upgrade];
  const level = state.upgrades[card.upgrade];
  return {
    kind: 'upgrade',
    upgrade: card.upgrade,
    title: u.max > 1 ? `${u.label} (${level + 1} of ${u.max})` : u.label,
    detail: u.text,
  };
}

/**
 * The card for the Delivery events of one frame. `events` is what step() pushed; the card is null
 * if there was no Delivery. { hall, title, plantB, joined, cards }: `joined` is the trade of a tech
 * who came automatically, `cards` the pick (empty when nothing is to be chosen).
 */
export function deliveryCard(state, events) {
  const d = [...events].reverse().find((e) => e.type === 'delivery');
  if (!d) return null;
  const hire = events.find((e) => e.type === 'hire' && e.hall === d.hall);
  const joined = hire && !state.pendingPick ? hire.trade : null;
  return {
    hall: d.hall,
    title: `Hall ${d.hall} online`,
    plantB: Boolean(d.plantB),
    joined,
    joinedText: joined ? `${article(TRADES[joined].label)} ${TRADES[joined].label} tech joins the crew.` : '',
    cards: state.pendingPick ? state.pendingPick.cards.map((c) => cardView(state, c)) : [],
  };
}
