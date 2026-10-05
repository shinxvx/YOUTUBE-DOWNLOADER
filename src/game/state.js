// Campaign state: calendar, flags, collection, decks, friendships, quests.
// This object is what gets saved (see src/save/save.js).
import { STARTER_DECKS } from '../content/decks.js';
import { CARDS } from '../content/cards.js';
import { PERIODS } from '../content/world.js';

export const SAVE_VERSION = 1;

export function newGame(name) {
  return {
    version: SAVE_VERSION,
    name: name || 'Aster',
    partner: null,
    day: 1,
    period: 0,
    chapter: 1,
    license: 'none',
    coins: 0,
    flags: {}, // flag -> day it was set
    collection: {},
    registered: {},
    decks: [
      { name: 'Deck 1', cards: [] },
      { name: 'Deck 2', cards: [] },
      { name: 'Deck 3', cards: [] },
    ],
    activeDeck: 0,
    friendship: {},
    quests: {},
    messages: [],
    stats: { wins: 0, losses: 0, draws: 0 },
    playtime: 0,
    location: 'port',
  };
}

// Save-format migrations run in order when loading older saves.
const MIGRATIONS = {
  // 1 -> 2: (example for the future) add fields with defaults
};

export function migrate(data) {
  let d = data;
  while (d.version < SAVE_VERSION) {
    const m = MIGRATIONS[d.version];
    d = m ? m(d) : { ...d };
    d.version += 1;
  }
  // tolerate missing fields from older builds
  const fresh = newGame(d.name);
  for (const k of Object.keys(fresh)) if (d[k] === undefined) d[k] = fresh[k];
  return d;
}

export const hasFlag = (g, f) => g.flags[f] !== undefined;
export function setFlag(g, f) {
  if (!hasFlag(g, f)) g.flags[f] = g.day;
}

export function addCards(g, cards) {
  for (const [id, n] of Object.entries(cards)) {
    if (!CARDS[id]) continue;
    g.collection[id] = (g.collection[id] || 0) + n;
    if (CARDS[id].type === 'creature') g.registered[id] = true;
  }
}

export function choosePartner(g, partnerId) {
  g.partner = partnerId;
  const deck = STARTER_DECKS[partnerId];
  const counts = {};
  for (const id of deck) counts[id] = (counts[id] || 0) + 1;
  addCards(g, counts);
  g.decks[0] = { name: `${CARDS[partnerId].name} Deck`, cards: [...deck] };
  g.activeDeck = 0;
}

export function periodName(g) {
  return PERIODS[g.period];
}

// Spend periods. Returns true if a new day started.
export function advanceTime(g, n = 1) {
  let newDay = false;
  for (let i = 0; i < n; i++) {
    g.period += 1;
    if (g.period > 2) {
      g.period = 0;
      g.day += 1;
      newDay = true;
    }
  }
  return newDay;
}

export function rest(g) {
  g.period = 0;
  g.day += 1;
}

export const LICENSES = { none: 'No license', initiate: 'Initiate', adept: 'Adept', master: 'Nexus Master' };

export function saveMeta(g) {
  return {
    name: g.name,
    day: g.day,
    period: g.period,
    chapter: g.chapter,
    license: g.license,
    partner: g.partner,
    playtime: Math.floor(g.playtime),
    savedAt: Date.now(),
  };
}
