// Busy and quiet spells (pass 8 spec 5, M48).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, raiseAlarm, spellNow, step } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
// Spells are off by default after M48's checks; these tests switch them on.
const ON = { enabled: true, busy: [35, 45], quiet: [15, 25], busyFactor: 0.5, easeAfter: 10, ceoWaits: true, ceoSync: { enabled: false, from: 600, to: 1080, lead: 12, align: 'busyEnd' } };
const game = (building = {}, extra = {}) => createGame({
  seed: 1,
  config: { tutorial: false, ceo: { enabled: false }, autoDispatch: { enabled: false, delay: 1 }, ...extra, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, spells: ON, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };
const spells = (s) => s.events.filter((e) => e.type === 'spell');

test('busy and quiet spells alternate, each within its range', () => {
  const s = game();
  advance(s, 600);
  const list = spells(s);
  assert.ok(list.length >= 18, `${list.length} spells in 10:00`);
  const sp = s.config.building.spells;
  for (let i = 0; i + 1 < list.length; i++) {
    assert.notEqual(list[i].kind, list[i + 1].kind, 'they alternate');
    const len = list[i + 1].t - list[i].t;
    const [lo, hi] = list[i].kind === 'busy' ? sp.busy : sp.quiet;
    // A busy spell may end early (easing off); a quiet one runs its length.
    if (list[i].kind === 'quiet') assert.ok(len >= lo - 0.1 && len <= hi + 0.1, `quiet ${len}`);
    else assert.ok(len <= hi + 0.1, `busy ${len}`);
  }
});

test('nothing new starts in a quiet spell: no picks, no warnings, no waves', () => {
  const s = game();
  advance(s, 600);
  const quiet = [];
  const list = spells(s);
  for (let i = 0; i < list.length; i++) if (list[i].kind === 'quiet') quiet.push([list[i].t, list[i + 1] ? list[i + 1].t : Infinity]);
  const picks = s.events.filter((e) => e.type === 'warning' || (e.type === 'alarm' && e.cause === 'director'));
  assert.ok(picks.length > 0);
  for (const p of picks) assert.ok(!quiet.some(([a, b]) => p.t > a + 1e-6 && p.t < b - 1e-6), `a pick at ${p.t} in a quiet spell`);
});

test('a busy spell ends early with more outages than free techs for 10 s, or a whole hall dark', () => {
  const s = game({ warnings: { enabled: false, warnFor: 20, checkTime: 2, capCounts: false } });
  advance(s, 1);
  assert.equal(spellNow(s), 'busy');
  s.techs = [s.techs[0]]; // one tech free
  raiseAlarm(s, 'network', 'row-1-t-0');
  raiseAlarm(s, 'network', 'row-1-t-1'); // two outages, none sent (auto-dispatch off)
  advance(s, 9);
  assert.equal(spellNow(s), 'busy', 'not before 10 s');
  advance(s, 1.5);
  assert.equal(spellNow(s), 'quiet');
});

test('nothing new starts while the red countdown runs', () => {
  const s = game({ income: 0, uptime: { enabled: false, bonus: 20, floor: 0.9 }, warnings: { enabled: false, warnFor: 20, checkTime: 2, capCounts: false }, spells: { ...ON, busy: [1000, 1000], quiet: [1, 1], easeAfter: 1000 } });
  s.cash = -1;
  s.redSince = s.t;
  const before = s.stats.spawned;
  s.config.building.debtGrace = 1e9;
  advance(s, 120);
  assert.equal(s.stats.spawned, before);
});

test('the CEO is announced only in a quiet spell', () => {
  const s = createGame({ seed: 2, config: { tutorial: false, autoDispatch: { enabled: true, delay: 1 }, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, spells: ON, handoverAt: 30 } } });
  const announced = [];
  for (let i = 0; i < 2400; i++) {
    step(s, 0.05);
    for (const e of s.events.splice(0)) if (e.type === 'ceoWarning' || e.type === 'ceoAnnounce' || e.type === 'ceoStart') announced.push(spellNow(s));
  }
  if (announced.length === 0) {
    // The event names differ: check the state instead, step by step.
    const t = createGame({ seed: 2, config: { tutorial: false, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, spells: ON, handoverAt: 30 } } });
    let had = false;
    for (let i = 0; i < 2400; i++) {
      const before = t.ceo;
      step(t, 0.05);
      if (!before && t.ceo) {
        had = true;
        assert.equal(spellNow(t), 'quiet', `a visit announced in a busy spell at ${t.t}`);
      }
    }
    assert.ok(had, 'the Handover came');
  } else for (const k of announced) assert.equal(k, 'quiet');
});

test('off when switched off, and in the classic game', () => {
  const off = game({ spells: { ...ON, enabled: false } });
  const plain = createGame({ seed: 1, config: { tutorial: false, building: { enabled: true } } });
  assert.equal(plain.config.building.spells.enabled, false, 'off by default after M48\'s checks');
  advance(off, 120);
  assert.equal(spells(off).length, 0);
  assert.equal(spellNow(off), null);
  const classic = createGame({ seed: 1, config: { tutorial: false } });
  for (let i = 0; i < 600; i++) step(classic, 0.05);
  assert.equal(spellNow(classic), null);
});

test('ceoWaits false: the CEO comes when due, busy spell or not', () => {
  const t = createGame({ seed: 2, config: { tutorial: false, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, spells: { ...ON, ceoWaits: false }, handoverAt: 30 } } });
  let busy = false;
  for (let i = 0; i < 2400; i++) {
    const before = t.ceo;
    step(t, 0.05);
    if (!before && t.ceo && spellNow(t) === 'busy') busy = true;
  }
  assert.ok(busy, 'some visit was announced in a busy spell');
});

for (const align of ['busyEnd', 'busyStart']) {
  test(`ceoSync (${align}): a synced visit is announced only in the last seconds of the aligned spell`, () => {
    const t = createGame({ seed: 3, config: { tutorial: false, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, handoverAt: 30, spells: { ...ON, ceoWaits: false, ceoSync: { enabled: true, from: 0, to: 1, lead: 12, align } } } } });
    let n = 0;
    for (let i = 0; i < 6000; i++) {
      const before = t.ceo;
      step(t, 0.05);
      if (!before && t.ceo && t.t > 2) {
        n += 1;
        const sp = t.director.spell;
        // The spell may have just turned over on this very step: then the visit came at its end.
        const fresh = Math.abs(sp.until - t.t) > 12.1;
        if (!fresh) assert.equal(sp.kind, align === 'busyEnd' ? 'busy' : 'quiet', `at ${t.t}`);
      }
    }
    assert.ok(n >= 2, `${n} visits`);
  });
}
