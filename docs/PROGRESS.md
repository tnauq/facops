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
| M7. Feel | `m7` | Next |

## Owner setup, once

1. Create a public repository named `facops` under `tnauq`. Tick "Add a README" so the repository is not empty.
2. Have the coding agent put these files in it on the `main` branch, replacing that README, and tag the commit `m0-seed`.
3. On GitHub: Settings, Pages, "Deploy from a branch", branch `main`, folder `/ (root)`, Save.
4. After a minute, open https://tnauq.github.io/facops/ on the phone, in landscape.

## Log

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
