// Device introductions after the tutorial (pass 3 spec 4b.4). Pure.
// The map has no captions, so the first Network Failure and the first Pump Overpressure of a run
// that began with the tutorial each get a one-line callout naming the device, for a few seconds.
// An introduction never covers a CEO warning: it waits until the warning is over.

export const INTRO_SECONDS = 6;

export const INTRO_TEXT = {
  network: 'A rack row lost its network. Racks are the computers: down racks deliver nothing.',
  pump: "A pump's pressure is climbing. Fix it before the pipe bursts and floods two halls' coolant units.",
};

/** A fresh set of introductions: none given yet. */
export function createIntros() {
  return { given: new Set(), queue: [], text: '', ids: [], until: 0 };
}

/**
 * Advance one frame. Returns the callout to show now ('' when none). `ids` on the intros object
 * holds the alarm the current callout is about, so the screen can keep the callout clear of it.
 */
export function updateIntros(intros, state) {
  for (const a of state.alarms) {
    if (INTRO_TEXT[a.type] && !intros.given.has(a.type)) {
      intros.given.add(a.type);
      intros.queue.push({ type: a.type, id: a.id });
    }
  }
  if (intros.text && state.t < intros.until) return intros.text;
  intros.text = '';
  intros.ids = [];
  const warning = state.ceo !== null && state.ceo !== undefined && state.ceo.phase === 'warning';
  if (intros.queue.length > 0 && !warning) {
    const next = intros.queue.shift();
    intros.text = INTRO_TEXT[next.type];
    intros.ids = state.alarms.some((a) => a.id === next.id) ? [next.id] : [];
    intros.until = state.t + INTRO_SECONDS;
  }
  return intros.text;
}
