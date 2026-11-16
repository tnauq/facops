// Crew guidance (pass 5 spec 6, M35): trade lines from config, the recommended crew, the suggested
// trade, and the hall-online advice. Advice only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALARMS2, createGame, hire } from '../src/core/index2.js';
import { crewShort, crewText, hallOnlineText, recommendedCrew, suggestedTrade, tradeLine } from '../src/ui/crewAdvice.js';
import { shopModel } from '../src/ui/shop.js';
import { createFeel2, feelEvents2, liveCelebrations } from '../src/ui/feel2.js';

const game = (cash = 5000) => createGame({ seed: 1, config: { tutorial: false, director: { enabled: false }, building: { enabled: true, startCash: cash } } });

test('each trade\'s line says what it is faster at, from the alarm table', () => {
  assert.equal(tradeLine('electrical'), 'Faster on breaker trips. The only trade for shorts and RMU faults.');
  assert.equal(tradeLine('mechanical'), 'Faster on chillers, pumps and dry coolers.');
  assert.equal(tradeLine('ce'), 'Faster on coolant leaks.');
  assert.equal(tradeLine('network'), 'Faster on network failures.');
  // Built from the table, not copied: change the table and the line follows.
  const table = { ...ALARMS2, breaker: { ...ALARMS2.breaker, trade: 'mechanical' } };
  assert.equal(tradeLine('electrical', table), 'The only trade for shorts and RMU faults.');
  assert.equal(tradeLine('mechanical', table), 'Faster on breaker trips, chillers, pumps and dry coolers.');
});

test('the recommended crew is 2, plus 1 for each hall online after the first', () => {
  const s = game();
  assert.equal(recommendedCrew(s), 2);
  s.halls = 3;
  assert.equal(recommendedCrew(s), 4);
  s.halls = 5;
  assert.equal(recommendedCrew(s), 6);
  s.config.building.crewBase = 3;
  s.config.building.crewPerHall = 2;
  assert.equal(recommendedCrew(s), 11, 'from config');
});

test('"Crew 3 · 4 recommended", amber when short of it', () => {
  const s = game();
  assert.deepEqual(crewText(s), { text: 'Crew 2 · 2 recommended', short: false });
  s.halls = 3;
  assert.deepEqual(crewText(s), { text: 'Crew 2 · 4 recommended', short: true });
  hire(s, 'network');
  hire(s, 'ce');
  assert.equal(crewShort(s), false);
  assert.deepEqual(shopModel(s).crew, { text: 'Crew 4 · 4 recommended', short: false });
});

test('the suggested trade: Electrical with three halls and one electrician; else the fewest', () => {
  const s = game();
  // Start: one electrician, one mechanic. Fewest, in the scripted builder's order: network first.
  assert.equal(suggestedTrade(s), 'network');
  s.halls = 3;
  assert.equal(suggestedTrade(s), 'electrical');
  hire(s, 'electrical');
  assert.equal(suggestedTrade(s), 'network');
  const items = shopModel(s).items.filter((i) => i.kind === 'hire');
  assert.deepEqual(items.filter((i) => i.suggested).map((i) => i.trade), ['network']);
  assert.equal(items.find((i) => i.trade === 'mechanical').note, 'Faster on chillers, pumps and dry coolers.');
});

test('a hall coming online adds the crew advice when the crew is short', () => {
  const s = game();
  s.halls = 3;
  assert.equal(hallOnlineText(s, 3), 'Hall 3 online · crew of 4 recommended');
  hire(s, 'network');
  hire(s, 'ce');
  assert.equal(hallOnlineText(s, 3), 'Hall 3 online');
  const feel = createFeel2();
  feelEvents2(feel, [{ t: s.t, type: 'hallOnline', hall: 3 }], s);
  assert.equal(liveCelebrations(feel, s.t)[0].text, 'Hall 3 online');
  s.halls = 4;
  feelEvents2(feel, [{ t: s.t, type: 'hallOnline', hall: 4 }], s);
  assert.equal(liveCelebrations(feel, s.t)[1].text, 'Hall 4 online · crew of 5 recommended');
});
