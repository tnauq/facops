// Device introductions after the tutorial (pass 3 spec 4b.4). Pure.
// The map has no captions, so the first Network Failure and the first Pump Overpressure of a run
// that began with the tutorial each get a one-line callout naming the device, for a few seconds, and
// so do the yard's first transformer short, RMU fault and fan failure (M30).
// An introduction never covers a CEO warning: it waits until the warning is over.
// Pass 5 (spec 3.2): the same place says when the construction loan is paid off, in every building
// run, tutorial or not; `devices: false` gives a run without the tutorial only that line.

export const INTRO_SECONDS = 6;
export const NOTICE_SECONDS = 4; // the loan line (pass 5 spec 3.2)

export const INTRO_TEXT = {
  network: 'A rack row lost its network. Racks are the computers: down racks deliver nothing.',
  pump: "A pump's pressure is climbing. Fix it before the pipe bursts and floods two halls' coolant units.",
  // The yard (M30).
  short: 'A transformer shorted. An electrician disconnects it at the RMU, then repairs it. Left alone, the RMU goes.',
  rmu: 'An RMU failed: both sides of that half are dark. Electricians only: this is the one to run for.',
  fan: "A dry cooler's fan stopped: with no spare, its plant's chillers stop too. Left alone, the next one goes.",
  // Not a device: the construction loan (pass 5 spec 3.2).
  loan: 'Loan paid off. The money is yours now.',
};

/** A fresh set of introductions: none given yet. */
export function createIntros({ devices = true } = {}) {
  return { given: new Set(), queue: [], text: '', ids: [], until: 0, devices };
}

/**
 * Advance one frame. Returns the callout to show now ('' when none). `ids` on the intros object
 * holds the alarm the current callout is about, so the screen can keep the callout clear of it.
 */
export function updateIntros(intros, state) {
  if (state.loanPaidAt !== null && state.loanPaidAt !== undefined && !intros.given.has('loan')) {
    intros.given.add('loan');
    intros.queue.push({ type: 'loan', id: null });
  }
  for (const a of state.alarms) {
    if (intros.devices === false) break;
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
    intros.until = state.t + (next.type === 'loan' ? NOTICE_SECONDS : INTRO_SECONDS);
  }
  return intros.text;
}
