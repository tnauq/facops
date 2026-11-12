import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, EQUIPMENT_BY_ID, START_POINT, isOnNetwork, route } from '../src/core/index.js';

const service = (id) => ({ x: EQUIPMENT_BY_ID[id].sx, y: EQUIPMENT_BY_ID[id].sy });

test('pass 1 map has the right equipment', () => {
  const count = (type) => EQUIPMENT.filter((e) => e.type === type).length;
  assert.equal(count('rack'), 20);
  assert.equal(count('cdu'), 4);
  assert.equal(count('msb'), 4);
  assert.equal(count('chiller'), 3);
  assert.equal(count('pump'), 2);
  assert.equal(new Set(EQUIPMENT.map((e) => e.id)).size, EQUIPMENT.length);
});

test('every service point and the start point sit on a lane', () => {
  for (const e of EQUIPMENT) assert.ok(isOnNetwork({ x: e.sx, y: e.sy }), `${e.id} is off the lanes`);
  assert.ok(isOnNetwork(START_POINT));
});

test('route to the same point is empty', () => {
  const r = route(service('rack-1-0-0'), service('rack-1-0-0'));
  assert.equal(r.length, 0);
  assert.equal(r.points.length, 1);
});

test('route along one aisle is a straight line', () => {
  const r = route(service('rack-1-0-0'), service('rack-1-0-4'));
  assert.equal(r.length, 340);
  assert.equal(r.points.length, 2);
});

test('hall to hall goes round by the corridor', () => {
  const r = route(service('rack-1-0-2'), service('rack-2-0-2'));
  assert.equal(r.length, 415 + 240 + 415);
  assert.deepEqual(r.points.slice(1, 3), [{ x: 270, y: 130 }, { x: 270, y: 370 }]);
});

test('hall to yard uses the nearer link', () => {
  assert.equal(route(service('rack-1-0-2'), service('chiller-1')).length, 535 + 120);
  assert.equal(route(service('chiller-2'), service('msb-2-A')).length, 35 + 205);
});

test('the shorter way round the loop wins', () => {
  assert.equal(route(service('pump-0'), { x: 270, y: 200 }).length, 60 + 120 + 70);
});

test('routes are symmetric and every hop is axis-aligned', () => {
  const ids = ['chiller-0', 'pump-1', 'msb-1-B', 'cdu-2-1', 'rack-2-1-4', 'rack-1-1-0'];
  for (const a of ids) {
    for (const b of ids) {
      const there = route(service(a), service(b));
      const back = route(service(b), service(a));
      assert.equal(there.length, back.length, `${a} <-> ${b}`);
      for (let i = 0; i + 1 < there.points.length; i++) {
        const p = there.points[i];
        const q = there.points[i + 1];
        assert.ok(p.x === q.x || p.y === q.y, `diagonal hop on ${a} -> ${b}`);
      }
    }
  }
});

test('a route can start part-way along a lane, but not off the lanes', () => {
  assert.equal(route({ x: 400, y: 130 }, service('rack-1-0-0')).length, 115);
  assert.throws(() => route({ x: 400, y: 200 }, service('rack-1-0-0')));
});
