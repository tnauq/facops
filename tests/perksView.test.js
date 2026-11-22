import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/core/index2.js';
import { maybeCall, visitEnded } from '../src/core/perks.js';
import { perkCard, perkLine, perkNote, rescueCard, warrantyHalls } from '../src/ui/perksView.js';
import { ledger } from '../src/ui/ledger.js';
import { reduceFlow } from '../src/ui/flow.js';
import { tuning2 } from '../src/ui/tuning2.js';

const game = () => {
  const s = createGame({ seed: 1, config: { tutorial: false, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true } } });
  visitEnded(s, 0); // makes the perks state
  s.perks.offer = null;
  return s;
};

test('no card without an offer; two perks with one line each when offered', () => {
  const s = game();
  assert.equal(perkCard(s), null);
  s.perks.offer = ['bulk', 'patient'];
  const card = perkCard(s);
  assert.equal(card.perks.length, 2);
  assert.match(card.perks[0].line, /6 rack rows/);
  assert.match(card.perks[1].line, /1:30/);
  for (const p of ['bulk', 'signing', 'fast', 'warranty', 'loyal', 'patient']) assert.ok(perkLine(s, p).length > 10);
});

test('the warranty offers the online halls, or all eight before any is online', () => {
  const halls = warrantyHalls(game());
  assert.ok(halls.length >= 1 && halls.every((h) => h >= 1 && h <= 8));
});

test('the note shows the perk with the least time left', () => {
  const s = game();
  assert.equal(perkNote(s), null);
  s.perks.fastUntil = s.t + 80;
  s.perks.patientUntil = s.t + 30;
  assert.deepEqual(perkNote(s), { long: 'Patient customers · 0:30', short: '0:30' });
});

test('the call lists the funding round until it is used, and is null while closed', () => {
  const s = game();
  assert.equal(rescueCard(s), null);
  maybeCall(s);
  const card = rescueCard(s);
  assert.match(card.countdown, /to get back above \$0/);
  assert.ok(card.ways.some((w) => w.action === 'rescue-fund'));
  s.rescue.funded = true;
  assert.ok(!rescueCard(s).ways.some((w) => w.action === 'rescue-fund'));
});

test('both cards hold the game and close back to playing', () => {
  assert.equal(reduceFlow('playing', 'perk').mode, 'perk');
  assert.equal(reduceFlow('perk', 'continue').mode, 'playing');
  assert.equal(reduceFlow('playing', 'rescue').mode, 'rescue');
  assert.equal(reduceFlow('rescue', 'promises').mode, 'promises');
  assert.equal(reduceFlow('rescue', 'sellAsk').mode, 'sell');
});

test('the ledger still adds up with a funding round taken and partly repaid', () => {
  const s = game();
  s.stats.funding = 2000;
  s.cash += 2000;
  s.stats.burnParts.secondLoan = 300;
  s.cash -= 300;
  const l = ledger(s);
  const sum = l.soFar.reduce((a, x) => a + x.raw, 0);
  assert.ok(Math.abs(s.config.building.startCash + sum - s.cash) < 1, `${sum} vs ${s.cash}`);
});

test('the drawer has both switches', () => {
  const ids = tuning2.fields.map((f) => f.id);
  assert.ok(ids.includes('perksOn') && ids.includes('rescueOn'));
});

test('a perk countdown shows in the HUD note ahead of the offers waiting', async () => {
  const { hudModel2 } = await import('../src/ui/hud2.js');
  const s = game();
  s.perks.fastUntil = s.t + 60;
  assert.match(JSON.stringify(hudModel2(s)), /Fast contractor · 1:00/);
});
