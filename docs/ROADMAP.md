# Roadmap

Campaign canon: [`Vampire_Hunters_Claude_Prompt.md`](Vampire_Hunters_Claude_Prompt.md) and
[`LEIA_PRIMEIRO_CLAUDE.md`](LEIA_PRIMEIRO_CLAUDE.md) (latest art and guest rules). This file tracks
what exists and what is next. Nothing below counts as done until it has been exercised in play.

## Architecture

- Desktop app: Electron 38 shell (`electron/`), game served from `dist/` over a private
  `app://` protocol with a strict CSP; saves/settings as JSON files in the user data folder;
  fullscreen (F11 / Alt+Enter / Settings); Windows NSIS installer + portable exe.
- Engine: Phaser 3.90 + Vite, ES modules, no backend. 1280×720 canvas, FIT scaling.
- Display: selectable render resolution (Match screen … 3840×2160); layouts at 1280×720 scaled.
- Exploration: top-down tile maps (pack tiles + generated props), grid collision, y-sorted props and
  characters, light map (lanterns are light sources), fog and particles.
- Battles: CTB initiative, Resolve/Stagger, regeneration with blood anchors, Veil Strain, Clash duels
  on telegraphed attacks (Evade/Parry/Counter), technique cut-ins, stage with painted backdrop +
  perspective floor whose mood changes during the fight, separate stage/HUD cameras.
- Content as data: chapters (`src/data/chapters`), maps, encounters, enemies, skills, items.
- Saves: 3 manual slots + 2 rotating autosaves, versioned (JSON files on desktop).

## Milestone 1 — Vertical slice ✅ (implemented and played end to end)

- Title, new game, continue, load, settings (text speed, battle speed, music/SFX volume, reduced
  shake, reduced flashing, story/standard difficulty, short animations), art gallery.
- Emberfall at dusk → festival → lanterns die → night → dawn, with lighting presets per phase.
- Kai/Mira opening, Hana, Nell & Corin, lantern repair errands, festival scene, mark pulse.
- Ceremonial blade + tutorial battle; Blood Hound (Bleed), Thrall + Hound (priority), Gloom
  Stalker (telegraph + guard counterplay) encounters placed in the world.
- Garran boss: anchors, regeneration, scripted awakening cinematic (Seal Stage → Awakening), Veil
  Arts unlock, Elara joins as guest, voice line, dawn aftermath, Hana's keepsake, Lyra cameo,
  departure choice, end card.
- Pause menu with party, items, journal profiles, save/load, settings.
- Automated playthrough (`tools/playthrough.mjs`) covering the full slice.

## Milestone 2 — Core systems and Firstlight Bastion (next)

- Firstlight Bastion hub map (authored; needs map art or tile layout), Ivo reforges **Dawnbreak**
  (Dawnstone attacks reduce regeneration), Rowan and Daigo introductions, Lyra joins.
- Three active / four total party with safe-point swapping; leveling pacing to ~20 by the finale.
- Skill upgrades (compact branches), equipment slots, inventory sorting, limited respec at hub.
- Aurora Bonds shared meter (team attack / rescue).
- Quest log with chapter objectives and lore entries; profiles unlock without spoilers.
- Key remapping UI.
- Auto-update for the desktop build (same pattern as the other desktop apps), if wanted.
- Remaining Chapter 1 encounters (6 standard in the plan).

## Milestone 3 — Campaign middle

Brassveil (clinic, rooftops, foundry), Cassian, Eren, Mira rescue, Maelis; Hushspire route,
monastery, archive puzzle, Ayla, Grave Weaver, Sevrin's theater, Soren's death, the recording.

## Milestone 4 — Final act

Nyra's escort and refugee camp, Nox, Rowan's nonlethal duel, Orin and the storm beacon, preparation
hub, Noctis Crown dungeon, Engine's Custodian, Selene (optional), Valka, three-phase Veyr, epilogue.

## Milestone 5 — Quality and pacing

Replace temporary art and audio, balance, measure real campaign length, save compatibility across
chapters, accessibility pass, crash/deadlock sweep.
