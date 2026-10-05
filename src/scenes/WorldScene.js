import Phaser from 'phaser';
import { WORLD_ZOOM } from '../config.js';
import { MAPS } from '../data/maps/index.js';
import { CHAPTERS } from '../data/chapters/index.js';
import { state, flag, setFlag, grantXp } from '../systems/state.js';
import { settings } from '../systems/settings.js';
import { Controls } from '../systems/input.js';
import { Actor, dirFromVector } from '../systems/actor.js';
import { Lighting } from '../systems/lighting.js';
import { makeScriptApi } from '../systems/scriptApi.js';
import { audio } from '../audio/audio.js';

const WALK_SPEED = 84;   // logical px / second
const RUN_MULT = 1.6;
const MUSIC_BY_PHASE = { dusk: 'village', festival: 'festival', dark: 'danger', dawn: 'dawn' };

export class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  create() {
    this.map = MAPS[state.map];
    this.chapter = CHAPTERS[state.chapter];
    this.controls = new Controls(this);
    this.shiftKey = this.input.keyboard.addKey('SHIFT');
    this.busy = false;
    this.inputLocked = false;
    this.actors = new Map();
    this.dataActors = new Set();
    this.enemyState = new Map();
    this.walkPolys = this.map.walkable.map(p => new Phaser.Geom.Polygon(p.flat()));
    this.gatePolys = new Map();
    this.locPolys = (this.map.locations || []).map(l => ({ name: l.name, poly: new Phaser.Geom.Polygon(l.poly.flat()) }));
    this.gateCooldown = 0;
    this.clickTarget = null;

    this.add.image(0, 0, this.map.backdrop).setOrigin(0).setDepth(0);
    this.buildOccluders();

    const p = state.pos;
    this.player = new Actor(this, 'player', 'kai_overworld', p.x, p.y, p.facing);
    this.player.updateMark();

