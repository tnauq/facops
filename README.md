# FacOps

A frantic dispatch game set in a data center. Alarms pile up, your crew is small, and you decide who goes where. This repository holds pass 1, a small web prototype.

Play it: https://tnauq.github.io/facops/ (best in landscape on a phone; add `#demo` to the address to see what faults look like)

## Status

Milestone 0: the rules engine, its tests, the art and a page that shows the map. The game loop and controls arrive with milestones 1 to 7. See `docs/PROGRESS.md`.

## Run it on a computer

```
python3 -m http.server 8000
```

Then open http://localhost:8000. There is nothing to install and nothing to build.

## Run the tests

```
node --test
```

Needs Node 22 or newer.

## Where things are

| Path | What it is |
|---|---|
| `docs/pass1-spec.md` | The build spec. The source of truth. |
| `docs/PROGRESS.md` | Which milestone is done and what to try on the phone |
| `CLAUDE.md` | Working rules for the coding agent |
| `src/core/` | The rules engine: map, alarms, load, Stability meter, alarm director, dispatch |
| `src/render/` | Drawing code for the crew, the equipment and the campus |
| `src/main.js` | The page. Milestone 1 turns it into the game. |
| `tests/` | Tests for the rules and smoke tests for the drawing code |
