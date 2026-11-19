// The uptime bonus (pass 7 spec 4.1, M42): at each full minute of the economy, every rack row that
// stayed up the whole minute pays a bonus. A row at 90% (one leaking coolant unit) still counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, createGame, raiseAlarm, results, resultsText, rowUp, setScripted, step, uptimeOn, uptimeOnTrack } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (building = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };
const events = (s, type) => s.events.filter((e) => e.type === type);
const clearAlarm = (s, a) => {
  s.alarms = s.alarms.filter((x) => x !== a);
  const dyn = s.equip[a.equipId];
  dyn.alarmId = null;
  if ('netDown' in dyn) dyn.netDown = false;
  if ('leaking' in dyn) dyn.leaking = false;
};

test('every row up for the whole minute pays the bonus, at each full minute', () => {
  const s = game();
  const bonus = s.config.building.uptime.bonus;
  assert.ok(bonus > 0);
  assert.equal(uptimeOn(s), true);
  advance(s, 59.9);
  assert.equal(events(s, 'uptimeBonus').length, 0);
  const cash = s.cash;
  advance(s, 0.2);
  const [e] = events(s, 'uptimeBonus');
  assert.deepEqual(e.rows.sort(), ['row-1-t-0', 'row-1-t-1']);
  assert.equal(e.total, 2 * bonus);
  assert.equal(e.minute, 1);
  assert.ok(s.cash - cash >= 2 * bonus - 1, 'paid to the cash at once');
  assert.equal(s.stats.uptime, 2 * bonus);
  advance(s, 60);
  assert.equal(events(s, 'uptimeBonus').length, 2);
  assert.equal(results(s).uptime, 4 * bonus);
  assert.ok(resultsText(s).includes(`uptime bonuses $${4 * bonus}`));
});

test('a row that goes down during the minute misses it, and is back on track the minute after it is up', () => {
  const s = game();
  advance(s, 10);
  const a = raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 2);
  assert.equal(rowUp(s, 'row-1-t-0'), false);
  assert.equal(uptimeOnTrack(s, 'row-1-t-0'), false);
  assert.equal(uptimeOnTrack(s, 'row-1-t-1'), true);
  clearAlarm(s, a);
  advance(s, 50); // to the first minute
  assert.deepEqual(events(s, 'uptimeBonus')[0].rows, ['row-1-t-1']);
  assert.equal(uptimeOnTrack(s, 'row-1-t-0'), true, 'up at the start of the next minute');
  advance(s, 60);
  assert.equal(events(s, 'uptimeBonus')[1].rows.length, 2);
});

test('a hall at 90% (one coolant unit leaking) still counts; a hall without water (50%) does not', () => {
  const s = game();
  build(s, 'cdu-1-b');
  advance(s, 9);
  advance(s, 60 - (s.t % 60) + 0.1); // the start of a fresh minute
  const before = events(s, 'uptimeBonus').length;
  const leak = raiseAlarm(s, 'leak', 'cdu-1-t');
  advance(s, 25); // at 90% for 25 s, then fixed before its 30 s clock spreads the leak
  assert.ok(Math.abs(s.equip['row-1-t-0'].level - 0.9) < 1e-6, 'throttled to 90%');
  assert.equal(rowUp(s, 'row-1-t-0'), true);
  clearAlarm(s, leak);
  advance(s, 34.9);
  assert.equal(events(s, 'uptimeBonus')[before].rows.length, 2);
  const dry = game({ pumps: { chillersPerGlycolPump: 2, cdusPerGlycolPump: 2, hallsPerWaterPump: 0, noWaterFactor: 0.5 } });
  advance(dry, 61);
  assert.deepEqual(events(dry, 'uptimeBonus')[0].rows, []);
  assert.equal(dry.stats.uptime, 0);
});

test('a row built during the minute waits for the next', () => {
  const s = game();
  advance(s, 5);
  build(s, 'row-1-t-2');
  advance(s, 56);
  assert.equal(events(s, 'uptimeBonus')[0].rows.includes('row-1-t-2'), false);
  advance(s, 60);
  assert.equal(events(s, 'uptimeBonus')[1].rows.includes('row-1-t-2'), true);
});

test('no bonus while the tutorial\'s lessons run, when switched off, or in the classic game', () => {
  const s = game();
  setScripted(s, true);
  advance(s, 61);
  assert.equal(events(s, 'uptimeBonus').length, 0);
  const off = game({ uptime: { enabled: false, bonus: 40, floor: 0.9 } });
  advance(off, 61);
  assert.equal(events(off, 'uptimeBonus').length, 0);
  assert.equal(uptimeOnTrack(off, 'row-1-t-0'), null);
  const classic = createGame({ seed: 1, config: { tutorial: false } });
  assert.equal(uptimeOn(classic), false);
});

// Screen (spec 4.1).
test('screen: floats from each paid row, the HUD line for 2 s, the inspect line, the intro and the results', async () => {
  const { createFeel2, feelEvents2 } = await import('../src/ui/feel2.js');
  const { moneyModel, UPTIME_SHOW } = await import('../src/ui/hud2.js');
  const { inspectInfo } = await import('../src/ui/inspect.js');
  const { createIntros, updateIntros, uptimeText } = await import('../src/ui/intros.js');
  const { resultsPanel } = await import('../src/ui/results.js');
  const { formatClock } = await import('../src/core/index2.js');
  const s = game();
  const feel = createFeel2();
  const intros = createIntros();
  const seen = new Set();
  advance(s, 10);
  assert.deepEqual(inspectInfo(s, 'row-1-t-0').lines.slice(-1), ['Uptime bonus: on track']);
  const a = raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 2);
  assert.deepEqual(inspectInfo(s, 'row-1-t-0').lines.slice(-1), ['Uptime bonus: missed this minute']);
  clearAlarm(s, a);
  while (s.t < 60.2) {
    step(s, 0.05);
    feelEvents2(feel, s.events.splice(0), s);
    const t = updateIntros(intros, s);
    if (t) seen.add(t);
  }
  const bonus = s.config.building.uptime.bonus;
  assert.equal(feel.floats.filter((f) => f.text === `+$${bonus}`).length, 1, 'one row was paid');
  assert.equal(moneyModel(s).uptime, `+$${bonus} uptime`);
  advance(s, UPTIME_SHOW + 0.1);
  assert.equal(moneyModel(s).uptime, null);
  for (let i = 0; i < 20; i++) { step(s, 0.05); const t = updateIntros(intros, s); if (t) seen.add(t); }
  assert.ok(seen.has(uptimeText(bonus)));
  assert.equal(uptimeText(40), 'Every rack row that stays up a full minute earns a $40 bonus. Backups protect it.');
  assert.ok(uptimeText(120).length <= 110);
  const r = results(s);
  const panel = resultsPanel(r, { isNew: true, best: r }, formatClock);
  assert.ok(panel.lines.some(([k, v]) => k === 'Uptime bonuses' && v === `$${bonus}`));
});
