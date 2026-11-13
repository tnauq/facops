# FacOps pass 3 build spec

Version 0.7, 13 November 2026 (0.7: M19, the graphical pass the owner asked for, section 4a; 0.6: M17's checks set the defaults and the owner turned off the late alarm-cap rise, 4.4 and 4.5; 0.5: the CEO specified in full, section 4; 0.4: M15 puts the cost on a ticket's first line; 0.2 records the owner's answers on the CEO schedule; 0.3 the CEO's name and the two pacing rule changes, now section 4.4). Drafted from the M13 build review (`FacOps_Build_Review_M13.md` in the owner's project) after the owner asked to start on its recommendations. This is the source of truth for pass 3, as `docs/pass2-spec.md` was for pass 2. Pass 2's rules and screen carry over except where this spec says otherwise. If the spec is silent or looks wrong, stop and ask the owner.

Items marked **[Recommended]** are choices made for the owner, kept unless the owner changes them. Milestones M14 to M18 are specified in full.

## 0. Why pass 3, and in what order

The build review found that pass 2 matches its spec, but the design pillars are not landing yet:

- **Redundancy is invisible.** The rules work out every shield, but the pass 2 map draws none and nothing shows the spare chillers.
- **Late in a run most alarms are out of sight,** and the rail sorts by clock only, so an alarm already losing power can sit hidden below the "+N" chip.
- **Skill barely changes the result,** and there is nothing to triage for the first 8 minutes. The CEO walkthrough is the design's intended skill test.

So pass 3 builds readability first (M14 to M16, screen only apart from one bug fix), then the CEO on top of it. The CEO needs all three: its view cone is only fair if the player can see what is unattended, what it costs, and where it is.

**Owner agreement on rule changes.** On 13 November 2026 the owner agreed to the M14 bug fix (section 1.1), and to the two pacing changes in section 4.4, which are built with the CEO rules in M17. The owner approved the CEO's rules (4.1 to 4.6) on 13 November, and after M17's checks agreed to turn off the alarm cap's rise after full campus (4.4). No other rule in `src/core/` changes in M14 to M16.

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

Every ticket shows what that alarm costs right now, for example `−6 MW`, in bold on its first line in place of the alarm's name (the fault picture beside it still says what it is). A ticket that costs nothing yet shows the name as before. *(Changed in M15: the 96 px ticket cannot fit the place and the cost on one line.)*

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

`alarmCost(state, alarm)` in a new pure module `src/ui/cost.js`, worked out from the rules engine's public state and config (`src/core/` stays untouched), and checked in tests against the load the engine itself gives back when the fault is gone. Tests cover every row of the table, a row that is both network-down and dark, and the cooling shortfall.

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

- Each online hall: its power and liquid shields as two small shields (the supplied drawing, whose crack line means colour is not the only sign).
- Each plant: the cooling shield and the spare count.
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

## 4. M17 and M18. The CEO walkthrough

GDD section 8, fitted to the 8-hall building. The character is simply **The CEO** (owner, 13 November): a fictional tech-founder parody with original lines, no real person's name, face or quotes. The CEO walks with an **assistant** carrying a clipboard, who is only there for the joke.

### 4.1 Visits

| Visit | Starts | Route | Warning | Each unattended alarm seen |
|---|---|---|---|---|
| Ribbon-cutting | Hall 3 comes online | Hall 3 | 20 s | −15 Stability |
| Handover | Hall 8 comes online | Every online hall, 1 to 8 | 20 s | −35 |
| Walkthrough 1 | 45 to 60 s after the Handover ends | 2 or 3 areas | 20 s | −50 |
| Walkthrough 2 | 45 to 60 s after the last visit ends | 2 or 3 areas | 15 s | −70 |
| Zero tolerance | Walkthrough 3 and every one after, 45 to 60 s apart | 2 or 3 areas | 12 s, then 1 s less each visit, down to 8 s | **Run over** |

- Owner, 13 November: no extra visit at hall 6; zero tolerance from the third walkthrough.
- The gaps between visits are drawn from the seeded generator (45 to 60 s, set by M17's checks; the draft had 60 to 90).
- **Start with halls** in the drawer: 3 to 7 skips the ribbon-cutting; 8 starts the Handover warning 30 s into the run, so the late game can still be tested quickly.
- The tutorial never has a visit (it ends at hall 2).
- A Stability hit can empty the meter; that ends the run like any other empty meter, with the CEO named as the cause.

### 4.2 Routes

- **Areas** are Plant A, the 8 halls and Plant B, in that order along the building. Only online areas are used.
- **Walkthrough routes** pick a random online area, then continue along the building to 1 or 2 neighbouring online areas (2 or 3 areas in all, fewer only if the campus has fewer). Neighbours keep the walk short and readable.
- The CEO appears on the top corridor at the first area's outer door, walks to each area's **inspection point** (a hall's centre, where its middle aisle crosses its middle column; a plant's lane at the middle aisle), **inspects** there, and leaves from the last one (walks back to the corridor and disappears).
- Walking uses the same lanes and doors as the techs (`route` in `src/core/layout2.js`), at **90** units a second: a stroll, slower than the crew's 150.
- **Inspecting:** 4 s per area: 2 s facing the top half, 2 s facing the bottom half. The Handover inspects each hall for 2 s (1 s each way) so the tour of 8 halls takes about a minute.

### 4.3 What the CEO sees

- A **view cone**: everything within **260** units, in a **140°** cone in the direction the CEO faces. While walking the CEO faces the way they walk; while inspecting, up then down. From a hall's inspection point the cone reaches the hall's CDU on that side and its three rows on that side, but not the MSBs out in the corridor; walking along a corridor it sweeps the MSBs and CDUs it passes.
- An alarm is **seen** when its equipment is inside the cone. It counts as **attended** only if a tech is on site and fixing it; a tech still walking there does not count (GDD).
- Each alarm can cost at most once per visit: the first moment it is seen unattended is a **sighting**. A sighting costs the visit's Stability hit (or ends the run under zero tolerance) and the CEO says something.
- An alarm that is attended when first seen, and is then dropped while still in view, is a sighting at that moment.
- **Fairness:** once the CEO has arrived, the director starts no new alarms on anything the CEO could see from the route (within the view radius of any point of it, whichever way the CEO faces). During the warning alarms still come there: that is what getting ready is for. Escalations always happen (that is the player's doing). Elsewhere the director carries on as normal.

### 4.4 Pacing changes (owner agreed 13 November)

Both fix weaknesses the review's scripted runs showed, and both are tuning-drawer controls so they can be adjusted after play.

- **Pressure keeps building between halls.** Today the director's 5%-every-10-s tightening resets at each Delivery. New: a new phase starts from its table interval but keeps a share of the tightening already earned. `director.carryOver`, 0 (pass 2's behaviour) to 1 (all of it); default **0.7**, set by M17's checks.
- **Big failures always hurt.** While any half-hall is dark, or a hall is shut by two leaks (counted as both halves), the meter does not fill and drains `meter.darkDrain` points a second for each dark half, on top of any band drain. Default **1** (a whole dark hall then drains like red).

- **No extra alarms after full campus** (owner, 13 November, after M17's checks): pass 2 raised the alarm cap by 1 every 30 s after hall 8, which emptied the meter before the CEO mattered. `director.capGrowEvery` now defaults to 0 (off); the drawer can switch it back on.

### 4.5 Scripted checks (M17)

The scripted player learns the CEO: when a visit is announced it sends free techs to unattended alarms in the route's areas first, nearest first, and it keeps techs on them until the CEO has passed. A second, **CEO-blind** player ignores visits. 12 seeds each, tutorial off. M17 sets the defaults of `carryOver` and `darkDrain` (and, if needed, the visit costs and gaps) so that:

| Check | Target |
|---|---|
| Good CEO-aware player: run length | 9 to 13 minutes; most runs ended by zero tolerance |
| Good CEO-aware player reaches hall 8 | 10 of 12 seeds or more |
| CEO-blind player | Ends at least 90 s earlier on average, and scores at least 15% less |
| Random player (random alarm, random free tech) | Scores at least 25% less than the good aware player |
| Between hall 3 and hall 8, good player | More alarms waiting than free techs 10 to 30% of the time (today 0 to 1%) |
| Very slow player (reacts in 4 s) | Most runs end before zero tolerance |

The results go in `docs/PROGRESS.md` as the M13 and 1.3 tables did. If no setting meets them all, stop and show the owner the closest settings. *(M17: every target but one is met; zero tolerance ends only about 2 runs in 12, because it starts at about 12 minutes. See `docs/PROGRESS.md`.)*

### 4.6 Rules surface (M17)

- New state: `state.ceo`, null between visits, otherwise `{ visit, kind, phase: 'warning' | 'walking' | 'inspecting' | 'leaving', areas, path, x, y, facing, until, cost, sightings }`; `state.ceoVisits` (how many have finished).
- Events: `ceoWarning` (kind, areas, seconds, cost, `zeroTolerance`, `nextIsZeroTolerance`), `ceoArrive`, `ceoSighting` (alarm, cost), `ceoLeave` (sightings), `runOver` gains `cause: 'ceo'` when a sighting or a CEO hit ends the run.
- Query `ceoSees(state, equipId)` and `ceoCone(state)` for the screen and the scripted player.
- Results and Copy add: CEO visits survived, sightings, and "Fired by the CEO" when that ended the run.
- New config (all in `src/core/config2.js`): `ceo.enabled`, `ceo.speed` 90, `ceo.viewRadius` 260, `ceo.viewAngle` 140, `ceo.inspect` 4, `ceo.inspectHandover` 2, `ceo.gap` [45, 60], `ceo.visits` (the table in 4.1), `ceo.ztWarning` 12, `ceo.ztWarningMin` 8; `director.carryOver`; `meter.darkDrain`.
- New drawer controls: CEO visits (on/off), Tightening kept between halls (%), Extra alarm after full campus every … s (0 = off), Drain per dark half-hall.
- Tests: each visit starts when it should, the route uses only online areas and neighbours, the cone (inside, outside the radius, outside the angle, through the inspect turn), walking techs do not count, one sighting per alarm per visit, a dropped job in view is a sighting, zero tolerance ends the run, the director keeps out of the route, Start with halls 8 still gets a Handover, the two pacing changes.

### 4.7 On screen (M18)

- **The CEO and the assistant**, drawn in a new file `src/render/ceo.js` in the style of the crew but clearly not crew: a dark suit, no vest, and a plain white hardhat (white is no trade's colour); the assistant follows a step behind with a clipboard. Hat colours still mean trade only.
- **The view cone** on the floor: a translucent ink wedge, never green, yellow or red.
- **The route** as a dashed ink line on the floor from the warning on, with a small mark at each inspection point; the same line and the CEO's dot on the overview strip. An off-map arrow with a small CEO face points to the CEO when out of view.
- **The banner**, a strip across the top of the map during the warning and the visit:
  - Warning: `The CEO is coming · Halls 4, 5 · 0:15` and, on a second line, `Each unattended alarm seen: −50`.
  - The visit before zero tolerance adds `Next visit: zero tolerance`.
  - Zero tolerance: `Zero tolerance · Halls 6, 7 · 0:12` and `Any unattended alarm seen ends the run`.
  - During the visit the countdown is replaced by the areas left.
- **A sighting:** the CEO's speech bubble with a line (4.8), the alarm's bubble shaken, `−50` floating up from it, and the HUD flash.
- **The run-over card**, when the CEO ended the run, has the headline **Fired by the CEO** and the CEO's parting line above the usual results.
- Readability: the banner never covers the overview strip or the rails; at 660 x 300 it uses one line (`CEO · H4, H5 · 0:15 · −50`).

### 4.8 The CEO's lines (original; chosen at random from each list)

| When | Lines |
|---|---|
| Arriving | "Walk with me. Fast. I have a rocket at four." · "Show me the future. Quickly." · "I was told this building is fine. Let's find out." |
| Ribbon-cutting | "Big scissors. Bigger hall. Let's cut something." · "I already announced this hall. Twice." |
| Handover | "Eight halls. Now make them never break." · "Congratulations. Now it's mine." |
| Sighting: CDU Leak | "Why is the computer wet?" · "Water is just liquid downtime." |
| Sighting: Breaker Trip | "Who turned off the money?" · "That box looks sad. Fix its feelings." |
| Sighting: Network Failure | "That rack has stopped believing in us." · "Have you tried turning it on?" |
| Sighting: Chiller Trip | "It's warm in here. Warm is a choice." · "Is the snowflake supposed to be off?" |
| Sighting: Pump Overpressure | "Is that needle supposed to be up there? Rhetorical." · "That gauge is very excited." |
| Sighting: any | "Nobody is fixing that. Interesting." · "I'm going to post about this." · "Add that to the all-hands." |
| Leaving, no sightings | "Acceptable. Barely. Keep shipping." · "Great hustle. Do it again, faster." |
| Leaving, with sightings | "We'll talk about this at the offsite." · "I'm adding a dashboard to your dashboard." |
| Announcing zero tolerance | "Next visit I want zero problems. Not few. Zero." |
| Firing you | "You're done. I'll get an AI to run this." · "Clear your desk. Take a cart." |

### 4.9 Owner's checklists

M17 (rules, seen through the existing screen with a plain text banner): watch an `#auto` run to the end; the CEO's visits appear in the HUD note and the results say how the run ended. Does the middle of the run feel busier?

M18: play three full runs. Can you see where the CEO is going and get a hat on every alarm in the way? Does zero tolerance feel like a fair ending? Did anything make you laugh?

### 4.10 Milestones

M17: the rules (4.1 to 4.6), with the scripted checks. M18: the screen (4.7, 4.8).

## 4a. M19. Graphical pass (owner, 13 November)

The owner asked for a graphical pass after playing the CEO build. This is also the owner's agreement to redraw the chiller (the supplied drawing in `src/render/icons.js`); the rest of the supplied drawings stay.

- **Pipes:** the pumps, chillers and CDUs are joined by insulated chilled-water pipes. Each plant has a riser beside each column of chillers with a branch to every chiller, the outer riser joining its top and bottom pumps; two headers run the length of the building at y = 125 and 655, between the corridors and the halls, and every CDU sits on one. Pipes beyond the online halls, and Plant B's before hall 6, are pale. Drawing only: the rules do not use pipes. Layout in `src/ui/pipes.js` with tests.
- **Floors:** white raised-floor tiles (32 world units) inside the data halls; smoothed concrete with saw-cut control joints everywhere else, made as a small texture in code; the plants stand on slightly darker pads; walkways are a lighter band with faint edges.
- **Chillers:** water-cooled centrifugal chillers seen from above, in the same 100 x 72 footprint: two shell-and-tube barrels, water boxes and nozzles, the compressor volute and motor across the top, a control panel and the mechanical badge. Generic: no maker's name, logo or livery. A tripped chiller greys its compressor and motor and gets the red slash.
- Checked at 844 x 390 and 660 x 300, at about 60 frames per second.

Owner's checklist: do the pipes make the plant read as one system? Do the halls and the concrete look right on the phone? Do the chillers read as chillers, and is a tripped one still obvious?

## 5. Later

In the order the review recommends, each to be specified when reached: staging and tech locations on the crew cards; puddles; the rest of the tutorial (the second side, Network and Pump introductions, the off-map arrows, cooling); sound; a run-over screen worth a screenshot; a Settings card (one-tap, sound, reduce flashing, text size, replay tutorial, glossary); small polish (Home Screen icon, full-screen button, delivery truck, step pips).

## 6. Open questions for the owner (before M17)

1. ~~Visits~~ **Answered 13 November:** no extra visit at hall 6.
2. ~~When zero tolerance starts~~ **Answered 13 November:** on the third walkthrough after Handover.
3. ~~Who the CEO is~~ **Answered 13 November:** "The CEO", a fictional tech-founder parody with original lines.
4. ~~Pacing knobs~~ **Answered 13 November:** yes to both (section 4.4).

All answered.

## 7. Milestones

One per session, as before. Commit titles start with the milestone (`M14: ...`) so the action tags them.

| Milestone | Build |
|---|---|
| M14 | Endless-run fix; hall shields, cooling shield and spare chillers on the map (section 1) |
| M15 | Alarm rail that triages; rings on the off-map arrows (section 2) |
| M16 | Campus overview strip (section 3) |
| M17 | CEO rules, the pacing changes and the scripted checks (4.1 to 4.6) |
| M18 | CEO on screen, with the lines (4.7, 4.8) |
| M19 | Graphical pass: pipes, floors, centrifugal chillers (4a) |
