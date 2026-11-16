// The pumps' supply (pass 6 spec 4.1, M39): glycol to CDUs, water to halls, farthest first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, createGame, pumpNeeds, raiseAlarm, step, supply, glycolFed, waterFed } from '../src/core/index2.js';
import { HALLS } from '../src/core/layout2.js';
import { rowStatus, inspectInfo } from '../src/ui/inspect.js';
import { equipmentStatus, hallPlate } from '../src/ui/view2.js';
import { EQUIPMENT_BY_ID } from '../src/core/index2.js';
const equipStatus = (s, id) => equipmentStatus(s)(EQUIPMENT_BY_ID[id]);
import { coolingShield, liquidShield } from '../src/core/game2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0.15, wages: 0 };
const game = (building = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, building: { enabled: true, startCash: 20000, burn: NO_BURN, ...building } },
});

// Mark pieces built and halls online directly: these tests are about the supply rule, not building.
function setUp(s, { built = [], halls = [], stopped = [] } = {}) {
  for (const id of built) s.equip[id].built = true;
  for (const h of halls) s.hallsUp[h] = true;
  s.halls = Object.values(s.hallsUp).filter(Boolean).length;
  for (const id of stopped) s.equip[id].overpressure = true;
  return s;
}
const cdusOf = (halls) => halls.flatMap((h) => [`cdu-${h}-t`, `cdu-${h}-b`]);

test('the start has enough of both pumps', () => {
  const s = game();
  const sup = supply(s);
  assert.equal(sup.dryCdus.size, 0);
  assert.equal(sup.dryHalls.size, 0);
  assert.deepEqual([sup.glycol.A, sup.glycol.B, sup.water.A, sup.water.B], [2, 0, 1, 0]);
});

test('too many CDUs for the glycol pumps: the farthest go dry, the bottom before the top', () => {
  // Two glycol pumps feed 4 CDUs; build 5 (halls 1, 2 and the top of 3).
  const s = setUp(game(), { built: [...cdusOf([1, 2]), 'cdu-3-t'] });
  assert.deepEqual([...supply(s).dryCdus], ['cdu-3-t']);
  setUp(s, { built: ['cdu-3-b'] });
  assert.deepEqual([...supply(s).dryCdus].sort(), ['cdu-3-b', 'cdu-3-t']);
  // One pump down: only Hall 1's pair is fed, and Hall 3's bottom CDU is first in line to go.
  setUp(s, { stopped: ['gpump-A-1'] });
  assert.deepEqual([...supply(s).dryCdus].sort(), ['cdu-2-b', 'cdu-2-t', 'cdu-3-b', 'cdu-3-t']);
});

test('with both plants pumping, halls 4 and 5 go first; a tie goes to the higher hall', () => {
  // Owner, 16 Nov: halls 4 and 5 are farthest from both plants.
  assert.equal(Math.abs(HALLS[4].cx - 260), Math.abs(HALLS[5].cx - 3660), 'the layout makes 4 and 5 a tie');
  const all = [1, 2, 3, 4, 5, 6, 7, 8];
  const s = setUp(game(), { built: [...cdusOf(all), 'gpump-A-2', 'gpump-B-0', 'gpump-B-1', 'gpump-B-2', 'gpump-A-3'] });
  // 7 running pumps feed 14 of 16: Hall 5 goes (higher number wins the tie), bottom then top.
  assert.deepEqual([...supply(s).dryCdus].sort(), ['cdu-5-b', 'cdu-5-t']);
  setUp(s, { stopped: ['gpump-A-3'] });
  assert.deepEqual([...supply(s).dryCdus].sort(), ['cdu-4-b', 'cdu-4-t', 'cdu-5-b', 'cdu-5-t']);
});

test('one water pump serves two halls; the third runs at half', () => {
  const s = setUp(game(), { halls: [1, 2, 3] });
  const sup = supply(s);
  assert.deepEqual([...sup.dryHalls], [3]);
  assert.equal(waterFed(s, 3), true, 'glycolFed / waterFed read the supply worked out each step');
  step(s, 0.05);
  assert.equal(waterFed(s, 3), false);
  assert.equal(waterFed(s, 1), true);
  assert.equal(hallPlate(s, 3), '50%');
  assert.equal(hallPlate(s, 1), null);
  setUp(s, { built: ['wpump-A-1'] });
  step(s, 0.05);
  assert.equal(waterFed(s, 3), true);
  assert.equal(hallPlate(s, 3), null);
});

