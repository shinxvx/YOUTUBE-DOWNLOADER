# Veil of Dawn

An original single-player JRPG for desktop browsers: turn-based battles, exploration over painted
pixel-art environments, cinematic portrait dialogue, and a five-chapter campaign about Kai, a
nineteen-year-old with a sealed mark, and the vampire king Veyr.

This repository currently holds **Milestone 1 — the vertical slice** (Chapter 1 opening in
Emberfall, from the festival eve to the dawn departure). The full campaign brief and roadmap are in
[`docs/`](docs/).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
# or a production build:
npm run build && npm run preview   # http://localhost:4173
```

The game is fully offline: no backend, accounts or network calls. Saves live in the browser's
`localStorage`.

### Controls

| Action | Keys |
| --- | --- |
| Move | Arrow keys / WASD (hold Shift to run), or click a spot |
| Confirm / talk / interact | Z, Enter, Space, or click |
| Cancel / back | X, Backspace |
| Menu (party, items, journal, save, load, settings) | Esc, M |

### Developer URLs

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

`tools/playthrough.mjs` plays the whole vertical slice in headless Chromium through the real game
(keyboard input for exploration and dialogue; battle commands are issued through the same
`commit()` path the menus use). It checks every main beat, a manual save, autosaves and Continue.

```bash
npm run build && npx vite preview --port 4173 &
node tools/playthrough.mjs
```

## Art

See [ASSETS.md](ASSETS.md) for every asset, its source and which items are temporary.
