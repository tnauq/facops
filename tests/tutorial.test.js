import test from 'node:test';
import assert from 'node:assert/strict';
import { assign, createGame, step } from '../src/core/index2.js';
import { createTutorial, updateTutorial } from '../src/ui/tutorial.js';
import { tuning2 } from '../src/ui/tuning2.js';

// A patient learner: answers each lesson the way the callout asks, after `delay` seconds.
function play(state, tut, { delay = 1, redirect = true, maxSeconds = 600 } = {}) {
  const seen = [];
  let lastCallout = '';
  let next = 0;
  while (!tut.done && state.t < maxSeconds && !state.over) {
    step(state, 0.05);
    const events = state.events.splice(0);
    const callout = updateTutorial(tut, state, events);
    if (callout !== lastCallout) {
      seen.push({ step: tut.step, callout, t: state.t, meter: state.meter });
      lastCallout = callout;
    }
    if (state.pendingPick) break;
    if (state.t < next) continue;
    const idle = state.techs.filter((t) => t.state === 'idle');
    const waiting = state.alarms.filter((a) => a.techId === null);
    if (tut.step === 'redirect' && redirect) {
      const leak = state.alarms.find((a) => a.id === tut.leak);
      if (leak && leak.techId === null) {
        assign(state, state.techs[0].id, leak.id); // a busy tech
        next = state.t + delay;
        continue;
      }
    }
    if (idle.length > 0 && waiting.length > 0) {
      assign(state, idle[0].id, waiting[0].id);
      next = state.t + delay;
    }
  }
  return seen;
}

test('the lessons come one at a time, in order, then the director takes over', () => {
  const s = createGame({ seed: 3 });
  const tut = createTutorial('Tap');
  const seen = play(s, tut);
  const steps = [...new Set(seen.map((x) => x.step))];
  assert.deepEqual(steps.slice(0, 7), ['assign', 'hat', 'leak', 'choose', 'busy', 'redirect', 'free']);
  assert.ok(tut.done, 'the first Delivery ends the tutorial');
  assert.equal(s.halls, 2);
  assert.match(seen[0].callout, /^Alarm! Tap the alarm, then tap a tech/);
});

test('while the lessons run the director adds nothing and the meter stays at 80 or below', () => {
  const s = createGame({ seed: 5 });
  const tut = createTutorial();
  const scriptedIds = new Set();
  let maxMeter = 0;
  for (let i = 0; i < 20000 && tut.step !== 'free'; i++) {
    step(s, 0.05);
    updateTutorial(tut, s, s.events.splice(0));
    for (const a of s.alarms) scriptedIds.add(a.cause);
    maxMeter = Math.max(maxMeter, s.meter);
    // Answer each alarm so the lessons move on.
    const idle = s.techs.find((t) => t.state === 'idle');
    const waiting = s.alarms.find((a) => a.techId === null);
    if (idle && waiting) assign(s, idle.id, waiting.id);
  }
  assert.equal(tut.step, 'free');
  assert.ok(![...scriptedIds].includes('director'), 'no director alarms during the lessons');
  assert.ok(maxMeter <= 80 + 1e-9, `meter reached ${maxMeter}`);
  assert.equal(s.scripted, false, 'the director is back once the lessons end');
});

test('the redirect lesson ends on a redirect to the leak', () => {
  const s = createGame({ seed: 8 });
  const tut = createTutorial();
  play(s, tut);
  assert.ok(s.stats.redirects >= 1);
});

test('a learner who never redirects still gets through once the leak is fixed', () => {
  const s = createGame({ seed: 8 });
  const tut = createTutorial();
  play(s, tut, { redirect: false });
  assert.ok(tut.done);
});

test('prompts say Click with a mouse', () => {
  const s = createGame({ seed: 1 });
  const tut = createTutorial('Click');
  step(s, 0.05);
  assert.match(updateTutorial(tut, s, s.events.splice(0)), /^Alarm! Click the alarm, then click a tech/);
});

test('the callouts are one line each, short enough for the phone', () => {
  const s = createGame({ seed: 3 });
  const seen = play(s, createTutorial('Tap'));
  for (const x of seen) if (x.callout) assert.ok(x.callout.length <= 110, `${x.callout.length}: ${x.callout}`);
});

test('Skip tutorial is a drawer switch, off by default', () => {
  const v = tuning2.defaultTuning();
  assert.equal(v.skipTutorial, false);
  const cfg = createGame({ config: tuning2.tuningToConfig(tuning2.setTuning(v, 'skipTutorial', true)) }).config;
  assert.equal(cfg.tutorial, false);
  assert.equal(createGame({ config: tuning2.tuningToConfig(v) }).config.tutorial, true);
});

test('each lesson asks the screen to bring its alarm into view', () => {
  const s = createGame({ seed: 1 });
  const tut = createTutorial();
  step(s, 0.05);
  updateTutorial(tut, s, s.events.splice(0));
  assert.equal(tut.focus, 'msb-1-t-A');
});

test('a learner who does nothing still gets hall 2: an unanswered lesson hands over after 45 s', () => {
  const s = createGame({ seed: 2 });
  const tut = createTutorial();
  while (s.halls < 2 && s.t < 400) {
    step(s, 0.05);
    updateTutorial(tut, s, s.events.splice(0));
  }
  assert.equal(s.halls, 2, 'hall 2 came');
  assert.ok(s.t < 45 + 90 + 5, `at ${s.t.toFixed(0)} s`);
});
