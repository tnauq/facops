// Seed build: shows the pass 1 campus and crew so the page deploys and the art can be judged on a phone.
// Milestone 1 replaces this file with the real game loop (see docs/pass1-spec.md).
// Add #demo to the address to see how faults look.

import { EQUIPMENT_BY_ID, advance, alarmInfo, assign, createGame, getTech, raiseAlarm } from './core/index.js';
import { PAGE_COLOR, drawCampus, drawCrew, fitView, toScreen } from './render/campus.js';
import { drawAlarmBubble } from './render/icons.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function demoState() {
  const state = createGame({ seed: 1, config: { director: { enabled: false }, meter: { start: 1e6, max: 1e6 } } });
  raiseAlarm(state, 'breaker', 'msb-2-A');
  raiseAlarm(state, 'breaker', 'msb-2-B');
  raiseAlarm(state, 'chiller', 'chiller-1');
  raiseAlarm(state, 'leak', 'cdu-1-1');
  const net = raiseAlarm(state, 'network', 'rack-1-0-3');
  raiseAlarm(state, 'pump', 'pump-0');
  advance(state, 12);
  assign(state, 'tech-0', net.id);
  advance(state, 2);
  const leak = state.alarms.find((a) => a.type === 'leak');
  assign(state, 'tech-2', leak.id);
  advance(state, 6);
  return state;
}

function freshState() {
  const state = createGame({ seed: 1, config: { director: { enabled: false } } });
  state.techs.forEach((tech, i) => {
    tech.y += (i - 1) * 42;
  });
  return state;
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAGE_COLOR;
  ctx.fillRect(0, 0, w, h);

  if (h > w) {
    ctx.fillStyle = '#1F3A5F';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Turn your phone sideways', w / 2, h / 2);
    return;
  }

  const state = window.location.hash === '#demo' ? demoState() : freshState();
  const view = fitView({ x: 8, y: 8, w: w - 16, h: h - 30 });
  drawCampus(ctx, view, state);
  drawCrew(ctx, view, state.techs);
  for (const alarm of state.alarms) {
    const info = alarmInfo(state, alarm);
    const e = EQUIPMENT_BY_ID[alarm.equipId];
    const p = toScreen(view, e.x, e.y);
    const tech = info.techId ? getTech(state, info.techId) : null;
    drawAlarmBubble(ctx, p.x, p.y - 6, 15, info, { assignedTrade: tech && !info.attended ? tech.trade : null });
  }

  ctx.fillStyle = '#56606E';
  ctx.font = '500 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('FacOps seed build: map and art only. The game starts with milestone 1.', w / 2, h - 8);
}

window.addEventListener('resize', draw);
window.addEventListener('hashchange', draw);
draw();
