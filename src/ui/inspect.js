// The inspect card (pass 5 spec 7.1, M36). Pure: it reads the rules' state and says, in a few words,
// what a built device is doing. A rack row says what it earns now, or the one reason it does not, in
// the order the rules check; infrastructure says what it feeds, what feeds it, whether it has a
// backup, its upkeep and its state.

import {
  EQUIPMENT_BY_ID, coolantState, glycolFed, pumpNeeds, waterFed, chillersNeeded, dryCapacity, getAlarm, hallOnline, isBuilt, msbFed, plantHasPump, runningChillers, uptimeOnTrack,
} from '../core/index2.js';
import { cameraView } from './camera.js';
import { warningLine } from './warningsView.js';
import { extentOf, SPOT_MIN } from './spots.js';

const HALF = { t: 'top', b: 'bottom' };
const LINE = { t: 'north', b: 'south' }; // the top half's RMU hangs off the north power line
const otherSide = (side) => (side === 'A' ? 'B' : 'A');
const otherHalf = (half) => (half === 't' ? 'b' : 't');
const dollars = (n) => `$${n.toFixed(2)}/s`;
const pct = (f) => `${Math.round(f * 100)}%`;

// ---------------------------------------------------------------- what is under the finger

/** The built device under screen point p (building mode), or null. The smallest wins. */
export function deviceAt(state, cam, p) {
  const v = cameraView(cam);
  const hits = [];
  for (const [id, dyn] of Object.entries(state.equip)) {
    if (!dyn.built) continue;
    const e = EQUIPMENT_BY_ID[id];
    const [hw, hh] = extentOf(e);
    const w = Math.max(SPOT_MIN, 2 * hw * v.scale);
    const h = Math.max(SPOT_MIN, 2 * hh * v.scale);
    const cx = v.ox + e.x * v.scale;
    const cy = v.oy + e.y * v.scale;
    if (Math.abs(p.x - cx) <= w / 2 && Math.abs(p.y - cy) <= h / 2) hits.push({ id, area: w * h });
  }
  hits.sort((a, b) => a.area - b.area);
  return hits[0] ? hits[0].id : null;
}

// ---------------------------------------------------------------- rack rows

// Why a half has no power, naming the first broken link of its switchboards' chains.
function noPowerReason(state, hall, half) {
  const msbs = ['A', 'B'].map((s) => `msb-${hall}-${half}-${s}`).filter((id) => isBuilt(state, id));
  const rmu = `rmu-${hall}-${half}`;
  if (isBuilt(state, rmu) && state.equip[rmu].faulted) return 'No power: the RMU outside has a fault';
  const backup = msbs.length > 1 ? 'both' : 'no backup';
  const one = msbs.length === 1 ? msbs[0].slice(-1) : null;
  for (const id of msbs) {
    const x = `xfmr-${id.slice(4)}`;
    if (isBuilt(state, x) && state.equip[x].shorted) return one ? `No power: transformer ${one} shorted, no backup` : 'No power: both sides are down';
  }
  if (msbs.every((id) => !msbFed(state, id) && !state.equip[id].tripped)) return one ? `No power: switchboard ${one} needs its transformer and RMU` : 'No power: no transformer feeds this half';
  if (one) return `No power: switchboard ${one} tripped, no backup`;
  return `No power: ${backup} switchboards are down`;
}

/**
 * A rack row: { earning, reason } where earning is its income now in dollars a second and reason is
 * the one thing holding it back ('' when it earns in full). The order is the rules' (rowTarget,
 * then cooling): the hall, power, coolant, network, then the chillers.
 */
