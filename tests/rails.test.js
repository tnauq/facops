import test from 'node:test';
import assert from 'node:assert/strict';
import { assign, createGame, dispatch, nearestIdleTech, raiseAlarm, sortedAlarms, step } from '../src/core/index.js';
import { fitView } from '../src/render/campus.js';
import { CARD_MAX_HEIGHT, CARD_WIDTH, crewCards, techForKey } from '../src/ui/crewbar.js';
import { CHIP_HEIGHT, TICKET_HEIGHT, TICKET_WIDTH, railTickets, ticketBar, ticketsThatFit } from '../src/ui/rail.js';
import { regions } from '../src/ui/regions.js';
import { hitTest } from '../src/ui/hittest.js';
import { NOTHING, pruneSelection, reduceTap } from '../src/ui/selection.js';
import { screenTargets } from '../src/ui/targets.js';
import { quietGame, tick } from './helpers.js';

const SIZES = [
  [844, 390],
  [750, 340],
  [660, 300],
];
const inside = (r, box) => r.x >= box.x && r.y >= box.y && r.x + r.w <= box.x + box.w && r.y + r.h <= box.y + box.h;
const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// ---- Crew bar ----

for (const [W, H] of SIZES) {
  test(`at ${W} x ${H} the crew cards stack inside the bar, 4 px apart, at least 44 px tall`, () => {
    const s = quietGame();
    const bar = regions(W, H).crew;
    const cards = crewCards(s, bar);
    assert.equal(cards.length, 3);
    cards.forEach((c, i) => {
      assert.ok(inside(c, bar), JSON.stringify(c));
      assert.equal(c.w, CARD_WIDTH);
      assert.ok(c.h >= 44 && c.h <= CARD_MAX_HEIGHT);
      if (i > 0) assert.equal(Math.round(c.y - (cards[i - 1].y + cards[i - 1].h)), 4);
    });
    assert.equal(cards[0].y, bar.y + 4);
  });
}

test('crew cards follow crew order and say what each tech is doing', () => {
  const s = quietGame();
  const bar = regions(844, 390).crew;
  let cards = crewCards(s, bar);
  assert.deepEqual(cards.map((c) => c.name), ['Elec', 'Mech', 'CE']);
  assert.deepEqual(cards.map((c) => c.status), ['Idle', 'Idle', 'Idle']);
  const id = raiseAlarm(s, 'network', 'rack-1-0-4').id;
  assign(s, 'tech-1', id);
  cards = crewCards(s, bar, 'tech-1');
  assert.equal(cards[1].status, 'Walking');
  assert.equal(cards[1].progress, null);
  assert.deepEqual(cards.map((c) => c.selected), [false, true, false]);
  while (s.techs[1].state !== 'fixing') step(s, 0.05);
  tick(s, 1);
  cards = crewCards(s, bar);
  assert.equal(cards[1].status, 'Fixing');
  assert.ok(cards[1].progress > 0 && cards[1].progress < 1);
});

test('keys 1 to 3 are taps on the crew cards', () => {
  const s = quietGame();
  assert.deepEqual(techForKey(s, '1'), { kind: 'tech', id: 'tech-0' });
  assert.deepEqual(techForKey(s, '3'), { kind: 'tech', id: 'tech-2' });
  assert.equal(techForKey(s, '4'), null);
  assert.equal(techForKey(s, '0'), null);
  assert.equal(techForKey(s, 'a'), null);
});

// ---- Alarm rail ----

test('tickets come in the order of sortedAlarms, most urgent on top', () => {
  const s = quietGame();
  raiseAlarm(s, 'chiller', 'chiller-0'); // 60 s
  tick(s, 1);
  raiseAlarm(s, 'pump', 'pump-0'); // 20 s
  tick(s, 1);
  raiseAlarm(s, 'breaker', 'msb-2-A'); // 45 s
  const { tickets, chip } = railTickets(s, regions(844, 390).rail);
  assert.deepEqual(tickets.map((t) => t.id), sortedAlarms(s).map((a) => a.id));
  assert.deepEqual(tickets.map((t) => t.name), ['Pump', 'Breaker', 'Chiller']);
  assert.deepEqual(tickets.map((t) => t.place), ['Yard', 'H2 A', 'Yard']);
  assert.deepEqual(tickets.map((t) => t.trade), ['mechanical', 'electrical', 'mechanical']);
  assert.equal(chip, null);
  tickets.forEach((t, i) => {
    assert.equal(t.w, TICKET_WIDTH);
    assert.equal(t.h, TICKET_HEIGHT);
    if (i > 0) assert.equal(t.y - (tickets[i - 1].y + TICKET_HEIGHT), 4);
  });
});

test('the ticket bar: clock while unattended, progress while attended, solid when spent', () => {
  assert.deepEqual(ticketBar({ attended: false, clockLeft: 15, clockFraction: 0.5, progress: 0 }), { kind: 'clock', fraction: 0.5 });
  assert.deepEqual(ticketBar({ attended: true, clockLeft: 15, clockFraction: 0.5, progress: 0.3 }), { kind: 'progress', fraction: 0.3 });
  assert.deepEqual(ticketBar({ attended: false, clockLeft: Infinity, clockFraction: 0, progress: 0 }), { kind: 'spent', fraction: 1 });
  // A tech on site at a spent alarm shows the fix, not the spent bar.
  assert.deepEqual(ticketBar({ attended: true, clockLeft: Infinity, clockFraction: 0, progress: 0.6 }), { kind: 'progress', fraction: 0.6 });
});

