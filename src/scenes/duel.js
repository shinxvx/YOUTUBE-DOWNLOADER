// Duel screen. The rules live in src/engine/duel.js; this scene only shows
// the state, turns clicks into actions and animates the engine's events.
import {
  createDuel, apply, validate, legalActions, findCreature, topCard, topId, hp, maxHp, atk, sturdy,
  hasGuard, isQuick, canAttackWith, evolveCost, playKind, HAND_LIMIT, FIELD_SLOTS, decider,
} from '../engine/duel.js';
import { chooseAction } from '../ai/ai.js';
import { CARDS, AFFINITY_INFO } from '../content/cards.js';
import { CHARACTERS } from '../content/world.js';
import { VW, VH, rect, panel, text, textBlock, fitText, button, COLORS, img, strokeRect } from '../ui/core.js';
import { image, portraitImg, creatureImg } from '../ui/assets.js';
import {
  drawHandCard, drawZoomCard, drawCardBack, cardArt, statPill, HAND_W, HAND_H, FIELD_W, FIELD_H, ZOOM_W, ZOOM_H,
} from '../ui/cards.js';
import { seedFrom } from '../engine/rng.js';

const FX = [128, 200, 272];
const OPP_Y = 8;
const PL_Y = 122;
const HAND_Y = 242;
const RIGHT_X = 326;

const STATUS_STYLE = {
  burn: ['B', '#e8603c'], shield: ['S', '#3b8fe0'], stun: ['Z', '#e8c330'], hex: ['H', '#9a5cd0'],
};

export class DuelScene {
  // opts: { opp, deck, oppDeck, ai, rules, tutorial, puzzle, music, title, playerName, bg }
  constructor(opts) {
    this.opts = opts;
    this.ai = opts.ai || 'balanced';
    this.sel = null; // { kind: 'hand'|'field'|'terrain'|'enemy', uid }
    this.mode = 'idle'; // idle | target
    this.pending = null; // action template waiting for a target
    this.targets = [];
    this.anims = [];
    this.floaters = [];
    this.ghosts = [];
    this.shake = {};
    this.lunge = null;
    this.aiTimer = 0.8;
    this.discardSel = new Set();
    this.message = null;
    this.logScroll = 0;
    this.showLog = false;
    this.hint = null;
    this.result = null;
    this.pos = {}; // uid -> {x,y}
    this.flash = 0;
  }

  enter(g) {
    const o = this.opts;
    const seed = o.seed ?? seedFrom(`${g.game ? g.game.day : 0}-${o.opp}-${Math.floor(performance.now())}`);
    this.state = createDuel({
      decks: [o.deck, o.oppDeck],
      names: [o.playerName || 'You', CHARACTERS[o.opp] ? CHARACTERS[o.opp].name : o.oppName || 'Rival'],
      seed,
      firstPlayer: o.rules && o.rules.firstPlayer !== undefined ? o.rules.firstPlayer : null,
      rules: o.rules || {},
    });
    this.rand = mulberry(seed ^ 0x5bd1e995);
    g.audio.play(o.music || 'duel');
    if (o.tutorial) this.hint = 'Opening hand: keep it if you have basic creatures. Otherwise you may redraw once.';
  }

  // ------------------------------------------------------------------ helpers
  get s() {
    return this.state;
  }

  slotXY(p, slot) {
    return { x: FX[slot], y: p === 0 ? PL_Y : OPP_Y };
  }

  busy() {
    return this.anims.length > 0 || this.lunge;
  }

  speed(g) {
    return g.settings.animSpeed === 0 ? 100 : g.settings.animSpeed;
  }

  doAction(g, a) {
    const r = apply(this.state, a);
    if (!r.ok) {
      this.message = r.reason;
      g.audio.sfx('back');
      return false;
    }
    this.queueEvents(g, r.events);
    this.sel = null;
    this.mode = 'idle';
    this.pending = null;
    this.targets = [];
    this.message = null;
    return true;
  }

  queueEvents(g, events) {
    for (const ev of events) this.anims.push({ ev, t: 0 });
  }

