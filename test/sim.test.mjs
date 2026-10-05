// AI-vs-AI fuzzing: every duel must end, AI moves must stay legal, cards are
// never created or lost, and a decision must be quick.
import assert from 'node:assert/strict';
import { createDuel, apply, decider, FIELD_SLOTS } from '../src/engine/duel.js';
import { chooseAction } from '../src/ai/ai.js';
import { STARTER_DECKS, NPC_DECKS } from '../src/content/decks.js';

const decks = { ...STARTER_DECKS, ...NPC_DECKS };
const names = Object.keys(decks);
const profiles = ['novice', 'balanced', 'aggressive', 'defensive', 'expert'];

function countCards(s, p) {
  const pl = s.players[p];
  let n = pl.deck.length + pl.hand.length + pl.discard.length;
  for (const c of pl.field) if (c) n += c.stack.length + (c.relic ? 1 : 0);
  if (s.terrain && s.terrain.owner === p) n += 1;
  return n;
}

let rngState = 12345;
const rand = () => ((rngState = (rngState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const results = {};
let games = 0;
let slowest = 0;
const N = Number(process.env.SIM_GAMES || 120);
for (let g = 0; g < N; g++) {
  const a = names[g % names.length];
  const b = names[(g * 3 + 1) % names.length];
  const s = createDuel({ decks: [decks[a], decks[b]], seed: 1000 + g });
  const prof = [profiles[g % profiles.length], profiles[(g + 2) % profiles.length]];
  let steps = 0;
  while (s.winner === null) {
    const p = decider(s);
    const t0 = performance.now();
    const act = chooseAction(s, p, prof[p], rand);
    slowest = Math.max(slowest, performance.now() - t0);
    const r = apply(s, act);
    assert.ok(r.ok, `illegal AI move ${JSON.stringify(act)}: ${r.reason}`);
    for (const q of [0, 1]) {
      assert.equal(countCards(s, q), 30, `card count broke for player ${q} after ${act.type}`);
      assert.ok(s.players[q].field.length === FIELD_SLOTS);
      assert.ok(s.players[q].essence >= 0, 'negative essence');
    }
    if (++steps > 3000) throw new Error(`duel ${g} did not finish (${a} vs ${b})`);
  }
  assert.ok(s.turn < 120, `duel ${g} took ${s.turn} turns`);
  const key = `${a} vs ${b}`;
  results[key] = results[key] || [0, 0, 0];
  results[key][s.winner === 'draw' ? 2 : s.winner]++;
  games++;
}
console.log(`sim: ${games} AI duels finished, slowest decision ${slowest.toFixed(1)} ms`);
if (process.env.SIM_VERBOSE) console.log(results);
