// "A full round can be played on the map alone": every command goes through screen taps,
// hit testing and the selection reducer, never straight to the engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assign, createGame, nearestIdleTech, sortedAlarms, step } from '../src/core/index.js';
import { fitView } from '../src/render/campus.js';
import { hitTest } from '../src/ui/hittest.js';
import { NOTHING, pruneSelection, reduceTap } from '../src/ui/selection.js';
import { mapTargets } from '../src/ui/targets.js';

test('a whole round played by tapping the map at 844 x 390', () => {
  const view = fitView({ x: 8, y: 36, w: 828, h: 350 });
  const state = createGame({ seed: 11 });
  let selection = NOTHING;
  let taps = 0;
  let sent = 0;
  let next = 0;
  const tap = (p) => {
    taps += 1;
    const r = reduceTap(selection, hitTest(p, mapTargets(state, view)));
    selection = r.selection;
    if (r.assign && assign(state, r.assign.techId, r.assign.alarmId).ok) sent += 1;
  };
  while (!state.over && state.t < 900) {
    step(state, 0.05);
    selection = pruneSelection(selection, state);
    if (state.t < next) continue;
    // A simple player: the most urgent alarm nobody is on, and the nearest idle tech.
    const alarm = sortedAlarms(state).find((x) => x.techId === null && state.t - x.born >= 1);
    const tech = alarm && nearestIdleTech(state, alarm.id);
    if (!tech) continue;
    const t = mapTargets(state, view);
    const b = t.bubbles.find((x) => x.id === alarm.id);
    const m = t.techs.find((x) => x.id === tech.id);
    // Tap the bubble, then the tech, as a player would. A tech under a bubble is tapped
    // on the side away from it, which the hit test allows (22 px reach).
    tap(b);
    if (selection.kind !== 'alarm' || selection.id !== b.id) continue;
    const dx = m.x - b.x, dy = m.y - b.y, d = Math.hypot(dx, dy) || 1;
    tap(d < 30 ? { x: m.x + (dx / d) * 14 || m.x, y: m.y + (dy / d) * 14 || m.y + 14 } : m);
    next = state.t + 0.8;
  }
  assert.ok(state.over, 'the round ended');
  assert.ok(sent > 20, `only ${sent} techs sent by tapping`);
  assert.ok(state.t > 120, `round lasted only ${state.t.toFixed(0)} s`);
  assert.ok(taps >= sent * 2, 'every send took two taps');
});
