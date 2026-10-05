// Skill definitions. kind: 'cadence' spends Focus, 'veil' raises Veil Strain.
// target: 'enemy' | 'allEnemies' | 'self' | 'ally'
// dawnstone: the hit disrupts vampiric regeneration (Alvor Blade energy).

export const SKILLS = {
  attack: {
    name: 'Attack', kind: 'basic', target: 'enemy', power: 1.0, break: 10,
    desc: 'A plain strike with your weapon.',
  },
  ember_cut: {
    school: 'Cadence of the Pale Ember', name: 'Ember Cut', kind: 'cadence', cost: { focus: 4 }, target: 'enemy', power: 1.55, break: 24, element: 'ember',
    desc: 'Cadence of the Pale Ember. A controlled violet-white slash that cracks an enemy\'s Resolve.',
  },
  pale_return: {
    school: 'Cadence of the Pale Ember', name: 'Pale Return', kind: 'cadence', cost: { focus: 3 }, target: 'self', effect: 'counterStance',
    desc: 'Settle into a guarded stance. Halves the next hit and answers it with a counter-slash.',
  },
  seal_rend: {
    school: 'Veil Arts', name: 'Seal Rend', kind: 'veil', cost: { strain: 22 }, target: 'enemy', power: 1.2, break: 16, suppress: 2,
    anchorBonus: 2, requiresStage: 1,
    desc: 'Veil Art. Tears at the blood beneath the flesh, suppressing regeneration for 2 turns. Strong against blood anchors.',
  },
  veilpiercer: {
    school: 'Veil Arts', name: 'Veilpiercer', kind: 'veil', cost: { strain: 34 }, target: 'enemy', power: 2.3, break: 38, requiresStage: 1,
    desc: 'Veil Art. Channels the mark through the blade in a single piercing line. Heavy damage and Resolve break.',
  },
  ashen_arc: {
    school: 'Cadence of the Ashen Sun', name: 'Ashen Arc', kind: 'cadence', cost: { focus: 6 }, target: 'enemy', power: 1.7, break: 20, status: { burn: 3 },
    dawnstone: true, anchorBonus: 1.5,
    desc: 'Cadence of the Ashen Sun. White flame that strips regeneration and leaves a Burn.',
  },
  white_funeral: {
    school: 'Cadence of the Ashen Sun', name: 'White Funeral', kind: 'cadence', cost: { focus: 14 }, target: 'allEnemies', power: 1.15, break: 14,
    dawnstone: true, effect: 'sealField', anchorBonus: 1.5,
    desc: 'Elara\'s signature. A ring of pale flame that seals the battlefield: blood anchors cannot mend and all regeneration is suppressed for 2 turns.',
  },
};

export const STATUS_INFO = {
  bleed: { name: 'Bleed', color: '#ff6b6b', desc: 'Loses a little HP at the start of each turn. Cured by salves or by waiting it out.' },
  burn: { name: 'Burn', color: '#ffb347', desc: 'White flame. Loses HP each turn and cannot regenerate while burning.' },
  suppressed: { name: 'Suppressed', color: '#c9a0ff', desc: 'Regeneration is disabled for the shown number of turns.' },
  staggered: { name: 'Staggered', color: '#f2c14e', desc: 'Resolve broken. Loses its next action and takes 50% more damage.' },
  guard: { name: 'Guard', color: '#9fd3ff', desc: 'Takes half damage until the next turn.' },
  counter: { name: 'Pale Return', color: '#e9e3ff', desc: 'Halves the next hit and counter-attacks.' },
  marked: { name: 'Hunted', color: '#ff8a80', desc: 'A predator has chosen this target. Guard before it strikes.' },
  strained: { name: 'Strained', color: '#c27bff', desc: 'Veil Strain 70+. Defense lowered and Veil Arts cost more. Guard to recover.' },
};
