# FacOps pass 1 build spec

Version 1.0, 11 November 2026. This document is the source of truth for pass 1. If the code and this spec disagree, the spec wins. If the spec is silent or looks wrong, stop and ask the owner before guessing.

Its home is `docs/pass1-spec.md` in the `tnauq/facops` repository. A copy anywhere else is a snapshot: read it, but change only the one in the repository.

## 0. Where things stand

Already built and tested (milestone 0, tag `m0-seed`):

- The rules engine, in `src/core/`. It implements everything in section 4.
- 59 tests in `tests/`, run with `node --test`.
- The drawing code for the crew, the equipment, shields, fault glyphs and alarm bubbles, in `src/render/icons.js`.
- A campus renderer that draws the map from a live game state, in `src/render/campus.js`.
- A page (`index.html`, `src/main.js`) that shows the map. Add `#demo` to the address to see faults.

Still to build (milestones 1 to 7, section 12): the game loop, input, the HUD, the crew bar, the alarm rail, overlays, the tuning drawer and the results screen.

## 1. What pass 1 is

A small playable prototype that answers one question: **is deciding which alarm comes first interesting, and does choosing the tech add anything?**

The player is a facility operations manager. Alarms appear on equipment; the player sends technicians to fix them. The player never fixes anything directly.

In pass 1:

- Plant yard plus Halls 1 and 2 (0.50 GW), on one fixed screen.
- Three techs: Electrical, Mechanical, Critical Environment.
- All five alarm types, with clocks and escalations.
- The Stability meter. A round is endless and is lost when the meter empties. Rounds last about four minutes.
- Dispatch and redirect. Two taps by default, with a switch for one-tap dispatch.
- A tuning drawer and a results screen with a Copy button.

Not in pass 1: Halls 3 and 4, Deliveries, the tutorial, the CEO, sound, puddles that slow walking, staging a tech in a room, direct control of a tech, anything online.

## 2. Rules of the build

| Rule | Detail |
|---|---|
| Language | Plain JavaScript, ES modules. No TypeScript. |
| Libraries | None. No frameworks, no npm dependencies, no CDN scripts. |
| Build step | None. The repository is the site. `index.html` loads `src/main.js` directly. |
| Hosting | GitHub Pages from the `main` branch, root folder. `.nojekyll` stays in the root. |
| Tests | `node --test` (Node 22). All tests pass before every commit. |
| Rules engine | Do not change `src/core/` or weaken its tests without the owner's agreement. |
| Numbers | Every rule number lives in `src/core/config.js`. Never hard-code one elsewhere. |
| Randomness | Rules use the seeded generator in the game state. Never `Math.random()` in `src/core/`. |
| Network | The page makes no network requests and has no analytics. |
| Storage | `localStorage` only, always inside `try`/`catch`, and the game must work without it. |
| Device | iPhone 17e, Safari, landscape. 844 x 390 points, a notch on one short edge. |
| Screen floor | The layout must work in a safe box as small as 660 x 300 CSS pixels. |
| Touch | Every tap target is at least 44 x 44 CSS pixels. Nothing depends on hover. |
| Commits | Straight to `main`. One milestone per session. Tag each finished milestone. |

Pure logic that the screen needs (regions, hit testing, the tap state machine, ticket order) goes in small modules under `src/ui/` with their own tests. Drawing goes under `src/render/`.

## 3. The map

World units: the campus is 1000 wide and 500 tall, origin top-left, y down. `src/core/layout.js` holds the data below as `EQUIPMENT`, `LANES`, `HALLS`, `YARD` and `START_POINT`.

### 3.1 Zones

| Zone | x | y | Width | Height | Notes |
|---|---|---|---|---|---|
| Plant yard | 20 | 20 | 230 | 460 | Walkway at x = 150 |
| Hall 1 | 300 | 20 | 680 | 220 | Aisle at y = 130. Fed by the west pump. |
| Hall 2 | 300 | 260 | 680 | 220 | Aisle at y = 370. Fed by the east pump. |
| Corridor | x = 270 | 130 to 370 | | | Joins the two aisles |

### 3.2 Equipment

Each piece has an icon center and a service point, where a tech stands to work on it.

