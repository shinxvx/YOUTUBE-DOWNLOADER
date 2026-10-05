// Rules tests: drawing, Essence, attacks, evolution, discard, end of duel,
// simultaneous effects and deck validation.
import assert from 'node:assert/strict';
import {
  createDuel, apply, validate, legalActions, placeCreature, giveCard, hp, atk, findCreature, HAND_LIMIT,
} from '../src/engine/duel.js';
import { validateDeck } from '../src/engine/deck.js';
import { STARTER_DECKS, NPC_DECKS } from '../src/content/decks.js';
import { CARD_LIST } from '../src/content/cards.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`FAIL ${name}\n`, e);
    process.exitCode = 1;
  }
}

const filler = (id = 'pebblit') => Array(30).fill(id);
function fresh(opts = {}) {
  const s = createDuel({ decks: [opts.d0 || filler(), opts.d1 || filler()], seed: opts.seed || 7, firstPlayer: 0 });
  apply(s, { type: 'mulligan', p: 0, redraw: false });
  apply(s, { type: 'mulligan', p: 1, redraw: false });
  return s;
}
const ok = (s, a) => {
  const r = apply(s, a);
  assert.ok(r.ok, `expected legal: ${JSON.stringify(a)} -> ${r.reason}`);
  return r;
};
const endTurn = (s) => {
  ok(s, { type: 'endTurn' });
  if (s.phase === 'discard') {
    const pl = s.players[s.active];
    ok(s, { type: 'discard', uids: pl.hand.slice(0, pl.hand.length - HAND_LIMIT).map((h) => h.uid) });
  }
};

test('catalog has the planned 80 cards', () => {
  const by = (t) => CARD_LIST.filter((c) => c.type === t).length;
  assert.equal(by('creature'), 33);
  assert.equal(by('technique'), 24);
  assert.equal(by('relic'), 15);
  assert.equal(by('terrain'), 8);
  for (const c of CARD_LIST) if (c.evolvesFrom) assert.ok(CARD_LIST.some((x) => x.id === c.evolvesFrom), c.id);
});

test('starter and NPC decks are legal', () => {
  for (const [k, d] of Object.entries({ ...STARTER_DECKS, ...NPC_DECKS })) {
    const v = validateDeck(d);
    assert.ok(v.ok, `${k}: ${v.problems.join(' ')}`);
  }
});

test('deck validation catches size, copies and basics', () => {
  assert.ok(!validateDeck(filler().slice(0, 29)).ok);
  const v = validateDeck(filler());
  assert.ok(v.problems.some((p) => p.includes('at most 2')));
  const fewBasics = [...Array(7).fill(0).map((_, i) => ['cindlet', 'ripplet', 'mossbit', 'zippip'][i % 4])];
  const spells = ['t_flare', 't_ignite', 't_mend', 't_riptide', 't_overgrowth', 't_bramble_wall', 't_seed_search', 't_wild_growth', 't_spark_step', 't_static_bolt', 't_thunderclap', 't_recharge'];
  const deck = [...fewBasics, ...spells, ...spells].slice(0, 30);
  assert.ok(validateDeck(deck).problems.some((p) => p.includes('basic creatures')));
});

test('opening: 5 cards, first player skips first draw, capacity grows to 6', () => {
  const s = fresh();
  assert.equal(s.players[0].hand.length, 5);
  assert.equal(s.players[0].essence, 1);
  endTurn(s);
  assert.equal(s.players[1].hand.length, 6, 'second player draws on turn 1');
  assert.equal(s.players[1].essence, 1);
  for (let i = 0; i < 14; i++) endTurn(s);
  assert.equal(s.players[0].cap, 6);
  assert.equal(s.players[0].essence, 6);
});

test('unused Essence does not carry over', () => {
  const s = fresh();
  endTurn(s);
  endTurn(s);
  assert.equal(s.players[0].essence, 2);
});

test('first player cannot attack on turn 1; summoned creatures wait a turn', () => {
  const s = fresh();
  const c = placeCreature(s, 0, 0, 'cindlet');
  assert.match(validate(s, { type: 'attack', attacker: c.uid, target: 'nexus' }), /first turn/);
  endTurn(s);
  const inst = giveCard(s, 1, 'cindlet');
  s.players[1].essence = 1;
  ok(s, { type: 'summon', uid: inst.uid });
  const mine = s.players[1].field[0];
  assert.match(validate(s, { type: 'attack', attacker: mine.uid, target: c.uid }), /arrive/);
});

test('quick creatures attack right away; attacking locks card plays', () => {
  const s = fresh();
  endTurn(s);
  s.players[1].essence = 3;
  const z = giveCard(s, 1, 'zippip');
  ok(s, { type: 'summon', uid: z.uid });
  const zip = s.players[1].field[0];
  ok(s, { type: 'attack', attacker: zip.uid, target: 'nexus' });
  assert.equal(s.players[0].nexus, 18);
  const card = giveCard(s, 1, 'pebblit');
  assert.match(validate(s, { type: 'summon', uid: card.uid }), /After attacking/);
  assert.match(validate(s, { type: 'attack', attacker: zip.uid, target: 'nexus' }), /already attacked/);
});

