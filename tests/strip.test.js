// The campus overview strip (pass 3 spec, section 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING, HALLS, START_POINT, WORLD, advance, createGame, raiseAlarm } from '../src/core/index2.js';
import { centreOn, createCamera, passOneScale } from '../src/ui/camera.js';
import { regions } from '../src/ui/regions.js';
import { STRIP_HEIGHT, inStripTarget, regions3, stripModel, stripTarget, stripX, worldXAt } from '../src/ui/strip.js';

// Games staged by hand: no director alarms, and (pass 4 M23) no techs heading off on their own.
const quiet = (config = {}) => createGame({ seed: 1, config: { autoDispatch: { enabled: false }, ...config, director: { enabled: false } } });
const camFor = (W, H) => {
  const r = regions3(W, H);
  return createCamera(r.map, passOneScale(regions(W, H).map), WORLD, START_POINT);
};

for (const [W, H] of [[844, 390], [660, 300]]) {
  test(`at ${W} x ${H} the strip sits under a 30 px shorter map, as wide as it, with a 44 px tap area`, () => {
    const old = regions(W, H).map;
    const r = regions3(W, H);
    assert.equal(r.map.h, old.h - 30);
    assert.deepEqual([r.strip.x, r.strip.w, r.strip.h], [old.x, old.w, STRIP_HEIGHT]);
    assert.equal(r.strip.y + r.strip.h, old.y + old.h); // ends where pass 2's map ended
    assert.ok(r.strip.y >= r.map.y + r.map.h);
    assert.equal(stripTarget(r.strip).h, 44);
    assert.ok(inStripTarget(r.strip, { x: r.strip.x + 10, y: r.strip.y - 15 }));
    assert.ok(!inStripTarget(r.strip, { x: r.strip.x + 10, y: r.strip.y - 20 }));
  });
}

test('the zoom does not change: still pass 1\'s', () => {
  const cam = camFor(844, 390);
  assert.ok(Math.abs(cam.scale - 0.656) < 0.001);
});

test('the strip is true to width: every hall where it is in the building, and taps map back', () => {
  const { strip } = regions3(844, 390);
  const m = stripModel(quiet(), strip, camFor(844, 390));
  assert.equal(m.halls.length, 8);
  for (const h of m.halls) {
    assert.ok(Math.abs(h.x - stripX(strip, HALLS[h.id].x)) < 1e-9);
    assert.ok(h.x >= strip.x && h.x + h.w <= strip.x + strip.w);
  }
  assert.ok(Math.abs(worldXAt(strip, stripX(strip, HALLS[5].cx)) - HALLS[5].cx) < 1e-6);
  // Pass 6 (M38): the strip runs wall to wall, past the plants' pump rooms.
  assert.equal(worldXAt(strip, strip.x - 50), BUILDING.x1);
  assert.equal(worldXAt(strip, strip.x + strip.w + 50), BUILDING.x2);
});

test('online halls carry their shields; offline halls and Plant B before hall 6 are marked offline', () => {
  const s = quiet({ startHalls: 3 });
  raiseAlarm(s, 'breaker', 'msb-2-t-A');
  raiseAlarm(s, 'leak', 'cdu-3-t');
  raiseAlarm(s, 'leak', 'cdu-3-b');
  const { strip } = regions3(844, 390);
  const m = stripModel(s, strip, camFor(844, 390));
  assert.deepEqual(m.halls.slice(0, 4).map((h) => [h.online, h.power, h.liquid]), [
    [true, 'whole', 'whole'],
    [true, 'cracked', 'whole'],
    [true, 'whole', 'broken'],
    [false, null, null],
  ]);
  assert.deepEqual(m.plants.map((p) => p.online), [true, false]);
  assert.equal(m.cooling.spare, 4);
});

test('a dot for every alarm (marked when it costs something) and every tech, inside the strip', () => {
  const s = quiet({ startHalls: 2 });
  raiseAlarm(s, 'network', 'row-2-b-1');
  raiseAlarm(s, 'breaker', 'msb-1-t-A');
  advance(s, 1);
  const { strip } = regions3(844, 390);
  const m = stripModel(s, strip, camFor(844, 390));
  assert.deepEqual(m.alarms.map((a) => a.costly).sort(), [false, true]);
  assert.equal(m.techs.length, s.techs.length);
  for (const d of [...m.alarms, ...m.techs]) {
    assert.ok(d.x >= strip.x && d.x <= strip.x + strip.w);
    assert.ok(d.y >= strip.y && d.y <= strip.y + strip.h);
  }
});

test('the frame shows what the map shows, and follows the camera', () => {
  const { strip } = regions3(844, 390);
  let cam = camFor(844, 390);
  let f = stripModel(quiet(), strip, cam).frame;
  // The run starts near the left end: the view stays on the building, which (pass 6) starts at its
  // west wall, past the pump rooms.
  const left = Math.max(BUILDING.x1, cam.x);
  assert.ok(Math.abs(f.x - stripX(strip, left)) < 1e-9);
  const right = Math.min(BUILDING.x2, cam.x + cam.rect.w / cam.scale);
  assert.ok(Math.abs(f.w / strip.w - (right - left) / (BUILDING.x2 - BUILDING.x1)) < 1e-9);
  cam = centreOn(cam, HALLS[6].cx, 390);
  f = stripModel(quiet(), strip, cam).frame;
  const mid = worldXAt(strip, f.x + f.w / 2);
  assert.ok(Math.abs(mid - HALLS[6].cx) < 1, `${mid}`);
});

test('looking past the walls, the strip frame stays on the building (pass 3 spec 4b.3)', async () => {
  const { createCamera, panBy, siteOf } = await import('../src/ui/camera.js');
  const { createGame, WORLD } = await import('../src/core/index2.js');
  const { regions3, stripModel } = await import('../src/ui/strip.js');
  const regs = regions3(844, 390);
  const cam = panBy(createCamera(regs.map, 0.5, siteOf(WORLD)), 1e6, 0);
  const m = stripModel(createGame({ seed: 1 }), regs.strip, cam);
  assert.equal(m.frame.x, regs.strip.x);
  assert.ok(m.frame.w > 0 && m.frame.x + m.frame.w <= regs.strip.x + regs.strip.w);
});
