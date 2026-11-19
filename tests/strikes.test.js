// The CEO's strikes (pass 5 spec 4, M33): from walkthrough 3 every visit is a strike visit. Each
// sighting is fined, a visit with any sighting is one strike, and the third strike fires you.
import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, build, createGame, raiseAlarm, results, resultsText, step } from '../src/core/index2.js';
import { LINES, bannerModel, ceoEvents, createCeoView, liveSay, sightingFloat, strikeLine } from '../src/ui/ceoView.js';
import { ceoNote, hudModel2, strikesModel } from '../src/ui/hud2.js';
import { createIntros, strikesText, updateIntros } from '../src/ui/intros.js';
import { firedTitle, resultsPanel } from '../src/ui/results.js';
import { createFeel2 } from '../src/ui/feel2.js';

const UP = -Math.PI / 2;
const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const eventsOf = (s, type) => s.events.filter((e) => e.type === type);
const chain = (hall, half, side = 'A') => [`rmu-${hall}-${half}`, `xfmr-${hall}-${half}-${side}`, `msb-${hall}-${half}-${side}`];

// The classic game with every hall online: the Handover 30 s in, then the walkthroughs.
const classic = (ceo = {}) => createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, startHalls: 8, ceo } });

function stepUntil(s, done, limit = 900) {
  const end = s.t + limit;
  while (!done(s) && !s.over && s.t < end) step(s, 0.05);
  assert.ok(done(s), `condition not met by ${s.t.toFixed(1)} s`);
}

// Building mode, no burn, no alarms, halls 1 to 3 online: the ribbon-cutting at Hall 3 is on its way.
function building(config = {}) {
  const s = createGame({
    seed: 1,
    config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ...config, building: { enabled: true, startCash: 20000, burn: NO_BURN } },
  });
  for (const id of [...chain(2, 't'), 'cdu-2-t']) build(s, id);
  advance(s, 8.2);
  for (const id of [...chain(3, 't'), 'cdu-3-t', 'row-3-t-0', 'row-3-t-1']) build(s, id);
  advance(s, 8.2);
  return s;
}

// The ribbon-cutting, stopped while the CEO inspects Hall 3's top half, made a strike visit giving
// strike `n`. Rows 3-t-0 and 3-t-1 are built.
function strikeVisit(n = 1, config = {}) {
  const s = building(config);
  assert.deepEqual(s.ceo.areas, ['h3']);
  stepUntil(s, (g) => g.ceo && g.ceo.phase === 'visit' && g.ceo.steps[g.ceo.step].kind === 'inspect' && g.ceo.facing === UP && g.ceo.stepEnd !== null);
  Object.assign(s.ceo, { strike: true, zeroTolerance: false, cost: null, strikeNumber: n });
  s.ceoStrikes = n - 1;
  s.events.length = 0;
  return s;
}

test('from walkthrough 3 every visit is a strike visit; walkthrough 2 says strikes come next', () => {
  const s = building();
  const seen = [];
  for (let i = 0; i < 6; i++) {
    stepUntil(s, (g) => g.ceo !== null && g.ceo.number === i + 1, 1200);
    seen.push({ kind: s.ceo.kind, strike: s.ceo.strike, zt: s.ceo.zeroTolerance, next: s.ceo.nextIsStrike, n: s.ceo.strikeNumber, start: s.t });
    if (s.ceo.kind === 'walk' && s.ceo.nextIsStrike) assert.match(bannerModel(s).lines[1], /Next visit: strikes$/);
    stepUntil(s, (g) => g.ceo === null, 300);
    seen[i].end = s.t;
  }
  assert.deepEqual(seen.map((v) => v.kind), ['ribbon', 'handover', 'walk', 'walk', 'walk', 'walk']);
  assert.deepEqual(seen.map((v) => v.strike), [false, false, false, false, true, true]);
  assert.deepEqual(seen.map((v) => v.next), [false, false, false, true, false, false]);
  assert.ok(seen.every((v) => v.zt === false), 'three strikes: no visit is zero tolerance');
  assert.deepEqual(seen.slice(4).map((v) => v.n), [1, 1], 'clean visits give no strike, so the next is still strike 1');
  // Strike visits come closer together than the walkthroughs before them (M33's checks).
  const gap = (i) => seen[i].start - seen[i - 1].end;
  const [lo, hi] = s.config.ceo.strikeGap;
  for (const i of [4, 5]) assert.ok(gap(i) >= lo - 0.1 && gap(i) <= hi + 0.1, `gap ${gap(i)}`);
  const [glo] = s.config.ceo.gap;
  assert.ok(gap(3) >= glo - 0.1, `walkthrough 2 keeps its gap: ${gap(3)}`);
  assert.equal(s.over, false);
  assert.equal(s.ceoStrikes, 0);
});

