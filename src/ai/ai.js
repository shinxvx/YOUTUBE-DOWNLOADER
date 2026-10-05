// Duel AI. It plays by the same rules (it only uses legalActions / apply) and
// evaluates positions using public information plus its own hand: the
// opponent's hand and both decks' order are never read by the evaluation, and
// simulated coin flips use a scrambled RNG so the AI cannot foresee them.
import { CARDS } from '../content/cards.js';
import {
  legalActions, apply, cloneDuel, hp, atk, hasGuard, topCard, HAND_LIMIT,
} from '../engine/duel.js';

export const PROFILES = {
  // tutorial-level: misses plays, attacks plainly
  novice: { nexus: 1.0, board: 1.0, hand: 0.6, noise: 2.5, skipChance: 0.25 },
  balanced: { nexus: 1.2, board: 1.0, hand: 0.7, noise: 0.6, skipChance: 0.05 },
  aggressive: { nexus: 1.8, board: 0.8, hand: 0.5, noise: 0.4, skipChance: 0.03 },
  defensive: { nexus: 1.0, board: 1.3, hand: 0.8, noise: 0.4, skipChance: 0.03 },
  expert: { nexus: 1.4, board: 1.1, hand: 0.8, noise: 0, skipChance: 0 },
};

function creatureValue(s, p, c, w) {
  const d = topCard(c);
  const h = hp(s, p, c);
  if (h <= 0) return 0;
  let v = atk(s, p, c) * 1.4 + h * 0.9 + c.status.shield * 0.5 + d.stage * 0.8;
  if (hasGuard(c)) v += 0.8;
  if (c.relic) v += 0.6;
  v -= c.status.burn * 0.6 + c.status.stun * 1.2 + c.status.hex * 0.6;
  v += (d.triggers ? d.triggers.length : 0) * 0.5;
  return v * w.board;
}

export function evaluate(s, p, w = PROFILES.balanced) {
  if (s.winner === p) return 10000;
  if (s.winner === 'draw') return -500;
  if (s.winner !== null) return -10000;
  const me = s.players[p];
  const foe = s.players[1 - p];
  let v = 0;
  // Nexus damage matters more as a Nexus gets low.
  const nexusScore = (n) => n + Math.max(0, 8 - n) * 0.6;
  v += (nexusScore(me.nexus) * 0.8 - nexusScore(foe.nexus)) * w.nexus;
  for (const c of me.field) if (c) v += creatureValue(s, p, c, w);
  for (const c of foe.field) if (c) v -= creatureValue(s, 1 - p, c, w);
  v += Math.min(me.hand.length, HAND_LIMIT) * w.hand;
  v -= foe.hand.length * 0.3; // public count only
  return v;
}

function simulate(s, a, salt) {
  const c = cloneDuel(s);
  c.rng = (c.rng ^ (0x9e3779b9 + salt * 7919)) >>> 0;
  const r = apply(c, a);
  return r.ok ? c : null;
}

function pickDiscards(s, p) {
  const pl = s.players[p];
  const need = pl.hand.length - HAND_LIMIT;
  const scored = pl.hand.map((h) => {
    const d = CARDS[h.id];
    let v = d.cost;
    if (d.type === 'creature' && d.stage === 0) v += 2;
    if (d.type === 'creature' && d.stage > 0 && !pl.field.some((c) => c && topCard(c).id === d.evolvesFrom)) v -= 2;
    return { uid: h.uid, v };
  });
  scored.sort((a, b) => a.v - b.v);
  return scored.slice(0, need).map((x) => x.uid);
}

// rand: () => number in [0,1). Kept outside the duel RNG so AI noise never
// changes the duel's own random sequence.
export function chooseAction(s, p, profileName = 'balanced', rand = Math.random) {
  const w = PROFILES[profileName] || PROFILES.balanced;
  if (s.phase === 'mulligan') {
    const basics = s.players[p].hand.filter((h) => CARDS[h.id].type === 'creature' && CARDS[h.id].stage === 0).length;
    return { type: 'mulligan', p, redraw: basics === 0 };
  }
  if (s.phase === 'discard') return { type: 'discard', p, uids: pickDiscards(s, p) };

  const actions = legalActions(s);
  const base = evaluate(s, p, w);
  const plays = actions.filter((a) => a.type !== 'attack' && a.type !== 'endTurn');
  const attacks = actions.filter((a) => a.type === 'attack');

  const score = (list) => list
    .map((a, i) => {
      const n = simulate(s, a, i + s.turn * 31);
      return n ? { a, v: evaluate(n, p, w) + (w.noise ? (rand() - 0.5) * w.noise : 0) } : null;
    })
    .filter(Boolean)
    .sort((x, y) => y.v - x.v);

  // Card plays first: attacking ends the chance to play cards this turn.
  if (s.phase === 'main' && plays.length && rand() >= w.skipChance) {
    const best = score(plays)[0];
    if (best && best.v > base + 0.25) return best.a;
  }
  if (attacks.length) {
    const best = score(attacks)[0];
    if (best && best.v >= base - 0.01) return best.a;
  }
  return { type: 'endTurn', p };
}
