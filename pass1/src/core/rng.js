// Deterministic random numbers (mulberry32). The same seed always gives the same game.
// Every random choice in the rules goes through one of these helpers, never Math.random().

export function createRng(seed) {
  let a = seed >>> 0;
  return {
    /** Next float in [0, 1). */
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Float in [lo, hi). */
    range(lo, hi) {
      return lo + (hi - lo) * this.next();
    },
    /** One element of a non-empty array. */
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
    /** One entry of [{ weight, ... }], chosen in proportion to weight. */
    weighted(entries) {
      const total = entries.reduce((sum, e) => sum + e.weight, 0);
      let roll = this.next() * total;
      for (const e of entries) {
        roll -= e.weight;
        if (roll < 0) return e;
      }
      return entries[entries.length - 1];
    },
  };
}
