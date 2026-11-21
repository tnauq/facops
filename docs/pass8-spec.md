# FacOps pass 8 build spec

Version 0.1, 21 November 2026. The owner **approved it on 21 November, with every question in section 1 as recommended**. It is the source of truth for pass 8, as `docs/pass7-spec.md` is for pass 7. Pass 7's rules and screen carry over except where this spec says otherwise. If the spec is silent or looks wrong, stop and ask the owner.

Values marked *starting value* are for scripted checks to settle; everything else is the owner's decision.

## 0. What pass 8 is

The rest of pass 5 (GDD v0.9 section 14, rows 6 to 10): the additions that make FacOps a management game rather than a build order.

1. **Posts and the priority area** (Decided): where techs wait, and which area comes first.
2. **Warnings before failures** (Decided): a device warns for 10 s; a tech who gets there prevents the alarm.
3. **Busy and quiet spells** (Decided): the director breathes, and the CEO arrives in the quiet.
4. **The CEO's promises and surges** (Decided): goals the CEO offers, part paid up front.
5. **The pick of two and the rescue call** (Decided): a reward for a clean visit, and a way out of the red.
6. **Layers and standing orders** (Proposed): one system at a time on the map, and three crew policies.
7. **A balance pass** across all of it.

v0.9 wrote these before passes 5 to 7 changed the economy (the loan, the strikes, service credits, the uptime bonus, the sale). Where a number or a rule no longer fits, this spec says so and gives a new starting value.

**Owner agreement on rule changes.** M46 to M51 add rules, each behind its own drawer switch, off until its scripted checks pass and then on by default. M52's standing orders, if wanted, add rules the same way. Nothing else in `src/core/` changes, and no test is loosened. Every milestone that changes the rules or the state bumps `SAVE_VERSION`.

