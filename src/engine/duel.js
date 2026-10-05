// Rules engine for Nexus duels. Pure data in, pure data out: no drawing, no
// timers. The UI and the AI both go through legalActions / validate / apply.
//
// Deterministic order for simultaneous effects: the active player's creatures
// first (left to right; a creature's own ability before its relic), then the
// terrain, then the other player's creatures left to right. Defeated creatures
// leave in that same order.
import { CARDS, ADVANTAGE, AFFINITY_INFO } from '../content/cards.js';
import { nextRandom, shuffle } from './rng.js';

export const FIELD_SLOTS = 3;
export const START_NEXUS = 20;
export const START_HAND = 5;
export const MAX_ESSENCE = 6;
export const HAND_LIMIT = 8;
const MAX_SHIELD = 6;

const def = (id) => CARDS[id];
const other = (p) => 1 - p;

// ------------------------------------------------------------------ setup

export function createDuel({ decks, names = ['You', 'Rival'], seed = 1, firstPlayer = null, rules = {} }) {
  const s = {
    rng: seed >>> 0,
    nextUid: 1,
    turn: 0,
    active: 0,
    first: 0,
    phase: 'mulligan',
    mulliganPending: [0, 1],
    winner: null, // 0 | 1 | 'draw'
    terrain: null, // { uid, id, owner }
    rules: { ...rules },
    players: [0, 1].map((i) => ({
      name: names[i],
      nexus: (rules.startNexus && rules.startNexus[i]) || START_NEXUS,
      nexusMax: (rules.startNexus && rules.startNexus[i]) || START_NEXUS,
      cap: 0,
      essence: 0,
      essenceBonus: 0,
      deck: [],
      hand: [],
      discard: [],
      field: Array(FIELD_SLOTS).fill(null),
      fatigue: 0,
      attacksMade: 0,
    })),
    log: [],
    events: [],
  };
  for (const i of [0, 1]) {
    s.players[i].deck = decks[i].map((id) => ({ uid: s.nextUid++, id }));
    shuffle(s, s.players[i].deck);
  }
  s.first = firstPlayer === null ? (nextRandom(s) < 0.5 ? 0 : 1) : firstPlayer;
  s.active = s.first;
  for (const i of [0, 1]) dealOpeningHand(s, i);
  if (rules.startTerrain) s.terrain = { uid: s.nextUid++, id: rules.startTerrain, owner: null };
  if (rules.startField) {
    for (const [pi, ids] of Object.entries(rules.startField)) {
      ids.forEach((id, slot) => {
        if (id) s.players[pi].field[slot] = newCreature(s, { uid: s.nextUid++, id }, -1);
      });
    }
  }
  if (rules.startHand) {
    for (const [pi, ids] of Object.entries(rules.startHand)) {
      const pl = s.players[pi];
      pl.deck.push(...pl.hand);
      pl.hand = ids.map((id) => ({ uid: s.nextUid++, id }));
    }
  }
  if (rules.startCap) for (const [pi, cap] of Object.entries(rules.startCap)) s.players[pi].cap = cap - 1;
  if (rules.noMulligan) {
    // scripted start (tactical challenges): skip opening decisions
    s.mulliganPending = [];
    s.turn = (rules.startTurn || 1) - 1;
    if (rules.startActive !== undefined) s.active = rules.startActive;
    log(s, `${s.players[s.first].name} goes first.`);
    startTurn(s);
    return s;
  }
  log(s, `${s.players[s.first].name} goes first.`);
  return s;
}

export function cloneDuel(s) {
  return structuredClone(s);
}

function newCreature(s, inst, turn) {
  return {
    uid: inst.uid,
    stack: [inst],
    relic: null,
    damage: 0,
    status: { burn: 0, shield: 0, stun: 0, hex: 0 },
    enteredTurn: turn,
    evolvedTurn: -1,
    attacked: false,
    atkTurn: 0,
    hpPerm: 0,
    sturdyPerm: 0,
  };
}

// ------------------------------------------------------------------ helpers

function log(s, text) {
  s.log.push({ turn: s.turn, text });
}
function emit(s, ev) {
  s.events.push(ev);
}

export const topId = (c) => c.stack[c.stack.length - 1].id;
export const topCard = (c) => def(topId(c));

export function findCreature(s, uid) {
  for (const p of [0, 1]) {
    const f = s.players[p].field;
    for (let i = 0; i < f.length; i++) if (f[i] && f[i].uid === uid) return { p, slot: i, c: f[i] };
  }
  return null;
}

function terrainDef(s) {
  return s.terrain ? def(s.terrain.id).terrain : {};
}

