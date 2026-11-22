// The CEO's promises on the screen (pass 8 spec 6.2, M49). Pure: the HUD note, the promises card,
// and plain words for what each promise asks.

import { formatClock, promiseLeft, promisesOn, surging } from '../core/index2.js';

export const TITLE = {
  lightsOn: 'Lights on', hallTwo: 'Hall two', moreMw: 'More megawatts', belt: 'Belt and braces',
  spare: 'Spare capacity', oneOfEach: 'One of each', quietFloor: 'Quiet floor', surge: 'A surge',
};

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

/** What a promise asks for, in a few words. */
export function asks(state, o) {
  switch (o.key) {
    case 'lightsOn': return "All six of Hall 1's rack rows earning";
    case 'hallTwo': return 'A second hall online';
    case 'moreMw': return `${o.target} rack rows online`;
    case 'belt': return 'One hall with both B switchboards and both coolant units';
    case 'spare': return 'A spare chiller, glycol pump and water pump, all running';
    case 'oneOfEach': return 'A tech of every trade on the crew';
    case 'quietFloor': return `No dark half-hall and no service credits for ${formatClock(state.config.building.promises.quietFor)}`;
    case 'surge': {
      const sg = state.config.building.surges;
      const more = Math.round((1 / sg.gapFactor - 1) * 100);
      return `The CEO sold a surge: for ${formatClock(sg.length)} every rack earns half as much again, and failures come ${more >= 100 ? 'twice as often' : `${more}% more often`}`;
    }
    default: return '';
  }
}

/** The HUD note's promise part: { long, short } or null. The nearest deadline, else the offers waiting. */
export function promiseNote(state) {
  if (!promisesOn(state) || !state.promises) return null;
  // Pass 8 (M50): a running surge comes first: "Surge · 0:42".
  if (surging(state)) {
    const left = formatClock(Math.ceil(Math.max(0, state.surge.until - state.t)));
    return { long: `Surge · ${left}`, short: left }; // the short form fits a 660 px phone's note
  }
  const p = state.promises;
  if (p.held.length > 0) {
    const h = [...p.held].sort((a, b) => a.deadline - b.deadline)[0];
    const left = formatClock(Math.ceil(promiseLeft(state, h)));
    return { long: `${TITLE[h.key]} · ${left}`, short: left };
  }
  if (p.offers.length > 0) return { long: `CEO: ${p.offers.length} offer${p.offers.length === 1 ? '' : 's'}`, short: `CEO ${p.offers.length}` };
  return null;
}

/** The promises card: { held: [...], offers: [...], room } with the words and amounts each line shows. */
export function promisesCard(state) {
  const p = state.promises ?? { held: [], offers: [] };
  const room = p.held.length < state.config.building.promises.held;
  return {
    room,
    held: p.held.map((h) => ({
      id: h.id,
      title: TITLE[h.key],
      asks: asks(state, h),
      left: `${formatClock(Math.ceil(promiseLeft(state, h)))} left`,
      pays: `Pays ${money(h.payment)} on delivery`,
      cancel: h.advance > 0 ? `Cancel · hand back ${money(h.advance)}` : 'Cancel',
    })),
    offers: p.offers.map((o) => {
      // Pass 8 (M50): a surge holds no place, but waits out a CEO visit and a running surge.
      if (o.key === 'surge') {
        const can = !state.ceo && !surging(state);
        return { id: o.id, title: TITLE.surge, asks: asks(state, o), within: `For ${formatClock(o.window)}`, money: 'Nothing up front', take: can ? 'Take the surge' : 'Not now', canTake: can };
      }
      return {
        id: o.id,
        title: TITLE[o.key],
        asks: asks(state, o),
        within: `Within ${formatClock(o.window)}`,
        money: o.advance > 0 ? `${money(o.advance)} now, ${money(o.payment)} on delivery` : `${money(o.payment)} on delivery`,
        take: room ? 'Accept' : 'Two held already',
        canTake: room,
      };
    }),
  };
}

/** The results card's line: "2 kept, 1 missed · $1,050", or null if none was ever taken. */
export function promisesLine(state) {
  const p = state.promises;
  if (!p || p.kept + p.missed + p.cancelled + p.held.length + (p.surges ?? 0) === 0) return null;
  const parts = [`${p.kept} kept`];
  if (p.missed) parts.push(`${p.missed} missed`);
  if (p.cancelled) parts.push(`${p.cancelled} cancelled`);
  if (p.surges) parts.push(`${p.surges} surge${p.surges === 1 ? '' : 's'}`);
  return `${parts.join(', ')} · ${money(state.stats.promises ?? 0)}`;
}
