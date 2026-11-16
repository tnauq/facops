// Empty spots and the build card (pass 4 spec 3.1, 3.2). Pure.
//
// In building mode every device spot that is not built yet shows as a pale outline with a "+". Tap
// one to open the build card: what goes there, its price, one line on what it does, and Build. Tap
// Build, or the same spot again, to buy it. The card names the device, so the map needs no captions.

import {
  EQUIPMENT, EQUIPMENT_BY_ID, buildingOn, cannotBuild, chillersNeeded, hallOnline, isBuilt, msbFed, onlineRows, plantHasPump,
  priceOf, runningChillers, spotState,
} from '../core/index2.js';
import { cameraView } from './camera.js';

// Half sizes of each device in world units (as src/render/campus2.js and outdoor.js draw them),
// for tap areas. Dry cooler units carry their own size.
const EXTENT = { row: [24, 75], chiller: [52, 40], pump: [42, 34], cdu: [26, 30], msb: [34, 30], xfmr: [36, 30], rmu: [28, 22] };
export const extentOf = (e) => (e.type === 'dry' ? [e.w / 2, e.h / 2] : EXTENT[e.type]);
export const SPOT_MIN = 44; // px: every spot is at least a 44 x 44 tap target

const HALF = { t: 'top', b: 'bottom' };
const other = (id, a, b) => (id.endsWith(a) ? id.slice(0, -a.length) + b : id.slice(0, -b.length) + a);

/**
 * Spots not built yet: [{ id, type, x, y, state: 'empty' | 'building', progress, affordable }].
 * affordable (pass 5 spec 7.2): the cash covers the price, so the "+" is drawn solid.
 */
export function spotsModel(state) {
  if (!buildingOn(state)) return [];
  const out = [];
  for (const e of EQUIPMENT) {
    const st = spotState(state, e.id);
    if (st === 'built') continue;
    const progress = st === 'building' ? 1 - Math.max(0, state.equip[e.id].buildEnd - state.t) / state.config.building.buildTime : 0;
    out.push({ id: e.id, type: e.type, x: e.x, y: e.y, state: st, progress: Math.min(1, progress), affordable: state.cash + 1e-9 >= priceOf(state, e.id) });
  }
  return out;
}