export function rowStatus(state, id) {
  const e = EQUIPMENT_BY_ID[id];
  const dyn = state.equip[id];
  const income = state.config.building.income;
  const earning = hallOnline(state, e.hall) ? dyn.level * state.thermal * income : 0;
  if (!hallOnline(state, e.hall)) return { earning: 0, reason: `Hall ${e.hall} is not online: it needs a switchboard and a coolant unit` };
  if (state.halfDark[`${e.hall}-${e.half}`]) return { earning, reason: noPowerReason(state, e.hall, e.half) };
  const c = coolantState(state, e.hall);
  const cdus = ['t', 'b'].map((h) => `cdu-${e.hall}-${h}`).filter((id) => isBuilt(state, id));
  // Pass 6 (M39): the glycol pumps can leave a hall's coolant units dry.
  if (c === 'shut' && cdus.length > 0 && cdus.every((id) => !glycolFed(state, id))) return { earning, reason: 'Coolant units dry: too few glycol pumps' };
  if (c === 'shut') return { earning, reason: 'Coolant units down: the hall is shut' };
  if (dyn.netDown) return { earning, reason: 'Network failure' };
  if (c === 'throttled') return { earning, reason: `Coolant unit leaking: hall at ${pct(state.config.leakThrottle)}` };
  if (!waterFed(state, e.hall)) return { earning, reason: `No water: too few water pumps (${pct(state.config.building.pumps.noWaterFactor)})` };
  if (state.thermal < 1 - 1e-6) {
    const stopped = runningChillers(state) < chillersNeeded(state) && chillerDown(state);
    return { earning, reason: stopped ? `Cooling short: a chiller is down (${pct(state.thermal)})` : `Cooling short: build a chiller (${pct(state.thermal)})` };
  }
  if (dyn.level < 1 - 1e-6) return { earning, reason: 'Powering up' };
  return { earning, reason: '' };
}

// A built chiller that is not running, or one held back by its pump or dry coolers.
function chillerDown(state) {
  return Object.entries(state.equip).some(([id, d]) => {
    const e = EQUIPMENT_BY_ID[id];
    return e.type === 'chiller' && d.built && (!d.running || !plantHasPump(state, e.plant));
  }) || ['A', 'B'].some((p) => dryCapacity(state, p) < chillersAt(state, p));
}
const chillersAt = (state, plant) => Object.entries(state.equip).filter(([id, d]) => d.built && EQUIPMENT_BY_ID[id].type === 'chiller' && EQUIPMENT_BY_ID[id].plant === plant).length;

// ---------------------------------------------------------------- infrastructure

// "the only one" or "backup" for a device with a partner of the same kind.
const pairText = (state, partner, what) => (isBuilt(state, partner) ? `One of two ${what}: the other is the backup` : `The only ${what.replace(/s$/, '')}: no backup`);

const alarmOn = (state, id) => getAlarm(state, state.equip[id].alarmId) ?? null;

