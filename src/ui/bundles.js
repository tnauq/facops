// Bundles (pass 7 spec 4.2, M43). Pure: what a hall needs next, each as one purchase. Tap a hall's
// name and a card lists them. A bundle is a shortcut and nothing more: the same prices, each piece
// built through the ordinary build command, no discount. It is all or nothing: with too little cash
// nothing is bought, and the button says how much more is needed.
//
// A bundle may add pieces the hall does not own but needs: a water pump so the hall has water, a
// glycol pump so a coolant unit has glycol, chillers (with the glycol pumps and dry coolers that let
// them run) so the racks are cooled. Each extra comes with its reason in one line.

import { build, buyPrice, cannotBuild, hallOnline, onlineRows, priceOf, spotState } from '../core/index2.js';
import { CHILLERS_ORDER, GLYCOL_ORDER, WATER_PUMPS_ORDER } from '../core/builderSpots.js';
import { HALLS } from '../core/index2.js';
import { cameraView } from './camera.js';

export const NAME_TAP_W = 120; // px: a hall name's tap target, at least 44 x 44 (spec: 44 px targets)
export const NAME_TAP_H = 44;
const NAME_Y = 8; // world units below the hall's top wall, where the name is drawn (campus2.js)

const HALF = { t: 'top', b: 'bottom' };
const DRY_ORDER = (plant) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `dry-${plant}-${i}`);
const ALL_GLYCOL = [...GLYCOL_ORDER('A'), ...GLYCOL_ORDER('B')];
const ALL_CDUS = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((h) => [`cdu-${h}-t`, `cdu-${h}-b`]);
const ALL_MSBS = (h, half) => [`msb-${h}-${half}-A`, `msb-${h}-${half}-B`];
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

// A plan of purchases: what is bought (or being built) already counts, and so does what the plan
// has picked so far, so two extras never pick the same spot.
function planner(state) {
  const picked = new Set();
  const started = (id) => picked.has(id) || spotState(state, id) !== 'empty';
  const free = (id) => !started(id);
  const count = (ids) => ids.filter(started).length;
  return { picked, started, free, count, take: (id) => picked.add(id) };
}

// A water pump if the halls online, plus `more`, would outnumber what the water pumps serve.
function waterExtra(state, p, more) {
  const per = state.config.building.pumps.hallsPerWaterPump;
  const halls = state.halls + more;
  if (per > 0 && p.count(WATER_PUMPS_ORDER) * per >= halls) return [];
  const id = WATER_PUMPS_ORDER.find(p.free);
  if (!id) return [];
  p.take(id);
  return [{ id, reason: `Water pump: ${halls} halls need ${Math.ceil(halls / Math.max(1, per))}` }];
}

// A glycol pump if one more coolant unit would outrun what the glycol pumps feed.
function glycolExtra(state, p) {
  const per = state.config.building.pumps.cdusPerGlycolPump;
  const cdus = p.count(ALL_CDUS);
  if (p.count(ALL_GLYCOL) * per >= cdus) return [];
  const id = ALL_GLYCOL.find(p.free);
  if (!id) return [];
  p.take(id);
  return [{ id, reason: `Glycol pump: ${cdus} coolant units need ${Math.ceil(cdus / per)}` }];
}

// One more chiller, with what its plant needs first to run it: a glycol pump, a dry cooler.
function chillerExtra(state, p) {
  const id = CHILLERS_ORDER.find(p.free);
  if (!id) return [];
  const plant = id.split('-')[1];
  const chillers = CHILLERS_ORDER.filter((c) => c.startsWith(`chiller-${plant}`) && p.started(c)).length + 1;
  const out = [];
  const b = state.config.building;
  if (p.count(GLYCOL_ORDER(plant)) * b.pumps.chillersPerGlycolPump < chillers) {
    const g = GLYCOL_ORDER(plant).find(p.free);
    if (g) {
      p.take(g);
      out.push({ id: g, reason: `Glycol pump: lets Plant ${plant}'s chillers run` });
    }
  }
  if (p.count(DRY_ORDER(plant)) * b.chillersPerDryCooler < chillers) {
    const d = DRY_ORDER(plant).find(p.free);
    if (d) {
      p.take(d);
      out.push({ id: d, reason: `Dry cooler: lets Plant ${plant}'s chillers run` });
    }
  }
  p.take(id);
  out.push({ id, reason: 'Chiller: cooling would run short' });
  return out;
}

