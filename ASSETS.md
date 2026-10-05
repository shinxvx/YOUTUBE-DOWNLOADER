# Asset manifest

`public/assets/vod/manifest.json` (from the *Veil of Dawn Claude Expanded* package) is the
authoritative list of character art. This file records how each asset family is used and which
pieces are temporary.

## From the art package (final, user-supplied)

| Family | Path | Use |
| --- | --- | --- |
| 28 original walking atlases | `originals/*_overworld_master.png` + `sprites/*_overworld.atlas.json` | Exploration. Loaded through the atlas crop rectangles (never a guessed grid). At runtime a high-quality downscaled copy is built in memory so one texel equals one screen pixel at the 2× world zoom; the logical footprint stays 48×48. Source files are untouched. |
| 12 hero/ally battle sheets | `sprites/*_battle_128x128.png` | Combat (128×128 cells; idle, attack, skill, hurt, knockout). |
| 16 enemy battle sheets | `sprites/*_enemy_*.png` | Combat (96×96 or 128×128 cells; idle, attack, hurt, defeat). |
| 38 profiles | `portraits/*_profile_256.png` | Dialogue portraits, turn-order chips, journal. |
| 3 backdrops | `environments/*_night_backdrop.png` | Emberfall is used as the explorable map (collisions, occluders and lights authored in `src/data/maps/emberfall.js`) and as battle backgrounds. Brassveil and Noctis Crown are reserved for later chapters. |
| 36 tiles + atlas | `tiles/` | Loaded; reserved for authored tile maps in later milestones. |
| 2 logos | `logos/` | Title screen (Veil of Dawn). |

Not copied into the game: `animation_previews/` (review GIFs) and `frames/` (individual battle
frames). They remain in the original package.

## Generated in code (original)

| Asset | Where | Status |
| --- | --- | --- |
| Light falloff, glow, sparks, motes, fog, slash arc, ring, vignette, dawn wash | `src/gfx/textures.js` | Final effect textures. |
| Kai's seal-stage overlays for portraits | `src/gfx/textures.js` (`mark_overlay_1..3`) | **Temporary** — vector veins over the painted portrait until stage-specific portrait art exists. |
| Blood-anchor lantern | `src/gfx/textures.js` (`anchor_lantern`) | **Temporary** pixel art. |
| Music and sound effects | `src/audio/audio.js` | **Temporary** procedural score (region moods, Kai's leitmotif). To be replaced or extended by a composed score. |

## Known art gaps

- Villagers, Hana, Nell and Corin have portraits but no walking sprites, so they speak through
  doors, stalls and off-screen voices in Emberfall.
- Additional portrait expressions, later Veyr forms, and maps for Firstlight Bastion, Brassveil
  interiors, Hushspire and Noctis Crown interiors still need art.
- HDRI sky panorama: requested by the user; will be integrated when the `.exr` file is supplied.
