import { CHARACTERS, XP_CURVE, MAX_LEVEL } from '../data/characters.js';
import { SAVE_VERSION } from '../config.js';

// Seal Stage is narrative and only advances at scripted events.
export const SEAL_STAGES = ['Dormant', 'Awakening', 'Fracture', 'Dominion', 'Pale Scar'];

function makeMember(id, level = 1) {
  const m = { id, level, xp: 0, hp: 0, focus: 0, equipment: {} };
  const s = memberStats(m);
  m.hp = s.hp;
  m.focus = s.focus;
  return m;
}

export function memberStats(m) {
  const def = CHARACTERS[m.id];
  const lv = m.level - 1;
  const out = {};
  for (const k of Object.keys(def.base)) out[k] = Math.round(def.base[k] + def.growth[k] * lv);
  return out;
}

function fresh() {
  return {
    version: SAVE_VERSION,
    chapter: 1,
    phase: 'dusk',
    map: 'emberfall',
    pos: { x: 790, y: 640, facing: 'down' },
    party: [makeMember('kai')],
    active: ['kai'],
    inventory: { tonic: 3, focus_draught: 1 },
    flags: {},
    defeated: {},
    objective: 'Repair the festival lantern fittings around the square.',
    sealStage: 0,
    weapon: 'Ceremonial Blade',
    journal: { lore: [], profiles: ['kai', 'mira_thorn', 'hana_thorn'] },
    tutorials: {},
    seenAnimations: {},
    playtime: 0,
    location: 'Emberfall',
  };
}

export const state = fresh();

export function newGame() {
  loadState(fresh());
}

export function loadState(data) {
  const base = fresh();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, base, structuredClone(data));
}

export function snapshot() {
  return structuredClone(state);
}

export const flag = (k) => !!state.flags[k];
export const setFlag = (k, v = true) => { state.flags[k] = v; };

export function member(id) {
  return state.party.find(m => m.id === id);
}

export function addItem(id, qty = 1) {
  state.inventory[id] = (state.inventory[id] || 0) + qty;
  if (state.inventory[id] <= 0) delete state.inventory[id];
}

export function addLore(id) {
  if (!state.journal.lore.includes(id)) state.journal.lore.push(id);
}

export function addProfile(id) {
  if (!state.journal.profiles.includes(id)) state.journal.profiles.push(id);
}

// Returns a list of level-up messages.
export function grantXp(amount) {
  const msgs = [];
  for (const m of state.party) {
    if (CHARACTERS[m.id].guest) continue;
    m.xp += amount;
    while (m.level < MAX_LEVEL && m.xp >= XP_CURVE(m.level)) {
      m.xp -= XP_CURVE(m.level);
      const before = memberStats(m);
      m.level += 1;
      const after = memberStats(m);
      m.hp += after.hp - before.hp;
      m.focus += after.focus - before.focus;
      msgs.push(`${CHARACTERS[m.id].name} reached level ${m.level}!`);
    }
  }
  return msgs;
}

export function restoreParty() {
  for (const m of state.party) {
    const s = memberStats(m);
    m.hp = s.hp;
    m.focus = s.focus;
  }
}

export function formatPlaytime(sec) {
  const h = Math.floor(sec / 3600);
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(Math.floor(sec % 60)).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