function harmonyBonus(s, p, c) {
  if (!topCard(c).keywords.harmony) return 0;
  const affs = new Set();
  for (const o of s.players[p].field) if (o && o !== c) affs.add(topCard(o).affinity);
  return affs.size;
}

export function maxHp(s, p, c) {
  const d = topCard(c);
  const t = terrainDef(s);
  let v = d.hp + c.hpPerm + harmonyBonus(s, p, c);
  if (c.relic) v += def(c.relic.id).mods.hp || 0;
  if (t.hp) v += t.hp[d.affinity] || 0;
  return Math.max(1, v);
}

export function hp(s, p, c) {
  return maxHp(s, p, c) - c.damage;
}

export function atk(s, p, c) {
  const d = topCard(c);
  const t = terrainDef(s);
  let v = d.atk + c.atkTurn + harmonyBonus(s, p, c) - c.status.hex;
  if (c.relic) v += def(c.relic.id).mods.atk || 0;
  if (t.atk) v += t.atk[d.affinity] || 0;
  return Math.max(0, v);
}

export function sturdy(s, c) {
  const d = topCard(c);
  const t = terrainDef(s);
  let v = (d.keywords.sturdy || 0) + c.sturdyPerm;
  if (c.relic) v += def(c.relic.id).mods.sturdy || 0;
  if (t.sturdy) v += t.sturdy[d.affinity] || 0;
  return v;
}

export function hasGuard(c) {
  return !!(topCard(c).keywords.guard || (c.relic && def(c.relic.id).mods.guard));
}

export function isQuick(s, c) {
  const d = topCard(c);
  const t = terrainDef(s);
  return !!(d.keywords.quick || (c.relic && def(c.relic.id).mods.quick) || (t.quick && t.quick[d.affinity]));
}

function alive(s, p) {
  return s.players[p].field.filter((c) => c && hp(s, p, c) > 0);
}

export function evolveCost(s, c, evoId) {
  const t = terrainDef(s);
  const d = def(evoId);
  const discount = (topCard(c).keywords.evolveDiscount || 0) + (t.evolveDiscount || 0);
  return Math.max(1, d.cost - discount);
}

// ------------------------------------------------------------------ drawing

// Opening hands always include at least one basic creature (decks have 8+):
// redeal up to 10 times, which keeps the duel seed-deterministic.
function dealOpeningHand(s, p) {
  const pl = s.players[p];
  for (let tries = 0; tries < 10; tries++) {
    for (let k = 0; k < START_HAND; k++) drawCard(s, p, true);
    if (pl.hand.some((h) => def(h.id).type === 'creature' && def(h.id).stage === 0)) return;
    pl.deck.push(...pl.hand);
    pl.hand = [];
    shuffle(s, pl.deck);
  }
  for (let k = 0; k < START_HAND; k++) drawCard(s, p, true);
}

function drawCard(s, p, silent = false) {
  const pl = s.players[p];
  if (pl.deck.length === 0) {
    pl.fatigue += 1;
    pl.nexus -= pl.fatigue;
    log(s, `${pl.name} has no cards left: fatigue deals ${pl.fatigue} to their Nexus.`);
    emit(s, { kind: 'fatigue', p, n: pl.fatigue });
    return null;
  }
  const inst = pl.deck.shift();
  pl.hand.push(inst);
  if (!silent) emit(s, { kind: 'draw', p, uid: inst.uid });
  return inst;
}

// ------------------------------------------------------------------ damage & healing

function damageCreature(s, p, c, n, { attack = false } = {}) {
  let amount = n;
  if (attack) amount = Math.max(0, amount - sturdy(s, c));
  if (amount > 0 && c.status.shield > 0) {
    const absorbed = Math.min(c.status.shield, amount);
    c.status.shield -= absorbed;
    amount -= absorbed;
    if (absorbed) emit(s, { kind: 'shield', p, uid: c.uid, n: absorbed });
  }
  if (amount > 0) {
    c.damage += amount;
    emit(s, { kind: 'damage', p, uid: c.uid, n: amount });
  }
  return amount;
}

function healCreature(s, p, c, n) {
  if (terrainDef(s).noHeal) return 0;
  const healed = Math.min(c.damage, n);
  if (healed > 0) {
    c.damage -= healed;
    emit(s, { kind: 'heal', p, uid: c.uid, n: healed });
  }
  return healed;
}

function damageNexus(s, p, n) {
  if (n <= 0) return;
  s.players[p].nexus -= n;
  emit(s, { kind: 'nexus', p, n: -n });
}