test('a ticket shows the hat of the tech sent to it, or the queued mark', () => {
  const s = quietGame({ oneTap: true });
  const a = raiseAlarm(s, 'leak', 'cdu-1-0').id;
  assign(s, 'tech-2', a);
  const rail = regions(844, 390).rail;
  let t = railTickets(s, rail, a).tickets[0];
  assert.equal(t.assignedTrade, 'ce');
  assert.equal(t.queued, false);
  assert.equal(t.selected, true);
  // Busy everyone, then a one-tap dispatch with nobody free is queued.
  assign(s, 'tech-0', raiseAlarm(s, 'breaker', 'msb-1-A').id);
  assign(s, 'tech-1', raiseAlarm(s, 'pump', 'pump-0').id);
  const q = raiseAlarm(s, 'network', 'rack-2-1-2').id;
  assert.equal(dispatch(s, q).queued, true);
  t = railTickets(s, rail).tickets.find((x) => x.id === q);
  assert.equal(t.queued, true);
  assert.equal(t.assignedTrade, null);
});

test('how many tickets fit, with room for the chip when some are hidden', () => {
  // 844 x 390: rail 356 tall fits 7 tickets; with more alarms, 6 and the chip.
  assert.equal(ticketsThatFit(356, 7), 7);
  assert.equal(ticketsThatFit(356, 8), 6);
  // 660 x 300: rail 266 tall fits 5; with more, 4 and the chip.
  assert.equal(ticketsThatFit(266, 5), 5);
  assert.equal(ticketsThatFit(266, 9), 4);
  assert.equal(ticketsThatFit(266, 0), 0);
});

for (const [W, H] of SIZES) {
  test(`at ${W} x ${H} a crowded rail shows a +N chip and everything stays inside the rail`, () => {
    const s = quietGame();
    for (let i = 0; i < 10; i++) raiseAlarm(s, 'network', `rack-${1 + (i % 2)}-${Math.floor(i / 2) % 2}-${i % 5}`);
    const rail = regions(W, H).rail;
    const { tickets, chip } = railTickets(s, rail);
    assert.ok(chip);
    assert.equal(chip.text, `+${s.alarms.length - tickets.length}`);
    assert.equal(chip.h, CHIP_HEIGHT);
    for (const r of [...tickets, chip]) assert.ok(inside(r, rail), JSON.stringify(r));
  });
}

// ---- Tapping the rails ----

test('a crew card counts as its tech and a ticket as its alarm', () => {
  const s = quietGame();
  const a = raiseAlarm(s, 'pump', 'pump-1').id;
  const regs = regions(844, 390);
  const view = fitView(regs.map);
  const t = screenTargets(s, view, regs);
  assert.deepEqual(hitTest(center(t.cards[1]), t), { kind: 'tech', id: 'tech-1' });
  assert.deepEqual(hitTest(center(t.tickets[0]), t), { kind: 'alarm', id: a });
});

test('the top of the first ticket belongs to the ticket, not the pause button above it', () => {
  const s = quietGame();
  const a = raiseAlarm(s, 'pump', 'pump-1').id;
  const regs = regions(844, 390);
  const t = screenTargets(s, fitView(regs.map), regs);
  const top = t.tickets[0];
  assert.deepEqual(hitTest({ x: 844 - 22, y: top.y + 1 }, t), { kind: 'alarm', id: a });
  assert.deepEqual(hitTest({ x: 844 - 22, y: 20 }, t), { kind: 'button', id: 'pause' });
  // With no tickets, the button keeps its full 44 px.
  const empty = screenTargets(quietGame(), fitView(regs.map), regs);
  assert.deepEqual(hitTest({ x: 844 - 22, y: 42 }, empty), { kind: 'button', id: 'pause' });
});

for (const [W, H] of SIZES) {
  test(`at ${W} x ${H} a whole round can be played from the two rails alone`, () => {
    const regs = regions(W, H);
    const view = fitView(regs.map);
    const state = createGame({ seed: 23 });
    let selection = NOTHING;
    let sent = 0;
    let next = 0;
    const tap = (rect) => {
      const r = reduceTap(selection, hitTest(center(rect), screenTargets(state, view, regs)));
      selection = r.selection;
      if (r.assign && assign(state, r.assign.techId, r.assign.alarmId).ok) sent += 1;
    };
    while (!state.over && state.t < 900) {
      step(state, 0.05);
      selection = pruneSelection(selection, state);
      if (state.t < next) continue;
      const t = screenTargets(state, view, regs);
      // The most urgent visible ticket nobody is on, and the nearest idle tech, both from the rails.
      const ticket = t.tickets.find((x) => state.alarms.find((a) => a.id === x.id).techId === null);
      const tech = ticket && nearestIdleTech(state, ticket.id);
      if (!tech) continue;
      tap(ticket);
      tap(t.cards.find((c) => c.id === tech.id));
      next = state.t + 0.8;
    }
    assert.ok(state.over, 'the round ended');
    assert.ok(sent > 20, `only ${sent} techs sent from the rails`);
    assert.ok(state.t > 120, `round lasted only ${state.t.toFixed(0)} s`);
  });
}
