// The drawing code cannot be judged by a test, but it can be kept from crashing.
// A fake canvas context accepts every call and counts them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALARMS, advance, alarmInfo, assign, createGame, locationTag, raiseAlarm } from '../src/core/index.js';
import { drawCampus, drawCrew, fitView, toScreen, toWorld } from '../src/render/campus.js';
import { HATS, drawAlarmBubble, drawEquipment, drawFaultGlyph, drawShield, drawTech, drawTradeIcon } from '../src/render/icons.js';

function fakeContext() {
  let calls = 0;
  const ctx = new Proxy({}, {
    get: (target, key) => (key === 'calls' ? calls : key in target ? target[key] : () => { calls += 1; }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return ctx;
}

test('every icon draws in every state without throwing', () => {
  const ctx = fakeContext();
  for (const trade of Object.keys(HATS)) {
    drawTech(ctx, 0, 0, 40, trade);
    drawTech(ctx, 0, 0, 40, trade, { selected: true, busy: true });
    drawTradeIcon(ctx, 0, 0, 20, trade, '#000');
  }
  drawEquipment(ctx, 'chiller', 0, 0, 80, { running: false });
  drawEquipment(ctx, 'pump', 0, 0, 60, { pressure: 0.9 });
  for (const leak of [0, 1, 2]) drawEquipment(ctx, 'cdu', 0, 0, 30, { leak });
  for (const level of [0, 0.5, 1]) drawEquipment(ctx, 'rack', 0, 0, 30, { level, netDown: level === 0 });
  drawEquipment(ctx, 'msb', 0, 0, 50, { tripped: true });
  for (const status of ['whole', 'cracked', 'broken']) drawShield(ctx, 0, 0, 20, status);
  for (const type of Object.keys(ALARMS)) drawFaultGlyph(ctx, 0, 0, 16, type, '#000');
  assert.ok(ctx.calls > 100);
});

test('the campus and crew draw from a live game state', () => {
  const ctx = fakeContext();
  const g = createGame({ seed: 2, config: { director: { enabled: false } } });
  raiseAlarm(g, 'pump', 'pump-0');
  const leak = raiseAlarm(g, 'leak', 'cdu-2-0');
  raiseAlarm(g, 'breaker', 'msb-1-A');
  assign(g, 'tech-2', leak.id);
  advance(g, 6);
  const view = fitView({ x: 76, y: 34, w: 570, h: 286 });
  drawCampus(ctx, view, g);
  drawCrew(ctx, view, g.techs, 'tech-0');
  for (const alarm of g.alarms) {
    const info = alarmInfo(g, alarm);
    drawAlarmBubble(ctx, 10, 10, 15, info, { selected: true, pulse: 0.5, assignedTrade: 'ce' });
    drawAlarmBubble(ctx, 10, 10, 15, info, { queued: true });
  }
  drawCampus(ctx, view, null);
  assert.ok(ctx.calls > 500);
});

test('a view fits the world inside its rectangle and converts both ways', () => {
  const view = fitView({ x: 76, y: 34, w: 570, h: 286 });
  assert.ok(Math.abs(view.scale - 0.57) < 1e-9);
  const p = toScreen(view, 1000, 500);
  assert.ok(p.x <= 76 + 570 + 1e-9 && p.y <= 34 + 286 + 1e-9);
  const back = toWorld(view, p.x, p.y);
  assert.ok(Math.abs(back.x - 1000) < 1e-9 && Math.abs(back.y - 500) < 1e-9);
});

test('location tags are short and say where to look', () => {
  assert.equal(locationTag('chiller-2'), 'Yard');
  assert.equal(locationTag('pump-0'), 'Yard');
  assert.equal(locationTag('msb-2-B'), 'H2 B');
  assert.equal(locationTag('cdu-1-1'), 'H1 R2');
  assert.equal(locationTag('rack-2-0-4'), 'H2 R1');
});
