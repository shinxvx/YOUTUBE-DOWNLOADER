// Card catalog. IDs are stable: saves and decks refer to them.
//
// Effects are plain data read by the rules engine (src/engine/effects.js):
//   triggers: [{ when, if?, do: [ops] }]
//   when: summon | evolve | attack | turnStart | turnEnd | defeated | play | equip
//   selectors: target, attackTarget, self, holder, allies, otherAllies, enemies,
//              burnedEnemies, hexedEnemies, allyLowest, otherAllyLowest, enemyStrongest
// Keywords: quick (may attack the turn it arrives), guard (enemies must attack
// a Guard creature first), sturdy N (takes N less damage from attacks).

export const AFFINITIES = ['ember', 'tide', 'grove', 'volt', 'stone', 'veil'];

export const AFFINITY_INFO = {
  ember: { name: 'Ember', color: '#e8603c', dark: '#7a2416', light: '#ffc27a', style: 'Fire, pressure and lasting damage.' },
  tide: { name: 'Tide', color: '#3b8fe0', dark: '#1a3c78', light: '#9fe0ff', style: 'Water, healing and control.' },
  grove: { name: 'Grove', color: '#4dae4a', dark: '#1d5a2a', light: '#b6ee8a', style: 'Nature, protection and growth.' },
  volt: { name: 'Volt', color: '#e8c330', dark: '#7a5a10', light: '#fff4a0', style: 'Lightning, tempo and combos.' },
  stone: { name: 'Stone', color: '#a08458', dark: '#4a3a26', light: '#e0cfa4', style: 'Endurance and defense.' },
  veil: { name: 'Veil', color: '#9a5cd0', dark: '#3e1f66', light: '#e2b8ff', style: 'Illusion, tricks and risky plays.' },
  neutral: { name: 'Neutral', color: '#9aa0b0', dark: '#3a3e4a', light: '#e4e8f0', style: '' },
};

// Ember beats Grove, Grove beats Tide, Tide beats Ember (+1 attack damage).
export const ADVANTAGE = { ember: 'grove', grove: 'tide', tide: 'ember' };

const C = (o) => ({ type: 'creature', rarity: 'common', maxCopies: 2, keywords: {}, triggers: [], ...o });
const T = (o) => ({ type: 'technique', rarity: 'common', maxCopies: 2, triggers: [], ...o });
const R = (o) => ({ type: 'relic', rarity: 'uncommon', maxCopies: 2, mods: {}, triggers: [], ...o });
const L = (o) => ({ type: 'terrain', rarity: 'uncommon', maxCopies: 2, terrain: {}, ...o });

