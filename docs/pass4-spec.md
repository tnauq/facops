# FacOps pass 4 build spec: build and manage

Version 0.1 (draft for the owner's approval), 14 November 2026. Written after the owner played M21: the pressure still turns "very crazy around 6 minutes", the rail's switch from tickets to tiles causes misclicks, and the owner wants to move from a pure dispatch game towards a Prison Architect-style management game **on the existing layout, with tap-to-build in predetermined spots**.

When approved, this becomes the source of truth for pass 4, as `docs/pass3-spec.md` was for pass 3. Pass 3's rules and screen carry over except where this spec says otherwise. Numbers marked *starting value* are for M24's scripted checks to settle. Items marked **[Recommended]** are choices made for the owner, kept unless the owner changes them.

## 0. The owner's answers (14 November)

| Question | Answer |
|---|---|
| Who sends techs to alarms? | Techs pick their own jobs; the player can override |
| What can be built? | Every current device. A data hall comes online once it has at least 1 switchboard (MSB), 1 coolant unit (CDU) and there is at least 1 chiller |
| What pays for building? | Money from the MW delivered |
| Pause and speed controls? | An option |

## 1. What changes, in one paragraph

The building's layout stays exactly as it is. Every device spot in it (rack rows, switchboards, coolant units, chillers, pumps) starts **empty**, drawn as a pale outline. Tap an empty spot to buy and build that device. Racks earn money while they deliver; the money buys more racks, the equipment that powers and cools them, the backups that protect them, and more techs. Techs walk to alarms by themselves; the player steps in to redirect. The skill moves from "who goes where, right now" to "what to build next, and how much backup to buy before growing".

The design pillars change one word: **Redundancy is the drama, and now it is your choice.** A hall with one switchboard per half earns as much as one with two, until the first breaker trip darkens it.

## 2. Rules

### 2.1 Spots and building

- Every piece of equipment in `src/core/layout2.js` is a **spot** with a fixed device type. Nothing new is added to the layout.
- A spot is `empty`, `building` or `built`. Only built devices work, can alarm, or count for anything.
- **Tap to build:** an empty spot shows its device and price; a second tap confirms (section 3.2). The money is taken at once.
- **Build time:** 8 s (*starting value*), shown as a ring on the spot. A contractor builds it; no tech is needed.
- No selling or demolishing in pass 4.
- Halls can be built in any order. Plant B's spots are open from the start.

### 2.2 Prices (*starting values*)

Money is shown as `$`, in whole dollars (`$1,240`).

| Device | Price | Notes |
|---|---|---|
| Rack row | $150 | 3 racks, 6.25 MW; the only thing that earns |
| Switchboard (MSB) | $200 | Each half-hall has an A and a B spot |
| Coolant unit (CDU) | $250 | Each hall has a top and a bottom spot |
| Chiller | $300 | 8 spots per plant |
| Pump | $200 | 2 spots per plant (see open question 1) |
| Hire a tech | $400 | Pick the trade (section 2.6) |
| Upgrade (Carts, Better tools, Radios) | $500 | As in pass 2, same limits |

Starting cash: **$1,200**, enough for a minimal working hall (one each of pump, chiller, switchboard, coolant unit, and one rack row). Everything on the campus costs about $23,000.

### 2.3 What works

A rack row delivers its 6.25 MW (times the cooling factor, as now) only when **all** of these hold:

- **Power:** its half-hall has at least one built switchboard that is not tripped.
- **Coolant:** its hall has at least one built coolant unit that is not shut by a leak.
- **Cooling:** the campus has enough chillers running (below).

A **hall is online** when it has at least 1 built switchboard and 1 built coolant unit, and at least 1 chiller is built anywhere (owner's rule). Online halls show their title; offline halls stay pale. A row built in a hall that is not online yet earns nothing until it is.

**Chillers needed** = rows built × 1.25 / 6, rounded up (the same ratio as pass 2's 1.25 per full hall). Too few running and the cooling factor falls as now. A plant's chillers only run while that plant has at least 1 built pump (see open question 1).

### 2.4 Redundancy is the player's choice

The alarms keep their pass 3 behaviour; what changes is that the backup may not exist.

| Alarm | With the backup built | Without it |
|---|---|---|
| Breaker Trip | Partner carries the half; after its clock, the partner trips too (as now) | That half-hall goes dark at once |
| CDU Leak | Hall throttles to 90%; after its clock, the other CDU leaks (as now) | Hall throttles to 90%; after its clock, the hall shuts |
| Chiller Trip | Spares cover it | The cooling factor starts to fall at once |

The shields on the strip keep their meaning: a hall with no B switchboards shows a **broken-outline** power shield ("no backup") instead of whole, so the risk is visible before anything fails.

### 2.5 Money in and out

- **Income:** $5 a second per row at full output, scaled by its actual output (*starting value*). Shown in the HUD as `$1,240 · +$85/s`.
- Nothing else costs money over time in pass 4 (no wages, no power bill).
- **Score** becomes money earned over the run (shown alongside GWh, which stays in the results).

### 2.6 Techs pick their own jobs  [owner's answer]

- **Auto-dispatch:** whenever a tech is free and an alarm has no tech, the free tech takes the alarm with the highest cost now (pass 3's `alarmCost`), then the shortest clock, choosing the alarm it can reach soonest among equals. This is the scripted player's "good" choice moved into the rules.
- Auto-dispatch never pulls a busy tech off a job. **The player can:** tap an alarm, then any tech, exactly as now. A job the player gave is kept until it is done.
- During a CEO warning, auto-dispatch prefers alarms on the CEO's route (the scripted player's CEO rule).
- A drawer switch turns auto-dispatch off, for comparison.
- **Crew:** the run starts with Electrical and Mechanical. More techs are bought from a **Hire** card in the crew bar (trade chosen on the card). Deliveries and the pick-of-3 cards are gone; upgrades are bought from the same card.

### 2.7 Alarms and pacing

- The director only picks built, working devices.
- **The interval follows what is built, not time.** The start-of-phase table is read by **rows built ÷ 6, rounded up** (so a full hall's worth of racks counts as one more hall) and tightens 1% every 10 s (*starting value*, down from 3%) with no reset. More equipment means more alarms; the player controls the pace by how fast they grow.
- The alarm cap stays crew size + 2.
- Pass 3's dark-half-hall drain stays.

### 2.8 Stability and the end of a run

- The load band is delivered MW against the MW of the rows in online halls, as now; the Stability meter fills and drains as now.
- A run ends when the meter empties, or the CEO fires you under zero tolerance.
- **CEO visits [Recommended]:** the ribbon-cutting comes when the 3rd hall comes online; the Handover when the campus reaches 200 MW of rows in online halls, or at 10:00, whichever is first; walkthroughs then follow as now, and zero tolerance from the third. (See open question 2.)
- The first-Delivery safety floor becomes: the meter cannot empty in the first 2 minutes.

## 3. Screen

### 3.1 Empty spots

- An empty spot draws its device in pale outline (the supplied drawing at low alpha, with a dashed edge) and a small `+`. A spot being built shows the device fading in with a progress ring.
- Spots are tap targets at least 44 x 44 px, like bubbles. Alarms and techs win over spots when they overlap.

### 3.2 Build card

- Tapping an empty spot opens a small card next to it: the device's picture and name, its price, one line on what it does (`Powers the top half of Hall 3`, `Backup: keeps Hall 3's top half lit if A trips`), and **Build** (greyed with `Need $80 more` when short).
- Tap Build, or tap the same spot again, to confirm. Tap elsewhere to cancel.
- The card names the device, so the map still needs no captions.

### 3.3 HUD and crew bar

- The HUD shows cash and income in place of "Hall 3 of 8".
- The crew bar ends with a **Hire** card (`+ Hire $400`), which opens the hire and upgrade choices as an overlay, like the Delivery card did.
- Crew cards keep Idle / Walking / Fixing; an auto-dispatched tech is shown the same as a player-sent one.

### 3.4 Speed controls  [owner: an option]

- A drawer switch, **Pause and speed buttons** (on by default [Recommended]). When on, the HUD gets `❚❚ · 1x · 2x` (one 44 px button that cycles, plus the existing pause).
- While paused this way (not the pause card), the player can still build, select, assign and redirect; nothing moves.
- 2x doubles game time; building and money run at the same rate.

### 3.5 The rail

- **Fix for the misclicks:** the rail only switches from tickets to tiles when it would overflow, and only switches back when the alarms fit with 3 slots to spare (hysteresis), so it no longer flips back and forth under a finger.
- With auto-dispatch, the rail is mostly for watching and overriding.

### 3.6 Tutorial

Rewritten for building, one step at a time, on Hall 1 and Plant A:

1. Build a pump, then a chiller (`Chillers cool everything. They need a pump.`)
2. Build a switchboard and a coolant unit in Hall 1 (`A hall needs power and coolant.`); the hall comes online.
3. Build a rack row; money starts coming in.
4. A breaker trips with no backup: half the hall goes dark. Build the B switchboard (`Backups cost money but keep the lights on.`)
5. A leak: watch a tech go by themselves; then redirect one (`Techs go on their own. Tap an alarm, then a tech, to change who goes.`)
6. Hire a tech. Then the director takes over.

The pass 3 device introductions (network, pump) stay.

## 4. Milestones

One per session. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Size |
|---|---|---|
| M22 | Rail hysteresis (the misclick fix); pause and speed buttons as an option (3.4, 3.5) | Small |
| M23 | Auto-dispatch with player override, and its drawer switch (2.6, rules only; the crew still arrives as in pass 3) | Medium |
| M24 | Rules for building: spots, prices, money, the online rule, what works, redundancy without backups, director by rows built, CEO triggers; scripted builder player and checks (2.1 to 2.5, 2.7, 2.8) | Large |
| M25 | Building on screen: empty spots, the build card, cash in the HUD, build rings, the no-backup shield (3.1 to 3.3) | Large |
| M26 | Hire card and upgrades for money; Deliveries removed | Medium |
| M27 | The new tutorial, and a balance pass from the owner's runs (3.6) | Medium |

M22 and M23 help the current game right away and are worth having whatever comes after. M24 to M27 are the pivot proper: about four to six sessions.

### 4.1 Scripted checks (M24)

A scripted **builder** player: builds in a fixed sensible order (one hall's minimum, then racks, then backups once a hall has 4 rows, then the next hall), hires when idle time is low. A **greedy** builder that never buys backups, and a **no-hire** builder, for comparison. Targets (*starting*):

| Check | Target |
|---|---|
| Builder: first income | Within 60 s |
| Builder: 150 MW of rows | Around 6 to 9 minutes |
| Builder: run length | 10 to 15 minutes, most ended by the CEO |
| Greedy builder (no backups) | Earns more early, ends sooner; scores at least 15% less |
| Very slow player (4 s reactions, auto-dispatch on) | More alarms waiting than free techs under 25% of the time before minute 8 |

## 5. Open questions for the owner

1. **Pumps.** Your rule names switchboard, coolant unit and chiller. Should pumps be (a) buildable and required for a plant's chillers to run [as drafted], (b) built for free with each plant's first chiller, or (c) left out of building, always there?
2. **CEO.** Drafted: ribbon-cutting at the 3rd hall online, Handover at 200 MW or at 10:00, then walkthroughs as now. Keep, or change?
3. **Where to start.** Hall 1 and Plant A empty, $1,200 to spend (drafted); or Hall 1 already built with a few racks, so the first minute is playing rather than shopping?
4. **Speed buttons default:** on (drafted) or off?

## 6. Out of pass 4

Selling and demolishing, wages and bills, tech stations (staging), puddles, sound, saving a run, any change to the layout.