test('the classic game keeps pass 3\'s zero tolerance', () => {
  const s = classic();
  stepUntil(s, (g) => g.ceo !== null && g.ceo.strike === true);
  assert.equal(s.ceo.zeroTolerance, true);
  assert.equal(bannerModel(s).lines[0].startsWith('Zero tolerance'), true);
});

test('a strike visit fines every sighting but gives one strike, however many sightings', () => {
  const s = strikeVisit(1);
  raiseAlarm(s, 'network', 'row-3-t-0');
  raiseAlarm(s, 'network', 'row-3-t-1');
  step(s, 0.05);
  assert.equal(eventsOf(s, 'ceoSighting').length, 2);
  assert.ok(eventsOf(s, 'ceoSighting').every((e) => e.fine === s.config.ceo.strikeFine && e.strike));
  assert.equal(s.stats.ceoFines, 2 * s.config.ceo.strikeFine);
  assert.deepEqual(eventsOf(s, 'ceoStrike').map((e) => [e.count, e.of]), [[1, 3]]);
  assert.equal(s.ceoStrikes, 1);
  assert.equal(s.ceo.struck, true);
  assert.equal(s.over, false);
  assert.equal(eventsOf(s, 'ceoFired').length, 0);
});

test('the third strike fires you the moment it is given', () => {
  const s = strikeVisit(3);
  raiseAlarm(s, 'network', 'row-3-t-0');
  step(s, 0.05);
  assert.deepEqual(eventsOf(s, 'ceoStrike').map((e) => e.count), [3]);
  assert.equal(eventsOf(s, 'ceoFired').length, 1);
  assert.equal(s.over, true);
  assert.equal(s.overReason, 'ceo');
  const r = results(s);
  assert.equal(r.firedByCeo, true);
  assert.equal(r.strikes, 3);
  assert.equal(r.strikesToFire, 3);
  assert.equal(firedTitle(r), 'Fired by the CEO: three strikes');
  assert.match(resultsText(s), /Strikes: .* \| Fired by the CEO/);
});

test('one strike with no fine is pass 3\'s zero tolerance', () => {
  const s = strikeVisit(1, { ceo: { strikes: 1, strikeFine: 0 } });
  s.ceo.zeroTolerance = true;
  raiseAlarm(s, 'network', 'row-3-t-0');
  step(s, 0.05);
  assert.equal(s.over, true);
  assert.equal(s.stats.ceoFines ?? 0, 0);
  assert.equal(firedTitle(results(s)), 'Fired by the CEO');
  assert.equal(strikesModel(s), null, 'no hardhats for zero tolerance');
});

test('an outage a tech is on site fixing is no strike', () => {
  const s = strikeVisit(1);
  raiseAlarm(s, 'breaker', 'msb-3-t-A'); // no B side here: this is an outage...
  const fixing = s.alarms[0];
  fixing.techId = s.techs[0].id; // ...but a tech is on site and fixing it
  s.techs[0].state = 'fixing';
  s.techs[0].alarmId = fixing.id;
  step(s, 0.05);
  assert.equal(eventsOf(s, 'ceoStrike').length, 0);
});

