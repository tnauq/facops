// The pass 2 game played through the screen: every command is a tap that goes through the hit
// tests and the selection rules, never straight to the engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, START_POINT, WORLD, assign, choose, createGame, nearestIdleTech, step } from '../src/core/index2.js';
import { centreOn, createCamera, passOneScale } from '../src/ui/camera.js';
import { crewCards } from '../src/ui/crewbar.js';
import { hitTest } from '../src/ui/hittest.js';
import { hudModel2 } from '../src/ui/hud2.js';
import { HUD_HEIGHT, crewColumns, regions } from '../src/ui/regions.js';
import { NOTHING, pruneSelection, reduceTap } from '../src/ui/selection.js';
import { mapTargets2, railTargets2 } from '../src/ui/targets2.js';
import { tuning2 } from '../src/ui/tuning2.js';

const SIZES = [
  [844, 390],
  [750, 340],
  [660, 300],
];
const centre = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// ---- Crew bar columns ----

test('the crew bar gets a second column when cards would be shorter than 48 px', () => {
  assert.equal(crewColumns(390, 6), 1);
  assert.equal(crewColumns(390, 7), 2);
  assert.equal(crewColumns(300, 5), 1);
  assert.equal(crewColumns(300, 6), 2);
});

for (const [W, H] of SIZES) {
  test(`at ${W} x ${H} nine techs fit in two columns, every card at least 44 px, in crew order`, () => {
    const regs = regions(W, H, { crewColumns: 2 });
    const s = createGame();
    while (s.techs.length < 9) s.techs.push({ ...s.techs[0], id: `tech-${s.techs.length}`, index: s.techs.length });
    const cards = crewCards(s, regs.crew, null, { columns: 2 });
    for (const c of cards) {
      assert.ok(c.w >= 44 && c.h >= 44, `${c.w} x ${c.h}`);
      assert.ok(c.x >= regs.crew.x && c.x + c.w <= regs.crew.x + regs.crew.w);
      assert.ok(c.y + c.h <= regs.crew.y + regs.crew.h);
    }
    assert.ok(cards[0].x < cards[1].x && cards[0].y === cards[1].y, 'tech 1 and 2 side by side');
    assert.ok(cards[2].y > cards[0].y, 'tech 3 starts the next row');
    // The map moves right to make room, and keeps clear of the crew bar.
    assert.ok(regs.map.x >= regs.crew.x + regs.crew.w);
    assert.ok(regs.map.x + regs.map.w <= regs.rail.x);
  });
}

// ---- HUD ----

test('the HUD shows MW against online capacity and the hall count', () => {
  const s = createGame({ config: { startHalls: 3, director: { enabled: false } } });
  const m = hudModel2(s);
  assert.equal(m.load, '113 / 113 MW');
  assert.equal(m.note, 'Hall 3 of 8');
  assert.equal(m.clock, '0:00');
  assert.equal(hudModel2(s, { auto: true }).note, 'Hall 3 of 8 · Auto');
});

// ---- Map targets ----

test('bubbles and techs are tap targets only while inside the map', () => {
  const regs = regions(844, 390);
  const cam = createCamera(regs.map, passOneScale(regs.map), WORLD, START_POINT);
  const s = createGame({ config: { startHalls: 8, director: { enabled: false } } });
  const t = mapTargets2(s, cam);
  // The two starting techs stand at the start point, in view; the two automatic hires joined at
  // halls 2 and 3's doors, further right.
  assert.ok(t.techs.length >= 2);
  for (const p of [...t.techs, ...t.bubbles]) {
    assert.ok(p.x >= regs.map.x && p.x <= regs.map.x + regs.map.w);
  }
  const far = centreOn(cam, 3800, 390); // looking at Plant B
  assert.equal(mapTargets2(s, far).techs.length, 0);
});

// ---- Pass 2 tuning ----