| Equipment | Ids | Icon center | Service point |
|---|---|---|---|
| Chillers | `chiller-0`, `chiller-1`, `chiller-2` | (80, 95), (80, 250), (80, 405) | (150, same y) |
| Pumps | `pump-0` (west), `pump-1` (east) | (205, 190), (205, 310) | (150, same y) |
| MSB side A | `msb-1-A`, `msb-2-A` | (hall x + 55, hall y + 45) | (hall x + 55, aisle y) |
| MSB side B | `msb-1-B`, `msb-2-B` | (hall x + 625, hall y + 168) | (hall x + 625, aisle y) |
| CDUs | `cdu-<hall>-<row>`, row 0 or 1 | (hall x + 135, row y) | (hall x + 135, aisle y) |
| Racks | `rack-<hall>-<row>-<idx>`, idx 0 to 4 | (hall x + 215 + 85 x idx, row y) | (same x, aisle y) |

Row y is hall y + 62 for row 0 and hall y + 158 for row 1. Each CDU feeds the five racks in its row. Totals: 20 racks, 4 CDUs, 4 MSBs, 3 chillers, 2 pumps.

### 3.3 Walking

Techs walk only along lanes: the yard walkway, two links at y = 130 and y = 370 from x = 150 to x = 270, the corridor, and the two aisles. `route(from, to)` returns the shortest path as a list of points; every hop is horizontal or vertical. The crew starts at (270, 250).

## 4. The rules

Everything in this section is implemented in `src/core/` and covered by tests. It is here so the screen can show it correctly. Do not re-implement it.

### 4.1 Load (GW)

- A healthy rack delivers 25 MW. Capacity online is 500 MW (0.50 GW).
- Rack output = 25 MW x rack level x cooling factor.
- Rack level is 0 if the rack has a network failure, if its hall is dark, or if its row is shut down; 0.6 if its row's CDU is leaking; otherwise 1.
- A rack's level drops at once. After the fault clears it climbs back to full over 3 s.
- Load fraction = delivered MW / capacity MW.

### 4.2 Alarms

| Alarm | On | Fastest trade | When it fires | Clock | When the clock runs out | Fix time |
|---|---|---|---|---|---|---|
| Network Failure | A rack | Network | That rack drops to zero (-25 MW) | 30 s | It takes down one neighboring rack in the row, which becomes its own alarm. Repeats every 30 s. | 3 s |
| CDU Leak | A CDU | Critical Environment | Its row throttles to 60% (-50 MW) | 30 s | The row shuts down (-125 MW) until fixed | 8 s |
| Breaker Trip | An MSB side | Electrical | Nothing lost | 45 s | The hall's other side trips. Both sides down: the hall is dark (-250 MW) until either side is reset. | 6 s |
| Chiller Trip | A chiller | Mechanical | Nothing lost while 2 of 3 run | 60 s | Another running chiller trips | 10 s |
| Pump Overpressure | A pump | Mechanical | Nothing lost | 20 s | The loop bursts: up to two CDU Leaks appear in that pump's hall, and the pump alarm ends by itself | 6 s |

Rules for all alarms:

- One alarm per piece of equipment at a time.
- A clock stands still while a tech is on site fixing that alarm. It runs while the tech is still walking.
- Fix time is for any tech. The matching trade is 15% faster (for example 6.8 s on a leak). Trades are flavor: a wrong hat is never a mistake.
- No Network tech exists in pass 1, so network failures are always fixed at the standard 3 s.
- Cooling factor: 1 while at least 2 chillers run. With 1 running it drifts to 0.5; with none, to 0. It moves 0.02 per second in either direction (10% per 5 s).
- A chiller alarm that is itself ignored for 60 s trips the next chiller.
- Nothing is ever unfixable or permanently lost.

### 4.3 Technicians

| Value | Number |
|---|---|
| Walk speed | 120 world units per second |
| End to end of a hall aisle | about 4.8 s |
| Hall 1 to Hall 2, mid to mid | about 8.9 s |
| A hall to the yard | about 2 to 9 s |
| Progress kept on a dropped job | 10 s |

- States: idle, walking, fixing. A tech stays where it finishes.
- `assign(techId, alarmId)` sends a tech. If the tech was busy, its old job is dropped: that alarm keeps its progress for 10 s, then resets to zero. This is a redirect.
- If another tech was already on the alarm, that tech goes idle where it stands and the progress carries over.
- No collisions.

### 4.4 Bands and the Stability meter

