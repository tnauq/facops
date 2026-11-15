// The hire and upgrade card, and the Hire card in the crew bar (pass 4 M26).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buyUpgrade, createGame, hire } from '../src/core/index2.js';
import { crewCards } from '../src/ui/crewbar.js';
import { reduceFlow } from '../src/ui/flow.js';
import { crewColumns, regions } from '../src/ui/regions.js';
import { hireCardText, shopModel } from '../src/ui/shop.js';

const game = (cash = 600) => createGame({ seed: 1, config: { tutorial: false, director: { enabled: false }, building: { enabled: true, startCash: cash } } });

test('four trades to hire and three upgrades, greyed when the cash is short', () => {
  const s = game(450);
  const m = shopModel(s);
  assert.deepEqual(m.items.map((i) => i.action), ['hire-electrical', 'hire-mechanical', 'hire-ce', 'hire-network', 'upgrade-carts', 'upgrade-tools', 'upgrade-radios']);
  assert.equal(m.items[0].priceText, '$400');
  assert.equal(m.items[0].detail, '1 on the crew');
  assert.equal(m.items[2].detail, 'None yet');
  assert.ok(m.items.slice(0, 4).every((i) => i.enabled));
  assert.ok(m.items.slice(4).every((i) => !i.enabled), '$500 upgrades are out of reach with $450');
  assert.match(m.cashText, /^Cash \$450/);
});

test('an upgrade at its limit says Done', () => {
  const s = game(5000);
  buyUpgrade(s, 'radios');
  const radios = shopModel(s).items.find((i) => i.upgrade === 'radios');
  assert.equal(radios.enabled, false);
  assert.equal(radios.detail, 'Done');
  hire(s, 'network');
  assert.equal(shopModel(s).items.find((i) => i.trade === 'network').detail, '1 on the crew');
});

test('the crew bar ends with the Hire card in building mode, sized like a tech', () => {
  const s = game();
  const rect = regions(844, 390).crew;
  const cards = crewCards(s, rect, null, { columns: crewColumns(390, s.techs.length + 1), hire: true });
  assert.equal(cards.length, 3);
  const last = cards.at(-1);
  assert.equal(last.id, 'hire');
  assert.equal(last.w, cards[0].w);
  assert.ok(last.h >= 44 && last.w >= 44);
  assert.deepEqual(hireCardText(s), { title: 'Hire', price: '$400' });
  // A crew of nine plus the Hire card still fits the bar on the small phone.
  for (let i = 0; i < 7; i++) s.techs.push({ ...s.techs[0], id: `tech-x${i}` });
  const small = regions(660, 300, { crewColumns: crewColumns(300, 10) }).crew;
  const many = crewCards(s, small, null, { columns: crewColumns(300, 10), hire: true });
  for (const c of many) assert.ok(c.y + c.h <= small.y + small.h + 0.5, JSON.stringify(c));
});

test('the card opens from play and closes back to play', () => {
  assert.equal(reduceFlow('playing', 'shop').mode, 'shop');
  assert.equal(reduceFlow('shop', 'continue').mode, 'playing');
  assert.equal(reduceFlow('paused', 'shop').mode, 'paused');
});
