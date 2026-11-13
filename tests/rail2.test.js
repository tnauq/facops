// The triage rail: costs on tickets, order, scrolling and chips (pass 3 spec 2.1 to 2.3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, createGame, raiseAlarm } from '../src/core/index2.js';
import { regions } from '../src/ui/regions.js';
import { CHIP2_HEIGHT, autoTop, maxFirst, pageTo, railPage, railTickets2, scrollByDrag, slotsIn, SLOT } from '../src/ui/rail2.js';

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

test('slots: 7 on the iPhone, 5 at 660 x 300; with more alarms, the same counts as pass 2 on the first page', () => {
  const big = regions(844, 390).rail;
  const small = regions(660, 300).rail;
  assert.equal(slotsIn(big.h), 7);
  assert.equal(slotsIn(small.h), 5);
  assert.deepEqual(railPage(big.h, 7, 0), { up: false, shown: 7, down: false });
  assert.deepEqual(railPage(big.h, 12, 0), { up: false, shown: 6, down: true });
  assert.deepEqual(railPage(small.h, 12, 0), { up: false, shown: 4, down: true });
});

for (const [W, H] of [[844, 390], [660, 300]]) {
  test(`at ${W} x ${H}: chips are 44 px tap targets, everything stays in the rail, and every alarm can be reached`, () => {
    const s = crowded(14);
    const rail = regions(W, H).rail;
    const seen = new Set();
    let first = 0;
    for (let guard = 0; guard < 20; guard++) {
      const r = railTickets2(s, rail, null, first);
      for (const t of r.tickets) seen.add(t.id);
      for (const box of [...r.tickets, r.up, r.down].filter(Boolean)) assert.ok(inside(box, rail), JSON.stringify(box));
      for (const c of [r.up, r.down].filter(Boolean)) assert.equal(c.h, CHIP2_HEIGHT);
      if (!r.down) break;
      assert.equal(r.down.text, `+${s.alarms.length - r.first - r.tickets.length} more`);
      first = pageTo(rail.h, s.alarms.length, r.first, 1);
    }
    assert.equal(seen.size, 14);
    const last = railTickets2(s, rail, null, first);
    assert.equal(last.first, maxFirst(rail.h, 14));
    assert.equal(last.up.text, `▲ ${last.first}`);
    assert.equal(last.down, null);
    // Paging up comes back to the top.
    let f = last.first;
    for (let guard = 0; guard < 20 && f > 0; guard++) f = pageTo(rail.h, 14, f, -1);
    assert.equal(f, 0);
  });
}

test('dragging scrolls a ticket per slot and stops at the ends', () => {
  const h = regions(844, 390).rail.h;
  assert.equal(scrollByDrag(0, SLOT * 2, h, 14), 2);
  assert.equal(scrollByDrag(0, -SLOT * 3, h, 14), 0);
  assert.equal(scrollByDrag(0, SLOT * 50, h, 14), maxFirst(h, 14));
  assert.equal(scrollByDrag(3, 10, h, 14), 3); // less than half a slot: no change
});

test('a scroll position past the end is pulled back as alarms clear', () => {
  const s = crowded(14);
  const rail = regions(844, 390).rail;
  const r = railTickets2(s, rail, null, 99);
  assert.equal(r.first, maxFirst(rail.h, 14));
  const few = crowded(3);
  assert.equal(railTickets2(few, rail, null, 5).first, 0);
});

test('a new alarm that costs more than everything in view sends the rail back to the top', () => {
  const s = crowded(14);
  const rail = regions(844, 390).rail;
  let known = new Set();
  ({ known } = autoTop(s, rail, 4, known));
  let r = autoTop(s, rail, 4, known);
  assert.equal(r.first, 4); // nothing new: stays where the player put it
  raiseAlarm(s, 'network', 'row-5-t-0');
  advance(s, 0.1);
  r = autoTop(s, rail, 4, r.known);
  assert.equal(r.first, 0);
  // Once seen, scrolling down past it is allowed.
  r = autoTop(s, rail, 4, r.known);
  assert.equal(r.first, 4);
});