// Chillers enough for `rows` more rack rows online (with what they need), as in the rules'
// chillersNeeded: one chiller for each hall's worth of rows.
function coolingExtras(state, p, rows) {
  const perHall = state.config.building.chillersPerHall;
  const pendingRows = Object.keys(state.equip).filter((id) => id.startsWith('row-') && spotState(state, id) === 'building').length;
  const need = Math.ceil(((onlineRows(state).length + pendingRows + rows) * perHall) / 6 - 1e-9);
  const out = [];
  while (p.count(CHILLERS_ORDER) < need) {
    const more = chillerExtra(state, p);
    if (more.length === 0) break;
    out.push(...more);
  }
  return out;
}

// The spots of a list that are still empty (and not already in the plan).
function pieces(p, ids) {
  const out = ids.filter(p.free);
  for (const id of out) p.take(id);
  return out;
}

function bundle(state, key, title, own, extras) {
  const ids = [...own, ...extras.map((x) => x.id)];
  // Pass 8 (M51): Bulk order's half-price rows run out part-way through a bundle.
  let bulk = state.perks ? state.perks.bulkRows : 0;
  const price = ids.reduce((sum, id) => {
    if (id.startsWith('row-') && bulk > 0) {
      bulk -= 1;
      return sum + buyPrice(state, id);
    }
    return sum + priceOf(state, id);
  }, 0);
  const short = Math.max(0, price - state.cash);
  return {
    key,
    title,
    pieces: own,
    extras,
    ids,
    price,
    priceText: money(price),
    canBuy: ids.length > 0 && short <= 1e-9,
    button: short > 1e-9 ? `Need ${money(Math.ceil(short))} more` : `Buy · ${money(price)}`,
  };
}

const hasMsb = (state, h, half) => ALL_MSBS(h, half).some((id) => spotState(state, id) !== 'empty');
const halfStarted = (p, h, half) => ALL_MSBS(h, half).some(p.started);

/**
 * What hall h needs next: [{ key, title, pieces: [ids], extras: [{ id, reason }], ids, price,
 * priceText, canBuy, button }], in the order a hall is built: online, the other half, the racks,
 * then the backups.
 */
