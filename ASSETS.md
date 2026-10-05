# Asset manifest

`public/assets/vh/manifest.json` (from the *Vampire Hunters Anime Pack*) is the authoritative list
of the user-supplied art. This file records how each family is used and what is temporary.

## Art pack (final, user-supplied)

| Family | Path | Use |
| --- | --- | --- |
| 28 walking atlases | `originals/*_overworld_master.png` + `sprites/*_overworld.atlas.json` | Source for exploration sprites. `tools/prepare_sprites.py` rebuilds every atlas frame in its source frame, re-aligns feet and head (removes jitter) and writes uniform 192 px cells to `gen/`. Drawn at the logical 48×48 footprint. |
| 28 battle sheets | `sprites/*_battle_128x128.png`, `sprites/*_enemy_*.png` | Source for combat. The prepared sheets let poses and sword arcs spill into neighbouring cells; the tool reassigns every detached piece to its own frame and rebuilds wider cells in `gen/` (no clipped attacks). |
| 38 profiles | `portraits/` | Dialogue, cut-ins, Clash, turn order, journal. |
| 3 backdrops | `environments/` | Battle stage backgrounds and title screen (not used as maps). |
| 36 tiles | `tiles/` | Ground of the top-down maps (a border-free 2x copy is built at runtime), roof/wall textures of generated buildings, battle floors. |
| Logo | `logos/vampire_hunters_logo_transparent.png` | Title screen and app icon. |

Not copied: `animation_previews/`, `frames/`, `preview.html` (review material in the original pack).

## HDRI (user-supplied)

| Asset | Path | Use |
| --- | --- | --- |
| `citrus_orchard_puresky_2k.exr` (Poly Haven, CC0) | `assets-src/hdri/` | Source, baked by `tools/bake_hdri.py`. |
| Sunrise panorama | `public/assets/sky/dawn_panorama.png` | Sunrise cinematic; dawn battle sky. |
| Dawn light values | `public/assets/sky/dawn_light.json` | Dawn lighting colours. |

## Generated in code (original)

| Asset | Where | Status |
| --- | --- | --- |
| Map props: houses (from roof/wall tiles), torii, stone and paper lanterns, pines, maples, bushes, bridge, stalls, yagura, stairs, well, fences, barrels | `src/gfx/props.js` | Original procedural pixel art. Can be replaced by drawn tilesets later. |
| Battle floor (perspective) | `src/battle/stage.js` | Built from the pack tiles. |
| Light, glow, fog, slash, ring, vignette | `src/gfx/textures.js` | Final effect textures. |
| Kai's seal-stage portrait overlays, blood-anchor lantern | `src/gfx/textures.js` | **Temporary**. |
| Music and sound effects | `src/audio/audio.js` | **Temporary** procedural score. |

## Known art gaps

- Villagers, Hana, Nell and Corin have portraits but no walking sprites; they speak through doors,
  stalls and off-screen voices.
- Extra portrait expressions, later Veyr forms, and dedicated tiles for interiors are still missing.
- A few battle "defeat" frames in the source sheets contain pieces of the neighbouring pose that the
  re-cut cannot separate cleanly; they play once and are brief.
