// Progress and support (pass 9 spec 6, M57): buildRole against hand-made lists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, advance, build, buildRole, createGame, hire, plantNeeds, progressMeter, results } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = () => createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true, startCash: 1e6, burn: NO_BURN } } });
const roles = (s, ids) => Object.fromEntries(ids.map((id) => [id, buildRole(s, id)]));

test('a starting campus: what opens the next rows is progress, backups are support', () => {
  const s = game();
  assert.deepEqual(roles(s, ['row-1-t-2', 'row-1-b-0', 'rmu-1-b', 'xfmr-1-b-A', 'msb-1-b-B', 'cdu-1-b', 'xfmr-1-t-B', 'msb-1-t-B', 'rmu-2-t', 'cdu-2-t']), {
    'row-1-t-2': 'progress',
    'row-1-b-0': 'progress',
    'rmu-1-b': 'progress',
    'xfmr-1-b-A': 'progress', // no side bought yet in the bottom half: either side opens it
    'msb-1-b-B': 'progress',
    'cdu-1-b': 'support', // Hall 1 has its top CDU
    'xfmr-1-t-B': 'support', // the top half runs on side A
    'msb-1-t-B': 'support',
    'rmu-2-t': 'progress',
    'cdu-2-t': 'progress',
  });
  assert.equal(buildRole(s, 'hire'), 'support');
  assert.equal(buildRole(s, 'upgrade'), 'support');
});

test('plant equipment is progress up to what the rows need, one hall ahead; spares beyond are support', () => {
  const s = game();
  const need = plantNeeds(s); // 2 rows + a hall ahead: 8 rows
  assert.deepEqual(need, { chillers: 2, dry: 1, glycol: 1, water: 1, cdus: 2 });
  assert.equal(buildRole(s, 'chiller-A-1'), 'progress', 'one chiller built, two needed');
  assert.equal(buildRole(s, 'dry-A-1'), 'support', 'one dry cooler runs two chillers');
  assert.equal(buildRole(s, 'gpump-A-2'), 'support', 'two glycol pumps built, one needed');
  assert.equal(buildRole(s, 'wpump-A-1'), 'support');
  build(s, 'chiller-A-1');
  assert.equal(buildRole(s, 'chiller-A-2'), 'support', 'now a spare');
});

test('a full campus: every row, path and first CDU is progress; the rest is support', () => {
  const s = game();
  for (const e of EQUIPMENT) if (!s.equip[e.id].built) build(s, e.id);
  advance(s, 9);
  const progress = EQUIPMENT.filter((e) => buildRole(s, e.id) === 'progress');
  const byType = (t) => progress.filter((e) => e.type === t).length;
  assert.equal(byType('row'), 48);
  assert.equal(byType('rmu'), 16);
  assert.equal(byType('xfmr'), 16, 'one side per half');
  assert.equal(byType('msb'), 16);
  assert.equal(byType('cdu'), 8, 'one per hall');
  // Plant pieces bought before the rows they serve are judged on the rows bought so far, so with
  // everything bought at once only the first count as progress; never more than the rows need.
  const need = plantNeeds(s);
  assert.equal(need.chillers, 8);
  assert.ok(byType('chiller') >= 1 && byType('chiller') <= need.chillers);
});

test('a backup bought keeps its role, unless it becomes what keeps rows running', () => {
  const s = game();
  build(s, 'xfmr-2-t-B');
  assert.equal(buildRole(s, 'xfmr-2-t-B'), 'progress', 'the first side bought for Hall 2 top');
  assert.equal(buildRole(s, 'xfmr-2-t-A'), 'support');
  build(s, 'msb-1-t-B');
  assert.equal(s.roles['msb-1-t-B'], 'support');
  s.equip['msb-1-t-A'].built = false; // as if side A were never there
  s.equip['xfmr-1-t-A'].built = false;
  assert.equal(buildRole(s, 'msb-1-t-B'), 'progress');
});

test('spending splits as it is bought, and the progress meter counts rows built and at full output', () => {
  const s = game();
  build(s, 'row-1-t-2');
  build(s, 'cdu-1-b');
  hire(s, 'electrical');
  const r = results(s);
  assert.equal(r.spentProgress, s.config.building.prices.row);
  assert.equal(r.spentSupport, s.config.building.prices.cdu + s.config.building.prices.hire);
  assert.deepEqual(progressMeter(s), { built: 2, full: 2, of: 48 });
  advance(s, 8.5);
  assert.equal(progressMeter(s).built, 3);
});

test("the screen: the HUD meter, the card's role line, spots, the advisor's words and the results", async () => {
  const { progressModel } = await import('../src/ui/hud2.js');
  const { roleTag, spotInfo, spotsModel } = await import('../src/ui/spots.js');
  const { advisorLabel } = await import('../src/ui/advisor.js');
  const { resultsPanel } = await import('../src/ui/results.js');
  const { EQUIPMENT_BY_ID, formatClock } = await import('../src/core/index2.js');
  const s = game();
  assert.deepEqual(progressModel(s), { text: '2/48 rows', built: 2 / 48, full: 2 / 48 });
  const tag = (id) => roleTag(s, EQUIPMENT_BY_ID[id]).text;
  assert.equal(tag('row-1-t-2'), 'Progress · +1 row');
  assert.equal(tag('msb-2-t-A'), 'Progress · opens H2 top');
  assert.equal(tag('cdu-2-b'), 'Progress · opens H2');
  assert.equal(tag('msb-1-t-B'), 'Support · backup for H1 top');
  assert.equal(tag('cdu-1-b'), 'Support · backup for H1');
  assert.equal(tag('chiller-A-1'), 'Progress · for the next rows');
  assert.equal(tag('gpump-A-2'), 'Support · spare pump');
  assert.equal(spotInfo(s, 'cdu-1-b').role.role, 'support');
  assert.equal(spotsModel(s).find((x) => x.id === 'row-1-t-2').role, 'progress');
  assert.equal(advisorLabel(s, 'row-1-t-2'), 'Next: progress');
  build(s, 'cdu-1-b');
  const panel = resultsPanel({ ...results(s), finish: true, building: true }, { isNew: false, best: { score: 1, seconds: 1, energyGwh: 1 } }, formatClock);
  assert.deepEqual(panel.lines.find(([k]) => k === 'Spent'), ['Spent', '$0 on progress · $250 on support']);
  s.config.building.split.enabled = false;
  assert.equal(progressModel(s), null);
  assert.equal(advisorLabel(s, 'row-1-t-2'), null);
});
