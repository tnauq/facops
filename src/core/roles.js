// Progress and support (pass 9 spec 6, M57). Every build either moves the campus towards the finish
// (progress) or protects what is there (support). It changes no price or rule: with the score as
// compute delivered, progress earns score and support protects it; this says which is which.
//
// Progress: rack rows; the first power path into each half (its RMU, one transformer and one
// switchboard); the first CDU in each hall; and plant equipment up to what the rows need, counting
// the rows built so far and one more hall's worth (the hall being opened). Support: everything else.
// Hires and upgrades are support. A piece bought keeps the role it was bought as (`state.roles`).

import { EQUIPMENT, EQUIPMENT_BY_ID, HALLS } from './layout2.js';
import { buildingOn, hallOnline, isBuilt } from './sites.js';

const TOTAL_ROWS = EQUIPMENT.filter((e) => e.type === 'row').length;
const ROWS_PER_HALL = TOTAL_ROWS / Object.keys(HALLS).length; // as game2.js works it out

/** Bought: built, or a contractor at work on it. */
const owned = (state, id) => Boolean(state.equip[id] && (state.equip[id].built || state.equip[id].buildEnd !== null));
const count = (state, test) => EQUIPMENT.filter((e) => test(e) && owned(state, e.id)).length;

/** Is the split switched on? Building mode. */
export const splitOn = (state) => buildingOn(state) && Boolean(state.config.building.split && state.config.building.split.enabled);

// The side (A or B) carrying a half's power path: the one with a complete path, else the one with any
// piece bought (A first), else none.
function pathSide(state, hall, half) {
  const has = (side, what) => owned(state, `${what}-${hall}-${half}-${side}`);
  for (const side of ['A', 'B']) if (has(side, 'xfmr') && has(side, 'msb')) return side;
  for (const side of ['A', 'B']) if (has(side, 'xfmr') || has(side, 'msb')) return side;
  return null;
}

/** What the rows ask of the plants: chillers, dry coolers, glycol and water pumps, and CDUs (one per hall). */
export function plantNeeds(state) {
  const cfg = state.config.building;
  const rows = count(state, (e) => e.type === 'row');
  const rowsAhead = Math.min(TOTAL_ROWS, rows + (rows < TOTAL_ROWS ? ROWS_PER_HALL : 0));
  const hallsWithRows = Object.keys(HALLS).filter((h) => EQUIPMENT.some((e) => e.type === 'row' && e.hall === Number(h) && owned(state, e.id))).length;
  const halls = Math.min(Object.keys(HALLS).length, hallsWithRows + (hallsWithRows < Object.keys(HALLS).length ? 1 : 0));
  const chillers = Math.ceil((rowsAhead * cfg.chillersPerHall) / ROWS_PER_HALL - 1e-9);
  const p = cfg.pumps;
  return {
    chillers,
    dry: Math.ceil(chillers / cfg.chillersPerDryCooler - 1e-9),
    glycol: Math.max(Math.ceil(halls / p.cdusPerGlycolPump - 1e-9), Math.ceil(chillers / p.chillersPerGlycolPump - 1e-9)),
    water: Math.ceil(halls / p.hallsPerWaterPump - 1e-9),
    cdus: halls,
  };
}

/**
 * 'progress' or 'support' for a piece of equipment (or 'hire' / 'upgrade', always support). A piece
 * already bought keeps its recorded role; one not yet bought is judged on the campus as it stands.
 */
export function buildRole(state, id) {
  if (id === 'hire' || id === 'upgrade') return 'support';
  if (state.roles && state.roles[id]) return liveRole(state, id, state.roles[id]);
  return judge(state, id);
}

// A bought backup that turns out to be what keeps rows running (its partner was never built) counts
// as progress from then on.
function liveRole(state, id, recorded) {
  if (recorded === 'progress') return 'progress';
  const e = EQUIPMENT_BY_ID[id];
  if ((e.type === 'xfmr' || e.type === 'msb') && pathSide(state, e.hall, e.half) === e.side) return 'progress';
  if (e.type === 'cdu' && !owned(state, `cdu-${e.hall}-${e.half === 't' ? 'b' : 't'}`)) return 'progress';
  return 'support';
}

function judge(state, id) {
  const e = EQUIPMENT_BY_ID[id];
  if (!e) return 'support';
  if (e.type === 'row' || e.type === 'rmu') return 'progress';
  if (e.type === 'xfmr' || e.type === 'msb') {
    const side = pathSide(state, e.hall, e.half);
    return side === null || side === e.side ? 'progress' : 'support';
  }
  if (e.type === 'cdu') return owned(state, `cdu-${e.hall}-${e.half === 't' ? 'b' : 't'}`) ? 'support' : 'progress';
  const need = plantNeeds(state);
  if (e.type === 'chiller') return count(state, (x) => x.type === 'chiller') < need.chillers ? 'progress' : 'support';
  if (e.type === 'dry') return count(state, (x) => x.type === 'dry') < need.dry ? 'progress' : 'support';
  if (e.type === 'pump') return count(state, (x) => x.type === 'pump' && x.loop === e.loop) < need[e.loop] ? 'progress' : 'support';
  return 'support';
}

/** Record a purchase's role and what it cost (game2.js build, hire and upgrade call this). */
export function recordSpend(state, id, price) {
  const role = buildRole(state, id);
  if (id !== 'hire' && id !== 'upgrade') {
    state.roles ??= {};
    state.roles[id] = role;
  }
  const st = state.stats;
  if (role === 'progress') st.spentProgress = (st.spentProgress ?? 0) + price;
  else st.spentSupport = (st.spentSupport ?? 0) + price;
  return role;
}

/** The progress meter: rack rows built in online halls, how many of them at full output, of all rows. */
export function progressMeter(state) {
  const rows = EQUIPMENT.filter((e) => e.type === 'row' && isBuilt(state, e.id) && hallOnline(state, e.hall));
  const full = rows.filter((r) => state.equip[r.id].level >= 1 - 1e-6).length;
  return { built: rows.length, full, of: TOTAL_ROWS };
}