| Load fraction | Band | Stability meter |
|---|---|---|
| 90% or more | Green | Fills 1 point per second, up to 100 |
| 80% up to 90% | Yellow | Drains 0.5 points per second |
| Below 80% | Red | Drains 2 points per second |

The meter starts at 40. At 0 the round is over. There are no Deliveries in pass 1, so a full meter simply stays full.

### 4.5 The alarm director

| Value | Number |
|---|---|
| First alarm | 5 s into the round |
| Interval at the start | 10 s |
| Tightening | The interval shrinks 5% every 10 s |
| Shortest interval | 2 s |
| Jitter | Each interval varies by plus or minus 30% |
| Waves | About every 45 s, two extra alarms together |
| Cap | No new director alarms while active alarms are at crew size + 2 (5). From 2:00 the cap rises by 1 every 45 s. |
| Mix | Network 35, CDU Leak 25, Breaker 15, Pump 15, Chiller 10 |

- The director picks a type by weight among types that have eligible equipment, then a random eligible piece.
- Mercy: the director never trips a hall's second side and never trips a second chiller. Only an ignored first failure does.
- Escalations ignore the cap.

With these numbers a scripted player lasts about 4 to 4.5 minutes and delivers about 1.9 GWh.

### 4.6 Score

Energy delivered, in GWh. One real second counts as one plant minute, so 500 MW held for 60 real seconds is 0.5 GWh.

## 5. Engine reference

Import everything from `src/core/index.js`.

### 5.1 Commands

| Call | What it does |
|---|---|
| `createGame({ seed, config })` | New game state. `config` overrides any part of `DEFAULT_CONFIG`. |
| `step(state, dt)` | Advance the rules by `dt` seconds. Use a fixed 0.05. Does nothing once the round is over. |
| `assign(state, techId, alarmId)` | Two-tap dispatch and redirect. Returns `{ ok }` or `{ ok: false, reason }`. |
| `dispatch(state, alarmId)` | One-tap dispatch: sends the nearest idle tech. With `config.oneTap` on and nobody idle, queues the alarm for the next free tech. Returns `{ ok, techId }`, `{ ok, queued }` or `{ ok: false, reason }`. |
| `raiseAlarm(state, type, equipId)` | Raise one alarm by hand, for tests and debugging. |

### 5.2 Queries

| Call | Returns |
|---|---|
| `gw(state)` | `{ deliveredMw, capacityMw, fraction, band }` |
| `alarmInfo(state, alarm)` | `{ id, type, label, equipId, trade, clockTotal, clockLeft, clockFraction, attended, techId, queued, progress, steps, pips, age }`. `clockLeft` is `Infinity` once the alarm has done its worst. |
| `sortedAlarms(state)` | Active alarms, most urgent first (least clock left, then oldest) |
| `powerShield(state, hallId)` | `'whole'`, `'cracked'` or `'broken'` |
| `coolingShield(state)` | `'whole'`, `'cracked'` or `'broken'` |
| `nearestIdleTech(state, alarmId)` | The idle tech with the shortest walk, or `null` |
| `walkDistance(state, tech, alarm)` | World units |
| `fixDuration(state, alarmType, trade)` | Seconds |
| `locationTag(equipId)` | `'Yard'`, `'H1 A'`, `'H2 R1'` |
| `results(state)`, `resultsText(state)` | Numbers for the results screen; plain text for the Copy button |
| `formatClock(seconds)` | `'m:ss'` |
| `spawnInterval(config, t)`, `alarmCap(config, t)` | Director values at time `t` |

### 5.3 State the screen may read

Read these; never write them. `state.t`, `state.over`, `state.meter`, `state.band`, `state.thermal`, `state.alarms`, `state.techs` (each has `id`, `index`, `trade`, `x`, `y`, `state`, `alarmId`), `state.equip[id]`, `state.stats`.

### 5.4 Events

`step` and the commands push objects onto `state.events`. Drain them every frame with `state.events.splice(0)`.

| Type | Fields | Meaning |
|---|---|---|
| `spawn` | `alarmId`, `alarmType`, `equipId`, `cause` | An alarm appeared. `cause` is `director`, `escalation` or `script`. |
| `clear` | `alarmId`, `alarmType`, `equipId`, `techId` | A tech finished a fix |
| `escalate` | `alarmId`, `alarmType`, `equipId`, `effect`, `target` | `effect` is `spread`, `rowShutdown`, `secondSide` or `secondChiller` |
| `burst` | `alarmId`, `equipId`, `targets` | A pump burst into leaks |
| `hallDark`, `hallRestored` | `hall` | A hall lost or regained power |
| `band` | `from`, `to` | The load band changed |
| `assign`, `redirect` | `techId`, `alarmId` or `from` and `to` | A command took effect |
| `over` | `reason` | The round ended |

