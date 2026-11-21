// Pass 8 spec 4.3 (M47): do a sixth and seventh tech still pay for themselves with warnings? The
// compute-first builder posting its crew, capped at 5, 7 and 9 techs. node scripts/crew8.mjs [seeds]
import { playRun } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const config = { tutorial: false, building: { enabled: true } };
for (const maxCrew of [5, 7, 9]) {
  let score = 0;
  let len = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = playRun({ seed, config, builder: 'builder', policy: 'none', posts: true, maxCrew, maxSeconds: 1800 });
    score += r.score ?? r.earned;
    len += r.seconds;
  }
  console.log(`| Up to ${maxCrew} techs | score $${Math.round(score / seeds).toLocaleString('en-US')} | run ${(len / seeds / 60).toFixed(1)} min |`);
}
