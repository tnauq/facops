// The build card (pass 4 spec 3.2): the device's picture and name, its price, one line on what it
// does here, the upkeep for infrastructure, and the Build button. What it says comes from
// src/ui/spots.js; where it goes from cardLayout there.

import { ICON_SIZE, drawChiller, drawCdu, drawMsb, drawPump, drawRack } from './icons.js';
import { drawYardPicture } from './outdoor.js';

const PANEL = '#FFFFFF';
const EDGE = '#C9D1DB';
const INK = '#1F3A5F';
const MUTED = '#56606E';
const WARN = '#9A5B00'; // a dark amber for "needs ..." lines: readable on white, not an alarm colour
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function picture(ctx, type, x, y, side) {
  const fit = 38; // px the picture may take
  if (type === 'row') {
    drawRack(ctx, x, y - 10, fit * 0.55, {});
    drawRack(ctx, x, y + 10, fit * 0.55, {});
  } else if (type === 'chiller') drawChiller(ctx, x, y, fit, {});
  else if (type === 'pump') drawPump(ctx, x, y, fit * 0.9, {});
  else if (type === 'cdu') drawCdu(ctx, x, y, fit * (ICON_SIZE.cdu / 44) * 0.8, {});
  else if (type === 'msb') drawMsb(ctx, x, y, fit, { side });
  else drawYardPicture(ctx, type, x, y, fit, side); // transformer, RMU, dry cooler (M29)
}

// Text cut to fit a width, with an ellipsis.
function fitText(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t}…`;
}

// Wrap text onto at most two lines of `width`.
function twoLines(ctx, text, width) {
  const words = text.split(' ');
  let first = '';
  let i = 0;
  for (; i < words.length; i++) {
    const next = first ? `${first} ${words[i]}` : words[i];
    if (ctx.measureText(next).width > width && first) break;
    first = next;
  }
  const rest = words.slice(i).join(' ');
  return rest ? [first, fitText(ctx, rest, width)] : [first];
}

/** layout: cardLayout(...). info: spotInfo(...). */
export function drawBuildCard(ctx, layout, info) {
  const { x, y, w, h, button } = layout;
  ctx.save();
  ctx.shadowColor = 'rgba(20, 30, 45, 0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fillStyle = PANEL;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();

  picture(ctx, info.type, x + 30, y + 30, info.name.endsWith(' A') ? 'A' : info.name.endsWith(' B') ? 'B' : 'A');
  const tx = x + 58;
  const tw = w - 58 - 10;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 14px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText(info.name, tx, y + 17);
  ctx.textAlign = 'right';
  ctx.fillText(info.priceText, x + w - 10, y + 17);
  ctx.textAlign = 'left';
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = info.warn ? WARN : MUTED;
  twoLines(ctx, info.line, tw).forEach((line, i) => ctx.fillText(line, tx, y + 36 + i * 14));
  if (info.upkeep) {
    ctx.fillStyle = MUTED;
    ctx.fillText(info.upkeep, x + 10, button.y + button.h / 2);
  }

  // The button: ink when it can be bought, pale with "Need $80 more" when not.
  ctx.beginPath();
  ctx.roundRect(button.x, button.y + 4, button.w, button.h - 8, 8);
  ctx.fillStyle = info.canBuild ? INK : '#E8ECF1';
  ctx.fill();
  ctx.font = `700 ${info.canBuild ? 13 : 11}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = info.canBuild ? '#FFFFFF' : MUTED;
  ctx.fillText(fitText(ctx, info.button, button.w - 8), button.x + button.w / 2, button.y + button.h / 2);
  ctx.restore();
}
