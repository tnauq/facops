// After M48 (owner, 21 Nov): on a late strike visit, a wrench the CEO sees with nobody on it and about
// to fail is a sighting: a strike, no fine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };

function strikeVisitWithWrench(ceo = {}, techOnIt = false) {
  const s = createGame({ seed: 4, config: { tutorial: false, autoDispatch: { enabled: false, delay: 1 }, director: { enabled: false }, ceo: { strikeGap: [1, 1], ...ceo }, building: { enabled: true, startCash: 1e6, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, handoverAt: 1, deadline: { enabled: false, at: 960, marks: [] } } } }); // pass 9 (M55): past the deadline
  s.ceoWalks = s.config.ceo.walks.length; // the next walkthrough is a strike visit
  s.economyStart = -5000; // late in the run
  // A wrench on Hall 1's top switchboard, about to fail, kept so as the CEO walks.
  const keep = () => {
    if (!s.warnings.some((w) => w.id === 999)) s.warnings.push({ id: 999, type: 'breaker', equipId: 'msb-1-t-A', born: s.t, ends: s.t + 3, techId: techOnIt ? s.techs[0].id : null, progress: 0 });
    for (const w of s.warnings) w.ends = s.t + 3;
  };
  const sightings = [];
  for (let i = 0; i < 6000 && !s.over; i++) {
    keep();
    step(s, 0.05);
    for (const e of s.events.splice(0)) if (e.type === 'ceoSighting') sightings.push(e);
  }
  return { s, sightings };
}

test('a wrench seen on a late strike visit, with nobody on it, is a strike and no fine', () => {
  const { s, sightings } = strikeVisitWithWrench();
  const wrench = sightings.filter((e) => e.wrench);
  assert.ok(wrench.length > 0, 'the CEO saw the wrench');
  assert.ok(wrench.every((e) => e.fine === 0 && e.strike));
  assert.ok(s.ceoStrikes > 0);
});

test('not before `wrenchesFrom`, not with a tech on it, and not when switched off', () => {
  assert.equal(strikeVisitWithWrench({ wrenchesFrom: 1e9 }).sightings.filter((e) => e.wrench).length, 0);
  assert.equal(strikeVisitWithWrench({}, true).sightings.filter((e) => e.wrench).length, 0);
  assert.equal(strikeVisitWithWrench({ wrenchesCount: false }).sightings.filter((e) => e.wrench).length, 0);
});
