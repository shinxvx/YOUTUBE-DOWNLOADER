// Authored encounters. Each placement has its own purpose; ids are stable for saves.
export const ENCOUNTERS = {
  ch1_tutorial: {
    name: 'The First Thrall',
    enemies: ['ash_thrall'],
    party: ['kai'],
    background: 'emberfall',
    music: 'battle',
    tutorial: 'basics',
    canFlee: false,
  },
  ch1_hound_bridge: {
    name: 'Hound on the Bridge',
    enemies: ['blood_hound'],
    background: 'emberfall',
    music: 'battle',
    tutorial: 'bleed',
  },
  ch1_pair_lower: {
    name: 'Lower Square',
    enemies: ['ash_thrall', 'blood_hound'],
    background: 'emberfall',
    music: 'battle',
    tutorial: 'priority',
  },
  ch1_stalker_stairs: {
    name: 'Shelter Stairs',
    enemies: ['gloom_stalker'],
    background: 'emberfall',
    music: 'battle',
    tutorial: 'telegraph',
  },
  ch1_garran: {
    name: 'Garran, The Lantern Eater',
    enemies: ['lantern_anchor', 'garran', 'lantern_anchor', 'lantern_anchor'],
    party: ['kai'],
    background: 'emberfall',
    music: 'boss',
    boss: true,
    tutorial: 'regen',
    canFlee: false,
    // Phase 1 is narrative: the ceremonial blade cannot stop his regeneration.
    // After Garran acts three times (or Kai falls low), the awakening scene runs.
    events: [
      { id: 'awakening', when: { enemyActions: { id: 'garran', count: 3 }, heroHpBelow: 0.35, enemyHpBelow: { id: 'garran', ratio: 0.5 } }, script: 'garran_awakening', protectParty: true },
    ],
    victoryScript: 'garran_defeated',
  },
};
