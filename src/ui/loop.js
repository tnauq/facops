// The fixed-step clock behind the game loop (spec section 8).
// Drawing runs once per animation frame; the rules run in fixed 0.05 s steps from an accumulator.
// At most 5 steps run per frame and the rest is dropped, so one slow frame cannot snowball.

export const STEP = 0.05;
export const MAX_STEPS = 5;

export function createClock() {
  return { acc: 0, last: null };
}

/**
 * Feed the clock the time of this frame (milliseconds, from requestAnimationFrame).
 * Calls onStep(STEP) once per due step and returns how many ran.
 * While `paused`, time passes without running steps and nothing is saved up for later.
 */
export function runFrame(clock, nowMs, onStep, paused = false) {
  const elapsed = clock.last === null ? 0 : Math.max(0, (nowMs - clock.last) / 1000);
  clock.last = nowMs;
  if (paused) {
    clock.acc = 0;
    return 0;
  }
  clock.acc += elapsed;
  let steps = 0;
  while (clock.acc >= STEP - 1e-9 && steps < MAX_STEPS) {
    onStep(STEP);
    clock.acc -= STEP;
    steps += 1;
  }
  if (steps === MAX_STEPS) clock.acc = Math.min(clock.acc, STEP); // drop the backlog
  return steps;
}
