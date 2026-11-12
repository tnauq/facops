import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, formatClock, playRound, results, resultsText, step } from '../src/core/index.js';
import { escalationsText, resultsPanel } from '../src/ui/results.js';
import { recordBest } from '../src/ui/best.js';
import { copyLabel, copyText } from '../src/ui/copy.js';

function finished(seed) {
  const s = createGame({ seed });
  while (!s.over) step(s, 0.05);
  return s;
}

test('an unplayed round: headline numbers, escalations, nothing cleared', () => {
  const r = results(finished(3));
  const p = resultsPanel(r, recordBest(null, r), formatClock);
  assert.deepEqual(p.big.map((b) => b.label), ['survived', 'delivered', 'of possible']);
  assert.equal(p.big[0].value, formatClock(r.seconds));
  assert.equal(p.big[1].value, `${r.energyGwh.toFixed(2)} GWh`);
  assert.equal(p.big[2].value, `${Math.round(r.shareOfPossible * 100)}%`);
  const lines = Object.fromEntries(p.lines);
  assert.equal(lines['Time to clear'], 'none cleared');
  assert.equal(lines['Matching hat'], 'no fixes');
  // This seed escalates: 2 row shutdowns, 1 dark hall and 1 network spread, nothing else.
  assert.deepEqual([r.rowShutdowns, r.hallDark, r.spreads, r.bursts, r.secondChillers], [2, 1, 1, 0, 0]);
  assert.equal(lines.Escalations, '2 row shutdowns, 1 dark hall, 1 network spread');
  assert.equal(p.bestLine, 'New best!');
});

test('a played round lists every number from spec 10', () => {
  // The scripted player from the rules engine; playRound returns the round's results.
  const r = playRound({ seed: 8 });
  assert.ok(r.cleared > 0);
  const old = { energyGwh: 99, seconds: 600 };
  const p = resultsPanel(r, recordBest(old, r), formatClock);
  const lines = Object.fromEntries(p.lines);
  assert.deepEqual(Object.keys(lines), ['Green / yellow / red', 'Alarms', 'Time to clear', 'Escalations', 'Redirects', 'Matching hat']);
  assert.match(lines['Green / yellow / red'], /^\d+% \/ \d+% \/ \d+%$/);
  assert.equal(lines.Alarms, `${r.raised} raised, ${r.cleared} cleared`);
  assert.match(lines['Time to clear'], /^\d+\.\d s average, \d+ s longest$/);
  assert.equal(lines.Redirects, String(r.redirects));
  assert.match(lines['Matching hat'], /^\d+% of fixes$/);
  assert.equal(p.bestLine, 'Best: 99.00 GWh in 10:00');
});

// ---- Copy ----

test('Copy writes exactly resultsText(state) to the clipboard', async () => {
  const s = finished(5);
  let written = null;
  const outcome = await copyText(resultsText(s), {
    clipboard: { writeText: async (t) => { written = t; } },
    selectFallback: () => assert.fail('no fallback needed'),
  });
  assert.equal(outcome, 'copied');
  assert.equal(written, resultsText(s));
  assert.equal(copyLabel(outcome), 'Copied');
});

test('if the clipboard refuses, the text goes to the fallback', async () => {
  let selected = null;
  const outcome = await copyText('hello', {
    clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } },
    selectFallback: (t) => { selected = t; return true; },
  });
  assert.equal(selected, 'hello');
  assert.equal(outcome, 'selected-copied');
  assert.equal(copyLabel(outcome), 'Copied');
});

test('with no clipboard API and no copy command, the text is left selected', async () => {
  const outcome = await copyText('hello', { clipboard: undefined, selectFallback: () => false });
  assert.equal(outcome, 'selected');
  assert.equal(copyLabel(outcome), 'Select and copy');
});

test('escalations: only those that happened, or none', () => {
  const zero = { rowShutdowns: 0, hallDark: 0, spreads: 0, bursts: 0, secondChillers: 0 };
  assert.equal(escalationsText(zero), 'none');
  assert.equal(escalationsText({ ...zero, bursts: 1, secondChillers: 3 }), '1 pump burst, 3 second chillers');
});
