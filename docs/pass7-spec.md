# FacOps pass 7 build spec

Version 0.3, 19 November 2026. The owner answered section 1 on 17 November (outage penalties, not the CEO, as the main run ender; everything else as recommended), then refined it on 18 November: **runs should end roughly a third each by outages, the CEO and a sale.** The owner **approved this version on 18 November**. It is the source of truth for pass 7, as `docs/pass6-spec.md` is for pass 6. Pass 6's rules and screen carry over except where this spec says otherwise. If the spec is silent or looks wrong, stop and ask the owner.

Values marked *starting value* are for scripted checks to settle; everything else is the owner's decision.

## 0. What pass 7 is

The first half of what is left of pass 5 (GDD v0.9 section 14, rows 2 to 5), plus a new shape for the end of a run:

1. **Three ways out** (owner, 17 and 18 November): service credits for outages, a quicker CEO, and a sale you can actually make. Runs come back to 14 to 20 minutes and end about a third each way.
2. **The uptime bonus** (Decided): the first rule that pays for keeping things up.
3. **The advisor mark** (Decided) and **bundles**: fewer "what now?" moments and fewer taps.
4. **Save and resume**: a run of 20 minutes survives a phone call.
5. **The ledger and the run-over card**: the money explained, and an ending worth a screenshot.

The rest of pass 5 (posts and warnings, promises and surges, busy and quiet spells, the pick of two and the rescue call, layers and standing orders) is pass 8, sketched in section 8.

**Owner agreement on rule changes.** M41 adds service credits, shortens the gap before strike visits, and changes when the campus can be sold and for how much. M42 adds a rule behind a drawer switch. M44 adds a way to read and restore the random-number generator's position, with no change to the numbers it gives. Nothing else in `src/core/` changes, and no test is loosened; tests that pin the old sale rule are updated to the new one.

## 1. The owner's answers

| # | Question | Answer |
|---|---|---|
| 1 | What ends a run, and how long is it? | **About a third each: outages, the CEO, a sale** (18 Nov). Not mainly the CEO (17 Nov). 14 to 20 minutes |
| 2 | Bundles in pass 7? | Yes, with the pumps added (4.2) |
| 3 | Save and resume in pass 7? | Yes, building mode only |
| 4 | The ledger and the run-over card in pass 7? | Yes. The run-over card keeps today's results style; the blueprint look waits |
| 5 | Does a hall without water (50%) lose its rows' uptime bonus? | Yes. "Up" means never dark and never below 90% |

## 2. Milestones

One per session, in order. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Touches | Size |
|---|---|---|---|
| M41 | Three ways out: service credits, a quicker CEO, a sale you can make (3) | Rules (owner agreed), screen, checks | Medium to large |
| M42 | The uptime bonus (4.1) | Rules (behind a switch), screen, checks | Small to medium |
| M43 | The advisor mark and bundles (4.2) | Screen | Medium |
| M44 | Save and resume (5) | One rules helper, screen | Medium |
| M45 | The ledger and the run-over card (6) | Screen | Small to medium |

## 3. M41. Three ways out

### 3.1 What the checks found

Prototypes of the rules below were run for this spec on the M40 build (12 seeds each, not committed).

- **Today the CEO ends almost every run**, at a median of 22:57. With the CEO unable to fire anyone, **nothing ends a run**: 10 of 12 were still going at 30:00. The loan makes late money comfortable on purpose.
- **Nobody can sell late in a run.** From 10:00 on, the sale was refused 100% of the time in every run checked: a CEO visit or its warning about two thirds of the time, an open outage the rest. So today the sale is an ending in name only.
- Service credits alone (version 0.2) made going broke end nearly every run: the CEO fired 1 in 84.

So all three endings need a push, and they have to be tuned together.

### 3.2 Service credits (outages)

*Starting values* in config, `building.credits`:

- **Customers go live when the loan is paid off** (5:00 of economy time). Before that nothing is charged, so the early game is unchanged.
- **Every rack row that is online and not delivering** costs service credits in proportion to what it is short: a dark row the full rate, a row at 90% a tenth of it, a hall without water half of it. It is the shortfall the load readout already shows, in rows.
- **The rate starts at $1 a second for each row short** (`rate: 1`) and **doubles every 3:30** (`doubling: 210`): $1 at 5:00, about $2.70 at 10:00, $7.20 at 15:00, $19 at 20:00.
- **Nothing is charged while every row delivers**, however late. This is what separates it from pass 4's doubling burn, which the playtester found "random".
- Credits are part of the burn: they count in `burnRate`, the runway, the red countdown and going broke.
- **Events:** `customersLive`; `credits` once a second while any are charged.