export function bundlesFor(state, h) {
  const out = [];
  const online = hallOnline(state, h);
  // Bring the hall online: the top half's power chain and coolant unit, and what the hall needs to
  // be served (a water pump) and fed (a glycol pump). Not while it is being built.
  if (!online) {
    const p = planner(state);
    const own = pieces(p, [`rmu-${h}-t`, `xfmr-${h}-t-A`, `msb-${h}-t-A`, `cdu-${h}-t`].filter((id) => !(id.startsWith('msb') && hasMsb(state, h, 't'))));
    const cduNew = own.includes(`cdu-${h}-t`) && spotState(state, `cdu-${h}-b`) === 'empty';
    const extras = [...waterExtra(state, p, 1), ...(cduNew ? glycolExtra(state, p) : [])];
    if (own.length > 0) out.push(bundle(state, 'online', 'Bring the hall online', own, extras));
  }
  // Power the other half, once the first has a switchboard (built or being built).
  for (const [half, other] of [['b', 't'], ['t', 'b']]) {
    if (!hasMsb(state, h, half) && hasMsb(state, h, other)) {
      const p = planner(state);
      const own = pieces(p, [`rmu-${h}-${half}`, `xfmr-${h}-${half}-A`, `msb-${h}-${half}-A`]);
      if (own.length > 0) out.push(bundle(state, `half-${half}`, `Power the ${HALF[half]} half`, own, []));
    }
  }
  // Fill the racks: every empty row in a half with a switchboard, and the cooling they need.
  {
    const p = planner(state);
    const rows = [];
    for (const half of ['t', 'b']) if (halfStarted(p, h, half)) rows.push(...[0, 1, 2].map((i) => `row-${h}-${half}-${i}`));
    const own = pieces(p, rows);
    if (own.length > 0) out.push(bundle(state, 'racks', `Fill the racks (${own.length})`, own, coolingExtras(state, p, own.length)));
  }
  // Back up a half's power: its B transformer and switchboard.
  for (const half of ['t', 'b']) {
    if (spotState(state, `msb-${h}-${half}-A`) !== 'empty' && spotState(state, `msb-${h}-${half}-B`) === 'empty') {
      const p = planner(state);
      out.push(bundle(state, `backup-${half}`, `Back up the ${HALF[half]} half's power`, pieces(p, [`xfmr-${h}-${half}-B`, `msb-${h}-${half}-B`]), []));
    }
  }
  // Back up the coolant: the second coolant unit, and a glycol pump if the pumps could not feed it.
  const cdus = ['t', 'b'].filter((half) => spotState(state, `cdu-${h}-${half}`) !== 'empty');
  if (cdus.length === 1) {
    const p = planner(state);
    const own = pieces(p, [`cdu-${h}-${cdus[0] === 't' ? 'b' : 't'}`]);
    out.push(bundle(state, 'coolant', 'Back up the coolant', own, glycolExtra(state, p)));
  }
  return out;
}

/** The card for hall h: { title, cashText, bundles }. */
export function bundleCard(state, h) {
  return { title: `Hall ${h}`, cashText: `Cash ${money(state.cash)}`, bundles: bundlesFor(state, h), online: hallOnline(state, h) };
}

/** One line listing a bundle's pieces, in plain words. */
export function piecesText(state, b) {
  const NAMES = { rmu: 'RMU', xfmr: 'transformer', msb: 'switchboard', cdu: 'coolant unit', row: 'rack row' };
  const counts = new Map();
  for (const id of b.pieces) {
    const type = id.split('-')[0];
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts].map(([t, n]) => `${n > 1 ? `${n} ` : ''}${NAMES[t] ?? t}${n > 1 ? 's' : ''}`).join(', ');
}

/**
 * Buy a bundle: every piece through the build command, or nothing at all. Returns { ok, reason }.
 * 'cash' when the cash does not cover the whole bundle; 'taken' when a piece is no longer empty.
 */
export function buyBundle(state, b) {
  if (!b || b.ids.length === 0) return { ok: false, reason: 'empty' };
  if (state.cash + 1e-9 < b.price) return { ok: false, reason: 'cash' };
  for (const id of b.ids) {
    const why = cannotBuild(state, id);
    if (why && why !== 'cash') return { ok: false, reason: 'taken' };
  }
  for (const id of b.ids) build(state, id);
  return { ok: true };
}

/** Is there any hall whose "Bring the hall online" bundle the cash covers now? (for the introduction) */
export function anyHallAffordable(state) {
  for (let h = 1; h <= 8; h++) {
    if (hallOnline(state, h)) continue;
    const b = bundlesFor(state, h).find((x) => x.key === 'online');
    if (b && b.canBuy) return true;
  }
  return false;
}


/**
 * The hall whose name is under screen point p, or null. Every hall's name is a target, online or
 * not, NAME_TAP_W x NAME_TAP_H px round where the name is drawn, inside the map only.
 */
export function hallNameAt(cam, p) {
  const v = cameraView(cam);
  const r = cam.rect;
  if (p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h) return null;
  for (const h of Object.values(HALLS)) {
    const cx = v.ox + h.cx * v.scale;
    const cy = v.oy + (h.y + NAME_Y) * v.scale;
    if (Math.abs(p.x - cx) <= NAME_TAP_W / 2 && Math.abs(p.y - cy) <= NAME_TAP_H / 2) return h.id;
  }
  return null;
}