test('damage persists, no counter-attack, no overflow to Nexus, advantage +1', () => {
  const s = fresh();
  const a = placeCreature(s, 0, 0, 'brasear'); // ember atk 3
  const b = placeCreature(s, 1, 0, 'mossbit'); // grove hp 4
  endTurn(s);
  endTurn(s);
  ok(s, { type: 'attack', attacker: a.uid, target: b.uid });
  assert.equal(findCreature(s, b.uid), null, 'mossbit defeated by 3+1');
  assert.equal(s.players[1].nexus, 20, 'no excess damage to Nexus');
  assert.equal(hp(s, 0, a), 5, 'attacker takes no counter damage');
  assert.equal(s.players[1].discard.at(-1).id, 'mossbit');
});

test('guard must be attacked first; Nexus only when the field is empty', () => {
  const s = fresh();
  const a = placeCreature(s, 0, 0, 'zippip');
  const g = placeCreature(s, 1, 0, 'cragoon');
  const n = placeCreature(s, 1, 1, 'ripplet');
  endTurn(s);
  endTurn(s);
  assert.match(validate(s, { type: 'attack', attacker: a.uid, target: n.uid }), /Guard/);
  assert.match(validate(s, { type: 'attack', attacker: a.uid, target: 'nexus' }), /Guard/);
  ok(s, { type: 'attack', attacker: a.uid, target: g.uid });
  assert.equal(hp(s, 1, g), 7 - 1, 'sturdy 1 reduces attack damage');
});

test('evolution: timing, once per turn, keeps damage and relic, discard whole stack', () => {
  const s = fresh();
  const m = placeCreature(s, 0, 0, 'mossbit');
  m.damage = 2;
  const relic = giveCard(s, 0, 'r_pearl_band');
  s.players[0].essence = 6;
  ok(s, { type: 'equip', uid: relic.uid, target: m.uid });
  const evo = giveCard(s, 0, 'thornook');
  ok(s, { type: 'evolve', uid: evo.uid, target: m.uid });
  assert.equal(s.players[0].essence, 6 - 1 - 1, 'Sprout makes the evolution cost 1');
  assert.equal(m.damage, 2);
  assert.equal(hp(s, 0, m), 6 + 2 - 2);
  assert.equal(m.status.shield, 2);
  const evo2 = giveCard(s, 0, 'elderhorn');
  assert.match(validate(s, { type: 'evolve', uid: evo2.uid, target: m.uid }), /once per turn/);
  // a creature summoned this turn cannot evolve
  const b = giveCard(s, 0, 'cindlet');
  ok(s, { type: 'summon', uid: b.uid });
  const br = giveCard(s, 0, 'brasear');
  assert.match(validate(s, { type: 'evolve', uid: br.uid, target: s.players[0].field[1].uid }), /since the start/);
  // defeat sends both stacked cards and the relic to the discard pile
  m.damage = 99;
  const fl = giveCard(s, 0, 't_mend');
  ok(s, { type: 'technique', uid: fl.uid, target: s.players[0].field[1].uid });
  const ids = s.players[0].discard.map((c) => c.id);
  for (const id of ['mossbit', 'thornook', 'r_pearl_band']) assert.ok(ids.includes(id), id);
});

test('evolution must follow the lineage', () => {
  const s = fresh();
  const m = placeCreature(s, 0, 0, 'mossbit');
  s.players[0].essence = 6;
  const e = giveCard(s, 0, 'elderhorn');
  assert.match(validate(s, { type: 'evolve', uid: e.uid, target: m.uid }), /evolves from Thornook/);
});

test('fatigue grows 1, 2, 3 and can end the duel', () => {
  const s = fresh();
  s.players[1].deck = [];
  endTurn(s);
  assert.equal(s.players[1].nexus, 19);
  endTurn(s);
  endTurn(s);
  assert.equal(s.players[1].nexus, 17);
  s.players[1].nexus = 2;
  endTurn(s);
  endTurn(s);
  assert.equal(s.winner, 0);
  assert.equal(s.phase, 'over');
});

test('hand limit asks for a discard choice', () => {
  const s = fresh();
  while (s.players[0].hand.length < HAND_LIMIT + 2) giveCard(s, 0, 't_mend');
  ok(s, { type: 'endTurn' });
  assert.equal(s.phase, 'discard');
  assert.match(validate(s, { type: 'discard', uids: [s.players[0].hand[0].uid] }), /exactly 2/);
  ok(s, { type: 'discard', uids: s.players[0].hand.slice(0, 2).map((h) => h.uid) });
  assert.equal(s.players[0].hand.length, HAND_LIMIT);
  assert.equal(s.active, 1);
});

