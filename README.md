# EIDRA: NEXUS ACADEMY

A creature-collecting card RPG for Windows desktop (Electron). Pick destinations
on Aster Island, meet people shown through portraits, talk, duel with Nexus
Cards, and follow a story across the academy's days. Single-player, fully
offline. In-game coins only: there are no real-money purchases.

**State: v0.1, first playable.** The full rules engine and AI, the 80-card
catalog, three partners, Act 1 (intro to conclusion), deck editor, collection
and encyclopedia, shop, journal, tactical challenges, practice duels and saves
all work. Acts 2–6 and the post-game are planned (see `docs/ROADMAP.md`). Art
and music are provisional (see `ASSETS.md`).

## Commands

| What | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Run the desktop app (dev) | `npm start` |
| Run in a browser (dev only) | `npm run dev` |
| Rules / AI / puzzle tests | `npm test` |
| Automated playthrough of Act 1 (headless Chromium) | `npm run playtest` |
| Check the real Electron app (saves, preload) | `npm run check:electron` (Linux: `xvfb-run -a …`) |
| Windows x64 app folder | `npm run package:win` → `out/EidraNexusAcademy-win32-x64/` |
| Windows installer (Squirrel) | `npm run make:win` → `out/make/squirrel.windows/x64/EidraNexusAcademy-Setup.exe` |
| Windows installer + portable (NSIS, needs Wine on Linux) | `npm run installer:win` → `release/` |
| Windows portable zip | `npm run make:win-zip` → `out/make/zip/win32/x64/` |
| Regenerate provisional art | `npm run art` (Python 3 + Pillow) |

The Squirrel installer must be built on Windows, or on Linux/macOS with Wine
and Mono installed. The app folder and the zip build anywhere.

The game opens through its own executable (`EidraNexusAcademy.exe`). The player
does not need Node.js, a browser, a terminal or a dev server. The `.exe` ships
with its support files (DLLs, `.pak`, `resources/app.asar`), which is normal
for Electron and fine for Steam.

## Download (v0.1)

- Installer: https://updates.brgirlslive.com/eidra/EidraNexusAcademy-Setup.exe
- Portable: https://updates.brgirlslive.com/eidra/EidraNexusAcademy-Portable.exe

## Desktop features

- Window or fullscreen (Alt+Enter or F11). The window keeps the 3:2 ratio when resized. Pixel art is scaled by
  whole numbers so it stays sharp; text is drawn at full resolution.
- Internal resolution 480×320. Settings: master, music and SFX volume, animation speed, text speed,
  window size.
- Pauses when the window loses focus (music and the AI's turn stop).
- Keyboard and mouse: arrows/Tab move the focus, Enter confirms, Esc goes back, E ends the turn, L shows the duel log,
  right-click zooms a card.

## Saves

- JSON files in the user data folder, outside the install folder:
  `%APPDATA%/Eidra Nexus Academy/saves/` on Windows. They survive updates and uninstalls.
- Autosave (after each period, duel and important event) plus 3 manual slots (Dormitory → Save game).
- Atomic write (temp file → fsync → rename). The last valid save is kept as `*.json.bak` and is
  used automatically if the main file is damaged.
- Every save carries `version` (`SAVE_VERSION` in `src/game/state.js`), and migrations
  run on load (`migrate()`).
- `localStorage` is only used by the browser dev mode, never by the desktop build.

## Structure

```
electron/          main process (window, saves, fullscreen) + preload bridge
src/engine/        duel rules (pure, deterministic, testable)  ← duel.js, deck.js, rng.js
src/ai/            duel AI (same rules; reads only public info + its own hand)
src/content/       data: cards, decks, story events, characters/locations, lore, puzzles
src/game/          campaign state, events, script runner
src/scenes/        screens: title, map, location, dialogue, duel, deck editor, collection, shop…
src/ui/            canvas renderer, input, card drawing, audio synth, assets
src/save/          save/settings storage (desktop files, browser fallback)
src/platform/      Steamworks integration points (not connected)
tools/             art generator, headless playtest, Electron check
test/              rules tests, puzzle solver, AI-vs-AI fuzzing
```

See `docs/DESIGN.md` for the rules, the data model and the decisions behind them, and
`docs/STEAM.md` for the future Steam integration.