test('the banner names the strike; the HUD shows hardhats from the first strike', () => {
  const s = strikeVisit(2);
  s.ceoStrikes = 1;
  assert.deepEqual(bannerModel(s).lines, ['CEO · Hall 3 left · strike 2 of 3', 'Any outage seen is strike 2 of 3 · −$3,500 each']);
  assert.equal(bannerModel(s).dark, false);
  assert.equal(bannerModel(s, true).lines[0], 'CEO · H3 · strike 2 of 3');
  assert.equal(ceoNote(s).short, 'CEO in S2/3');
  assert.deepEqual(hudModel2(s).strikes, { given: 1, of: 3 });
  raiseAlarm(s, 'network', 'row-3-t-0');
  step(s, 0.05);
  assert.deepEqual(hudModel2(s).strikes, { given: 2, of: 3 });
  assert.equal(bannerModel(s).lines[1], '−$3,500 for each outage seen');
  // The last strike's visit is dark, like zero tolerance was.
  const last = strikeVisit(3);
  assert.equal(bannerModel(last).dark, true);
  assert.match(bannerModel(last).lines[1], /strike 3 of 3: fired/);
  // While warning, the banner counts down.
  last.ceo.phase = 'warning';
  last.ceo.warningEnd = last.t + 9;
  assert.equal(bannerModel(last).lines[0], 'CEO · Hall 3 · 0:09 · strike 3 of 3');
  assert.equal(strikesModel(createGame({ seed: 1, config: { tutorial: false } })), null, 'none before the first strike');
});

test('each strike gets its own CEO line; the fine floats in dollars', () => {
  assert.equal(strikeLine(1, 3), LINES.strike[0]);
  assert.equal(strikeLine(2, 3), LINES.strike[1]);
  assert.equal(strikeLine(3, 3), LINES.strike[2]);
  assert.equal(strikeLine(5, 5), LINES.strike[2], 'the last strike always gets the last line');
  assert.equal(strikeLine(4, 5), LINES.strike[1]);
  const s = strikeVisit(1);
  const view = createCeoView();
  const feel = createFeel2();
  raiseAlarm(s, 'network', 'row-3-t-0');
  step(s, 0.05);
  ceoEvents(view, s.events.splice(0), s, feel);
  assert.equal(liveSay(view, s.t), "That's one. I count to three.");
  assert.ok(feel.floats.some((f) => f.text === '−$3,500'));
  assert.equal(sightingFloat({ cost: 15, fine: null, strike: false }), '−15 Stability');
  assert.equal(sightingFloat({ cost: 15, fine: 750, strike: false }), '−$750');
  assert.equal(sightingFloat({ zeroTolerance: true }), 'Fired');
});

test('the strikes are introduced once, in one line, as the last walkthrough before them leaves', () => {
  const s = building();
  const intros = createIntros({ devices: false });
  const texts = new Set();
  stepUntil(s, (g) => {
    const t = updateIntros(intros, g);
    if (t) texts.add(t);
    return g.ceo !== null && g.ceo.strike === true;
  }, 1500);
  // Pass 6 (M40): the pumps' own lines may show in the same run; so may pass 7's (M41) lines on the sale
  // and service credits, and M42's on the uptime bonus. The strikes get exactly one line.
  const others = [...texts].filter((t) => !/^(Water pumps serve|Not enough glycol pumps|You can sell the campus|Credits are outrunning|Every rack row that stays up)/.test(t));
  assert.deepEqual(others, ["From now on, every CEO visit that sees an outage is a strike. Three and you're out."]);
  assert.equal(strikesText(1), 'From now on, any CEO visit that sees an outage ends the run.');
});

test('results list the minute of each strike', () => {
  const s = strikeVisit(1);
  raiseAlarm(s, 'network', 'row-3-t-0');
  step(s, 0.05);
  const r = results(s);
  assert.equal(r.strikes, 1);
  assert.equal(r.strikeTimes.length, 1);
  const panel = resultsPanel(r, { isNew: true, best: r }, (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`);
  assert.ok(panel.lines.some(([label, value]) => label === 'Strikes' && /^1 of 3 · \d+:\d\d$/.test(value)));
});

test('the alarm cap rises by 2 at 14:00 and by 2 more at 17:00 (owner, 16 Nov)', async () => {
  const { alarmCap, lateCapExtra } = await import('../src/core/index2.js');
  const s = building();
  const base = alarmCap(s);
  assert.equal(lateCapExtra(s), 0);
  s.t = 839.9;
  assert.equal(alarmCap(s), base);
  s.t = 840;
  assert.equal(alarmCap(s), base + 2);
  s.t = 1019.9;
  assert.equal(alarmCap(s), base + 2);
  s.t = 1020;
  assert.equal(alarmCap(s), base + 4);
  s.config.building.capSteps = [];
  assert.equal(alarmCap(s), base, 'the drawer can turn it off');
});
