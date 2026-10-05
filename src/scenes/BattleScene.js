import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { CHARACTERS } from '../data/characters.js';
import { ENEMIES, ENEMY_ACTIONS } from '../data/enemies.js';
import { ENCOUNTERS } from '../data/encounters.js';
import { SKILLS, STATUS_INFO } from '../data/skills.js';
import { ITEMS } from '../data/items.js';
import { BATTLE_SCRIPTS, BATTLE_TIPS } from '../data/battleScripts.js';
import { state, member, memberStats, grantXp, addItem, addProfile, restoreParty } from '../systems/state.js';
import { settings } from '../systems/settings.js';
import { latestSave, loadFrom } from '../systems/save.js';
import { uiScale } from '../systems/display.js';
import { BattleStage } from '../battle/stage.js';
import { techniqueCutIn, clashPrompt, CLASH_TABLE } from '../battle/cutin.js';
import { Controls } from '../systems/input.js';
import { spriteAsset } from '../gfx/assets.js';
import { DialogueBox } from '../ui/dialogue.js';
import { panel, text, bar, MenuList } from '../ui/widgets.js';
import { audio } from '../audio/audio.js';

const HERO_SLOTS = [{ x: 400, y: 505 }, { x: 250, y: 455 }, { x: 290, y: 560 }];
const ENEMY_SLOTS = [{ x: 900, y: 505 }, { x: 1080, y: 455 }, { x: 1100, y: 560 }];
const ANCHOR_SLOTS = [{ x: 760, y: 214 }, { x: 1010, y: 168 }, { x: 1190, y: 236 }];
const STRAIN_LIMIT = 70;

// Battlers sort by baseline between depth 10 and 70, under every HUD layer.
const depthFor = y => 10 + y / 10;