function healNexus(s, p, n) {
  if (terrainDef(s).noHeal) return;
  const pl = s.players[p];
  const healed = Math.max(0, Math.min(n, pl.nexusMax - pl.nexus));
  if (healed > 0) {
    pl.nexus += healed;
    emit(s, { kind: 'nexus', p, n: healed });
  }
}

// ------------------------------------------------------------------ effects

function select(s, ctx, sel) {
  const me = ctx.p;
  const foe = other(me);
  const selfC = ctx.self || ctx.holder || null;
  const pick = (p, list) => list.map((c) => ({ p, c }));
  switch (sel) {
    case 'self':
    case 'holder':
      return selfC && hp(s, me, selfC) > 0 ? [{ p: me, c: selfC }] : [];
    case 'target':
      return ctx.target && ctx.target.c && hp(s, ctx.target.p, ctx.target.c) > 0 ? [ctx.target] : [];
    case 'attackTarget':
      return ctx.attackTarget && hp(s, ctx.attackTarget.p, ctx.attackTarget.c) > 0 ? [ctx.attackTarget] : [];
    case 'allies':
      return pick(me, alive(s, me));
    case 'otherAllies':
      return pick(me, alive(s, me).filter((c) => c !== selfC));
    case 'enemies':
      return pick(foe, alive(s, foe));
    case 'otherEnemies':
      return pick(foe, alive(s, foe).filter((c) => !ctx.attackTarget || c !== ctx.attackTarget.c));
    case 'otherEnemyFirst': {
      const l = alive(s, foe).filter((c) => !ctx.attackTarget || c !== ctx.attackTarget.c);
      return l.length ? [{ p: foe, c: l[0] }] : [];
    }
    case 'burnedEnemies':
      return pick(foe, alive(s, foe).filter((c) => c.status.burn > 0));
    case 'allyLowest': {
      const l = alive(s, me);
      if (!l.length) return [];
      let best = l[0];
      for (const c of l) if (hp(s, me, c) < hp(s, me, best)) best = c;
      return [{ p: me, c: best }];
    }
    case 'otherAllyLowest': {
      const l = alive(s, me).filter((c) => c !== selfC && c.damage > 0);
      if (!l.length) return [];
      let best = l[0];
      for (const c of l) if (c.damage > best.damage) best = c;
      return [{ p: me, c: best }];
    }
    case 'enemyStrongest': {
      const l = alive(s, foe);
      if (!l.length) return [];
      let best = l[0];
      for (const c of l) if (atk(s, foe, c) > atk(s, foe, best)) best = c;
      return [{ p: foe, c: best }];
    }
    default:
      throw new Error(`Unknown selector ${sel}`);
  }
}

function checkCond(s, ctx, cond) {
  if (!cond) return true;
  if (cond.controlsOther) {
    const selfC = ctx.self;
    if (!alive(s, ctx.p).some((c) => c !== selfC && topCard(c).affinity === cond.controlsOther)) return false;
  }
  if (cond.targetDefeated !== undefined) {
    const t = ctx.attackTarget;
    const dead = !t || hp(s, t.p, t.c) <= 0;
    if (dead !== cond.targetDefeated) return false;
  }
  if (cond.targetHasGuard !== undefined) {
    const t = ctx.target;
    if (!t || hasGuard(t.c) !== cond.targetHasGuard) return false;
  }
  return true;
}

function runOps(s, ctx, ops, source) {
  for (const op of ops) {
    if (s.winner !== null) return;
    if (!checkCond(s, ctx, op.if)) continue;
    runOp(s, ctx, op, source);
  }
}