const list = [
  // ---------------------------------------------------------------- Ember
  C({ id: 'cindlet', name: 'Cindlet', affinity: 'ember', stage: 0, line: 'cindlet', cost: 1, hp: 3, atk: 1,
    text: 'Kindle: when this attacks, the target gains Burn 1.',
    triggers: [{ when: 'attack', do: [{ op: 'status', to: 'attackTarget', s: 'burn', n: 1 }] }] }),
  C({ id: 'brasear', name: 'Brasear', affinity: 'ember', stage: 1, line: 'cindlet', evolvesFrom: 'cindlet', cost: 2, hp: 5, atk: 3, rarity: 'uncommon',
    text: 'Kindle: when this attacks, the target gains Burn 2.',
    triggers: [{ when: 'attack', do: [{ op: 'status', to: 'attackTarget', s: 'burn', n: 2 }] }] }),
  C({ id: 'solmara', name: 'Solmara', affinity: 'ember', stage: 2, line: 'cindlet', evolvesFrom: 'brasear', cost: 3, hp: 8, atk: 4, rarity: 'rare',
    text: 'Kindle: attacks give Burn 2. Solar Mane: at the end of your turn, deal 1 damage to each Burned enemy.',
    triggers: [
      { when: 'attack', do: [{ op: 'status', to: 'attackTarget', s: 'burn', n: 2 }] },
      { when: 'turnEnd', do: [{ op: 'damage', to: 'burnedEnemies', n: 1 }] },
    ] }),

  // ---------------------------------------------------------------- Tide (starter)
  C({ id: 'ripplet', name: 'Ripplet', affinity: 'tide', stage: 0, line: 'ripplet', cost: 1, hp: 4, atk: 1,
    text: 'Mist: at the end of your turn, heal 1 to your most damaged other creature.',
    triggers: [{ when: 'turnEnd', do: [{ op: 'heal', to: 'otherAllyLowest', n: 1 }] }] }),
  C({ id: 'neruvin', name: 'Neruvin', affinity: 'tide', stage: 1, line: 'ripplet', evolvesFrom: 'ripplet', cost: 2, hp: 6, atk: 3, rarity: 'uncommon',
    text: 'Tidecall: when this evolves, heal 2 to all your creatures. Mist: end of turn, heal 1 to your most damaged other creature.',
    triggers: [
      { when: 'evolve', do: [{ op: 'heal', to: 'allies', n: 2 }] },
      { when: 'turnEnd', do: [{ op: 'heal', to: 'otherAllyLowest', n: 1 }] },
    ] }),
  C({ id: 'abyssail', name: 'Abyssail', affinity: 'tide', stage: 2, line: 'ripplet', evolvesFrom: 'neruvin', cost: 3, hp: 9, atk: 4, rarity: 'rare',
    text: 'Undertow: when this attacks, Stun the target. At the end of your turn, heal 1 to all your creatures.',
    triggers: [
      { when: 'attack', do: [{ op: 'status', to: 'attackTarget', s: 'stun', n: 1 }] },
      { when: 'turnEnd', do: [{ op: 'heal', to: 'allies', n: 1 }] },
    ] }),

  // ---------------------------------------------------------------- Grove (starter)
  C({ id: 'mossbit', name: 'Mossbit', affinity: 'grove', stage: 0, line: 'mossbit', cost: 1, hp: 4, atk: 1,
    keywords: { evolveDiscount: 1 },
    text: 'Sprout: evolving this costs 1 less.' }),
  C({ id: 'thornook', name: 'Thornook', affinity: 'grove', stage: 1, line: 'mossbit', evolvesFrom: 'mossbit', cost: 2, hp: 6, atk: 3, rarity: 'uncommon',
    keywords: { guard: true, evolveDiscount: 1 },
    text: 'Guard. Rootguard: when this evolves, it gains Shield 2. Evolving this costs 1 less.',
    triggers: [{ when: 'evolve', do: [{ op: 'status', to: 'self', s: 'shield', n: 2 }] }] }),
  C({ id: 'elderhorn', name: 'Elderhorn', affinity: 'grove', stage: 2, line: 'mossbit', evolvesFrom: 'thornook', cost: 4, hp: 10, atk: 4, rarity: 'rare',
    keywords: { guard: true },
    text: 'Guard. Ancient Growth: at the start of your turn, heal 2 to this and give your other creatures Shield 1.',
    triggers: [{ when: 'turnStart', do: [{ op: 'heal', to: 'self', n: 2 }, { op: 'status', to: 'otherAllies', s: 'shield', n: 1 }] }] }),

  // ---------------------------------------------------------------- Volt
  C({ id: 'zippip', name: 'Zippip', affinity: 'volt', stage: 0, line: 'zippip', cost: 1, hp: 2, atk: 2,
    keywords: { quick: true },
    text: 'Quick: can attack the turn it is summoned.' }),
  C({ id: 'arclyn', name: 'Arclyn', affinity: 'volt', stage: 1, line: 'zippip', evolvesFrom: 'zippip', cost: 2, hp: 4, atk: 3, rarity: 'uncommon',
    text: 'Chain: when this attacks, deal 1 damage to another enemy creature.',
    triggers: [{ when: 'attack', do: [{ op: 'damage', to: 'otherEnemyFirst', n: 1 }] }] }),
  C({ id: 'tempestrix', name: 'Tempestrix', affinity: 'volt', stage: 2, line: 'zippip', evolvesFrom: 'arclyn', cost: 3, hp: 7, atk: 4, rarity: 'rare',
    text: 'Storm Chain: when this attacks, deal 1 damage to each other enemy creature.',
    triggers: [{ when: 'attack', do: [{ op: 'damage', to: 'otherEnemies', n: 1 }] }] }),

  // ---------------------------------------------------------------- Stone
  C({ id: 'pebblit', name: 'Pebblit', affinity: 'stone', stage: 0, line: 'pebblit', cost: 2, hp: 5, atk: 1,
    keywords: { sturdy: 1 },
    text: 'Sturdy 1: takes 1 less damage from attacks.' }),
  C({ id: 'cragoon', name: 'Cragoon', affinity: 'stone', stage: 1, line: 'pebblit', evolvesFrom: 'pebblit', cost: 2, hp: 7, atk: 2, rarity: 'uncommon',
    keywords: { sturdy: 1, guard: true },
    text: 'Guard. Sturdy 1.' }),
  C({ id: 'monolithor', name: 'Monolithor', affinity: 'stone', stage: 2, line: 'pebblit', evolvesFrom: 'cragoon', cost: 4, hp: 11, atk: 3, rarity: 'rare',
    keywords: { sturdy: 2, guard: true },
    text: 'Guard. Sturdy 2.' }),

  // ---------------------------------------------------------------- Veil
  C({ id: 'wispin', name: 'Wispin', affinity: 'veil', stage: 0, line: 'wispin', cost: 1, hp: 2, atk: 1,
    text: 'Fade: when summoned, Hex the strongest enemy creature.',
    triggers: [{ when: 'summon', do: [{ op: 'status', to: 'enemyStrongest', s: 'hex', n: 1 }] }] }),
  C({ id: 'mirravel', name: 'Mirravel', affinity: 'veil', stage: 1, line: 'wispin', evolvesFrom: 'wispin', cost: 2, hp: 5, atk: 2, rarity: 'uncommon',
    text: 'Distort: when this attacks, Hex the target.',
    triggers: [{ when: 'attack', do: [{ op: 'status', to: 'attackTarget', s: 'hex', n: 1 }] }] }),
  C({ id: 'noctilume', name: 'Noctilume', affinity: 'veil', stage: 2, line: 'wispin', evolvesFrom: 'mirravel', cost: 3, hp: 8, atk: 4, rarity: 'rare',
    text: 'Night Veil: when this evolves, Hex all enemies. Attacks against a Hexed creature deal 2 more damage.',
    keywords: { bonusVsHexed: 2 },
    triggers: [{ when: 'evolve', do: [{ op: 'status', to: 'enemies', s: 'hex', n: 1 }] }] }),

  // ---------------------------------------------------------------- Tide (2nd line)
  C({ id: 'shellip', name: 'Shellip', affinity: 'tide', stage: 0, line: 'shellip', cost: 1, hp: 4, atk: 1,
    text: 'Shell: arrives with Shield 1.',
    triggers: [{ when: 'summon', do: [{ op: 'status', to: 'self', s: 'shield', n: 1 }] }] }),
  C({ id: 'corallop', name: 'Corallop', affinity: 'tide', stage: 1, line: 'shellip', evolvesFrom: 'shellip', cost: 2, hp: 6, atk: 2, rarity: 'uncommon',
    text: 'Reef: when this evolves, give Shield 2 to your most damaged creature.',
    triggers: [{ when: 'evolve', do: [{ op: 'status', to: 'allyLowest', s: 'shield', n: 2 }] }] }),
  C({ id: 'reefwarden', name: 'Reefwarden', affinity: 'tide', stage: 2, line: 'shellip', evolvesFrom: 'corallop', cost: 3, hp: 9, atk: 3, rarity: 'rare',
    keywords: { guard: true },
    text: 'Guard. At the end of your turn, give Shield 1 to each of your creatures.',
    triggers: [{ when: 'turnEnd', do: [{ op: 'status', to: 'allies', s: 'shield', n: 1 }] }] }),

  // ---------------------------------------------------------------- Grove (2nd line)
  C({ id: 'budwing', name: 'Budwing', affinity: 'grove', stage: 0, line: 'budwing', cost: 1, hp: 3, atk: 1,
    text: 'Pollinate: when summoned, draw a card if you control another Grove creature.',
    triggers: [{ when: 'summon', if: { controlsOther: 'grove' }, do: [{ op: 'draw', n: 1 }] }] }),
  C({ id: 'florafin', name: 'Florafin', affinity: 'grove', stage: 1, line: 'budwing', evolvesFrom: 'budwing', cost: 2, hp: 5, atk: 2, rarity: 'uncommon',
    text: 'Bloom: at the start of your turn, heal 1 to each of your creatures.',
    triggers: [{ when: 'turnStart', do: [{ op: 'heal', to: 'allies', n: 1 }] }] }),
  C({ id: 'canopyra', name: 'Canopyra', affinity: 'grove', stage: 2, line: 'budwing', evolvesFrom: 'florafin', cost: 4, hp: 8, atk: 4, rarity: 'rare',
    text: 'Canopy: when this evolves, heal 3 to all your creatures and draw a card.',
    triggers: [{ when: 'evolve', do: [{ op: 'heal', to: 'allies', n: 3 }, { op: 'draw', n: 1 }] }] }),

  // ---------------------------------------------------------------- Single-stage
  C({ id: 'kilnox', name: 'Kilnox', affinity: 'ember', stage: 0, line: 'kilnox', cost: 3, hp: 4, atk: 3, rarity: 'uncommon',
    text: 'Ash Burst: when summoned, deal 1 damage to each enemy creature.',
    triggers: [{ when: 'summon', do: [{ op: 'damage', to: 'enemies', n: 1 }] }] }),
  C({ id: 'drizzlet', name: 'Drizzlet', affinity: 'tide', stage: 0, line: 'drizzlet', cost: 2, hp: 4, atk: 2,
    text: 'Rainfall: when summoned, heal 2 to your Nexus.',
    triggers: [{ when: 'summon', do: [{ op: 'healNexus', who: 'self', n: 2 }] }] }),
  C({ id: 'briarimp', name: 'Briarimp', affinity: 'grove', stage: 0, line: 'briarimp', cost: 2, hp: 4, atk: 2,
    text: 'Last Seed: when defeated, give Shield 2 to your most damaged creature.',
    triggers: [{ when: 'defeated', do: [{ op: 'status', to: 'allyLowest', s: 'shield', n: 2 }] }] }),
  C({ id: 'coilisk', name: 'Coilisk', affinity: 'volt', stage: 0, line: 'coilisk', cost: 2, hp: 3, atk: 2,
    keywords: { quick: true },
    text: 'Quick. Static Coil: when this attacks, draw a card if the target is defeated.',
    triggers: [{ when: 'attackAfter', if: { targetDefeated: true }, do: [{ op: 'draw', n: 1 }] }] }),
  C({ id: 'cairnox', name: 'Cairnox', affinity: 'stone', stage: 0, line: 'cairnox', cost: 3, hp: 7, atk: 2, rarity: 'uncommon',
    keywords: { guard: true, sturdy: 1 },
    text: 'Guard. Sturdy 1.' }),
  C({ id: 'hushowl', name: 'Hushowl', affinity: 'veil', stage: 0, line: 'hushowl', cost: 2, hp: 3, atk: 2, rarity: 'uncommon',
    text: 'Silent Wing: when summoned, Stun the strongest enemy creature.',
    triggers: [{ when: 'summon', do: [{ op: 'status', to: 'enemyStrongest', s: 'stun', n: 1 }] }] }),

  // ---------------------------------------------------------------- Legendary (mission rewards only)
  C({ id: 'aurivane', name: 'Aurivane', affinity: 'grove', stage: 0, line: 'aurivane', cost: 6, hp: 9, atk: 4, rarity: 'legendary', maxCopies: 1, legendary: true,
    text: 'Renewal: when summoned, heal 3 to your Nexus and 2 to your creatures. At the start of your turn, gain 1 extra Essence.',
    triggers: [
      { when: 'summon', do: [{ op: 'healNexus', who: 'self', n: 3 }, { op: 'heal', to: 'otherAllies', n: 2 }] },
      { when: 'turnStart', do: [{ op: 'gainEssence', n: 1 }] },
    ] }),
  C({ id: 'noxeral', name: 'Noxeral', affinity: 'veil', stage: 0, line: 'noxeral', cost: 6, hp: 10, atk: 4, rarity: 'legendary', maxCopies: 1, legendary: true,
    text: 'Memory: when summoned, return the last creature in your discard pile to your hand. When this attacks, Hex the target.',
    triggers: [
      { when: 'summon', do: [{ op: 'recover', n: 1 }] },
      { when: 'attack', do: [{ op: 'status', to: 'attackTarget', s: 'hex', n: 1 }] },
    ] }),
  C({ id: 'concordia', name: 'Concordia', affinity: 'stone', stage: 0, line: 'concordia', cost: 6, hp: 8, atk: 3, rarity: 'legendary', maxCopies: 1, legendary: true,
    keywords: { harmony: true },
    text: 'Harmony: +1 attack and +1 HP for each different affinity among your other creatures.' }),

  // ================================================================ Techniques
  // Ember
  T({ id: 't_flare', name: 'Flare', affinity: 'ember', cost: 2, target: 'enemyCreature', text: 'Deal 2 damage to an enemy creature.',
    triggers: [{ when: 'play', do: [{ op: 'damage', to: 'target', n: 2 }] }] }),
  T({ id: 't_ignite', name: 'Ignite', affinity: 'ember', cost: 1, target: 'enemyCreature', text: 'Give an enemy creature Burn 2.',
    triggers: [{ when: 'play', do: [{ op: 'status', to: 'target', s: 'burn', n: 2 }] }] }),
  T({ id: 't_wildfire', name: 'Wildfire', affinity: 'ember', cost: 4, rarity: 'uncommon', text: 'Deal 1 damage to each enemy creature, then give them Burn 1.',
    triggers: [{ when: 'play', do: [{ op: 'damage', to: 'enemies', n: 1 }, { op: 'status', to: 'enemies', s: 'burn', n: 1 }] }] }),
  T({ id: 't_heat_rush', name: 'Heat Rush', affinity: 'ember', cost: 1, target: 'allyCreature', text: 'Your creature gets +2 attack this turn.',
    triggers: [{ when: 'play', do: [{ op: 'buffAtk', to: 'target', n: 2, until: 'turn' }] }] }),
  // Tide
  T({ id: 't_mend', name: 'Mend', affinity: 'tide', cost: 1, target: 'allyCreature', text: 'Heal 3 to your creature.',
    triggers: [{ when: 'play', do: [{ op: 'heal', to: 'target', n: 3 }] }] }),
  T({ id: 't_riptide', name: 'Riptide', affinity: 'tide', cost: 2, target: 'enemyCreature', text: 'Stun an enemy creature.',
    triggers: [{ when: 'play', do: [{ op: 'status', to: 'target', s: 'stun', n: 1 }] }] }),
  T({ id: 't_tidal_renewal', name: 'Tidal Renewal', affinity: 'tide', cost: 3, rarity: 'uncommon', text: 'Heal 2 to all your creatures and 2 to your Nexus.',
    triggers: [{ when: 'play', do: [{ op: 'heal', to: 'allies', n: 2 }, { op: 'healNexus', who: 'self', n: 2 }] }] }),
  T({ id: 't_undercurrent', name: 'Undercurrent', affinity: 'tide', cost: 2, rarity: 'uncommon', target: 'enemyBasic', text: "Return an enemy basic creature to its owner's hand.",
    triggers: [{ when: 'play', do: [{ op: 'bounce', to: 'target' }] }] }),
  // Grove
  T({ id: 't_overgrowth', name: 'Overgrowth', affinity: 'grove', cost: 2, target: 'allyCreature', text: 'Your creature gets +2 max HP permanently and heals 2.',
    triggers: [{ when: 'play', do: [{ op: 'maxHp', to: 'target', n: 2 }, { op: 'heal', to: 'target', n: 2 }] }] }),
  T({ id: 't_bramble_wall', name: 'Bramble Wall', affinity: 'grove', cost: 1, target: 'allyCreature', text: 'Give your creature Shield 3.',
    triggers: [{ when: 'play', do: [{ op: 'status', to: 'target', s: 'shield', n: 3 }] }] }),
  T({ id: 't_seed_search', name: 'Seed Search', affinity: 'grove', cost: 1, text: 'Put an evolution card for one of your creatures from your deck into your hand.',
    triggers: [{ when: 'play', do: [{ op: 'searchEvolution' }] }] }),
  T({ id: 't_wild_growth', name: 'Wild Growth', affinity: 'grove', cost: 2, rarity: 'uncommon', text: 'Draw 2 cards.',
    triggers: [{ when: 'play', do: [{ op: 'draw', n: 2 }] }] }),
  // Volt
  T({ id: 't_spark_step', name: 'Spark Step', affinity: 'volt', cost: 1, target: 'allyCreature', text: 'Draw a card. Your creature gets +1 attack this turn.',
    triggers: [{ when: 'play', do: [{ op: 'draw', n: 1 }, { op: 'buffAtk', to: 'target', n: 1, until: 'turn' }] }] }),
  T({ id: 't_static_bolt', name: 'Static Bolt', affinity: 'volt', cost: 2, target: 'enemyCreature', text: 'Deal 1 damage to an enemy creature and 1 to the enemy Nexus.',
    triggers: [{ when: 'play', do: [{ op: 'damage', to: 'target', n: 1 }, { op: 'damageNexus', who: 'enemy', n: 1 }] }] }),
  T({ id: 't_thunderclap', name: 'Thunderclap', affinity: 'volt', cost: 4, rarity: 'uncommon', target: 'enemyCreature', text: 'Deal 4 damage to an enemy creature.',
    triggers: [{ when: 'play', do: [{ op: 'damage', to: 'target', n: 4 }] }] }),
  T({ id: 't_recharge', name: 'Recharge', affinity: 'volt', cost: 0, rarity: 'uncommon', text: 'Gain 1 Essence this turn.',
    triggers: [{ when: 'play', do: [{ op: 'gainEssence', n: 1 }] }] }),
  // Stone
  T({ id: 't_fortify', name: 'Fortify', affinity: 'stone', cost: 1, target: 'allyCreature', text: 'Give your creature Shield 2. Draw a card if it has Guard.',
    triggers: [{ when: 'play', do: [{ op: 'status', to: 'target', s: 'shield', n: 2 }, { op: 'draw', n: 1, if: { targetHasGuard: true } }] }] }),
  T({ id: 't_rockfall', name: 'Rockfall', affinity: 'stone', cost: 3, target: 'enemyCreature', text: 'Deal 3 damage to an enemy creature.',
    triggers: [{ when: 'play', do: [{ op: 'damage', to: 'target', n: 3 }] }] }),
  T({ id: 't_bedrock', name: 'Bedrock', affinity: 'stone', cost: 2, rarity: 'uncommon', target: 'allyCreature', text: 'Your creature gains Sturdy 1 permanently.',
    triggers: [{ when: 'play', do: [{ op: 'grantSturdy', to: 'target', n: 1 }] }] }),
  T({ id: 't_earthen_wall', name: 'Earthen Wall', affinity: 'stone', cost: 3, rarity: 'uncommon', text: 'Give Shield 2 to each of your creatures.',
    triggers: [{ when: 'play', do: [{ op: 'status', to: 'allies', s: 'shield', n: 2 }] }] }),
  // Veil
  T({ id: 't_hex_mark', name: 'Hex Mark', affinity: 'veil', cost: 1, target: 'enemyCreature', text: 'Hex an enemy creature and draw a card.',
    triggers: [{ when: 'play', do: [{ op: 'status', to: 'target', s: 'hex', n: 1 }, { op: 'draw', n: 1 }] }] }),
  T({ id: 't_fates_coin', name: "Fate's Coin", affinity: 'veil', cost: 1, target: 'enemyCreature', text: 'Flip a coin. Heads: deal 3 damage to an enemy creature. Tails: deal 1 damage to your own Nexus.',
    triggers: [{ when: 'play', do: [{ op: 'coin', heads: [{ op: 'damage', to: 'target', n: 3 }], tails: [{ op: 'damageNexus', who: 'self', n: 1 }] }] }] }),
  T({ id: 't_veilstep', name: 'Veilstep', affinity: 'veil', cost: 1, target: 'allyCreature', text: 'Return your creature (with its evolutions) to your hand.',
    triggers: [{ when: 'play', do: [{ op: 'bounce', to: 'target' }] }] }),
  T({ id: 't_dread', name: 'Dread', affinity: 'veil', cost: 3, rarity: 'uncommon', text: 'Hex all enemy creatures.',
    triggers: [{ when: 'play', do: [{ op: 'status', to: 'enemies', s: 'hex', n: 1 }] }] }),

  // ================================================================ Relics
  R({ id: 'r_ember_fang', name: 'Ember Fang', affinity: 'ember', cost: 1, mods: { atk: 1 }, text: '+1 attack.' }),
  R({ id: 'r_coal_charm', name: 'Coal Charm', affinity: 'ember', cost: 2, text: 'When the holder attacks, the target gains Burn 1.',
    triggers: [{ when: 'attack', do: [{ op: 'status', to: 'attackTarget', s: 'burn', n: 1 }] }] }),
  R({ id: 'r_pearl_band', name: 'Pearl Band', affinity: 'tide', cost: 1, mods: { hp: 2 }, text: '+2 max HP.' }),
  R({ id: 'r_tide_shell', name: 'Tide Shell', affinity: 'tide', cost: 2, text: 'At the end of your turn, heal 1 to the holder.',
    triggers: [{ when: 'turnEnd', do: [{ op: 'heal', to: 'holder', n: 1 }] }] }),
  R({ id: 'r_leaf_cloak', name: 'Leaf Cloak', affinity: 'grove', cost: 1, text: 'When equipped, the holder gains Shield 2.',
    triggers: [{ when: 'equip', do: [{ op: 'status', to: 'holder', s: 'shield', n: 2 }] }] }),
  R({ id: 'r_heartwood', name: 'Heartwood', affinity: 'grove', cost: 2, mods: { hp: 3 }, rarity: 'rare', text: '+3 max HP.' }),
  R({ id: 'r_spark_plug', name: 'Spark Plug', affinity: 'volt', cost: 1, mods: { quick: true }, text: 'The holder gains Quick.' }),
  R({ id: 'r_storm_coil', name: 'Storm Coil', affinity: 'volt', cost: 2, rarity: 'rare', text: 'When the holder attacks, deal 1 damage to the enemy Nexus.',
    triggers: [{ when: 'attack', do: [{ op: 'damageNexus', who: 'enemy', n: 1 }] }] }),
  R({ id: 'r_granite_plate', name: 'Granite Plate', affinity: 'stone', cost: 2, mods: { sturdy: 1 }, text: 'Sturdy 1.' }),
  R({ id: 'r_bastion_crest', name: 'Bastion Crest', affinity: 'stone', cost: 1, mods: { guard: true, hp: 1 }, text: 'The holder gains Guard and +1 max HP.' }),
  R({ id: 'r_mirror_mask', name: 'Mirror Mask', affinity: 'veil', cost: 1, text: 'When the holder attacks, Hex the target.',
    triggers: [{ when: 'attack', do: [{ op: 'status', to: 'attackTarget', s: 'hex', n: 1 }] }] }),
  R({ id: 'r_shadow_lantern', name: 'Shadow Lantern', affinity: 'veil', cost: 2, rarity: 'rare', text: 'When the holder is defeated, draw 2 cards.',
    triggers: [{ when: 'defeated', do: [{ op: 'draw', n: 2 }] }] }),
  R({ id: 'r_academy_badge', name: 'Academy Badge', affinity: 'neutral', cost: 1, mods: { atk: 1, hp: 1 }, rarity: 'common', text: '+1 attack and +1 max HP.' }),
  R({ id: 'r_bond_ribbon', name: 'Bond Ribbon', affinity: 'neutral', cost: 2, rarity: 'rare', text: 'At the start of your turn, heal 1 to your Nexus.',
    triggers: [{ when: 'turnStart', do: [{ op: 'healNexus', who: 'self', n: 1 }] }] }),
  R({ id: 'r_essence_lens', name: 'Essence Lens', affinity: 'neutral', cost: 2, rarity: 'rare', text: 'When equipped, draw a card.',
    triggers: [{ when: 'equip', do: [{ op: 'draw', n: 1 }] }] }),

  // ================================================================ Terrains (one global terrain)
  L({ id: 'l_caldera', name: 'Ember Caldera', affinity: 'ember', cost: 2, terrain: { atk: { ember: 1 } }, text: 'Ember creatures have +1 attack.' }),
  L({ id: 'l_tidal_basin', name: 'Tidal Basin', affinity: 'tide', cost: 2, terrain: { endHeal: { tide: 1 } }, text: 'At the end of each turn, Tide creatures of the active player heal 1.' }),
  L({ id: 'l_verdant_glade', name: 'Verdant Glade', affinity: 'grove', cost: 2, terrain: { hp: { grove: 1 } }, text: 'Grove creatures have +1 max HP.' }),
  L({ id: 'l_storm_plateau', name: 'Storm Plateau', affinity: 'volt', cost: 2, terrain: { quick: { volt: true } }, text: 'Volt creatures have Quick.' }),
  L({ id: 'l_stone_bastion', name: 'Stone Bastion', affinity: 'stone', cost: 2, terrain: { sturdy: { stone: 1 } }, text: 'Stone creatures have +1 Sturdy.' }),
  L({ id: 'l_veil_fog', name: 'Veil Fog', affinity: 'veil', cost: 2, terrain: { atk: { veil: 1 }, hp: { veil: -1 } }, text: 'Veil creatures have +1 attack and -1 max HP.' }),
  L({ id: 'l_academy_arena', name: 'Academy Arena', affinity: 'neutral', cost: 1, rarity: 'common', terrain: { evolveDiscount: 1 }, text: 'Evolving costs 1 less (minimum 1).' }),
  L({ id: 'l_silent_field', name: 'Silent Field', affinity: 'neutral', cost: 3, rarity: 'rare', terrain: { noHeal: true }, text: 'Creatures and Nexus cannot be healed.' }),
];

export const CARDS = Object.fromEntries(list.map((c) => [c.id, c]));
export const CARD_LIST = list;

export function card(id) {
  const c = CARDS[id];
  if (!c) throw new Error(`Unknown card ${id}`);
  return c;
}

export const isBasicCreature = (c) => c.type === 'creature' && c.stage === 0;
