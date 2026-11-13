# Progress

The newest entry is at the top of the log. One milestone per session; see `docs/pass1-spec.md`, section 12.

| Milestone | Tag | Status |
|---|---|---|
| M0. Repo seed: rules engine, tests, art, map page | `m0-seed` | Done |
| M1. Live map | `m1` | Done |
| M2. Two-tap dispatch on the map | `m2` | Done |
| M3. HUD and round over | `m3` | Done |
| M4. Crew bar and alarm rail | `m4` | Done |
| M5. One-tap switch and tuning drawer | `m5` | Done |
| M6. Results, pause and phone polish | `m6` | Done |
| M7. Feel | `m7` | Done |

## Owner setup, once

1. Create a public repository named `facops` under `tnauq`. Tick "Add a README" so the repository is not empty.
2. Have the coding agent put these files in it on the `main` branch, replacing that README, and tag the commit `m0-seed`.
3. On GitHub: Settings, Pages, "Deploy from a branch", branch `main`, folder `/ (root)`, Save.
4. After a minute, open https://tnauq.github.io/facops/ on the phone, in landscape.

## Pass 2

The owner approved `docs/pass2-spec.md` (version 1.0) on 12 November 2026.

| Milestone | Tag | Status |
|---|---|---|
| M8. Pass 1 snapshot and the new map | `m8` | Done |
| M9. Rules engine for pass 2 | `m9` | Done |
| M10. Playable on the new map | `m10` | Done |
| M11. Deliveries and crew picks | `m11` | Done |
| M12. Tutorial | `m12` | Done |
| M13. Feel and phone check for pass 2 | `m13` | Done |

## Pass 3

The owner asked to start on the M13 build review's recommendations on 13 November 2026, and agreed to the M14 rule fix. `docs/pass3-spec.md` (version 0.1) specifies M14 to M16 in full; the owner answered the CEO questions (section 6) the same day, so M17 is specified once M16 is done.

| Milestone | Tag | Status |
|---|---|---|
| M14. Endless-run fix, and shields on screen | `m14` | Done |
| M15. An alarm rail that triages | `m15` | Done |
| M16. Campus overview strip | `m16` | Done |
| M17. CEO rules and pacing changes | `m17` | Done |
| M18. CEO on screen | `m18` | Next |

## Log

### M17. CEO rules and pacing changes

Built:

- **The CEO's visits** (`src/core/ceo.js`), as pass 3 spec 4.1 to 4.3: the ribbon-cutting at hall 3, the Handover tour of every hall at hall 8, then walkthroughs of 2 or 3 neighbouring areas, 45 to 60 s apart. Each has a warning, a route along the crew's lanes and a 140° view cone of 260 units. An unattended alarm seen costs 15, 35, 50, then 70 Stability; from the third walkthrough one sighting ends the run. A tech walking there does not count; one on site and fixing does. Each alarm costs at most once a visit, and pulling a tech off a job in view is a sighting.
- **Fairness, changed while checking** (spec updated): the "route" is everything the CEO could see from the path, not just the named areas. Once the CEO arrives, no new alarms start on it; during the warning they still can, because getting ready is the game. With no new alarms during the warning either, the CEO almost never saw anything.
- **The two pacing changes**: a new hall keeps 70% of the alarm tightening already earned; a dark half-hall (or a hall shut by leaks, both halves) drains the meter 1 point a second whatever the band.
- **Scripted players** (`src/core/bot2.js`): the good player now gets ready for the CEO (route alarms first, pulling a tech off other work if needed); a CEO-blind player and a random player for comparison. `scripts/pacing3.mjs` prints the checks; `scripts/sweep3.mjs` searches settings.
- **On screen, plain until M18**: the HUD note says `CEO 0:15 · H4, H5 · −50` while warning and `CEO in H4, H5 · −50` while walking; the map shows the route dashed, the cone and a "CEO" disc; the overview strip shows the CEO as a diamond. The round-over card is headed "Fired by the CEO" when the CEO ended the run, and lists visits survived and sightings (also in Copy).
- Tuning drawer: CEO visits (on/off), Tightening kept between halls (%), Drain per dark half-hall.
- 17 new tests (342 in all).

**The owner's choice (13 November).** No setting within the agreed rules met the spec 4.5 targets: with the alarm cap still rising every 30 s after full campus (pass 2 spec 4.7), the meter ended runs at about 9:40 and getting ready for the CEO made no difference. The owner chose to **turn that rise off**, so the CEO decides the late game. It is now a drawer control ("Extra alarm after full campus every … s", 0 = off), default off.

Scripted checks with the final defaults (carry-over 70%, dark drain 1 a second, visits 45 to 60 s apart, no cap rise), 12 seeds, tutorial off:

| Player | Run length (range) | GWh | Hall 8 reached | Hall 8 at | Ended by zero tolerance / CEO hit / meter | Short-handed, halls 3 to 8 | Sightings |
|---|---|---|---|---|---|---|---|
| careful, ready for the CEO | 10:02 (6:34 to 14:13) | 1.76 | 10/12 | 7:28 | 1 / 3 / 8 | 17% | 1.4 |
| good, ready for the CEO | 11:41 (7:42 to 17:19) | 2.20 | 12/12 | 7:34 | 2 / 3 / 7 | 19% | 1.8 |
| good, CEO-blind | 10:09 (7:42 to 12:35) | 1.78 | 12/12 | 7:35 | 0 / 9 / 3 | 19% | 2.8 |
| slow, ready for the CEO | 10:05 (6:26 to 12:39) | 1.75 | 11/12 | 7:39 | 0 / 4 / 8 | 24% | 1.7 |
| very slow, ready for the CEO | 9:00 (5:52 to 13:06) | 1.41 | 9/12 | 7:46 | 0 / 4 / 8 | 44% | 1.3 |
| random | 9:12 (6:43 to 14:01) | 1.48 | 6/12 | 7:45 | 1 / 3 / 8 | 29% | 1.8 |