test('simultaneous Nexus loss is a draw', () => {
  const s = fresh();
  endTurn(s);
  s.players[0].nexus = 1;
  s.players[1].nexus = 1;
  s.players[1].essence = 2;
  const bolt = giveCard(s, 1, 't_static_bolt');
  placeCreature(s, 0, 0, 'pebblit');
  // static bolt hurts the enemy Nexus only; force a symmetric effect instead
  const coin = { type: 'technique', uid: bolt.uid, target: s.players[0].field[0].uid };
  ok(s, coin);
  assert.equal(s.winner, 1);
  const t = fresh();
  t.players[0].nexus = 1;
  t.players[1].nexus = 1;
  t.players[0].deck = [];
  t.players[1].deck = [];
  // both take fatigue in turn; emulate a simultaneous hit via the rules hook
  t.rules.turnStartNexusDamage = { 0: 0, 1: 0 };
  t.players[0].nexus = 0;
  t.players[1].nexus = 0;
  endTurn(t);
  assert.equal(t.winner, 'draw');
});

test('burn ticks at start of controller turn and expires', () => {
  const s = fresh();
  const c = placeCreature(s, 1, 0, 'cairnox');
  c.status.burn = 2;
  endTurn(s);
  assert.equal(c.damage, 1);
  assert.equal(c.status.burn, 1);
  endTurn(s);
  endTurn(s);
  assert.equal(c.damage, 2);
  assert.equal(c.status.burn, 0);
});

test('stun and hex last through the controller next turn only', () => {
  const s = fresh();
  const mine = placeCreature(s, 0, 0, 'pebblit');
  const foe = placeCreature(s, 1, 0, 'arclyn');
  s.players[0].essence = 4;
  const r = giveCard(s, 0, 't_riptide');
  ok(s, { type: 'technique', uid: r.uid, target: foe.uid });
  const h = giveCard(s, 0, 't_hex_mark');
  ok(s, { type: 'technique', uid: h.uid, target: foe.uid });
  assert.equal(atk(s, 1, foe), 2);
  endTurn(s);
  assert.match(validate(s, { type: 'attack', attacker: foe.uid, target: mine.uid }), /Stunned/);
  endTurn(s);
  assert.equal(foe.status.stun, 0);
  assert.equal(atk(s, 1, foe), 3);
});

test('shield absorbs before HP; sturdy only affects attacks', () => {
  const s = fresh();
  const c = placeCreature(s, 1, 0, 'pebblit');
  c.status.shield = 1;
  s.players[0].essence = 6;
  const f = giveCard(s, 0, 't_flare');
  ok(s, { type: 'technique', uid: f.uid, target: c.uid });
  assert.equal(c.damage, 1, 'flare 2: shield 1 absorbs 1, sturdy ignored for techniques');
});

test('terrain replaces the previous one and goes to owner discard', () => {
  const s = fresh();
  s.players[0].essence = 6;
  const a = giveCard(s, 0, 'l_caldera');
  ok(s, { type: 'terrain', uid: a.uid });
  const b = giveCard(s, 0, 'l_academy_arena');
  ok(s, { type: 'terrain', uid: b.uid });
  assert.equal(s.terrain.id, 'l_academy_arena');
  assert.ok(s.players[0].discard.some((c) => c.id === 'l_caldera'));
});

test('deterministic order: active player effects resolve first', () => {
  const s = fresh();
  placeCreature(s, 0, 0, 'solmara');
  const foe = placeCreature(s, 1, 0, 'zippip');
  foe.status.burn = 1;
  foe.damage = 1; // 1 hp left
  endTurn(s);
  assert.equal(findCreature(s, foe.uid), null, 'Solar Mane finishes the burned Zippip at end of turn');
  assert.ok(s.log.some((l) => l.text.includes('Solmara deals 1 to Zippip')));
});

test('legal actions never include something validate rejects', () => {
  const s = createDuel({ decks: [STARTER_DECKS.cindlet, STARTER_DECKS.mossbit], seed: 42 });
  let steps = 0;
  while (s.winner === null && steps < 400) {
    const acts = legalActions(s);
    if (s.phase === 'discard') {
      const pl = s.players[s.active];
      ok(s, { type: 'discard', uids: pl.hand.slice(0, pl.hand.length - HAND_LIMIT).map((h) => h.uid) });
      continue;
    }
    for (const a of acts) assert.equal(validate(s, a), null, JSON.stringify(a));
    ok(s, acts[(steps * 7) % acts.length]);
    steps++;
  }
});


test('opening hands always contain a basic creature', () => {
  const deck = [...Array(8).fill(0).map((_, i) => ['cindlet', 'ripplet', 'mossbit', 'zippip'][i % 4]),
    ...['t_flare', 't_ignite', 't_mend', 't_riptide', 't_overgrowth', 't_bramble_wall', 't_seed_search', 't_wild_growth', 't_spark_step', 't_static_bolt', 't_thunderclap'].flatMap((x) => [x, x])];
  for (let seed = 1; seed < 200; seed++) {
    const s = createDuel({ decks: [deck, deck], seed });
    for (const p of [0, 1]) assert.ok(s.players[p].hand.some((h) => h.id.length && !h.id.startsWith('t_')), `seed ${seed}`);
  }
});

console.log(`engine tests: ${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
