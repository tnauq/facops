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
