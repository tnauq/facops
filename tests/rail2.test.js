// The triage rail: costs on tickets, order, and tiles instead of pages (pass 3 spec 2.1 to 2.3, 4b.2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, createGame, raiseAlarm } from '../src/core/index2.js';
import { regions } from '../src/ui/regions.js';
import { TILE, TILE_SLOT, autoTop, maxFirst, railMode, railTickets2, scrollByDrag, slotsIn, tileRowsIn } from '../src/ui/rail2.js';

const quiet = (config = {}) => createGame({ seed: 1, config: { ...config, director: { enabled: false } } });
const inside = (r, box) => r.x >= box.x && r.y >= box.y && r.x + r.w <= box.x + box.w && r.y + r.h <= box.y + box.h;

// A full campus with n free breaker alarms (one per MSB pair, so none costs anything).
function crowded(n) {
  const s = quiet({ startHalls: 8 });
  let k = 0;
  for (let hall = 1; hall <= 8 && k < n; hall++) {
    for (const half of ['t', 'b']) {
      if (k >= n) break;
      raiseAlarm(s, 'breaker', `msb-${hall}-${half}-A`);
      k++;
    }
  }
  return s;
}

test('tickets carry what their alarm costs now', () => {
  const s = quiet({ startHalls: 2 });
  raiseAlarm(s, 'network', 'row-2-b-1');
  raiseAlarm(s, 'breaker', 'msb-1-t-A');
  advance(s, 1);
  const { tickets } = railTickets2(s, regions(844, 390).rail);
  assert.equal(tickets[0].place, 'H2 bottom');
  assert.equal(tickets[0].costText, '−6 MW');
  assert.equal(tickets[1].costText, '');
});

test('7 tickets fit on the iPhone and 5 at 660 x 300; past that, tiles fit twice as many', () => {
  const big = regions(844, 390).rail;
  const small = regions(660, 300).rail;
  assert.equal(slotsIn(big.h), 7);
  assert.equal(slotsIn(small.h), 5);
  assert.equal(tileRowsIn(big.h), 7);
  assert.equal(tileRowsIn(small.h), 5);
  assert.deepEqual(railMode(big.h, 7), { compact: false, rows: 7, capacity: 7 });
  assert.deepEqual(railMode(big.h, 8), { compact: true, rows: 7, capacity: 14 });
  assert.deepEqual(railMode(small.h, 6), { compact: true, rows: 5, capacity: 10 });
});

for (const [W, H, n] of [[844, 390, 14], [660, 300, 10]]) {
  test(`at ${W} x ${H}: ${n} alarms all show at once as 44 px tiles inside the rail, with no note and no scrolling`, () => {
    const s = crowded(n);
    const rail = regions(W, H).rail;
    const r = railTickets2(s, rail);
    assert.equal(r.compact, true);
    assert.equal(r.tickets.length, n);
    assert.equal(r.more, null);
    assert.equal(maxFirst(rail.h, n), 0);
    for (const t of r.tickets) {
      assert.ok(inside(t, rail), JSON.stringify(t));
      assert.equal(t.w, TILE);
      assert.equal(t.h, TILE);
    }
    // Two across, in triage order: left to right, then down.
    assert.equal(r.tickets[0].y, r.tickets[1].y);
    assert.ok(r.tickets[1].x > r.tickets[0].x);
    assert.ok(r.tickets[2].y > r.tickets[0].y);
    // No two tiles overlap.
    for (const a of r.tickets) for (const b of r.tickets) {
      if (a === b) continue;
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
    }
  });
}

test('a few alarms are full tickets, as before', () => {
  const r = railTickets2(crowded(3), regions(844, 390).rail);
  assert.equal(r.compact, false);
  assert.equal(r.tickets.length, 3);
  assert.equal(r.tickets[0].h, 44);
  assert.ok(r.tickets[0].w > 44);
});

test('only when even the tiles overflow: a "+N" note, and a drag reaches the rest', () => {
  const s = crowded(16);
  const rail = regions(660, 300).rail; // room for 10 tiles
  const r = railTickets2(s, rail);
  assert.equal(r.tickets.length, 10);
  assert.equal(r.more.text, '+6');
  assert.equal(maxFirst(rail.h, 16), 3);
  const end = railTickets2(s, rail, null, scrollByDrag(0, TILE_SLOT * 50, rail.h, 16));
  assert.equal(end.first, 3);
  assert.equal(end.more, null);
  assert.equal(end.tickets.at(-1).id, railTickets2(s, rail, null, 3).tickets.at(-1).id);
  assert.equal(scrollByDrag(0, -TILE_SLOT * 3, rail.h, 16), 0);
  assert.equal(scrollByDrag(1, 10, rail.h, 16), 1); // less than half a row: no change
});

test('a scroll position past the end is pulled back as alarms clear', () => {
  const rail = regions(660, 300).rail;
  assert.equal(railTickets2(crowded(16), rail, null, 99).first, 3);
  assert.equal(railTickets2(crowded(3), rail, null, 5).first, 0);
});

test('a new alarm that costs more than everything in view sends the rail back to the top', () => {
  const s = crowded(16);
  const rail = regions(660, 300).rail;
  let known = new Set();
  ({ known } = autoTop(s, rail, 3, known));
  let r = autoTop(s, rail, 3, known);
  assert.equal(r.first, 3); // nothing new: stays where the player put it
  raiseAlarm(s, 'network', 'row-5-t-0');
  advance(s, 0.1);
  r = autoTop(s, rail, 3, r.known);
  assert.equal(r.first, 0);
  // Once seen, scrolling down past it is allowed.
  r = autoTop(s, rail, 3, r.known);
  assert.equal(r.first, 3);
});

test('tiles stay until the alarms fit as tickets with 3 slots to spare, so the rail does not flip (pass 4 spec 3.5)', async () => {
  const { BACK_TO_TICKETS } = await import('../src/ui/rail2.js');
  const rail = regions(844, 390).rail; // 7 ticket slots
  assert.equal(BACK_TO_TICKETS, 3);
  assert.equal(railMode(rail.h, 8).compact, true);
  // Coming down from tiles: still tiles at 7, 6 and 5 alarms...
  for (const n of [7, 6, 5]) assert.equal(railMode(rail.h, n, true).compact, true, `${n} alarms`);
  // ...tickets again at 4.
  assert.equal(railMode(rail.h, 4, true).compact, false);
  // Going up from tickets: tickets until they overflow.
  assert.equal(railMode(rail.h, 7, false).compact, false);
  const r = railTickets2(crowded(6), rail, null, 0, true);
  assert.equal(r.compact, true);
  assert.equal(r.tickets[0].w, TILE);
});

test('a tap on the rail just after it changed between tickets and tiles does not count', async () => {
  const { RAIL_SETTLE_MS, railTapCounts } = await import('../src/ui/rail2.js');
  assert.equal(railTapCounts(null, 1000), true);
  assert.equal(railTapCounts(1000, 1000 + RAIL_SETTLE_MS - 1), false);
  assert.equal(railTapCounts(1000, 1000 + RAIL_SETTLE_MS), true);
});