### 5.5 Supplied drawing code

| Call | Draws |
|---|---|
| `drawCampus(ctx, view, state)` | Floors, lanes, all equipment with live status, labels, shields |
| `drawCrew(ctx, view, techs, selectedId)` | The techs |
| `drawAlarmBubble(ctx, x, y, r, info, options)` | One alarm marker. `options`: `selected`, `pulse` (0 to 1), `assignedTrade`, `queued`. |
| `drawTech`, `drawEquipment`, `drawShield`, `drawFaultGlyph`, `drawTradeIcon`, `drawHatDot`, `drawLabel` | Single pieces, for the crew bar, tickets and HUD |
| `fitView(rect)`, `toScreen(view, x, y)`, `toWorld(view, px, py)` | World to screen and back |

Art rule: techs are simple and the hat is the character. Equipment gets one notch more detail: a clear silhouette plus one telltale feature. Hat colors mean trade and nothing else. Never tint an alarm green, yellow or red.

## 6. The screen

Landscape only. The canvas fills the page inside the safe-area padding that `index.html` already sets. Call the canvas size W x H in CSS pixels. Draw at device pixel ratio.

### 6.1 Regions

| Region | Rectangle | Content |
|---|---|---|
| HUD strip | x 0, y 0, W wide, 34 tall | Clock, load readout, Stability meter, settings and pause buttons |
| Crew bar | x 0, y 34, 76 wide, H - 34 tall | One card per tech |
| Alarm rail | x W - 104, y 34, 104 wide, H - 34 tall | One ticket per alarm |
| Map | x 80, y 36, W - 188 wide, H - 40 tall | `fitView` of the campus |

Put this in a pure function `regions(W, H)` in `src/ui/regions.js`, with tests at 844 x 390, 750 x 340 and 660 x 300.

### 6.2 Colors and type

| Use | Value |
|---|---|
| Page | `#D5DBE3` |
| Panels, cards, tickets | `#FFFFFF` with a 1 px `#C9D1DB` edge, corner radius 8 |
| Ink | `#1F3A5F` |
| Muted text | `#56606E` |
| Band green, yellow, red | `#2E9E6B`, `#D99A1C`, `#D9483B` (HUD only) |
| Font | `system-ui, -apple-system, 'Segoe UI', sans-serif` |
| Sizes | HUD numbers 15 px weight 600; card and ticket text 11 px; nothing below 9 px |

### 6.3 HUD strip

Left to right:

1. Clock: `formatClock(state.t)`.
2. Load: `0.46 / 0.50 GW`, delivered and capacity in GW to two decimals, with a band mark before it. The mark is a shape as well as a color: green circle, yellow triangle, red square.
3. Stability meter: a bar 200 wide and 12 tall, labelled "Stability", filled to `state.meter`%, in the band color.
4. Settings button and pause button, each 44 x 34, at the right end.

### 6.4 Map

Layers, bottom to top: `drawCampus`, `drawCrew`, alarm bubbles, floating text (milestone 7).

Alarm bubbles: one per active alarm, radius 15 px, centered on the equipment's icon center and raised 6 px. Options:

- `selected`: this alarm is the current selection.
- `pulse`: `0.5 + 0.5 * sin(t * 8)` while the clock is under 25% and nobody is on site; otherwise 0.
- `assignedTrade`: the trade of a tech who is walking to it.
- `queued`: `info.queued`.

### 6.5 Crew bar

One card per tech, in crew order, stacked from the top with 4 px gaps. Card: 68 wide, up to 88 tall, sharing the height evenly. Each card shows the tech (`drawTech`, 40 px), a short trade name (Elec, Mech, CE, Net) and its state: "Idle", "Walking" or "Fixing" with a thin progress bar. The selected tech's card has a 2 px ink outline. The whole card is the tap target.

### 6.6 Alarm rail

One ticket per alarm from `sortedAlarms`, most urgent on top, 96 wide and 44 tall with 4 px gaps. If they do not all fit, show as many as fit and a "+N" chip at the bottom. Each ticket shows:

