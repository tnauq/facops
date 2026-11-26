// A big crew scrolls (fix, 25 November): the game froze with 33 crew cards on a phone, and the cards
// had shrunk far below a tap target. Cards now stay at least 44 px and the bar scrolls a row at a time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, hire } from '../src/core/index2.js';
import { CARD_MIN_HEIGHT, clampCrewFirst, crewByDrag, crewCards, crewMore, crewScroll } from '../src/ui/crewbar.js';
import { crewColumns, regions } from '../src/ui/regions.js';

const crewOf = (perTrade) => {
  const s = createGame({ seed: 1, config: { building: { enabled: true } } });
  for (let n = 0; n < perTrade; n++) for (const t of s.config.hireTieOrder) {
    s.cash += 10000;
    hire(s, t);
  }
  return s;
};
// The crew bar at 660 x 300, as the screen lays it out.
const barFor = (s, H = 300) => {
  const count = s.techs.length + 1; // and the Hire card
  const columns = crewColumns(H, count);
  return { rect: regions(660, H, { crewColumns: columns }).crew, columns, count };
};

test('a small crew fits without scrolling, as before', () => {
  const s = crewOf(0);
  const { rect, columns, count } = barFor(s);
  assert.equal(crewScroll(count, rect, columns).max, 0);
  assert.equal(crewCards(s, rect, null, { columns, hire: true }).length, count);
  assert.deepEqual(crewMore(count, rect, columns), { above: 0, below: 0 });
});

for (const H of [270, 300, 390]) {
  test(`34 techs at ${H} px tall: every card shown is a full tap target, and the bar scrolls to the Hire card`, () => {
    const s = crewOf(8);
    const { rect, columns, count } = barFor(s, H);
    const sc = crewScroll(count, rect, columns);
    assert.ok(sc.max > 0);
    const top = crewCards(s, rect, null, { columns, hire: true });
    assert.ok(top.every((c) => c.h >= CARD_MIN_HEIGHT), 'no card is shorter than 44 px');
    assert.ok(top.every((c) => c.y >= rect.y && c.y + c.h <= rect.y + rect.h + 0.01), 'every card is inside the bar');
    assert.equal(top.length, sc.fit * columns);
    assert.equal(top[0].id, s.techs[0].id);
    assert.equal(top.some((c) => c.kind === 'hire'), false);
    assert.deepEqual(crewMore(count, rect, columns, 0), { above: 0, below: count - top.length });
    const bottom = crewCards(s, rect, null, { columns, hire: true, first: sc.max });
    assert.equal(bottom.at(-1).kind, 'hire', 'the Hire card is at the end');
    assert.equal(crewMore(count, rect, columns, sc.max).below, 0);
    assert.ok(crewMore(count, rect, columns, sc.max).above > 0);
  });
}

test('scrolling stays in range and goes a row per card height dragged', () => {
  const s = crewOf(8);
  const { rect, columns, count } = barFor(s);
  const { max } = crewScroll(count, rect, columns);
  assert.equal(clampCrewFirst(-3, count, rect, columns), 0);
  assert.equal(clampCrewFirst(99, count, rect, columns), max);
  assert.equal(crewByDrag(0, 2 * (CARD_MIN_HEIGHT + 4), count, rect, columns), 2);
  assert.equal(crewByDrag(2, -500, count, rect, columns), 0);
});
