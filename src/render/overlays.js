// The HTML overlays (spec section 6.7). index.html holds the markup; this shows one card at a
// time, fills in its text, and passes button presses on as flow actions.

const root = () => document.getElementById('overlay');

/** Call once. onAction receives the button's data-action: start, resume, restart, again. */
export function bindOverlays(onAction) {
  root().addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) onAction(button.dataset.action);
  });
}

/** Show the card for `mode` ('start', 'paused' or 'over') with `fields` filled in, or hide all for 'playing'. */
export function showOverlay(mode, fields = {}) {
  const el = root();
  let shown = false;
  for (const card of el.querySelectorAll('[data-overlay]')) {
    const match = card.dataset.overlay === mode;
    card.hidden = !match;
    shown ||= match;
    if (!match) continue;
    for (const [name, value] of Object.entries(fields)) {
      const f = card.querySelector(`[data-field="${name}"]`);
      if (f) f.textContent = value;
    }
  }
  el.hidden = !shown;
}

/**
 * Build the tuning drawer's controls once, from TUNING_FIELDS (src/ui/tuning.js): a native slider
 * with its value beside it, or a checkbox. The whole row is the tap target. onChange(id, raw) runs
 * on every change; the caller saves and calls setTuningControls with the cleaned values.
 */
export function buildTuningControls(fields, onChange) {
  const box = document.getElementById('tuning-controls');
  box.textContent = '';
  for (const f of fields) {
    const row = document.createElement('label');
    row.className = 'row';
    const name = document.createElement('span');
    name.textContent = f.label;
    const input = document.createElement('input');
    input.dataset.id = f.id;
    const out = document.createElement('output');
    out.dataset.id = f.id;
    if (f.kind === 'range') {
      Object.assign(input, { type: 'range', min: f.min, max: f.max, step: f.step });
      input.addEventListener('input', () => onChange(f.id, input.value));
    } else {
      input.type = 'checkbox';
      input.addEventListener('change', () => onChange(f.id, input.checked));
    }
    row.append(name, input, out);
    box.append(row);
  }
}

/** Show the given values in the drawer. label(id, value) gives the text beside each control. */
export function setTuningControls(values, label) {
  for (const input of document.querySelectorAll('#tuning-controls input')) {
    const v = values[input.dataset.id];
    if (input.type === 'checkbox') input.checked = v;
    else input.value = String(v);
  }
  for (const out of document.querySelectorAll('#tuning-controls output')) out.textContent = label(out.dataset.id, values[out.dataset.id]);
}

/** Fill the round-over card from resultsPanel (src/ui/results.js). Resets the Copy button. */
export function setResults(panel) {
  const big = document.getElementById('results-big');
  big.textContent = '';
  for (const b of panel.big) {
    const cell = document.createElement('div');
    const value = document.createElement('b');
    value.textContent = b.value;
    const label = document.createElement('span');
    label.textContent = b.label;
    cell.append(value, label);
    big.append(cell);
  }
  const list = document.getElementById('results-lines');
  list.textContent = '';
  for (const [name, value] of panel.lines) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = name;
    const dd = document.createElement('dd');
    dd.textContent = value;
    row.append(dt, dd);
    list.append(row);
  }
  document.querySelector('[data-overlay="over"] [data-field="bestLine"]').textContent = panel.bestLine;
  document.getElementById('results-text').hidden = true;
  setCopyLabel('Copy results');
}

export function setCopyLabel(text) {
  document.getElementById('copy-button').textContent = text;
}

/**
 * The Copy fallback: show the text in a textarea, select it, and try the old copy command.
 * Returns true if that command reports success. The text stays selected either way.
 */
export function selectResultsText(text) {
  const area = document.getElementById('results-text');
  area.value = text;
  area.hidden = false;
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length); // iOS needs the range as well as select()
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

/**
 * Fill the Delivery card (pass 2 spec 7.4) from deliveryCard (src/ui/delivery.js). Each choice is a
 * button with data-action "pick-0", "pick-1" or "pick-2" and a small picture drawn by
 * drawPicture(ctx, size, cardView). With nothing to choose, the card shows Continue instead.
 */
export function setDelivery(card, drawPicture) {
  const root = document.querySelector('[data-overlay="delivery"]');
  const field = (name, text) => {
    root.querySelector(`[data-field="${name}"]`).textContent = text;
  };
  field('title', card.title);
  field('plantB', card.plantB ? 'Plant B is online too: eight more chillers and two pumps.' : '');
  field('joined', card.joinedText);
  field('prompt', card.cards.length > 0 ? 'Choose one:' : '');
  const box = document.getElementById('delivery-choices');
  box.textContent = '';
  card.cards.forEach((c, i) => {
    const button = document.createElement('button');
    button.dataset.action = `pick-${i}`;
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(44 * dpr);
    canvas.height = Math.round(44 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPicture(ctx, 44, c);
    const title = document.createElement('strong');
    title.textContent = c.title;
    const detail = document.createElement('span');
    detail.textContent = c.detail;
    button.append(canvas, title, detail);
    box.append(button);
  });
  document.getElementById('delivery-continue').hidden = card.cards.length > 0;
}