function runOp(s, ctx, op, source) {
  const me = ctx.p;
  switch (op.op) {
    case 'damage':
      for (const t of select(s, ctx, op.to)) {
        const n = damageCreature(s, t.p, t.c, op.n);
        log(s, `${source} deals ${n} to ${topCard(t.c).name}.`);
      }
      break;
    case 'heal':
      for (const t of select(s, ctx, op.to)) {
        const n = healCreature(s, t.p, t.c, op.n);
        if (n) log(s, `${source} heals ${topCard(t.c).name} by ${n}.`);
      }
      break;
    case 'status':
      for (const t of select(s, ctx, op.to)) {
        const st = t.c.status;
        if (op.s === 'shield') st.shield = Math.min(MAX_SHIELD, st.shield + op.n);
        else if (op.s === 'burn') st.burn = Math.min(5, st.burn + op.n);
        else if (op.s === 'stun') st.stun = 1;
        else if (op.s === 'hex') st.hex = Math.min(2, st.hex + op.n);
        emit(s, { kind: 'status', p: t.p, uid: t.c.uid, s: op.s });
        log(s, `${topCard(t.c).name} gains ${label(op.s)}${op.s === 'stun' ? '' : ` ${op.n}`}.`);
      }
      break;
    case 'healNexus':
      healNexus(s, op.who === 'enemy' ? other(me) : me, op.n);
      log(s, `${source} restores ${op.n} Nexus.`);
      break;
    case 'damageNexus': {
      const target = op.who === 'self' ? me : other(me);
      damageNexus(s, target, op.n);
      log(s, `${source} deals ${op.n} to ${s.players[target].name}'s Nexus.`);
      break;
    }
    case 'draw':
      for (let i = 0; i < op.n; i++) drawCard(s, me);
      log(s, `${s.players[me].name} draws ${op.n}.`);
      break;
    case 'buffAtk':
      for (const t of select(s, ctx, op.to)) t.c.atkTurn += op.n;
      break;
    case 'maxHp':
      for (const t of select(s, ctx, op.to)) t.c.hpPerm += op.n;
      break;
    case 'grantSturdy':
      for (const t of select(s, ctx, op.to)) t.c.sturdyPerm += op.n;
      break;
    case 'gainEssence': {
      const pl = s.players[me];
      if (s.phase === 'start') pl.essenceBonus += op.n;
      else pl.essence += op.n;
      log(s, `${pl.name} gains ${op.n} Essence.`);
      break;
    }
    case 'bounce':
      for (const t of select(s, ctx, op.to)) {
        const owner = s.players[t.p];
        const slot = owner.field.indexOf(t.c);
        owner.field[slot] = null;
        // the whole evolution stack returns; relic goes to the discard pile
        for (const inst of t.c.stack) owner.hand.push(inst);
        if (t.c.relic) owner.discard.push(t.c.relic);
        emit(s, { kind: 'bounce', p: t.p, uid: t.c.uid });
        log(s, `${topCard(t.c).name} returns to ${owner.name}'s hand.`);
      }
      break;
    case 'searchEvolution': {
      const pl = s.players[me];
      const lines = new Set(alive(s, me).map((c) => topId(c)));
      const idx = pl.deck.findIndex((inst) => def(inst.id).evolvesFrom && lines.has(def(inst.id).evolvesFrom));
      if (idx >= 0) {
        const [inst] = pl.deck.splice(idx, 1);
        pl.hand.push(inst);
        emit(s, { kind: 'draw', p: me, uid: inst.uid });
        log(s, `${pl.name} finds ${def(inst.id).name}.`);
      } else log(s, 'No matching evolution in the deck.');
      break;
    }
    case 'recover': {
      const pl = s.players[me];
      for (let i = pl.discard.length - 1; i >= 0; i--) {
        if (def(pl.discard[i].id).type === 'creature' && def(pl.discard[i].id).stage === 0) {
          const [inst] = pl.discard.splice(i, 1);
          pl.hand.push(inst);
          log(s, `${pl.name} recovers ${def(inst.id).name} from the discard pile.`);
          break;
        }
      }
      break;
    }
    case 'coin': {
      const heads = nextRandom(s) < 0.5;
      log(s, `Coin flip: ${heads ? 'heads' : 'tails'}.`);
      emit(s, { kind: 'coin', heads });
      runOps(s, ctx, heads ? op.heads : op.tails, source);
      break;
    }
    default:
      throw new Error(`Unknown op ${op.op}`);
  }
}

const label = (st) => ({ burn: 'Burn', shield: 'Shield', stun: 'Stun', hex: 'Hex' })[st];

// Fire a trigger kind for one creature (ability first, then its relic).
function fireCreature(s, p, c, when, extra = {}) {
  const d = topCard(c);
  for (const tr of d.triggers) {
    if (tr.when !== when) continue;
    const ctx = { p, self: c, ...extra };
    if (!checkCond(s, ctx, tr.if)) continue;
    runOps(s, ctx, tr.do, d.name);
  }
  if (c.relic) {
    const r = def(c.relic.id);
    for (const tr of r.triggers) {
      if (tr.when !== when) continue;
      const ctx = { p, holder: c, self: c, ...extra };
      if (!checkCond(s, ctx, tr.if)) continue;
      runOps(s, ctx, tr.do, r.name);
    }
  }
}

// ------------------------------------------------------------------ cleanup / victory

