# VAMPIRE HUNTERS — current Japanese anime art contract

This section overrides earlier visual instructions throughout the document. Preserve the five-chapter original story and character identities; change the presentation to Japanese dark anime. The title is Vampire Hunters (plural). The Japanese logo text is ヴァンパイアハンターズ, a katakana rendering of the English title.

Walking and combat were generated as separate sheets per character to give faces and sword blades more space. Do not use mixed walking/combat draft boards. Use originals/*_overworld_master.png with the exact matching atlas JSON and displayScale: the game footprint is logically 48×48 while the selected artwork stays at native source resolution. Combat uses prepared sheets in sprites/, with numeric frame indices. The preview must use these same assets.

Haori, hakama, obi, tabi footwear and Japanese hunter uniforms replace European medieval clothing. Katanas, wakizashi, nodachi and tanto replace European swords. Dawnstone and Alvor remain original fictional weapon terminology. Asterra remains a fictional world rather than historical Japan. Creature enemies retain their own anatomy. Weapons remain one continuous blade with a smooth shallow curve, or a straight polearm shaft. The compact title logo keeps the approved katana, with close English title lines and a nearby Japanese subtitle.

The authoritative individual designs are docs/japanese_character_designs.json. They control hair, eyes, costume, weapon silhouette and color. These designs take priority over incidental older appearance wording below. Kai remains pale, white-haired, violet-eyed, with the seal on his left shoulder spreading across the chest. The five Dawncrowned retain their names, titles, powers and story roles. There are 12 hero/allied sprite characters and 16 enemies, plus profiles for 10 story NPCs: 38 profiles total.

This edition replaces every earlier visual asset: walking, combat, profiles, three scenery backgrounds, 36 starter tiles and the title logo. Do not mix old European clothing or old branding into it. Backgrounds are flattened paintings, not authored playable maps. The five-hour duration remains a pacing target requiring implementation and playtesting.

# VAMPIRE HUNTERS — READ FIRST: EXPANDED THREE-PART PACKAGE

This document is addressed to Claude. Read it before integrating any images. All three ZIPs are mandatory; PARTS.json lists exact file ownership if balancing places complementary files in another part. The user explicitly selected **original artwork for exploration/walking** and **prepared preview sprites for combat**. This selection overrides older art-loading instructions.

## 1. Your task and document precedence

Build the original English-language turn-based JRPG **VAMPIRE HUNTERS**, Japanese subtitle **ヴァンパイアハンターズ**. Preserve Kai, the four core companions, the five Dawncrowned, the established supernatural rules, the five-chapter story and the vampire king Veyr as the final boss.

Read in this order:

1. This document: latest asset choices, expanded cast, pacing and integration rules.
2. `manifest.json`: authoritative filenames, frame rectangles, logical dimensions, indices and timing.
3. `docs/Vampire_Hunters_Claude_Prompt.md`: complete original story and implementation brief. Its beginning, middle, ending and character arcs remain canon.
4. `docs/expanded_roster.json` and `docs/campaign_encounters.json`: proposed encounter and guest data; tune through playtesting.
5. `README_FOR_CLAUDE.md`: loading reference.

This package contains artwork and implementation instructions, not an already playable five-hour game. Do not report campaign completion until all chapters are implemented and tested.

## 2. The three ZIPs and extraction order

| Archive | Contents | Role |
| --- | --- | --- |
| `Vampire_Hunters_Part_1_Heroes_Allies.zip` | 12 hero/ally exploration originals and their atlas JSONs; 12 prepared hero battle sheets; battle frames; their GIF previews | Kai, party, five Dawncrowned and three new guests |
| `Vampire_Hunters_Part_2_Enemies.zip` | 15 enemy exploration originals; 16 enemy atlas JSONs; 16 prepared enemy battle sheets | Mobs and named vampires; complementary exploration source in part 3 |
| `Vampire_Hunters_Part_3_World_Profiles_Docs.zip` | All 38 profiles; one complementary enemy exploration original; three backdrops, 36 tiles and tile atlas, compact anime logo, enemy GIF previews and individual battle frames, offline viewer, story and instructions | World, dialogue/bestiary portraits, complementary enemy source/previews and project reference |

These are three independent normal ZIP archives, not split binary volumes. Extract ALL THREE into the same parent directory. They share the root folder `Vampire_Hunters_Anime_Pack`; merge this folder rather than creating three nested copies. Identical shared metadata may overwrite itself safely. After merging, open `Vampire_Hunters_Anime_Pack/preview.html` locally.

Do not assume an attachment has been extracted or inspected. If your Claude environment cannot open a ZIP, tell the user which archive is blocked and request the extracted files you need. Do not fabricate analysis of unavailable assets.

## 3. Critical art selection: original walking, preview combat

### Exploration and walking

Use the actual high-resolution original PNGs in `originals/*_overworld_master.png`. Their compact DS/chibi character designs are canonical. There are **28 exploration characters**: 12 heroes/allies and 16 enemies.

The originals are irregularly spaced source atlases. **Do not cut them into a guessed 48-pixel grid.** For each image, load the corresponding `sprites/*_overworld.atlas.json`. It identifies the exact crop rectangles and transparent trim offsets for all twelve animation frames, retaining original image pixels rather than reducing the artwork to 48-pixel bitmaps.

The exploration entity still has a **logical 48×48 footprint** for display and map movement. The source texture is higher resolution. `frameWidth` and `frameHeight` describe the reconstructed source-resolution frame; `logicalFrameWidth` and `logicalFrameHeight` are 48. Apply `displayScale = 48 / frameWidth` to the trimmed atlas sprite. This keeps original detailed art available for zooming and avoids destructive downsampling. Collision bodies must follow map rules and logical dimensions, not the width of the entire texture.

Nyra’s erroneous opposite-facing left-walk pose is omitted in the atlas mapping; the valid left-facing step is reused so she keeps the correct direction. Frame names inside the atlas are strings `"0"` through `"11"`. Order is down, left, right, up; each direction has idle, step A, step B. Walking sequence: `[stepA, idle, stepB, idle]`, 8 fps. Use stable keys such as `kai_overworld:walk_down`. Direction mappings and frame selection come from the current atlas metadata.

### Combat

Use the prepared PNGs in `sprites/`: these are the battle sprites shown in the preview. **Do not replace them with high-resolution battle masters.** There are 12 hero/ally battle sheets and 16 enemy battle sheets.

| Kind | Cell size | Grid | Animation rows |
| --- | --- | --- | --- |
| Hero/ally battle | 128×128 | 4×4 | idle, attack, skill, hurt/knockout |
| Four original common enemies | 96×96 | 4×3 | idle, attack, hurt/defeat |
| Named vampires and six new enemies | 128×128 | 4×3 | idle, attack, hurt/defeat |

Hero frame sequences: idle `[0,1,2,3]`; attack `[4,5,6,7]`; skill `[8,9,10,11]`; hurt `[12,13]`; knockout `[14,15]`. Enemy sequences: idle `[0,1,2,3]`; attack `[4,5,6,7]`; hurt `[8,9]`; defeat `[10,11]`. Exact fps and repeats come from the manifest.

`repeat: -1` means continuous loop; `repeat: 0` means play once. Recover to idle after attack/skill/hurt. Hold the last knockout/defeat frame until revival or removal. Apply damage once through combat logic at the intended impact event. GIFs are review copies and do not drive game logic.

## 4. Six new enemy identities

The original ten enemies remain: Ash Thrall, Blood Hound, Memory Moth, Court Sentry, Garran, Maelis, Sevrin, Orin Ren, Valka and Veyr. The following six bring the total to sixteen visually distinct enemy identities. Every new identity has exploration, battle and profile art.

| ID / Name | First use | Tactical identity | Readable counter |
| --- | --- | --- | --- |
| `gloom_stalker` / Gloom Stalker | Chapter 1, sheltered forest route | Fast panther-like ambusher; telegraphed Pounce targets an exposed ally | Guard the marked ally; initiative control cancels its advantage |
| `crypt_lancer` / Crypt Lancer | Chapter 2, foundry vaults | Armored skeletal thrall carrying a straight yari; guards an ally before a committed thrust | Break Resolve with Shock and flank pressure; attack during recovery |
| `scarlet_acolyte` / Scarlet Acolyte | Chapter 2, abandoned clinic | Vampire support unit; heals a damaged partner, otherwise channels a curse | Interrupt the visible channel or defeat the support first |
| `grave_weaver` / Grave Weaver | Chapter 3, archive tunnels | Spider creature; roots one hero and places a web trap on the initiative queue | Burn a web anchor, cleanse Root, then exploit its exposed abdomen |
| `raven_knight` / Raven Knight | Chapter 4, outer fortress assault | Elite Court knight; announces a counter stance, then a sweeping nodachi attack | Guard or use support during the stance; stagger its recovery |
| `selene_dusk` / Selene Dusk | Chapter 5, optional observatory wing | Named vampire miniboss; katana feints and alternating moon seals | Track the displayed seal and attack its open window; avoid brute-force regeneration races |

The skeletal lancer is a reanimated thrall bound by a stolen blood anchor, not a new immortal species. The beasts are Court-created nocturnal creatures. Keep the established vampire memory/blood rules. Selene serves the Court but is not an eighth final-boss phase or a replacement for Valka.

Each new mechanic should be taught in a small encounter before being mixed with others. No instant unavoidable party wipe or hidden elemental immunity. Bosses resist permanent control loops; they still allow tactical openings.

## 5. Three new allies and their story placement

The core roster remains Kai, Lyra Fen, Eren Sol and Mira Thorn. The original combat brief has **three active party members**, selected from that roster. New allies are authored temporary guests with bounded support commands; do not silently turn the game into an unlimited seven-member party.

### Cassian Reed — THE LAST SHIELD

Warden defender from Brassveil, warm brown skin, short curled black hair, moss-green haori over a black hunter uniform, small wooden-and-bronze buckler and short Alvor wakizashi. He is careful, personable and frustrated that evacuation work earns less glory than sword duels.

Meet him securing a clinic doorway in chapter two. Kai helps retrieve trapped civilians; Cassian then assists the foundry escape. His **Cadence of the Steadfast Gate** protects a marked ally and reduces incoming damage for one bounded window. Support command **Hold the Line** costs an existing party action and has a cooldown; it is not a free infinite shield.

In chapter four he accompanies Nyra's refugee evacuation, helping reveal that Kai protects people voluntarily. His concluding scene shows him training a civilian defense corps, giving protection the same respect as killing vampires. Do not give him Rowan's seat or rewrite Rowan's confession.

### Ayla Moon — THE BELL OF RETURN

Physician trained at Hushspire, light warm skin, navy hair pinned up, off-white/lilac travel robes and a bell-tipped staff. Warm but firm, she admits that a ritual cannot recover memories that were genuinely destroyed.

Meet her treating refugees before the chapter-three archive descent. An optional herb-and-bell quest restores a damaged shrine relay; it does not resurrect anybody. Her **Cadence of the Gentle Chime** cleanses one status and provides limited recovery. Support command **Clear Chime** removes a web/curse effect; it has a Focus cost and cooldown.

After Soren's death, Ayla helps Eren organize a memorial rather than promising to bring Soren back. In the finale she stabilizes evacuees outside the engine chamber. Her epilogue establishes a public clinic with survivor records. Keep Mira's medical identity and Eren's counter-ritual essential.

### Nox Varen — THE OATH WITHOUT A DAWN

Defected vampire scout, pale skin, silver-gray tied-back hair, amber eyes, wine-brown scarf and paired straight tanto. He knows Court routes but has no authority over the royal engine and initially knows nothing about Kai's seal.

Meet him in a sheltered chapter-four outpost while he protects captives from a Raven Knight. Lyra distrusts him; the player judges his actions in a short rescue sequence. His vampirism still carries hunger, guilt and daylight vulnerability. He rejects predation and depends on voluntary, bounded support from the refuge; do not present this as a universal cure or erase the world's memory-consumption problem.

His **Night Domain: Borrowed Silence** briefly masks a chosen person's blood signature. Support command **Anchor Cut** exposes an enemy anchor for one turn, enabling regeneration disruption through a follow-up Dawnstone attack. He does not replace Kai's Seal Rend or Eren's seal inversion.

He opens an optional route to Selene, then guides evacuation through shaded tunnels. Morning still weakens him; the ending places him in a protected refuge, never casually celebrating in direct sunlight. His arc ends with a kept promise and accountability, not instant universal forgiveness.

Only one guest support is enabled per encounter, chosen by the authored scenario. Guest support consumes an existing party action, has explicit costs/cooldowns and is saved with quest progress. Guest knockout/revival uses normal safe state rules. The Dawncrowned retain their established roles; Soren's death remains permanent.

## 6. Five-hour pacing and encounter plan

Aim for the existing **300-minute campaign**, with no mandatory grinding. These are design targets to measure and adjust in playtesting, not a duration guarantee derived from asset counts.

| Chapter | Target | Mandatory standard encounters | Mandatory boss encounters | New content placement |
| --- | --- | --- | --- | --- |
| 1 — When the Lanterns Die | 35 min | 6 | Garran | Gloom Stalker tutorial in the shelter route |
| 2 — A City That Forgot Sleep | 55 min | 9 | Maelis | Cassian recruitment/rescue; Lancer + Acolyte combinations |
| 3 — The Monastery of Borrowed Memories | 60 min | 9 | Sevrin | Ayla treatment scenes; Grave Weaver web puzzles and combats |
| 4 — The Order That Feared the Dawn | 70 min | 8 | Rowan, Orin Ren | Nox rescue; Raven Knight stance tutorial; refugee defense |
| 5 — The King of the Unending Night | 80 min | 10 | Valka, Veyr | Mixed elite Court patrols; optional Selene wing; final engine sequence |

This gives **42 standard encounters and 7 mandatory boss encounters**, plus six suggested optional encounters. A standard encounter is a distinct placement/objective, not a new species. Veyr's three narrative phases constitute one final boss sequence; later monster-form art is not supplied. Rowan uses his existing hero battle art and fights nonlethally.

Use average standard battles around 1–3 minutes, major bosses 5–8 minutes and the final sequence 12–18 minutes, then allocate the remaining chapter time to exploration, puzzles, dialogue, hub recovery and cutscenes. If the build is short, add authored spaces, choices and story scenes before adding repeated fights. Speed-up and animation skipping must remain available.

Optional content should add approximately 20–35 minutes for a curious player and have visible rewards: Cassian's evacuation ledger, Ayla's shrine relay, Nox's rescued captive testimony, Selene's moon-seal archive, a beast den and a Court vault. The primary route alone should supply levels 1–20 and the tools needed to win.

Suggested encounters: Acolyte + Lancer teaches target priority; Weaver + Stalker teaches cleansing before guarding a marked target; Raven Knight + Court Sentry teaches stance management; Acolyte + Knight requires coordinated interruption. Introduce these mechanics separately first. Reuse art with authored AI/tactics, not just recolors and inflated HP.

## 7. Exact asset coverage and limits

Included: 28 original walking atlases with matching crop JSONs, 28 prepared combat sheets, 384 individual battle frames, 236 animated GIF previews, 38 profiles, three static backdrops, 36 starter tiles plus atlas, one compact anime logo, story and integration metadata.

Walking source art is preserved at native resolution in `originals/`. High-resolution battle masters are omitted because the user chose the preview combat art and requested smaller uploads. No obsolete reduced 48-pixel walking sheets are used by this edition. `manifest.json` is authoritative.

The backgrounds are flattened illustrations without collisions or separate depth layers. The existing three backgrounds do not cover every campaign region. Author missing maps, collisions and occlusion separately; do not claim an image is a finished navigable map. Tiles need seam/transition review. Profiles have neutral expressions. Veyr's later forms and additional portrait expressions need further art.

## 8. Integration checklist and first playable milestone

1. Confirm all three archives are merged. Resolve every manifest path before starting game loading.
2. Use `scene.load.atlas` for exploration and `scene.load.spritesheet` for combat. The provided Phaser helper handles both. Atlas frame names are strings; combat indices are numbers.
3. Apply exploration display scale to preserve the logical 48×48 footprint. Keep collision bodies tied to map coordinates. Use bottom-center origins and nearest sampling.
4. For a custom renderer, use `sourceRects[index]` plus `offsetX/offsetY` in the reconstructed frame. Never treat an original as a uniformly spaced texture grid.
5. Review `preview.html`: exploration now shows original art, combat the prepared preview sheets. GIF backgrounds are opaque for review only; game PNGs retain alpha.
6. Implement one exploration route and a two-enemy turn-based battle, including guard, status icons, Resolve, regeneration suppression and one-shot animation completion.
7. Add the guest command system and an authored encounter composition. Load roster data without inventing unsupported art.
8. Complete and test each chapter against the original campaign document. Measure playtime from representative normal-speed runs and adjust pacing.

Report what was implemented, what was tested and what art/content is still missing. All game dialogue and UI remain in English.

## 9. Message the user can paste into Claude

Read this document first. I am uploading three ZIPs for VAMPIRE HUNTERS. Merge their common root folder, inspect the manifest and complete story, and use ORIGINALS for exploration/walking with a logical 48x48 footprint and PREVIEW battle sheets for combat. Preserve the four core companions, five Dawncrowned and existing ending. Add the six new enemies and three temporary allies as specified. Start with working asset loading, an updated gallery, Kai exploration and a tactical battle, then build the five-hour campaign in verified milestones. Do not claim inaccessible attachments were inspected, and do not replace the selected art with placeholders.


---

# APPENDIX — COMPLETE ORIGINAL CAMPAIGN BRIEF

The latest artwork and guest rules above override older asset-loading and cast-coverage instructions in this appendix. Story continuity remains unchanged.

# VAMPIRE HUNTERS — Complete Claude Development Prompt

Copy this document into Claude as a project brief. All content below is addressed to Claude. This is a complete campaign blueprint and implementation brief; expand it into scene scripts and a playable game without changing the established revelations or ending.

## 1. Your assignment

Act as a game director, narrative designer, pixel-art art director, and JavaScript game developer. Build an original single-player JRPG called **VAMPIRE HUNTERS**, with turn-based battles, exploration, cinematic dialogue, and a complete approximately five-hour main campaign.

The emotional and aesthetic starting point is supernatural sword-hunting fiction such as Demon Slayer: dangerous nights, disciplined sword fighters, expressive combat techniques, tragic monsters, and an exceptional protagonist. Create an independent world. Do not reuse existing characters, plots, uniforms, terminology, signature attack sequences, or one-to-one counterparts. Cadences, Alvor Blades, the Dawncrowned, vampiric memory consumption, and Kai's seal have their own rules.

All player-facing content must be in English, including dialogue, menus, items, quests, tutorials, ability names, journals, and ending text. Kai is a fixed protagonist with no character customization. The narrative is linear with optional character quests and meaningful local choices, ending in one complete canonical resolution.

Target desktop browsers first. Use JavaScript with a modular project structure and a suitable rendering framework. Phaser is a reasonable default, but first inspect an existing project and preserve its architecture if one exists. Use genuine exploration and turn-based combat rather than a menu-only simulation. Support keyboard and mouse, save/load, settings, and a restartable complete game loop. No backend, accounts, or subscriptions are required for the initial game.

Do not claim a five-hour campaign exists based on a short demo or repeated encounters. First deliver a polished playable vertical slice, then build the remaining chapters in ordered milestones. If a single response cannot implement everything, preserve this full scope in project files and implement the next milestone with working code.

## 2. Visual direction

Use Nintendo DS-era JRPGs as a reference for readable sprites and compact detailed environments, combined with modern lighting and depth. The desired result is pixel art with a convincing almost-3D atmosphere.

- Baseline character sprites: 48 × 48 pixel cells for overworld characters, with a consistent body scale. Bosses may occupy larger cells. Separate higher-detail battle sprites and portraits are permitted if their design matches.
- Build tile-based environments with raised platforms, stairs, layered foregrounds, roof occlusion, and consistent perspective. Use layered 2D or restrained 2.5D; full 3D is not mandatory.
- Apply directional lighting, contact shadows, localized lamps, cold moonlight, warm sunrise, subtle fog, and controlled particles.
- Preserve hard pixel edges using nearest-neighbor sampling and a consistent world pixel scale. Avoid blurry sprite scaling and excessive bloom.
- Render the interface at display resolution with crisp readable typography; do not make menus hard to read merely to imitate old hardware.
- Use short in-engine cinematics with sprite motion, portrait dialogue, camera changes, and effects. Do not require expensive pre-rendered cutscenes.
- Kai's expanding mark must be visible in portraits, special attacks, and story scenes. It should also have a simplified readable representation on small sprites.
- Give each region a distinctive palette: amber village lanterns, copper city machinery, blue-white mountain snow, red-violet theater lighting, and black-gold royal architecture.
- Avoid an interface made entirely of empty dark panels. Show a world with texture, depth, landmarks, living NPCs, and environmental storytelling.

## 3. World and supernatural rules

**Asterra** is a mountainous province of lantern-lit villages, industrial cities, old shrines, and forgotten observatories. Its people believe the northern mountains hold a gate through which the morning sun enters the world.

**The Aurora Wardens** protect settlements from vampires. Their headquarters is **Firstlight Bastion**. They serve the people, but their leadership has covered up an unethical decision made eighteen years ago.

**Cadences** synchronize movement, concentration, and pulses of internal energy with the stored light in a weapon. They are not breathing techniques. Each discipline has a distinct tactical identity, not merely a different elemental color. A fighter can learn basic forms from other disciplines, but mastering one requires years.

**Alvor Blades** are forged with **Dawnstone**, a mineral that stores sunlight. A charged blade disrupts vampiric regeneration, but powerful royal vampires can recover unless their deeper blood anchor is destroyed. Charges are abstracted into combat energy and checkpoints; avoid making routine travel a weapon-maintenance chore.

**Night Domains** are individual vampiric powers formed around an obsession, a remembered emotion, or a memory stolen from another person. Vampires consume blood and memories. Older vampires can forget who they were, while retaining terrifying fragments of attachment. Stolen memories can sometimes be released; consumed and destroyed memories cannot be recovered. Veyr cannot truly resurrect dead people.

Daylight severely weakens vampires. Strong royal vampires can briefly endure it at great cost. Explain nighttime travel through sheltered routes, late arrivals, indoor encounters, and the advancing Veil rather than ignoring sunlight rules.

**The Mourning Engine** is an ancient astronomical installation beneath **Noctis Crown**, rebuilt by the vampire king. It creates a supernatural barrier called **The Veil** that blocks sunlight over Asterra. It does not alter planetary rotation. During the campaign its barrier expands and morning arrives later within the province. Once fully activated it will create permanent regional night and allow later expansion beyond Asterra.

The engine needs the king's lost essence to stabilize. It can operate in an incomplete state, which explains worsening nights before he recovers Kai. Show its expansion through changing scenery, NPC dialogue, and chapter transitions; do not impose a real-time deadline on the player.

## 4. Kai and the central mystery

**Kai**, age 19, has pale skin, white hair, violet eyes, and an asymmetric dark-violet mark running from his left shoulder across his upper chest. Preserve these features throughout the game. He wears practical charcoal traveling clothes with pale cloth accents and later receives a fitted Warden jacket that leaves part of the mark visible.

He is observant, protective, and occasionally sarcastic. His weakness is believing that his usefulness determines whether people will keep him. His arc is learning that he belongs to others through trust, not because of the power inside him.

His sword is **Dawnbreak**, a reforged Alvor Blade entrusted to him by Elara. Its basic combat discipline is **Cadence of the Pale Ember**: controlled slashes, violet-white light, and single-target pressure. His mark grants a separate discipline, **Veil Arts**, which interrupts regeneration, reveals blood anchors, and manipulates fragments of stolen memory.

Eighteen years ago, a Warden expedition shattered the king's externalized **Heart-Shard**, the core that made his royal blood endlessly regenerate. The fragment could neither be destroyed nor safely contained in Dawnstone. Its escaped energy threatened a nearby refugee shelter.

The expedition's ritualist discovered that a living mind could keep the fragment dormant. Kai was a one-year-old orphan rescued from the shelter and had no living guardian present. Commander Rowan authorized binding the fragment to him in an emergency. This saved the shelter and prevented immediate disaster, but it was an experiment performed on a child who could not consent. The order concealed both the decision and the continued danger. Never treat it as ethically harmless just because lives were saved.

Elara objected, then helped keep Kai alive after the ritual. She arranged for **Hana**, a civilian healer, to raise him in Emberfall. Rowan and Elara know the original truth. The other three current Dawncrowned joined or rose to their positions later and do not initially know the full secret.

The mark is the living seal around Veyr's essence. Using Veil Arts expands its channels. The seal cannot simply be cut out or extracted by killing Kai: violent extraction scatters the essence into a new uncontrolled vessel and would not stabilize the engine. Veyr needs Kai to consciously surrender the seal after its channels have matured. He attacks, abducts, and manipulates people around Kai to secure that surrender.

Kai is not the king's son, a reincarnated king, or secretly evil. His past and agency remain his own.

## 5. The five elite Wardens: THE DAWNCROWNED

The Dawncrowned are the five active guardians with the highest mastery and responsibility in the order. Their collective name means that they bear the burden of bringing morning back. The five seats have ceremonial seniority; it is not a simplistic universal power ranking. Each is extraordinary in a different type of battle. Do not call them Hashira or create direct equivalents.

### First Seat — Rowan Voss, THE SUNLESS SOVEREIGN

Age 43. Commander of the Aurora Wardens. Tall, silver-streaked black hair, a charcoal coat lined in muted gold, and a cracked Dawnstone ring. Calm and intimidating, with an exhausted expression rather than constant arrogance.

- Discipline: **Cadence of the Eclipse**. Absorbs an incoming charged attack into his blade, then releases the stored energy in a precisely timed counter. It is a Dawnstone technique, not vampirism.
- Weapon: **Last Horizon**, a long Alvor nodachi with a smooth shallow curve and dark central channel.
- Signature: **Horizon Zero**, a brilliant horizontal cut preceded by a moment of complete darkness.
- Limitation: cannot absorb unlimited energy; opponents can force him to discharge early or overwhelm him with staggered attacks.
- Story: authorized Kai's sealing. He believes leadership means accepting unforgivable decisions so others can live. He attempts to confine Kai for a dangerous containment ritual after the truth emerges.
- Arc: Kai defeats him in a nonlethal tactical duel. Rowan finally admits that protecting Asterra does not give him ownership of Kai's life. He supplies the original ritual records and leads the outer defense in the finale. He survives and steps down after the battle to face public accountability.
- Line: "A leader must answer for the lives he saves—and the lives he uses."

### Second Seat — Elara Ashen, THE WHITE INFERNO

Age 34. Kai's mentor and the Warden who rescues him. Dark hair in a short braid, ash-white haori, burn scars on one forearm, and a practical charcoal hunter uniform and black hakama. She is blunt, warm in private, and angry at her own years of silence.

- Discipline: **Cadence of the Ashen Sun**. White flame strips away regeneration and burns hostile blood constructs. Control matters more than spectacle.
- Weapon: **Cinder Vow**, a slender Alvor katana.
- Signature: **White Funeral**, a ring of pale flame that seals a battlefield against escaping vampire fragments.
- Limitation: sustained flame overheats her weapon and strains old injuries.
- Story: teaches Kai restraint, admits her complicity, then rejects Rowan's plan to decide Kai's fate without him.
- Arc: suffers serious injuries protecting the party in the snow monastery. She survives, and later seals the engine's escape conduits so Veyr cannot abandon his body. Kai must forgive or challenge her through dialogue; either way, she accepts responsibility.
- Line: "You do not owe anyone your life because they once saved it."

### Third Seat — Daigo Ren, THE THUNDER WITHOUT A SKY

Age 29. Broad-shouldered, warm-brown skin, cropped dark hair, a sleeveless storm-blue coat, and scarred hands. Loud, competitive, and generous. His jokes disguise grief over his younger brother's disappearance.

- Discipline: **Cadence of the Stormforge**. Stores kinetic energy across deliberate movements and discharges it through paired blades and the ground. He is not merely a fighter who runs fast.
- Weapons: **Northwake** and **Southwake**, paired Alvor wakizashi.
- Signature: **Thousand-Bell Descent**, a chained discharge across several marked targets.
- Limitation: needs preparation and conductive paths; interruption can waste his stored charge.
- Story: mentors Lyra and rescues refugees from Brassveil. Discovers that his brother Orin became one of Veyr's enforcers.
- Arc: refuses both blind revenge and denial. He helps the party stop Orin, then defends the engine's lightning conduit during the final assault. Optional preparation allows Orin's last human memory to be released before death, but does not change campaign progression.
- Line: "Being afraid only means you understand what you are protecting."

### Fourth Seat — Nyra Vale, THE SILENT WINTER

Age 27. Deep-brown skin, silver-gray hair, a muted blue coat, and fine frost patterns on her weapon. Reserved and exacting, with a dry sense of humor. She judges people by what they do under pressure.

- Discipline: **Cadence of the Stillwater Frost**. Slows hostile energy flow, creates fragile protective structures, and redirects momentum. Her ice does not effortlessly freeze every opponent.
- Weapon: **Winterglass**, a slender Alvor katana with a cyan mineral spine.
- Signature: **Still World**, a field of floating frost shards that briefly locks the enemy's next charged action.
- Limitation: brittle barriers break under repeated heavy strikes; large control fields demand concentration.
- Story: initially escorts Kai under arrest. Seeing him protect civilians while the leadership argues changes her allegiance.
- Arc: teaches seal stabilization and guards the observatory approach. In the finale she holds collapsing coolant channels open so civilians and wounded fighters can escape.
- Line: "Restraint is a choice. Silence is not permission."

### Fifth Seat — Soren Mire, THE GRAVE'S LAST SONG

Age 31. Slim build, copper-brown hair, dark teal traveling robes, a blindfold worn during rituals, and small bell charms. He can see normally; the blindfold reduces distracting visual input during memory work. Gentle, unsettling, and funny at unexpected moments.

- Discipline: **Cadence of the Hollow Bell**. Reads lingering memory echoes and turns rhythmic vibrations into defenses against illusions.
- Weapon: **Requiem**, an Alvor katana with a resonant bell-shaped tsuba.
- Signature: **Last Reverberation**, a pulse that separates a victim's surviving memory from a vampire's projection.
- Limitation: cannot read minds, recreate erased memories, or return the dead. Deep contact with an old vampire is dangerous.
- Story: recognizes Kai's mark as a prison rather than an infection and mentors Eren.
- Arc: dies destroying a false-memory trap in chapter three, choosing to save the party while transmitting the evidence he recovered. His death is permanent. His memory crystal contains a recorded message, not his resurrected consciousness. The Fifth Seat remains empty in the ending.
- Line: "Remembering the dead is not the same as refusing to let them go."

Introduce the five through action across the first two chapters, not one long encyclopedia scene. Show that their superiority does not solve everything: they protect different fronts, carry wounds and limitations, and cannot manipulate Kai's seal. The finale requires all their distinct contributions.

## 6. Main party and supporting cast

The complete playable party has four members. Use three active combatants and one reserve, with swapping at safe points. Story sequences may temporarily fix the party. Give reserves comparable progression so experimentation does not require grinding.

**Kai — sealbreaker / flexible damage.** Appears from the prologue. Pale Ember attacks, Veil Arts, blood-anchor disruption, and controlled counters.

**Lyra Fen — storm duelist / initiative control.** Age 20, tawny skin, dark curly hair tied back, amber eyes, and a navy-gray haori with copper lightning seams over a black hunter uniform and hakama. Energetic and blunt. She is Daigo's apprentice, ambitious to earn a Dawncrowned seat, and embarrassed by mistakes. Her brother **Tomas** is alive and works as a civilian courier; do not kill every companion's family. Her **Cadence of the Stormstep** marks targets and shifts turn order. She uses the slender katana **Skylark**. Arc: learns that command is about whom she protects, not how impressive her victories look. Joins in chapter one.

**Eren Sol — memory exorcist / support and illusion removal.** Age 22, medium-brown skin, dark green-black hair, thin spectacles, and a weathered teal robe. Soren's apprentice. Anxious, observant, unexpectedly stubborn. Uses **Cadence of the Echo Thread**, a ritual dagger called **Keepsake**, and bell talismans. His small **Echo Ledger** records chosen memories and is an optional journal feature, not an unrestricted supernatural archive. Arc: stops hiding behind his teacher's certainty and completes the counter-ritual. Joins in chapter two.

**Mira Thorn — field medic / barriers and precise ranged attacks.** Age 19, light-brown skin, chestnut hair, hazel eyes, a crimson blossom-patterned haori, cream-and-black uniform, and practical healer's pouches at her obi. Kai's childhood friend and Hana's apprentice. Taken alive during the festival because her memories can be used to locate Kai and manipulate him. She actively organizes captives and helps undermine the prison from inside. Rescued midway through chapter two, then chooses to join. Uses Dawnstone needles, a compact wakizashi called **Kindle**, and learned **Cadence of the Lantern Thread** support forms. She has no exceptional inherited power. Arc: insists that protecting someone includes respecting their choices.

Additional named characters with actual scenes or quest functions:

- **Hana Thorn:** Mira's aunt and Kai's adoptive guardian. Survives the attack. She knows Kai was entrusted to her after a dangerous ritual but was not told it involved Veyr. Gives the party a childhood cloth keepsake that later grounds Kai's identity.
- **Master Ivo Renn:** Dawnstone smith at Firstlight Bastion. Reforges Dawnbreak and offers limited meaningful upgrades. Humorous, tired, and protective of apprentices.
- **Tessa Wren:** teenage courier in Brassveil. Helps map safe routes and reconnect trapped families. Knows Tomas professionally.
- **Tomas Fen:** Lyra's older brother. Transports medical supplies and evacuation notices. Appears in chapter two and the finale evacuation.
- **Captain Odel Marr:** Warden officer loyal to Rowan. Leads the pursuit in chapter four but stands down when Rowan yields. Not a secretly evil bureaucrat.
- **Abbess Seren:** keeper of the snow monastery. Preserves the original sealing diagrams and refuses to let her patients be used as bait.
- **Nell and Corin:** evacuated siblings whose changing conversations show civilian consequences. Reappear in the ending.
- **Vesper Rook:** vampire apothecary retaining much of her identity by refusing stolen memories. Dangerous and morally compromised, but willing to exchange information. A short optional quest explores hunger and responsibility without absolving predation. She is not a mandatory party member.
- **Aurel Veyr:** the human astronomer whose identity preceded the vampire king. Exists only in historical memories and documents; not a separate present-day NPC.

## 7. Antagonists and encounter identities

**Veyr, THE KING OF THE UNENDING NIGHT**, is the final boss. Once Aurel Veyr, an astronomer trying to preserve his dying family, he used the engine's earliest form to bind life to stored memory. The ritual made him a vampire. Centuries of feeding consumed the very memories he intended to preserve. He now steals other families' memories to pretend he can reconstruct his own.

His motive explains his behavior without excusing it. His promise of resurrection is false: he can construct convincing memory replicas, not restore real people. Foreshadow this through replicas repeating phrases and failing to respond naturally.

Appearance: elegant black-gold ceremonial kimono and long haori, pale skin with subtle bloodstone cracks, long dark hair, a Japanese ceremonial kanmuri headpiece with an eclipse emblem, and a ceremonial katana called **Night Testament**. He should initially look controlled and almost human; monstrous transformations arrive later.

His inner circle is called **The Nightbound Court**. It is not a numbered group that mirrors an existing anime hierarchy. Each member is an agent with a specific task:

- **Garran, The Lantern Eater:** prologue boss. A stalking vampire that extinguishes lamps and hides blood anchors in hanging lanterns. Publicly calls Kai "the vessel," establishing the mystery.
- **Maelis, The Sleepless Mother:** Brassveil boss. A former physician who stores stolen memories in artificial sleep chambers. She claims keeping patients dreaming protects them from reality. Turning off chamber relays exposes her defenses. Mira's rescue takes place before the final confrontation with her.
- **Sevrin, The Red Playwright:** memory-theater boss in chapter three. Changes stage sets, creates false allies, and tries to force victims into scenes drawn from stolen memories. Eren's echo skill distinguishes projections from real people.
- **Orin Ren, The Broken Tempest:** Daigo's younger brother and chapter-four field boss. Became a vampire after accepting survival at the cost of serving the Court. Retains resentment at being sheltered by Daigo. Grounding his storm pylons interrupts chained attacks. His final lucid exchange with Daigo is unlocked by a brief optional memory quest.
- **Valka, The Hollow Bride:** final-region gatekeeper. Assembles counterfeit bonds from stolen wedding memories and puppets. Uses shared damage links that the party must sever before attacking. Her appearance introduces the king's false-family imagery.
- **The Engine's Custodian:** a nonhuman defense construct and chapter-five miniboss; rotating solar mirrors and exposed cores teach the final engine mechanics.

Ordinary enemies include ash thralls, roof stalkers, memory moths, blood hounds, court sentries, frostbound leeches, and puppet mourners. Give them readable attack tells and different mechanical roles. Avoid simply reskinning one enemy for every region.

## 8. Complete campaign story

The following chapter budgets total approximately 300 minutes. They are design estimates to be validated with playtesting, not guaranteed duration. Include ordinary reading, travel, encounters, upgrades, and recovery in each budget. Optional content adds roughly 45–90 minutes. Target around 30–40 purposeful main-path encounters, including minibosses and boss phases; adjust after observing actual combat duration rather than padding the route.

### Chapter 1 — WHEN THE LANTERNS DIE — approximately 35 minutes

Opening: Kai repairs lantern fittings with Mira before Emberfall's annual Firstlight Festival. Let the player explore a compact village, meet Hana, and learn interaction through useful errands. Establish Kai and Mira's easy friendship. Kai hides discomfort from his mark.

At night the lanterns extinguish in sequence. Garran's thralls enter the village. Kai takes up a ceremonial village blade to defend the evacuation, providing a short combat tutorial. Garran notices the mark and calls him a vessel. Mira helps civilians flee but is captured with several others.

Kai's Veil Art erupts when Garran wounds Hana. His mark expands, his sword briefly emits violet light, and Garran's regeneration stops. Elara arrives, recognizes the phenomenon, and helps defeat the vampire. Kai hears a voice say, "At last, you have opened your eyes," but cannot identify it.

Hana survives. At dawn Elara takes Kai to Firstlight Bastion so he can learn to fight and recover the captives. Lyra escorts the survivors. Meet Ivo and receive Dawnbreak. Introduce Rowan's authority and Daigo's training presence in short scenes. Rowan orders Elara to report any changes in the mark, suggesting he knows more.

End beat: Kai chooses to join the expedition because Mira and the captives are still alive, not because he has instantly sworn lifelong loyalty to the order.

### Chapter 2 — A CITY THAT FORGOT SLEEP — approximately 55 minutes

Brassveil is an industrial city where workers vanish and the remaining population cannot sleep. Mechanical clocks continue ticking under a morning sky that stays unnaturally dark. The Court's collection chambers drain restorative memories from sleeping captives, leaving nightmares and false waking recollections among survivors.

The party investigates a clinic, a rooftop route, and an underground foundry. Tessa and Tomas provide access and civilian stakes. Daigo holds an evacuation corridor against enemies the new party cannot yet handle. Meet Eren, sent by Soren to investigate memory contamination.

Find Mira coordinating a escape attempt through service tunnels. She identifies which captive memories belong to the village, helping Eren shut down the correct relays. Rescued captives include ordinary people with names and brief reunion scenes. Mira joins as a medic by choice.

Maelis tempts Kai with a dream of Emberfall as it was before the attack. The illusion breaks because Hana repeats a childhood phrase in the wrong context. Boss mechanics involve two relays, sleep cleansing, and regeneration interruption.

After victory, Eren examines the mark and finds two overlapping structures: a human identity and a sealed foreign presence. He cannot yet name the second. Soren contacts the party through a prepared bell relay and calls Kai north to the snow monastery. Nyra appears escorting an official Warden delegation; her first encounter with Kai is professional and wary.

End beat: the party sees a dawn that lasts only a few minutes. The regional Veil is expanding.

### Chapter 3 — THE MONASTERY OF BORROWED MEMORIES — approximately 60 minutes

At **Hushspire Monastery**, Abbess Seren tends refugees who have lost memories. Soren explains that vampirism feeds on identity and identifies Kai's mark as a containment structure. Rowan's ritual archive was divided years ago; Seren holds the original diagram, while Soren must recover a memory record stolen by Sevrin.

Explore a snowy pilgrimage route and a compact archive puzzle. Nyra protects the approach while Elara travels with the party as a temporary guest support. Establish the relationship between Soren and Eren before the danger escalates.

Sevrin has occupied an abandoned theater beneath the monastery and is using the original expedition's stolen memories to build a trap. The stage shifts among childhood rooms, a ruined battlefield, and imagined futures. False versions of party members encourage Kai to surrender. Clues established earlier distinguish these imitations from real people.

Soren enters the central projection to recover the expedition's evidence. Sevrin tries to overwrite Kai's identity, which would make him vulnerable to voluntary surrender through false beliefs. Soren breaks the trap at the cost of his life and sends his findings into a crystal. Elara is badly injured protecting the party's physical bodies. Defeat Sevrin using exposed stage anchors and Eren's illusion cleanse.

The recording reveals the emergency sealing and Rowan's authorization. Elara confesses her part. Kai learns that the voice belongs to Veyr and that growing power is making his seal accessible. Eren mourns Soren, then elects to finish his work. Let the grief breathe through a quiet playable recovery sequence rather than immediately launching another boss.

End beat: Rowan's orders arrive. Kai is to be brought back for containment. Nyra is instructed to arrest him.

### Chapter 4 — THE ORDER THAT FEARED THE DAWN — approximately 70 minutes

Nyra escorts the party toward the Bastion. During a refugee-camp attack, Kai chooses to protect people despite the risk of being captured. Nyra sees that he is exercising judgment, not becoming a monster, and allows the party to present Soren's evidence directly to Rowan.

Firstlight Bastion is under severe strain. Captain Odel enforces the confinement order. Rowan reveals his proposed ritual: it might suppress the fragment, but the process would likely erase Kai's identity. He knows simply killing Kai would not destroy the essence. The conflict is about who has authority to decide this risk.

Kai refuses. Fight Rowan in a controlled nonlethal duel in the training court. He tests whether Kai can act deliberately under pressure. Mechanics involve baiting Rowan's stored counter, guarding his release, and choosing restraint during a scripted opportunity to use uncontrolled power. The story outcome does not require secretly avoiding every Veil Art.

After defeat, Rowan admits both the original wrong and his renewed attempt to repeat it. He releases the ritual records. Eren combines them with Seren's diagram and Soren's recording: Kai can invert the seal, force Veyr's lost essence to resonate against the king's present body, and turn him mortal briefly. The Dawncrowned must sever the engine's supporting channels so the essence cannot escape. Kai must willingly give up the power after inversion rather than absorbing the rest of Veyr.

The Court attacks the Bastion's storm beacon. Orin leads the assault. Daigo recognizes his brother, and the party helps defeat him while Daigo protects the civilians. An optional preceding task recovers Orin's training charm and allows a lucid farewell; otherwise he dies still consumed by the Court. In both branches the storm beacon is secured and the engine route becomes accessible.

Before departure, offer a compact preparation hub: final upgrades, companion conversations, remaining short quests, and a clearly labeled departure confirmation. Autosave before departure. Preserve a pre-finale save or allow postgame chapter replay so optional content is not permanently lost.

End beat: all four party members stand beside Kai. He decides to end the engine as a person with a future, not as a weapon asking to be spent.

### Chapter 5 — THE KING OF THE UNENDING NIGHT — approximately 80 minutes

The Wardens assault **Noctis Crown**, a black-gold observatory built above the Mourning Engine. Make the five elite guardians' story contributions visible through short transitions: Rowan holds the outer Court army; Daigo disables the lightning conduit; Nyra holds the collapsing passage; Elara seals the king's escape channels. Soren's recorded discoveries guide Eren's counter-ritual. The dead guardian contributes knowledge, not a resurrected attack.

The party crosses a compact observatory dungeon with mirror alignment, readable solar reservoirs, and varied Court encounters. The Engine's Custodian introduces redirecting light between exposed nodes. Valka guards the inner approach with false wedding memories and linked puppets. Her defeat exposes the royal sanctum.

Veyr speaks gently to Kai and presents an impossible bargain: a restored village, the return of Soren, and a life where nobody fears the mark. He shows memory replicas of people Kai loves. Mira recognizes that one replica repeats a private phrase without understanding its meaning. Eren confirms that these are constructions.

Kai refuses. He says, "You do not want your family back. You want a world that can never tell you they are gone."

Final boss sequence, with checkpoints and appropriate resource restoration between phases:

1. **Veyr, The Crowned King:** a disciplined swordsman using Night Testament, blood counters, and Royal Command to manipulate action order. Break his blood anchors; reckless damage alone is inefficient.
2. **Veyr, The Devouring Night:** an immense vampiric form fused with the engine. The party redirects stored sunlight into conduits as the allies complete their objectives outside. Kai can now perform Seal Inversion. Veyr becomes temporarily mortal, but pulls Kai's consciousness toward the fragment as a final defense.
3. **The Heart Without a Name:** a battle inside the seal, intercut with Lyra, Eren, and Mira maintaining the ritual in the real world. The player alternates between brief Kai action rounds and party defense rounds using the normal battle interface. Kai attacks the remaining blood ties while grounding himself in three established genuine memories: Hana's care, Mira's friendship, and his companions choosing him freely. No secret collectible is required. The final action, **Return the Dawn**, severs the fragment instead of taking the throne.

Veyr dies. The engine collapses in a controlled release of stored light. Nyra's evacuation route prevents the victory from inexplicably killing everyone in the fortress. Kai loses Veil Arts permanently in the story but survives; the dark mark becomes a pale scar. His ordinary Cadence training remains.

The ending shows morning over Emberfall, reunited survivors, Eren establishing a memorial archive, Lyra continuing her training without chasing a title at any cost, and Mira reopening Hana's clinic. Rowan steps down, publishes the sealed records, and faces judgment. Elara helps rebuild the Wardens with transparent rules protecting recruits. Daigo hangs Orin's charm near the training hall if recovered. Nyra establishes a civilian evacuation corps. The Fifth Seat remains empty in Soren's memory for now.

Last scene: Kai and Mira hang a new lantern at Emberfall. Mira asks what he plans to do now that nobody needs his mark. He answers, "Find out what I want. For once, that is enough." The lantern goes dark as natural daylight fills the screen.

End card: **Some scars do not remind us of what we became. They remind us of what we chose.**

The campaign resolves the villain, the engine, the kidnappings, the seal, and the institutional cover-up. Do not replace this ending with a cliffhanger.

## 9. Optional quests with payoff

Keep optional quests compact and character-focused. Rewards should offer choices, not mandatory power required to win the finale.

1. **Letters Before Morning:** reunite three Brassveil families using Tessa's courier routes. Reward: a support accessory and changed evacuation dialogue.
2. **The Sound of Home:** recover Eren's first lesson bell after Soren's death. Reward: an alternate support enhancement and a memorial conversation.
3. **A Brother's Weather:** find Orin's training charm and learn about his disappearance. Reward: his lucid farewell and Daigo's ending detail.
4. **A Blade Worth Keeping:** help Ivo reclaim Dawnstone from a compromised workshop. Choose one of three equivalent Dawnbreak specializations: damage, guard breaking, or protection.
5. **Hunger Has a Name:** help Vesper recover medicine taken by Court raiders, then insist she release captives rather than trading away responsibility. Reward: a route clue and a memory-resistance accessory. Do not frame her victims as an acceptable cost of her sympathetic story.
6. **The Last Festival Lantern:** repair Hana's damaged lantern with Mira. Reward: a healing enhancement and a richer ending exchange. Kai's childhood grounding memory remains available even if the quest is skipped.

## 10. Combat and progression

Use fully turn-based battles with a visible initiative queue. No reflex timing is required. Standard commands: Attack, Cadence, Veil Arts (Kai), Guard, Item, and contextual Swap where allowed. Explain each system with a short encounter and one useful tutorial message.

- Three active allies versus one to five enemies. HP, Focus, Attack, Defense, Speed, and Resistance provide an accessible baseline.
- Cadences spend Focus. Guard restores a small amount of Focus and reduces damage, so it remains a meaningful action.
- Weakness hits, well-timed counters within the turn system, and specific skills reduce an enemy's **Resolve** meter. At zero, the enemy is staggered for a bounded window. Bosses recover after their window; no permanent stun locks.
- Vampires have visibly indicated regeneration. Dawnstone attacks reduce it; Kai's **Seal Rend** temporarily suppresses it. Other allies gain tools against regeneration so Kai is useful without making every encounter depend on him.
- Party synergy: Lyra marks initiative openings; Eren strips illusions and protects memory; Mira stabilizes allies and builds barriers; Kai exploits exposed anchors.
- **Aurora Bonds:** a shared meter built through protecting allies, exploiting openings, and varied actions. Spend it on a short team attack or a rescue effect. Introduce gradually; avoid ten simultaneous resource bars.
- Include readable descriptions for Burn, Frost, Shock, Sleep, Bleed, and Memory Fracture. Limit status overlap in early chapters. Make bosses resistant to indefinite loops, not arbitrarily immune to all interesting mechanics.
- Standard encounters target roughly 1–3 minutes, major bosses around 5–8 minutes, and the full final sequence around 12–18 minutes before cinematic time. Validate this in playtesting.
- Include adjustable battle speed and optional animation skipping after first viewing. Difficulty should support a story mode and a standard tactical mode.

Kai's mark has two distinct systems. Do not confuse permanent narrative growth with recoverable combat strain:

**Seal Stage:** advances only at scripted chapter events. Dormant covers shoulder/chest; Awakening extends toward the upper arm; Fracture reaches the neck edge and forearm; Dominion creates coherent violet channels; final inversion turns it into a pale scar. These stages unlock abilities and portrait variants.

**Veil Strain:** a 0–100 battle resource increased by powerful Veil Arts, reduced by guarding, stabilization skills, and recovery. High strain temporarily reduces Kai's defenses and makes his moves more expensive; it never randomly removes control of the player. No surprise bad ending, irreversible corruption punishment, or requirement to restart a campaign because the player used the advertised power. Set exact costs through balancing. Give optional strain play styles equivalent viable alternatives.

Progression target: roughly level 1–20 across the main story. Award experience and upgrades through the critical path so grinding is unnecessary. Use compact skill branches with meaningful upgrades rather than dozens of nearly identical spells. Offer limited respec at the hub. Include a small equipment set, consumables, and region-specific loot with clear benefits.

## 11. Exploration, presentation, and content plan

- Build connected compact maps: Emberfall, Firstlight Bastion, Brassveil streets/clinic/foundry, Hushspire route/monastery/theater, refugee camp/storm beacon, and Noctis Crown/engine.
- Prefer a small set of well-authored maps over a large empty overworld. An illustrated travel map can connect regions.
- Enemy sprites appear in exploration; contact triggers battle. Avoid frequent random encounters while reading dialogue or solving puzzles.
- Short puzzles: clinic relay diagnosis, monastery archive alignment, theater illusion identification, and solar mirror redirection. Give contextual hints and recovery paths; no softlocks.
- Add a quest journal with current objective, character profiles, and discovered lore. Do not spoil revelations in locked entries.
- Use occasional camp or hub conversations to build the four-member party's relationships. Provide distinct dialogue voices, not exposition in every line.
- Record major consequences through NPC dialogue and ending details. Local choices should respect the canonical campaign arc.
- Provide a save slot system plus rotating autosaves, key remapping where feasible, readable text speed settings, audio sliders, reduced screen shake, and reduced flashing options.
- Scope music by region and mood. Distinct leitmotifs for Kai, the Dawncrowned, and Veyr can evolve at revelations. Use properly sourced assets or original generated/procedural assets. Keep an asset manifest and ensure the initial game runs even when polished art is still being developed.
- Clearly label temporary art during development; replace it before claiming the requested visual finish. Do not use generic emoji as finished character sprites.

## 12. Implementation milestones and completion criteria

Start by inspecting the project and reporting a brief concrete architecture choice. Then implement rather than stopping at a design document. Keep narrative, quests, dialogue, enemies, maps, skills, and item definitions data-driven with stable identifiers.

**Milestone 1 — Vertical slice:** complete the festival opening, one explorable map, Kai/Mira dialogue, movement, interaction, tutorial battle, Garran boss, mark awakening cinematic, and working save/load. Establish lighting, shadows, pixel scaling, readable UI, and a playable beginning-to-end slice.

**Milestone 2 — Core game systems:** three-active/four-total party support, leveling, skill upgrades, equipment, inventory, quest tracking, initiative, Resolve, regeneration, Veil Strain, and the Bastion hub. Add Lyra and the onboarding sequence.

**Milestone 3 — Campaign middle:** build Brassveil and Hushspire, add Eren/Mira recruitment, Court bosses, memory puzzles, elite introductions, Soren's death, and the seal revelation. Draft full English scene dialogue, not only chapter synopsis text displayed to the player.

**Milestone 4 — Final act:** complete confinement conflict, Rowan duel, Orin encounter, optional preparation, observatory dungeon, Dawncrowned parallel objectives, three-phase Veyr battle, and the complete epilogue.

**Milestone 5 — Quality and pacing:** replace remaining placeholder art, balance encounter density and difficulty, verify dialogue triggers and save compatibility, review visual readability, and measure campaign length through ordinary play. Fix crashes, quest deadlocks, infinite status loops, and inconsistent resources between boss checkpoints.

Completion requires: every main quest reachable and completable; all four party members usable; every narrative revelation consistent; the king defeated through the defined final mechanics; a playable and readable ending; functioning save/load across chapter transitions; and a demonstrated path through the whole campaign. A menu with promised features is not completion.

At each milestone, state what is implemented, how to run it, what was validated, and what remains. Never claim to have tested a feature that was not exercised. Preserve the campaign's scope without inflating it into a much larger game. Keep the prototype offline and self-contained unless a later explicit requirement changes that.

## 13. Narrative continuity checklist

- Kai's appearance remains pale skin, white hair, violet eyes, left shoulder-to-chest mark.
- Hana survives; Mira is rescued in chapter two and becomes playable.
- The four-member party is Kai, Lyra, Eren, Mira. The Dawncrowned are elite story allies and occasional guests, not five extra permanent playable heroes.
- Only Rowan and Elara among the current elite initially know the full sealing secret.
- Soren dies in chapter three and remains dead. His recording provides evidence and instructions.
- Rowan's chapter-four duel is nonlethal; he survives, helps in the finale, and faces accountability.
- The Veil blocks regional sunlight through the engine; it does not stop the planet rotating.
- Veyr's essence requires Kai's mature seal and conscious surrender for safe reintegration. Violence alone cannot retrieve it.
- Veyr's resurrection offer uses false memory replicas. Real death is not undone.
- Seal Stage is scripted; Veil Strain is recoverable combat pressure. Using Veil Arts does not secretly lock a bad ending.
- The final operation requires severing engine channels, seal inversion, party support, and Kai relinquishing the fragment. This explains why an elite guardian cannot simply kill the king earlier.
- Optional quests enrich equipment and scenes but never gate the only viable victory route.
- Veyr is the final boss. Resolve the engine, stolen surviving memories, the captives, and the order's cover-up in the epilogue.

Begin with the architecture assessment and Milestone 1. Treat the rest of this document as established canon and the roadmap for the full game.
