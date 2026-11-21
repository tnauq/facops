// Pass 8 spec 3.3 (M46): does posting the crew cut income lost to outages? Same seeds, same builder,
// with and without posts. Lost income is the delivered shortfall over the first `minutes`.
//   node scripts/posts8.mjs [seeds] [minutes] [config JSON]
import { playRun } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const minutes = Number(process.argv[3] ?? 15);
const extra = JSON.parse(process.argv[4] ?? '{}');
const config = { tutorial: false, ...extra, building: { enabled: true, posts: { enabled: true, returnAfter: 3 }, ...(extra.building ?? {}) } };
const income = 4 / 6.25; // dollars a second per MW (a row: $4 a second for 6.25 MW)
const timeScale = 60;
const lost = (r) => (r.state.stats.possibleMwh - r.state.stats.energyMwh) * 3600 / timeScale * income;

const rows = [];
for (const posts of [false, true, 'nopriority']) {
  let total = 0;
  let earned = 0;
  let len = 0;
  let warned = 0;
  let caught = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = playRun({ seed, config, builder: 'builder', policy: 'none', posts, maxSeconds: minutes * 60 });
    total += lost(r);
    earned += r.earned;
    len += r.seconds;
    warned += r.state.stats.warned ?? 0;
    caught += r.state.stats.caught ?? 0;
  }
  rows.push({ posts, lost: total / seeds, rate: total / (len / 60), earned: earned / seeds, seconds: len / seeds, caught: warned ? caught / warned : 0 });
}
console.log(`Seeds 1 to ${seeds}, first ${minutes}:00, compute-first builder.`);
for (const r of rows) console.log(`| ${r.posts === 'nopriority' ? 'Posts, no priority' : r.posts ? 'Posts its crew, priority on the busiest hall' : 'No posts'} | income lost to outages $${Math.round(r.lost).toLocaleString('en-US')} ($${Math.round(r.rate)} a minute) | earned $${Math.round(r.earned).toLocaleString('en-US')} | ran ${(r.seconds / 60).toFixed(1)} min | warnings caught ${Math.round(r.caught * 100)}% |`);