Blind vs ready: 93 s shorter, 19% less energy. Random: 33% less energy.

Against the spec 4.5 targets: run length, hall 8, the CEO-blind and random gaps, and the busy middle are met. Zero tolerance ends only 2 of 12 good runs: it starts at about 12 minutes, and most runs end on the meter around then, often after a CEO hit. Moving zero tolerance to the second walkthrough changed little (2 of 12), so it stays on the third as the owner chose.

Worth knowing:

- The "careful" scripted player does worse than the "good" one. It reacts faster, so it pulls techs off work for the CEO more often; scripted players are a smoke test, not balance.
- A run can now last well past 15 minutes for a strong player (longest scripted run 17:19), because nothing but the CEO and the meter ends it.

Owner's checklist:

- Watch an `#auto` run to the end: the CEO's visits appear in the HUD note, the route and cone on the map, and the results say how the run ended.
- Does the middle of the run feel busier?

### M16. Campus overview strip

Built:

- **The overview strip** (`src/ui/strip.js`, drawn by `src/render/strip.js`) along the bottom of the map: Plant A, the 8 halls and Plant B, true to width, squashed top to bottom.
- Each online hall shows its power and liquid shields (power left, liquid right, as on the map); each online plant the cooling shield and the spare-chiller count. Offline halls and Plant B before hall 6 are pale.
- Every alarm is an ink dot where it is (ringed when it is costing power); every tech a dot in its hat colour; a frame shows what the map shows now.
- **Tap or drag on the strip** to move the view there; the frame follows your finger. The strip's tap area reaches 16 px up into the map, so it is 44 px tall; in that band the strip wins over the map.
- The map region is 30 px shorter to make room. The zoom is unchanged (still pass 1's), so everything on the map is the same size as before.
- 7 new tests (325 in all).

Worth knowing:

- From hall 4 onwards the cooling shield is now always in view, on the strip's plant boxes.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch and mouse: a tap on hall 6 (in the band above the strip) centres the view on hall 6, a drag to hall 2 follows the finger, the selection is untouched, shields and dots show as on the map. No console errors.

Owner's checklist:

- Can you tell at a glance which halls are in trouble?
- Tap a hall on the strip: the view jumps there. Drag along it: the view follows.
- Does the map still feel big enough on the phone?

### M15. An alarm rail that triages

Built:

- **What each alarm costs now** (`src/ui/cost.js`): the MW that would come back if that alarm alone were fixed. A network failure about −6 MW; a first leak −4; both of a hall's CDUs leaking −34 on each ticket; a lone breaker nothing, both of a pair −19 on each; a chiller nothing while spares run, its share of the shortfall once cooling is short; a pump nothing. Checked in tests against what the rules engine itself gives back when the fault is gone.
- **Tickets show the cost** in bold on their first line, in place of the alarm's name (the fault picture still says what it is): `−34 MW` over `H8 top`. Free alarms show their name as before.
- **Triage order:** alarms that cost something first, biggest first; then the rest by clock, then oldest. An alarm that spreads jumps to the top.
- **The rail scrolls** (`src/ui/rail2.js`). Drag it up and down; it moves a ticket at a time and stops at the ends. `+N more` at the bottom pages down; `▲ N` at the top pages back up. Both are full 44 px tap targets. When an alarm newly starts costing more than anything in view, the rail jumps back to the top.
- **Off-map arrows** carry the lead alarm's clock as a ring (fix progress in blue while a tech is on site) and its cost (`−34`) on the side away from the arrow. A merged arrow is now led by its most urgent alarm, not the nearest, and tapping it goes there.
- 15 new tests (318 in all).

Worth knowing:

- While the rail overflows, tickets act when your finger lifts rather than when it lands, so a drag can scroll the rail without sending anyone. With everything in view they act at finger-down as before.
- The ticket shows the cost instead of the alarm name because the 96 px ticket cannot fit both the place and the cost on one line. Spec 0.4 records the change.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with 15 alarms on a full campus: costly tickets on top, `+N more` paging down, a drag scrolling back without moving the map, ringed arrows with costs. No console errors.

Owner's checklist:

- With several alarms open, can you tell from the rail alone which one is costing most?
- An alarm that has spread (both CDUs, both breakers) jumps to the top of the rail.
- Late in a run, drag the rail to see the rest, and tap `+N more`.
- Do the rings on the edge arrows tell you when to go and look?

### M14. Endless-run fix, and shields on screen

Built:

- **Fix: a run that could never end.** With Tuning > Start with halls 8 the "cannot lose before the first Delivery" floor held the meter up for ever, because no hall was left to deliver. The floor now applies only while a hall is still to be built (owner agreed 13 November; pass 3 spec 1.1). One line in `src/core/game2.js`, and a new test: an unplayed run started with 8 halls ends. Starting with 1 to 7 halls is unchanged.
- **Hall shields** (`src/ui/shields.js`, drawn by `src/render/shields.js`): every online hall shows a power shield (with a bolt) and a liquid shield (with a droplet) at the top, either side of its title. Whole is green, cracked amber with a crack line, broken red with a crack line, using the supplied shield drawing.
- **The ring:** a cracked shield has an ink ring running down with the clock of the alarm that will break it (the breaker on the cracked pair with least time left, or the leaking CDU). It stands still while a tech is fixing, like the clock.
- **Cooling shield and spare chillers** beside each online plant's title: `3 spare`, `0 spare`, or `2 short` when cooling is below what the halls need. Its ring follows the open chiller alarm with least time left. When spares are low only because the campus grew (1 spare at hall 5) the shield is cracked with no ring.
- 8 new tests (303 in all).

Worth knowing:

- The cooling shield is only on the plants, so from hall 4 onwards you have to look at Plant A to see it. The overview strip (M16) puts it in view all the time.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch: shields clear of the hall titles and inside the walls at both sizes, rings on cracked shields, a broken shield on a dark half-hall, spare counts at halls 2, 5 and 8, Plant B's shield at the far end. No console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape (reload once). Every hall has a bolt shield and a droplet shield at the top; Plant A shows the cooling shield and how many spare chillers are running.
- Let a breaker trip sit: the power shield cracks and its ring runs down; when the other side trips it breaks. Fix it and it goes back to whole.
- Watch the spares fall as halls come online, down to 1 at hall 5, and jump when Plant B arrives at hall 6.
- Tuning > Start with halls 8, then leave it: the run now ends.
- Can you say what a cracked shield means without being told?

### M13. Feel and phone check for pass 2

Pass 2 is complete.

Built (`src/ui/feel2.js`, drawn in `src/render/map2.js`):

- Floating MW losses with the pass 2 figures, worked out from the rules: -6 MW when a row's network fails, -4 MW for a first leak, -34 MW when the hall's second CDU goes, -19 MW when half a hall goes dark. A label that would start above the top of the map floats down from below its alarm instead, so it is always seen.
- A celebration when a hall comes online: the hall glows, its outline pulses outwards with a few sparks, and "Hall 4 online · +38 MW" rises over it. It plays as the view glides to the new hall after the Delivery card closes. Ink and white only.
- The HUD flash on entering red, new bubbles popping in and walking hats bobbing carry over from pass 1.
- 6 new tests (295 in all): each label against what the rules take away, label positions, the celebration's text and timing, the flash.

Smoothness, with all 8 halls online and 15 alarms on screen, at 844 x 390 and three pixels per point like the iPhone, in a headless Chrome on the build machine:

- 60 frames per second. The game's own work each frame (rules, drawing, effects): about 1 ms typically and 2.6 ms at worst, against 16.7 ms for a frame.
- With the CPU slowed four times the frame rate fell to about 22 per second while the game's own work stayed under 8 ms, so the slowdown is in the machine's software graphics. The phone is the real check.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape (reload once). Check it stays smooth with the whole campus busy (Tuning > Start with halls 8 is the quickest way there).
- Play five full runs and paste the results (Copy results on the round-over card).
- Pass 2 asks: is the run fun from 1 hall to 8; does the scrolling map stay readable and quick; do the crew picks add anything?

### Fix: halls are built on a timer (after M12)

The owner's run stalled on hall 1: hall 2 never came, and the run never ended. In spec 1.2 a full Stability meter brought the next hall, but on hall 1 a single leak took the load to exactly 80%, out of the green, so the meter could hover below full while the "cannot lose before the first Delivery" floor kept it above empty. The owner chose the fix:

- **Halls come on a timer** (spec 1.3, section 4.6): 90 s per hall, 1.5 times faster while the load is green. The Stability meter is now the survival buffer and keeps its value through a Delivery. Full campus is hall 8 coming online. The HUD shows how far the next hall is built ("Hall 1 of 8 · Hall 2 37% built"; "H1/8 · next 37%" on a narrow screen). Hall build time is a new drawer control.
- **A single leak costs half as much**: the hall drops to 90% (-4 MW on hall 1), which keeps hall 1 green. Both CDUs leaking still shuts the hall.
- **The tutorial can no longer stall either**: construction waits while the lessons run, so a lesson nobody answers for 45 s now hands over to the normal game. Its last callout now says hall 2 is being built.
- After Full campus the alarm cap rises every 30 s (was 45 s), so runs end in about 11 to 12 minutes.
- New tests: a run where nobody plays still gets hall 2 within 90 s and then ends; the timer's speed in green and red and its pause during the tutorial; a learner who ignores the tutorial still gets hall 2. 289 tests in all.

Pacing with the new rules (12 seeds per row):

| Player | Picks | Run length | Hall 2 at | Hall 6 at | Hall 8 at | Halls reached | GWh | Unfinished |
|---|---|---|---|---|---|---|---|---|
| careful (react 0.6 s, 1 cmd / 0.5 s) | hire | 11:41 (11:00 to 12:17) | 1:00 (12/12) | 5:03 (12/12) | 7:04 (12/12) | 8.0 | 2.26 | 0 |
| careful (react 0.6 s, 1 cmd / 0.5 s) | upgrade | 11:19 (10:38 to 11:54) | 1:00 (12/12) | 5:04 (12/12) | 7:05 (12/12) | 8.0 | 2.14 | 0 |
| good (react 1 s, 1 cmd / 0.8 s) | hire | 11:49 (11:30 to 12:17) | 1:00 (12/12) | 5:04 (12/12) | 7:04 (12/12) | 8.0 | 2.29 | 0 |
| good (react 1 s, 1 cmd / 0.8 s) | upgrade | 11:30 (10:58 to 12:12) | 1:00 (12/12) | 5:04 (12/12) | 7:06 (12/12) | 8.0 | 2.19 | 0 |
| slow (react 2 s, 1 cmd / 1.5 s) | hire | 11:51 (10:42 to 12:46) | 1:00 (12/12) | 5:05 (12/12) | 7:06 (12/12) | 8.0 | 2.29 | 0 |
| slow (react 2 s, 1 cmd / 1.5 s) | upgrade | 11:09 (10:16 to 12:04) | 1:00 (12/12) | 5:06 (12/12) | 7:07 (12/12) | 8.0 | 2.09 | 0 |

Worth knowing: every scripted player now reaches hall 8 at about the same time, because halls come on a timer and the scripted players stay mostly green. Skill shows in energy delivered and in surviving the full campus, which is where the design doc expected it (the CEO, in pass 3, is the intended skill test).


### M12. Tutorial

Built:

- The hall 1 tutorial (`src/ui/tutorial.js`), following design doc section 9, steps 1 to 5. It runs inside a normal first run, one lesson at a time, each with a one-line callout:
  1. Assign: a breaker trip. "Alarm! Tap the alarm, then tap a tech to send them." Once a tech is sent: one switchboard down costs nothing yet; its partner carries the load.
  2. Matching hat: a chiller trip. The red dot means the red hat fixes it a little faster; any hat can fix anything.
  3. A leak: it costs power straight away.
  4. Choosing: a leak and a breaker at once. Losing power now, or about to lose more?
  5. Redirect: both techs are sent to jobs, then a leak arrives: tap it, then a busy tech.
  Then the alarm director takes over: "Keep the load in the green to fill the Stability meter and bring Hall 2 online." The first Delivery ends the tutorial; there is no completion screen.
- While the lessons run, the rules hold back (`setScripted` in the rules engine): no director alarms, and the meter stops at 80 so no Delivery arrives mid-lesson. Real rules otherwise: an ignored lesson alarm still escalates.
- Each lesson glides the view to its alarm, and the callout sits at the top or bottom of the map, whichever keeps the lesson's alarms clear (`src/render/callout.js`).
- Prompts say "Tap" on a touch screen and "Click" with a mouse.
- Skip tutorial is a switch in the tuning drawer. After the first finished run it turns on by itself, once; if you turn it off again it stays off. There is never a tutorial with "Start with halls" above 1, or in `#auto`.
- 8 new tests (286 in all): lessons in order, no director alarms and the meter at 80 or below during the lessons, the redirect lesson, a learner who never redirects still gets through, Click prompts, callout length, Skip tutorial.

Worth knowing:

- A patient learner gets through the five lessons in about 55 seconds; hall 2 then comes about 1.5 to 2.5 minutes in, depending on how green they keep the load.
- The design doc's step 6 (both sides of an MSB pair down) is not scripted; it happens for real if a breaker lesson is ignored for 45 seconds.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch: every callout in order, the view gliding to each lesson, the callout clear of the lesson's alarms, the tutorial ending at hall 2, Skip tutorial on after the first run, no tutorial in the second run or in `#auto`. No console errors.

Owner's checklist:

- To see the tutorial again: Tuning > Skip tutorial off, then Play again. (Your first run after this update shows it anyway.)
- Hand the phone to someone new: can they get through hall 1 unaided?

### M11. Deliveries and crew picks

Built:

- The Delivery card (`src/ui/delivery.js`, `src/render/overlays.js`): when the meter fills, play stops on a card saying which hall is online, that Plant B came too at hall 6, and either which tech joined (halls 2 and 3) or three choices to pick from (from hall 4): two Hire cards with the tech's hat and how many of that trade you have, and an Upgrade with its picture (`src/render/upgrades.js`) and what it does. Each choice is a big button.
- Closing the card, by Continue or a pick, glides the view to the new hall over 1.5 s.
- `#auto` takes the first card without showing the card, and glides.
- Results (spec 7.5): halls reached is now a headline number ("6 of 8 halls", with "full campus" when reached); share of possible energy, the final crew and the upgrades taken join the list. The Copy text already had every Delivery time.
- The tuning drawer gains Meter fill per second, Chillers needed per hall, and Start with halls (to jump straight to a busy campus). Skip tutorial comes with the tutorial in M12.
- 10 new tests (278 in all).

Worth knowing:

- Found and fixed while checking: the Continue button showed under the three choices, and tapping it would have closed the card without a pick, leaving the game waiting for ever. Continue is now hidden whenever there is a pick, and does nothing if somehow tapped.
- At 660 x 300 the tuning drawer (now ten controls) scrolls; Reset and Done stay pinned at the bottom. On the iPhone it fits without scrolling.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch: halls 2 and 3 show who joined and pause play; hall 4 shows three choices and no Continue; an upgrade pick and a hire pick both apply; hall 6 says Plant B is online; the view glides to the new hall; the round-over card shows halls reached, crew and upgrades without scrolling; Start with halls 5 starts a run on hall 5. `#auto` carries on without the card. No console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape (reload once) and play until hall 4 or further.
- Do the picks feel like real choices?
- Try Tuning > Start with halls 5 to jump to a busy campus.

### M10. Playable on the new map

Built:

- The game now runs on the pass 2 rules and the new building (`src/main.js`), with pass 1's HUD, crew bar, alarm rail, overlays, tuning drawer and results.
- The scrolling map in the game (`src/render/map2.js`, `src/ui/targets2.js`): pass 1's zoom, drag in any direction, mouse wheel or arrow keys. A touch that moves more than 8 px scrolls; otherwise it is a tap, acted on when the finger lifts. The rails and HUD still act at finger-down.
- Off-map arrows in the game; tapping one glides to its alarm. Tapping a ticket or crew card whose alarm or tech is out of view also glides there.
- The crew bar grows a second column when a column of cards would be shorter than 48 px (7 techs on the iPhone, 6 on the smallest screen). The map narrows to match; the zoom stays the same. Short cards show the tech beside its name instead of above it, so neither shrinks.
- The HUD shows the load in MW against what is online (`106 / 113 MW`) and "Hall 3 of 8".
- The Network tech plays like the others (blue hat, faster on network failures).
- Deliveries take the first card (always a Hire) automatically until M11 brings the pick.
- Pass 2 keeps its own saved best score (`facops.best.v2`) and tuning (`facops.tuning.v2`), separate from pass 1's.
- The start card links to pass 1 and to the M8 map preview, now at `map.html`.
- 12 new tests (268 in all), including whole pass 2 runs played only through ticket and crew-card taps at all three screen sizes, and a run played by scrolling to and tapping bubbles and techs on the map.

Worth knowing:

- The tuning drawer has pass 1's controls except "First alarm interval": pass 2 starts each hall's phase from the spec's table instead. The new controls in spec section 9 come in M11.
- Floating MW losses are off for now: pass 1's figures do not apply to the new building. M13 brings pass 2's.
- The camera does not yet glide to a new hall at a Delivery in the game (it does in `#auto`); that arrives with the Delivery card in M11.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch: tapping a bubble then a crew card sends that tech, dragging scrolls without selecting, a ticket for an alarm two halls away glides the view to it, nine techs fill two columns, the round-over card and Copy work, `#auto` plays, and `map.html` still works. No console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape (reload once) and play a run with your thumbs.
- Is panning comfortable? Do you lose track of alarms off screen?

### M9. Rules engine for pass 2

Built:

- The pass 2 rules (`src/core/game2.js`, numbers in `src/core/config2.js`, public surface `src/core/index2.js`), built next to the pass 1 engine so the pass 1 game code keeps working until M10 moves the screen over:
  - 8 halls coming online one Delivery at a time, a 300 MW building, MSB pairs per half hall, the CDU pair per hall, 8 chillers per plant with "needed = halls x 1.25", pump loops that split when Plant B arrives with hall 6.
  - Deliveries: a full meter brings the next hall, resets the meter, and gives 5 quiet seconds. Critical Environment and Network join automatically with halls 2 and 3; from hall 4 the game waits for a pick of two Hire cards and one Upgrade (Carts, Better tools, Radios).
  - The director by phase: start intervals by halls online, waves from hall 3, only Breaker, Chiller and Leak on hall 1, mercy rules for MSB pairs, CDU pairs and spare chillers, a rising cap after Full campus.
  - The run cannot be lost before the first Delivery.
  - Results and the Copy text now include halls reached, Full campus, the time of each Delivery, the crew and the picks.
- A pass 2 scripted player (`src/core/bot2.js`) that understands redundancy: it puts real losses and backups that are about to run out ahead of first failures.
- `#auto` on the main page: the scripted player runs a whole pass 2 run on the new map, with live faults, techs walking the aisles and the off-map arrows. A ×1 / ×2 / ×4 speed button and New run. The view glides to each hall as it comes online.
- 40 new tests (256 in all), covering every loss figure, each escalation, cooling with spares, pump loops before and after Plant B, Deliveries, picks and upgrades, the director's rules, determinism, and the pacing targets.

Pacing (12 seeds per row, scripted players; "hire" always takes a Hire card, "upgrade" takes the Upgrade when offered):

| Player | Picks | Run length | Hall 2 at | Hall 6 at | Hall 8 at | Halls reached | GWh | Unfinished |
|---|---|---|---|---|---|---|---|---|
| careful (react 0.6 s, 1 cmd / 0.5 s) | hire | 9:43 (6:48 to 12:20) | 1:46 (12/12) | 5:10 (7/12) | 6:49 (7/12) | 5.9 | 1.46 | 0 |
| careful (react 0.6 s, 1 cmd / 0.5 s) | upgrade | 10:47 (6:48 to 15:32) | 1:46 (12/12) | 5:11 (7/12) | 7:07 (7/12) | 5.9 | 1.73 | 0 |
| good (react 1 s, 1 cmd / 0.8 s) | hire | 10:28 (6:08 to 13:54) | 1:54 (12/12) | 5:50 (8/12) | 7:36 (8/12) | 6.3 | 1.62 | 0 |
| good (react 1 s, 1 cmd / 0.8 s) | upgrade | 11:42 (6:08 to 18:38) | 1:54 (12/12) | 5:56 (8/12) | 8:24 (8/12) | 6.3 | 1.92 | 0 |
| slow (react 2 s, 1 cmd / 1.5 s) | hire | 10:26 (5:58 to 15:41) | 2:06 (12/12) | 6:14 (7/12) | 8:01 (7/12) | 5.9 | 1.56 | 0 |
| slow (react 2 s, 1 cmd / 1.5 s) | upgrade | 10:58 (5:58 to 16:32) | 2:06 (12/12) | 6:26 (7/12) | 8:35 (7/12) | 5.9 | 1.68 | 0 |

Worth knowing:

- Two numbers changed from the draft after these checks: the meter fills at 1.25 a second (not 1.5) and the director tightens 5% every 10 s (not 3%). With the draft values every scripted player reached hall 8 by about 5:20 and the slow player did as well as the careful one. The spec is updated (version 1.2).
- Targets met: first Delivery about 1:45 to 2:05, hall 8 about 6:50 to 8:35 when reached, runs about 10 to 12 minutes, and every run ends.
- As the design doc predicted for pass 1, run length barely separates skill; halls reached and energy do a little. Upgrades came out slightly ahead of hires on energy, so the picks matter.
- Because a run cannot be lost before the first Delivery, a player who never plays stays on hall 1 for ever. That is what the spec asks for; say if you would rather have a limit.
- The game itself (tapping, rails, HUD) is still pass 1's code and moves onto the new map in M10.

Owner's checklist:

- Open https://tnauq.github.io/facops/#auto in landscape (reload once). Tap ×4 to speed it up.
- Watch halls come online and the view glide to each one; Plant B comes online with hall 6.
- Scroll around while it plays and follow an arrow to an alarm.

### Map flipped to read left to right (after M8)

At the owner's request the building is mirrored: Plant A and hall 1 are now on the left, and the campus grows rightward to hall 8 and Plant B. Spec version 1.1 has the new positions. Nothing else changed; all 216 tests pass.

### M8. Pass 1 snapshot and the new map

Built:

- Pass 1 is frozen in `pass1/` (copied from tag `m7`) and plays at https://tnauq.github.io/facops/pass1/.
- The pass 2 map (`src/core/layout2.js`), from the owner's drawing: 8 halls in 4 pairs, Plant A on the right and its mirror Plant B on the left, 6 rack rows, 2 MSB pairs and a CDU pair per hall, 8 chillers and 2 pumps per plant, corridors, aisles and doors. The rules engine still runs on the pass 1 map until M9; this file is only drawn and tested so far.
- The camera (`src/ui/camera.js`): exactly pass 1's zoom on the same screen, panning in both directions, stopping at the building's edges, and a short glide.
- Off-map arrows (`src/ui/offmap.js`): every alarm out of view gets an arrow on the map's edge pointing at it, with its fault picture; arrows that would overlap merge with a count. Tapping one glides to its alarm.
- Tap versus drag (`src/ui/drag.js`): a touch that moves more than 8 px scrolls the map; otherwise it is a tap.
- The building renderer (`src/render/campus2.js`) with the supplied icons at pass 1's size. Halls not yet online, and Plant B before hall 6, are drawn pale and "under construction". Only what is on screen is drawn.
- The main page is now a map preview (`src/preview.js`): drag, mouse wheel or arrow keys to scroll; − and + set the halls online (also `#halls=N` in the address); sample alarms to try the arrows; a Pass 1 button.
- 36 new tests (216 in all): map counts, mirror symmetry both ways, every service point reachable, routes only cross walls at doors, the zoom equal to pass 1's at three sizes, panning and edges, arrow placement and merging, tap versus drag.

Worth knowing:

- A rack row is drawn as 2 cabinets, not 3: at pass 1's size a cabinet is 70 units tall and three would not fit in half a hall. The spec is updated.
- Pass 1 and the preview share saved settings for now; pass 2 moves to its own storage keys in M10.
- At pass 1's zoom the view shows about a quarter of the building's width and two thirds of its height on the iPhone.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch: dragging scrolls and stops at the edges, + and − change the halls and the address, tapping an arrow brings its alarm on screen, and the mouse wheel, arrow keys and mouse drag scroll on desktop. `/pass1/` starts and plays. No console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape (reload once). Drag the map end to end and top to bottom: is everything as readable as pass 1, and can you tell the halls apart?
- Tap + up to 8 halls and watch Plant B come online at 6. Tap an arrow at the edge and check it takes you to the alarm.
- Tap Pass 1 (or open https://tnauq.github.io/facops/pass1/) and check pass 1 still plays.

### M7. Feel

Pass 1 is complete.

Built (`src/ui/feel.js`, drawn in `src/render/map.js` and `src/render/hud.js`):

- Floating loss labels at the equipment, rising 20 px and fading over 1 s: "-25 MW" when a rack's network fails, "-50 MW" when a CDU leaks, "-75 MW" when a leaking row shuts down, "-250 MW" when a hall goes dark (shown in the middle of the hall). The figures are worked out from the rules config and the map, and a test checks them against what the rules actually take away.
- A 300 ms red flash of the top bar when the load turns red.
- New alarm bubbles pop in over 150 ms, with a small overshoot.
- Walking techs bob 1 px. Only the drawing moves; tap targets do not.
- Everything runs on game time, so it all freezes while paused.
- 10 new tests (180 in all).

Worth knowing:

- Leaks caused by a pump burst and network failures that spread each show their own label too, since each is a fresh loss.
- Frame rate: with ten alarms on screen, a headless Chrome on the build machine held 60 frames per second, and drawing a whole frame took about 1 ms. Slowed down four times it dropped to about 22 fps, but that also slows its software rendering, so it is a very pessimistic stand-in. The phone itself is the real check; see below.
- No console errors at 844 x 390 or 660 x 300.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape (reload once to get the new version).
- Check it stays smooth on the phone with ten alarms up.
- Play ten rounds and paste the results (Copy results on the round-over card).
- Pass 1 passes if, after about ten rounds, you still want another and can name moments where a choice mattered (spec section 13).

### Automatic milestone tags

A GitHub Action (`.github/workflows/tag-milestones.yml`) now tags milestones. Every commit on `main` whose title starts with `M<number>:` gets the tag `m<number>` if that tag does not exist yet; existing tags are never moved. No more tagging by hand. You can also run it from Actions > Tag milestones > Run workflow. `CLAUDE.md` tells the coding agent to rely on it.

### M6. Results, pause and phone polish

Built:

- The full results on the round-over card (`src/ui/results.js`): time survived, energy delivered and the share of possible energy in large type; then time in green, yellow and red; alarms raised and cleared; average and longest time to clear; escalations; redirects; the share of fixes by the matching hat; and the best score. It fits the 660 x 300 screen without scrolling.
- Copy results (`src/ui/copy.js`): writes exactly `resultsText(state)` to the clipboard from inside the tap, as Safari requires, then reads "Copied". If the clipboard refuses, the text appears in a box underneath, selected, and the button reads "Select and copy" if the phone would not copy it either.
- Leaving the page (switching apps, locking the phone) pauses the round and shows the pause card.
- The rotate screen: "Turn your phone sideways" covers everything whenever the page is taller than wide. The round stands still underneath and carries on when you turn back.
- Home Screen: a web app manifest (`manifest.webmanifest`) so "Add to Home Screen" opens the game full screen, without Safari's bars.
- 6 new tests (170 in all).

Worth knowing:

- Escalations on the card list only those that happened ("2 row shutdowns, 1 dark hall"), or "none", so the line fits a phone. The copied text still lists all five.
- There is no Home Screen icon picture; iPhone uses a snapshot of the page. The spec has no image files in pass 1; say if you want an icon drawn.
- The scripted player (`#auto`) does not pause when the page is hidden; only real rounds do.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: results card fits, Copy matched `resultsText` exactly, the fallback box appeared with the text selected when the clipboard was refused, hiding the page paused, portrait showed the rotate screen and froze the clock, and landscape resumed it. Taps on the rails and the gear land correctly with the notch on either side. No console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape and play a round to the end.
- Tap Copy results and paste the result into a chat.
- Turn the phone upright mid-round: the game stops and asks you to turn it back; turning back carries on.
- In Safari: Share > Add to Home Screen. Open FacOps from the Home Screen and play one round there.

### M5. One-tap switch and tuning drawer

Built:

- The tuning drawer (`src/ui/tuning.js`, drawn in `src/render/overlays.js`): the eight controls from spec 9 as native sliders and checkboxes, each with its value beside it, in two columns so it fits the phone without scrolling. Every row is 44 px tall and the whole row is the tap target. Reset to defaults and Done.
- It opens from a Tuning button on the start, pause and round-over cards, and from the gear button in the HUD during play. Done goes back to the card it came from; from play it goes to the pause card, so you can Resume or Restart with the new settings.
- Changes are saved at once under `facops.tuning.v1` and apply when the next round starts. Defaults always come from the rules engine's `DEFAULT_CONFIG`. If storage is blocked, the drawer still works for the visit.
- One-tap mode (spec 7.3): with "One-tap dispatch" on, tapping an alarm (bubble or ticket) sends the nearest free tech. If nobody is free the alarm is queued, shown by a hollow dot on its bubble and ticket, and the next tech to finish takes it. Tapping a tech and then an alarm still sends that tech. The HUD says "One-tap" while a round is in that mode.
- 15 new tests (164 in all): every control changes its own config key and nothing else, Reset gives back the default rules, saved tuning survives a reload, junk or blocked storage falls back to defaults, the one-tap taps, a queued alarm taken by the next free tech, and opening and closing the drawer.

Worth knowing:

- Tap mode belongs to the round, like every other setting: switch one-tap on, then start a new round (Restart or Play again) to play that way.
- The pause button still opens the pause card; the gear opens the drawer.
- Your tuning shows in the results text as a list of what changed from the defaults, ready for the Copy button in M6.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch taps: opening the drawer from each card and from the gear, a slider and the one-tap switch saving at once, the next round using them, four tickets tapped in one-tap mode with three techs (the fourth queued, then taken), Reset, and tuning surviving a reload. No console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape.
- Play a round in two-tap mode. Then open Tuning, switch on "One-tap dispatch", tap Done and play a round that way.
- Note which mode you prefer.

### M4. Crew bar and alarm rail

Built:

- The crew bar on the left (`src/ui/crewbar.js`, `src/render/rails.js`): one card per tech, in crew order, with the tech, a short trade name (Elec, Mech, CE), "Idle", "Walking" or "Fixing", and a thin progress bar while fixing. The whole card is a tap target.
- The alarm rail on the right (`src/ui/rail.js`): one ticket per alarm, most urgent on top, in the same order as the rules engine's `sortedAlarms`. Each ticket has the fault picture and name, where it is (Yard, H1 A, H2 R1...), the fastest hat's dot top-right, the hat of the tech sent to it (or a hollow dot when queued) at the left, and a bar along the bottom: the clock in dark blue while nobody is on it, fix progress in lighter blue while a tech works, solid when the clock is spent. When they do not all fit, a "+N" chip at the bottom says how many more there are.
- The map now sits between the two rails, as the spec's layout has it.
- Tapping works everywhere: a ticket or a bubble picks an alarm, a card or a tech on the map picks a tech, in either order. The selected card and ticket get a dark outline.
- Keys 1 to 3 act as taps on the crew cards.
- 17 new tests (149 in all), including whole rounds played from the two rails alone at all three screen sizes. Those rounds lasted 4:13 to 5:12.

Worth knowing:

- The pause and settings buttons' tap areas reach 10 px below the top bar (from M3). That would cover the top of the first ticket, so wherever a ticket is drawn the ticket wins and the button stops just above it. With no tickets the buttons keep their full 44 px.
- The "+N" chip only counts; it is not a tap target. The spec does not ask it to do anything.
- The map is smaller now that the rails take the sides. At 660 x 300 bubbles crowd each other when many alarms are up, which is part of why the rails exist.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch taps: ticket then card, card then ticket, key 1 then ticket, and a crowded rail (4 tickets and "+9" at the small size, 6 at the large one). No console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape and play a round using only the two rails, without touching the map.
- Playing from the rails is comfortable with two thumbs.

### M3. HUD and round over

Built:

- Screen regions (`src/ui/regions.js`): `regions(W, H)` from spec 6.1, tested at 844 x 390, 750 x 340 and 660 x 300, plus the layout of the HUD strip.
- The HUD strip (`src/ui/hud.js`, `src/render/hud.js`): clock, a band mark (green circle, yellow triangle, red square) with the load in GW, the Stability meter in the band color, and settings and pause buttons. The temporary text readout is gone from the screen.
- Start, pause and round-over cards, as plain HTML over the map (`src/render/overlays.js`), driven by a small tested reducer (`src/ui/flow.js`). The game is paused while a card is open. Play again and Restart start a fresh round without reloading.
- Space toggles pause on a keyboard.
- Best score (`src/ui/best.js`), saved under `facops.best.v1` and shown on the start card and the round-over card ("New best!" when you beat it). If storage is blocked, the game plays normally and just forgets the best on reload.
- 30 new tests (132 in all).

Worth knowing:

- The map still uses the full width under the HUD. The spec's map region leaves room at the sides for the crew bar and alarm rail, so the map moves into it in M4 when those arrive.
- The settings button opens the pause card for now; tuning lives behind it from M5. The Tuning buttons on the cards also come in M5.
- The pause and settings buttons are drawn 44 x 34 to fit the strip, as the spec says, but their tap areas reach 10 px further down so they are a full 44 x 44.
- The round-over card shows time and energy only; the full results panel and the Copy button are M6.
- With `#auto` the scripted player still starts straight away, with "Auto" shown in the HUD.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch taps: Start, the pause button (including a tap just below it), settings, Resume, Restart, Space, round over, Play again, and the best score surviving a reload. Also checked with storage blocked. HUD numbers matched the rules engine; no console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape. The start card shows; tap Start.
- Watch the HUD as alarms pile up: you can always tell why the meter is draining.
- Tap pause, then Resume. Let a round end, tap Play again.
- Reload: the start card shows your best score.

### M2. Two-tap dispatch on the map

Built:

- Tapping, with Pointer Events, so a finger and a mouse behave the same.
- Hit testing (`src/ui/hittest.js`): a bubble or a tech counts as hit within 22 px of its center; when two are in reach, the nearest wins; bubbles come before techs. The checks for HUD buttons, crew cards and tickets are in place for M3 and M4.
- The selection rules from spec 7.2 (`src/ui/selection.js`): tap an alarm then a tech, or a tech then an alarm, to send the tech. Tapping a busy tech sends it anyway (a redirect). Tapping the same thing again, or empty space, clears the selection, and a fixed alarm drops out of it.
- Selection rings on the selected alarm and tech.
- Techs who share a spot are drawn side by side (`src/ui/crew.js`), so each can be tapped. Only the drawing moves; the rules are unchanged.
- 25 new tests (102 in all), including a whole round played only by tapping the map. Those rounds lasted 3:38 to 4:44.

Worth knowing:

- All three techs start on the same spot, and the spec does not say how to tap one of a stack. They are now drawn about 28 px apart wherever they stand together. Say if you would rather have something else.
- The temporary readout is still at the top, and you still reload to play again. M3 brings the HUD and the round-over screen.
- Number keys and Space (spec 7.4) come with the crew bar and pause, in M4 and M3.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch taps: alarm then tech, tech then alarm, redirect, and empty space all behaved as the table says; no console errors.

Owner's checklist:

- Open https://tnauq.github.io/facops/ in landscape and play a round by tapping only the map.
- Taps land where you aim.
- Sending and redirecting feel instant.

### M1. Live map

Built:

- The game loop (`src/ui/loop.js`): drawing every animation frame, rules in fixed 0.05 s steps, at most 5 steps a frame. It pauses while the page is hidden or the phone is upright, and stops when the round ends.
- The live map (`src/render/map.js`): campus, crew and alarm bubbles every frame. Bubbles pulse when under a quarter of their clock is left and nobody is on site, and show the hat of a tech who is on the way (`src/ui/bubbles.js`).
- A temporary text readout at the top: time, load, band, Stability and the number of alarms (`src/ui/readout.js`). The real HUD replaces it in M3.
- `#auto` in the address: the scripted player plays the round, reacting after 1 s and sending at most one tech every 0.8 s (`src/ui/autoplay.js`).
- 18 new tests (77 in all).

Worth knowing:

- There is no tapping yet; that is M2. To play again, reload the page.
- The `#demo` view from the seed is gone; the live map replaces it.
- In a headless Chrome at 844 x 390 and 660 x 300: the first alarm came at 5 s; `#auto` rounds lasted 3:22 and 4:04; an unplayed round ended at 1:27; no console errors.
- The GitHub account is `tnauq`. The docs had it as `tnuaq`; corrected everywhere.

Owner's checklist:

- Open https://tnauq.github.io/facops/#auto in landscape and watch a round. The techs walk along the lanes, bubbles fill as they fix, and the round ends in about four minutes.
- Open https://tnauq.github.io/facops/ without `#auto` and leave it. Alarms pile up and the round ends in a minute or two.
- The map fits the phone in landscape with nothing cut off.
- Each machine is recognizable.
- Alarm bubbles are easy to see.

### M0. Repo seed

Built: the rules engine (`src/core/`) with every pass 1 rule; tests for the rules; drawing code for the crew, equipment, shields, fault glyphs and alarm bubbles; a campus renderer; a page that shows the map.

Owner's checklist:

- Open the link in landscape. The plant yard is on the left and two halls are on the right.
- Can you tell a chiller from a pump from a CDU from a rack from a switchboard at a glance?
- Add `#demo` to the address. Hall 2 is dark, one chiller is stopped, both CDUs in Hall 1 are leaking, one rack has a network failure, and alarm bubbles sit on the faults. Is each fault readable?
- Are the three techs clear, and can you tell their hats apart?