  // Run animations one by one.
  updateAnims(g, dt) {
    const sp = this.speed(g);
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < 1.1);
    for (const gh of this.ghosts) gh.t += dt * sp;
    this.ghosts = this.ghosts.filter((gh) => gh.t < 0.6);
    for (const k of Object.keys(this.shake)) {
      this.shake[k] -= dt * sp;
      if (this.shake[k] <= 0) delete this.shake[k];
    }
    this.flash = Math.max(0, this.flash - dt * 2);
    if (this.lunge) {
      this.lunge.t += dt * sp;
      if (this.lunge.t >= 0.32) this.lunge = null;
      return;
    }
    let budget = 6; // resolve several instant events per frame
    while (this.anims.length && budget-- > 0) {
      const a = this.anims[0];
      if (a.t === 0) this.startAnim(g, a.ev);
      a.t += dt * sp;
      const dur = this.animDuration(a.ev);
      if (a.t < dur) return;
      this.anims.shift();
    }
  }

  animDuration(ev) {
    return { attack: 0.35, damage: 0.18, summon: 0.25, evolve: 0.5, defeat: 0.3, technique: 0.35, turn: 0.5, terrain: 0.3, over: 0.1 }[ev.kind] || 0.08;
  }

  posOf(uid, p) {
    if (uid === 'nexus') return p === 0 ? { x: 60, y: 260 } : { x: 60, y: 40 };
    return this.pos[uid] || { x: 240, y: 160 };
  }

  floater(x, y, txt, color) {
    this.floaters.push({ x, y, txt, color, t: 0 });
  }

  startAnim(g, ev) {
    const au = g.audio;
    switch (ev.kind) {
      case 'attack': {
        const from = this.posOf(ev.uid);
        const to = ev.target === 'nexus' ? this.posOf('nexus', 1 - ev.p) : this.posOf(ev.target);
        this.lunge = { uid: ev.uid, dx: (to.x - from.x) * 0.35, dy: (to.y - from.y) * 0.35, t: 0 };
        au.sfx('attack');
        if (ev.adv) this.floater(to.x + FIELD_W / 2, to.y - 4, 'Advantage!', COLORS.gold);
        break;
      }
      case 'damage': {
        const p = this.posOf(ev.uid);
        this.floater(p.x + FIELD_W / 2, p.y + 20, `-${ev.n}`, COLORS.danger);
        this.shake[ev.uid] = 0.25;
        au.sfx('hit');
        break;
      }
      case 'shield': {
        const p = this.posOf(ev.uid);
        this.floater(p.x + FIELD_W / 2, p.y + 30, `Shield -${ev.n}`, '#9fe0ff');
        au.sfx('shield');
        break;
      }
      case 'heal': {
        const p = this.posOf(ev.uid);
        this.floater(p.x + FIELD_W / 2, p.y + 20, `+${ev.n}`, COLORS.good);
        au.sfx('heal');
        break;
      }
      case 'nexus': {
        const p = this.posOf('nexus', ev.p);
        this.floater(p.x, p.y, ev.n > 0 ? `+${ev.n}` : `${ev.n}`, ev.n > 0 ? COLORS.good : COLORS.danger);
        if (ev.n < 0) {
          this.shake[`nexus${ev.p}`] = 0.3;
          au.sfx('hit');
        }
        break;
      }
      case 'fatigue': {
        const p = this.posOf('nexus', ev.p);
        this.floater(p.x, p.y - 10, `Fatigue -${ev.n}`, COLORS.danger);
        break;
      }
      case 'status': {
        const p = this.posOf(ev.uid);
        this.floater(p.x + FIELD_W / 2, p.y + 40, ev.s[0].toUpperCase() + ev.s.slice(1), STATUS_STYLE[ev.s][1]);
        break;
      }
      case 'summon':
        au.sfx('summon');
        break;
      case 'evolve': {
        const p = this.posOf(ev.uid);
        this.floater(p.x + FIELD_W / 2, p.y + 10, 'Evolved!', COLORS.gold);
        this.flash = 0.6;
        au.sfx('evolve');
        break;
      }
      case 'defeat': {
        const p = this.slotXY(ev.p, ev.slot);
        this.ghosts.push({ id: ev.id, x: p.x, y: p.y, t: 0 });
        au.sfx('defeat');
        break;
      }
      case 'technique':
        au.sfx('select');
        this.banner = { text: CARDS[ev.id].name, t: 0.9 };
        break;
      case 'terrain':
        au.sfx('summon');
        this.banner = { text: `Terrain: ${CARDS[ev.id].name}`, t: 0.9 };
        break;
      case 'turn':
        this.banner = { text: ev.p === 0 ? 'Your turn' : `${this.s.players[1].name}'s turn`, t: 0.9 };
        break;
      case 'coin':
        this.banner = { text: ev.heads ? 'Coin: Heads!' : 'Coin: Tails...', t: 1 };
        break;
      case 'equip':
        au.sfx('shield');
        break;
      case 'over':
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------ AI
  updateAI(g, dt) {
    const s = this.state;
    if (s.winner !== null || this.busy()) return;
    const who = decider(s);
    // g.autoplay (automated playtests only): the AI also plays your side
    if (who !== 1 && !(g.autoplay && who === 0)) return;
    this.aiTimer -= dt * this.speed(g);
    if (this.aiTimer > 0) return;
    const a = who === 0 ? chooseAction(s, 0, 'expert', this.rand) : chooseAction(s, 1, this.ai, this.rand);
    if (who === 0 && s.phase === 'discard') a.p = 0;
    const r = apply(s, a);
    if (!r.ok) {
      // should never happen; fail safe so the duel cannot lock up
      console.error('AI illegal action', a, r.reason);
      apply(s, { type: 'endTurn', p: who });
      return;
    }
    this.queueEvents(g, r.events);
    this.aiTimer = a.type === 'endTurn' ? 0.5 : 0.75;
  }

  // ------------------------------------------------------------------ frame
  frame(g, dt, isTop) {
    const { ctx } = g;
    const s = this.state;
    this.updateAnims(g, dt);
    if (isTop && dt > 0) {
      this.updateAI(g, dt);
      this.checkPuzzle(g);
    }
    if (this.banner) {
      this.banner.t -= dt * this.speed(g) * 0.8;
      if (this.banner.t <= 0) this.banner = null;
    }

    // background
    const bg = image(`bg:${this.opts.bg || 'arena'}`);
    if (bg) img(ctx, bg, 0, 0);
    rect(ctx, 0, 0, VW, VH, 'rgba(8,10,24,0.55)');

    this.drawSides(g);
    this.drawFields(g);
    this.drawMiddle(g);
    this.drawRight(g);
    this.drawHand(g);
    this.drawControls(g);
    this.drawFx(g);

    if (s.phase === 'mulligan' && decider(s) === 0) this.drawMulligan(g);
    if (s.phase === 'discard' && s.active === 0 && !this.busy()) this.drawDiscard(g);
    if (s.winner !== null && !this.busy()) this.drawResult(g);

    if (isTop) this.handleKeys(g);
  }

  handleKeys(g) {
    const inp = g.input;
    if (inp.key('Escape') || inp.key('x') || inp.key('Backspace')) {
      if (this.mode === 'target') {
        this.mode = 'idle';
        this.pending = null;
        this.targets = [];
      } else if (this.sel) this.sel = null;
      else if (this.showLog) this.showLog = false;
      g.audio.sfx('back');
    }
    if (inp.key('e') && this.canAct()) this.tryEndTurn(g);
    if (inp.key('l')) {
      this.showLog = !this.showLog;
      if (this.showLog) this.sel = null;
    }
  }

  canAct() {
    const s = this.state;
    return s.winner === null && s.active === 0 && (s.phase === 'main' || s.phase === 'combat') && !this.busy();
  }

  tryEndTurn(g) {
    this.doAction(g, { type: 'endTurn', p: 0 });
    this.aiTimer = 0.8;
  }

  // ------------------------------------------------------------------ side panels
  drawSides(g) {
    const { ctx } = g;
    const s = this.state;
    const opp = s.players[1];
    const me = s.players[0];
    // opponent panel
    const shO = this.shake.nexus1 ? Math.sin(g.time * 60) * 2 : 0;
    const isTarget = this.mode === 'target' && this.targets.includes('nexus');
    panel(ctx, 4 + shO, 4, 118, 108, { fill: isTarget ? '#5a2a2a' : COLORS.window });
    const pt = portraitImg(this.opts.opp, s.winner === 0 ? 'sad' : 'neutral');
    if (pt) ctx.drawImage(pt, 8, 4, 48, 48, 10 + shO, 10, 48, 48);
    text(ctx, opp.name, 62 + shO, 12, { size: 8, bold: true });
    this.nexusBar(ctx, 62 + shO, 26, opp.nexus, opp.nexusMax);
    this.essencePips(ctx, 62 + shO, 44, opp.essence, opp.cap);
    text(ctx, `Hand ${opp.hand.length}`, 12, 64, { size: 7, color: COLORS.textDim });
    text(ctx, `Deck ${opp.deck.length}`, 12, 74, { size: 7, color: COLORS.textDim });
    text(ctx, `Discard ${opp.discard.length}`, 12, 84, { size: 7, color: COLORS.textDim });
    for (let i = 0; i < Math.min(opp.hand.length, 8); i++) drawCardBack(ctx, 64 + i * 6, 62, 12, 17);
    if (isTarget) {
      const st = g.input.hit('tgt-nexus', 4, 4, 118, 108);
      if (st.active) strokeRect(ctx, 4, 4, 118, 108, COLORS.gold, 2);
      else strokeRect(ctx, 4, 4, 118, 108, pulse(g.time), 1);
      if (g.input.pressed('tgt-nexus')) this.chooseTarget(g, 'nexus');
    }
    this.pos.nexus1 = { x: 60, y: 40 };

    // player panel
    const shP = this.shake.nexus0 ? Math.sin(g.time * 60) * 2 : 0;
    panel(ctx, 4 + shP, 122, 118, 112);
    const partner = g.game && g.game.partner ? creatureImg(g.game.partner) : null;
    if (partner) img(ctx, partner, 10 + shP, 126);
    text(ctx, me.name, 62 + shP, 130, { size: 8, bold: true });
    this.nexusBar(ctx, 62 + shP, 144, me.nexus, me.nexusMax);
    this.essencePips(ctx, 62 + shP, 162, me.essence, me.cap);
    text(ctx, `Essence ${me.essence}/${me.cap}`, 12, 180, { size: 8, color: COLORS.essence });
    text(ctx, `Deck ${me.deck.length}`, 12, 194, { size: 7, color: COLORS.textDim });
    text(ctx, `Discard ${me.discard.length}`, 12, 204, { size: 7, color: COLORS.textDim });
    text(ctx, `Hand ${me.hand.length}/${HAND_LIMIT}`, 12, 214, { size: 7, color: COLORS.textDim });
  }

  nexusBar(ctx, x, y, v, max) {
    const w = 54;
    text(ctx, `Nexus ${Math.max(0, v)}`, x, y, { size: 7, color: COLORS.textDim });
    rect(ctx, x, y + 10, w, 6, COLORS.ink);
    const f = Math.max(0, Math.min(1, v / max));
    rect(ctx, x + 1, y + 11, (w - 2) * f, 4, f > 0.5 ? '#5ad07a' : f > 0.25 ? '#e8c330' : '#e8503c');
  }

  essencePips(ctx, x, y, e, cap) {
    for (let i = 0; i < 6; i++) {
      const filled = i < e;
      const open = i < cap;
      rect(ctx, x + i * 9, y, 7, 7, COLORS.ink);
      rect(ctx, x + i * 9 + 1, y + 1, 5, 5, filled ? COLORS.essence : open ? '#2a4a6a' : '#1a1e2e');
    }
    if (e > 6) text(ctx, `+${e - 6}`, x + 56, y - 1, { size: 7, color: COLORS.essence });
  }

  // ------------------------------------------------------------------ fields
  drawFields(g) {
    const { ctx } = g;
    const s = this.state;
    for (const p of [1, 0]) {
      for (let slot = 0; slot < FIELD_SLOTS; slot++) {
        const { x, y } = this.slotXY(p, slot);
        const c = s.players[p].field[slot];
        const id = `f${p}-${slot}`;
        const tgtKey = c ? c.uid : `slot${slot}`;
        const isTarget = this.mode === 'target' && (p === 0 || c) && this.targets.includes(c ? c.uid : p === 0 ? `slot${slot}` : null);
        const st = g.input.hit(id, x, y, FIELD_W, FIELD_H, { focusable: !!c || isTarget });
        if (!c) {
          rect(ctx, x, y, FIELD_W, FIELD_H, 'rgba(255,255,255,0.06)');
          strokeRect(ctx, x, y, FIELD_W, FIELD_H, isTarget ? pulse(g.time) : 'rgba(255,255,255,0.18)', isTarget ? 2 : 1);
          if (isTarget && st.active) strokeRect(ctx, x, y, FIELD_W, FIELD_H, COLORS.gold, 2);
        } else {
          let ox = 0;
          let oy = 0;
          if (this.shake[c.uid]) ox = Math.sin(g.time * 70) * 2;
          if (this.lunge && this.lunge.uid === c.uid) {
            const k = Math.sin((this.lunge.t / 0.32) * Math.PI);
            ox += this.lunge.dx * k;
            oy += this.lunge.dy * k;
          }
          this.pos[c.uid] = { x, y };
          this.drawFieldCreature(g, p, c, x + ox, y + oy, { selected: this.sel && this.sel.uid === c.uid, target: isTarget, hover: st.active });
        }
        if (g.input.pressed(id)) {
          if (isTarget) this.chooseTarget(g, tgtKey);
          else if (c) this.select(g, { kind: p === 0 ? 'field' : 'enemy', uid: c.uid });
        }
        if (g.input.rightClicked(id) && c) this.select(g, { kind: p === 0 ? 'field' : 'enemy', uid: c.uid });
      }
    }
  }

  drawFieldCreature(g, p, c, x, y, o) {
    const { ctx } = g;
    const s = this.state;
    const d = topCard(c);
    const a = AFFINITY_INFO[d.affinity];
    rect(ctx, x, y, FIELD_W, FIELD_H, COLORS.ink);
    rect(ctx, x + 1, y + 1, FIELD_W - 2, FIELD_H - 2, d.legendary ? '#ffe9a0' : a.light);
    rect(ctx, x + 2, y + 2, FIELD_W - 4, FIELD_H - 4, a.color);
    const ready = p === s.active && !canAttackWith(s, p, c) && (s.phase === 'main' || s.phase === 'combat');
    cardArt(ctx, d, x + 3, y + 12, FIELD_W - 6, 50, g.time);
    rect(ctx, x + 2, y + 2, FIELD_W - 4, 10, 'rgba(10,8,20,0.6)');
    fitText(ctx, d.name, x + FIELD_W / 2, y + 3, FIELD_W - 6, { align: 'center', size: 7, bold: true });
    // stats
    const h = hp(s, p, c);
    const mh = maxHp(s, p, c);
    const at = atk(s, p, c);
    rect(ctx, x + 2, y + 62, FIELD_W - 4, 20, 'rgba(10,8,20,0.7)');
    statPill(ctx, x + 4, y + 64, `${at}`, at > d.atk ? '#e0602a' : at < d.atk ? '#7a3aa0' : '#c0402a');
    statPill(ctx, x + FIELD_W - 26, y + 64, `${h}/${mh}`, h < mh ? '#a05a2a' : '#2a8a4a');
    // keywords / statuses row
    let sx = x + 4;
    const row = y + 73;
    if (hasGuard(c)) sx += statPill(ctx, sx, row, 'G', '#6a6a8a') + 1;
    const st = sturdy(s, c);
    if (st) sx += statPill(ctx, sx, row, `St${st}`, '#8a7458') + 1;
    for (const k of ['shield', 'burn', 'stun', 'hex']) {
      const v = c.status[k];
      if (!v) continue;
      const [l, col] = STATUS_STYLE[k];
      sx += statPill(ctx, sx, row, k === 'stun' ? l : `${l}${v}`, col) + 1;
    }
    if (c.relic) {
      const r = CARDS[c.relic.id];
      rect(ctx, x + FIELD_W - 12, y + 13, 9, 9, COLORS.ink);
      rect(ctx, x + FIELD_W - 11, y + 14, 7, 7, AFFINITY_INFO[r.affinity].light);
    }
    if (c.stack.length > 1) text(ctx, `S${c.stack.length - 1}`, x + 4, y + 13, { size: 7, color: COLORS.gold });
    if (ready && p === 0) {
      ctx.strokeStyle = 'rgba(122,224,138,0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, FIELD_W - 1, FIELD_H - 1);
    }
    if (o.target) strokeRect(ctx, x - 1, y - 1, FIELD_W + 2, FIELD_H + 2, o.hover ? COLORS.gold : pulse(g.time), 2);
    else if (o.selected) strokeRect(ctx, x - 1, y - 1, FIELD_W + 2, FIELD_H + 2, '#ffffff', 2);
    else if (o.hover) strokeRect(ctx, x, y, FIELD_W, FIELD_H, 'rgba(255,255,255,0.6)', 1);
  }

  // ------------------------------------------------------------------ middle bar
  drawMiddle(g) {
    const { ctx } = g;
    const s = this.state;
    rect(ctx, 126, 96, 196, 22, 'rgba(10,12,28,0.8)');
    const yourTurn = s.active === 0;
    const label = s.phase === 'mulligan' ? 'Opening hands' : s.winner !== null ? 'Duel over' : yourTurn ? (s.phase === 'combat' ? 'Your turn — Combat' : 'Your turn — Main') : `${s.players[1].name} is thinking...`;
    text(ctx, label, 132, 99, { size: 8, bold: true, color: yourTurn ? COLORS.gold : COLORS.textDim });
    text(ctx, `Turn ${s.turn}`, 132, 108, { size: 7, color: COLORS.textDim });
    if (s.terrain) {
      const t = CARDS[s.terrain.id];
      const id = 'terrain';
      const st = g.input.hit(id, 214, 98, 106, 18);
      rect(ctx, 214, 98, 106, 18, st.active ? '#3a4a78' : 'rgba(255,255,255,0.08)');
      text(ctx, t.name, 218, 103, { size: 7, color: AFFINITY_INFO[t.affinity].light });
      if (g.input.pressed(id)) this.select(g, { kind: 'terrain', uid: s.terrain.uid });
    } else text(ctx, 'No terrain', 222, 103, { size: 7, color: COLORS.textDim });
  }

  // ------------------------------------------------------------------ hand
  drawHand(g) {
    const { ctx } = g;
    const s = this.state;
    const me = s.players[0];
    const n = me.hand.length;
    const area = VW - 4 - 126;
    const spacing = n > 1 ? Math.min(HAND_W + 3, (area - HAND_W) / (n - 1)) : 0;
    const x0 = 126;
    const discarding = s.phase === 'discard' && s.active === 0;
    for (let i = 0; i < n; i++) {
      const inst = me.hand[i];
      const c = CARDS[inst.id];
      const x = x0 + i * spacing;
      const id = `h${inst.uid}`;
      const st = g.input.hit(id, x, HAND_Y, i === n - 1 ? HAND_W : spacing, HAND_H);
      const sel = this.sel && this.sel.uid === inst.uid;
      const marked = discarding && this.discardSel.has(inst.uid);
      const y = HAND_Y - (sel || st.active || marked ? 8 : 0);
      const playable = this.canAct() && this.cardPlayable(inst);
      let cost = c.cost;
      drawHandCard(ctx, inst.id, x, y, { t: g.time, dim: !playable && this.canAct() && !discarding, cost, highlight: marked ? COLORS.danger : sel ? '#ffffff' : playable ? 'rgba(122,224,138,0.9)' : null });
      if (g.input.pressed(id) || g.input.rightClicked(id)) {
        if (discarding) {
          if (this.discardSel.has(inst.uid)) this.discardSel.delete(inst.uid);
          else this.discardSel.add(inst.uid);
          g.audio.sfx('click');
        } else this.select(g, { kind: 'hand', uid: inst.uid });
      }
    }
  }

  cardPlayable(inst) {
    const s = this.state;
    const d = CARDS[inst.id];
    const kind = playKind(d);
    return legalActions(s).some((a) => a.uid === inst.uid && a.type === kind) || (kind === 'summon' && !validate(s, { type: 'summon', p: 0, uid: inst.uid }));
  }

  select(g, sel) {
    if (this.mode === 'target') {
      this.mode = 'idle';
      this.pending = null;
      this.targets = [];
    }
    this.sel = this.sel && this.sel.uid === sel.uid ? null : sel;
    this.message = null;
    g.audio.sfx('select');
  }

  // ------------------------------------------------------------------ right column: zoom + actions, or log
  drawRight(g) {
    const { ctx } = g;
    const s = this.state;
    const info = this.sel && !this.showLog ? this.selectionInfo() : null;
    if (this.sel && !info && !this.showLog) this.sel = null;
    this.info = info;
    if (info) {
      rect(ctx, RIGHT_X - 2, 0, VW - RIGHT_X + 2, 240, 'rgba(8,10,20,0.6)');
      drawZoomCard(ctx, info.id, RIGHT_X + 2, 4, { t: g.time, atk: info.atk, hp: info.hp, maxHp: info.maxHp, cost: info.cost });
      if (info.extra) textBlock(ctx, info.extra, RIGHT_X + 2, 220, 150, { size: 7, color: COLORS.textDim, lineHeight: 8, maxLines: 2 });
      return;
    }
    // log + hint panel
    panel(ctx, RIGHT_X, 4, VW - RIGHT_X - 4, 182);
    text(ctx, 'Duel log', RIGHT_X + 8, 9, { size: 8, bold: true, color: COLORS.gold });
    const lines = [];
    for (const l of s.log.slice(-60)) {
      for (const w of wrapLines(ctx, l.text, VW - RIGHT_X - 22)) lines.push({ text: w, head: l.text.startsWith('—') });
    }
    const max = 15;
    this.logScroll = Math.max(0, Math.min(this.logScroll - g.input.wheel, Math.max(0, lines.length - max)));
    const view = lines.slice(Math.max(0, lines.length - max - this.logScroll), lines.length - this.logScroll);
    view.forEach((l, i) => text(ctx, l.text, RIGHT_X + 8, 22 + i * 10.5, { size: 7, color: l.head ? COLORS.gold : COLORS.text }));
    const msg = this.message || this.hint;
    if (msg) {
      panel(ctx, RIGHT_X, 188, VW - RIGHT_X - 4, 50, { fill: this.message ? '#4a2430' : '#2a3a2a' });
      textBlock(ctx, msg, RIGHT_X + 8, 194, VW - RIGHT_X - 20, { size: 7, lineHeight: 9, maxLines: 4 });
    }
  }

  // Bottom-left: actions for the selected card, or the turn controls.
  drawControls(g) {
    const { ctx } = g;
    const s = this.state;
    const X = 4;
    const W = 118;
    let y = 238;
    const info = this.info;
    if (info) {
      for (const act of info.actions) {
        const why = act.why;
        if (button(g, `act-${act.label}`, X, y, W, 18, act.label, { disabled: !!why, why, size: 7 })) act.run(g);
        y += 20;
        if (why) {
          textBlock(ctx, why, X + 2, y, W - 4, { size: 7, color: COLORS.danger, lineHeight: 8, maxLines: 3 });
          y += 26;
        }
      }
      if (this.mode === 'target') {
        text(ctx, 'Pick a glowing target.', X + 2, y, { size: 7, color: COLORS.gold });
        y += 11;
      }
      if (button(g, 'act-close', X, Math.min(y, VH - 20), W, 16, this.mode === 'target' ? 'Cancel (Esc)' : 'Close (Esc)', { color: '#4a3a4a', size: 7 })) {
        if (this.mode === 'target') {
          this.mode = 'idle';
          this.pending = null;
          this.targets = [];
        } else this.sel = null;
      }
      return;
    }
    const can = this.canAct();
    if (button(g, 'endturn', X, y, W, 24, 'End Turn (E)', { disabled: !can, color: '#7a4a20', hover: '#a8642a', why: 'Wait for your turn.', bold: true })) this.tryEndTurn(g);
    y += 28;
    if (button(g, 'hintbtn', X, y, 57, 16, 'Hint', { disabled: !can, size: 7 })) this.giveHint(g);
    if (button(g, 'logbtn', X + 61, y, 57, 16, 'Log (L)', { size: 7, selected: this.showLog })) this.showLog = !this.showLog;
    y += 20;
    if (button(g, 'concede', X, y, W, 16, this.confirmConcede ? 'Really concede?' : 'Concede', { color: '#5a2a3a', size: 7, disabled: s.winner !== null || this.opts.noConcede, why: 'You cannot concede this duel.' })) {
      if (this.confirmConcede) {
        this.state.players[0].nexus = 0;
        this.state.winner = 1;
        this.state.phase = 'over';
        this.state.log.push({ turn: s.turn, text: 'You concede the duel.' });
      } else this.confirmConcede = true;
    }
  }

  giveHint(g) {
    const s = this.state;
    const a = chooseAction(s, 0, 'expert', Math.random);
    const name = (uid) => {
      const f = findCreature(s, uid);
      return f ? topCard(f.c).name : '';
    };
    let msg = 'Nothing useful left this turn: end your turn.';
    if (a.type === 'summon') msg = `Try summoning ${CARDS[s.players[0].hand.find((h) => h.uid === a.uid).id].name}.`;
    else if (a.type === 'evolve') msg = `Try evolving ${name(a.target)} with ${CARDS[s.players[0].hand.find((h) => h.uid === a.uid).id].name}.`;
    else if (a.type === 'equip') msg = `Try equipping ${CARDS[s.players[0].hand.find((h) => h.uid === a.uid).id].name} on ${name(a.target)}.`;
    else if (a.type === 'technique' || a.type === 'terrain') msg = `Try using ${CARDS[s.players[0].hand.find((h) => h.uid === a.uid).id].name}${a.target ? ` on ${name(a.target)}` : ''}.`;
    else if (a.type === 'attack') msg = `Attack ${a.target === 'nexus' ? 'the Nexus' : name(a.target)} with ${name(a.attacker)}.`;
    this.hint = `Hint: ${msg}`;
    this.message = null;
  }

  selectionInfo() {
    const s = this.state;
    const sel = this.sel;
    const me = s.players[0];
    if (sel.kind === 'terrain') {
      if (!s.terrain || s.terrain.uid !== sel.uid) return null;
      return { id: s.terrain.id, actions: [], extra: s.terrain.owner === null ? 'Set by the duel rules.' : `Set by ${s.players[s.terrain.owner].name}.` };
    }
    if (sel.kind === 'hand') {
      const inst = me.hand.find((h) => h.uid === sel.uid);
      if (!inst) return null;
      const d = CARDS[inst.id];
      const kind = playKind(d);
      const base = { type: kind, p: 0, uid: inst.uid };
      const actions = [];
      const myTurn = this.canAct();
      const label = { summon: 'Summon', evolve: 'Evolve', equip: 'Equip', technique: 'Use', terrain: 'Set terrain' }[kind];
      let why = !myTurn ? 'Wait for your turn.' : null;
      let targets = [];
      if (!why) {
        if (kind === 'summon') {
          why = validate(s, base);
          targets = me.field.map((c, i) => (c ? null : `slot${i}`)).filter(Boolean);
        } else if (kind === 'terrain' || (kind === 'technique' && !d.target)) {
          why = validate(s, base);
        } else {
          const cands = kind === 'technique' ? [...s.players[1].field, ...me.field] : me.field;
          const reasons = [];
          for (const c of cands) {
            if (!c) continue;
            const r = validate(s, { ...base, target: c.uid });
            if (!r) targets.push(c.uid);
            else reasons.push(r);
          }
          if (!targets.length) why = mostUseful(reasons) || (kind === 'evolve' ? `Needs ${CARDS[d.evolvesFrom].name} on your field.` : 'No valid target.');
        }
      }
      let cost = d.cost;
      if (kind === 'evolve') {
        const t = me.field.find((c) => c && topId(c) === d.evolvesFrom);
        if (t) cost = evolveCost(s, t, d.id);
      }
      actions.push({
        label: `${label} (${cost} Essence)`,
        why,
        run: (g) => {
          if (kind === 'terrain' || (kind === 'technique' && !d.target)) this.doAction(g, base);
          else this.beginTarget(base, targets, kind === 'summon' ? 'slot' : 'target');
        },
      });
      return { id: inst.id, actions, cost };
    }
    // creature on a field
    const f = findCreature(s, sel.uid);
    if (!f) return null;
    const c = f.c;
    const d = topCard(c);
    const info = { id: topId(c), atk: atk(s, f.p, c), hp: hp(s, f.p, c), maxHp: maxHp(s, f.p, c), actions: [] };
    const parts = [];
    if (c.stack.length > 1) parts.push(`Lineage: ${c.stack.map((i) => CARDS[i.id].name).join(' > ')}`);
    if (c.relic) parts.push(`Relic: ${CARDS[c.relic.id].name} — ${CARDS[c.relic.id].text}`);
    if (isQuick(s, c) && !d.keywords.quick) parts.push('Quick (from relic/terrain).');
    info.extra = parts.join('\n');
    if (f.p === 0) {
      let why = !this.canAct() ? 'Wait for your turn.' : canAttackWith(s, 0, c);
      const targets = [];
      if (!why) {
        for (const a of legalActions(s)) if (a.type === 'attack' && a.attacker === c.uid) targets.push(a.target);
        if (!targets.length) why = 'No target can be attacked.';
      }
      info.actions.push({ label: `Attack (ATK ${info.atk})`, why, run: () => this.beginTarget({ type: 'attack', p: 0, attacker: c.uid }, targets, 'target') });
    }
    return info;
  }

  beginTarget(base, targets, field) {
    this.mode = 'target';
    this.pending = { base, field };
    this.targets = targets;
  }

  chooseTarget(g, key) {
    if (!this.pending) return;
    const { base, field } = this.pending;
    let a;
    if (field === 'slot') a = { ...base, slot: Number(String(key).replace('slot', '')) };
    else a = { ...base, target: key };
    this.doAction(g, a);
  }

  // ------------------------------------------------------------------ overlays
  drawMulligan(g) {
    const { ctx } = g;
    const me = this.state.players[0];
    rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.75)');
    panel(ctx, 40, 40, 400, 200);
    text(ctx, 'Opening hand', VW / 2, 50, { align: 'center', size: 12, bold: true, color: COLORS.gold });
    text(ctx, `${this.state.players[this.state.first].name} will go first.`, VW / 2, 66, { align: 'center', size: 8, color: COLORS.textDim });
    me.hand.forEach((h, i) => drawHandCard(ctx, h.id, 240 - (me.hand.length * 56) / 2 + i * 56, 84, { t: g.time }));
    text(ctx, 'You may shuffle this hand back and draw a new one, once.', VW / 2, 166, { align: 'center', size: 8 });
    if (button(g, 'keep', 120, 190, 110, 22, 'Keep hand')) this.doAction(g, { type: 'mulligan', p: 0, redraw: false });
    if (button(g, 'redraw', 250, 190, 110, 22, 'Redraw')) this.doAction(g, { type: 'mulligan', p: 0, redraw: true });
    if (this.opts.tutorial) this.hint = 'Click a card in your hand to see what it does. Green outline = can be played now.';
  }

  drawDiscard(g) {
    const { ctx } = g;
    const me = this.state.players[0];
    const need = me.hand.length - HAND_LIMIT;
    panel(ctx, 126, 196, 196, 42, { fill: '#4a2430' });
    text(ctx, `Hand limit: choose ${need} card(s) to discard.`, 224, 202, { align: 'center', size: 7 });
    const ok = this.discardSel.size === need;
    if (button(g, 'discard-ok', 174, 214, 100, 18, `Discard (${this.discardSel.size}/${need})`, { disabled: !ok, why: `Select exactly ${need}.` })) {
      this.doAction(g, { type: 'discard', p: 0, uids: [...this.discardSel] });
      this.discardSel.clear();
      this.aiTimer = 0.8;
    }
  }

  drawResult(g) {
    const { ctx } = g;
    const s = this.state;
    if (!this.result) {
      this.result = s.winner === 0 ? 'win' : s.winner === 'draw' ? 'draw' : 'lose';
      g.audio.stop();
      g.audio.sfx(this.result === 'win' ? 'win' : 'lose');
    }
    rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.6)');
    panel(ctx, 120, 100, 240, 110);
    const title = { win: 'Victory!', lose: 'Defeat', draw: 'Draw' }[this.result];
    text(ctx, title, VW / 2, 114, { align: 'center', size: 20, bold: true, color: this.result === 'win' ? COLORS.gold : this.result === 'lose' ? COLORS.danger : COLORS.text });
    const sub = this.opts.puzzle
      ? this.result === 'win' ? 'Challenge solved!' : 'The challenge was not solved.'
      : `${s.turn} turns · Nexus ${Math.max(0, s.players[0].nexus)} vs ${Math.max(0, s.players[1].nexus)}`;
    text(ctx, sub, VW / 2, 142, { align: 'center', size: 8, color: COLORS.textDim });
    if (button(g, 'res-continue', 180, 176, 120, 22, 'Continue')) g.pop({ result: this.result, turns: s.turn });
  }

  // Puzzle duels: solve within the allowed turns.
  checkPuzzle() {
    const p = this.opts.puzzle;
    const s = this.state;
    if (!p || s.winner !== null || this.busy()) return;
    if (s.active === 1 && s.phase !== 'mulligan') {
      s.winner = 1;
      s.phase = 'over';
      s.log.push({ turn: s.turn, text: 'The turn ended before the goal was reached.' });
    }
  }

  drawFx(g) {
    const { ctx } = g;
    for (const gh of this.ghosts) {
      const im = creatureImg(gh.id);
      if (im) img(ctx, im, gh.x + 8, gh.y + 14 - gh.t * 20, { alpha: Math.max(0, 1 - gh.t / 0.6) });
    }
    for (const f of this.floaters) {
      const a = Math.max(0, 1 - f.t);
      ctx.globalAlpha = a;
      text(ctx, f.txt, f.x, f.y - f.t * 18, { align: 'center', size: 10, bold: true, color: f.color });
      ctx.globalAlpha = 1;
    }
    if (this.flash > 0) rect(ctx, 0, 0, VW, VH, `rgba(255,250,220,${this.flash * 0.5})`);
    if (this.banner) {
      const a = Math.min(1, this.banner.t * 3);
      ctx.globalAlpha = a;
      rect(ctx, 126, 150, 196, 24, 'rgba(10,12,28,0.9)');
      text(ctx, this.banner.text, 224, 156, { align: 'center', size: 10, bold: true, color: COLORS.gold });
      ctx.globalAlpha = 1;
    }
    if (this.opts.puzzle && this.state.winner === null) {
      rect(ctx, 126, 228, 196, 12, 'rgba(60,40,10,0.9)');
      text(ctx, `Goal: ${this.opts.puzzle.goal}`, 224, 230, { align: 'center', size: 7, color: COLORS.gold });
    }
  }
}

// ------------------------------------------------------------------ utils
function pulse(t) {
  const k = (Math.sin(t * 6) + 1) / 2;
  return `rgba(255,214,90,${0.45 + k * 0.55})`;
}

function mostUseful(reasons) {
  return reasons.find((r) => /Essence/.test(r)) || reasons[0];
}

function wrapLines(ctx, str, maxW) {
  ctx.font = `500 7px "Pixelify Sans", sans-serif`;
  const words = str.split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      out.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
