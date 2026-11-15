// The building tutorial (pass 4 spec 3.6, M27).
import test from 'node:test';
import assert from 'node:assert/strict';
import { build, burnRate, createGame, economyTime, step } from '../src/core/index2.js';
import { LESSON_LIMIT, createTutorial4, updateTutorial4 } from '../src/ui/tutorial4.js';

const game = () => createGame({ seed: 3, config: { building: { enabled: true } } });

// Plays the tutorial; `answer(step, state)` is the learner's reply to each lesson (or nothing).
function play(answer = () => {}, maxSeconds = 400) {
  const s = game();
  const tut = createTutorial4('Tap');
  const seen = [];
  let last = null;
  let cashDuringLessons = Infinity;
  while (!tut.done && s.t < maxSeconds) {
    step(s, 0.05);
    const callout = updateTutorial4(tut, s, s.events.splice(0));
    if (tut.step !== last) {
      seen.push({ step: tut.step, callout, t: s.t });
      last = tut.step;
    }
    if (s.scripted) cashDuringLessons = Math.min(cashDuringLessons, s.cash);
    answer(tut.step, s);
  }
  return { s, tut, seen, cashDuringLessons };
}

const patient = (step, s) => {
  if (step === 'rack' && s.t > 3) build(s, 'row-1-t-2');
  if (step === 'half' && s.t > 6) {
    build(s, 'msb-1-b-A');
    build(s, 'row-1-b-0');
  }
};

test('a patient learner goes through every lesson, in order, and the game takes over', () => {
  const { s, tut, seen } = play(patient);
  assert.equal(tut.done, true);
  assert.deepEqual(seen.map((x) => x.step), ['rack', 'half', 'trip', 'backup', 'grow', 'free']);
  assert.equal(s.scripted, false);
  assert.match(seen[0].callout, /tap a \+ on a rack spot/);
});

test('the lessons teach the build order: racks, a switchboard for each half, backups later, a new hall', () => {
  const { seen } = play(patient);
  const text = seen.map((x) => x.callout).join(' ');
  assert.match(text, /Racks earn money/);
  assert.match(text, /own switchboard first/);
  assert.match(text, /no backup/);
  assert.match(text, /Backups cost upkeep/);
  assert.match(text, /switchboard and coolant unit first, then racks/);
  assert.match(text, /chiller/);
  assert.match(text, /hire/i);
});

test('the trip lesson: half the hall goes dark, and a tech goes by themselves', () => {
  const s = game();
  const tut = createTutorial4('Tap');
  let sentBySelf = false;
  while (!tut.done && s.t < 400) {
    step(s, 0.05);
    const events = s.events.splice(0);
    updateTutorial4(tut, s, events);
    if (tut.step === 'trip' && events.some((e) => e.type === 'assign')) sentBySelf = true;
    patient(tut.step, s);
  }
  assert.ok(sentBySelf);
});

test('nothing burns and no alarm comes while the lessons run; the burn starts from the hand-over', () => {
  const { s, seen } = play(patient);
  const handOver = seen.find((x) => x.step === 'free').t;
  assert.ok(Math.abs(s.economyStart - handOver) < 0.06);
  assert.ok(economyTime(s) < 10);
  // Every alarm before the hand-over was the lesson's own.
  assert.ok(s.stats.spawned === 0 || s.alarms.every((a) => a.cause !== 'director' || a.born >= handOver));
  assert.ok(burnRate(s) < s.config.building.burn.base * 1.2 + 10);
});

test('a learner who does nothing is never stuck: each lesson moves on after a minute', () => {
  const { tut, seen } = play(() => {}, 600);
  assert.equal(tut.done, true);
  assert.ok(seen.at(-1).t < 4 * LESSON_LIMIT + 60);
});

test('the callouts are one line each, short enough for the phone', () => {
  for (const verb of ['Tap', 'Click']) {
    const s = game();
    const tut = createTutorial4(verb);
    for (let i = 0; i < 12000 && !tut.done; i++) {
      step(s, 0.05);
      const c = updateTutorial4(tut, s, s.events.splice(0));
      if (c) assert.ok(c.length <= 110, `${c.length}: ${c}`);
    }
  }
});

test('the HUD rate shows no burn while the lessons run', async () => {
  const { moneyModel } = await import('../src/ui/hud2.js');
  const s = game();
  const tut = createTutorial4('Tap');
  step(s, 0.05);
  updateTutorial4(tut, s, s.events.splice(0));
  assert.equal(s.scripted, true);
  assert.equal(moneyModel(s).rate, '+$8/s');
});