function cleanup(s) {
  let guard = 0;
  for (;;) {
    if (++guard > 50) break;
    const dead = [];
    for (const p of [s.active, other(s.active)]) {
      const f = s.players[p].field;
      for (let i = 0; i < f.length; i++) if (f[i] && hp(s, p, f[i]) <= 0) dead.push({ p, slot: i, c: f[i] });
    }
    if (!dead.length) break;
    for (const { p, slot, c } of dead) {
      const pl = s.players[p];
      pl.field[slot] = null;
      for (const inst of c.stack) pl.discard.push(inst);
      log(s, `${topCard(c).name} is defeated.`);
      emit(s, { kind: 'defeat', p, uid: c.uid, slot, id: topId(c) });
      fireCreature(s, p, c, 'defeated');
      if (c.relic) pl.discard.push(c.relic);
    }
  }
  checkWinner(s);
}

function checkWinner(s) {
  if (s.winner !== null) return;
  const a = s.players[0].nexus <= 0;
  const b = s.players[1].nexus <= 0;
  if (a && b) s.winner = 'draw';
  else if (a) s.winner = 1;
  else if (b) s.winner = 0;
  if (s.winner !== null) {
    s.phase = 'over';
    log(s, s.winner === 'draw' ? 'Both Nexus fall at once: a draw.' : `${s.players[s.winner].name} wins the duel!`);
    emit(s, { kind: 'over', winner: s.winner });
  }
}

// ------------------------------------------------------------------ turn flow

function startTurn(s) {
  s.turn += 1;
  const p = s.active;
  const pl = s.players[p];
  s.phase = 'start';
  pl.attacksMade = 0;
  log(s, `— Turn ${s.turn}: ${pl.name} —`);
  emit(s, { kind: 'turn', p, turn: s.turn });

  for (const c of pl.field) {
    if (!c) continue;
    c.attacked = false;
    c.atkTurn = 0;
  }
  // 1) start-of-turn effects: Burn, then abilities, left to right
  for (const c of [...pl.field]) {
    if (!c || hp(s, p, c) <= 0 || c.status.burn <= 0) continue;
    damageCreature(s, p, c, 1);
    c.status.burn -= 1;
    log(s, `${topCard(c).name} takes 1 Burn damage.`);
  }
  for (const c of [...pl.field]) if (c && hp(s, p, c) > 0) fireCreature(s, p, c, 'turnStart');
  if (s.rules.turnStartNexusDamage && s.rules.turnStartNexusDamage[p]) {
    damageNexus(s, p, s.rules.turnStartNexusDamage[p]);
    log(s, `The unstable core drains ${s.rules.turnStartNexusDamage[p]} from ${pl.name}'s Nexus.`);
  }
  cleanup(s);
  if (s.winner !== null) return;

  // 2) grow capacity and refill Essence
  pl.cap = Math.min(MAX_ESSENCE, pl.cap + 1);
  pl.essence = pl.cap + pl.essenceBonus;
  pl.essenceBonus = 0;

  // 3) draw (the first player skips the very first draw)
  if (!(s.turn === 1 && p === s.first) && !s.rules.noDraw) drawCard(s, p);
  checkWinner(s);
  if (s.winner !== null) return;
  s.phase = 'main';
}

function endTurnEffects(s) {
  const p = s.active;
  const pl = s.players[p];
  for (const c of [...pl.field]) if (c && hp(s, p, c) > 0) fireCreature(s, p, c, 'turnEnd');
  const t = terrainDef(s);
  if (t.endHeal) {
    for (const c of pl.field) {
      if (!c || hp(s, p, c) <= 0) continue;
      const n = t.endHeal[topCard(c).affinity];
      if (n) healCreature(s, p, c, n);
    }
  }
  for (const c of [...pl.field]) {
    if (!c) continue;
    const u = topCard(c).keywords.unstable;
    if (u) {
      damageNexus(s, p, u);
      log(s, `${topCard(c).name} is unstable: ${u} damage to ${pl.name}'s Nexus.`);
    }
  }
  cleanup(s);
  for (const c of pl.field) {
    if (!c) continue;
    c.status.stun = 0;
    c.status.hex = 0;
    c.atkTurn = 0;
  }
}

function passTurn(s) {
  s.active = other(s.active);
  startTurn(s);
}

// ------------------------------------------------------------------ action validation

export function canAttackWith(s, p, c) {
  if (s.turn === 1 && p === s.first) return 'Nobody attacks on the first turn of the duel.';
  if (c.attacked) return 'This creature already attacked this turn.';
  if (c.status.stun) return 'This creature is Stunned.';
  if (c.enteredTurn === s.turn && !isQuick(s, c)) return 'Creatures cannot attack on the turn they arrive.';
  return null;
}

