# Veil of Dawn

An original single-player JRPG for desktop (Windows, via Electron): turn-based battles, exploration over painted
pixel-art environments, cinematic portrait dialogue, and a five-chapter campaign about Kai, a
nineteen-year-old with a sealed mark, and the vampire king Veyr.

This repository currently holds **Milestone 1 — the vertical slice** (Chapter 1 opening in
Emberfall, from the festival eve to the dawn departure). The full campaign brief and roadmap are in
[`docs/`](docs/).

## Run it

The player-facing product is the desktop app. Phaser/Vite is only the engine underneath.

```bash
npm install
npm run desktop        # build and open the desktop app (Electron)
npm run dist:win       # Windows installer + portable .exe in release/ (on Linux needs wine)
npm run dev            # engine-only dev server for fast iteration (not shipped)
```

Fully offline: no backend, accounts or network calls. On desktop, saves and settings are JSON
files in the user data folder (`%APPDATA%\Veil of Dawn\saves` on Windows; Settings → Open saves
folder). F11 or Alt+Enter toggles fullscreen.

### Controls

| Action | Keys |
| --- | --- |
| Move | Arrow keys / WASD (hold Shift to run), or click a spot |
| Confirm / talk / interact | Z, Enter, Space, or click |
| Cancel / back | X, Backspace |
| Menu (party, items, journal, save, load, settings) | Esc, M |

### Developer switches

Pass them as a query string: `VOD_QUERY='?debug' npm run desktop` (or append to the dev URL).

- `?gallery` – asset gallery (all walking atlases and battle sheets with their animations).
- `?debug` – draws walkable areas, blockers and occluders over the exploration map.
- `?test&battle=<encounterId>` – jump straight into an encounter (e.g. `ch1_garran`).

## Project layout

```
src/
  main.js               Phaser game config and scene list
  config.js             resolution, zoom, palette, fonts
  scenes/               Boot, Title, World (exploration), UI (HUD + dialogue), Menu, Battle, Gallery
  systems/              state, saves, settings, input, lighting, actors, cutscene script API
  data/                 characters, skills, items, enemies, encounters, battle scripts
  data/maps/            authored map data (walkable areas, occluders, lights, spawns)
  data/chapters/        chapter content: interactables, triggers, NPCs, enemies, scene scripts
  gfx/                  manifest-driven asset loading, generated effect textures
  audio/                procedural WebAudio score and sound effects
  ui/                   panels, menus, dialogue box
public/assets/vod/      art package (manifest.json is authoritative)
docs/                   campaign brief, roadmap, encounter/roster design data
tools/                  headless playthrough and screenshot drivers
```

All narrative, quests, dialogue, enemies, skills, items and maps are data with stable identifiers.

## Testing

`tools/playthrough.mjs` plays the whole vertical slice inside the Electron app through the real game
(keyboard input for exploration and dialogue; battle commands are issued through the same
`commit()` path the menus use). It checks every main beat, a manual save, autosaves and Continue.

```bash
npm run build
xvfb-run -a node tools/playthrough.mjs     # without a display; plain `node` on a desktop
```

## HDRI sky

`assets-src/hdri/citrus_orchard_puresky_2k.exr` is baked by `python3 tools/bake_hdri.py`
(needs `pip install openexr numpy pillow`) into `public/assets/sky/`: the sunrise panorama, the
dawn haze over Emberfall's mountains, and the image-based dawn light colours.

## Art

See [ASSETS.md](ASSETS.md) for every asset, its source and which items are temporary.