test('a pump in overpressure has stopped; fixing it is a what-if the costs can ask', () => {
  const s = setUp(game(), { built: cdusOf([1, 2]) });
  assert.equal(supply(s).dryCdus.size, 0);
  setUp(s, { stopped: ['gpump-A-0'] });
  assert.equal(supply(s).dryCdus.size, 2);
  assert.equal(supply(s, { fix: 'gpump-A-0' }).dryCdus.size, 0);
  assert.equal(supply(game(), { stop: 'wpump-A-0' }).water.A, 0);
});

test('the supply changes come out as events', () => {
  const s = setUp(game(), { built: [...cdusOf([1, 2]), 'cdu-3-t'], halls: [1, 2, 3] });
  step(s, 0.05);
  const types = s.events.map((e) => e.type);
  assert.ok(s.events.some((e) => e.type === 'cduDry' && e.equipId === 'cdu-3-t'));
  assert.ok(s.events.some((e) => e.type === 'hallDry' && e.hall === 3), types.join(','));
  setUp(s, { built: ['gpump-A-2', 'wpump-A-1'] });
  step(s, 0.05);
  assert.ok(s.events.some((e) => e.type === 'cduWet' && e.equipId === 'cdu-3-t'));
  assert.ok(s.events.some((e) => e.type === 'hallWet' && e.hall === 3));
});

test('pumpNeeds counts both loops', () => {
  const s = setUp(game(), { built: [...cdusOf([1, 2]), 'cdu-3-t'], halls: [1, 2, 3] });
  step(s, 0.05);
  const n = pumpNeeds(s);
  assert.deepEqual(n.glycol, { ...n.glycol, running: 2, neededForCdus: 3, cdus: 5, fed: 4 });
  assert.deepEqual(n.water, { running: 1, needed: 2, halls: 3, served: 2 });
});

test('the screen tells a dry CDU and a hall without water apart', () => {
  const s = setUp(game(), { built: [...cdusOf([1, 2]), 'cdu-3-t'], halls: [1, 2, 3] });
  step(s, 0.05);
  assert.equal(glycolFed(s, 'cdu-3-t'), false);
  assert.equal(equipStatus(s, 'cdu-3-t').dry, true);
  assert.equal(equipStatus(s, 'cdu-1-t').dry, undefined);
  assert.equal(inspectInfo(s, 'cdu-3-t').headline, 'No glycol');
  assert.equal(inspectInfo(s, 'cdu-3-t').lines[0], 'No glycol: too few glycol pumps');
  assert.equal(inspectInfo(s, 'cdu-3-t').lineWarn, true);
  assert.equal(inspectInfo(s, 'cdu-3-t').warn, true);
  assert.equal(liquidShield(s, 3), 'broken', 'all of Hall 3\'s CDUs are dry: shut');
  assert.equal(coolingShield(s), 'broken');
});

test('the classic game never goes dry', () => {
  const s = createGame({ seed: 1, config: { tutorial: false } });
  assert.equal(supply(s).glycol, null);
  assert.equal(glycolFed(s, 'cdu-1-t'), true);
  assert.equal(pumpNeeds(s), null);
});

test('a row in a hall without water says so, and earns at half', () => {
  const s = setUp(game(), { built: ['row-3-t-0', 'cdu-3-t', 'rmu-3-t', 'xfmr-3-t-A', 'msb-3-t-A'], halls: [1, 2, 3] });
  step(s, 0.05);
  const r = rowStatus(s, 'row-3-t-0');
  assert.equal(r.reason, 'No water: too few water pumps (50%)');
  assert.ok(Math.abs(r.earning - s.config.building.income * s.config.building.pumps.noWaterFactor) < 1e-6);
});

test('a hall whose CDUs are all dry says the glycol pumps are short', () => {
  const s = setUp(game(), { built: [...cdusOf([1, 2]), 'cdu-3-t', 'row-3-t-0', 'rmu-3-t', 'xfmr-3-t-A', 'msb-3-t-A', 'wpump-A-1'], halls: [1, 2, 3] });
  step(s, 0.05);
  assert.equal(rowStatus(s, 'row-3-t-0').reason, 'Coolant units dry: too few glycol pumps');
});

test("a water pump's overpressure spreads to the nearest running water pump", () => {
  const s = setUp(game(), { built: ['wpump-A-1', 'wpump-B-0'] });
  raiseAlarm(s, 'pump', 'wpump-A-0');
  advance(s, 120);
  const spread = s.events.find((e) => e.type === 'escalate' && e.effect === 'nextWaterPump');
  assert.ok(spread, 'it spread');
  assert.equal(spread.target, 'wpump-A-1', 'to the pump beside it, not the far plant');
  assert.ok(!s.events.some((e) => e.type === 'escalate' && e.equipId === 'wpump-A-0' && e.effect !== 'nextWaterPump'), 'no leaks: water does not reach the CDUs');
});