const sleep = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.data_ = data;
    this.enc = ENCOUNTERS[data.encounterId];
    this.onEnd = data.onEnd;
  }

  create() {
    const speed = settings.battleSpeed || 1;
    this.time.timeScale = speed;
    this.tweens.timeScale = speed;
    this.anims.globalTimeScale = speed;
    this.events.once('shutdown', () => { this.anims.globalTimeScale = 1; });

    this.setupCameras();
    this.controls = new Controls(this);
    this.partySnapshot = structuredClone(state.party);
    this.units = [];
    this.clock = 0;
    this.ended = false;
    this.firedEvents = new Set();
    this.fieldSealed = false;
    this.menu = null;
    this.targeting = null;
    this.modalWait = null;

    this.buildBackground();
    this.buildUnits();
    this.buildHud();
    this.dialogue = new DialogueBox(this, 2000);

    audio.play(this.enc.music || 'battle');
    this.cameras.main.fadeIn(350);
    this.hudCam.fadeIn(350);
    window.__VH = Object.assign(window.__VH || {}, { battle: this });
    this.time.delayedCall(450, () => this.run());
  }

  // ---------------------------------------------------------------- setup
  // Two cameras: the stage camera moves and zooms with the action; the HUD camera stays put.
  // Objects are routed by depth: HUD layers (>= 90, except on-stage effects 290-430) render
  // only on the HUD camera.
  setupCameras() {
    this.stageCam = this.cameras.main;
    this.hudCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    const apply = () => {
      const s = uiScale(this.game);
      this.uiS = s;
      this.hudCam.setSize(this.scale.width, this.scale.height).setOrigin(0, 0).setZoom(s).setScroll(0, 0);
      this.stageCam.setSize(this.scale.width, this.scale.height).setZoom(s * (this.camZoom || 1));
      this.stageCam.centerOn(this.camFocus?.x ?? GAME_W / 2, this.camFocus?.y ?? GAME_H / 2);
    };
    apply();
    this.game.events.on('display-changed', apply);
    this.events.once('shutdown', () => this.game.events.off('display-changed', apply));
  }

  routeCameras() {
    const stageBit = this.stageCam.id, hudBit = this.hudCam.id;
    for (const go of this.children.list) {
      const d = go.depth;
      const hud = d >= 90 && !(d >= 290 && d < 430);
      go.cameraFilter = hud ? stageBit : hudBit;
    }
  }

  // Ease the stage camera toward a point of interest (or back to centre).
  focus(x, y, zoom = 1, ms = 260) {
    this.camFocus = x === undefined ? null : { x, y };
    this.camZoom = zoom;
    const tx = x ?? GAME_W / 2, ty = y ?? GAME_H / 2;
    this.stageCam.pan(tx, ty, ms, 'Sine.easeInOut', true);
    this.stageCam.zoomTo(this.uiS * zoom, ms, 'Sine.easeInOut', true);
  }

  buildBackground() {
    const mood = state.phase === 'dawn' ? 'dawn' : state.phase === 'dusk' || state.phase === 'festival' ? 'dusk' : 'night';
    this.stage = new BattleStage(this, this.enc.background || 'emberfall', mood);
  }

  buildUnits() {
    const partyIds = this.enc.party || state.active;
    partyIds.forEach((id, i) => this.addHero(id, i));
    let ei = 0, ai = 0;
    for (const eid of this.enc.enemies) {
      const def = ENEMIES[eid];
      const slot = def.anchor ? ANCHOR_SLOTS[ai++] : ENEMY_SLOTS[ei++];
      this.addEnemy(eid, slot);
    }
  }

  addHero(id, slotIndex, opts = {}) {
    const def = CHARACTERS[id];
    let hp, focus, st;
    if (def.guest) {
      st = { ...def.base };
      hp = st.hp; focus = st.focus;
    } else {
      const m = member(id);
      st = memberStats(m);
      hp = Math.max(1, m.hp); focus = m.focus;
    }
    const slot = HERO_SLOTS[slotIndex];
    const u = {
      uid: `h_${id}`, key: id, side: 'hero', name: def.name, def, guest: !!def.guest,
      hp, maxHp: st.hp, focus, maxFocus: st.focus, atk: st.atk, defense: st.def, spd: st.spd, res: st.res,
      strain: 0, status: {}, home: { ...slot }, portrait: def.portrait, actions: 0,
    };
    const sp = this.add.sprite(opts.fromX ?? slot.x, slot.y, def.battle, 0).setOrigin(0.5, 1).setScale(2);
    sp.setDepth(depthFor(slot.y));
    u.shadow = this.add.image(slot.x, slot.y - 4, 'shadow').setScale(3, 2.2).setDepth(depthFor(slot.y) - 0.5);
    u.sprite = sp;
    sp.play(`${def.battle}:idle`);
    sp.setInteractive({ pixelPerfect: false });
    sp.on('pointerdown', () => this.pointerTarget(u));
    sp.on('pointerover', () => this.pointerHover(u));
    u.next = this.clock + (100 / u.spd) * (opts.initiative ?? 0.45);
    this.units.push(u);
    return u;
  }

  addEnemy(eid, slot) {
    const def = ENEMIES[eid];
    const n = this.units.filter(u => u.key === eid).length;
    const u = {
      uid: `e_${eid}_${n}`, key: eid, side: 'enemy', name: def.name, def,
      hp: def.hp, maxHp: def.hp, atk: def.atk, defense: def.def, spd: def.spd, res: def.res,
      resolve: def.resolve, maxResolve: def.resolve, status: {}, home: { ...slot }, actions: 0,
      anchor: !!def.anchor, portrait: def.anchor ? null : eid,
    };
    if (settings.difficulty === 'story') { u.hp = u.maxHp = Math.round(def.hp * 0.8); }
    if (def.anchor) {
      const chain = this.add.graphics().setDepth(depthFor(slot.y) - 1);
      chain.lineStyle(2, 0x2b1d14, 1).lineBetween(slot.x, 0, slot.x, slot.y - 60);
      u.chain = chain;
      u.sprite = this.add.image(slot.x, slot.y, def.texture).setOrigin(0.5, 1).setScale(1.6).setDepth(depthFor(slot.y));
      u.glow = this.add.image(slot.x, slot.y - 30, 'glow').setTint(0xff3030).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4).setAlpha(0.6).setDepth(depthFor(slot.y) + 0.5);
      this.tweens.add({ targets: u.sprite, angle: { from: -4, to: 4 }, duration: 1800 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: u.glow, alpha: { from: 0.35, to: 0.8 }, duration: 700, yoyo: true, repeat: -1 });
      u.next = Infinity;
    } else {
      const sp = this.add.sprite(slot.x, slot.y, def.sheet, 0).setOrigin(0.5, 1).setScale(def.scale || 2).setDepth(depthFor(slot.y));
      sp.play(`${def.sheet}:idle`);
      u.sprite = sp;
      u.shadow = this.add.image(slot.x, slot.y - 4, 'shadow').setScale(3.4, 2.4).setDepth(depthFor(slot.y) - 0.5);
      u.next = this.clock + (100 / u.spd) * (0.6 + Math.random() * 0.4);
    }
    u.sprite.setInteractive();
    u.sprite.on('pointerdown', () => this.pointerTarget(u));
    u.sprite.on('pointerover', () => this.pointerHover(u));
    this.units.push(u);
    return u;
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    this.hud = {};
    // Initiative queue
    this.queueG = this.add.graphics().setDepth(100);
    this.queueItems = [];
    text(this, GAME_W / 2, 14, 'TURN ORDER', { size: 11, color: '#c9a45c', bold: true, origin: [0.5, 0] }).setDepth(101);
    // Banner + log
    this.banner = text(this, GAME_W / 2, 112, '', { size: 26, title: true, color: '#f3ead6', origin: 0.5, stroke: '#000', strokeThickness: 5 }).setDepth(150).setAlpha(0);
    this.log = text(this, GAME_W / 2, 146, '', { size: 17, color: '#efe6d2', origin: 0.5, stroke: '#000', strokeThickness: 4, wrap: 900, align: 'center' }).setDepth(150);
    // Party panel
    panel(this, 340, GAME_H - 150, GAME_W - 360, 134).setDepth(90);
    this.partyRows = [];
    // Enemy labels
    for (const u of this.units) this.makeUnitHud(u);
    this.refreshHud();
  }

  makeUnitHud(u) {
    if (u.side === 'enemy') {
      const y = u.anchor ? u.home.y + 14 : u.home.y - (u.sprite.displayHeight * 0.92) - 34;
      const x = u.home.x;
      u.hud = {
        name: text(this, x, y, u.name, { size: 14, color: '#f3ead6', origin: [0.5, 1], stroke: '#000', strokeThickness: 3 }).setDepth(120),
        hp: bar(this, x - 60, y + 4, 120, 8, 0xd9534f, 0x3a1418).setDepth(120),
        res: u.anchor ? null : bar(this, x - 60, y + 15, 120, 5, 0xf2c14e, 0x2d2410).setDepth(120),
        tags: text(this, x, y + 24, '', { size: 12, color: '#c9a0ff', origin: [0.5, 0], stroke: '#000', strokeThickness: 3 }).setDepth(120),
        telegraph: text(this, x, y - 22, '', { size: 22, color: '#ff8a80', origin: [0.5, 1], bold: true, stroke: '#000', strokeThickness: 4 }).setDepth(121),
      };
    } else {
      this.layoutPartyRows();
    }
  }

  layoutPartyRows() {
    for (const r of this.partyRows) Object.values(r).forEach(o => o?.destroy?.());
    this.partyRows = [];
    const heroes = this.units.filter(u => u.side === 'hero');
    heroes.forEach((u, i) => {
      const x = 368 + i * 300, y = GAME_H - 136;
      const r = {
        name: text(this, x, y, u.name, { size: 18, title: true, bold: true, color: '#f0d79a' }).setDepth(95),
        hpT: text(this, x, y + 30, '', { size: 14 }).setDepth(95),
        hp: bar(this, x + 110, y + 34, 150, 10, 0xd9534f, 0x3a1418).setDepth(95),
        fT: text(this, x, y + 52, '', { size: 14 }).setDepth(95),
        f: bar(this, x + 110, y + 56, 150, 8, 0x4fa3d9, 0x0f2433).setDepth(95),
        sT: u.key === 'kai' ? text(this, x, y + 72, '', { size: 14, color: '#d3b8ff' }).setDepth(95) : null,
        s: u.key === 'kai' ? bar(this, x + 110, y + 76, 150, 8, 0xa560ff, 0x1d1030).setDepth(95) : null,
        tags: text(this, x, y + 96, '', { size: 12, color: '#9fd3ff' }).setDepth(95),
        hl: this.add.graphics().setDepth(94),
      };
      u.row = r;
      this.partyRows.push(r);
    });
  }

  tagsFor(u) {
    const t = [];
    const s = u.status;
    if (s.guard) t.push('GUARD');
    if (s.counter) t.push('STANCE');
    if (s.bleed) t.push(`BLEED ${s.bleed}`);
    if (s.burn) t.push(`BURN ${s.burn}`);
    if (s.suppressed) t.push(`SUPPRESSED ${s.suppressed}`);
    if (s.staggered) t.push('STAGGERED');
    if (s.marked) t.push('HUNTED!');
    if (u.key === 'kai' && u.strain >= STRAIN_LIMIT) t.push('STRAINED');
    return t.join('  ');
  }

  regenRate(u) {
    if (!u.def.vampire) return 0;
    const anchors = this.units.filter(x => x.anchor && !x.dead).length;
    return (u.def.regen || 0) + (u.def.regenPerAnchor || 0) * anchors;
  }

  refreshHud(active) {
    for (const u of this.units) {
      if (u.side === 'enemy' && u.hud) {
        const vis = !u.dead;
        Object.values(u.hud).forEach(o => { if (!o) return; (o.g || o).setVisible(vis); });
        if (!vis) continue;
        u.hud.hp.set(u.hp / u.maxHp);
        u.hud.res?.set(u.resolve / u.maxResolve);
        let tags = this.tagsFor(u);
        const rr = this.regenRate(u);
        if (rr > 0) tags = `${u.status.suppressed || u.status.burn ? 'REGEN HALTED' : `REGEN +${Math.round(rr * 100)}%`}${tags ? '  ' + tags : ''}`;
        u.hud.tags.setText(tags);
        u.hud.tags.setColor(rr > 0 && !(u.status.suppressed || u.status.burn) ? '#8be38b' : '#c9a0ff');
        u.hud.telegraph.setText(u.windup ? '!' : '');
      }
      if (u.side === 'hero' && u.row) {
        const r = u.row;
        r.hpT.setText(`HP ${Math.max(0, Math.round(u.hp))}/${u.maxHp}`);
        r.hp.set(u.hp / u.maxHp);
        r.fT.setText(`Focus ${u.focus}/${u.maxFocus}`);
        r.f.set(u.focus / u.maxFocus);
        if (r.s) { r.sT.setText(state.sealStage >= 1 ? `Strain ${u.strain}` : 'Strain —'); r.s.set(u.strain / 100); }
        r.tags.setText(this.tagsFor(u));
        r.name.setColor(u.dead ? '#7a6a6a' : '#f0d79a');
        r.hl.clear();
        if (active === u) { r.hl.fillStyle(0xc9a45c, 0.15).fillRect(r.name.x - 14, r.name.y - 6, 290, 124); r.hl.fillStyle(0xf0d79a, 1).fillRect(r.name.x - 14, r.name.y - 6, 3, 124); }
      }
    }
    this.drawQueue();
  }

  forecast(n = 9) {
    const alive = this.units.filter(u => !u.dead && isFinite(u.next));
    const sim = alive.map(u => ({ u, t: u.next }));
    const out = [];
    for (let i = 0; i < n && sim.length; i++) {
      sim.sort((a, b) => a.t - b.t);
      out.push(sim[0].u);
      sim[0].t += 100 / sim[0].u.spd;
    }
    return out;
  }

  drawQueue() {
    for (const o of this.queueItems) o.destroy();
    this.queueItems = [];
    const cur = this.activeUnit && !this.activeUnit.dead ? [this.activeUnit] : [];
    const list = [...cur, ...this.forecast(9 - cur.length)];
    const size = 52, gap = 8;
    const total = list.length * (size + gap) - gap + 14;
    let x = GAME_W / 2 - total / 2;
    const g = this.queueG;
    g.clear();
    g.fillStyle(0x0a0c18, 0.75).fillRect(x - 12, 30, total + 24, size + 18);
    list.forEach((u, i) => {
      const s = i === 0 ? size + 14 : size;
      const yy = 38 - (i === 0 ? 7 : 0);
      const col = u.side === 'hero' ? 0x6fb7ff : 0xff6b6b;
      g.fillStyle(0x000000, 1).fillRect(x, yy, s, s);
      const key = u.portrait ? `portrait:${u.portrait}` : null;
      if (key && this.textures.exists(key)) {
        const im = this.add.image(x + s / 2, yy + s / 2, key).setDisplaySize(s - 4, s - 4).setDepth(101);
        if (u.status.staggered) im.setTint(0x777777);
        this.queueItems.push(im);
      }
      g.lineStyle(i === 0 ? 3 : 2, i === 0 ? 0xf0d79a : col, 1).strokeRect(x, yy, s, s);
      g.fillStyle(col, 1).fillRect(x, yy + s - 4, s, 4);
      x += s + gap;
    });
  }

  // ---------------------------------------------------------------- flow
  heroes() { return this.units.filter(u => u.side === 'hero' && !u.dead); }
  enemies() { return this.units.filter(u => u.side === 'enemy' && !u.dead); }
  foes() { return this.enemies().filter(u => !u.anchor); }

  async run() {
    if (this.enc.tutorial) await this.tip(this.enc.tutorial);
    while (!this.ended) {
      const u = this.units.filter(x => !x.dead && isFinite(x.next)).sort((a, b) => a.next - b.next)[0];
      if (!u) break;
      this.clock = u.next;
      u.next += 100 / u.spd;
      this.activeUnit = u;
      this.refreshHud(u);
      const canAct = await this.startTurn(u);
      if (this.ended) break;
      if (await this.checkEnd()) break;
      if (canAct) {
        if (u.side === 'hero') {
          const action = await this.playerChoose(u);
          await this.executeHero(u, action);
        } else {
          await this.executeEnemy(u);
        }
        u.actions++;
      }
      this.refreshHud();
      await this.checkEvents();
      if (await this.checkEnd()) break;
      await sleep(this, 140);
    }
  }

  async startTurn(u) {
    const s = u.status;
    s.guard = false;
    if (s.counter) s.counter = false;
    if (s.bleed) {
      const d = Math.max(3, Math.round(u.maxHp * 0.05));
      this.damage(u, d, { color: '#ff6b6b', note: 'Bleed' });
      s.bleed--;
      await sleep(this, 350);
    }
    if (s.burn) {
      const d = Math.max(3, Math.round(u.maxHp * 0.045));
      this.damage(u, d, { color: '#ffb347', note: 'Burn' });
      s.burn--;
      await sleep(this, 350);
    }
    if (u.dead) return false;
    const rr = this.regenRate(u);
    if (rr > 0) {
      if (s.suppressed || s.burn) {
        this.popup(u, 'Regen halted', '#c9a0ff');
      } else if (u.hp < u.maxHp) {
        const h = Math.round(u.maxHp * rr);
        u.hp = Math.min(u.maxHp, u.hp + h);
        this.popup(u, `+${h}`, '#8be38b');
        this.burst(u, 0x8be38b, 10);
        if (!state.tutorials.regen_seen) state.tutorials.regen_seen = true;
        await sleep(this, 380);
      }
    }
    if (s.suppressed) s.suppressed--;
    if (u.side === 'hero') u.focus = Math.min(u.maxFocus, u.focus + 2);
    if (s.staggered) {
      s.staggered = false;
      u.resolve = u.maxResolve;
      this.say_(`${u.name} recovers from the stagger.`);
      await sleep(this, 650);
      return false;
    }
    this.refreshHud(u);
    return true;
  }

  // ---------------------------------------------------------------- player input
  playerChoose(u) {
    return new Promise(resolve => {
      this.choiceResolve = resolve;
      this.currentUnit = u;
      this.say_(`${u.name}'s turn.`);
      this.openCommands(u);
    });
  }

  closeMenus() {
    this.menu?.destroy(); this.menu = null;
    this.menuPanel?.destroy(); this.menuPanel = null;
    this.descPanel?.destroy(); this.descPanel = null;
    this.descText?.destroy(); this.descText = null;
    this.endTargeting();
  }

  commandPanel(h) {
    this.menuPanel?.destroy();
    this.menuPanelTop = GAME_H - h - 16;
    this.menuPanel = panel(this, 18, this.menuPanelTop, 306, h).setDepth(200);
  }

  showDesc(str) {
    this.descPanel?.destroy();
    this.descText?.destroy();
    this.descPanel = null;
    this.descText = null;
    if (!str) return;
    const top = this.menuPanelTop ?? GAME_H - 200;
    this.descText = text(this, 36, 0, str, { size: 14, wrap: 270, color: '#e8e0cc' }).setDepth(206);
    const h = this.descText.height + 28;
    this.descText.setY(top - h - 2 + 14);
    this.descPanel = panel(this, 18, top - h - 6, 306, h).setDepth(205);
  }

  openCommands(u) {
    this.closeMenus();
    const items = [{ label: 'Attack', id: 'attack' }];
    if (u.def.cadence?.length) items.push({ label: 'Cadence ▸', id: 'cadence' });
    if (u.key === 'kai' && state.sealStage >= 1) items.push({ label: 'Veil Arts ▸', id: 'veil', color: '#d3b8ff' });
    items.push({ label: 'Guard', id: 'guard' });
    const itemCount = Object.entries(state.inventory).filter(([k, v]) => v > 0 && ITEMS[k]?.battle).length;
    items.push({ label: 'Item ▸', id: 'item', disabled: !itemCount });
    this.commandPanel(items.length * 38 + 28);
    this.menu = new MenuList(this, 30, GAME_H - items.length * 38 - 30, items, {
      width: 270, lineH: 38, size: 20, depth: 201, index: this.lastCmd?.[u.uid] || 0,
      onSelect: (it, i) => {
        this.lastCmd = { ...(this.lastCmd || {}), [u.uid]: i };
        if (it.id === 'attack') this.chooseTarget(u, 'attack', () => this.openCommands(u));
        else if (it.id === 'cadence') this.openSkills(u, u.def.cadence);
        else if (it.id === 'veil') this.openSkills(u, u.def.veil);
        else if (it.id === 'guard') this.commit({ type: 'guard' });
        else if (it.id === 'item') this.openItems(u);
      },
      onChange: it => {
        const d = {
          attack: `Strike with your weapon (${u.key === 'kai' ? state.weapon : 'Cinder Vow'}).`,
          cadence: 'Cadence techniques spend Focus.',
          veil: 'Veil Arts draw on the mark. They raise Veil Strain instead of spending Focus.',
          guard: 'Halve damage until your next turn. Restore 3 Focus' + (u.key === 'kai' ? ' and reduce Veil Strain by 15.' : '.'),
          item: 'Use a consumable.',
        }[it.id];
        this.showDesc(d);
      },
    });
    this.menu.emitChange();
  }

  skillCost(u, id) {
    const sk = SKILLS[id];
    if (!sk.cost) return { ok: true, label: '' };
    if (sk.cost.focus) return { ok: u.focus >= sk.cost.focus, label: `${sk.cost.focus} FP` };
    if (sk.cost.strain) {
      const c = this.strainCost(u, sk);
      return { ok: u.strain + c <= 100, label: `+${c} Strain` };
    }
    return { ok: true, label: '' };
  }

  strainCost(u, sk) {
    return Math.round(sk.cost.strain * (u.strain >= STRAIN_LIMIT ? 1.5 : 1));
  }

  openSkills(u, ids) {
    this.closeMenus();
    const items = ids.map(id => {
      const c = this.skillCost(u, id);
      return { label: `${SKILLS[id].name}`, id, disabled: !c.ok, cost: c.label };
    });
    items.push({ label: 'Back', id: '_back' });
    this.commandPanel(items.length * 38 + 28);
    const y0 = GAME_H - items.length * 38 - 30;
    this.menu = new MenuList(this, 30, y0, items, {
      width: 270, lineH: 38, size: 19, depth: 201,
      onSelect: it => {
        if (it.id === '_back') { this.openCommands(u); return; }
        const sk = SKILLS[it.id];
        if (sk.target === 'self') this.commit({ type: 'skill', skill: it.id, targets: [u] });
        else if (sk.target === 'allEnemies') this.commit({ type: 'skill', skill: it.id, targets: this.enemies() });
        else this.chooseTarget(u, it.id, () => this.openSkills(u, ids));
      },
      onCancel: () => this.openCommands(u),
      onChange: it => this.showDesc(it.id === '_back' ? '' : `${SKILLS[it.id].desc}${it.cost ? `\nCost: ${it.cost}` : ''}`),
    });
    items.forEach((it, i) => {
      if (!it.cost) return;
      const t = text(this, 300, y0 + i * 38 + 3, it.cost, { size: 13, color: it.disabled ? '#6d6758' : '#9fd3ff', origin: [1, 0] }).setDepth(202);
      this.menu.objs.push(t);
    });
    this.menu.emitChange();
  }

  openItems(u) {
    this.closeMenus();
    const ids = Object.entries(state.inventory).filter(([k, v]) => v > 0 && ITEMS[k]?.battle).map(([k]) => k);
    const items = ids.map(id => ({ label: `${ITEMS[id].name} ×${state.inventory[id]}`, id }));
    items.push({ label: 'Back', id: '_back' });
    this.commandPanel(items.length * 38 + 28);
    this.menu = new MenuList(this, 30, GAME_H - items.length * 38 - 30, items, {
      width: 270, lineH: 38, size: 18, depth: 201,
      onSelect: it => {
        if (it.id === '_back') { this.openCommands(u); return; }
        const heroes = this.heroes();
        if (heroes.length === 1) this.commit({ type: 'item', item: it.id, targets: [heroes[0]] });
        else this.chooseAlly(u, it.id, () => this.openItems(u));
      },
      onCancel: () => this.openCommands(u),
      onChange: it => this.showDesc(it.id === '_back' ? '' : ITEMS[it.id].desc),
    });
    this.menu.emitChange();
  }

  chooseTarget(u, skillId, back) {
    const list = this.enemies().sort((a, b) => a.home.x - b.home.x || a.home.y - b.home.y);
    this.startTargeting(list, (t) => this.commit({ type: 'skill', skill: skillId, targets: [t] }), back);
  }

  chooseAlly(u, itemId, back) {
    this.startTargeting(this.heroes(), (t) => this.commit({ type: 'item', item: itemId, targets: [t] }), back);
  }

  startTargeting(list, onPick, back) {
    this.menu?.setActive(false);
    const prefer = list.findIndex(t => !t.anchor);
    this.targeting = { list, index: Math.max(0, prefer), onPick, back };
    this.cursor = this.add.image(0, 0, 'marker').setScale(2.4).setDepth(300);
    this.tweens.add({ targets: this.cursor, scale: 2.8, duration: 400, yoyo: true, repeat: -1 });
    this.updateCursor();
  }

  updateCursor() {
    const t = this.targeting.list[this.targeting.index];
    const top = t.anchor ? t.home.y - 76 : t.home.y - t.sprite.displayHeight * 0.92 - 70;
    this.cursor.setPosition(t.home.x, top);
    const extra = t.side === 'enemy' ? (t.def.note || '') : `HP ${t.hp}/${t.maxHp}`;
    this.showDesc(`${t.name}${t.def.title ? ` — ${t.def.title}` : ''}\n${extra}`);
  }

  endTargeting() {
    this.cursor?.destroy();
    this.cursor = null;
    this.targeting = null;
  }

  pointerHover(u) {
    if (!this.targeting) return;
    const i = this.targeting.list.indexOf(u);
    if (i >= 0 && i !== this.targeting.index) { this.targeting.index = i; this.updateCursor(); }
  }

  pointerTarget(u) {
    if (!this.targeting) return;
    const i = this.targeting.list.indexOf(u);
    if (i < 0) return;
    const pick = this.targeting.onPick;
    audio.sfx('confirm');
    pick(u);
  }

  commit(action) {
    const r = this.choiceResolve;
    this.choiceResolve = null;
    this.closeMenus();
    r?.(action);
  }

  update(time, delta) {
    this.routeCameras();
    this.dialogue?.update(this.controls, delta);
    if (this.dialogue?.active) return;
    if (this.modalWait) {
      if (this.controls.pressed('confirm') || this.controls.pressed('cancel')) { const r = this.modalWait; this.modalWait = null; r(); }
      return;
    }
    if (this.resultMenu) { this.resultMenu.handle(this.controls); return; }
    if (this.targeting) {
      const c = this.controls;
      const n = this.targeting.list.length;
      if (c.pressed('left') || c.pressed('up')) { this.targeting.index = (this.targeting.index - 1 + n) % n; this.updateCursor(); audio.sfx('move'); }
      else if (c.pressed('right') || c.pressed('down')) { this.targeting.index = (this.targeting.index + 1) % n; this.updateCursor(); audio.sfx('move'); }
      else if (c.pressed('confirm')) { audio.sfx('confirm'); this.targeting.onPick(this.targeting.list[this.targeting.index]); }
      else if (c.pressed('cancel')) { audio.sfx('cancel'); const b = this.targeting.back; this.endTargeting(); b(); }
      return;
    }
    this.menu?.handle(this.controls);
  }

  // ---------------------------------------------------------------- resolution
  calcDamage(att, tgt, power, opts = {}) {
    let def = tgt.defense;
    if (tgt.key === 'kai' && tgt.strain >= STRAIN_LIMIT) def *= 0.7;
    let dmg = att.atk * power * (60 / (60 + def)) * (0.92 + Math.random() * 0.16);
    if (tgt.status.staggered) dmg *= 1.5;
    if (tgt.status.guard || tgt.status.counter) dmg *= 0.5;
    if (opts.weak) dmg *= 1.25;
    if (opts.anchorBonus && tgt.anchor) dmg *= opts.anchorBonus;
    if (settings.difficulty === 'story') dmg *= att.side === 'enemy' ? 0.6 : 1.2;
    return Math.max(1, Math.round(dmg));
  }

  damage(u, amount, opts = {}) {
    const pend = this.protectActive();
    u.hp -= amount;
    if (u.side === 'hero' && pend && u.hp < 1) u.hp = 1;
    this.popup(u, `${amount}`, opts.color || (u.side === 'hero' ? '#ff9e9e' : '#ffffff'), opts.big);
    if (u.hp <= 0) this.kill(u);
    this.refreshHud();
  }

  protectActive() {
    return (this.enc.events || []).some(e => e.protectParty && !this.firedEvents.has(e.id));
  }

  kill(u) {
    u.hp = 0;
    u.dead = true;
    u.status = {};
    u.windup = false;
    if (u.side === 'hero') {
      u.sprite.play(`${u.def.battle}:knockout`);
    } else if (u.anchor) {
      audio.sfx('break');
      this.burst(u, 0xff4040, 24);
      this.tweens.add({ targets: [u.sprite, u.glow], alpha: 0, scale: 0.6, duration: 400 });
      u.chain?.setVisible(false);
    } else {
      u.sprite.play(`${u.def.sheet}:defeat`);
      this.tweens.add({ targets: [u.sprite, u.shadow], alpha: 0, delay: 900, duration: 500 });
    }
  }

  revive(u, ratio) {
    u.dead = false;
    u.hp = Math.round(u.maxHp * ratio);
    if (u.anchor) {
      u.chain?.setVisible(true);
      this.tweens.add({ targets: [u.sprite], alpha: 1, scale: 1.6, duration: 400 });
      this.tweens.add({ targets: [u.glow], alpha: 0.6, scale: 1.4, duration: 400 });
    }
  }

  async playOnce(u, anim) {
    const key = `${u.def.battle || u.def.sheet}:${anim}`;
    if (!this.anims.exists(key) || u.anchor) return;
    await new Promise(res => {
      u.sprite.once('animationcomplete', res);
      u.sprite.play(key);
    });
    if (!u.dead) u.sprite.play(`${u.def.battle || u.def.sheet}:idle`);
  }

  async lunge(u, target, distance = 150) {
    if (u.anchor) return;
    const dir = u.side === 'hero' ? 1 : -1;
    const tx = target ? target.home.x - dir * distance : u.home.x + dir * 60;
    await new Promise(r => this.tweens.add({ targets: u.sprite, x: tx, duration: 200, ease: 'Cubic.easeOut', onComplete: r }));
  }

  async retreat(u) {
    if (u.anchor) return;
    this.tweens.add({ targets: u.sprite, x: u.home.x, duration: 260, ease: 'Cubic.easeInOut' });
    await sleep(this, 260);
  }

  async executeHero(u, action) {
    if (action.type === 'guard') {
      u.status.guard = true;
      u.focus = Math.min(u.maxFocus, u.focus + 3);
      if (u.key === 'kai') u.strain = Math.max(0, u.strain - 15);
      audio.sfx('guard');
      this.ring(u, 0x9fd3ff);
      this.say_(`${u.name} guards.`);
      await sleep(this, 500);
      return;
    }
    if (action.type === 'item') {
      const it = ITEMS[action.item];
      const t = action.targets[0];
      addItem(action.item, -1);
      this.showBanner(it.name);
      if (it.heal) { t.hp = Math.min(t.maxHp, t.hp + it.heal); this.popup(t, `+${it.heal}`, '#8be38b'); }
      if (it.focus) { t.focus = Math.min(t.maxFocus, t.focus + it.focus); this.popup(t, `+${it.focus} FP`, '#9fd3ff'); }
      if (it.strain && t.key === 'kai') { t.strain = Math.max(0, t.strain + it.strain); this.popup(t, `${it.strain} Strain`, '#d3b8ff'); }
      for (const c of it.cure || []) delete t.status[c];
      audio.sfx('heal');
      this.burst(t, 0x8be38b, 14);
      await sleep(this, 650);
      return;
    }
    const sk = SKILLS[action.skill];
    if (sk.cost?.focus) u.focus -= sk.cost.focus;
    if (sk.cost?.strain) u.strain = Math.min(100, u.strain + this.strainCost(u, sk));
    if (action.skill !== 'attack') this.showBanner(sk.name, sk.kind === 'veil' ? '#d3b8ff' : '#f3ead6');
    this.refreshHud(u);

    if (sk.effect === 'counterStance') {
      u.status.counter = true;
      audio.sfx('guard');
      this.ring(u, 0xe9e3ff);
      await this.playOnce(u, 'skill');
      this.say_(`${u.name} settles into Pale Return.`);
      return;
    }

    const multi = action.targets.length > 1;
    const veil = sk.kind === 'veil';
    const flame = action.skill === 'ashen_arc' || action.skill === 'white_funeral';
    const color = veil ? 0x8a4dff : flame ? 0xffc77a : 0xc9b8ff;
    if (sk.kind !== 'basic') {
      const seen = state.seenAnimations[action.skill];
      if (!(seen && settings.skipSeenAnimations)) {
        await techniqueCutIn(this, { portrait: u.portrait, name: sk.name, school: sk.school, color, short: !!seen && action.skill !== 'white_funeral' });
      }
      state.seenAnimations[action.skill] = true;
    }
    const tgt0 = action.targets[0];
    if (!multi && tgt0) this.focus((u.home.x + tgt0.home.x) / 2, 400, 1.12);
    else this.focus(GAME_W / 2, 380, 1.04);
    if (veil) { audio.sfx('veil'); this.ring(u, 0xa970ff); }
    if (!multi) await this.lunge(u, action.targets[0], 170);
    const anim = sk.kind === 'basic' ? 'attack' : 'skill';
    const p = this.playOnce(u, anim);
    await sleep(this, multi ? 380 : 260);
    if (action.skill === 'white_funeral') {
      this.fieldSealed = true;
      audio.sfx('flame');
      this.flashScreen(0xffffff, 0.3);
      for (const t of this.enemies()) this.ring(t, 0xfff2d0);
    }
    for (const t of action.targets) {
      if (t.dead) continue;
      await this.hit(u, t, sk, { veil, flame });
      if (multi) await sleep(this, 90);
    }
    if (sk.kind !== 'basic') this.stage.wash(color, 0.3);
    await p;
    if (!multi) await this.retreat(u);
    this.focus();
    if (action.skill === 'white_funeral') {
      for (const t of this.foes()) if (t.def.vampire) t.status.suppressed = Math.max(t.status.suppressed || 0, 2);
      this.say_('White Funeral seals the square. The blood anchors cannot be rekindled.');
    }
    if (u.key === 'kai' && u.strain >= STRAIN_LIMIT && veil) this.say_('Kai is Strained — Guard to steady the mark.');
    await sleep(this, 200);
  }

  async hit(att, t, sk, fx = {}) {
    const weak = sk.element && t.def.weak?.includes(sk.element);
    const dmg = this.calcDamage(att, t, sk.power, { weak, anchorBonus: sk.anchorBonus });
    const color = fx.veil ? 0xb07bff : fx.flame ? 0xffe2b0 : 0xffffff;
    this.slashFx(t, color);
    audio.sfx(fx.flame ? 'flame' : 'slash');
    this.time.delayedCall(60, () => audio.sfx('hit'));
    if (!t.anchor && !t.dead) this.playOnce(t, 'hurt');
    this.shakeTarget(t);
    this.damage(t, dmg, { big: dmg > 40 });
    if (t.def.boss && !this.bloodMood && t.hp > 0 && t.hp / t.maxHp < 0.35 && state.sealStage >= 1) {
      this.bloodMood = true;
      this.stage.setMood('blood', 1200);
      this.say_(`${t.name} is cornered — the moon bleeds red over the square.`);
    }
    if (weak) this.popup(t, 'WEAK', '#f2c14e', false, -26);
    if (t.dead) return;
    if (sk.suppress && t.def.vampire) { t.status.suppressed = Math.max(t.status.suppressed || 0, sk.suppress); this.popup(t, 'SUPPRESSED', '#c9a0ff', false, -26); }
    if (sk.dawnstone && t.def.vampire) t.status.suppressed = Math.max(t.status.suppressed || 0, 1);
    if (sk.status?.burn && !t.anchor) t.status.burn = Math.max(t.status.burn || 0, sk.status.burn);
    if (t.maxResolve && !t.status.staggered) {
      const br = (sk.break || 10) * (weak ? 1.6 : 1);
      t.resolve = Math.max(0, t.resolve - br);
      if (t.resolve <= 0) this.stagger(t);
    }
    this.refreshHud();
  }

  stagger(t) {
    t.status.staggered = true;
    t.windup = false;
    t.windupTarget = null;
    audio.sfx('break');
    this.popup(t, 'BREAK!', '#f2c14e', true, -40);
    this.flashScreen(0xf2c14e, 0.18);
    this.say_(`${t.name}'s Resolve breaks! It loses its next action and takes extra damage.`);
  }

  async executeEnemy(u) {
    const heroes = this.heroes();
    if (!heroes.length) return;
    const ctx = { heroes, enemies: this.units.filter(x => x.side === 'enemy'), rng: Math.random, turn: u.actions, fieldSealed: this.fieldSealed };
    const plan = u.def.ai(u, ctx);
    if (!plan) return;
    const act = ENEMY_ACTIONS[plan.action];
    if (plan.telegraph) {
      u.windup = true;
      u.windupTarget = plan.target;
      this.showBanner('Winding up…', '#ff8a80');
      this.say_(plan.text);
      this.ring(u, 0xff6b6b);
      audio.sfx('guard');
      await sleep(this, 700);
      this.refreshHud();
      await this.tip('windup');
      return;
    }
    if (u.windup) { u.windup = false; }
    let target = plan.target && !plan.target.dead ? plan.target : heroes[Math.floor(Math.random() * heroes.length)];
    this.showBanner(act.name, '#ffb3a8');
    if (plan.text) this.say_(plan.text);

    if (act.mark) {
      target.status.marked = true;
      this.ring(target, 0xff6b6b);
      audio.sfx('guard');
      await sleep(this, 800);
      return;
    }
    if (act.reviveAnchor) {
      if (this.fieldSealed) return;
      this.revive(plan.target, 0.5);
      this.say_('Garran breathes on a dead lantern. It flares red again.');
      audio.sfx('lanternOut');
      await sleep(this, 800);
      return;
    }
    if (act.all) {
      await this.playOnce(u, 'attack');
      for (const h of this.heroes()) {
        const d = this.calcDamage(u, h, act.power);
        this.slashFx(h, 0xff9a40);
        this.damage(h, d);
        if (!h.dead) this.playOnce(h, 'hurt');
      }
      audio.sfx('heavy');
      this.shake(220, 0.006);
      await sleep(this, 400);
      return;
    }

    let power = act.power;
    let clash = null;
    if (act.clash && target.side === 'hero') {
      this.focus((u.home.x + target.home.x) / 2, 420, 1.15);
      clash = await this.runClash(u, target, act.clash);
      power *= { best: clash === 'counter' ? 0.2 : 0, ok: 0.45, bad: 1.25 }[clash.result];
    } else {
      this.focus((u.home.x + target.home.x) / 2, 420, 1.06, 200);
    }
    await this.lunge(u, target, 150);
    const p = this.playOnce(u, 'attack');
    await sleep(this, 300);
    const dmg = power > 0 ? this.calcDamage(u, target, power) : 0;
    if (dmg === 0) { this.popup(target, 'MISS', '#9fd3ff', true); audio.sfx('guard'); }
    else this.slashFx(target, 0xff7070);
    audio.sfx(power > 1.5 ? 'heavy' : 'hit');
    this.shakeTarget(target);
    if (power > 1.5) this.shake(200, 0.006);
    if (dmg > 0) {
      this.damage(target, dmg);
      if (!target.dead) this.playOnce(target, 'hurt');
    }
    if (act.status?.bleed && !target.dead && !target.status.guard) target.status.bleed = Math.max(target.status.bleed || 0, act.status.bleed);
    if (act.drain) { const h = Math.round(dmg * act.drain); u.hp = Math.min(u.maxHp, u.hp + h); this.popup(u, `+${h}`, '#8be38b'); }
    target.status.marked = false;
    if (clash?.result === 'best') {
      u.resolve = Math.max(0, u.resolve - 45);
      this.popup(u, 'CLASH WON', '#f2c14e', true, -30);
      if (u.resolve <= 0 && !u.status.staggered) this.stagger(u);
    }
    await p;
    await this.retreat(u);
    if (clash?.choice === 'counter' && !target.dead && !u.dead) {
      this.showBanner('Counter!', '#ffe9c2');
      await this.lunge(target, u, 170);
      const cp = this.playOnce(target, 'attack');
      await sleep(this, 250);
      await this.hit(target, u, { power: clash.result === 'best' ? 1.4 : 0.8, break: 20, element: 'ember' });
      await cp;
      await this.retreat(target);
    }
    this.focus();
    // Pale Return counter
    if (target.status.counter && !target.dead && !u.dead) {
      target.status.counter = false;
      this.showBanner('Pale Return', '#e9e3ff');
      await this.lunge(target, u, 170);
      const cp = this.playOnce(target, 'attack');
      await sleep(this, 250);
      await this.hit(target, u, { power: 0.9, break: 18, element: 'ember' });
      await cp;
      await this.retreat(target);
    }
  }

  // Clash duel: the targeted hero answers a committed attack (Parry / Evade / Counter).
  async runClash(enemy, hero, type) {
    audio.sfx('encounter');
    this.stage.wash(0xff3040, 0.25);
    await this.tip('clash');
    const canCounter = hero.focus >= 4;
    const choice = await clashPrompt(this, this.controls, { hero, enemy, type, canCounter });
    if (choice === 'counter') hero.focus -= 4;
    const result = CLASH_TABLE[type][choice];
    const msg = { best: `${hero.name} reads it perfectly!`, ok: `${hero.name} takes the edge off the blow.`, bad: `${hero.name} guessed wrong!` }[result];
    this.say_(msg);
    this.showBanner(result === 'best' ? 'PERFECT READ' : result === 'ok' ? 'HELD' : 'BROKEN THROUGH', result === 'best' ? '#f2c14e' : result === 'ok' ? '#9fd3ff' : '#ff8a80');
    if (result === 'best' && choice === 'evade') {
      this.tweens.add({ targets: hero.sprite, x: hero.home.x - 70, duration: 160, yoyo: true, hold: 300 });
    }
    return { choice, result };
  }

  // ---------------------------------------------------------------- events & end
  async checkEvents() {
    for (const ev of this.enc.events || []) {
      if (this.firedEvents.has(ev.id)) continue;
      const w = ev.when;
      let hit = false;
      if (w.enemyActions) {
        const e = this.units.find(u => u.key === w.enemyActions.id);
        if (e && e.actions >= w.enemyActions.count) hit = true;
      }
      if (w.heroHpBelow && this.heroes().some(h => h.hp / h.maxHp < w.heroHpBelow)) hit = true;
      if (w.enemyHpBelow) {
        const e = this.units.find(u => u.key === w.enemyHpBelow.id);
        if (e && e.hp / e.maxHp < w.enemyHpBelow.ratio) hit = true;
      }
      if (hit) {
        this.firedEvents.add(ev.id);
        this.closeMenus();
        await BATTLE_SCRIPTS[ev.script](this.makeApi());
        this.dialogue.close();
        this.refreshHud();
      }
    }
  }

  async checkEnd() {
    if (this.ended) return true;
    if (!this.foes().length) {
      this.ended = true;
      for (const a of this.enemies()) this.kill(a);
      await this.victory();
      return true;
    }
    if (!this.heroes().length) {
      this.ended = true;
      await this.defeat();
      return true;
    }
    return false;
  }

  // After a victory the party catches its breath: a quarter of max HP and Focus return.
  writeBack(recover = 0) {
    for (const u of this.units) {
      if (u.side !== 'hero' || u.guest) continue;
      const m = member(u.key);
      m.hp = Math.min(u.maxHp, Math.max(1, Math.round(u.hp + u.maxHp * recover)));
      m.focus = Math.min(u.maxFocus, Math.round(u.focus + u.maxFocus * recover));
    }
  }

  async victory() {
    this.closeMenus();
    await sleep(this, 700);
    for (const h of this.units.filter(u => u.side === 'hero' && !u.dead)) this.playOnce(h, 'skill');
    if (this.enc.victoryScript) {
      await BATTLE_SCRIPTS[this.enc.victoryScript](this.makeApi());
      this.dialogue.close();
    }
    const xp = this.units.filter(u => u.side === 'enemy').reduce((s, u) => s + (u.def.xp || 0), 0);
    this.writeBack(0.25);
    const ups = grantXp(xp);
    for (const e of this.units) if (e.side === 'enemy' && !e.anchor) addProfile(e.key);
    if (this.enc.boss) restoreParty();
    audio.stopMusic();
    audio.sfx(ups.length ? 'levelup' : 'confirm');
    const w = 520, h = 190 + ups.length * 26;
    const x = (GAME_W - w) / 2, y = 180;
    const objs = [panel(this, x, y, w, h).setDepth(500)];
    objs.push(text(this, GAME_W / 2, y + 26, 'VICTORY', { size: 34, title: true, color: '#f0d79a', origin: [0.5, 0] }).setDepth(501));
    objs.push(text(this, GAME_W / 2, y + 82, `${xp} experience`, { size: 20, origin: [0.5, 0] }).setDepth(501));
    ups.forEach((m, i) => objs.push(text(this, GAME_W / 2, y + 116 + i * 26, m, { size: 18, color: '#9be39b', origin: [0.5, 0] }).setDepth(501)));
    objs.push(text(this, GAME_W / 2, y + h - 34, 'Press Z / click to continue', { size: 13, color: '#a79f8c', origin: [0.5, 0] }).setDepth(501));
    await this.waitConfirm();
    this.finish('win');
  }

  async defeat() {
    this.closeMenus();
    audio.stopMusic();
    await sleep(this, 900);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.6).setOrigin(0).setDepth(490);
    panel(this, GAME_W / 2 - 260, 200, 520, 300).setDepth(500);
    text(this, GAME_W / 2, 230, 'The lanterns gutter…', { size: 30, title: true, color: '#f0d79a', origin: [0.5, 0] }).setDepth(501);
    text(this, GAME_W / 2, 280, 'Your party has fallen. Nothing is lost — try again.', { size: 16, color: '#cfc7b4', origin: [0.5, 0] }).setDepth(501);
    const items = [{ label: 'Retry this battle', id: 'retry' }, { label: 'Retry on Story difficulty', id: 'story' }, { label: 'Load last save', id: 'load', disabled: !latestSave() }, { label: 'Return to title', id: 'title' }];
    this.resultMenu = new MenuList(this, GAME_W / 2 - 200, 330, items, {
      width: 400, lineH: 38, size: 19, depth: 502,
      onSelect: it => {
        this.resultMenu = null;
        if (it.id === 'retry' || it.id === 'story') {
          if (it.id === 'story') settings.difficulty = 'story';
          state.party = structuredClone(this.partySnapshot);
          this.scene.restart(this.data_);
        } else if (it.id === 'load') {
          const s = latestSave();
          if (s && loadFrom(s.slot)) {
            this.scene.stop('World'); this.scene.stop('UI');
            this.scene.start('World');
          }
        } else {
          this.scene.stop('World'); this.scene.stop('UI');
          this.scene.start('Title');
        }
      },
    });
  }

  finish(result) {
    this.hudCam.fadeOut(400);
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const cb = this.onEnd;
      this.scene.stop();
      cb?.(result);
    });
  }

  waitConfirm() {
    return new Promise(res => {
      this.modalWait = res;
      this.input.once('pointerdown', () => { if (this.modalWait === res) { this.modalWait = null; res(); } });
    });
  }

  async tip(id) {
    const str = BATTLE_TIPS[id];
    if (!str || state.tutorials[`battle_${id}`]) return;
    state.tutorials[`battle_${id}`] = true;
    const t = text(this, GAME_W / 2, 0, str, { size: 17, wrap: 700, align: 'left', origin: [0.5, 0] }).setDepth(701);
    const w = 760, h = t.height + 90;
    const x = (GAME_W - w) / 2, y = (GAME_H - h) / 2 - 40;
    const bg = panel(this, x, y, w, h).setDepth(700);
    const head = text(this, GAME_W / 2, y + 18, 'BATTLE GUIDE', { size: 12, color: '#c9a45c', bold: true, origin: [0.5, 0] }).setDepth(701);
    t.setY(y + 44);
    const foot = text(this, GAME_W / 2, y + h - 26, 'Z / click to continue', { size: 12, color: '#a79f8c', origin: [0.5, 0] }).setDepth(701);
    this.menu?.setActive(false);
    await this.waitConfirm();
    [bg, t, head, foot].forEach(o => o.destroy());
    this.menu?.setActive(true);
  }

  // ---------------------------------------------------------------- effects
  say_(str) { this.log.setText(str || ''); }

  showBanner(str, color = '#f3ead6') {
    this.banner.setText(str).setColor(color).setAlpha(0).setScale(0.9);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 160, hold: 700, yoyo: true });
  }

  popup(u, str, color, big = false, dy = 0) {
    const top = u.anchor ? u.home.y - 70 : u.home.y - u.sprite.displayHeight * 0.6;
    const t = text(this, u.home.x + (Math.random() - 0.5) * 30, top + dy, str, { size: big ? 34 : 24, bold: true, color, origin: 0.5, stroke: '#000', strokeThickness: 5 }).setDepth(400);
    this.tweens.add({ targets: t, y: t.y - 46, duration: 900, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 350, onComplete: () => t.destroy() });
  }

  slashFx(u, color) {
    const y = u.anchor ? u.home.y - 40 : u.home.y - u.sprite.displayHeight * 0.45;
    const s = this.add.image(u.home.x, y, 'slash').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(350)
      .setAngle(Phaser.Math.Between(-50, 30)).setScale(0.6).setAlpha(1);
    this.tweens.add({ targets: s, scale: 1.3, alpha: 0, duration: 320, onComplete: () => s.destroy() });
    this.burst(u, color, 10);
  }

  burst(u, color, n) {
    const y = u.anchor ? u.home.y - 40 : u.home.y - u.sprite.displayHeight * 0.45;
    const e = this.add.particles(u.home.x, y, 'spark', {
      speed: { min: 80, max: 260 }, lifespan: 420, scale: { start: 1.2, end: 0 }, tint: color, blendMode: 'ADD', emitting: false,
    }).setDepth(360);
    e.explode(n);
    this.time.delayedCall(700, () => e.destroy());
  }

  ring(u, color) {
    const y = u.anchor ? u.home.y - 40 : u.home.y - u.sprite.displayHeight * 0.45;
    const r = this.add.image(u.home.x, y, 'ring').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(340).setScale(0.3).setAlpha(0.9);
    this.tweens.add({ targets: r, scale: 2, alpha: 0, duration: 600, onComplete: () => r.destroy() });
  }

  shakeTarget(u) {
    if (u.anchor || settings.reducedShake) return;
    this.tweens.add({ targets: u.sprite, x: u.sprite.x + (u.side === 'hero' ? -8 : 8), duration: 50, yoyo: true, repeat: 2 });
  }

  shake(ms, intensity) {
    if (settings.reducedShake) intensity *= 0.25;
    if (intensity > 0) this.cameras.main.shake(ms, intensity);
  }

  flashScreen(color, alpha) {
    const a = settings.reducedFlashing ? alpha * 0.35 : alpha;
    const r = this.add.rectangle(0, 0, GAME_W, GAME_H, color, a).setOrigin(0).setDepth(450).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: r, alpha: 0, duration: 380, onComplete: () => r.destroy() });
  }

  // ---------------------------------------------------------------- battle script API
  makeApi() {
    const B = {
      say: (sp, str, opts) => this.dialogue.say(sp, str, opts),
      wait: ms => { this.dialogue.close(); return sleep(this, ms); },
      sfx: n => audio.sfx(n),
      music: n => (n ? audio.play(n) : audio.stopMusic()),
      shake: (ms, i) => this.shake(ms, i),
      flash: (ms, r, g, b) => this.flashScreen((r << 16) | (g << 8) | b, 0.5),
      tip: id => { this.dialogue.close(); return this.tip(id); },
      awaken: () => this.awakenCinematic(),
      elaraArrives: () => this.elaraArrives(),
      voiceMoment: async () => {
        this.dialogue.close();
        const r = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x12051f, 0).setOrigin(0).setDepth(1500);
        this.tweens.add({ targets: r, fillAlpha: 0.75, duration: 900 });
        audio.sfx('veil');
        await sleep(this, 1000);
        this.voiceDim = r;
      },
    };
    return B;
  }

  async awakenCinematic() {
    this.dialogue.close();
    this.stage.setMood('seal', 700);
    const kai = this.units.find(u => u.key === 'kai');
    audio.play('awakening');
    const dark = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05000c, 0).setOrigin(0).setDepth(1200);
    this.tweens.add({ targets: dark, fillAlpha: 0.82, duration: 600 });
    await sleep(this, 600);
    // Close-up: portrait with the mark spreading.
    const px = GAME_W / 2, py = GAME_H / 2 - 30;
    const frame = this.add.graphics().setDepth(1201);
    frame.lineStyle(3, 0xa970ff, 1).strokeRect(px - 162, py - 162, 324, 324);
    const portrait = this.add.image(px, py, 'portrait:kai').setDisplaySize(320, 320).setDepth(1201).setAlpha(0);
    const mark = this.add.image(px, py, 'mark_overlay_1').setDisplaySize(320, 320).setDepth(1202).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.tweens.add({ targets: portrait, alpha: 1, duration: 500 });
    await sleep(this, 600);
    audio.sfx('veil');
    this.tweens.add({ targets: mark, alpha: 1, duration: 900, ease: 'Sine.easeIn' });
    const parts = this.add.particles(px + 40, py + 60, 'mote', {
      speed: { min: 30, max: 140 }, lifespan: 1400, scale: { start: 2, end: 0 }, tint: [0xa970ff, 0xd3b8ff, 0x7a3dff], blendMode: 'ADD', frequency: 25,
    }).setDepth(1203);
    this.shake(600, 0.008);
    await sleep(this, 1400);
    const cap = text(this, px, py + 196, 'THE SEAL AWAKENS', { size: 30, title: true, color: '#d3b8ff', origin: 0.5, stroke: '#000', strokeThickness: 5 }).setDepth(1203).setAlpha(0);
    this.tweens.add({ targets: cap, alpha: 1, duration: 500 });
    await sleep(this, 1500);
    parts.stop();
    state.sealStage = 1;
    this.tweens.add({ targets: [portrait, mark, frame, cap], alpha: 0, duration: 500 });
    await sleep(this, 500);
    [portrait, mark, frame, cap].forEach(o => o.destroy());
    this.time.delayedCall(1500, () => parts.destroy());
    // Kai's battle sprite surges with violet light; regeneration stops.
    this.tweens.add({ targets: dark, fillAlpha: 0, duration: 600, onComplete: () => dark.destroy() });
    this.stage.setMood('sealfaint', 1000);
    this.flashScreen(0xa970ff, 0.55);
    if (kai) {
      kai.sprite.setTint(0xd8c0ff);
      this.time.delayedCall(900, () => kai.sprite.clearTint());
      await this.playOnce(kai, 'skill');
      this.ring(kai, 0xa970ff);
      kai.hp = Math.max(kai.hp, Math.round(kai.maxHp * 0.75));
      kai.focus = kai.maxFocus;
      kai.next = this.clock + 1;
    }
    const garran = this.units.find(u => u.key === 'garran');
    if (garran) {
      garran.status.suppressed = 2;
      this.slashFx(garran, 0xb07bff);
      this.popup(garran, 'REGEN HALTED', '#c9a0ff', true);
      garran.hp = Math.max(garran.hp, Math.round(garran.maxHp * 0.8));
    }
    for (const a of this.units.filter(u => u.anchor)) this.ring(a, 0xff4040);
    this.refreshHud();
    await sleep(this, 800);
  }

  async elaraArrives() {
    this.dialogue.close();
    this.stage.setMood('flame', 900);
    audio.sfx('flame');
    this.flashScreen(0xffffff, 0.6);
    const ring = this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: GAME_W }, y: { min: 470, max: 540 }, lifespan: 900, speedY: { min: -120, max: -40 },
      scale: { start: 1.6, end: 0 }, tint: [0xffffff, 0xfff0d0, 0xffd090], blendMode: 'ADD', frequency: 10,
    }).setDepth(330);
    this.time.delayedCall(1500, () => ring.stop());
    this.time.delayedCall(3000, () => ring.destroy());
    const e = this.addHero('elara_ashen', 1, { fromX: -120, initiative: 0.2 });
    e.next = this.clock + 2;
    this.layoutPartyRows();
    await new Promise(r => this.tweens.add({ targets: e.sprite, x: e.home.x, duration: 600, ease: 'Cubic.easeOut', onComplete: r }));
    e.shadow.setX(e.home.x);
    await this.playOnce(e, 'skill');
    this.refreshHud();
  }
}