### 3.3 The CEO

- **Strike visits come 12 to 18 s apart** (`ceo.strikeGap: [12, 18]`, from 20 to 30 s). Three strikes, as now.
- Everything else about the visits is unchanged.

### 3.4 The sale

- **Selling is allowed at any time after the Handover except while the CEO is on site** (the walk itself, not the warning). Open outages no longer block it. (`building.sale.anytime: true`)
- **The buyer pays for the equipment and for what it earns:** the price of everything built, **plus 2:30 of the campus's current income** (`incomeSeconds: 150`), then half as much again if Commissioned, as now. An outage lowers the income, so it lowers the price by itself: selling in the middle of a crisis is allowed, and costs you.
- The pause menu's button shows the live price, and the confirm card shows the score it would give, as now.

### 3.5 Screen

- **The HUD's cash rate** includes credits. While they are charged, a red line beneath: `credits −$48/s`.
- **Alarm tickets** show what an outage costs in dollars a second, income lost plus credits, in place of MW (v0.9 open decision 8, recommended there).
- **Introductions**, once per run in every building run:
  - At 5:00: "Customers are live. Every rack that's down now costs service credits, and they get stricter."
  - At the Handover: "You can sell the campus from the menu. Buyers pay for what it earns, so sell while it's running well."
  - The first time credits pass the campus's income: "Credits are outrunning your income. Fix outages, or sell while you can."
- **Results:** "Service credits" with the total. A run that went broke after 5:00 is headed "Went broke: service credits".

### 3.6 What the prototype showed

The rules above. Two scripted sellers were added for this check: a **bold** one (compute first, sells at the second strike or when credits pass 60% of income) and a **cautious** one (gets ready for the CEO, sells at the second strike or when credits pass 30% of income).

| Player | Median run | Score | Sold / fired / broke |
|---|---|---|---|
| Compute first, never sells | 18:25 | $90,759 | 0 / 6 / 6 |
| Gets ready for the CEO, never sells | 20:11 | $122,111 | 0 / 5 / 7 |
| Bold seller | 15:04 | $92,801 | 8 / 0 / 4 |
| Cautious seller | 12:32 | $89,681 | 10 / 0 / 2 |
| **All four together (48 runs)** | | | **18 / 11 / 19: 38%, 23%, 40%** |

- **The split is close to a third each**, with the CEO a little short of the 25% floor in 3.7; a strike gap of 10 to 15 s is the first thing M41 should try. Among players who never sell, the CEO and the credits end about half each. How often people sell is up to them; the checks show the sale is now possible and worth about the same as riding it out, which is what makes it a real choice.
- **Getting ready for the CEO pays** most of all: $122,111 against $90,759.
- Without the income in the sale price, selling scored $67,000 to $73,000, well below riding it out, so nobody would choose it. With 1:30 of income, $83,000 to $87,000.
- **The risk:** credits double on a clock, so good runs that do not sell end within a few minutes of each other. The lever is a slower doubling.

### 3.7 Checks

`node --test`, with tests for: nothing charged before customers go live or while every row delivers; a dark row, a 90% row and a hall without water each charged their share; the doubling; credits in `burnRate`; the sale allowed during an outage and a warning, refused while the CEO is on site; the sale price with income. `scripts/pacing4.mjs` gains the two sellers, a "sold" cause and a credits column. Targets (*starting*):

| Check | Target |
|---|---|
| Compute-first median run | 14 to 20 minutes |
| Endings across the four players above | Each of sold, fired and broke between 25% and 40% |
| Bold seller's score | Within 10% of compute first's |
| Getting ready for the CEO | Earns more than not |
| Never a backup | At least 25% less than backups from hall 4 |
| Backups early | Still broke in at least half the runs |
| 150 MW | Still 6 to 9 minutes |

Levers, in order: the credits' doubling (outages), the strike gap (the CEO), the sale's income seconds (selling). Report what was changed.

### 3.8 Owner's checklist

- At 5:00 the line says customers are live, and from then a dark rack shows its credits.
- After the Handover, the menu's sale price rises and falls with your income, and works in the middle of an outage.
- Over a few runs, do you end by each of the three ways? When you go broke or get fired, can you name what did it?

