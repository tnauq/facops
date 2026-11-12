import test from 'node:test';
import assert from 'node:assert/strict';
import { BUTTON_TAP_HEIGHT, HUD_HEIGHT, hudButtonTargets, hudLayout, mapRectBeforeRails, regions } from '../src/ui/regions.js';

const SIZES = [
  [844, 390],
  [750, 340],
  [660, 300],
];

const inside = (r, W, H) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('regions match the table in spec 6.1 at 844 x 390', () => {
  assert.deepEqual(regions(844, 390), {
    hud: { x: 0, y: 0, w: 844, h: 34 },
    crew: { x: 0, y: 34, w: 76, h: 356 },
    rail: { x: 740, y: 34, w: 104, h: 356 },
    map: { x: 80, y: 36, w: 656, h: 350 },
  });
});

for (const [W, H] of SIZES) {
  test(`at ${W} x ${H} every region is on screen and none overlap`, () => {
    const r = regions(W, H);
    for (const rect of Object.values(r)) assert.ok(inside(rect, W, H), JSON.stringify(rect));
    const names = Object.keys(r);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        assert.ok(!overlap(r[names[i]], r[names[j]]), `${names[i]} overlaps ${names[j]}`);
      }
    }
    // The map sits between the crew bar and the alarm rail, below the HUD.
    assert.ok(r.map.x >= r.crew.x + r.crew.w);
    assert.ok(r.map.x + r.map.w <= r.rail.x);
    assert.ok(r.map.y >= r.hud.h);
    assert.ok(r.map.w > 0 && r.map.h > 0);
  });

  test(`at ${W} x ${H} the HUD fits: meter clear of the buttons, buttons at the right end`, () => {
    const hud = hudLayout(W);
    const [settings, pause] = hud.buttons;
    assert.equal(pause.x + pause.w, W);
    assert.equal(settings.x + settings.w, pause.x);
    assert.ok(hud.meter.x + hud.meter.w < settings.x, 'meter runs into the buttons');
    assert.equal(hud.meter.w, 200);
    assert.equal(hud.meter.h, 12);
    for (const b of hud.buttons) {
      assert.equal(b.w, 44);
      assert.equal(b.h, HUD_HEIGHT);
    }
  });

  test(`at ${W} x ${H} the HUD button tap areas are at least 44 x 44`, () => {
    for (const b of hudButtonTargets(W)) {
      assert.ok(b.w >= 44 && b.h >= 44);
      assert.equal(b.h, BUTTON_TAP_HEIGHT);
    }
  });

  test(`at ${W} x ${H} the map before the rails sits below the HUD`, () => {
    const m = mapRectBeforeRails(W, H);
    assert.ok(inside(m, W, H));
    assert.ok(m.y >= HUD_HEIGHT);
  });
}