function attackTargets(s, p) {
  const foe = other(p);
  const f = s.players[foe].field;
  const creatures = [];
  for (let i = 0; i < f.length; i++) if (f[i] && hp(s, foe, f[i]) > 0) creatures.push(f[i]);
  const guards = creatures.filter(hasGuard);
  if (guards.length) return { creatures: guards, nexus: false };
  return { creatures, nexus: creatures.length === 0 };
}

function techTargets(s, p, d) {
  const foe = other(p);
  switch (d.target) {
    case 'enemyCreature':
      return alive(s, foe).map((c) => c.uid);
    case 'allyCreature':
      return alive(s, p).map((c) => c.uid);
    case 'enemyBasic':
      return alive(s, foe)
        .filter((c) => c.stack.length === 1 && !topCard(c).legendary)
        .map((c) => c.uid);
    default:
      return null;
  }
}

// Returns null when the action is legal, otherwise a readable reason.
export function validate(s, a) {
  if (s.winner !== null) return 'The duel is over.';
  if (s.phase === 'mulligan') {
    if (a.type !== 'mulligan') return 'Choose whether to keep your opening hand first.';
    if (a.p !== s.mulliganPending[0]) return 'Not your decision yet.';
    return null;
  }
  if (s.phase === 'discard') {
    if (a.type !== 'discard') return `Discard down to ${HAND_LIMIT} cards first.`;
    const pl = s.players[s.active];
    const need = pl.hand.length - HAND_LIMIT;
    if (!Array.isArray(a.uids) || a.uids.length !== need) return `Choose exactly ${need} card(s) to discard.`;
    if (new Set(a.uids).size !== need || a.uids.some((u) => !pl.hand.some((h) => h.uid === u))) return 'Choose cards from your hand.';
    return null;
  }
  if (s.phase !== 'main' && s.phase !== 'combat') return 'Wait for your turn.';
  const p = s.active;
  if (a.p !== undefined && a.p !== p) return "It is not your turn.";
  const pl = s.players[p];

  if (a.type === 'endTurn') return null;

  if (a.type === 'attack') {
    const att = findCreature(s, a.attacker);
    if (!att || att.p !== p) return 'Choose one of your creatures to attack with.';
    const why = canAttackWith(s, p, att.c);
    if (why) return why;
    const t = attackTargets(s, p);
    if (a.target === 'nexus') {
      if (!t.nexus) return t.creatures.some(hasGuard) ? 'A Guard creature must be attacked first.' : 'You can only attack the Nexus when the enemy has no creatures.';
      return null;
    }
    const tc = findCreature(s, a.target);
    if (!tc || tc.p === p) return 'Choose an enemy creature as the target.';
    if (!t.creatures.includes(tc.c)) return 'A Guard creature must be attacked first.';
    return null;
  }

  // card plays
  if (s.phase === 'combat') return 'After attacking you cannot play more cards this turn.';
  const inst = pl.hand.find((h) => h.uid === a.uid);
  if (!inst) return 'That card is not in your hand.';
  const d = def(inst.id);

  if (a.type === 'summon') {
    if (d.type !== 'creature' || d.stage !== 0) return 'Only basic creatures can be summoned; evolutions go on top of a creature.';
    if (d.cost > pl.essence) return `Not enough Essence (needs ${d.cost}).`;
    const slot = a.slot ?? pl.field.indexOf(null);
    if (slot < 0 || slot >= FIELD_SLOTS) return 'Your field is full (3 creatures).';
    if (pl.field[slot]) return 'That field slot is occupied.';
    return null;
  }
  if (a.type === 'evolve') {
    if (d.type !== 'creature' || d.stage === 0) return 'This card is not an evolution.';
    const t = findCreature(s, a.target);
    if (!t || t.p !== p) return 'Choose one of your creatures to evolve.';
    if (topId(t.c) !== d.evolvesFrom) return `${d.name} evolves from ${def(d.evolvesFrom).name}.`;
    if (t.c.enteredTurn >= s.turn) return 'A creature must be on the field since the start of your turn to evolve.';
    if (t.c.evolvedTurn === s.turn) return 'A creature can evolve only once per turn.';
    const cost = evolveCost(s, t.c, d.id);
    if (cost > pl.essence) return `Not enough Essence (needs ${cost}).`;
    return null;
  }
  if (a.type === 'equip') {
    if (d.type !== 'relic') return 'This card is not a relic.';
    if (d.cost > pl.essence) return `Not enough Essence (needs ${d.cost}).`;
    const t = findCreature(s, a.target);
    if (!t || t.p !== p) return 'Relics are equipped on your own creatures.';
    if (t.c.relic) return 'That creature already holds a relic.';
    return null;
  }
  if (a.type === 'technique') {
    if (d.type !== 'technique') return 'This card is not a technique.';
    if (d.cost > pl.essence) return `Not enough Essence (needs ${d.cost}).`;
    const targets = techTargets(s, p, d);
    if (targets) {
      if (!targets.length) return 'There is no valid target for this technique.';
      if (!targets.includes(a.target)) return 'Choose a valid target.';
    }
    if (d.triggers.some((t) => t.do.some((o) => o.op === 'searchEvolution')) && !alive(s, p).length) return 'You need a creature on the field.';
    return null;
  }
  if (a.type === 'terrain') {
    if (d.type !== 'terrain') return 'This card is not a terrain.';
    if (d.cost > pl.essence) return `Not enough Essence (needs ${d.cost}).`;
    return null;
  }
  return 'Unknown action.';
}

