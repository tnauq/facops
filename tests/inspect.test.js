// The inspect card, solid and hollow plus marks, and the runway (pass 5 spec 7, M36).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, START_POINT, WORLD, advance, build, createGame, raiseAlarm, step } from '../src/core/index2.js';
import { deviceAt, infraStatus, inspectInfo, rowStatus } from '../src/ui/inspect.js';
import { spotsModel } from '../src/ui/spots.js';
import { moneyModel } from '../src/ui/hud2.js';
import { cameraView, createCamera } from '../src/ui/camera.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0.15, wages: 0 };
const game = (building = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, building: { enabled: true, startCash: 20000, burn: NO_BURN, ...building } },
});
const settle = (s, seconds = 12) => advance(s, seconds);
// Hall 1 top: the start's two rows, made to run in full (a third, its cooling covered).
function running() {
  const s = game();
  settle(s);
  return s;
}

test('a healthy rack row says what it earns', () => {
  const s = running();
  const r = rowStatus(s, 'row-1-t-0');
  assert.equal(r.reason, '');
  assert.ok(Math.abs(r.earning - s.config.building.income) < 1e-6);
  const info = inspectInfo(s, 'row-1-t-0');
  assert.equal(info.headline, '$4.00/s');
  assert.equal(info.warn, false);
});

test('no power: a switchboard tripped with no backup', () => {
  const s = running();
  raiseAlarm(s, 'breaker', 'msb-1-t-A');
  step(s, 0.05);
  assert.equal(rowStatus(s, 'row-1-t-0').reason, 'No power: switchboard A tripped, no backup');
  assert.equal(inspectInfo(s, 'row-1-t-0').warn, true);
});

test('no power: the RMU outside has a fault', () => {
  const s = running();
  raiseAlarm(s, 'rmu', 'rmu-1-t');
  step(s, 0.05);
  assert.equal(rowStatus(s, 'row-1-t-0').reason, 'No power: the RMU outside has a fault');
});

test('no power: the transformer shorted', () => {
  const s = running();
  raiseAlarm(s, 'short', 'xfmr-1-t-A');
  step(s, 0.05);
  assert.equal(rowStatus(s, 'row-1-t-0').reason, 'No power: transformer A shorted, no backup');
});

test('a coolant unit leaking: the hall at 90%', () => {
  const s = running();
  build(s, 'cdu-1-b');
  settle(s, 9);
  raiseAlarm(s, 'leak', 'cdu-1-t');
  step(s, 0.05);
  assert.equal(rowStatus(s, 'row-1-t-0').reason, 'Coolant unit leaking: hall at 90%');
});

test('network failure', () => {
  const s = running();
  raiseAlarm(s, 'network', 'row-1-t-1');
  step(s, 0.05);
  assert.equal(rowStatus(s, 'row-1-t-1').reason, 'Network failure');
  assert.equal(rowStatus(s, 'row-1-t-0').reason, '', 'its neighbour is fine');
});

// Seven rack rows (Hall 1 full, one in Hall 2) need two chillers; the start has one.
function sevenRows(secondChiller) {
  const s = game();
  for (const id of ['row-1-t-2', 'msb-1-b-A', 'xfmr-1-b-A', 'rmu-1-b', 'cdu-1-b']) build(s, id);
  settle(s, 9);
  for (const id of ['row-1-b-0', 'row-1-b-1', 'row-1-b-2', 'msb-2-t-A', 'xfmr-2-t-A', 'rmu-2-t', 'cdu-2-t']) build(s, id);
  settle(s, 9);
  build(s, 'row-2-t-0');
  if (secondChiller) build(s, 'chiller-A-1');
  settle(s, 40);
  return s;
}

test('cooling short: build a chiller, or a chiller is down', () => {
  const short = sevenRows(false);
  assert.match(rowStatus(short, 'row-1-t-0').reason, /^Cooling short: build a chiller \(\d+%\)$/);
  const s = sevenRows(true);
  assert.equal(rowStatus(s, 'row-1-t-0').reason, '', 'two chillers cover seven rows');
  raiseAlarm(s, 'chiller', 'chiller-A-0');
  settle(s, 10);
  assert.match(rowStatus(s, 'row-1-t-0').reason, /^Cooling short: a chiller is down \(\d+%\)$/);
});

test('a row in a hall that is not online', () => {
  const s = game();
  build(s, 'row-2-t-0');
  settle(s, 9);
  assert.equal(rowStatus(s, 'row-2-t-0').reason, 'Hall 2 is not online: it needs a switchboard and a coolant unit');
  assert.equal(rowStatus(s, 'row-2-t-0').earning, 0);
});

