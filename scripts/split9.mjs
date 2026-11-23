// Pass 9 spec 6.3 (M57): how the scripted builders' spending splits between progress and support.
//   node scripts/split9.mjs [seeds]
import { playRun, priceOf } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const config = { tutorial: false, building: { enabled: true } };
const pct = (a, b) => `${Math.round((100 * a) / Math.max(1, a + b))}%`;
for (const [name, builder] of [['Compute first', 'builder'], ['Never a backup', 'greedy']]) {
  let p4 = 0; let s4 = 0; let supportPieces = 0; let pieces = 0; let p = 0; let s = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    let snap = null;
    const r = playRun({ seed, config, builder, policy: 'none', maxSeconds: 1800, onStep: (st) => { if (!snap && st.halls >= 4) snap = { p: st.stats.spentProgress, s: st.stats.spentSupport }; } });
    if (snap) { p4 += snap.p; s4 += snap.s; }
    p += r.spentProgress; s += r.spentSupport;
    for (const [id, role] of Object.entries(r.state.roles ?? {})) { pieces += 1; if (role === 'support') supportPieces += priceOf(r.state, id); }
  }
  console.log(`${name}: before Hall 4, ${pct(p4, s4)} on progress; whole run ${pct(p, s)} on progress; support pieces bought: $${Math.round(supportPieces / seeds).toLocaleString('en-US')} a run (the rest of support is hires and upgrades).`);
}