// What kind of action a hand card leads to.
export function playKind(d) {
  if (d.type === 'creature') return d.stage === 0 ? 'summon' : 'evolve';
  if (d.type === 'relic') return 'equip';
  return d.type; // technique | terrain
}

// All legal actions for whoever must act now. Summons use the first empty slot.
export function legalActions(s) {
  const out = [];
  if (s.winner !== null) return out;
  if (s.phase === 'mulligan') {
    const p = s.mulliganPending[0];
    return [{ type: 'mulligan', p, redraw: false }, { type: 'mulligan', p, redraw: true }];
  }
  if (s.phase === 'discard') return out; // the chooser builds the discard list
  const p = s.active;
  const pl = s.players[p];
  const tryAdd = (a) => {
    if (!validate(s, a)) out.push(a);
  };
  if (s.phase === 'main') {
    for (const inst of pl.hand) {
      const d = def(inst.id);
      const kind = playKind(d);
      if (kind === 'summon') tryAdd({ type: 'summon', p, uid: inst.uid });
      else if (kind === 'terrain') tryAdd({ type: 'terrain', p, uid: inst.uid });
      else if (kind === 'technique') {
        const targets = techTargets(s, p, d);
        if (targets) for (const t of targets) tryAdd({ type: 'technique', p, uid: inst.uid, target: t });
        else tryAdd({ type: 'technique', p, uid: inst.uid });
      } else {
        for (const c of pl.field) if (c) tryAdd({ type: kind, p, uid: inst.uid, target: c.uid });
      }
    }
  }
  for (const c of pl.field) {
    if (!c) continue;
    if (canAttackWith(s, p, c)) continue;
    const t = attackTargets(s, p);
    for (const tc of t.creatures) out.push({ type: 'attack', p, attacker: c.uid, target: tc.uid });
    if (t.nexus) out.push({ type: 'attack', p, attacker: c.uid, target: 'nexus' });
  }
  out.push({ type: 'endTurn', p });
  return out;
}

// ------------------------------------------------------------------ apply