test('pass 2 tuning has its own key and defaults that give the default rules', () => {
  assert.equal(tuning2.key, 'facops.tuning.v2');
  const v = tuning2.defaultTuning();
  assert.equal(v.walkSpeed, 150);
  assert.equal(v.tighten, 5);
  assert.equal(v.startInterval, undefined);
  const cfg = createGame({ config: tuning2.tuningToConfig(v) }).config;
  assert.deepEqual(cfg, createGame().config);
});

// ---- Whole runs through the screen ----

for (const [W, H] of SIZES) {
  test(`at ${W} x ${H} a whole run can be played by tapping tickets and crew cards`, () => {
    const state = createGame({ seed: 17 });
    let selection = NOTHING;
    let sent = 0;
    let next = 0;
    const tap = (p, targets) => {
      const r = reduceTap(selection, hitTest(p, targets));
      selection = r.selection;
      if (r.assign && assign(state, r.assign.techId, r.assign.alarmId).ok) sent += 1;
    };
    while (!state.over && state.t < 1500) {
      if (state.pendingPick) choose(state, 0);
      step(state, 0.05);
      selection = pruneSelection(selection, state);
      if (state.t < next) continue;
      const cols = crewColumns(H, state.techs.length);
      const regs = regions(W, H, { crewColumns: cols });
      const t = railTargets2(state, regs, cols);
      const ticket = t.tickets.find((x) => state.alarms.find((a) => a.id === x.id).techId === null);
      const tech = ticket && nearestIdleTech(state, ticket.id);
      if (!tech) continue;
      tap(centre(ticket), t);
      tap(centre(t.cards.find((c) => c.id === tech.id)), t);
      next = state.t + 0.8;
    }
    assert.ok(state.over, 'the run ended');
    assert.ok(sent > 40, `only ${sent} techs sent`);
    assert.ok(state.halls >= 3, `only reached hall ${state.halls}`);
  });
}

test('a run can be played by tapping bubbles and techs on the scrolling map', () => {
  const [W, H] = [844, 390];
  const state = createGame({ seed: 5 });
  let selection = NOTHING;
  let sent = 0;
  let next = 0;
  let cam = null;
  const tap = (p, targets) => {
    const r = reduceTap(selection, hitTest(p, targets));
    selection = r.selection;
    if (r.assign && assign(state, r.assign.techId, r.assign.alarmId).ok) sent += 1;
  };
  while (!state.over && state.t < 600) {
    if (state.pendingPick) choose(state, 0);
    step(state, 0.05);
    selection = pruneSelection(selection, state);
    if (state.t < next) continue;
    const regs = regions(W, H, { crewColumns: crewColumns(H, state.techs.length) });
    const alarm = state.alarms.find((a) => a.techId === null && state.t - a.born >= 1);
    const tech = alarm && nearestIdleTech(state, alarm.id);
    if (!tech) continue;
    // Scroll to the alarm, tap its bubble; scroll to the tech, tap it. As a player would.
    const e = EQUIPMENT_BY_ID[alarm.equipId];
    cam = centreOn(createCamera(regs.map, passOneScale(regions(W, H).map), WORLD), e.x, e.y);
    const b = mapTargets2(state, cam).bubbles.find((x) => x.id === alarm.id);
    tap(b, mapTargets2(state, cam));
    cam = centreOn(cam, tech.x, tech.y);
    const m = mapTargets2(state, cam).techs.find((x) => x.id === tech.id);
    // A tech under a bubble is tapped on the side away from it (the hit test allows 22 px).
    const mt = mapTargets2(state, cam);
    const clash = mt.bubbles.find((q) => Math.hypot(q.x - m.x, q.y - m.y) < 22);
    tap(clash ? { x: m.x, y: m.y + 18 } : m, mt);
    next = state.t + 0.8;
  }
  assert.ok(sent > 30, `only ${sent} techs sent from the map`);
  assert.ok(state.halls >= 2);
  assert.ok(HUD_HEIGHT > 0);
});