**The targets that hold through the whole pass** (pass 7's, kept). After every rules milestone, `scripts/pacing4.mjs` (12 seeds) must still show:

| Check | Target |
|---|---|
| Compute-first median run | 14 to 20 minutes |
| Endings across pass 7's four players (two who never sell, two sellers) | Sold, fired and broke each 25% to 40% |
| Getting ready for the CEO | Earns more than not |
| Never a backup | At least 25% less than backups from hall 4 |
| Backups early | Broke in at least half the runs |
| 150 MW | 6 to 9 minutes |

When a milestone pushes one of these out, its own section names the first lever. M53 is the pass's balance check with everything on together.

## 1. The owner's answers (21 November)

All six as recommended.

| # | Question | Answer |
|---|---|---|
| 1 | **The rescue call's funding round.** v0.9's "base burn a quarter higher" no longer fits: the base is now a $1 site overhead. What does the funding round cost? | **A second loan:** $2,000 at once, repaid at $8 a second (4:10) on top of everything else. Once per run |
| 2 | **Spells and the CEO.** v0.9 announces the CEO at the start of a quiet spell, so a visit that falls due in a busy spell waits up to 40 s. That makes strike visits rarer and runs longer. Keep it? | **Yes**, and win the time back with the strike gap if the checks need it (it is M41's lever) |
| 3 | **Promises' amounts.** v0.9's table was priced for the doubling burn. Use the re-priced table in 5.1? | **Yes**, as starting values |
| 4 | **Perks.** Swap "Spare parts" (fixes faster, close to Better tools) for "Patient customers": no service credits for 90 s? | **Yes** |
| 5 | **Layers** (Proposed): in pass 8? | **Yes**: Power, Cooling and Crew, screen only |
| 6 | **Standing orders** (Proposed): in pass 8? | **Not yet.** Posts and the priority area do most of their job; revisit after playing pass 8 |

## 2. Milestones

One per session, in order. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Touches | Size |
|---|---|---|---|
| M46 | Posts and the priority area (3) | Rules (behind a switch), screen, checks | Medium |
| M47 | Warnings before failures (4) | Rules (behind a switch), screen, checks | Medium |
| M48 | Busy and quiet spells (5) | Rules (behind a switch), checks | Medium |
| M49 | The CEO's promises (6.1 to 6.4) | Rules (behind a switch), screen, checks | Large |
| M50 | Surges (6.5) | Rules (behind a switch), screen, checks | Small to medium |
| M51 | The pick of two and the rescue call (7) | Rules (behind switches), screen, checks | Medium |
| M52 | Layers, and standing orders if wanted (8) | Screen; rules for the orders | Medium |
| M53 | The balance check, everything on (9) | Config, checks | Small |

Order: posts come before warnings because posted techs are who walks to warnings. Spells come before promises because promises are priced against the alarm rhythm. Standing orders are out of pass 8 (question 6), so M52 is layers only.

## 3. M46. Posts and the priority area (GDD v0.9 section 7)

### 3.1 Rules (`crew.posts`, switch "Posts")

- **An area** is one of the ten on the overview strip: Plant A, halls 1 to 8, Plant B. The yard outside a hall or plant belongs to it (`areaOf` in `src/core/ceo.js` already says which).
- **Posting is optional.** A tech has a post or none. A tech with none behaves as today.
- **A posted tech** idle for 3 s (`returnAfter: 3`, *starting value*) walks back to the post and waits at its centre (the hall's middle aisle; the plant's lane).
- **A posted tech still answers anywhere.** The crew's rule is unchanged: the tech who would finish soonest takes the alarm, posted or not.
- **One priority area** (`state.priorityArea`, or none). Alarms in it rank first in auto-dispatch, after the CEO's route during a visit, before everything else. The rail's order is unchanged.
- **Commands:** `postTech(state, techId, area | null)`, `setPriority(state, area | null)`. Events `posted`, `priority`.
- Not in the classic game.

### 3.2 Screen

- **To post a tech:** tap the tech (map or crew card), then tap an area on the strip. A small pin in the tech's hat colour marks the area on the strip, and the crew card shows it ("H5"). Tap the tech, then its pin, to clear it. Tapping the strip with no tech selected still moves the view, as now.
- **The priority area:** a flag button (44 px) at the strip's right end. Tap it, then an area; the area's strip box gets a flag. Tap the flag button, then the same area, to clear it.
- **Introduction**, once, the first time a fourth tech is hired: "Tap a tech, then a hall on the strip, to post them there."

### 3.3 Checks

*M46's result:* posting did not cut income lost without warnings, so posts ship switched off; M47 reruns this check with warnings and switches them on if it passes.

- A scripted builder that posts techs (one per two halls, spread along the building, priority on the busiest hall) loses fewer seconds of income to outages than one that does not.
- Pass 8's standing targets (section 0).

### 3.4 Owner's checklist

- Post a tech to Hall 5: they walk back there after each job.
- Mark a priority area: its alarms are taken first.

## 4. M47. Warnings before failures (GDD v0.9 section 7)

### 4.1 Rules (`director.warnings`, switch "Warnings")

- **When the director picks a device**, the device shows a warning for 10 s (`warnFor: 10`) before the alarm starts.
- **A tech who reaches it** in that time clears it with a 2 s check (`checkTime: 2`), and no alarm follows. Event `caughtInTime`.
- **Who goes:** a posted tech with no job walks to warnings in its post's area. A tech with no post goes only if the player sends them (tap the warning, then the tech).
- **A job comes first:** a tech on the way to a warning drops it the moment an alarm is given to them.
- **Escalations never warn.** They are the price of an ignored alarm. Nor does anything the CEO's route shields from new alarms.
- Warnings count toward the director's cap as the alarms they will become.
- Not in the classic game.

### 4.2 Screen

- A wrench mark on the device, and a small wrench on the overview strip. Warnings stay off the alarm rail. "Caught in time" floats up when one is cleared.
- The inspect card on a warned device: "Warning: will fail in 0:07".
- **Introduction**, once, at the first warning: "A wrench means a device is about to fail. A tech who gets there in time stops it."

### 4.3 Checks

- A scripted builder who posts techs prevents a third to a half of the director's picks.
- A sixth and a seventh tech still pay for themselves.
- Warnings cut outages, which cuts service credits and lengthens runs. **First lever** if runs pass 20 minutes: the credits' doubling. Report it.

### 4.4 Owner's checklist

- A posted tech walks to a wrench in their hall and stops the failure.
- An unposted tech ignores a wrench until you send them.

## 5. M48. Busy and quiet spells (GDD v0.9 section 8)

### 5.1 Rules (`director.spells`, switch "Busy and quiet spells")

- The director alternates a **busy spell** of about 40 s with a **quiet spell** of about 20 s (`busy: [35, 45]`, `quiet: [15, 25]`) in which it starts nothing new (no picks, no warnings, no waves).
- Over a few minutes the number of alarms stays about the same as today: the busy spell's gaps shrink to make up for the quiet (`busyFactor`, set by the checks).
- **Easing off:** if more outages are open than there are free techs for 10 s, or a whole hall is dark, the busy spell ends early.
- **Mercy:** nothing new starts while the red countdown runs.
- **The CEO** is announced at the start of a quiet spell. A visit that falls due in a busy spell waits for the next quiet one (question 2).
- **Carries on through a quiet spell:** escalations, warnings already showing, the CEO's visit, service credits.
- **Not shown.** The player feels the spells and is never told.

### 5.2 Checks

- Alarms a minute within a tenth of today's, and longer unbroken gaps for building.
- If strike visits get too rare (fired under 25%), **first lever:** the strike gap (M41's), shorter.

### 5.3 Owner's checklist

- The run has a rhythm: a rush, then a breather to build in.

## 6. M49 and M50. The CEO's promises, and surges (GDD v0.9 section 6)

### 6.1 Rules: promises (`promises`, switch "Promises"; M49)

- **The CEO offers; you choose.** Offers wait in a list of up to three. Up to two promises are held at once.
- **Part is paid when you accept** (the advance), the rest when you deliver. The deadline starts at acceptance.
- **Miss it or cancel it** and the advance goes back; no further fine (owner, 15 Nov). If handing it back puts the cash below $0, the red countdown starts.
- **An offer is never already true**, and one not taken is replaced after 60 s.
- **The first offers are the build order:** "Lights on", then "Hall two". Once three halls are online, growth and protection offers alternate.
- Offers start once the tutorial has handed over. None during a CEO visit.
- **Starting values**, re-priced for pass 7's economy (question 3):

| Promise | Asks for | Advance | On delivery |
|---|---|---|---|
| Lights on | All six of Hall 1's rows earning, within 2:00 | $150 | $250 |
| Hall two | A second hall online, within 2:00 | $300 | $300 |
| More megawatts | Online racks a quarter above now, within 2:30 | 15 s of that load's income | The same again |
| Belt and braces | One hall with both B switchboards and its second coolant unit, within 3:00 | $350 | $400 |
| Spare capacity | A spare chiller, a spare glycol pump and a spare water pump, all running, within 3:00 | $300 | $300 |
| One of each | A tech of every trade on the crew, within 3:00 | $200 | $200 |
| Quiet floor | No dark half-hall and no service credits for 2:00 | none | $600 |

- Promise money counts in money earned and the score; an advance handed back comes off it.
- **Events:** `promiseOffered`, `promiseTaken`, `promiseKept`, `promiseMissed`, `promiseCancelled`.

### 6.2 Screen

- **The HUD's note** shows the nearest promise and its countdown ("Hall two · 1:12"); with an offer waiting and none held, "CEO: 2 offers".
- **Tap the note** and the promises card opens, holding the game: held promises with their countdowns and a Cancel button (saying the advance goes back), then the offers with Accept, the advance and the payment.
- **Introduction**, once, at the first offer: "The CEO makes promises to the board. Take one for cash now and more when you deliver."
- The ledger gains "Promises" in both columns; the results card a "Promises" line (kept, missed).

### 6.3 Checks

- A scripted builder who chases promises earns at least 15% more than one who ignores them.
- Pass 8's standing targets. Promises add cash, so runs may lengthen: **first lever**, the payments, then the credits' doubling.

### 6.4 Owner's checklist

- The first offers tell you what to do next.
- Taking a promise feels like a real decision about money.

### 6.5 Rules: surges (switch "Surges"; M50)

- **"The CEO sold a surge."** It appears among the offers, with nothing paid up front, from the third hall online.
- **Accept it** and for 60 s every rack earns half as much again, and the director's gaps are halved. Decline it and nothing happens. One at a time; not during a CEO visit.
- **Screen:** "Surge · 0:42" in the HUD's note, and the cash rate shows the extra.
- **Checks:** a builder who takes every surge earns more than one who takes none, without going broke more often.
- **Owner's checklist:** a surge is a gamble you can see paying off or not.

## 7. M51. The pick of two, and the rescue call (GDD v0.9 sections 6 and 9)

### 7.1 Rules: the pick of two (switch "Pick of two")

- **When a CEO visit ends with no sightings**, the CEO offers two perks drawn from the list (seeded), and the player takes one. The game waits.
- *Starting values*, with question 4's swap:

| Perk | Effect |
|---|---|
| Bulk order | The next six rack rows are half price |
| Signing bonus | The next hire is free; wages still apply |
| Fast contractor | Builds take 4 s for two minutes |
| Warranty | Nothing in one hall of the player's choice can fail for 90 s |
| Loyal customers | The uptime bonus is doubled for two minutes |
| Patient customers | No service credits for 90 s |

- A perk loosens a limit; none adds a mechanic. Warranty asks for the hall with a tap on the strip.

### 7.2 Rules: the rescue call (switch "Rescue call")

- **The CEO calls** the moment the cash first goes below $0 in a run. A card opens and the game waits.
- **The ways out the player still has:**
  - **A funding round,** once per run: $2,000 at once, and a second loan repaid at $8 a second until $2,000 is repaid (question 1).
  - **A promise's advance,** if an offer is on the table (M49).
  - **Sell the campus,** if the sale is allowed (pass 7).
- The 15 s countdown is unchanged and runs once the card closes. Later visits below $0 show no card (once per run).
- The funding round shows in the ledger as "Second loan".

### 7.3 Screen

- The pick of two: a card with the CEO's line ("Fine. Have a treat.") and two perks as buttons, each with one line on what it does. A perk in effect shows its countdown in the HUD's note.
- The rescue call: "The CEO is on the phone", the cash, the countdown that will start, and a button per way out, with Close.

### 7.4 Checks

- Perks: a clean-visit builder earns more than without the pick, and runs stay within the targets.
- The rescue call: fewer runs broke before 5:00 than without it, and the funding round is not always the right answer (a builder who always takes it is not the best scorer).

### 7.5 Owner's checklist

- A clean visit feels like a win.
- Going into the red feels like a decision, not a countdown.

## 8. M52. Layers, and standing orders (GDD v0.9 sections 10 and 7; questions 5 and 6)

### 8.1 Layers (screen only)

- **A Layers button** (44 px) at the strip's left end steps through: none, Power, Cooling, Crew.
- **Power:** every chain from the power line to the racks, live, not built or failed; halves with a backup marked; halves on a single RMU marked.
- **Cooling:** dry coolers, chillers and both kinds of pump, with running, needed and spare counts by each plant; halls on one coolant unit; dry CDUs and halls without water.
- **Crew:** each tech's post and route, open warnings, and how long the nearest free tech would take to reach each area.
- Everything outside the layer is dimmed. Layers use ink, pale and the shields' shapes; hat colours still mean trade only.
- Pure helpers in `src/ui/layers.js`, with tests.

### 8.2 Standing orders (only if the owner says yes to question 6)

Three switches on the Hire card, all off to begin with: keep an electrician free, backups first, stay near the post (GDD v0.9 section 7). Rules behind each switch, with scripted checks.

### 8.3 Owner's checklist

- With the Power layer on, you can see which halves would go dark next.

## 9. M53. The balance check, everything on

- Every pass 8 switch on, `scripts/pacing4.mjs` (12 and 24 seeds), with two new scripted players: one who uses every pass 8 tool (posts, priority, promises, surges, perks, the rescue call) and one who uses none.
- **Targets:** pass 8's standing targets (section 0), and the player who uses every tool earns at least a quarter more than the one who uses none (GDD v0.9 risk: "the game plays itself").
- Levers, in order: promise payments, the credits' doubling, the strike gap, the uptime bonus. Report every change.
- Record the table in `docs/PROGRESS.md`.

## 10. Later

- The blueprint look for the results, Hire, Commissioned and sale cards.
- GDD v0.9's "After pass 5": sound, a Settings card with reduce flashing and text size, the Home Screen icon, the comedy; scenarios, device upgrades, site events, decommissioning, Overclock, a choice of pace, a head start after a sale.
- By the owner's decision: support rooms, generators, Operate mode, more campuses.
- A full rewrite of the GDD folding in passes 5 to 8, once the owner has played them.
