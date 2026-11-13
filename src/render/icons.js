// Drawing code for the crew and the equipment. Flat colors, no image files.
// Every function draws centered on (x, y). `size` is the icon's width in canvas pixels.
// Art rule: techs are simple (the hat is the character); equipment gets one notch more detail:
// a clear silhouette plus one telltale feature (fans, gauge, droplet, lights, breakers).

export const HATS = {
  electrical: { dome: '#F5C93A', brim: '#DDA915', ink: '#5A4506' },
  mechanical: { dome: '#E2523F', brim: '#B93A2A', ink: '#FFFFFF' },
  ce: { dome: '#4FB05A', brim: '#36873F', ink: '#FFFFFF' },
  network: { dome: '#4A8FE0', brim: '#2F6DBC', ink: '#FFFFFF' },
};

const C = {
  navy: '#2B3A67',
  glove: '#1B2440',
  vest: '#C9DB3C',
  steel: '#C9CED6',
  steelLine: '#7B8494',
  fan: '#4B5563',
  fanOff: '#8E96A3',
  coldPipe: '#3B7DD8',
  warmPipe: '#D9483B',
  badge: '#E6F1FB',
  badgeInk: '#185FA5',
  motor: '#3B6FB5',
  motorLine: '#244C85',
  volute: '#8C939E',
  voluteLine: '#5C636E',
  white: '#FFFFFF',
  cdu: '#1D9E75',
  cduLine: '#0F6E56',
  cduPanel: '#E1F5EE',
  puddle: 'rgba(59, 125, 216, 0.38)',
  rack: '#2F3542',
  rackLine: '#1B1F29',
  rackBar: '#4A5163',
  ledOn: '#5DCAA5',
  ledDown: '#E24B4A',
  ledOff: '#6B7280',
  msb: '#B8BEC8',
  breaker: '#3F4654',
  bolt: '#F5C93A',
  boltInk: '#5A4506',
  tripped: '#E24B4A',
};

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fillRound(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function disc(ctx, x, y, r, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function line(ctx, points, stroke, lineWidth) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function polygon(ctx, points, fill) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * The mark of a trade, centered on (x, y) inside a square of side `size`.
 * electrical: bolt. mechanical: snowflake. ce: droplet. network: three linked nodes.
 */
export function drawTradeIcon(ctx, x, y, size, trade, ink) {
  const u = size / 20;
  ctx.save();
  ctx.translate(x, y);
  if (trade === 'electrical') {
    polygon(ctx, [3 * u, -10 * u, -6 * u, 2 * u, 0, 2 * u, -3 * u, 10 * u, 7 * u, -3 * u, 0, -3 * u], ink);
  } else if (trade === 'mechanical') {
    const w = Math.max(1, 2.2 * u);
    line(ctx, [0, -9 * u, 0, 9 * u], ink, w);
    line(ctx, [-7.8 * u, -4.5 * u, 7.8 * u, 4.5 * u], ink, w);
    line(ctx, [-7.8 * u, 4.5 * u, 7.8 * u, -4.5 * u], ink, w);
  } else if (trade === 'ce') {
    ctx.beginPath();
    ctx.moveTo(0, -10 * u);
    ctx.bezierCurveTo(-9 * u, 1 * u, -8 * u, 10 * u, 0, 10 * u);
    ctx.bezierCurveTo(8 * u, 10 * u, 9 * u, 1 * u, 0, -10 * u);
    ctx.closePath();
    ctx.fillStyle = ink;
    ctx.fill();
  } else {
    const w = Math.max(1, 1.8 * u);
    line(ctx, [0, -6 * u, -7 * u, 6 * u], ink, w);
    line(ctx, [0, -6 * u, 7 * u, 6 * u], ink, w);
    line(ctx, [-7 * u, 6 * u, 7 * u, 6 * u], ink, w);
    disc(ctx, 0, -6 * u, 3.4 * u, ink);
    disc(ctx, -7 * u, 6 * u, 3.4 * u, ink);
    disc(ctx, 7 * u, 6 * u, 3.4 * u, ink);
  }
  ctx.restore();
}

/** A small disc in a trade's hat color: the "this hat is fastest" dot on an alarm. */
export function drawHatDot(ctx, x, y, r, trade) {
  const hat = HATS[trade];
  disc(ctx, x, y, r, hat.dome, hat.brim, Math.max(1, r * 0.25));
}

/**
 * A technician seen from above, facing the bottom of the screen: shoulders, hi-vis vest,
 * a tablet held in front, and a big hardhat carrying the trade's mark.
 * options.selected draws a ring; options.busy drops the head a little (looking down, working).
 */
export function drawTech(ctx, x, y, size, trade, options = {}) {
  const hat = HATS[trade];
  const u = size / 54;
  ctx.save();
  ctx.translate(x, y);
  if (options.selected) disc(ctx, 0, 0, 33 * u, 'rgba(255, 255, 255, 0.6)', '#1F3A5F', 2.5 * u);
  ctx.beginPath();
  ctx.ellipse(0, 4 * u, 27 * u, 15 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.navy;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 4 * u, 21 * u, 12 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.vest;
  ctx.fill();
  fillRound(ctx, -8 * u, 14 * u, 16 * u, 9 * u, 2 * u, C.rack);
  disc(ctx, -9.5 * u, 18.5 * u, 3.4 * u, C.glove);
  disc(ctx, 9.5 * u, 18.5 * u, 3.4 * u, C.glove);
  const drop = options.busy ? 3 * u : 0;
  disc(ctx, 0, -3 * u + drop, 20 * u, hat.brim);
  disc(ctx, 0, -4.5 * u + drop, 16 * u, hat.dome);
  drawTradeIcon(ctx, 0, -4.5 * u + drop, 19 * u, trade, hat.ink);
  ctx.restore();
}

/**
 * Chiller (M19, at the owner's request): a water-cooled centrifugal chiller seen from above, in the
 * same 100 x 72 footprint as before. Two long shell-and-tube barrels side by side (the condenser on
 * top, the evaporator below) with water boxes and nozzles at the left end, the compressor (a round
 * volute) and its motor sitting across the barrels, a control panel at the right end, and the
 * mechanical badge. A tripped chiller greys its compressor and motor and gets the red slash.
 */
export function drawChiller(ctx, x, y, size, options = {}) {
  const running = options.running ?? true;
  const u = size / 100;
  ctx.save();
  ctx.translate(x, y);
  // Skid under everything.
  fillRound(ctx, -50 * u, -36 * u, 100 * u, 72 * u, 5 * u, '#9AA2AE', C.steelLine, 1.2 * u);
  // The two barrels: a body, a highlight along the top and a shadow along the bottom.
  const barrel = (by, h, body, light, dark) => {
    fillRound(ctx, -40 * u, by * u, 76 * u, h * u, (h / 2) * u, body, C.steelLine, 1.2 * u);
    fillRound(ctx, -36 * u, (by + 3) * u, 68 * u, 4 * u, 2 * u, light);
    fillRound(ctx, -36 * u, (by + h - 5) * u, 68 * u, 3 * u, 1.5 * u, dark);
  };
  barrel(-32, 28, '#C3CAD3', '#E3E7EC', '#A3ACB8'); // condenser
  barrel(2, 30, '#B5C6D8', '#DDE7F1', '#93A8BF'); // evaporator, a cooler steel
  // Water boxes and nozzles at the left end.
  for (const [by, h, nozzle] of [[-31, 26, C.steel], [3, 28, C.coldPipe]]) {
    fillRound(ctx, -49 * u, by * u, 11 * u, h * u, 3 * u, '#7B8494', '#5C636E', 1 * u);
    disc(ctx, -44 * u, (by + h * 0.3) * u, 3.2 * u, nozzle, '#3D4654', 0.8 * u);
    disc(ctx, -44 * u, (by + h * 0.72) * u, 3.2 * u, nozzle, '#3D4654', 0.8 * u);
  }
  // Compressor and motor across the barrels.
  const motor = running ? C.motor : C.fanOff;
  const motorLine = running ? C.motorLine : C.steelLine;
  fillRound(ctx, -4 * u, -14 * u, 30 * u, 22 * u, 6 * u, motor, motorLine, 1.2 * u);
  for (const fx of [4, 11, 18]) line(ctx, [fx * u, -10 * u, fx * u, 4 * u], motorLine, 1.6 * u);
  disc(ctx, -14 * u, -3 * u, 14 * u, running ? C.volute : C.fanOff, C.voluteLine, 1.5 * u);
  ctx.beginPath(); // the volute's scroll
  ctx.arc(-14 * u, -3 * u, 8.5 * u, -0.4, Math.PI * 1.35);
  ctx.strokeStyle = C.voluteLine;
  ctx.lineWidth = 1.6 * u;
  ctx.stroke();
  disc(ctx, -14 * u, -3 * u, 3.5 * u, C.steel);
  // Control panel at the right end, with its screen.
  fillRound(ctx, 37 * u, -26 * u, 11 * u, 30 * u, 2 * u, '#E3E7EC', C.steelLine, 1 * u);
  fillRound(ctx, 39 * u, -22 * u, 7 * u, 9 * u, 1 * u, running ? '#1F3A5F' : '#5C636E');
  // The trade badge.
  disc(ctx, 38 * u, 23 * u, 10 * u, C.badge, C.badgeInk, 1.2 * u);
  drawTradeIcon(ctx, 38 * u, 23 * u, 14 * u, 'mechanical', C.badgeInk);
  if (!running) line(ctx, [-26 * u, -16 * u, 22 * u, 10 * u], C.tripped, 3 * u);
  ctx.restore();
}

/**
 * Pump: blue motor, round gray volute, pipe stubs and a pressure gauge. options.pressure is 0..1.
 * The discharge stub leaves the volute upwards at x = +15.5 (size 80). options.flipY turns it to
 * point down, options.flipX moves it to the left side, so it can line up with its pipe (M19).
 */
export const PUMP_DISCHARGE_X = 15.5; // in units of size / 80
export function drawPump(ctx, x, y, size, options = {}) {
  const pressure = Math.max(0, Math.min(1, options.pressure ?? 0));
  const u = size / 80;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
  ctx.fillStyle = C.volute;
  ctx.fillRect(10 * u, -32 * u, 11 * u, 18 * u);
  ctx.fillRect(28 * u, -5 * u, 12 * u, 10 * u);
  fillRound(ctx, -40 * u, -15 * u, 40 * u, 30 * u, 6 * u, C.motor);
  for (const fx of [-30, -21, -12]) line(ctx, [fx * u, -11 * u, fx * u, 11 * u], C.motorLine, 2 * u);
  disc(ctx, 15 * u, 0, 18 * u, C.volute, C.voluteLine, 1.5 * u);
  disc(ctx, 15 * u, 0, 6.5 * u, C.steel);
  const gx = -24 * u;
  const gy = -27 * u;
  disc(ctx, gx, gy, 10 * u, pressure > 0.66 ? '#FBE3E1' : C.white, C.voluteLine, 1.5 * u);
  const angle = -Math.PI * 0.85 + Math.PI * 0.9 * pressure;
  line(ctx, [gx, gy, gx + Math.cos(angle) * 7.5 * u, gy + Math.sin(angle) * 7.5 * u], C.warmPipe, 2 * u);
  ctx.restore();
}

/**
 * CDU: a narrow teal cabinet with a droplet and a cold and a warm pipe stub.
 * options.leak: 0 dry, 1 leaking (small puddle), 2 row shut down (large puddle).
 * options.facing: which way the stubs point, 'right' (default), 'down' or 'up'; options.reach: how
 * far from the centre the stubs run, in units of size / 48 (default 29), so they can meet a hall's
 * wall (M19). The cabinet turns with them; the droplet stays upright.
 */
const CDU_TURN = { right: 0, down: Math.PI / 2, up: -Math.PI / 2 };
export function drawCdu(ctx, x, y, size, options = {}) {
  const leak = options.leak ?? 0;
  const turn = CDU_TURN[options.facing ?? 'right'] ?? 0;
  const reach = Math.max(29, options.reach ?? 29);
  const u = size / 48;
  ctx.save();
  ctx.translate(x, y);
  if (leak > 0) {
    ctx.beginPath();
    ctx.ellipse(4 * u, 25 * u, (leak === 2 ? 46 : 30) * u, (leak === 2 ? 17 : 12) * u, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.puddle;
    ctx.fill();
  }
  ctx.save();
  ctx.rotate(turn);
  ctx.fillStyle = C.coldPipe;
  ctx.fillRect(18 * u, -18 * u, (reach - 18) * u, 5 * u);
  ctx.fillStyle = C.warmPipe;
  ctx.fillRect(18 * u, 14 * u, (reach - 18) * u, 5 * u);
  fillRound(ctx, -18 * u, -28 * u, 36 * u, 56 * u, 5 * u, C.cdu, C.cduLine, 1.2 * u);
  fillRound(ctx, -12 * u, -22 * u, 24 * u, 11 * u, 2 * u, C.cduPanel);
  ctx.restore();
  // The droplet where it sits on the cabinet, but upright.
  const dx = -Math.sin(turn) * 8 * u;
  const dy = Math.cos(turn) * 8 * u;
  drawTradeIcon(ctx, dx, dy, 18 * u, 'ce', C.cduPanel);
  ctx.restore();
}

/**
 * Rack: a dark cabinet with five rows of lights.
 * options.level 0..1 lights that share of the rows green; options.netDown turns the lights red.
 */
export function drawRack(ctx, x, y, size, options = {}) {
  const level = Math.max(0, Math.min(1, options.level ?? 1));
  const netDown = options.netDown ?? false;
  const u = size / 40;
  ctx.save();
  ctx.translate(x, y);
  fillRound(ctx, -20 * u, -32 * u, 40 * u, 64 * u, 5 * u, C.rack, C.rackLine, 1.2 * u);
  const lit = Math.round(level * 5);
  for (let row = 0; row < 5; row++) {
    const ry = (-24 + row * 11) * u;
    fillRound(ctx, -14 * u, ry, 28 * u, 6 * u, 1 * u, C.rackBar);
    const on = 4 - row < lit;
    const color = netDown ? C.ledDown : on ? C.ledOn : C.ledOff;
    disc(ctx, -10 * u, ry + 3 * u, 1.7 * u, color);
    disc(ctx, -5 * u, ry + 3 * u, 1.7 * u, color);
  }
  ctx.restore();
}

/** MSB: a gray two-door cabinet with four breakers and a bolt badge. options.tripped drops the handles. */
export function drawMsb(ctx, x, y, size, options = {}) {
  const tripped = options.tripped ?? false;
  const u = size / 64;
  ctx.save();
  ctx.translate(x, y);
  fillRound(ctx, -32 * u, -26 * u, 64 * u, 52 * u, 5 * u, C.msb, C.steelLine, 1.2 * u);
  line(ctx, [0, -26 * u, 0, 26 * u], C.steelLine, 1 * u);
  for (const bx of [-26, -14, 6, 18]) {
    fillRound(ctx, bx * u, -18 * u, 8 * u, 13 * u, 1 * u, C.breaker);
    ctx.fillStyle = tripped ? C.tripped : C.ledOn;
    ctx.fillRect((bx + 2) * u, (tripped ? -11 : -16) * u, 4 * u, 4 * u);
  }
  disc(ctx, 0, 12 * u, 9 * u, tripped ? C.tripped : C.bolt, C.steelLine, 1 * u);
  drawTradeIcon(ctx, 0, 12 * u, 13 * u, 'electrical', tripped ? C.white : C.boltInk);
  ctx.restore();
}

/** Shield for a hall's power or the campus cooling: 'whole' | 'cracked' | 'broken'. */
export function drawShield(ctx, x, y, size, status) {
  const u = size / 24;
  const fill = status === 'whole' ? '#5DCAA5' : status === 'cracked' ? '#EF9F27' : '#E24B4A';
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -12 * u);
  ctx.lineTo(10 * u, -8 * u);
  ctx.lineTo(10 * u, 1 * u);
  ctx.quadraticCurveTo(9 * u, 9 * u, 0, 13 * u);
  ctx.quadraticCurveTo(-9 * u, 9 * u, -10 * u, 1 * u);
  ctx.lineTo(-10 * u, -8 * u);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (status !== 'whole') line(ctx, [-1 * u, -10 * u, 3 * u, -3 * u, -2 * u, 2 * u, 2 * u, 10 * u], '#FFFFFF', 1.8 * u);
  ctx.restore();
}

/** Small caption under a piece of equipment. */
export function drawLabel(ctx, text, x, y, px, color = '#3D4654') {
  ctx.font = `600 ${px}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Nominal icon width in world units for each equipment type (see src/core/layout.js). */
export const ICON_SIZE = { chiller: 100, pump: 80, cdu: 44, rack: 44, msb: 66, tech: 46 };

const DRAWERS = { chiller: drawChiller, pump: drawPump, cdu: drawCdu, rack: drawRack, msb: drawMsb };

/** Draw any piece of equipment by type. `status` is passed straight to the type's drawer. */
export function drawEquipment(ctx, type, x, y, size, status = {}) {
  DRAWERS[type](ctx, x, y, size, status);
}

/**
 * The picture of a fault, for alarm bubbles and tickets.
 * network: linked nodes. leak: droplet. breaker: bolt. chiller: snowflake. pump: pressure gauge.
 */
export function drawFaultGlyph(ctx, x, y, size, alarmType, ink) {
  if (alarmType === 'pump') {
    const u = size / 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, 8.5 * u, 0, Math.PI * 2);
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, 2 * u);
    ctx.stroke();
    line(ctx, [0, 0, 5 * u, -4.5 * u], ink, Math.max(1, 2.2 * u));
    disc(ctx, 0, 0, 1.8 * u, ink);
    ctx.restore();
    return;
  }
  const trade = { network: 'network', leak: 'ce', breaker: 'electrical', chiller: 'mechanical' }[alarmType];
  drawTradeIcon(ctx, x, y, size, trade, ink);
}

const BUBBLE = { paper: '#FFFFFF', ink: '#1F3A5F', track: '#C9D1DB', work: '#2F6DBC', worst: '#1F3A5F' };

/**
 * An alarm marker for the map. `info` is alarmInfo(state, alarm) from the rules engine.
 *   - Unattended: a ring that empties as the clock runs down.
 *   - Clock spent (the alarm has done its worst): the bubble turns solid.
 *   - Attended (a tech is on site): the ring becomes fix progress, filling up.
 *   - A dot in the matching hat color sits top-right. Hat colors mean trade only, never urgency.
 * options.selected adds an outline; options.pulse (0..1) grows the bubble slightly, for clocks nearly out;
 * options.assignedTrade draws the hat dot of the tech who is on the way; options.queued marks a queued alarm.
 */
export function drawAlarmBubble(ctx, x, y, r, info, options = {}) {
  const grow = 1 + 0.12 * (options.pulse ?? 0);
  const R = r * grow;
  const spent = !Number.isFinite(info.clockLeft);
  ctx.save();
  ctx.translate(x, y);
  if (options.selected) disc(ctx, 0, 0, R + 5, 'rgba(255, 255, 255, 0.7)', BUBBLE.ink, 2.5);
  disc(ctx, 0, 0, R, spent && !info.attended ? BUBBLE.worst : BUBBLE.paper, BUBBLE.track, Math.max(2, R * 0.2));
  const share = info.attended ? info.progress : spent ? 0 : info.clockFraction;
  if (share > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, share));
    ctx.strokeStyle = info.attended ? BUBBLE.work : BUBBLE.ink;
    ctx.lineWidth = Math.max(2, R * 0.2);
    ctx.lineCap = 'butt';
    ctx.stroke();
  }
  drawFaultGlyph(ctx, 0, 0, R * 1.05, info.type, spent && !info.attended ? BUBBLE.paper : BUBBLE.ink);
  drawHatDot(ctx, R * 0.78, -R * 0.78, R * 0.36, info.trade);
  if (options.assignedTrade) drawHatDot(ctx, -R * 0.78, R * 0.78, R * 0.36, options.assignedTrade);
  else if (options.queued) disc(ctx, -R * 0.78, R * 0.78, R * 0.3, BUBBLE.paper, BUBBLE.ink, 2);
  ctx.restore();
}
