// Every tactical challenge must be solvable within the turn.
import assert from 'node:assert/strict';
import { createDuel, apply, legalActions, cloneDuel } from '../src/engine/duel.js';
import { PUZZLES } from '../src/content/puzzles.js';

function solve(s, depth = 0, seen = { n: 0 }) {
  if (s.winner === 0) return [];
  if (s.winner !== null || s.active !== 0 || depth > 10) return null;
  for (const a of legalActions(s)) {
    if (a.type === 'endTurn') continue;
    if (++seen.n > 200000) return null;
    const c = cloneDuel(s);
    if (!apply(c, a).ok) continue;
    const rest = solve(c, depth + 1, seen);
    if (rest) return [a, ...rest];
  }
  return null;
}

function countWins(s, depth = 0) {
  if (s.winner === 0) return [1, 1];
  if (s.winner !== null || s.active !== 0 || depth > 10) return [0, 1];
  let w = 0;
  let t = 0;
  for (const a of legalActions(s)) {
    if (a.type === 'endTurn') continue;
    const c = cloneDuel(s);
    apply(c, a);
    const [cw, ct] = countWins(c, depth + 1);
    w += cw;
    t += ct;
  }
  return t ? [w, t] : [0, 1];
}

for (const pz of PUZZLES) {
  const s = createDuel({ decks: [pz.deck, pz.oppDeck], seed: 3, firstPlayer: pz.rules.firstPlayer, rules: pz.rules });
  assert.equal(s.active, 0, `${pz.id}: player should act first`);
  assert.equal(s.phase, 'main');
  const sol = solve(s);
  assert.ok(sol, `${pz.id} has no solution`);
  const [w, t] = countWins(s);
  console.log(`${pz.id}: solvable in ${sol.length} actions; ${w}/${t} lines win (${((100 * w) / t).toFixed(1)}%)`);
  assert.ok(w / t < 0.5, `${pz.id} is too easy`);
}