- The fault glyph (`drawFaultGlyph`, 16 px) and a short name: Network, Leak, Breaker, Pump, Chiller.
- `locationTag(equipId)` in muted text.
- A hat dot for the fastest trade, top-right.
- A bar along the bottom: clock left in ink while unattended, fix progress in `#2F6DBC` while attended, solid ink when the clock is spent.
- The hat dot of the assigned tech at the left edge, or a hollow dot when queued.

The selected alarm's ticket has a 2 px ink outline. The whole ticket is the tap target.

### 6.7 Overlays

Plain HTML elements on top of the canvas, one visible at a time. The game is paused while any overlay is open.

| Overlay | Shows | Buttons |
|---|---|---|
| Start | Title, one line of instructions, best score | Start, Tuning |
| Pause | "Paused" | Resume, Restart, Tuning |
| Round over | The results (section 10) | Copy results, Play again, Tuning |
| Tuning | The drawer (section 9) | Reset to defaults, Done |
| Rotate | "Turn your phone sideways" | None. Shown whenever the page is taller than it is wide. |

Copy for the start overlay: "Alarms pile up. Send your crew. Keep the load in the green."

## 7. Input

Use Pointer Events on the canvas (`pointerdown`). Mouse and touch behave the same.

### 7.1 What a tap hits

Check in this order and stop at the first hit: HUD buttons, crew cards, tickets, alarm bubbles (within 22 px of the center), techs on the map (within 22 px), then empty space. When more than one bubble is in range, the nearest center wins; the same goes for techs. Put hit testing in a pure function with tests.

### 7.2 Two-tap mode

The selection is nothing, one alarm, or one tech. Put this in a pure reducer in `src/ui/selection.js` with tests.

| Tap | Selection is nothing | Selection is an alarm | Selection is a tech |
|---|---|---|---|
| An alarm | Select it | Select the new one; tapping the same one deselects | `assign(tech, alarm)`, then clear |
| A tech | Select it | `assign(tech, alarm)`, then clear | Select the new one; tapping the same one deselects |
| Empty space | Nothing | Clear | Clear |

Assigning a busy tech is allowed and is a redirect. If the selected alarm disappears, clear the selection.

### 7.3 One-tap mode

- Tap an alarm with no tech selected: `dispatch(alarmId)`. If nobody is free the alarm is queued and its bubble and ticket show the queued mark.
- Tap a tech, then an alarm: `assign`, exactly as in two-tap mode. This is the manual override.

### 7.4 Desktop extras

Keys 1 to 3 act as taps on the three crew cards. Space toggles pause.

## 8. The game loop

- `requestAnimationFrame` drives drawing.
- The rules run in fixed 0.05 s steps from an accumulator. Run at most 5 steps per frame and drop the rest, so a slow frame cannot snowball.
- Pause when an overlay is open, when the page is hidden (`visibilitychange`) and when the page is taller than wide.
- Each round uses a new seed: `Date.now() % 1000000000`.
- Drain `state.events` every frame.

## 9. Tuning drawer

Changes apply when the next round starts. Save the values under `localStorage['facops.tuning.v1']`.

| Label | Config key | Min | Max | Step | Default |
|---|---|---|---|---|---|
| First alarm interval (s) | `director.startInterval` | 4 | 20 | 0.5 | 10 |
| Tightening per 10 s (%) | `director.tighten` x 100 | 0 | 10 | 0.5 | 5 |
| Shortest interval (s) | `director.floor` | 1 | 5 | 0.25 | 2 |
| Walk speed | `walkSpeed` | 60 | 240 | 10 | 120 |
| Matching-hat bonus (%) | `tradeBonus` x 100 | 0 | 50 | 5 | 15 |
| Clock length (x) | `clockScale` | 0.5 | 2 | 0.1 | 1 |
| Waves | `director.waveEvery`: 45 on, 0 off | | | | On |
| One-tap dispatch | `oneTap` | | | | Off |

Use native range inputs and checkboxes. Show each value next to its slider.

## 10. Results

Shown on the round-over overlay, from `results(state)`:

- Time survived and energy delivered, large.
- Share of possible energy; time in green, yellow and red.
- Alarms raised and cleared; average and longest time to clear.
- Escalations: row shutdowns, dark halls, network spreads, pump bursts, second chillers.
- Redirects and the share of fixes by the matching hat.
- Best score so far, saved under `localStorage['facops.best.v1']` as `{ energyGwh, seconds }`.

