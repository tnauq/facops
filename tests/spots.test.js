// Empty spots and the build card (pass 4 spec 3.1, 3.2, M25).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, advance, build, createGame } from '../src/core/index2.js';
import { centreOn, createCamera, passOneScale, siteOf } from '../src/ui/camera.js';
import { regions } from '../src/ui/regions.js';
import { WORLD } from '../src/core/layout2.js';
import { cardLayout, spotAt, spotInfo, spotTargets, spotsModel } from '../src/ui/spots.js';

const game = (config = {}) => createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ...config, building: { enabled: true, ...(config.building ?? {}) } } });
const camAt = (W, H, x, y) => {
  const map = regions(W, H).map;
  return centreOn(createCamera(map, passOneScale(map), siteOf(WORLD)), x, y);
};

test('every device not built yet is a spot; the classic game has none', () => {
  const s = game();
  assert.equal(spotsModel(s).length, EQUIPMENT.length - 6);
  assert.deepEqual(spotsModel(createGame({ seed: 1 })), []);
  build(s, 'row-1-t-2');
  const sp = spotsModel(s).find((x) => x.id === 'row-1-t-2');
  assert.equal(sp.state, 'building');
  advance(s, 4);
  assert.ok(Math.abs(spotsModel(s).find((x) => x.id === 'row-1-t-2').progress - 0.5) < 0.02);
  advance(s, 4.1);
  assert.equal(spotsModel(s).find((x) => x.id === 'row-1-t-2'), undefined);
});

for (const [W, H] of [[844, 390], [660, 300]]) {
  test(`at ${W} x ${H}: every empty spot on screen is at least a 44 px target, and a tap on one finds it`, () => {
    const s = game();
    const cam = camAt(W, H, 900, 390);
    const targets = spotTargets(s, cam);
    assert.ok(targets.length > 5);
    for (const t of targets) assert.ok(t.w >= 44 && t.h >= 44, JSON.stringify(t));
    const t = targets[0];
    assert.equal(spotAt(s, cam, { x: t.cx, y: t.cy }).id, t.id);
  });
}

test('the build card names the device, its price, and what it does here', () => {
  const s = game();
  const msb = spotInfo(s, 'msb-1-b-A');
  assert.equal(msb.name, 'Switchboard A');
  assert.equal(msb.priceText, '$200');
  assert.match(msb.line, /Powers Hall 1's bottom half/);
  assert.match(msb.upkeep, /upkeep/);
  assert.equal(msb.canBuild, true);
  assert.equal(msb.button, 'Build');
  const backup = spotInfo(s, 'msb-1-t-B');
  assert.match(backup.line, /^Backup: keeps Hall 1's top half lit/);
  const row = spotInfo(s, 'row-1-t-2');
  assert.equal(row.name, 'Rack row');
  assert.match(row.line, /earns \$4\/s/);
  assert.equal(row.upkeep, '');
  const dark = spotInfo(s, 'row-1-b-0');
  assert.equal(dark.warn, true);
  assert.match(dark.line, /Needs a switchboard in this half/);
  const offline = spotInfo(s, 'row-3-t-0');
  assert.match(offline.line, /Earns once Hall 3 has a switchboard and a coolant unit/);
  const chillerB = spotInfo(s, 'chiller-B-0');
  assert.match(chillerB.line, /Needs a pump at Plant B/);
  assert.match(spotInfo(s, 'cdu-1-b').line, /^Backup: keeps Hall 1 cool/);
});

test('short of money, the button says how much more is needed', () => {
  const s = game({ building: { startCash: 120 } });
  const info = spotInfo(s, 'chiller-A-1');
  assert.equal(info.canBuild, false);
  assert.equal(info.button, 'Need $180 more');
});

for (const [W, H] of [[844, 390], [660, 300]]) {
  test(`at ${W} x ${H}: the card stays inside the map, clear of the spot, with a 44 px button`, () => {
    const rect = regions(W, H).map;
    for (const [sx, sy] of [[rect.x + 10, rect.y + 10], [rect.x + rect.w - 10, rect.y + rect.h - 10], [rect.x + rect.w / 2, rect.y + rect.h / 2]]) {
      const c = cardLayout(rect, sx, sy);
      assert.ok(c.x >= rect.x && c.y >= rect.y && c.x + c.w <= rect.x + rect.w && c.y + c.h <= rect.y + rect.h, JSON.stringify(c));
      assert.ok(c.button.h >= 44 && c.button.w >= 44);
      const over = sx >= c.x && sx <= c.x + c.w && sy >= c.y && sy <= c.y + c.h;
      assert.ok(!over, `the card covers the spot at ${sx}, ${sy}`);
    }
  });
}
