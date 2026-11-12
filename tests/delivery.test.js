import test from 'node:test';
import assert from 'node:assert/strict';
import { choose, createGame, formatClock, playRun, results, step } from '../src/core/index2.js';
import { cardView, deliveryCard } from '../src/ui/delivery.js';
import { reduceFlow } from '../src/ui/flow.js';
import { resultsPanel } from '../src/ui/results.js';
import { recordBest } from '../src/ui/best.js';
import { tuning2 } from '../src/ui/tuning2.js';

const quiet = (config = {}, seed = 1) => createGame({ seed, config: { ...config, director: { enabled: false } } });
function deliverNow(s) {
  s.build = s.config.build.every - 0.01;
  step(s, 0.05);
  return s.events.splice(0);
}

// ---- The card ----

test('hall 2: the card says the hall is online and Critical Environment joined; nothing to pick', () => {
  const s = quiet();
  const card = deliveryCard(s, deliverNow(s));
  assert.equal(card.title, 'Hall 2 online');
  assert.equal(card.joined, 'ce');
  assert.equal(card.joinedText, 'A Critical Environment tech joins the crew.');
  assert.equal(card.plantB, false);
  assert.deepEqual(card.cards, []);
});

test('hall 4: three cards to pick from, two hires and an upgrade', () => {
  const s = quiet({}, 4);
  deliverNow(s);
  deliverNow(s);
  const card = deliveryCard(s, deliverNow(s));
  assert.equal(card.hall, 4);
  assert.equal(card.joined, null);
  assert.deepEqual(card.cards.map((c) => c.kind), ['hire', 'hire', 'upgrade']);
  assert.equal(card.cards[0].title, 'Hire Network');
  assert.equal(card.cards[0].detail, '1 on the crew now');
  assert.ok(card.cards[2].detail.length > 0);
});

test('hall 6 also brings Plant B', () => {
  const s = quiet({ startHalls: 5 });
  const card = deliveryCard(s, deliverNow(s));
  assert.equal(card.hall, 6);
  assert.equal(card.plantB, true);
});

test('no Delivery, no card', () => {
  const s = quiet();
  step(s, 0.05);
  assert.equal(deliveryCard(s, s.events.splice(0)), null);
});

test('upgrade cards say which level they bring', () => {
  const s = quiet();
  assert.equal(cardView(s, { kind: 'upgrade', upgrade: 'carts' }).title, 'Carts (1 of 2)');
  s.upgrades.carts = 1;
  assert.equal(cardView(s, { kind: 'upgrade', upgrade: 'carts' }).title, 'Carts (2 of 2)');
  assert.equal(cardView(s, { kind: 'upgrade', upgrade: 'radios' }).title, 'Radios');
  assert.equal(cardView(s, { kind: 'hire', trade: 'network' }).detail, 'None on the crew yet');
});

// ---- The screen flow ----

test('a Delivery pauses play on the card; Continue goes back to playing', () => {
  assert.deepEqual(reduceFlow('playing', 'delivery'), { mode: 'delivery', newRound: false });
  assert.deepEqual(reduceFlow('delivery', 'continue'), { mode: 'playing', newRound: false });
  // Pause and the drawer wait until the card is closed.
  assert.deepEqual(reduceFlow('delivery', 'togglePause'), { mode: 'delivery', newRound: false });
  assert.equal(reduceFlow('delivery', 'tuning').mode, 'delivery');
});

// ---- Results ----

test('pass 2 results show halls reached, share of possible, crew and upgrades', () => {
  const run = playRun({ seed: 3, picks: 'upgrade', maxSeconds: 1500 });
  const r = results(run.state);
  const p = resultsPanel(r, recordBest(null, r), formatClock);
  assert.equal(p.big[2].value, `${r.halls} of 8`);
  assert.match(p.big[2].label, /^halls/);
  const lines = Object.fromEntries(p.lines);
  assert.match(lines['Of possible energy'], /^\d+%$/);
  assert.match(lines.Crew, /\d+ (Elec|Mech|CE|Net)/);
  if (r.picks.some((x) => !x.card.startsWith('hire'))) assert.notEqual(lines.Upgrades, 'none');
});

test('pass 1 results are unchanged', () => {
  const r = { seconds: 100, energyGwh: 1, shareOfPossible: 0.5, green: 1, yellow: 0, red: 0, raised: 1, cleared: 1, averageClear: 2, longestAlarm: 3, redirects: 0, matchedShare: 1 };
  const p = resultsPanel(r, recordBest(null, r), formatClock);
  assert.equal(p.big[2].label, 'of possible');
  assert.equal(p.lines.length, 6);
});

// ---- New tuning controls (spec 9) ----

test('hall build time is a drawer control', () => {
  const base = tuning2.defaultTuning();
  assert.equal(base.buildEvery, 90);
  const cfg = createGame({ config: tuning2.tuningToConfig(tuning2.setTuning(base, 'buildEvery', 60)) }).config;
  assert.equal(cfg.build.every, 60);
  assert.equal(cfg.build.greenBoost, 1.5, 'the green speed-up is untouched');
});

test('meter fill, chillers per hall and start halls each change their config key', () => {
  const base = tuning2.defaultTuning();
  assert.equal(base.meterFill, 1.25);
  assert.equal(base.chillersPerHall, 1.25);
  assert.equal(base.startHalls, 1);
  const cfg = (v) => createGame({ config: tuning2.tuningToConfig(v) }).config;
  assert.equal(cfg(tuning2.setTuning(base, 'meterFill', 2)).meter.fill, 2);
  assert.equal(cfg(tuning2.setTuning(base, 'meterFill', 2)).meter.start, 40, 'the rest of the meter is untouched');
  assert.equal(cfg(tuning2.setTuning(base, 'chillersPerHall', 1.5)).chillersPerHall, 1.5);
  const five = createGame({ config: tuning2.tuningToConfig(tuning2.setTuning(base, 'startHalls', 5)) });
  assert.equal(five.halls, 5);
  assert.equal(results(five).tuning.length, 1);
  assert.deepEqual(cfg(base), createGame().config);
});

test('choosing a card after the Delivery card works as in the engine', () => {
  const s = quiet({}, 2);
  deliverNow(s);
  deliverNow(s);
  deliverNow(s);
  assert.ok(s.pendingPick);
  choose(s, 2);
  assert.equal(s.pendingPick, null);
});
