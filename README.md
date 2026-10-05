# Vampire Hunters (ヴァンパイアハンターズ)

An original single-player JRPG for desktop (Windows, via Electron) in a Japanese dark-anime style:
top-down exploration over tile maps, turn-based battles with Clash duels and technique cut-ins,
cinematic portrait dialogue, and a five-chapter campaign about Kai, a nineteen-year-old with a
sealed mark, and the vampire king Veyr.

This repository currently holds **Milestone 1 — the vertical slice** (Chapter 1 in Emberfall, from
the festival eve to the dawn departure). The campaign brief and roadmap are in [`docs/`](docs/).

## Run it

The player-facing product is the desktop app. Phaser/Vite is only the engine underneath.

```bash
npm install
npm run desktop        # build and open the desktop app (Electron)
npm run dist:win       # Windows installer + portable .exe in release/ (on Linux needs wine)
npm run dev            # engine-only dev server for fast iteration (not shipped)
```

Fully offline. Saves and settings are JSON files in the user data folder
(`%APPDATA%\Vampire Hunters\saves` on Windows; Settings → Open saves folder).

### Display

Settings → **Resolution**: Match screen, 1280×720, 1600×900, 1920×1080, 2560×1440, 3840×2160. The
canvas really renders at that size (sharp text and art); layouts are authored at 1280×720 and scaled.
Settings → **Display** or F11 / Alt+Enter toggles fullscreen.

### Controls

| Action | Keys |
| --- | --- |
| Move | Arrow keys / WASD (hold Shift to run), or click a spot |
| Confirm / talk / interact | Z, Enter, Space, or click |
| Cancel / back | X, Backspace |
| Menu (party, items, journal, save, load, settings) | Esc, M |
| Clash answers | ← → and Z, or 1 / 2 / 3, or click |

### Developer switches

`VH_QUERY='?debug' npm run desktop` (or append to the dev URL):
`?gallery` (asset gallery), `?debug` (collision overlay), `?test&battle=<encounterId>` (jump into a fight).

## How it plays

- **Exploration:** top-down maps built from the pack's tiles plus generated Japanese props (houses,
  torii, stone and paper lanterns, pines, maples, red bridge, festival stalls). Lanterns are real light
  sources; the village changes from dusk to festival, to the night the lanterns die, to dawn.
- **Battles:** speed-based turn order shown at the top; Resolve/Stagger; vampire regeneration fed by
  blood anchors; Kai's Veil Strain. Techniques play a cut-in. When an enemy commits to a telegraphed
  attack the target gets a **Clash**: Evade straight lunges, Parry pounces, Counter wide sweeps — a
  perfect read cancels the hit and cracks the attacker's Resolve. The stage changes with the fight:
  lanterns, the violet inside of the seal, white flame, a blood-red moon.

## Project layout

```
electron/               desktop shell (window, app:// protocol, file saves)
src/scenes/             Boot, Title, World (exploration), UI (HUD + dialogue), Menu, Battle, Gallery
src/battle/             battle stage (backdrop + perspective floor + moods), cut-ins, Clash
src/systems/            state, saves, settings, display/resolution, input, lighting, map builder, actors
src/data/               characters, skills, items, enemies, encounters, battle scripts
src/data/maps/          top-down map definitions (ground kinds + props, in tiles)
src/data/chapters/      chapter content: interactables, triggers, NPCs, enemies, scene scripts
src/gfx/                asset loading, generated props and effect textures
public/assets/vh/       art pack (manifest.json authoritative) + gen/ runtime sheets
tools/                  sprite preparation, HDRI bake, headless playthrough
```

## Tools

- `python3 tools/prepare_sprites.py` — builds `public/assets/vh/gen/` from the pack: re-aligned walking
  sheets (no jitter) and re-cut battle sheets (no clipped poses). Needs pillow, numpy, scipy.
- `python3 tools/bake_hdri.py` — bakes the HDRI into the sunrise panorama and dawn light colours.
- `xvfb-run -a node tools/playthrough.mjs` — plays the whole slice inside the Electron app.