    this.lighting = new Lighting(this, this.map);
    this.lighting.setPreset(state.phase, true);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.map.width, this.map.height);
    cam.setZoom(WORLD_ZOOM);
    cam.setRoundPixels(true);
    cam.startFollow(this.player.sprite, true, 0.15, 0.15, 0, 24);
    cam.centerOn(p.x, p.y - 24);

    this.S = makeScriptApi(this);
    this.refresh();

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.ui = this.scene.get('UI');
    this.ui.events.once('ui-ready', () => this.onUiReady());
    if (this.ui.ready) this.onUiReady();

    this.input.on('pointerdown', (ptr) => {
      if (this.busy || this.inputLocked || this.scene.isPaused()) return;
      if (this.ui?.dialogue?.active) return;
      this.clickTarget = { x: ptr.worldX, y: ptr.worldY };
    });

    const params = new URLSearchParams(location.search);
    if (params.has('debug')) this.drawDebug();
    if (params.has('test')) {
      // Test hooks for the automated playthrough (tools/playthrough.mjs).
      window.__VOD.debug = {
        teleport: (x, y, facing) => { this.player.setPos(x, y); if (facing) this.player.face(facing); this.cameras.main.centerOn(x, y - 24); },
      };
    }
    this.events.on('wake', () => { this.controls.rebuild(); this.player.updateMark(); });
    window.__VOD = Object.assign(window.__VOD || {}, { world: this });
  }

  onUiReady() {
    if (this.started) return;
    this.started = true;
    this.ui.setLocation(this.locationName(), false);
    this.updateObjective();
    if (state.phase && !this.busy) audio.play(MUSIC_BY_PHASE[state.phase]);
    if (!flag('intro_done')) {
      this.cameras.main.fadeOut(0);
      this.runScript('intro');
    } else {
      this.cameras.main.fadeIn(600);
    }
  }

  buildOccluders() {
    for (const o of this.map.occluders || []) {
      const img = this.add.image(0, 0, this.map.backdrop).setOrigin(0).setCrop(o.x, o.y, o.w, o.h).setDepth(o.baseline);
      if (o.poly) {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xffffff).fillPoints(o.poly.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
        img.setMask(g.createGeometryMask());
      }
    }
  }

  drawDebug() {
    const g = this.add.graphics().setDepth(20000);
    g.lineStyle(1, 0x00ff00, 0.9);
    for (const p of this.walkPolys) g.strokePoints(p.points, true);
    g.lineStyle(1, 0xff0000, 0.9);
    for (const [x, y, r] of this.map.blockers || []) g.strokeCircle(x, y, r);
    g.lineStyle(1, 0x00ffff, 0.9);
    for (const o of this.map.occluders || []) g.strokeRect(o.x, o.y, o.w, o.h);
    this.debugG = g;
  }

  // ------------------------------------------------------------ entities
  refresh() {
    const ch = this.chapter;
    const want = new Map();
    for (const n of ch.npcs) if (n.when(state)) want.set(n.id, { ...n, kind: 'npc' });
    for (const e of ch.enemies) {
      const key = e.link || e.id;
      if (e.when(state) && !state.defeated[key]) want.set(e.id, { ...e, kind: 'enemy' });
    }
    for (const id of [...this.dataActors]) {
      if (!want.has(id)) { this.actors.get(id)?.destroy(); this.actors.delete(id); this.dataActors.delete(id); this.enemyState.delete(id); }
    }
    for (const [id, def] of want) {
      if (this.actors.has(id)) continue;
      const a = new Actor(this, id, def.sprite, def.x, def.y, def.facing || 'down');
      a.def = def;
      this.actors.set(id, a);
      this.dataActors.add(id);
      if (def.kind === 'enemy') this.enemyState.set(id, { patrolIdx: 0, chase: false, wait: 0 });
    }
    this.gatePolys.clear();
    for (const gt of ch.gates || []) if (gt.when(state)) this.gatePolys.set(gt.id, { poly: new Phaser.Geom.Polygon(gt.poly.flat()), message: gt.message });
    this.player?.updateMark();
    this.updateObjective();
  }

  updateObjective() {
    const dyn = this.chapter.objectives?.[state.phase];
    if (dyn && state.phase === 'dusk' && flag('intro_done')) state.objective = dyn();
    this.ui?.setObjective?.(state.objective);
  }

  interactables() {
    return this.chapter.interactables.filter(i => i.when(state));
  }

  // ------------------------------------------------------------ scripts
  async runScript(name, arg) {
    const fn = this.chapter.scripts[name];
    if (!fn) { console.warn('Missing script', name); return; }
    this.busy = true;
    this.player.idle();
    this.clickTarget = null;
    try {
      await fn(this.S, arg);
    } catch (err) {
      console.error('Script error', name, err);
    } finally {
      if (this.scene.isActive() || this.scene.isSleeping()) {
        this.busy = false;
        this.ui?.dialogue?.close();
        this.refresh();
      }
    }
  }

  // ------------------------------------------------------------ movement
  canStand(x, y) {
    let inside = false;
    for (const p of this.walkPolys) if (p.contains(x, y)) { inside = true; break; }
    if (!inside) return false;
    for (const [bx, by, r] of this.map.blockers || []) if ((x - bx) ** 2 + (y - by) ** 2 < r * r) return false;
    for (const a of this.actors.values()) {
      if (a.def?.kind === 'npc' || (!a.def && a.blocking)) {
        if ((x - a.x) ** 2 + ((y - a.y) * 1.6) ** 2 < 14 * 14) return false;
      }
    }
    return true;
  }

  gateAt(x, y) {
    for (const g of this.gatePolys.values()) if (g.poly.contains(x, y)) return g;
    return null;
  }

  tryMove(dx, dy) {
    const pl = this.player;
    let moved = false;
    const nx = pl.x + dx, ny = pl.y + dy;
    const gate = this.gateAt(nx, ny);
    if (gate && !this.gateAt(pl.x, pl.y)) {
      if (this.gateCooldown <= 0) {
        this.gateCooldown = 2500;
        this.ui.toast(gate.message);
      }
      return false;
    }
    if (this.canStand(nx, pl.y)) { pl.x = nx; moved = true; }
    if (this.canStand(pl.x, ny)) { pl.y = ny; moved = true; }
    pl.sync();
    return moved;
  }

  update(time, delta) {
    if (!this.started) return;
    state.playtime += delta / 1000;
    this.gateCooldown -= delta;
    this.lighting.update(time, delta, this.player);
    for (const a of this.actors.values()) a.sync();
    this.ui?.dialogue?.update(this.controls, delta);

    if (this.busy || this.inputLocked) { this.ui?.setPrompt(null); return; }

    if (this.controls.pressed('menu')) {
      this.player.idle();
      this.scene.pause();
      this.scene.launch('Menu', { from: 'World' });
      return;
    }

    let { x, y } = this.controls.axis();
    if (x || y) this.clickTarget = null;
    if (!x && !y && this.clickTarget) {
      const dx = this.clickTarget.x - this.player.x, dy = this.clickTarget.y - this.player.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) this.clickTarget = null;
      else { x = dx / d; y = dy / d; }
    }
    const len = Math.hypot(x, y);
    if (len > 0) {
      const run = this.shiftKey.isDown ? RUN_MULT : 1;
      const sp = WALK_SPEED * run * (Math.min(delta, 50) / 1000);
      const moved = this.tryMove((x / len) * sp, (y / len) * sp);
      const dir = dirFromVector(x, y, this.player.facing);
      this.player.walk(dir);
      this.player.sprite.anims.timeScale = run;
      if (!moved && this.clickTarget) this.clickTarget = null;
    } else if (this.player.moving) {
      this.player.idle();
    }
    state.pos = { x: Math.round(this.player.x), y: Math.round(this.player.y), facing: this.player.facing };

    this.updateEnemies(delta);
    if (this.busy) return;
    this.checkTriggers();
    if (this.busy) return;

    const near = this.nearestInteractable();
    this.ui.setPrompt(near ? { x: near.x, y: near.y } : null, near?.marker ? near.marker() : true);
    if (near && this.controls.pressed('confirm')) {
      near.onTalk?.();
      this.runScript(near.script, near.arg);
      return;
    }

    const loc = this.locationName();
    if (loc !== this.lastLoc) { this.lastLoc = loc; state.location = loc.split(' — ')[0]; this.ui.setLocation(loc, true); }
  }

  nearestInteractable() {
    const pl = this.player;
    const off = { down: [0, 10], up: [0, -14], left: [-12, -4], right: [12, -4] }[pl.facing];
    const px = pl.x + off[0], py = pl.y + off[1];
    let best = null, bd = Infinity;
    for (const it of this.interactables()) {
      const d = Math.hypot(it.x - px, it.y - py);
      if (d < (it.r || 30) && d < bd) { bd = d; best = it; }
    }
    for (const a of this.actors.values()) {
      if (a.def?.kind !== 'npc' || !a.def.script) continue;
      const d = Math.hypot(a.x - px, a.y - py);
      if (d < 30 && d < bd) { bd = d; best = { x: a.x, y: a.y - 46, script: a.def.script, marker: () => true, actor: a }; }
    }
    if (best?.actor) {
      const face = dirFromVector(pl.x - best.actor.x, pl.y - best.actor.y, best.actor.facing);
      const actor = best.actor;
      best = { ...best, onTalk: () => actor.face(face) };
    }
    return best;
  }

  checkTriggers() {
    for (const t of this.chapter.triggers || []) {
      if (t.once && flag(`trig_${t.id}`)) continue;
      if (!t.when(state)) continue;
      if (Math.hypot(this.player.x - t.x, this.player.y - t.y) < t.r) {
        if (t.once) setFlag(`trig_${t.id}`);
        this.runScript(t.script);
        return;
      }
    }
  }

  updateEnemies(delta) {
    const pl = this.player;
    for (const [id, a] of this.actors) {
      if (a.def?.kind !== 'enemy') continue;
      const st = this.enemyState.get(id);
      const dist = Math.hypot(pl.x - a.x, pl.y - a.y);
      if (dist < 20) {
        this.startEncounter(a);
        return;
      }
      st.chase = !a.def.guard ? dist < 110 : dist < 70;
      let tx, ty, speed;
      if (st.chase) { tx = pl.x; ty = pl.y; speed = 58; }
      else {
        const pts = a.def.patrol || [[a.def.x, a.def.y]];
        const [px, py] = pts[st.patrolIdx % pts.length];
        tx = px; ty = py; speed = 30;
        if (Math.hypot(px - a.x, py - a.y) < 4) {
          st.wait += delta;
          if (st.wait > 900) { st.wait = 0; st.patrolIdx++; }
          a.idle();
          continue;
        }
      }
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1;
      const step = speed * Math.min(delta, 50) / 1000;
      const nx = a.x + (dx / d) * step, ny = a.y + (dy / d) * step;
      let ok = false;
      for (const p of this.walkPolys) if (p.contains(nx, ny)) { ok = true; break; }
      if (ok) { a.x = nx; a.y = ny; }
      a.walk(dirFromVector(dx, dy, a.facing));
    }
  }

  async startEncounter(actor) {
    const def = actor.def;
    this.busy = true;
    this.player.idle();
    const result = await this.S.battle(def.encounter);
    if (result === 'win') {
      const key = def.link || def.id;
      state.defeated[key] = true;
      if (key === 'pair_lower') setFlag('pair_lower_cleared');
      if (key === 'hound_bridge') { this.S.give('ember_salve', 1); }
      if (key === 'stalker_stairs') setFlag('stairs_cleared');
    }
    this.busy = false;
    this.refresh();
  }

  locationName() {
    for (const l of this.locPolys) if (l.poly.contains(this.player.x, this.player.y)) return l.name;
    return this.map.name;
  }

  setPhase(name) {
    state.phase = name;
    this.lighting.clearOverrides();
    this.lighting.setPreset(name);
    this.updateObjective();
  }

  musicForPhase() { return MUSIC_BY_PHASE[state.phase]; }

  grant(xp) { return grantXp(xp); }

  get reducedShake() { return settings.reducedShake; }
}
