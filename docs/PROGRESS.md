# Progress

The newest entry is at the top of the log. One milestone per session; see `docs/pass1-spec.md`, section 12.

| Milestone | Tag | Status |
|---|---|---|
| M0. Repo seed: rules engine, tests, art, map page | `m0-seed` | Done |
| M1. Live map | `m1` | Done |
| M2. Two-tap dispatch on the map | `m2` | Next |
| M3. HUD and round over | `m3` | To do |
| M4. Crew bar and alarm rail | `m4` | To do |
| M5. One-tap switch and tuning drawer | `m5` | To do |
| M6. Results, pause and phone polish | `m6` | To do |
| M7. Feel | `m7` | To do |

## Owner setup, once

1. Create a public repository named `facops` under `tnauq`. Tick "Add a README" so the repository is not empty.
2. Have the coding agent put these files in it on the `main` branch, replacing that README, and tag the commit `m0-seed`.
3. On GitHub: Settings, Pages, "Deploy from a branch", branch `main`, folder `/ (root)`, Save.
4. After a minute, open https://tnauq.github.io/facops/ on the phone, in landscape.

## Log

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
