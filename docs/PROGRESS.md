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
| M18. CEO on screen | `m18` | Done |
| M19. Graphical pass | `m19` | Done |
| M20. Gentler escalation; a rail without pages | `m20` | Done |
| M21. A cleaner map; each device introduced | `m21` | Done |

## Pass 4

The owner approved `docs/pass4-spec.md` (version 0.2, build and manage) on 14 November 2026.

| Milestone | Tag | Status |
|---|---|---|
| M22. Rail fix; hold and speed buttons | `m22` | Done |
| M23. Techs pick their own jobs | `m23` | Done |
| M24. Rules for building | `m24` | Done |
| M25. Building on screen | `m25` | Done |
| M26. Hiring and upgrades for money | `m26` | Done |
| M27. New tutorial and balance | `m27` | Done (balance waits for the owner's runs) |
| M28. The yard on the map; black pipes | `m28` | Done |
| M29. Building the yard | `m29` | Done |
| M30. Yard failures | `m30` | Done |
| M31. Electricians only | `m31` | Done |

## Pass 5

The owner approved `docs/pass5-spec.md` (version 0.2, manage) on 16 November 2026, after the first outside playtest. It replaces pass 4's doubling burn with a construction loan, and zero tolerance with the CEO's strikes.

| Milestone | Tag | Status |
|---|---|---|
| M32. The construction loan | `m32` | Done |
| M33. The CEO's strikes | `m33` | Done |
| M34. Commissioned and selling the campus | `m34` | Done |
| M35. Crew guidance | `m35` | Done |
| M36. Inspect card, plus marks, runway | `m36` | Done |

## Pass 6

The owner approved `docs/pass6-spec.md` (version 0.1) on 16 November 2026: a blueprint main menu, and a plant with a glycol loop and a water loop.

| Milestone | Tag | Status |
|---|---|---|
| M37. Main menu, Settings, pause menu | | Next |
| M38. The longer plant | | |
| M39. Pump rules | | |
| M40. Teaching and the balance check | | |

## Log

### M36. Inspect card, plus marks, runway

Pass 5 spec 7. Screen only; no rule changes.

Built:

- **Inspect card** (`src/ui/inspect.js`, drawn in the build card's frame): tap a built device and a card opens beside it; tap elsewhere to close. Alarms and techs still win where they overlap a device.
  - **A rack row** shows what it earns now ("$4.00/s") and, when it is not earning in full, the one reason, in the order the rules check: "Hall 2 is not online: it needs a switchboard and a coolant unit", "No power: the RMU outside has a fault", "No power: transformer A shorted, no backup", "No power: switchboard A tripped, no backup", "Coolant units down: the hall is shut", "Network failure", "Coolant unit leaking: hall at 90%", "Cooling short: a chiller is down (83%)" or "Cooling short: build a chiller (83%)", "Powering up".
  - **Infrastructure** shows its state top right ("Working", "Tripped", "Fault: the half is dark"...), what it feeds and what feeds it ("Feeds Hall 1's top half · fed by transformer B outside"; an RMU is "fed by the north power line"), whether it is the only one or one of two, and its upkeep. A chiller says how many are running against how many are needed; a dry cooler how many chillers its plant has room for.
- **Plus marks:** the "+" on an empty spot is solid ink when the cash covers its price, and hollow when it does not. Hold the game and the map shows what the cash will buy.
- **Runway:** while the cash is falling, the HUD adds how long it lasts at this rate, in red: "$1,240 · −$32/s · 0:38". Hidden when the rate is rising, when it is more than 5:00 away, and in the red (the red countdown takes over).
- 13 new tests (490 in all), one for each rack-row reason.

Worth knowing:

- The order of the rack reasons follows the rules: the half's power first, then a shut hall, then the row's own network, then a leak, then cooling. A row with a network failure in a leaking hall says "Network failure", since that is what stops it.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: solid and hollow marks with $300, the runway counting down, a B switchboard's card ("One of two switchboards: the other is the backup · Upkeep $0.15/s") and a dark rack's ("No power: the RMU outside has a fault"); no console errors.

This finishes the first part of pass 5 (M32 to M36). The rest of pass 5 waits for the next version of the spec, after you have played these.

Owner's checklist:

- Tap a dark rack: the card says why in a few words.
- Tap a B switchboard: it says it is the backup and what it costs.
- Hold the game with $300: the plus marks show what you can afford.
- When money falls, the runway says how long you have.

### M35. Crew guidance

Pass 5 spec 6. Screen only; no rule changes.

Built:

- **The roles lesson**, the tutorial's seventh, between "grow" and the hand-over: "Any tech fixes anything indoors; a matching hat is faster. Yard high voltage: electricians (yellow) only." While it shows, a pulsing ink frame marks the crew bar. It moves on after 9 s, or as soon as you open the Hire card.
- **The Hire card:**
  - A line under each trade saying what it is faster at, built from the alarm table in config: "Faster on breaker trips. The only trade for shorts and RMU faults." / "Faster on chillers, pumps and dry coolers." / "Faster on coolant leaks." / "Faster on network failures."
  - "Crew 3 · 4 recommended" at the top: 2, plus 1 for each hall online after the first (`building.crewBase` and `building.crewPerHall` in config, marked as advice only). It sits on an amber (the yellow band colour) tag when the crew is short of it.
  - A "Suggested" tag on one trade: Electrical with three or more halls online and only one electrician; otherwise the trade with fewest on the crew, in the scripted builder's order.
- **When a hall comes online** and the crew is short: "Hall 3 online · crew of 4 recommended".
- `src/ui/crewAdvice.js` holds the advice (`tradeLine`, `recommendedCrew`, `suggestedTrade`, `hallOnlineText`), with tests.
- 6 new tests (477 in all). The tutorial's lesson-order test now includes the roles lesson.

Worth knowing:

- **The roles line is shorter than the spec's.** The spec's wording is 116 characters, and the tutorial's callouts are held to 110 so they fit the phone, so the second half reads "Yard high voltage: electricians (yellow) only." It means the same. Say if you want the spec's wording and I will let this one callout run longer.
- The three-hall threshold for suggesting an electrician is the yard's own (`yardFromHalls`), so the two stay in step.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: the roles lesson with the crew bar framed, and the Hire card with three halls and a crew of two (amber "Crew 2 · 4 recommended", Electrical suggested). At 660 x 300 the card is a few pixels taller than the screen, so the Close button sits at the bottom edge (the card scrolls); at 844 x 390 it fits. No console errors.

Owner's checklist:

- With the tutorial on, the roles lesson appears before the hand-over and reads in one go.
- Open the Hire card at 1, 3 and 5 halls online. The recommendation rises, and goes amber when you are short.
- Does the recommendation match what feels right to keep a hall running?

### M34. Commissioned and selling the campus

Pass 5 spec 5: the ways to win.

Built:

- **Rules** (`src/core/game2.js`, `building.sale` in `src/core/config2.js`):
  - **Commissioned:** the first moment all 48 rack rows deliver full output at once (300 MW). Recorded once and kept, with a `commissioned` event.
  - **Selling** (`sell`, `cannotSell`): from the Handover on, never during a CEO visit or its warning, and never with an outage open. The run ends by choice (`sold`).
  - **Sale price** (`salePrice`): the price of everything built, half as much again once Commissioned. A full campus is $28,000, or $42,000 Commissioned.
  - **Score** (`score`): money earned, plus the sale price if sold. Going broke or being fired gives no sale.
  - **Milestone** (`milestone`): the highest reached, ribbon-cutting, Handover or Commissioned.
- **Commissioned on screen:** every hall lights up in turn with "Commissioned". About 3.5 s later a card opens and waits: the CEO's "Fine. It's finished. Don't touch anything.", the sale price, **Keep running** or **Hand over the keys · $42,000**. If the sale isn't allowed that moment (the CEO is visiting, or an outage is open), the button is greyed and the card says to sell from the menu later. Under `#auto` no card opens.
- **The menu** (the gear, or pause) has **Hand over the keys · $14,250** under the usual buttons. Before the Handover, during a visit or with an outage open, it is greyed with the reason underneath. Tapping it opens a confirm card with the sale price and the score it would give; **Back** returns to the menu.
- **Results** lead with how the run ended (**Sold**, **Commissioned and sold**, **Fired by the CEO: three strikes**, **Went broke**), then the score, the highest milestone reached, and how long the run lasted. A sold run has a Sale line. The Copy text gains a Score line.
- **Best score:** the new score, under its own key (`facops.best.v5`). Until you finish a pass 5 run, the start card shows your old best labelled, for example "$90,000 in 14:20 (older rules: money earned)". The old best is never changed.
- **Drawer:** none added; `building.sale.fromHandover: false` (selling at any time) is there for the scripted checks.
- `scripts/pacing4.mjs` now reports how many runs are Commissioned and when.
- 12 new tests (471 in all). The results-card test for going broke now checks that the score leads.

Scripted checks (12 seeds): the rules of play are unchanged, so the table is M33's (median run 17:52). The scripted players never sell. Commissioned is rare: 2 of 12 for the compute-first builder and for the one that gets ready for the CEO, at about 10 minutes; never for the builder without backups. All 48 rows must be at full output with nothing down, which is hard with alarms always open.

Worth knowing:

- Selling is worth less than it might sound: a full campus sells for $28,000 ($42,000 Commissioned), against about $110,000 earned in a typical 18-minute run. So selling early ends your earning, and selling late risks being fired with nothing. Say if you want the price higher.
- At 660 x 300 the results card is taller than the screen when sold; it scrolls, as the tuning card does. At 844 x 390 it fits.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: the menu greyed before the Handover with its reason, offered after it, the confirm card, the Sold results, the halls lighting up and the Commissioned card (greyed during the Handover's warning); no console errors.

Owner's checklist:

- After the Handover, the menu offers the sale, and refuses it during a visit or an outage, saying why.
- Selling ends the run with a score that includes the price.
- If you reach all 300 MW, the game makes a fuss and asks whether to sell.

### M33 follow-up. The alarm cap rises late (owner, 16 Nov)

After M33's checks the owner agreed to raise the director's alarm cap late in a run: as before until 14:00, then +2, and +2 more at 17:00 (on the run's clock, the one in the HUD).

- **Rule** (`alarmCap` and `lateCapExtra` in `src/core/game2.js`; `building.capSteps: [[840, 2], [1020, 2]]` in `src/core/config2.js`). Building mode only.
- **Drawer:** "Alarm cap +2 at 14:00 and +2 at 17:00", on by default.
- Strike visits keep their 20 to 30 s gap: without it the median was 21:19.
- 1 new test (459 in all).

Scripted checks (12 seeds):

| Player | Run length: median (range) | Earned | Fired / broke before 5:00 / broke later / still running at 30:00 | Strikes |
|---|---|---|---|---|
| Compute first, backups from hall 4, hires | 17:52 (4:54 to 27:13) | $109,891 | 10 / 1 / 1 / 0 | 2.5 |
| The same, getting ready for the CEO | 20:07 (9:15 to 30:00) | $144,782 | 10 / 0 / 1 / 1 | 2.6 |
| Backups from hall 6 | 17:09 (4:54 to 28:38) | $110,638 | 10 / 1 / 1 / 0 | 2.5 |
| Backups early | 0:38 (0:38 to 25:25) | $43,101 | 4 / 7 / 1 / 0 | 1.0 |
| Never a backup | 18:18 (4:54 to 26:19) | $93,536 | 9 / 1 / 2 / 0 | 2.3 |
| Never hires | 8:37 (4:54 to 28:47) | $55,722 | 4 / 1 / 7 / 0 | 1.0 |
| Decides every 4 s | 20:38 (17:50 to 30:00) | $136,153 | 11 / 0 / 0 / 1 | 2.9 |

All of spec 4.4's targets are now met except short-handed before 8:00 (25%, target under 25%), which is the early game and unchanged since M32. The median run is 17:52 (target 14 to 20). Getting ready for the CEO lasts longer and earns 32% more, and backups from hall 4 or 6 earn about 18% more than none.

### M33. The CEO's strikes

Pass 5 spec 4 (owner, 16 Nov: a run should end because the late game outruns you, not because of one sighting).

Built:

- **Rule** (`src/core/ceo.js`, `ceo.strikes: 3` and `ceo.strikeFine: 3500` in `src/core/config2.js`): from walkthrough 3 every visit is a strike visit. Each outage the CEO sees unattended is fined $3,500, and a visit with any sighting gives one strike, however many it sees. The third strike ends the run at once ("Fired by the CEO"). A clean visit takes nothing away. Events `ceoStrike` (with the count) and `ceoFired`.
- **Strike visits come closer together**: 20 to 30 s apart (new `ceo.strikeGap`), where walkthroughs 1 and 2 keep 45 to 60 s. See the checks below for why.
- **The classic game** (Building mode off in the drawer) keeps pass 3's zero tolerance, since its pacing is built on it. In building mode, `strikes: 1` with a $0 fine is the old zero tolerance.
- **Banner:** "CEO · Halls 3, 4 · 0:09 · strike 2 of 3", with "Any outage seen is strike 2 of 3 · −$3,500 each" underneath. The visit that would give the last strike is solid ink, as zero tolerance was. Walkthrough 2 says "Next visit: strikes". Banner fines are now shown in dollars in building mode (they said Stability points before).
- **HUD:** from the first strike, three small hardhats under the clock (the clock moves up a little), filled for each strike given. The CEO's hardhat is white, but white disappears on the white HUD, so a strike given is filled in the HUD's ink and one to come is an ink outline. Never a trade colour.
- **The CEO's lines:** "That's one. I count to three.", "Two. My assistant is writing this down.", "Three. You're done. I'll get an AI to run this." Leaving walkthrough 2: "From now on I'm counting. Three strikes." A sighting now floats its fine in dollars ("−$3,500") in building mode, where it said Stability before.
- **One line introduces the strikes**, once, as walkthrough 2 leaves: "From now on, every CEO visit that sees an outage is a strike. Three and you're out."
- **Results:** headline "Fired by the CEO: three strikes", and a Strikes line with the minute of each ("3 of 3 · 13:42, 14:47, 15:49"); also in the Copy text.
- **Drawer:** strikes before fired (1 = zero tolerance) and the fine per sighting.
- `scripts/pacing4.mjs` now reports the median run length, fired / broke before 5:00 / broke later / still running, and strikes; an optional third argument runs only the players whose names contain it.
- 10 new tests (458 in all). The old zero-tolerance tests now say they use one strike. The "compute first wins" test gives each run 30 minutes instead of 25, since good runs now last longer.

Scripted checks (`scripts/pacing4.mjs`, 12 seeds, with the loan):

| Player | Run length: median (range) | Earned | Halls | Crew | Fired / broke before 5:00 / broke later / still running at 30:00 | Strikes |
|---|---|---|---|---|---|---|
| Compute first, backups from hall 4, hires | 21:14 (4:54 to 28:41) | $145,992 | 7.5 | 8.2 | 10 / 1 / 1 / 0 | 2.5 |
| The same, getting ready for the CEO | 23:42 (9:15 to 30:00) | $167,616 | 7.9 | 8.7 | 9 / 0 / 1 / 2 | 2.6 |
| Backups from hall 6 | 20:48 (4:54 to 27:51) | $134,833 | 7.3 | 8.2 | 10 / 1 / 1 / 0 | 2.5 |
| Backups early | 0:38 (0:38 to 25:34) | $40,260 | 3.6 | 4.6 | 4 / 7 / 1 / 0 | 1.0 |
| Never a backup | 23:03 (4:54 to 30:00) | $129,811 | 7.3 | 7.9 | 7 / 1 / 2 / 2 | 2.1 |
| Never hires | 8:37 (4:54 to 30:00) | $67,063 | 6.5 | 2.0 | 3 / 1 / 7 / 1 | 0.9 |
| Decides every 4 s | 23:29 (18:34 to 30:00) | $165,460 | 7.9 | 9.0 | 9 / 0 / 0 / 3 | 2.7 |

Against the spec's targets (4.4):

- **Run length, median 14 to 20 minutes: missed, 21:14.** With strikes and nothing else changed it was 22:46, with 2 runs of 12 still going at 30 minutes.
- **How runs end: met.** 10 of 12 by three strikes; going broke is rare for the compute-first builder.
- **Getting ready for the CEO lasts longer and earns more: met** (23:42 and $168k against 21:14 and $146k).
- **Backups from hall 4 or 6 earn more than none: met** ($146k and $135k against $130k).
- **Short-handed before 8:00 under 25%: just missed, 25%.** That is the early game, which M33 does not touch; it was the same before.

What was tried for the run length, compute-first builder only:

| Change | Median run |
|---|---|
| None | 22:46 |
| Director tightening 2% / 2.5% / 3% every 10 s (was 1.5%) | 23:07 / 29:16 / 27:33 |
| Every gap 30–40 / 25–35 / 20–30 s | 20:37 / 18:05 / 21:24 |
| Strike visits only 20–30 / 15–25 s (**kept 20–30**) | 21:14 / 20:16 |
| Experiment, not kept: alarm cap +4 instead of +2 (with 20–30) | 20:06, all 12 fired, none past 26:30 |

Worth knowing:

- **Tightening the director does nothing late**, because the director stops at a cap of 2 alarms plus one per hall: late in a run it is always at the cap, so it cannot get harder. That cap is what lets a crew of 8 keep up indefinitely. Raising it (the last row) is the change that makes the late game outrun the crew; I did not make it, because the spec names only tightening and the gap. Say if you want it, or a cap that rises after the Handover.
- Shortening only the strike visits' gap keeps the Handover and walkthroughs 1 and 2 as they were. The 12-seed numbers are noisy: medians move a minute or two between similar settings.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: the banner fits on one line at 660, the hardhats fill one by one, the third strike ends the run on the results card; no console errors.

Owner's checklist:

- Play past the Handover. The banner says when strikes begin, and the hardhats fill one by one.
- When you are fired, can you name the visit you should have prepared for?
- Does the end of a run feel like your doing, not the clock's?

### M32. The construction loan

Pass 5 spec 3 (owner, 15 and 16 Nov: the doubling burn was unsatisfactory; the burn should press early, not late).

Built:

- **Rule** (`burnRate`, `loanLeft`, `loanTimeLeft` in `src/core/game2.js`; `building.burn` in `src/core/config2.js`): the burn is now a construction loan of $1,800 repaid at $6 a second from the start of the economy (paid off at 5:00), plus a flat $1 a second site overhead, plus upkeep and wages as before. Nothing doubles. Nothing is repaid while the tutorial runs. A `loanPaid` event fires once.
- `doubling` above 0 brings back pass 4's curve; its old test now runs with pass 4's numbers.
- **HUD:** the note reads "Loan $1,240 · 3 halls online" while the loan is owed, shortening to "Loan $1,240" and then to nothing on a narrow screen; a thin grey bar under the cash and its rate empties as it is repaid, so the loan reads at any width.
- **"Loan paid off. The money is yours now."** for 4 s in the introductions' place, never over a CEO warning. Runs without the tutorial now get this line too (and still no device introductions).
- **The tutorial's hand-over** says "Your construction loan starts now: $6 a second for 5 minutes. Build racks fast, and hire from the crew bar.", built from the config.
- **Results:** "Loan: paid off at 4:58" or "not paid off", on the card and in the Copy text.
- **Drawer:** the loan, its rate, the site overhead, and the doubling (0 = never; 150 was pass 4).
- 10 new tests (448 in all).

Scripted checks (`scripts/pacing4.mjs`, 12 seeds; zero tolerance still ends runs until M33):

| Player | Run length (range) | Earned | 150 MW at | Halls | Crew | Zero tolerance / fine / broke |
|---|---|---|---|---|---|---|
| Compute first, backups from hall 4, hires | 17:06 (4:54 to 23:37) | $111,371 | 7:01 (11/12) | 7.5 | 8.2 | 10 / 0 / 2 |
| The same, getting ready for the CEO | 18:53 (9:15 to 28:46) | $128,462 | 6:58 | 7.9 | 8.7 | 11 / 0 / 1 |
| Backups from hall 6 | 13:38 (4:54 to 20:07) | $77,529 | 6:14 (11/12) | 7.3 | 8.1 | 10 / 0 / 2 |
| Backups early | 6:49 (0:38 to 17:53) | $27,012 | 10:11 (5/12) | 3.6 | 4.6 | 4 / 0 / 8 |
| Never a backup | 15:59 (4:54 to 24:10) | $90,217 | 6:14 (11/12) | 7.3 | 7.8 | 9 / 0 / 3 |
| Never hires | 10:57 (4:54 to 19:02) | $51,096 | 6:48 (10/12) | 6.5 | 2.0 | 4 / 0 / 8 |
| Decides every 4 s | 20:12 (15:32 to 30:00) | $123,619 | 8:00 | 7.9 | 8.8 | 11 / 0 / 0 |

Against the spec's targets: the compute-first builder goes broke in 2 of 12 (target: no more than 2); buying backups early goes broke in 8 of 12 (target: at least half); never hiring earns 54% less (target: well under half of the compute-first builder); and after the loan, with nothing broken, the net rate was never negative. The starting values stand; no tuning was needed.

Worth knowing:

- Runs are longer (about 17 minutes against 12) and the CEO now ends almost all of them. That is expected: M33 replaces zero tolerance with strikes and sets the run length.
- Mid-game backups now pay clearly: never a backup earns 19% less than backups from hall 4 (10% in M31). Getting ready for the CEO earns most.
- Two seeds in twelve still go broke at about 4:54, just before the loan ends, after spending everything ahead of the ribbon-cutting fine.
- The GDD (v0.9) still describes the doubling burn; it is out of date on that until its next version.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: the loan shows in the note at 844, and the bar under the cash at both sizes; no console errors.

Owner's checklist:

- The first five minutes feel like a race. The loan in the HUD runs down.
- When the loan is paid off, money stops being the worry.
- Later in the run, when the cash rate drops, there is something broken that you can see.

### M31. Electricians only

Pass 4 spec 7.3a (owner, 15 Nov, after M30).

Built:

- **Rule** (`canFix` in `src/core/game2.js`, `tradeOnly` in `src/core/config2.js`): a transformer short and an RMU fault can only be worked on by an Electrical tech. `assign` refuses anyone else and leaves them on their job. Fan failures and every indoor alarm are unchanged.
- **Auto-dispatch, one-tap dispatch and the scripted players** only send electricians; with none free, the alarm waits and the other techs take other jobs.
- **Screen:** with a short or RMU fault selected, the other techs' crew cards fade. Tapping one keeps the alarm selected and floats "Electricians only" from the alarm (`src/ui/refusal.js`). The two introductions say so.
- 6 new tests (438 in all).

Worth knowing:

- With one electrician busy elsewhere, a short just waits. A second electrician is now worth hiring once the yard starts failing (from 3 halls).
- The "Electricians only" label rises from the alarm itself, so if the alarm is off screen you will only see the faded cards.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: the mechanic's card fades, a tap on it is refused, and the short stays selected and unassigned. No console errors.

Owner's checklist:

- Select a short, then tap the mechanic: is it clear why nothing happened?
- Does it feel worth hiring a second electrician once the yard starts failing?

### M30. Yard failures

Pass 4 spec 7.3 (owner's answers, 15 Nov).

Built:

- **A way out to the yard** (`src/core/layout2.js`): doors in the long walls lead to a walkway between the transformers and the RMUs; doors in the end walls lead through the middle of each dry cooler block. The outside walls now have their door gaps drawn.
- **Transformer short** (Electrical): its switchboard loses power at once. Fixed in two places by the same tech: **disconnect at the RMU** (3 s), then **repair at the transformer** (8 s). Once disconnected it can no longer spread; left connected for 45 s, it takes out its RMU.
- **RMU fault** (Electrical): both of the pair's switchboards lose power, backups or not. No clock: it is already the worst. 10 s at the RMU.
- **Dry cooler fan failure** (Mechanical): the unit stops, so its plant's chillers may stop; left 60 s, the next unit at the plant fails.
- **Building mode only**, and none until 3 halls are online (a small campus runs through one RMU).
- Costs on the rail, auto-dispatch (with both legs of a short's walk), the CEO (only outages), new pictures, failed devices greyed with a red slash, introductions, and CEO lines for each.
- 9 new tests (432 in all).

Scripted checks (spec 7.3): backups from hall 6 now beat never buying them by about 19%: the yard's failures are what backups protect against.

Worth knowing:

- The first yard failures come once your third hall is online. An RMU fault is rare but the worst there is: run for it.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: a short sent to the RMU then the transformer, an RMU fault darkening the half, techs walking out through the doors. No console errors.

Owner's checklist:

- Watch a tech handle a short: is the walk to the RMU, then the transformer, clear?
- Does an RMU fault feel like the one to run for?
- Do mid-game backups now feel worth buying?

### M29. Building the yard

Pass 4 spec 7.2. A rules change the owner approved (15 Nov).

Built:

- **Yard devices are equipment** (`src/core/layout2.js` builds them from `src/core/outdoor.js`): 32 transformers, 16 RMUs, 16 dry cooler units, each a buildable spot with a build card and its own picture.
- **The power chain** (`msbFed` in `src/core/sites.js`): a switchboard works only with its transformer and RMU built; a hall needs one fed switchboard, a coolant unit and a chiller to come online.
- **Dry coolers** (`dryCapacity`): each lets two of its plant's chillers run.
- **The start** adds Hall 1's top RMU and A transformer and a dry cooler at Plant A; $800 to start.
- **Prices and burn** settled by the scripted checks: transformer $75, RMU $100, dry cooler $150, switchboard $150; upkeep $0.15 a second; the burn doubles every 150 s.
- **The tutorial** teaches the chain: the bottom half needs its RMU, transformer and switchboard first.
- The scripted builders build each half's chain and the dry coolers their chillers need.
- 2 new tests (424 in all); the building, spot and tutorial tests updated for the chain and the new start.

Worth knowing:

- Nothing in the yard fails yet: shorts, RMU faults and fan failures are M30, along with a way for techs to walk out to the yard.
- The layout tests that check every service point is on a walking lane cover indoor equipment only, until M30.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: yard spots, the transformer's card, building one. No console errors.

Owner's checklist:

- Build a new hall: is it clear you need the RMU and transformer outside as well as the switchboard?
- Do the yard's "+" spots and build cards read well?
- Does the money still feel about right with the extra pieces?

### After M28: concrete under the yard

At the owner's request: one long piece of concrete along the whole north wall, from the wall out past the RMUs, and one along the south (`drawYardGround` in `src/render/outdoor.js`). The east and west ends stay dirt. The owner also answered on M30: transformers short rather than trip, and a short must be disconnected at the RMU before the transformer is fixed; an RMU fault takes out both sides (spec 7.3).

### M28. The yard outside the building, and black pipes

Pass 4 spec 7.1 (owner, 15 Nov). Drawing and layout only; the yard joins the rules in M29 and M30 (proposed in spec 7.2 and 7.3).

Built:

- **The yard** (`src/core/outdoor.js` for where things stand, `src/render/outdoor.js` for the drawing): a transformer straight outside the wall from every switchboard, with a bus duct through the wall; an RMU for every pair, cabled to its A and B transformers; a north and a south power line on poles, from out of view on the left and off to the right, with a drop to every RMU; a dry cooler block of 8 fan units outside each plant, piped to the plant's north and south pumps.
- **A wider yard** for the camera: 330 units past the ends, 280 past the long sides.
- **All pipes black**, including the coolant units' stubs and the chillers' nozzles.
- Pale yard equipment for switchboards not built yet (building mode) or halls not online (classic).
- 4 new tests (422 in all).

Owner's checklist:

- Pan round the outside: do the transformers, RMUs and power lines read as one system feeding the switchboards?
- Do the dry coolers read as dry coolers, and the black pipes as pipes?
- Read spec 7.2 and 7.3 (M29 and M30) and say yes, or what to change.

### M27. The building tutorial

Pass 4 spec 3.6. **Pass 4's planned milestones are complete.**

Built:

- **The building tutorial** (`src/ui/tutorial4.js`): six lessons on Hall 1 teaching the build order: buy a rack; the bottom half needs its own switchboard first; a switchboard trips with no backup and half the hall goes dark while a tech heads there by themselves; backups cost upkeep, so buy them once racks earn; a new hall needs a switchboard and a coolant unit before racks, and a chiller per hall of racks; then the burn starts. A lesson nobody answers moves on after a minute.
- **Nothing burns during the lessons**, and the burn, the alarm tightening and the 10:00 Handover count from the hand-over (`economyStart`). The HUD rate shows income only meanwhile.
- **Techs go on their own during this tutorial** (auto-dispatch still holds off in the classic game's tutorial, which teaches sending by hand).
- **A best score in money** for building mode, kept apart from the classic game's.
- 8 new tests (418 in all).

Balance: unchanged. The owner's only note so far is that the money pressure feels about right; the next balance pass needs your runs.

Worth knowing:

- To see the tutorial again, switch Skip tutorial off in the drawer.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: the first callout, building through the card, the lessons advancing, the trip with a tech going by themselves. No console errors.

Owner's checklist:

- Play the tutorial once. By the end, do you know what a new hall needs, and when to buy backups?
- Is any callout too long or in the way?
- Then a few full runs: what kills you, and what felt unfair?

### M26. Hiring and upgrades for money

Pass 4 spec 3.3. Screen only: the rules (`hire`, `buyUpgrade`) came with M24.

Built:

- **The Hire card** at the end of the crew bar in building mode: a "+" with "Hire $400". The crew bar makes room for it (two columns when the crew is big).
- **The Hire and upgrade card** (`src/ui/shop.js`, `setShop` in `src/render/overlays.js`): the four trades at $400, each saying how many are on the crew, and Carts, Better tools and Radios at $500 with their level ("Done" at the limit). Greyed when the cash is short. The game waits while it is open; buying keeps it open with the new cash; Close goes back. The cash line shows the wages per tech.
- 4 new tests (410 in all).

Worth knowing:

- The game pauses while the card is open, even in real-time mode, so you can shop without being punished for reading.
- Each tech adds $0.50 a second to the burn.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: the Hire card, the card fitting both screens, hiring a Network tech, the game waiting, Close. No console errors.

Owner's checklist:

- When the crew is swamped, is the Hire card easy to find?
- Is $400 a hire (plus wages) about right against $150 a rack?
- Do the upgrades feel worth $500?

### After M25: plain hall names

At the owner's request: halls not yet online in building mode show just their name ("Hall 2"), pale, without "needs power and coolant". The tutorial (M27) will teach the build order instead (spec 3.6). The owner found the money pressure about right for now.

### M25. Building on screen

Pass 4 spec 3.1 to 3.3. **Building mode is now the game** (the drawer's "Building mode" switch, off, brings back the classic game).

Built:

- **Empty spots** (`src/ui/spots.js`, drawn in `src/render/campus2.js`): every device not built yet is a faint ghost with a dashed outline and a "+"; while a contractor builds it, it fills in with a ring. Every spot is at least a 44 px target; alarms and techs win over spots.
- **The build card** (`src/render/spots.js`): tap a spot for its name, price and one line on what it does here (a backup says it is one; a rack row says when it will not earn yet: no switchboard in its half, hall not online, cooling short). Infrastructure shows its upkeep. Tap **Build**, or the same spot again; tap elsewhere to close. Short of money, the button says how much more is needed.
- **Cash in the HUD** in place of the Stability meter: cash, the rate (income minus burn, red when falling), and "In the red · 0:12" while the countdown runs. The note says how many halls are online.
- **The no-backup shield** on the overview strip: hollow with a dashed green edge, for a hall working with no backup.
- **Pipework complete from the start** in building mode; halls not online are pale, titled "needs power and coolant". "Hall 3 online" celebrates a hall you bring online; each purchase floats its price.
- **The round-over card:** money earned is the headline; "Went broke" when the cash ran out.
- **`#auto`** also builds, compute first.
- The rules' own default stays the classic game (its tests are unchanged); the screen and drawer start from `gameDefaults2()`, building mode on.
- 8 new tests (406 in all).

Worth knowing:

- **No tutorial in building mode yet** (M27 rewrites it). The build card names everything, and the first network and pump alarms still get their introductions.
- **Hiring and upgrades** have no buttons yet: M26. Until then you play with your two starting techs.
- Your saved drawer settings are kept; Building mode is on unless you switch it off.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: spots and their targets, the card beside and clear of the spot, building by Build and by a second tap, the cash and red countdown in the HUD, "Went broke", and `#auto` building. No console errors.

Owner's checklist:

- Start a run: can you tell what to build first, and does the card tell you enough?
- Does the money pressure feel right: a tight start, racks keeping you afloat, backups worth it later?
- Do the spots and "+" badges clutter the map, or read as "room to grow"?

### After M24: compute first, money as the lifeline

At the owner's request (pass 4 spec 0.3, sections 2.5 and 2.8): mandatory backups were too harsh; there should be pressure to get compute online, a burn on your cash, and backups as a mid-game buy.

Built (rules, still behind `building.enabled` until M25):

- **The burn:** $3 a second doubling every 140 s, plus $0.25 a second upkeep per piece of infrastructure and $0.50 a second per tech. Racks earn $4 a second (was $3); start with $600.
- **In the red:** a 15 s countdown; still in the red when it ends, the run is over ("Went broke").
- **No Stability meter** in building mode; a dark half just stops earning.
- **The CEO only fines outages:** only an unattended alarm costing power is a sighting; a fine is $50 per point.
- One chiller per hall's worth of racks in building mode (was 1.25).
- The scripted builders now build compute first, with backups from hall 4 (or 6, or never, or early, for comparison), keep 3 s of burn in hand, and count racks still under construction against the cooling.
- Tests: 398 (the building tests turn the burn off unless they are about the economy).

Scripted results in pass 4 spec 4.2: compute first with mid-game backups or none come out about even, backups early earn 87% less, never hiring 58% less; runs about 11 to 12 minutes, ended by zero tolerance or going broke.

### M24. Rules for building

Pass 4 spec 2.1 to 2.8. The rules only; the screen to build arrives in M25. Building mode is behind `building.enabled`, **off by default**, so the game you play is unchanged until M25.

Built:

- **Spots and building** (`src/core/sites.js`, `build` in `src/core/game2.js`): every device spot starts empty except the bare minimum for Hall 1 (Plant A's top pump and one chiller; Hall 1's top A switchboard, top coolant unit and 2 rack rows), with $400. Building takes the money at once and a contractor finishes 8 s later.
- **What works:** a hall is online with a switchboard and a coolant unit, and a chiller anywhere. A row delivers only in a half with a working switchboard, in a hall with a working coolant unit, and earns $3 a second at full output. Chillers run only at a plant with a pump; they are needed by racks online (1.25 per hall's worth).
- **Backups are your choice:** a breaker trip with no B switchboard darkens that half at once; a leak with no second coolant unit throttles, then shuts the hall when its clock runs out. A "single" shield status (working, no backup) for M25 to draw.
- **One engine for both games:** every "hall online" question now goes through `sites.js`, so the classic game and building mode share the rules. The classic game's 375 tests pass unchanged.
- **Pacing in building mode:** alarms follow what is built (the hall table by racks online, 1.5% tightening from the start), a small campus gets fewer, the first comes after 20 s, and the alarm cap is 2 plus one per hall's worth of racks, whatever the crew.
- **CEO:** the ribbon-cutting at the third hall online (whichever it is), the Handover at 200 MW of racks online or 10:00.
- **Hiring and upgrades for money** (`hire`, `buyUpgrade`): the commands are in; their screen is M26.
- **Scripted builders** (`src/core/builder.js`): careful, greedy (no backups) and never-hiring plans; `scripts/pacing4.mjs` and `scripts/sweep4.mjs`.
- 19 new tests (394 in all).

Scripted checks: see pass 4 spec 4.2. In short, a careful builder reaches 150 MW at about 7:20 and lasts about 14:40, mostly ended by zero tolerance; never hiring earns 75% less; never buying backups collapses by about 3:30.

Settled by the checks (all in the spec): income $3 (draft $5), tightening 1.5%, a 20 s start, fewer alarms under one hall of racks, the cap set by racks, and a gentler dark-half drain (0.25) in building mode.

Worth knowing:

- **Skipping backups is brutal.** The greedy builder earns more for 3 minutes, then collapses. That is a strong push to buy backups, maybe too strong; your play will tell.
- Nothing to try on the phone yet: building mode is off until M25 gives it a screen.

### M23. Techs pick their own jobs

Pass 4 spec 2.6. A rules change the owner approved with the pass 4 spec.

Built:

- **Auto-dispatch** (`src/core/auto.js`, called every step): once an alarm has had nobody on it for 1 s, the alarm that matters most goes to the free tech who would finish it soonest. "Matters most" is the rail's order: costing most, then least clock left, then oldest; while the CEO is announced or walking, alarms the CEO will see come first. A busy tech is never pulled off a job, so a job you gave is kept. You can still tap an alarm, then any tech, to send or redirect.
- It holds off during the tutorial's lessons, which still teach sending techs by hand.
- **Drawer switch:** Techs pick their own jobs (on by default).
- The alarm cost and triage order moved into the rules (`src/core/cost.js`); the screen imports them as before.
- The scripted players can now play as "nobody" (`policy: 'none'`): the crew runs itself.
- Tests: 9 new (375 in all). The rules tests that stage a fault and leave it ignored on purpose (escalations, shields, bubbles) now turn auto-dispatch off in their set-up, as do the "nobody playing" and "play by tapping" runs.

Scripted checks, 12 seeds, tutorial off, auto-dispatch on:

| Player | Run length (range) | GWh | Ended by zero tolerance / CEO hit / meter |
|---|---|---|---|
| good, ready for the CEO | 15:02 (12:01 to 17:56) | 3.26 | 6 / 1 / 5 |
| very slow, ready for the CEO | 15:42 (12:01 to 21:35) | 3.45 | 8 / 1 / 3 |
| nobody (techs on their own) | 14:06 (12:01 to 16:46) | 3.02 | 9 / 1 / 2 |

With auto-dispatch off, nobody playing lasts 1:14.

Worth knowing:

- **For now the game nearly plays itself.** With nobody giving orders a run lasts about as long as a good player's; your orders add about 8%, mostly by getting ready for the CEO. That is expected: in pass 4 the skill moves to what you build (M24, M25). Until then, the switch in the drawer brings back the old game.
- A slow player now does as well as a quick one, since the crew never waits for you.

Owner's checklist:

- Play a run without sending anyone. Do the techs make sensible choices?
- When you disagree, redirect a tech. Is it easy, and does the tech stick to the job you gave?
- Watch the CEO's visits: do techs head for the alarms on the route?

### M22. Rail fix, and hold and speed buttons

The first milestone of pass 4 (spec 3.4, 3.5). Screen only.

Built:

- **No more misclicks when the rail changes.** Once the rail turns to tiles it stays tiles until the alarms fit as tickets with 3 slots to spare, so it no longer flips back and forth. And a tap on the rail in the 0.4 s after it changes between tickets and tiles is ignored, since the finger was aiming at where a ticket used to be.
- **Hold and speed buttons** (on by default): at the HUD's right end, **Hold** (`❚❚`, showing `▶` while held), **Speed** (`1x` / `2x`) and the gear, which now opens the pause card (Resume, Restart, Tuning). While held, nothing moves but you can still select, send and redirect techs; the HUD says "Held". The space bar holds and releases. 2x runs two rules steps per step, so everything keeps its rate in game time.
- **Real-time mode** in the drawer takes the hold and speed buttons away (for experienced players); the HUD is then as in pass 3. It applies from the next round.
- Pass 4 spec 0.2 (approved) in `docs/pass4-spec.md`; `CLAUDE.md` now points at it.
- 4 new tests (366 in all).

Worth knowing:

- Hold and speed are screen controls; the rules are unchanged. A held game still pauses properly (with the pause card) when the phone locks or the app goes to the background.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: holding stops the clock, a tech can be sent while held, 2x runs two seconds of game a second, and the gear opens the pause card. No console errors.

Owner's checklist:

- Late in a run, hold the game, sort out the alarms, then carry on. Does that take the edge off the crazy part?
- Try 2x early in a run, when nothing much is happening.
- Watch the rail as alarms come and go around 7 or 8: does it stay put, and do your taps land where you meant?

### M21. A cleaner map, and each device introduced

At the owner's request after playing (pass 3 spec 4b.3, 4b.4).

Built:

- **Shields on the strip only.** The hall and plant shields, their rings and the "5 spare" beside Plant A's title are off the map; the overview strip still shows every shield and the spare count.
- **No equipment captions.** "MSB A", "Chiller A3", "Pump top" and "CDU" are gone. Hall and plant titles stay.
- **A and B on the switchboards**: a stencilled letter on a small white plate on the cabinet (`drawMsb` takes `side`). It stays on a tripped one.
- **Dirt outside the building** (`src/render/floors.js`): bare earth made in code (patches, grit, small stones), two pairs of faint tyre tracks along the long sides, and a narrow concrete apron at the outside wall. The camera can now look 90 world units past each wall (`SITE_MARGIN` in `src/ui/camera.js`); the strip's frame stays on the building.
- **Devices introduced by name.** The tutorial's callouts now say "switchboard", "chiller" and "coolant unit". After the tutorial, the first rack-row network failure and the first pump overpressure each get a 6-second callout (`src/ui/intros.js`), held back while the CEO is being announced. Only in a run that began with the tutorial.
- 6 new tests (362 in all); two tutorial tests follow the new first callout.

Worth knowing:

- The tutorial's first lesson still cracks the power shield, but now you see it crack on the strip, not on the hall.
- Checked in a headless Chrome at 844 x 390 and 660 x 300: tiles, plates, the earth at the top, left and bottom edges, the tutorial's first callout and the network introduction. No console errors.

Owner's checklist:

- Does the map read better without the shields and captions? Can you still tell the devices apart?
- Do the A and B plates and the dirt look right on the phone?

### M20. Gentler escalation, and a rail without pages

The owner played the CEO build on 14 November: "it gets unmanageable pretty quickly", and the pages of alarms were a chore (pass 3 spec 4b.1, 4b.2).

Built:

- **Gentler escalation** (owner's agreement to a rules change, `src/core/config2.js`): each new hall starts at 12, 10, 9, 8, 7, 6.5, 6, 5.5 s between alarms (was 12, 9, 7.5, 6.5, 5.5, 5, 4.5, 4); tightening 3% every 10 s (was 5%); 50% of it kept between halls (was 70%). Tuning drawer controls unchanged.
- **A rail without pages** (`src/ui/rail2.js`, `src/render/rails.js`): while alarms fit as tickets, nothing changes. Past that, every ticket becomes a 44 x 44 tile, two across: the alarm's bubble (picture, clock ring, hat dot, who is on it) with its cost under it. 14 fit on the iPhone, 10 at 660 x 300. The ▲ and "+N more" chips are gone; only if even the tiles overflow does a "+N" note show and the rail drag.
- `scripts/profile.mjs`: a minute-by-minute picture of a run (alarms started, alarms open, how often the crew is short-handed).
- Tests: the rail tests rewritten for tiles; three tests that pinned the old director defaults updated. 356 tests.

The scripted player closest to a person (reacts in 4 s, one command every 3 s), 12 seeds, before and after:

| Minute | Hall | Alarms a minute, before | Short-handed, before | Alarms a minute, now | Short-handed, now |
|---|---|---|---|---|---|
| 2–3 | 3 | 14 | 11% | 10 | 3% |
| 4–5 | 5 | 20 | 35% | 12 | 0% |
| 5–6 | 6 | 21 | 57% | 14 | 0% |
| 7–8 | 8 | 20 | 82% | 15 | 0% |
| 9–10 | 8 | 15 | 99% | 22 | 2% |
| 10–11 | 8 | (most runs over) | | 23 | 68% |

Spec 4.5 checks with the new defaults:

| Player | Run length (range) | GWh | Hall 8 reached | Hall 8 at | Ended by zero tolerance / CEO hit / meter | Sightings |
|---|---|---|---|---|---|---|
| careful, ready for the CEO | 14:39 (12:01 to 19:07) | 3.16 | 12/12 | 7:03 | 7 / 1 / 4 | 0.9 |
| good, ready for the CEO | 16:08 (12:02 to 24:37) | 3.56 | 12/12 | 7:04 | 7 / 1 / 4 | 0.8 |
| good, CEO-blind | 14:01 (11:59 to 16:36) | 2.99 | 12/12 | 7:04 | 9 / 2 / 1 | 1.2 |
| slow, ready for the CEO | 13:56 (11:56 to 17:58) | 2.95 | 12/12 | 7:05 | 6 / 2 / 4 | 1.1 |
| very slow, ready for the CEO | 13:08 (11:13 to 15:43) | 2.68 | 12/12 | 7:09 | 4 / 1 / 7 | 0.8 |
| random | 11:43 (8:28 to 13:45) | 2.28 | 12/12 | 7:12 | 3 / 3 / 6 | 2.3 |

Blind vs ready: 128 s shorter, 16% less energy. Random: 36% less energy.

Worth knowing:

- Zero tolerance now ends most strong runs, and getting ready for the CEO matters more than before. But runs are longer: 13 to 16 minutes for scripted players, longer than the GDD's 10. A person who has to find each alarm will go under sooner. If runs drag, the quickest levers are zero tolerance from the second walkthrough, or the drawer's "Extra alarm after full campus".
- Pressure still rises fastest after hall 8, where no new hands arrive; that is when the CEO takes over.

Owner's checklist:

- Play two runs. Does the pressure build gradually, with a calm start and a busy end?
- Late in a run, can you see every alarm on the rail without tabbing?

### After M19: overhead pipes

At the owner's request:

- **The pipes run overhead.** They are drawn above the crew and the CEO, and cast a shadow on the floor, offset by their height.
- **Drops at the units.** Where a pipe meets a chiller or a pump's discharge, it slopes down over its last 26 units: the shadow closes in to meet it, the pipe darkens, and a flanged end shows it turning straight down. Each CDU is fed by a short vertical drop off its header, drawn as a round tap.
- **Over walkways** (the plant lanes, the gaps between hall pairs, the centre line, each hall's outer aisle, the corridors by the pumps) the pipes stay solid: a tech walking under one is hidden for a moment. A see-through fade was tried and taken out at the owner's request; the walkway crossings are still marked in `src/ui/pipes.js` if it is wanted again.
- The map preview draws the pipes in one go, without the fade.
- Pipe tests rewritten for the slopes, taps and walkway crossings: 355 tests.

Owner's checklist: do the pipes read as overhead? Do the drops at the chillers, pumps and CDUs read as the pipe coming down?

### After M19: CDUs and pumps turned to meet their pipes

At the owner's request:

- **CDUs** turn so their blue and red stubs point into their hall and run to its wall: the top row faces down, the bottom row up. The droplet stays upright.
- **Pumps** turn so the discharge sits on the pipe: the main pipe beside each plant now runs straight out of both pumps' discharge (the top pumps point down, the bottom ones up; Plant B's are mirrored). The riser moved 6 units to line up.
- A test now checks every pump's discharge is on its riser. 353 tests.

Owner's checklist: at both plants, does each pump's pipe come straight out of its discharge? Do the CDUs' red and blue lines meet their halls?

### M19. Graphical pass

The owner asked for this after playing the CEO build (pass 3 spec 4a).

Built:

- **Pipes** (`src/ui/pipes.js`, drawn by `src/render/pipes.js`): insulated blue chilled-water pipes join the pumps, the chillers and every CDU. In each plant a riser runs beside each column of chillers with a branch to every chiller, and the outer riser joins the top and bottom pumps. Two headers run the whole building between the corridors and the halls, and each CDU sits on one. Pipes past the halls built so far, and Plant B's before hall 6, are pale.
- **Floors** (`src/render/floors.js`): white raised-floor tiles in the data halls; smoothed concrete with saw-cut control joints outside them (a small texture made in code, no image files); darker pads under the plants; walkways as a lighter band with faint edges.
- **Chillers** (`src/render/icons.js`): now water-cooled centrifugal chillers from above, in the same footprint: two barrels with water boxes and nozzles, the compressor and motor across the top, a control panel and the mechanical badge. Generic, with no maker's name or logo. A tripped chiller greys its compressor and motor and keeps the red slash.
- 5 new tests (353 in all).

Worth knowing:

- The rules are unchanged; pipes are drawing only.
- About 60 frames per second at 844 x 390 and 660 x 300 in a headless Chrome at three pixels per point; the phone is the real check.

Owner's checklist:

- Do the pipes make the plant read as one system?
- Do the halls and the concrete look right on the phone?
- Do the chillers read as chillers, and is a tripped one still obvious?

### M18. CEO on screen

Pass 3's planned milestones are complete.

Built (`src/render/ceo.js`, `src/ui/ceoView.js`):

- **The CEO and the assistant**, drawn from above in the crew's style but plainly not crew: a dark suit with a purple tie and a spotless white hardhat marked "CEO"; the assistant a step behind (following the CEO's own path) in a grey cardigan with a clipboard. No trade colours.
- **The view cone** as a translucent ink wedge; **the route** dashed, with a ring at each inspection point, from the warning on; the route and the CEO also on the overview strip.
- **The banner** across the top of the map, as wide as its words: `The CEO is coming · Halls 4, 5 · 0:15` over `Each unattended alarm seen: −50` (plus `Next visit: zero tolerance` on the visit before); while walking, `The CEO is here · Hall 5 left`; under zero tolerance it turns solid ink with `Any unattended alarm seen ends the run`. One line on a narrow map: `CEO · H4, H5 · 0:15 · −50`.
- **An edge arrow** (an ink disc marked CEO) points to the CEO, or during the warning to where the CEO will appear; tap it to go there. It is drawn over the banner.
- **The CEO's lines** (spec 4.8) in a speech bubble: on arriving (ribbon-cutting and Handover have their own), on each sighting (by alarm type), and on leaving (pleased, displeased, or announcing zero tolerance).
- **A sighting:** the line, the alarm's bubble shakes, `−50 Stability` floats up beside it, and the HUD flashes.
- **Fired by the CEO:** the round-over card's heading, with the CEO's parting line under it.
- The HUD note is back to the halls, since the banner now says everything about the CEO.
- 6 new tests (348 in all).

Worth knowing:

- The CEO and the assistant are drawn at a tech's size, so at 660 x 300 they are small; the "CEO" on the hat is readable on the iPhone.
- Lines are picked from the run's seed and the alarm's number, so a run says the same things if replayed.
- Checked in a headless Chrome at 844 x 390 and 660 x 300 with touch: the ribbon-cutting warning and banner, the edge arrow over the banner, tapping the strip to follow, the CEO and the assistant walking with the cone, a sighting (line, shake, float, flash), and being fired (heading and parting line). No console errors.

Owner's checklist:

- Play three full runs. Can you see where the CEO is going and get a hat on every alarm in the way?
- Does zero tolerance feel like a fair ending?
- Did anything make you laugh?

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
