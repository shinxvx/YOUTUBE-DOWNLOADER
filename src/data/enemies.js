// Enemy definitions. `sheet` keys match manifest battle sprites.
// `ai(self, ctx)` returns the next action. ctx exposes: heroes (alive), rng(), turn (self action count).
// Telegraphed attacks announce themselves one turn ahead so the player can Guard.

const pick = (ctx, list) => list[Math.floor(ctx.rng() * list.length)];

export const ENEMY_ACTIONS = {
  claw: { name: 'Ashen Claw', power: 1.0 },
  lunge: { name: 'Hollow Lunge', power: 1.9, break: 0 },
  bite: { name: 'Blood Bite', power: 0.85, status: { bleed: 3 } },
  howl: { name: 'Hunting Howl', power: 0, buff: 'speed' },
  hunt: { name: 'Marks Its Prey', power: 0, mark: true },
  pounce: { name: 'Shadow Pounce', power: 2.2, punishGuard: true },
  rake: { name: 'Night Rake', power: 1.0 },
  snuff: { name: 'Snuff the Wick', power: 1.25, drain: 0.5 },
  ash_lash: { name: 'Lantern Lash', power: 1.1 },
  cinder_rain: { name: 'Cinder Rain', power: 0.7, all: true },
  mend: { name: 'Rekindle Anchor', power: 0, reviveAnchor: true },
};

export const ENEMIES = {
  ash_thrall: {
    name: 'Ash Thrall', sheet: 'ash_thrall_enemy', scale: 2,
    hp: 58, atk: 13, def: 5, spd: 9, res: 3, resolve: 40, regen: 0, xp: 14,
    weak: ['ember'],
    note: 'A villager\'s shape hollowed out by Court blood. Slow, but it winds up a heavy lunge — Guard when it does.',
    ai(self, ctx) {
      if (self.windup) return { action: 'lunge', target: self.windupTarget };
      if (ctx.turn % 3 === 2) {
        const t = pick(ctx, ctx.heroes);
        return { telegraph: true, action: 'lunge', target: t, text: `${self.name} draws back for a heavy lunge at ${t.name}!` };
      }
      return { action: 'claw', target: pick(ctx, ctx.heroes) };
    },
  },
  blood_hound: {
    name: 'Blood Hound', sheet: 'blood_hound_enemy', scale: 2,
    hp: 44, atk: 11, def: 3, spd: 15, res: 2, resolve: 30, regen: 0, xp: 14,
    weak: ['ember'],
    note: 'A Court-bred hound. Fast, and its bite leaves Bleed.',
    ai(self, ctx) {
      return { action: 'bite', target: pick(ctx, ctx.heroes) };
    },
  },
  gloom_stalker: {
    name: 'Gloom Stalker', sheet: 'gloom_stalker_enemy', scale: 1.75,
    hp: 80, atk: 15, def: 5, spd: 13, res: 4, resolve: 45, regen: 0, xp: 26,
    weak: ['ember'],
    note: 'A panther-shaped ambusher. It marks its prey, then pounces. Guarding the marked ally makes the pounce fail and breaks its Resolve.',
    ai(self, ctx) {
      const marked = ctx.heroes.find(h => h.status.marked);
      if (marked) return { action: 'pounce', target: marked };
      if (ctx.turn % 2 === 0) {
        const t = pick(ctx, ctx.heroes);
        return { action: 'hunt', target: t, text: `${self.name} fixes its eyes on ${t.name}. (Guard before it pounces!)` };
      }
      return { action: 'rake', target: pick(ctx, ctx.heroes) };
    },
  },
  garran: {
    name: 'Garran', title: 'The Lantern Eater', sheet: 'garran_enemy', scale: 2.3,
    hp: 340, atk: 17, def: 8, spd: 10, res: 6, resolve: 90, regen: 0.04, regenPerAnchor: 0.025, xp: 160,
    boss: true, vampire: true,
    note: 'A Court vampire who hides his blood anchors in hanging lanterns. While anchors burn, his wounds close. Break the anchors, then press him.',
    ai(self, ctx) {
      const anchorsDown = ctx.enemies.filter(e => e.anchor && e.dead && !e.sealed);
      if (anchorsDown.length && ctx.turn % 4 === 3 && !ctx.fieldSealed) return { action: 'mend', target: anchorsDown[0] };
      if (ctx.turn % 3 === 1) return { action: 'cinder_rain', target: null };
      if (ctx.turn % 3 === 2) return { action: 'snuff', target: pick(ctx, ctx.heroes) };
      return { action: 'ash_lash', target: pick(ctx, ctx.heroes) };
    },
  },
  lantern_anchor: {
    name: 'Lantern Anchor', sheet: null, texture: 'anchor_lantern', scale: 1,
    hp: 30, atk: 0, def: 2, spd: 0, res: 0, resolve: 0, regen: 0, xp: 6,
    anchor: true,
    note: 'A festival lantern filled with Garran\'s blood. While it burns, Garran regenerates faster. Seal Rend and Dawnstone flame are especially effective.',
    ai() { return null; },
  },
};
