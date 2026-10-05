# Design notes

## Architecture

- **Engine** (`src/engine/duel.js`): the whole duel is a plain JSON object (`createDuel`).
  `legalActions(state)` lists legal actions, `validate(state, action)` returns `null` or a
  human-readable reason, and `apply(state, action)` mutates the state and returns events for the UI to
  animate. There are no timers, no drawing and no randomness outside the seeded RNG
  stored in the state (`state.rng`), so a duel can be cloned (`structuredClone`) and
  replayed exactly.
- **AI** (`src/ai/ai.js`): it plays a turn greedily with one-ply lookahead.
  - It simulates each legal action on a clone and scores the result.
  - Card plays come before attacks, because attacking locks out card plays.
  - Its evaluation reads only public information (board, Nexus, terrain, hand counts) plus its
    own hand.
  - Simulated clones get a scrambled RNG, so the AI cannot predict a coin flip or a draw.
  - Personalities are weight profiles: `novice`, `balanced`, `aggressive`, `defensive`, `expert`.
  - The slowest decision measured in testing was ~14 ms.
- **Content as data** (`src/content/`):
  - Cards, decks, story events, characters, schedules, lore and puzzles all live here, and their IDs are stable.
  - Card effects are declarative trigger lists (`{ when, if, do: [ops] }`), so a card is
    data, not code.
- **Campaign** (`src/game/`): `state.js` holds the save object, `events.js` works out which story events
  are available, and `script.js` runs story scripts (dialogue, choices, duels, rewards, flags).
- **UI** (`src/ui`, `src/scenes`):
  - One canvas with a 480×320 logical screen. The backing store is an integer multiple of that.
  - Immediate-mode widgets. Every interactive element registers a hit box, which gives mouse and keyboard support
    from the same code.
  - Scenes sit on a stack. Overlays such as dialogue and rewards draw over the scene below.

## Rules as implemented

From the brief, unchanged:
- 30-card decks, max 2 copies, at least 8 basic creatures.
- 20 Nexus, 5-card opening hand, up to 3 creatures per side.
- Essence capacity starts at 1, grows by 1 each own turn up to 6, refills each turn, and doesn't carry over.
- Turn order: start effects → capacity/refill → draw → main → combat → end effects.
  The first player neither draws nor attacks on turn 1.
- New creatures can't attack that turn. Each creature attacks once. The attacker picks the target. The Nexus can only
  be attacked when the rival has no creatures. No counter-attack, no overflow damage, and damage
  persists.
- After the first attack, no more cards may be played that turn.
- Evolution: only on a creature that was on the field at the start of the turn, once per creature per turn. It
  keeps damage, statuses and relic. Its attack state is unchanged. The whole stack goes to the discard pile on defeat.
- An empty deck causes fatigue (1, 2, 3…). The hand limit is 8, and the player chooses the discards. If both Nexus hit 0 from the same effect, it's a draw.
  A draw or a loss in a mandatory story duel can be retried with no penalty.
- Ember → Grove → Tide → Ember: +1 attack damage to creatures only.

Decisions made to close gaps in the brief:
- **Who starts**: random. Each player may redraw their opening hand once (free mulligan).
- **Opening hands** always contain a basic creature (the engine redeals, deterministically).
- **Evolution lineage**: each stage evolves only from the previous one, with no skipping. Some cards lower
  evolution cost (Sprout, Academy Arena), but the cost never drops below 1.
- **Relics**: one per creature. When the creature is defeated, the relic goes to the discard pile. When a creature returns to hand, its relic goes to the discard pile.
- **Terrain**: one global terrain. A new one replaces the old one, which goes to its owner's discard pile. It costs Essence.
- **Statuses**:
  - Burn N: 1 damage at its owner's turn start, then N−1.
  - Shield N: absorbs N damage from any source, capped at 6.
  - Stun: can't attack during its owner's next turn.
  - Hex: −1 attack until the end of its owner's next turn.
  - Guard: must be attacked first.
  - Sturdy N: −N damage from attacks only, not from techniques.
  - Quick: may attack on the turn it arrives.
- **Simultaneous effects** resolve in a fixed order: active player first, slots left to right, each creature's
  ability before its relic, then terrain, then the other player. Defeated creatures leave in the
  same order, and then "when defeated" effects resolve.
- **Legendaries** (Aurivane, Noxeral, Concordia): 1 copy each, cost 6, never in packs, only
  earned through story missions. There is no cap on how many different legendaries a deck may hold
  (the owner's decision).
- **Illegal actions** are blocked, and the UI says why (for example "Not enough Essence (needs 3)").

## Data model (save)

```
{ version, name, partner, day, period(0..2), chapter, license, coins,
  flags: { flag: dayWhenSet }, collection: { cardId: n }, registered: { creatureId: true },
  decks: [{ name, cards: [cardId × 30] } × 3], activeDeck,
  friendship: { charId: n }, quests: { questId: 'active'|'done' },
  messages: [{ from, text, day, read }], stats: { wins, losses, draws }, playtime, location }
```

## Time

- Each day has Morning, Afternoon and Evening.
- Moving on the map, talking, deck building, reading and shopping take no time.
- Duels, lessons and important events take one period, and the button always shows the cost first.
- After the Evening the day ends. The player wakes in the dorm, and the game autosaves.
- Essential story events stay available until done, so the campaign can't be lost by letting days pass.

## Balance checks

`npm test` runs, among other things, 120 AI-vs-AI duels across all decks and checks that:
- duels end;
- moves stay legal;
- cards are never created or lost.

The three starter decks win 40–60% against each other in AI mirror tests.