## 4. Building and earning

### 4.1 M42. The uptime bonus (GDD v0.9 section 6)

**Rules** (behind the drawer switch "Uptime bonus", on by default once the checks pass; *starting values* in `building.uptime`):

- At each full minute of the economy (`economyTime`: the run's start, or the tutorial's hand-over), every rack row that **stayed up for the whole minute** pays **$40** (`bonus: 40`).
- **Stayed up:** built and earning at the start of the minute, and never dark and never below 90% (`floor: 0.9`) at any step in it. A hall throttled to 90% by one leaking coolant unit still counts. A hall without water (50%) does not (question 5). A row built during the minute waits for the next.
- Paid to the cash at once; counts in money earned and in the score.
- **Event:** `uptimeBonus` with the minute, the rows paid and the total.
- **Not in classic mode.**

**Screen:**

- "+$40" floats from each paid row (only those on screen), and the HUD's cash readout shows "+$1,240 uptime" for 2 s.
- The rack row's inspect card adds "Uptime bonus: on track" or "Uptime bonus: missed this minute".
- **Introduction**, once per run in every building run: "Every rack row that stays up a full minute earns a $40 bonus. Backups protect it."
- **Results:** an "Uptime bonuses" line with the total.

**Scripted checks** (`scripts/pacing4.mjs`, 12 seeds, with M41's lever):

| Check | Target |
|---|---|
| Compute-first builder's median run | Still 14 to 20 minutes |
| Endings across the four players of 3.6 | Still each between 25% and 40% |
| Never a backup, against backups from hall 4 | At least 25% less (it must not shrink from M41's) |
| Backups early | Still broke in at least half the runs |
| Bonus as a share of income, compute first | Reported; about a sixth when all is well |

The bonus adds cash, so runs may lengthen and the endings shift. If they pass 20 minutes or the split leaves 25% to 40%, lower the bonus first, then use 3.7's levers. Report what was changed.

**Owner's checklist:**

- The first minute's bonus is noticed, and its line says why it matters.
- A hall with a B switchboard keeps its bonus through a trip; one without loses it.

### 4.2 M43. The advisor mark and bundles

**The advisor mark** (GDD v0.9 section 5, Decided). Screen only, reading `nextWanted(state, 'builder')` from `src/core/builder.js`.

- A ring round the empty spot the compute-first builder would buy next, in white with an ink outline, pulsing slowly. Not a hat colour. It only points; it never buys.
- **When:** for the first 3:00 of economy time (*starting value*) in a player's first building run (no building-mode best yet, and no run finished). After that it is a switch in Settings, **Advisor mark**, off unless turned on.
- If the spot is off screen, an edge arrow points to it, in the same style as the alarm arrows but without a clock.
- Hidden while a card is open, during a CEO warning, and when `nextWanted` returns a hire or nothing.

**Bundles** (GDD v0.9 section 5, Proposed; question 2).

- **Tap a hall's name** and a card opens beside it, holding the game as the Hire card does. It offers what that hall needs next, each as one purchase:

| Bundle | Pieces | When offered |
|---|---|---|
| Bring the hall online | RMU, transformer A, switchboard A (top), coolant unit (top), and a water pump if the hall would have none | The hall is not online |
| Power the other half | RMU, transformer A, switchboard A (bottom) | The bottom half has no switchboard |
| Fill the racks | Every empty rack row that would earn | A half has power and empty rows |
| Back up a half's power | Transformer B, switchboard B | A half has A and no B |
| Back up the coolant | The second coolant unit, and a glycol pump if the pumps could not feed it | The hall has one coolant unit |

- **A shortcut and nothing more:** the same prices, each piece built in 8 s through the existing build command, no discount. Buying piece by piece stays as it is.
- **The card lists the pieces and the total.** It adds a chiller or a dry cooler when cooling would run short, and a glycol pump when a chiller or coolant unit would outrun the pumps, each with its reason in one line.
- **All or nothing:** with too little cash the button says how much more is needed, as the build card does.
- A pure helper `bundlesFor(state, hallId)` in `src/ui/`, with tests: each bundle, its pieces and price, and the extras.
- **Introduction**, once: "Tap a hall's name to buy what it needs in one go."

**Owner's checklist:**

- On a first run the ring always points at something sensible, and stops after three minutes.
- Opening a new hall takes one tap on its name and one on Buy.
- Does the mark make the game feel like it plays itself? (If so, shorten it.)

## 5. M44. Save and resume (GDD v0.9 section 13; question 3)

**Rules** (the one change in `src/core/`):

- `createRng` gains `getState()` and `setState(n)`. The numbers it gives do not change; a test checks that a restored generator continues the same sequence.
- A pure `saveGame(state)` and `loadGame(data)` in `src/core/`, with tests: a run saved and loaded at any step plays on identically to one that was never saved (same seed, same moves, same results after another 5:00).

**Screen:**

- **Building mode only.** The run is saved to the device every 10 s and whenever the page is hidden. One run at a time. Tutorial runs are saved too, with their lesson.
- **The main menu** gains **Resume run · 12:40 · $3,210** as its first button, solid white; New run moves to second. New run asks first: "Start over? Your saved run will be lost."
- A resumed run starts **held**, whatever Real-time mode says, so the player can look before anything moves.
- **A finished run clears the save.** A save from another build (its version stamp differs) is dropped, and the menu says so once: "Your saved run was from an older version."
- `src/ui/flow.js` gains `resume`, with tests.

**Owner's checklist:**

- Mid-run, switch apps and close Safari's tab. Reopen: Resume run is there, with the right clock and cash, and the run carries on held.
- Finish a run: Resume run is gone.

## 6. M45. The ledger and the run-over card (GDD v0.9 sections 6 and 12; question 4)

### 6.1 The ledger

- **Tap the cash** in the HUD and a card opens, holding the game as the Hire card does.
- **Now, per second:** income by hall (only halls online), the uptime bonus paid last minute, then the burn: loan repayment (with what is left of the loan and when it ends), site overhead, upkeep (with the number of devices), wages (with the crew) and service credits (with the rate per row and when it next doubles).
- **The run so far:** earned (racks, uptime bonuses), spent on building, spent on hiring and upgrades, loan repaid, overhead, upkeep, wages, service credits, fines.
- A pure helper `ledger(state)` in `src/ui/`, with tests that the lines add up to the cash.
- On a narrow screen, two columns become one, scrolling inside the card.

### 6.2 The run-over card

Today's results card, reordered and given a voice. Same style as now.

- **Headline:** how the run ended ("Sold", "Commissioned and sold", "Went broke: service credits", "Fired by the CEO: three strikes", "Went broke"), then the score, then the highest milestone.
- **The CEO's parting line:** one line chosen from the run's own numbers (*starting set*, first that applies):
  - Sold after Commissioned: "Pleasure doing business. Don't call me."
  - Fired with no B switchboards built: "Not one backup. Bold. Also, fired."
  - Fired with backups that never tripped: "You spent $1,350 on backups that never tripped."
  - Broke before 5:00: "The loan wanted its money. So did I."
  - Broke on service credits: "Our customers have sent a thank-you card. It's an invoice."
  - Halls without water during the run: "Half the building ran at half. I did the maths."
  - Otherwise: "I'll get an AI to run this."
- **Below:** the stats as now, with the ledger's run-so-far totals.
- Copy keeps every line, headed "FacOps results" (not "pass 3").

### 6.3 Owner's checklist

- Tap the cash mid-run: the card explains where the money goes in one look.
- The run-over line makes you smile at least once in three runs.

## 7. Checks for every milestone

`node --test` passes; classic mode's tests pass unchanged; `scripts/pacing4.mjs` is rerun after M41 and M42 and recorded. Headless Chrome at 844 x 390 and 660 x 300 for every new card, with no console errors.

## 8. Pass 8, in outline (not for approval yet)

In the GDD's order, each Decided, each behind a drawer switch with scripted checks:

| Milestone (provisional) | Build | Owner question to settle first |
|---|---|---|
| M46 | Posts and the priority area | None |
| M47 | Warnings before failures | None |
| M48 | The CEO's promises and surges | The amounts, after the uptime bonus has settled the economy |
| M49 | Busy and quiet spells, with a balance pass | None |
| M50 | The pick of two, and the rescue call | **The funding round under the loan.** v0.9's "base burn a quarter higher" no longer fits: the base is now a $1 overhead. Recommended: a second loan, $2,000 repaid at $8 a second |
| M51 | Layers and standing orders (Proposed) | In or out |

The blueprint look for the results, Hire, Commissioned and sale cards can join pass 8 once the owner has lived with the menu.