export function apply(s, a) {
  const why = validate(s, a);
  if (why) return { ok: false, reason: why };
  s.events = [];

  if (a.type === 'mulligan') {
    const p = s.mulliganPending.shift();
    const pl = s.players[p];
    if (a.redraw) {
      pl.deck.push(...pl.hand);
      pl.hand = [];
      shuffle(s, pl.deck);
      dealOpeningHand(s, p);
      log(s, `${pl.name} shuffles their hand back and draws a new one.`);
    } else log(s, `${pl.name} keeps their hand.`);
    if (!s.mulliganPending.length) startTurn(s);
    return { ok: true, events: s.events };
  }

  if (a.type === 'discard') {
    const pl = s.players[s.active];
    for (const u of a.uids) {
      const i = pl.hand.findIndex((h) => h.uid === u);
      const [inst] = pl.hand.splice(i, 1);
      pl.discard.push(inst);
      log(s, `${pl.name} discards ${def(inst.id).name}.`);
    }
    passTurn(s);
    return { ok: true, events: s.events };
  }

  const p = s.active;
  const pl = s.players[p];

  if (a.type === 'endTurn') {
    endTurnEffects(s);
    if (s.winner === null) {
      if (pl.hand.length > HAND_LIMIT) {
        s.phase = 'discard';
        log(s, `${pl.name} must discard down to ${HAND_LIMIT} cards.`);
      } else passTurn(s);
    }
    return { ok: true, events: s.events };
  }

  if (a.type === 'attack') {
    const att = findCreature(s, a.attacker);
    const c = att.c;
    s.phase = 'combat';
    c.attacked = true;
    pl.attacksMade += 1;
    const name = topCard(c).name;
    if (a.target === 'nexus') {
      const n = atk(s, p, c);
      damageNexus(s, other(p), n);
      emit(s, { kind: 'attack', p, uid: c.uid, target: 'nexus', n });
      log(s, `${name} strikes ${s.players[other(p)].name}'s Nexus for ${n}.`);
      fireCreature(s, p, c, 'attack', { attackTarget: null });
    } else {
      const t = findCreature(s, a.target);
      const td = topCard(t.c);
      let n = atk(s, p, c);
      const adv = ADVANTAGE[topCard(c).affinity] === td.affinity;
      if (adv) n += 1;
      if (topCard(c).keywords.bonusVsHexed && t.c.status.hex > 0) n += topCard(c).keywords.bonusVsHexed;
      const dealt = damageCreature(s, t.p, t.c, n, { attack: true });
      emit(s, { kind: 'attack', p, uid: c.uid, target: t.c.uid, n: dealt, adv });
      log(s, `${name} attacks ${td.name} for ${dealt}${adv ? ` (${AFFINITY_INFO[topCard(c).affinity].name} advantage)` : ''}.`);
      const extra = { attackTarget: { p: t.p, c: t.c } };
      fireCreature(s, p, c, 'attack', extra);
      fireCreature(s, p, c, 'attackAfter', extra);
    }
    cleanup(s);
    return { ok: true, events: s.events };
  }

  const idx = pl.hand.findIndex((h) => h.uid === a.uid);
  const inst = pl.hand[idx];
  const d = def(inst.id);

  if (a.type === 'summon') {
    const slot = a.slot ?? pl.field.indexOf(null);
    pl.hand.splice(idx, 1);
    pl.essence -= d.cost;
    const c = newCreature(s, inst, s.turn);
    pl.field[slot] = c;
    emit(s, { kind: 'summon', p, uid: c.uid, slot, id: d.id });
    log(s, `${pl.name} summons ${d.name}.`);
    fireCreature(s, p, c, 'summon');
  } else if (a.type === 'evolve') {
    const t = findCreature(s, a.target);
    const cost = evolveCost(s, t.c, d.id);
    const from = topCard(t.c).name;
    pl.hand.splice(idx, 1);
    pl.essence -= cost;
    t.c.stack.push(inst);
    t.c.evolvedTurn = s.turn;
    emit(s, { kind: 'evolve', p, uid: t.c.uid, id: d.id, from: t.c.stack[t.c.stack.length - 2].id });
    log(s, `${from} evolves into ${d.name}!`);
    fireCreature(s, p, t.c, 'evolve');
  } else if (a.type === 'equip') {
    const t = findCreature(s, a.target);
    pl.hand.splice(idx, 1);
    pl.essence -= d.cost;
    t.c.relic = inst;
    emit(s, { kind: 'equip', p, uid: t.c.uid, id: d.id });
    log(s, `${topCard(t.c).name} equips ${d.name}.`);
    fireCreature(s, p, t.c, 'equip');
  } else if (a.type === 'technique') {
    pl.hand.splice(idx, 1);
    pl.essence -= d.cost;
    const target = a.target ? findCreature(s, a.target) : null;
    emit(s, { kind: 'technique', p, id: d.id, target: a.target || null });
    log(s, `${pl.name} uses ${d.name}.`);
    const ctx = { p, target: target ? { p: target.p, c: target.c } : null };
    for (const tr of d.triggers) if (tr.when === 'play') runOps(s, ctx, tr.do, d.name);
    pl.discard.push(inst);
  } else if (a.type === 'terrain') {
    pl.hand.splice(idx, 1);
    pl.essence -= d.cost;
    if (s.terrain && s.terrain.owner !== null) s.players[s.terrain.owner].discard.push({ uid: s.terrain.uid, id: s.terrain.id });
    s.terrain = { uid: inst.uid, id: inst.id, owner: p };
    emit(s, { kind: 'terrain', p, id: d.id });
    log(s, `${pl.name} sets the terrain: ${d.name}.`);
  }
  cleanup(s);
  return { ok: true, events: s.events };
}

// Who must decide right now (for UI / AI loops).
export function decider(s) {
  if (s.winner !== null) return null;
  if (s.phase === 'mulligan') return s.mulliganPending[0];
  return s.active;
}

// Puts a creature straight onto the field (scripted duels and tests).
export function placeCreature(s, p, slot, id, enteredTurn = -1) {
  const c = newCreature(s, { uid: s.nextUid++, id }, enteredTurn);
  s.players[p].field[slot] = c;
  return c;
}

// Puts a card instance into a player's hand (scripted duels and tests).
export function giveCard(s, p, id) {
  const inst = { uid: s.nextUid++, id };
  s.players[p].hand.push(inst);
  return inst;
}
