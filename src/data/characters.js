// Playable party and guest combatant definitions. Stable ids are used by saves.
// Stats: hp, focus, atk, def, spd, res. Growth is added per level above 1.

export const CHARACTERS = {
  kai: {
    id: 'kai',
    name: 'Kai',
    role: 'Sealbreaker',
    portrait: 'kai',
    battle: 'kai_battle',
    overworld: 'kai_overworld',
    base: { hp: 120, focus: 20, atk: 16, def: 8, spd: 11, res: 8 },
    growth: { hp: 14, focus: 2, atk: 2.2, def: 1.2, spd: 0.5, res: 1.1 },
    cadence: ['ember_cut', 'pale_return'],
    veil: ['seal_rend', 'veilpiercer'],
    bio: 'Nineteen. White hair, violet eyes, and a dark-violet mark from his left shoulder across his chest that aches when the nights grow long. Raised by Hana in Emberfall. Observant, protective, occasionally sarcastic.',
  },
  lyra_fen: {
    id: 'lyra_fen',
    name: 'Lyra Fen',
    role: 'Storm Duelist',
    portrait: 'lyra_fen',
    battle: 'lyra_fen_battle',
    overworld: 'lyra_fen_overworld',
    base: { hp: 105, focus: 22, atk: 15, def: 7, spd: 14, res: 7 },
    growth: { hp: 12, focus: 2, atk: 2, def: 1, spd: 0.7, res: 1 },
    cadence: [],
    bio: 'Daigo\'s apprentice. Energetic, blunt, and determined to earn a Dawncrowned seat.',
  },
  eren_sol: {
    id: 'eren_sol',
    name: 'Eren Sol',
    role: 'Memory Exorcist',
    portrait: 'eren_sol',
    battle: 'eren_sol_battle',
    overworld: 'eren_sol_overworld',
    base: { hp: 95, focus: 28, atk: 12, def: 7, spd: 10, res: 12 },
    growth: { hp: 11, focus: 3, atk: 1.6, def: 1, spd: 0.4, res: 1.5 },
    cadence: [],
    bio: 'Soren\'s apprentice. Anxious, observant, unexpectedly stubborn.',
  },
  mira_thorn: {
    id: 'mira_thorn',
    name: 'Mira Thorn',
    role: 'Field Medic',
    portrait: 'mira_thorn',
    battle: 'mira_thorn_battle',
    overworld: 'mira_thorn_overworld',
    base: { hp: 100, focus: 26, atk: 13, def: 8, spd: 11, res: 10 },
    growth: { hp: 12, focus: 3, atk: 1.7, def: 1.1, spd: 0.5, res: 1.3 },
    cadence: [],
    bio: 'Kai\'s childhood friend and Hana\'s apprentice. Practical, warm, and stubborn about other people\'s choices.',
  },
  // Guest: story ally with a fixed level. Not a permanent party member.
  elara_ashen: {
    id: 'elara_ashen',
    name: 'Elara',
    fullName: 'Elara Ashen',
    role: 'Second Seat — The White Inferno',
    guest: true,
    portrait: 'elara_ashen',
    battle: 'elara_ashen_battle',
    overworld: 'elara_ashen_overworld',
    base: { hp: 340, focus: 40, atk: 27, def: 15, spd: 12, res: 14 },
    growth: { hp: 0, focus: 0, atk: 0, def: 0, spd: 0, res: 0 },
    cadence: ['ashen_arc', 'white_funeral'],
    bio: 'Second Seat of the Dawncrowned. Blunt, warm in private, and carrying burn scars on one forearm.',
  },
};

// Named NPCs that appear in dialogue (portrait keys match manifest portraits).
export const SPEAKERS = {
  kai: { name: 'Kai', portrait: 'kai', color: '#e9e3ff' },
  mira: { name: 'Mira', portrait: 'mira_thorn', color: '#ffd2c2' },
  hana: { name: 'Hana', portrait: 'hana_thorn', color: '#ffe4b5' },
  nell: { name: 'Nell', portrait: 'nell', color: '#d8f0c8' },
  corin: { name: 'Corin', portrait: 'corin', color: '#c8e0f0' },
  elara: { name: 'Elara', portrait: 'elara_ashen', color: '#ffffff' },
  lyra: { name: 'Lyra', portrait: 'lyra_fen', color: '#cfe3ff' },
  garran: { name: 'Garran', portrait: 'garran', color: '#ffb36b' },
  villager: { name: 'Villager', portrait: null, color: '#d7d0c0' },
  voice: { name: '???', portrait: null, color: '#c9a0ff' },
  narrator: { name: null, portrait: null, color: '#efe6d2' },
};

export const XP_CURVE = level => Math.round(40 * Math.pow(level, 1.55));
export const MAX_LEVEL = 20;