/** Screen rectangles of the empty spots inside the map (at least 44 x 44 px). */
export function spotTargets(state, cam) {
  const v = cameraView(cam);
  return spotsModel(state)
    .filter((s) => s.state === 'empty')
    .map((s) => {
      const [hw, hh] = extentOf(EQUIPMENT_BY_ID[s.id]);
      const w = Math.max(SPOT_MIN, 2 * hw * v.scale);
      const h = Math.max(SPOT_MIN, 2 * hh * v.scale);
      const cx = v.ox + s.x * v.scale;
      const cy = v.oy + s.y * v.scale;
      return { id: s.id, x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
    })
    .filter((r) => r.cx >= cam.rect.x && r.cx <= cam.rect.x + cam.rect.w && r.cy >= cam.rect.y && r.cy <= cam.rect.y + cam.rect.h);
}

/** The empty spot under screen point p, or null. The smallest wins where two overlap. */
export function spotAt(state, cam, p) {
  const hits = spotTargets(state, cam).filter((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  hits.sort((a, b) => a.w * a.h - b.w * b.h);
  return hits[0] ?? null;
}

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

// One line on what the device would do here, given what is built (spec 3.2).
function whatItDoes(state, e) {
  const hallName = e.hall ? `Hall ${e.hall}` : '';
  switch (e.type) {
    case 'row': {
      if (!hallOnline(state, e.hall)) return { line: `Earns once ${hallName} has a switchboard and a coolant unit`, warn: true };
      const msbs = ['A', 'B'].map((s) => `msb-${e.hall}-${e.half}-${s}`);
      if (!msbs.some((id) => isBuilt(state, id) && msbFed(state, id))) return { line: `Needs a switchboard in this half to earn`, warn: true };
      const needed = Math.ceil(((onlineRows(state).length + 1) * state.config.building.chillersPerHall) / 6 - 1e-9);
      if (needed > runningChillers(state) && needed > chillersNeeded(state)) return { line: 'Cooling will run short: build a chiller too', warn: true };
      return { line: `3 racks: earns ${money(state.config.building.income)}/s`, warn: false };
    }
    case 'msb': {
      const partner = other(e.id, '-A', '-B');
      // M29: a switchboard needs its transformer and RMU.
      if (!isBuilt(state, `xfmr-${e.id.slice(4)}`) || !isBuilt(state, `rmu-${e.hall}-${e.half}`)) {
        return { line: `Needs its transformer and RMU outside to work`, warn: true };
      }
      return isBuilt(state, partner)
        ? { line: `Backup: keeps ${hallName}'s ${HALF[e.half]} half lit if the other trips`, warn: false }
        : { line: `Powers ${hallName}'s ${HALF[e.half]} half`, warn: false };
    }
    case 'cdu': {
      const partner = `cdu-${e.hall}-${e.half === 't' ? 'b' : 't'}`;
      return isBuilt(state, partner)
        ? { line: `Backup: keeps ${hallName} cool if the other leaks`, warn: false }
        : { line: `Cools ${hallName}'s racks`, warn: false };
    }
    case 'chiller':
      return plantHasPump(state, e.plant)
        ? { line: "Cools a hall's worth of racks", warn: false }
        : { line: `Needs a pump at Plant ${e.plant} to run`, warn: true };
    case 'xfmr': {
      if (!isBuilt(state, `rmu-${e.hall}-${e.half}`)) return { line: `Needs ${hallName}'s ${HALF[e.half]} RMU to work`, warn: true };
      return { line: `Feeds Switchboard ${e.side} of ${hallName}'s ${HALF[e.half]} half`, warn: false };
    }
    case 'rmu':
      return { line: `Feeds ${hallName}'s ${HALF[e.half]} transformers from the power line`, warn: false };
    case 'dry':
      return { line: `Lets ${state.config.building.chillersPerDryCooler} of Plant ${e.plant}'s chillers run`, warn: false };
    case 'pump': {
      // Pass 6 (M38): two kinds. Glycol pumps run their plant's chillers (in M38, any one does);
      // water pumps will serve two halls each once M39's rules are in.
      if (e.loop === 'water') return { line: "Water pump: serves two halls from the next update", warn: false };
      const others = EQUIPMENT.filter((q) => q.type === 'pump' && q.loop === 'glycol' && q.plant === e.plant && q.id !== e.id && isBuilt(state, q.id));
      return others.length > 0
        ? { line: `Spare glycol pump for Plant ${e.plant}`, warn: false }
        : { line: `Glycol pump: runs Plant ${e.plant}'s chillers`, warn: false };
    }
    default:
      return { line: '', warn: false };
  }
}

const NAMES = { row: 'Rack row', chiller: 'Chiller', pump: 'Pump', cdu: 'Coolant unit', rmu: 'RMU', dry: 'Dry cooler' };
const nameOf = (e) => (e.type === 'msb' ? `Switchboard ${e.side}` : e.type === 'xfmr' ? `Transformer ${e.side}` : e.type === 'pump' ? (e.loop === 'water' ? 'Water pump' : 'Glycol pump') : NAMES[e.type]);

/**
 * What the build card shows for a spot: { id, type, name, price, priceText, line, warn, upkeep,
 * canBuild, button } where button is "Build" or "Need $80 more".
 */
export function spotInfo(state, id) {
  const e = EQUIPMENT_BY_ID[id];
  const price = priceOf(state, id);
  const reason = cannotBuild(state, id);
  const { line, warn } = whatItDoes(state, e);
  // Infrastructure costs upkeep and earns nothing (spec 2.5): say so, so a backup is a choice.
  const upkeep = e.type === 'row' ? '' : `+$${state.config.building.burn.upkeep.toFixed(2)}/s upkeep`;
  return {
    id,
    type: e.type,
    name: nameOf(e),
    price,
    priceText: money(price),
    line,
    warn,
    upkeep,
    canBuild: reason === null,
    button: reason === 'cash' ? `Need ${money(price - state.cash)} more` : 'Build',
  };
}

export const CARD = { w: 236, h: 104, pad: 10, button: 44 };

/**
 * Where the build card goes for a spot at screen (sx, sy): beside it, inside the map region `rect`.
 * Returns { x, y, w, h, button: { x, y, w, h } }.
 */
export function cardLayout(rect, sx, sy) {
  const w = Math.min(CARD.w, rect.w - 16);
  const h = CARD.h;
  const GAP = 34; // clear of the spot's "+" badge
  const left = rect.x + 8;
  const right = rect.x + rect.w - 8;
  const top = rect.y + 8;
  const bottom = rect.y + rect.h - 8;
  let x;
  let y;
  if (sx + GAP + w <= right) x = sx + GAP; // to the right of the spot...
  else if (sx - GAP - w >= left) x = sx - GAP - w; // ...or to the left
  if (x !== undefined) y = Math.max(top, Math.min(sy - h / 2, bottom - h)); // centred on it
  else {
    // Neither side fits (a narrow map): above the spot, or below it.
    x = Math.max(left, Math.min(sx - w / 2, right - w));
    y = sy - GAP - h >= top ? sy - GAP - h : Math.min(sy + GAP, bottom - h);
  }
  const bw = 96;
  return { x, y, w, h, button: { x: x + w - bw - CARD.pad, y: y + h - CARD.button - 8, w: bw, h: CARD.button } };
}