/** { feeds, role, state, warn } for a piece of infrastructure. */
export function infraStatus(state, id) {
  const e = EQUIPMENT_BY_ID[id];
  const d = state.equip[id];
  const hall = e.hall ? `Hall ${e.hall}'s ${HALF[e.half]}` : '';
  switch (e.type) {
    case 'msb': {
      const fed = msbFed(state, id);
      const partner = `msb-${e.hall}-${e.half}-${otherSide(e.side)}`;
      const st = d.tripped ? 'Tripped' : !fed ? 'No power from its transformer' : 'Working';
      return { feeds: `Feeds ${hall} half · fed by transformer ${e.side} outside`, role: pairText(state, partner, 'switchboards'), state: st, warn: st !== 'Working' };
    }
    case 'xfmr': {
      const partner = `xfmr-${e.hall}-${e.half}-${otherSide(e.side)}`;
      const short = alarmOn(state, id);
      const st = d.shorted ? (short && short.stage !== 'disconnect' ? 'Shorted: disconnected, waiting for repair' : 'Shorted') : 'Working';
      return { feeds: `Feeds switchboard ${e.side} of ${hall} half · fed by its RMU`, role: pairText(state, partner, 'transformers'), state: st, warn: st !== 'Working' };
    }
    case 'rmu': {
      const st = d.faulted ? 'Fault: the half is dark' : 'Working';
      return { feeds: `Feeds ${hall} transformers · fed by the ${LINE[e.half]} power line`, role: 'The only one: a fault darkens the half, backups or not', state: st, warn: Boolean(d.faulted) };
    }
    case 'cdu': {
      const partner = `cdu-${e.hall}-${otherHalf(e.half)}`;
      const role = pairText(state, partner, 'coolant units');
      // Pass 6 (M39): the headline has room for two words, so the reason goes on the first line.
      if (!glycolFed(state, id)) return { feeds: 'No glycol: too few glycol pumps', role, state: 'No glycol', warn: true, lineWarn: true };
      const st = d.shut ? 'Shut after a leak' : d.leaking ? 'Leaking' : 'Working';
      return { feeds: `Cools Hall ${e.hall}'s racks · fed by the plants' chilled water`, role, state: st, warn: st !== 'Working' };
    }
    case 'chiller': {
      const running = runningChillers(state);
      const needed = chillersNeeded(state);
      const st = !d.running ? 'Tripped' : !plantHasPump(state, e.plant) ? `Waiting for a pump at Plant ${e.plant}` : 'Working';
      const spare = running - needed;
      const role = `${running} running, ${needed} needed${spare > 0 ? `: ${spare} spare` : spare < 0 ? `: ${-spare} short` : ': no spare'}`;
      return { feeds: `Cools a hall's worth of racks · runs on Plant ${e.plant}'s pumps and dry coolers`, role, state: st, warn: st !== 'Working' || spare < 0 };
    }
    case 'pump': {
      // Pass 6 (M39): what each kind carries, and how the loop stands.
      const per = state.config.building.pumps;
      const st = d.overpressure ? 'Overpressure: stopped' : 'Working';
      const n = pumpNeeds(state);
      if (e.loop === 'water') {
        return { feeds: `Serves ${per.hallsPerWaterPump} halls · ${n.water.served} of ${n.water.halls} halls served`, role: `${n.water.running} water ${n.water.running === 1 ? 'pump' : 'pumps'} running, ${n.water.needed} needed`, state: st, warn: st !== 'Working' || n.water.served < n.water.halls };
      }
      return {
        feeds: `Feeds ${per.cdusPerGlycolPump} CDUs and ${per.chillersPerGlycolPump} of Plant ${e.plant}'s chillers · ${n.glycol.fed} of ${n.glycol.cdus} CDUs fed`,
        role: `${n.glycol.running} glycol ${n.glycol.running === 1 ? 'pump' : 'pumps'} running, ${Math.max(n.glycol.neededForCdus, n.glycol.neededForChillers)} needed`,
        state: st,
        warn: st !== 'Working' || n.glycol.fed < n.glycol.cdus,
      };
    }
    case 'dry': {
      const per = state.config.building.chillersPerDryCooler;
      const st = d.stopped ? 'Fan stopped' : 'Working';
      const cap = dryCapacity(state, e.plant);
      const have = chillersAt(state, e.plant);
      return { feeds: `Lets ${per} of Plant ${e.plant}'s chillers run · on its pumps' loop`, role: `Room for ${cap} chillers at Plant ${e.plant}, ${have} built`, state: st, warn: st !== 'Working' };
    }
    default:
      return { feeds: '', role: '', state: '', warn: false };
  }
}

const NAMES = { row: 'Rack row', chiller: 'Chiller', pump: 'Pump', cdu: 'Coolant unit', rmu: 'RMU', dry: 'Dry cooler' };
const pumpName = (e) => (e.loop === 'water' ? 'Water pump' : 'Glycol pump'); // pass 6 M38

/**
 * What the inspect card shows: { id, type, name, side, headline, lines: [text], warn, lineWarn }. headline is
 * the earning or the state, top right; lines are at most three short lines.
 */
export function inspectInfo(state, id) {
  const e = EQUIPMENT_BY_ID[id];
  const name = e.type === 'msb' ? `Switchboard ${e.side}` : e.type === 'xfmr' ? `Transformer ${e.side}` : e.type === 'pump' ? pumpName(e) : NAMES[e.type];
  if (e.type === 'row') {
    const r = rowStatus(state, id);
    const lines = [r.reason || `Earning in full: 3 racks, ${dollars(state.config.building.income)} at full output`];
    // Pass 7 spec 4.1 (M42): whether this row will earn this minute's uptime bonus.
    const track = uptimeOnTrack(state, id);
    if (track !== null) lines.push(track ? 'Uptime bonus: on track' : 'Uptime bonus: missed this minute');
    const warned = warningLine(state, id); // pass 8 (M47)
    if (warned) lines.push(warned);
    return { id, type: e.type, name, side: 'A', headline: dollars(r.earning), lines, warn: r.reason !== '' && r.reason !== 'Powering up', lineWarn: r.reason !== '' && r.reason !== 'Powering up' };
  }
  const s = infraStatus(state, id);
  const upkeep = `Upkeep ${dollars(state.config.building.burn.upkeep)}`;
  const warned = warningLine(state, id); // pass 8 (M47)
  return { id, type: e.type, name, side: e.side ?? 'A', headline: s.state, lines: [s.feeds, `${s.role} · ${upkeep}`, ...(warned ? [warned] : [])], warn: s.warn, lineWarn: Boolean(s.lineWarn) };
}