test('a B switchboard says it is the backup, what it feeds and its upkeep', () => {
  const s = running();
  build(s, 'xfmr-1-t-B');
  build(s, 'msb-1-t-B');
  settle(s, 9);
  const b = inspectInfo(s, 'msb-1-t-B');
  assert.equal(b.name, 'Switchboard B');
  assert.equal(b.headline, 'Working');
  assert.equal(b.lines[0], "Feeds Hall 1's top half · fed by transformer B outside");
  assert.equal(b.lines[1], 'One of two switchboards: the other is the backup · Upkeep $0.15/s');
  const a = game();
  assert.equal(inspectInfo(a, 'msb-1-t-A').lines[1], 'The only switchboard: no backup · Upkeep $0.15/s');
  raiseAlarm(a, 'breaker', 'msb-1-t-A');
  assert.equal(inspectInfo(a, 'msb-1-t-A').headline, 'Tripped');
  assert.equal(inspectInfo(a, 'msb-1-t-A').warn, true);
});

test('the yard: an RMU is fed by its power line, and its fault darkens the half', () => {
  const s = running();
  assert.equal(infraStatus(s, 'rmu-1-t').feeds, "Feeds Hall 1's top transformers · fed by the north power line");
  raiseAlarm(s, 'rmu', 'rmu-1-t');
  assert.equal(infraStatus(s, 'rmu-1-t').state, 'Fault: the half is dark');
  assert.match(infraStatus(s, 'chiller-A-0').role, /running, \d+ needed/);
  assert.equal(infraStatus(s, 'dry-A-0').feeds, "Lets 2 of Plant A's chillers run · on its pumps' loop");
});

test('tapping a built device finds it; empty spots are not devices', () => {
  const s = running();
  const cam = createCamera({ x: 0, y: 0, w: 800, h: 400 }, 0.6, WORLD, START_POINT);
  let found = 0;
  for (const id of ['row-1-t-0', 'msb-1-t-A', 'cdu-1-t', 'pump-A-t', 'chiller-A-0']) {
    const p = devicePoint(cam, id);
    if (!p) continue;
    assert.equal(deviceAt(s, cam, p), id);
    found += 1;
  }
  assert.ok(found >= 2, `${found} devices in view`);
  const p = devicePoint(cam, 'row-1-t-2');
  if (p) assert.equal(deviceAt(s, cam, p), null, 'an empty spot is not a device');
});

// Screen point of a device for the camera, or null when it is off the view.
function devicePoint(cam, id) {
  const v = cameraView(cam);
  const eq = EQUIPMENT_BY_ID[id];
  const x = v.ox + eq.x * v.scale;
  const y = v.oy + eq.y * v.scale;
  return x >= cam.rect.x && x <= cam.rect.x + cam.rect.w && y >= cam.rect.y && y <= cam.rect.y + cam.rect.h ? { x, y } : null;
}

test('plus marks: solid when the cash covers the price, hollow when not', () => {
  const s = game({ startCash: 200 });
  const spots = spotsModel(s);
  const row = spots.find((x) => x.id === 'row-1-t-2');
  const chiller = spots.find((x) => x.id === 'chiller-A-1');
  assert.equal(row.affordable, true, 'a $150 row with $200');
  assert.equal(chiller.affordable, false, 'a $300 chiller with $200');
  s.cash = 300;
  assert.equal(spotsModel(s).find((x) => x.id === 'chiller-A-1').affordable, true);
});

test('runway: while the cash falls, how long it lasts at this rate; hidden when rising or far off', () => {
  const s = createGame({ seed: 1, config: { tutorial: false, director: { enabled: false }, building: { enabled: true, startCash: 300 } } });
  step(s, 0.05);
  const m = moneyModel(s);
  assert.equal(m.falling, true, 'the loan outruns two racks');
  // $300 at about -$1.9/s lasts under 5:00.
  assert.match(m.runway, /^\d:\d\d$/);
  s.cash = 5000;
  assert.equal(moneyModel(s).runway, null, 'more than 5:00 away');
  const rich = createGame({ seed: 1, config: { tutorial: false, director: { enabled: false }, building: { enabled: true, startCash: 300, burn: NO_BURN } } });
  step(rich, 0.05);
  assert.equal(moneyModel(rich).runway, null, 'rising: no runway');
});
