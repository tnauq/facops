// Layers on the map (pass 8 spec 8.1, M52): a pale veil over everything outside the layer, the
// layer's lines in ink, and its marks with the shields' shapes. No new colours: hat colours still
// mean trade only, and nothing here is green, yellow or red. The model is src/ui/layers.js.

import { EQUIPMENT_BY_ID } from '../core/index2.js';
import { TRANSFORMER, RMU } from '../core/outdoor.js';
import { ICON_SIZE, drawShield } from './icons.js';
import { LAYER_NAME } from '../ui/layers.js';

const INK = '#1F3A5F';
const PALE = 'rgba(31, 58, 95, 0.35)';
const VEIL = 'rgba(213, 219, 227, 0.78)'; // the page colour, mostly opaque: the rest of the campus fades
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const TECH_HOLE = 34; // world units around each tech kept clear in the Crew layer

// A piece of equipment's box in world units, a little larger than its picture.
function boxOf(id) {
  const e = EQUIPMENT_BY_ID[id];
  const half = (w, h) => ({ x: e.x - w / 2, y: e.y - h / 2, w, h });
  if (e.type === 'row') {
    const top = Math.min(...e.racks) - ICON_SIZE.rack / 2 - 4;
    const bottom = Math.max(...e.racks) + ICON_SIZE.rack / 2 + 4;
    return { x: e.x - ICON_SIZE.rack / 2 - 4, y: top, w: ICON_SIZE.rack + 8, h: bottom - top };
  }
  if (e.type === 'dry') return half(e.w + 8, e.h + 8);
  if (e.type === 'xfmr') return half(TRANSFORMER.w + 10, TRANSFORMER.h + 10);
  if (e.type === 'rmu') return half(RMU.w + 10, RMU.h + 10);
  const size = ICON_SIZE[e.type] ?? 50;
  return half(size * 0.8, size * 0.8);
}

const S = (v, p) => ({ x: v.ox + p.x * v.scale, y: v.oy + p.y * v.scale });

function veil(ctx, v, rect, model, techs) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  for (const id of new Set(model.items)) {
    const b = boxOf(id);
    // Each hole is drawn the other way round, so the even-odd fill leaves it clear.
    const x = v.ox + b.x * v.scale;
    const y = v.oy + b.y * v.scale;
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + b.h * v.scale);
    ctx.lineTo(x + b.w * v.scale, y + b.h * v.scale);
    ctx.lineTo(x + b.w * v.scale, y);
    ctx.closePath();
  }
  for (const t of techs) {
    const p = S(v, t);
    ctx.moveTo(p.x + TECH_HOLE * v.scale, p.y);
    ctx.arc(p.x, p.y, TECH_HOLE * v.scale, 0, Math.PI * 2, true);
  }
  ctx.fillStyle = VEIL;
  ctx.fill('evenodd');
  ctx.restore();
}

// Live: solid ink. Failed: ink dashes. Not built: pale dots. Crew: a route solid and thin, a post dashed.
const LINE = {
  live: { color: INK, width: 3, dash: [] },
  failed: { color: INK, width: 3, dash: [8, 6] },
  unbuilt: { color: PALE, width: 2, dash: [2, 5] },
  route: { color: INK, width: 2, dash: [] },
  post: { color: INK, width: 2, dash: [6, 5] },
};

function links(ctx, v, list) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const l of list) {
    const st = LINE[l.state];
    const a = S(v, l.a);
    const b = S(v, l.b);
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    ctx.setLineDash(st.dash);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    // Square corners, like the cables on the map: along first, then across.
    if (l.state !== 'route' && Math.abs(a.x - b.x) > 1 && Math.abs(a.y - b.y) > 1) ctx.lineTo(a.x, b.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// A white pill with ink words, one line or several, centred on (x, y).
function pill(ctx, x, y, lines, bold = false) {
  ctx.save();
  ctx.font = `${bold ? 700 : 600} 11px ${FONT}`;
  const w = Math.max(...lines.map((s) => ctx.measureText(s).width)) + 12;
  const h = lines.length * 14 + 6;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((s, i) => ctx.fillText(s, x, y - h / 2 + 10 + i * 14));
  ctx.restore();
  return h;
}

function marks(ctx, v, list) {
  for (const m of list) {
    const p = S(v, m);
    const lines = m.lines ?? [m.name, m.text, m.sub].filter(Boolean);
    // A shield with words: side by side in one row, centred on the point (the aisles are narrow).
    if (m.shield && lines.length) {
      ctx.font = `600 11px ${FONT}`;
      const w = 24 + Math.max(...lines.map((s) => ctx.measureText(s).width)) + 12;
      drawShield(ctx, p.x - w / 2 + 10, p.y, 20, m.shield);
      pill(ctx, p.x + 12, p.y, lines);
    } else if (m.shield) drawShield(ctx, p.x, p.y, 20, m.shield);
    else if (lines.length) pill(ctx, p.x, p.y, lines);
  }
}

/** Draws the layer over the map. cam.rect: the map's rect; v: cameraView(cam); techs for the Crew holes. */
export function drawLayer(ctx, v, rect, model, layer, techs = []) {
  if (!model) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  veil(ctx, v, rect, model, layer === 'crew' ? techs : []);
  links(ctx, v, model.links);
  marks(ctx, v, model.marks);
  ctx.restore();
}

/** The Layers button at the strip's left end: a stack of sheets and the layer's name ("Layers" when none). */
export function drawLayersButton(ctx, strip, button, layer) {
  const b = { x: button.x, y: strip.y, w: button.w, h: strip.h };
  const on = Boolean(layer);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 6);
  ctx.fillStyle = on ? INK : '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Two sheets, one over the other.
  const cx = b.x + b.w / 2;
  ctx.strokeStyle = on ? '#FFFFFF' : INK;
  ctx.lineWidth = 1.2;
  for (const dy of [3, 0]) {
    ctx.beginPath();
    ctx.moveTo(cx - 8, b.y + 8 + dy);
    ctx.lineTo(cx, b.y + 4 + dy);
    ctx.lineTo(cx + 8, b.y + 8 + dy);
    ctx.lineTo(cx, b.y + 12 + dy);
    ctx.closePath();
    ctx.fillStyle = on ? INK : '#FFFFFF';
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = on ? '#FFFFFF' : INK;
  ctx.font = `700 9px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(on ? LAYER_NAME[layer] : 'Layers', cx, b.y + b.h - 3);
  ctx.restore();
}
