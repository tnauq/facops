// The How it works card (pass 10 spec 5, M62). Pure, apart from the two storage helpers, which take
// the storage and never throw.
//
// From the pause menu: every first this player has ever been shown (kept on the device, across runs),
// grouped as the spec lists them, each opening its card's words and, where there is one, the picture
// of its device. A player who missed a card can find it again.

import { FIRST_BY_ID } from './firsts.js';

export const REFERENCE_KEY = 'facops.howItWorks.v1';

// Each first's entry: its title in the list (notes have none of their own) and its picture: a
// device type for the build card's drawing, 'tech' for a tech, or null.
const GROUPS = [
  ['The build', [
    ['goal', 'Finish the campus', null],
    ['racks', 'Racks', 'row'],
    ['buildCard', 'Progress and support', null],
    ['contractors', 'Contractors', null],
    ['bottomHalf', 'Each half needs power', 'rmu'],
  ]],
  ['Failures', [
    ['alarm-breaker', null, 'msb'],
    ['keptLit', 'Backups', 'msb'],
    ['alarm-network', null, 'row'],
    ['alarm-leak', null, 'cdu'],
    ['alarm-chiller', null, 'chiller'],
    ['alarm-pump', null, 'pump'],
    ['alarm-short', null, 'xfmr'],
    ['alarm-rmu', null, 'rmu'],
    ['alarm-fan', null, 'dry'],
    ['warning', null, null],
    ['dryCdu', null, 'cdu'],
    ['noWater', null, 'pump'],
  ]],
  ['Growing', [
    ['newHall', null, null],
    ['hall2', 'The overview strip', null],
    ['shortHanded', null, 'tech'],
    ['bundles', 'Bundles', null],
    ['hall3', 'Layers', null],
    ['posts', 'Posts', 'tech'],
  ]],
  ['Money and customers', [
    ['loan', 'The construction loan', null],
    ['customers', null, null],
    ['uptime', 'Uptime bonus', 'row'],
  ]],
  ['The CEO and the finish', [
    ['ceo', null, null],
    ['promise', null, null],
    ['handover', null, null],
    ['strikes', null, null],
    ['deadline', null, null],
  ]],
];

const ENTRIES = GROUPS.flatMap(([group, rows]) => rows.map(([id, title, picture]) => ({ id, group, title: title ?? FIRST_BY_ID[id]?.title ?? id, picture })));
const ENTRY_BY_ID = Object.fromEntries(ENTRIES.map((e) => [e.id, e]));

/** Every first has an entry (the tests check this against FIRSTS). */
export const REFERENCE_IDS = ENTRIES.map((e) => e.id);

/**
 * The list for the card: [{ group, entries: [{ id, title }] }], only firsts in `known`, in the
 * spec's order; groups with nothing known are left out.
 */
export function referenceList(known) {
  const has = new Set(known);
  return GROUPS.map(([group]) => ({ group, entries: ENTRIES.filter((e) => e.group === group && has.has(e.id)).map(({ id, title }) => ({ id, title })) }))
    .filter((g) => g.entries.length > 0);
}

/** One entry opened: { id, title, text, picture }. text is the first's card, for this run's numbers. */
export function referenceEntry(id, state) {
  const e = ENTRY_BY_ID[id];
  const first = FIRST_BY_ID[id];
  if (!e || !first) return null;
  return { id, title: e.title, text: first.text(state), picture: e.picture };
}

/** Add what a run's firsts have seen to what the device knows. Returns the new list, or null if nothing is new. */
export function mergeKnown(known, seen) {
  const has = new Set(known);
  const fresh = [...seen].filter((id) => ENTRY_BY_ID[id] && !has.has(id));
  return fresh.length ? [...known, ...fresh] : null;
}

/** What this device knows: a list of first ids ([] with no storage or nothing saved). */
export function loadKnown(storage) {
  try {
    const raw = storage?.getItem(REFERENCE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveKnown(storage, known) {
  try {
    storage?.setItem(REFERENCE_KEY, JSON.stringify(known));
  } catch {
    // No storage: the card simply knows this visit's firsts.
  }
}