test('mercy: the director only stops a pump its loop can spare', async () => {
  const { eligibleEquipment } = await import('../src/core/index2.js');
  // Two halls online so the director may pick pumps; the start's 2 glycol + 1 water pump.
  const s = setUp(game(), { built: cdusOf([1, 2]), halls: [1, 2] });
  step(s, 0.05);
  const ids = () => eligibleEquipment(s, 'pump').map((e) => e.id).sort();
  assert.deepEqual(ids(), [], 'every pump is needed: 4 CDUs on 2 glycol pumps, 2 halls on 1 water pump');
  setUp(s, { built: ['gpump-A-2', 'wpump-A-1'] });
  step(s, 0.05);
  assert.deepEqual(ids(), ['gpump-A-0', 'gpump-A-1', 'gpump-A-2', 'wpump-A-0', 'wpump-A-1'], 'with one spare of each, any of them');
});

test('the results count what went dry, and the card says so only when it happened', async () => {
  const { results } = await import('../src/core/index2.js');
  const { pumpsShortText, resultsPanel } = await import('../src/ui/results.js');
  const clean = results(game());
  assert.equal(clean.cdusEverDry, 0);
  assert.equal(clean.hallsEverDry, 0);
  const s = setUp(game(), { built: [...cdusOf([1, 2]), 'cdu-3-t'], halls: [1, 2, 3] });
  advance(s, 2);
  const r = results(s);
  assert.equal(r.cdusEverDry, 1);
  assert.equal(r.hallsEverDry, 1);
  assert.ok(r.dryCduSeconds > 1.5 && r.dryHallSeconds > 1.5);
  assert.equal(pumpsShortText(r), '1 CDU without glycol, 1 hall without water');
  const record = { isNew: true, best: { score: 0, seconds: 0 } };
  const fmt = (x) => String(Math.round(x));
  assert.ok(resultsPanel(r, record, fmt).lines.some(([k]) => k === 'Pumps short'));
  assert.ok(!resultsPanel(clean, record, fmt).lines.some(([k]) => k === 'Pumps short'));
});

test('the build card warns when a new hall would be short of water', async () => {
  const { spotInfo } = await import('../src/ui/spots.js');
  // Two halls online on the start's one water pump: a third needs another pump.
  const s = setUp(game(), { halls: [1, 2] });
  step(s, 0.05);
  const card = spotInfo(s, 'msb-3-t-A');
  assert.equal(card.line, 'A new hall needs a water pump: 3 halls, 2 served');
  assert.equal(card.warn, true);
  setUp(s, { built: ['wpump-A-1'] });
  step(s, 0.05);
  assert.notEqual(spotInfo(s, 'msb-3-t-A').line, 'A new hall needs a water pump: 3 halls, 2 served');
});

test('the pump card counts in good English', () => {
  const s = game();
  step(s, 0.05);
  assert.match(inspectInfo(s, 'wpump-A-0').lines[1], /^1 water pump running, 1 needed · /);
  assert.match(inspectInfo(s, 'gpump-A-0').lines[1], /^2 glycol pumps running, 1 needed · /);
});

test("a dry CDU breaks its hall's coolant shield even while its partner carries the hall", () => {
  // 7 CDUs on 3 glycol pumps (6 fed): Hall 4 is farthest, so its bottom CDU is dry and its top fed.
  const s = setUp(game(), { built: [...cdusOf([1, 2, 4]), 'cdu-3-t', 'gpump-A-2'], halls: [1, 2, 3, 4] });
  step(s, 0.05);
  assert.deepEqual([...s.supply.dryCdus], ['cdu-4-b']);
  assert.equal(liquidShield(s, 4), 'broken');
  assert.equal(liquidShield(s, 1), 'whole', 'a hall with both CDUs fed');
  // Another pump: the shield mends the moment enough pumps run.
  setUp(s, { built: ['gpump-A-3'] });
  step(s, 0.05);
  assert.equal(liquidShield(s, 4), 'whole');
});

test('an overpressure ticket shows what the stopped pump costs', async () => {
  const { alarmCost } = await import('../src/core/cost.js');
  const s = game();
  advance(s, 12);
  // Hall 1 earns; its one water pump stopping halves it (only a script can do this: mercy).
  const a = raiseAlarm(s, 'pump', 'wpump-A-0');
  step(s, 0.05);
  assert.equal(s.supply.dryHalls.size, 1);
  assert.ok(alarmCost(s, a) > 0, `cost ${alarmCost(s, a)}`);
  // A spare pump's stop costs nothing.
  const t = game();
  advance(t, 12);
  const b = raiseAlarm(t, 'pump', 'gpump-A-1');
  step(t, 0.05);
  assert.equal(t.supply.dryCdus.size, 0);
  assert.equal(alarmCost(t, b), 0);
});
