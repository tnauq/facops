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
  el.classList.toggle('lesson-backdrop', mode === 'lesson'); // pass 10 (M59): the map stays readable
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
  document.querySelector('[data-overlay="over"] h1').textContent = panel.title ?? 'Round over';
  const quote = document.querySelector('[data-overlay="over"] [data-field="quote"]');
  quote.textContent = panel.quote ?? '';
  quote.hidden = !panel.quote;
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

/**
 * Fill the hire and upgrade card (pass 4 M26) from shopModel (src/ui/shop.js). Each choice is a
 * button with data-action "hire-<trade>" or "upgrade-<id>", disabled when it cannot be bought.
 */
export function setShop(model, drawPicture) {
  const root = document.querySelector('[data-overlay="shop"]');
  root.querySelector('[data-field="title"]').textContent = model.title;
  root.querySelector('[data-field="cash"]').textContent = model.cashText;
  // Pass 5 (spec 6.2): the recommended crew, amber (a band colour) when the crew is short of it.
  const crew = root.querySelector('[data-field="crew"]');
  crew.textContent = model.crew ? model.crew.text : '';
  crew.classList.toggle('short', Boolean(model.crew && model.crew.short));
  const box = document.getElementById('shop-choices');
  box.textContent = '';
  for (const item of model.items) {
    const button = document.createElement('button');
    button.dataset.action = item.action;
    button.disabled = !item.enabled;
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(30 * dpr);
    canvas.height = Math.round(30 * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPicture(ctx, 30, item);
    const title = document.createElement('strong');
    title.textContent = item.title;
    const detail = document.createElement('span');
    detail.textContent = item.detail;
    const price = document.createElement('em');
    price.textContent = item.priceText;
    // The suggested trade's tag sits on the detail line, so it costs no height on a small screen.
    if (item.suggested) {
      const tag = document.createElement('b');
      tag.className = 'suggested';
      tag.textContent = 'Suggested';
      detail.append(' ', tag);
    }
    button.append(canvas, title, detail);
    if (item.note) {
      const role = document.createElement('span');
      role.className = 'role';
      role.textContent = item.note;
      button.append(role);
    }
    button.append(price);
    box.append(button);
  }
}

/**
 * The bundles card (pass 7 spec 4.2): one button per bundle, with its pieces, its extras and their
 * reasons, and its price (or how much more is needed). model: bundleCard(...) from src/ui/bundles.js;
 * describe(b) gives the pieces line.
 */
export function setBundles(model, describe) {
  const root = document.querySelector('[data-overlay="bundles"]');
  root.querySelector('[data-field="title"]').textContent = model.title;
  root.querySelector('[data-field="cash"]').textContent = model.cashText;
  const box = document.getElementById('bundle-list');
  box.textContent = '';
  for (const b of model.bundles) {
    const button = document.createElement('button');
    button.dataset.action = `bundle-${b.key}`;
    button.disabled = !b.canBuy;
    const title = document.createElement('strong');
    title.textContent = b.title;
    button.append(title);
    const pieces = document.createElement('span');
    pieces.textContent = describe(b);
    button.append(pieces);
    for (const x of b.extras) {
      const extra = document.createElement('span');
      extra.textContent = `+ ${x.reason}`;
      button.append(extra);
    }
    const price = document.createElement('em');
    price.textContent = b.button;
    button.append(price);
    box.append(button);
  }
}

/**
 * The ledger card (pass 7 spec 6.1): "Now, a second" and "The run so far", two columns that become
 * one on a narrow screen. model: ledger(...) from src/ui/ledger.js.
 */
export function setLedger(model) {
  const fill = (id, rows) => {
    const list = document.getElementById(id);
    list.textContent = '';
    for (const r of rows) {
      const row = document.createElement('div');
      if (r.out) row.className = 'out';
      const dt = document.createElement('dt');
      dt.textContent = r.label;
      if (r.note) {
        const note = document.createElement('small');
        note.textContent = r.note;
        dt.append(note);
      }
      const dd = document.createElement('dd');
      dd.textContent = r.value;
      row.append(dt, dd);
      list.append(row);
    }
  };
  fill('ledger-now', [...model.now, { label: 'Net', value: model.netText, out: false }]);
  fill('ledger-sofar', [{ label: 'Starting cash', value: model.startText }, ...model.soFar.filter((x) => Math.abs(x.raw) >= 0.5), { label: 'Cash now', value: model.cashText }]);
}

const wayButton = (action, title, line) => {
  const b = document.createElement('button');
  b.dataset.action = action;
  b.textContent = title;
  if (line) {
    const s = document.createElement('small');
    s.textContent = line;
    b.append(s);
  }
  return b;
};

/**
 * The pick of two (pass 8 spec 7.1): model from perkCard(...). halls: when the Warranty was tapped,
 * the halls it can cover, one button each; otherwise null.
 */
export function setPerk(model, halls) {
  document.querySelector('[data-overlay="perk"] [data-field="quote"]').textContent = model.quote;
  const box = document.getElementById('perk-choices');
  box.textContent = '';
  if (halls) {
    const row = document.createElement('div');
    row.className = 'halls';
    for (const h of halls) row.append(wayButton(`perk-hall-${h}`, `Hall ${h}`));
    box.append(wayButton('perk-back', 'Which hall?', 'Tap one; or tap here to choose again'), row);
    return;
  }
  for (const p of model.perks) box.append(wayButton(`perk-take-${p.perk}`, p.title, p.line));
}

/** The CEO's call (pass 8 spec 7.2): model from rescueCard(...). */
export function setRescue(model) {
  const card = document.querySelector('[data-overlay="rescue"]');
  card.querySelector('[data-field="cash"]').textContent = model.cash;
  card.querySelector('[data-field="countdown"]').textContent = model.countdown;
  const box = document.getElementById('rescue-ways');
  box.textContent = '';
  for (const w of model.ways) box.append(wayButton(w.action, w.label, w.line));
}

/** The promises card (pass 8 spec 6.2): model from promisesCard(...) in src/ui/promisesView.js. */
export function setPromises(model) {
  const card = (lines, button) => {
    const box = document.createElement('div');
    box.className = 'p';
    const [title, ...rest] = lines;
    const t = document.createElement('strong');
    t.textContent = title;
    box.append(t);
    for (const line of rest) {
      const sp = document.createElement('span');
      sp.textContent = line;
      box.append(sp);
    }
    box.append(button);
    return box;
  };
  const held = document.getElementById('promises-held');
  held.textContent = '';
  for (const h of model.held) {
    const b = document.createElement('button');
    b.dataset.action = `promise-cancel-${h.id}`;
    b.textContent = h.cancel;
    held.append(card([h.title, h.asks, `${h.left} · ${h.pays}`], b));
  }
  const offers = document.getElementById('promises-offers');
  offers.textContent = '';
  for (const o of model.offers) {
    const b = document.createElement('button');
    b.dataset.action = `promise-take-${o.id}`;
    b.className = 'primary';
    b.textContent = o.take;
    b.disabled = !o.canTake;
    offers.append(card([o.title, o.asks, `${o.within} · ${o.money}`], b));
  }
}

/**
 * How it works (pass 10 M62). list: referenceList(...) from src/ui/reference.js; entry: an opened
 * referenceEntry(...) or null; drawPicture(ctx, size, picture) draws its picture.
 */
export function setHowTo(list, entry, drawPicture) {
  const root = document.querySelector('[data-overlay="howto"]');
  const box = document.getElementById('howto-list');
  const one = document.getElementById('howto-entry');
  root.querySelector('[data-field="title"]').textContent = entry ? entry.title : 'How it works';
  box.hidden = Boolean(entry);
  one.hidden = !entry;
  box.textContent = '';
  if (!entry) {
    if (!list.length) {
      const p = document.createElement('p');
      p.textContent = 'Nothing yet. The Tutorial, on the main menu, explains each thing the first time it comes up; it all collects here.';
      box.append(p);
    }
    for (const g of list) {
      const h = document.createElement('h2');
      h.textContent = g.group;
      const row = document.createElement('div');
      row.className = 'group';
      for (const e of g.entries) {
        const b = document.createElement('button');
        b.dataset.action = `howto-${e.id}`;
        b.textContent = e.title;
        row.append(b);
      }
      box.append(h, row);
    }
    return;
  }
  one.querySelector('[data-field="text"]').textContent = entry.text;
  const canvas = document.getElementById('howto-picture');
  canvas.hidden = !entry.picture;
  if (!entry.picture) return;
  const size = 72;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  drawPicture(ctx, size, entry.picture);
}
