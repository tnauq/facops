// Layers (pass 8 spec 8.1, M52): the pure helpers behind the Power, Cooling and Crew views.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, postTech, step } from '../src/core/index2.js';
import { refreshSites } from '../src/core/sites.js';
import {
  LAYERS, coolingCounts, coolingLayer, crewLayer, halfPower, layerModel, layersTarget, nearestFreeSeconds,
  nextLayer, powerLayer, stripWithLayers,
} from '../src/ui/layers.js';

// A new building run: Hall 1's top half on one side (A), one CDU, one chiller, two glycol pumps, one water pump.
const game = () => createGame({ seed: 1, config: { tutorial: false, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true } } });
const buildIds = (s, ids) => {
  for (const id of ids) s.equip[id].built = true;
  refreshSites(s);
};

test('the button steps through none, Power, Cooling, Crew and back', () => {
  assert.deepEqual(LAYERS, [null, 'power', 'cooling', 'crew']);
  let l = null;
  const seen = [];
  for (let i = 0; i < 4; i++) seen.push((l = nextLayer(l)));
  assert.deepEqual(seen, ['power', 'cooling', 'crew', null]);
  assert.equal(layerModel(game(), null), null);
});

test('the button is 44 px at the strip\'s left end, and the strip gives up that room', () => {
  const strip = { x: 80, y: 350, w: 600, h: 28 };
  const b = layersTarget(strip);
  assert.equal(b.x, 80);
  assert.ok(b.w >= 44 && b.h >= 44);
  const narrow = stripWithLayers(strip);
  assert.ok(narrow.x >= b.x + b.w && narrow.x + narrow.w === strip.x + strip.w);
});

test('a half on one side is single, would go dark next, and its chain is live to the racks', () => {
  const s = game();
  assert.equal(halfPower(s, 1, 't'), 'single');
  assert.equal(halfPower(s, 1, 'b'), 'none');
  const p = powerLayer(s);
  assert.deepEqual(p.next, [{ hall: 1, half: 't' }]);
  assert.ok(p.items.includes('rmu-1-t') && p.items.includes('xfmr-1-t-A') && p.items.includes('msb-1-t-A') && p.items.includes('row-1-t-0'));
  assert.ok(p.links.some((l) => l.state === 'live'));
  assert.ok(p.links.some((l) => l.state === 'unbuilt')); // side B: not built
  assert.equal(p.marks.find((m) => m.hall === 1 && m.half === 't').shield, 'single');
});

test('with the backup side built the half is backed up and marked as hanging on one RMU', () => {
  const s = game();
  buildIds(s, ['xfmr-1-t-B', 'msb-1-t-B']);
  assert.equal(halfPower(s, 1, 't'), 'backup');
  const m = powerLayer(s).marks.find((x) => x.hall === 1 && x.half === 't');
  assert.equal(m.shield, 'whole');
  assert.equal(m.text, '1 RMU');
  assert.deepEqual(powerLayer(s).next, []);
});

test('a tripped switchboard or a faulted RMU shows as failed, and the half goes dark', () => {
  const s = game();
  s.equip['msb-1-t-A'].tripped = true;
  assert.equal(halfPower(s, 1, 't'), 'dark');
  assert.ok(powerLayer(s).links.some((l) => l.state === 'failed'));
  const r = game();
  r.equip['rmu-1-t'].faulted = true;
  assert.equal(halfPower(r, 1, 't'), 'dark');
  assert.equal(powerLayer(r).marks[0].shield, 'broken');
});

test('cooling counts running, built, needed and spare by plant', () => {
  const s = game();
  const c = coolingCounts(s);
  assert.deepEqual(c.A.chillers, { running: 1, built: 1 });
  assert.deepEqual(c.A.dry, { working: 1, built: 1 });
  assert.deepEqual(c.A.glycol, { running: 2, built: 2 });
  assert.deepEqual(c.A.water, { running: 1, built: 1 });
  assert.equal(c.B.chillers.built, 0);
  assert.equal(c.spare, 1 - c.needed);
});

test('the cooling layer marks a hall on one CDU, and a hall without water', () => {
  const s = game();
  step(s, 0.05);
  const l = coolingLayer(s);
  assert.ok(l.items.includes('cdu-1-t') && l.items.includes('chiller-A-0') && l.items.includes('gpump-A-0') && l.items.includes('dry-A-0'));
  const hall = l.marks.find((m) => m.hall === 1);
  assert.equal(hall.shield, 'single');
  assert.match(hall.text, /1 CDU/);
  s.equip['wpump-A-0'].overpressure = true;
  step(s, 0.05);
  const dry = coolingLayer(s).marks.find((m) => m.hall === 1);
  assert.equal(dry.shield, 'broken');
  assert.match(dry.text, /No water/);
});

test('the crew layer shows each area\'s nearest free tech, posts and nobody free', () => {
  const s = game();
  step(s, 0.05);
  const marks = crewLayer(s).marks;
  assert.ok(marks.some((m) => m.area === 'pA'));
  assert.ok(marks.some((m) => m.area === 'h1'));
  assert.ok(!marks.some((m) => m.area === 'h5')); // not online
  assert.match(marks.find((m) => m.area === 'h1').text, /^\d+:\d\d away$/);
  if (s.config.building.posts?.enabled) {
    postTech(s, s.techs[0].id, 'h1');
    const l = crewLayer(s);
    assert.ok(l.links.some((x) => x.state === 'post'));
    assert.equal(l.marks.find((m) => m.area === 'h1').sub, '1 posted');
  }
  for (const t of s.techs) t.state = 'fixing';
  assert.equal(nearestFreeSeconds(s, { x: 640, y: 390 }), null);
  assert.equal(crewLayer(s).marks[0].text, 'Nobody free');
});
