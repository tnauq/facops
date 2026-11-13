# FacOps pass 3 build spec

Version 0.3, 13 November 2026 (0.2 records the owner's answers on the CEO schedule; 0.3 the CEO's name and the two pacing rule changes in section 4.1). Drafted from the M13 build review (`FacOps_Build_Review_M13.md` in the owner's project) after the owner asked to start on its recommendations. This is the source of truth for pass 3, as `docs/pass2-spec.md` was for pass 2. Pass 2's rules and screen carry over except where this spec says otherwise. If the spec is silent or looks wrong, stop and ask the owner.

Items marked **[Recommended]** are choices made for the owner, kept unless the owner changes them. Milestones M14 to M16 are specified in full. The CEO (M17 onwards) is an outline; the owner has answered its open questions (section 6), and it is specified in full once M16 is done.

## 0. Why pass 3, and in what order

The build review found that pass 2 matches its spec, but the design pillars are not landing yet:

- **Redundancy is invisible.** The rules work out every shield, but the pass 2 map draws none and nothing shows the spare chillers.
- **Late in a run most alarms are out of sight,** and the rail sorts by clock only, so an alarm already losing power can sit hidden below the "+N" chip.
- **Skill barely changes the result,** and there is nothing to triage for the first 8 minutes. The CEO walkthrough is the design's intended skill test.

So pass 3 builds readability first (M14 to M16, screen only apart from one bug fix), then the CEO on top of it. The CEO needs all three: its view cone is only fair if the player can see what is unattended, what it costs, and where it is.

**Owner agreement on rule changes.** On 13 November 2026 the owner agreed to the M14 bug fix (section 1.1), and to the two pacing changes in section 4.1, which are built with the CEO rules in M17. No other rule in `src/core/` changes in M14 to M16.

## 1. M14. Endless-run fix, and shields on screen

### 1.1 Fix: a run that can never end

**Tuning > Start with halls 8** made a run that could not be lost: the rule "the meter cannot empty before the first Delivery" held the meter at 1, and with all 8 halls online no Delivery ever comes.

New rule (pass 2 spec 4.6 is amended): **the meter cannot empty before the first Delivery, while a hall is still to be built.** With all halls online from the start, the floor does not apply. Starting with 1 to 7 halls is unchanged.

Test: a run started with 8 halls that nobody plays ends.

### 1.2 Hall shields

Every online hall shows two shields side by side at the top of the hall, one either side of its title:

| Shield | Glyph beside it | Whole | Cracked | Broken |
|---|---|---|---|---|
| Power (pass 2 spec 4.3) | Bolt | No MSB down | One MSB of a pair down | Both MSBs of a pair down: half the hall is dark |
| Liquid (pass 2 spec 4.3a) | Droplet | No CDU leaking | One CDU leaking | Both leaking: the hall is shut |

- The states come from `powerShield` and `liquidShield` in the rules engine. Nothing new is worked out on the screen.
- The shields use the supplied `drawShield` drawing (green whole, amber cracked with a crack line, red broken). Shields are not alarms, so the art rule about tinting alarms does not apply; the crack line and the ring mean colour is never the only sign.
- **The ring.** A cracked shield has a ring around it running down with the clock of the alarm that will break it: the open Breaker Trip on the cracked pair (the one with least time left, if both pairs are cracked), or the open CDU Leak. The ring stands still while a tech is fixing that alarm, as the clock does. Ink on a pale track; never green, yellow or red.
- Offline halls show no shields.
- Size: at least 18 px tall on screen, about 30 world units at the iPhone's zoom.

### 1.3 Cooling shield and spare chillers

Each online plant shows the cooling shield beside its title, followed by the spare count:

| Spares running (pass 2 spec 4.4) | Shield | Text |
|---|---|---|
| 2 or more | Whole | `3 spare` |
| 1 or 0 | Cracked | `1 spare`, `0 spare` |
| Fewer than needed | Broken | `2 short` |

- The cooling shield is for the whole campus; both plants show the same one once Plant B is online.
- Its ring runs down with the open Chiller Trip that has least time left, when one is open and unattended or being fixed. A cracked cooling shield with no chiller alarm open (spares are low because the campus grew) has no ring.

### 1.4 Code

- `src/ui/shields.js`: pure. `shieldsModel(state)` returns `{ halls: [{ hall, power, liquid }], cooling }`, each shield `{ status, ring }` where `ring` is the fraction of the threatening alarm's clock left, or `null`; `cooling` also has `spare`. Tests in `tests/shields.test.js`.
- Drawing in `src/render/shields.js`, called from `src/render/map2.js` after the building and before the crew.

### 1.5 Owner's checklist

- Open https://tnauq.github.io/facops/ in landscape (reload once). Every hall has a bolt shield and a droplet shield at the top; Plant A shows the cooling shield and how many spare chillers are running.
- Let a breaker trip sit: the power shield cracks and its ring runs down; when the other side trips it breaks. Fix it and it goes back to whole.
- Watch the spares fall as halls come online, down to 1 at hall 5, and jump when Plant B arrives at hall 6.
- Tuning > Start with halls 8, then leave it: the run now ends.
- Can you say what a cracked shield means without being told?

## 2. M15. An alarm rail that triages

### 2.1 What each alarm costs now

Every ticket shows what that alarm costs right now, for example `−6 MW`, on its second line after the place (`H3 top · −6 MW`). Nothing shown when it costs nothing yet.

**Cost now** = the MW that would come back if this alarm alone were fixed this instant, at the current cooling factor, rounded to whole MW:

| Alarm | Cost now |
|---|---|
| Network Failure | Its row's output: 6.25 MW x cooling factor (0 if the row is also dark or shut by leaks) |
| CDU Leak, other CDU fine | The 10% throttle on the hall's live rows: about −4 MW |
| CDU Leak, both leaking | What fixing this one gives back: the hall's live rows at 90%, about −34 MW (each of the two tickets shows it) |
| Breaker Trip, partner fine | 0 |
| Breaker Trip, both down | That half of the hall: about −19 MW (each of the two tickets) |
| Chiller Trip | The load gained by one more running chiller, when cooling is short; otherwise 0 |
| Pump Overpressure | 0 |

`alarmCost(state, alarm)` in a new pure module `src/ui/cost.js`, computed with the rules engine's own row logic (row level and the cooling target) rather than copies of it. Tests cover every row of the table, a row that is both network-down and dark, and the cooling shortfall.

### 2.2 Order

Tickets that cost something come first, biggest cost first; then the rest by clock, least time left first, then oldest (as now). A tech already on site fixing does not change the order.

### 2.3 Overflow

- **The rail scrolls.** Drag up and down on the rail to scroll it; it stops at the ends. A drag on the rail never pans the map. A touch that moves less than 8 px is still a tap on a ticket.
- The "+N" chip becomes **`+N more`** and is a 44 px tall tap target: tapping it scrolls down one page. When the rail is scrolled, a matching `▲ N` chip at the top scrolls back up.
- When a new alarm arrives that costs more than every alarm in view, the rail scrolls back to the top.

### 2.4 Off-map arrows

- Each arrow carries a ring around its disc with the clock of its most urgent alarm (same as a bubble's ring), and a small `−6` under the disc when that alarm costs something.
- A merged arrow shows its most urgent alarm by the order of 2.2, not the nearest one, and tapping it pans to that alarm.

### 2.5 Owner's checklist

- With several alarms open, can you tell from the rail alone which one is costing most?
- An alarm that has spread (both CDUs, both breakers) jumps to the top of the rail.
- Late in a run, drag the rail to see the rest, and tap `+N more`.
- Do the rings on the edge arrows tell you when to go and look?

## 3. M16. Campus overview strip  [Recommended layout]

### 3.1 What it shows

One thin bar showing the whole building at once: Plant A, the 8 halls in their pairs, Plant B, drawn to scale left to right.

- Each online hall: its power and liquid shield as two small dots in the shield colours (cracked: amber, broken: red, with an outline so colour is not the only sign).
- Each plant: the cooling shield dot and the spare count.
- Offline halls and Plant B before hall 6: pale.
- Every open alarm: an ink dot at its place; a ringed dot when it costs something.
- Every tech: a hat-coloured dot.
- A frame showing what the map shows now.

### 3.2 Where and how

- **Placement [Recommended]:** along the bottom of the map region, 28 px tall drawn; the map region shrinks by 30 px. Its tap area reaches 16 px up into the map so it is 44 px tall; the strip wins over the map in that band.
- **Tap or drag on it** to move the view there (the frame follows the finger). This is the fastest way across the building.
- The off-map arrows and the rail still work as before.

### 3.3 Owner's checklist

- Can you tell at a glance which halls are in trouble?
- Tap a hall on the strip: the view jumps there. Drag along it: the view follows.
- Does the map still feel big enough on the phone?

## 4. M17 onwards. The CEO walkthrough (outline)

GDD section 8, fitted to the 8-hall building. The character is simply **The CEO** (owner, 13 November): a fictional tech-founder parody with original lines, no real person's name, face or quotes.

- The CEO and an assistant walk a marked route. Any alarm that enters the CEO's view must be **attended**: a tech on site and fixing. An unattended alarm in view costs Stability points that grow with each visit; under zero tolerance it ends the run.
- **Telegraph:** a banner and countdown that name the areas, the route drawn on the floor and on the overview strip, the view cone always visible.
- Schedule (owner, 13 November: no extra visit at hall 6; zero tolerance from the third walkthrough). Times from the scripted runs: hall 3 at about 2:10, hall 8 at about 7:05.

| Visit | When | Route | Warning | Unattended alarm costs |
|---|---|---|---|---|
| Ribbon-cutting | Hall 3 online | Hall 3 | 20 s | 15 points |
| Handover | Hall 8 online | All 8 halls, along the corridor | 20 s | 35 points |
| Walkthrough 1 | 60 to 90 s later | 2 or 3 areas | 20 s | 50 points |
| Walkthrough 2 | 60 to 90 s later | 2 or 3 areas | 15 s | 70 points |
| Zero tolerance | Walkthrough 3 and every one after | 2 or 3 areas | 12 s, shrinking to 8 s | Run over |

Zero tolerance then starts at about 10:30 to 11:00, so most runs end around 11 to 12 minutes.

### 4.1 Pacing changes (owner agreed 13 November)

Both fix weaknesses the review's scripted runs showed, and both are tuning-drawer controls so they can be adjusted after play.

- **Pressure keeps building between halls.** Today the director's 5%-every-10-s tightening resets at each Delivery. New: a new phase starts from its table interval but keeps a share of the tightening already earned. `director.carryOver`, 0 (today's behaviour) to 1 (all of it), starting value 0.5; M17's scripted checks set the default so the middle of the run has real triage (crew short-handed some of the time between halls 3 and 8) and hall 8 still arrives for a good player.
- **Big failures always hurt.** While any half-hall is dark, or a hall is shut by two leaks (counted as both halves), the meter does not fill and drains `meter.darkDrain` points a second for each dark half, on top of any band drain. Starting value 1 (a whole dark hall then drains like red); M17's checks set the default.

Tests: tightening carried at the set share across a Delivery, and none at 0; the meter draining with a dark half-hall while the load is green, at any campus size.

### 4.2 Milestones

Probably two milestones: M17, the rules (visits, routes, view cone, costs, scripted-player checks of run length and of skill making a difference); M18, the screen (CEO and assistant drawn, banner, route, cone, the CEO's lines, and the run-over line when the CEO ends a run).

## 5. Later

In the order the review recommends, each to be specified when reached: staging and tech locations on the crew cards; puddles; the rest of the tutorial (the second side, Network and Pump introductions, the off-map arrows, cooling); sound; a run-over screen worth a screenshot; a Settings card (one-tap, sound, reduce flashing, text size, replay tutorial, glossary); small polish (Home Screen icon, full-screen button, delivery truck, step pips).

## 6. Open questions for the owner (before M17)

1. ~~Visits~~ **Answered 13 November:** no extra visit at hall 6.
2. ~~When zero tolerance starts~~ **Answered 13 November:** on the third walkthrough after Handover.
3. ~~Who the CEO is~~ **Answered 13 November:** "The CEO", a fictional tech-founder parody with original lines.
4. ~~Pacing knobs~~ **Answered 13 November:** yes to both (section 4.1).

All answered: M17 can be specified in full when M16 is done.

## 7. Milestones

One per session, as before. Commit titles start with the milestone (`M14: ...`) so the action tags them.

| Milestone | Build |
|---|---|
| M14 | Endless-run fix; hall shields, cooling shield and spare chillers on the map (section 1) |
| M15 | Alarm rail that triages; rings on the off-map arrows (section 2) |
| M16 | Campus overview strip (section 3) |
| M17 | CEO rules and the pacing changes (section 4) |
| M18 | CEO on screen |