The Copy button writes `resultsText(state)` to the clipboard with `navigator.clipboard.writeText` inside the click handler, and falls back to selecting the text in a `textarea` if that fails. It then reads "Copied".

## 11. Feel (milestone 7)

- Floating loss text at the equipment, rising 20 px and fading over 1 s: "-25 MW" on a network failure, "-50 MW" on a leak, "-75 MW" when a row shuts down, "-250 MW" when a hall goes dark.
- A 300 ms flash of the HUD strip when the band turns red.
- A bubble pops in over 150 ms when its alarm appears.
- A tech's hat bobs 1 px while walking.

## 12. Milestones

One milestone per session. Each ends with all tests passing, a commit pushed to `main`, a tag, and `docs/PROGRESS.md` updated with what was built and the owner's checklist.

### M1. Live map (tag `m1`)

Build: the game loop; `drawCampus`, `drawCrew` and alarm bubbles every frame; a temporary text readout of time, load and meter; `#auto` in the address plays the round with `greedyMove` (reaction 1 s, one command per 0.8 s).

Checks:

- The first alarm appears about 5 s in.
- With `#auto`, techs walk along lanes, bubbles show progress, alarms clear, and the round ends in roughly 4 minutes.
- Without `#auto`, alarms escalate and the round ends within about two minutes, usually about one. The loop stops.
- No errors in the console.

Owner's checklist: the map fits the phone in landscape with nothing cut off; each machine is recognizable; alarm bubbles are easy to see.

### M2. Two-tap dispatch on the map (tag `m2`)

Build: pointer input, hit testing and the selection reducer; tap an alarm bubble then a tech, or the other way round; redirect; selection rings.

Checks: reducer and hit-test tests cover every cell of the table in 7.2; a full round can be played on the map alone.

Owner's checklist: taps land where you aim; sending and redirecting feel instant.

### M3. HUD and round over (tag `m3`)

Build: `regions`; the HUD strip; the start, pause and round-over overlays with Play again; the best score.

Checks: `regions` tests pass at the three sizes in 6.1; the meter and load readout match `gw(state)` and `state.meter`; the best score survives a reload and the game still works with storage blocked.

Owner's checklist: you can always tell why the meter is draining.

### M4. Crew bar and alarm rail (tag `m4`)

Build: crew cards and tickets as tap targets; ticket order from `sortedAlarms`; the "+N" chip.

Checks: a full round can be played from the two rails alone, without touching the map.

Owner's checklist: playing from the rails is comfortable with two thumbs.

### M5. One-tap switch and tuning drawer (tag `m5`)

Build: the tuning overlay; saved tuning; one-tap mode with the queued mark.

Checks: every slider changes its config key; Reset restores `DEFAULT_CONFIG`; in one-tap mode a queued alarm is taken by the next free tech.

Owner's checklist: try a round in each mode and note which you prefer.

### M6. Results, pause and phone polish (tag `m6`)

Build: the full results panel and Copy; pause on hidden page; the rotate overlay; safe areas checked with the notch on either side; "Add to Home Screen" opens full screen.

Checks: the copied text equals `resultsText(state)`; rotating to portrait pauses and rotating back resumes.

Owner's checklist: paste a result into a chat; add the game to the Home Screen and play one round there.

### M7. Feel (tag `m7`)

Build: section 11.

Checks: still 60 frames per second on the phone with ten alarms active.

Owner's checklist: play ten rounds and paste the results.

## 13. When pass 1 is done

Pass 1 passes if, after about ten rounds, the owner still wants another and can name moments where a choice mattered. If it feels flat, the levers to try, in order, are longer walks (lower walk speed), parts that must be fetched, and jobs that need two techs. Stronger trades are not a lever: trades stay flavor.

## 14. Words

| Word | Meaning |
|---|---|
| MSB | Main switchboard. Each hall has two, side A and side B. |
| CDU | Coolant distribution unit. Feeds one row of five racks. |
| Attended | A tech is on site and fixing the alarm |
| Clock | Time until an ignored alarm gets worse |
| Shield | Whole: redundancy intact. Cracked: one failure from loss. Broken: load is being lost. |
| Band | Green, yellow or red, from the load fraction |
| Director | The part of the rules that decides when and where alarms appear |
