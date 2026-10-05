import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { makeCleanTiles } from '../systems/mapBuilder.js';
import { settings } from '../systems/settings.js';

// Battle stage: painted regional backdrop + a perspective floor built from the map tiles
// (DS-style "mode 7"), with moods that change during the fight.

const LOCATIONS = {
  emberfall: { backdrop: 'environment:emberfall', floor: [0, 5, 0, 3, 1], fog: 0x1a1d33 },
  brassveil: { backdrop: 'environment:brassveil', floor: [3, 3, 21, 0], fog: 0x2a1a12 },
  noctis_crown: { backdrop: 'environment:noctis_crown', floor: [24, 25, 26, 27], fog: 0x120a18 },
};

const MOODS = {
  dusk: { tint: 0xb8a6b4, fog: 0.10, particles: 'motes', sky: 1 },
  night: { tint: 0x4c5486, fog: 0.16, particles: 'ash', sky: 1 },
  dark: { tint: 0x2c3260, fog: 0.22, particles: 'ash', sky: 0.9 },
  blood: { tint: 0x7a3448, fog: 0.18, particles: 'embers_red', sky: 0.9 },
  seal: { tint: 0x3a2466, fog: 0.05, particles: 'violet', sky: 0.25, void: 0.85 },
  sealfaint: { tint: 0x46407a, fog: 0.12, particles: 'violet', sky: 0.9, void: 0.18 },
  flame: { tint: 0x6a6280, fog: 0.10, particles: 'white_flame', sky: 1 },
  dawn: { tint: 0xf2d6c0, fog: 0.06, particles: 'motes', sky: 1, dawnSky: 1 },
};

function floorTexture(scene, key, frames) {
  if (scene.textures.exists(key)) return;
  makeCleanTiles(scene);
  const tiles = scene.textures.get('tiles_clean').getSourceImage();
  const pat = document.createElement('canvas');
  pat.width = 2048; pat.height = 512;
  const pg = pat.getContext('2d');
  pg.imageSmoothingEnabled = false;
  let s = 7;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 32; x++) {
    s = (s * 16807) % 2147483647;
    const f = frames[s % frames.length];
    pg.drawImage(tiles, (f % 6) * 64, Math.floor(f / 6) * 64, 64, 64, x * 64, y * 64, 64, 64);
  }
  const W = GAME_W, H = 380;
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const g = out.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let r = 0; r < H; r++) {
    const p = (r + 1) / H;
    const scaleX = 0.22 + 1.5 * Math.pow(p, 1.25);          // near rows are wider
    const z = 1 / (0.06 + p);                                  // distance
    const srcW = W / scaleX;
    const srcX = (pat.width - srcW) / 2;
    const srcY = Math.floor((z * 90) % pat.height);
    g.drawImage(pat, srcX, srcY, srcW, 1, 0, r, W, 1);
  }
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, 'rgba(10,12,24,0.95)');
  grd.addColorStop(0.25, 'rgba(10,12,24,0.55)');
  grd.addColorStop(0.7, 'rgba(10,12,24,0.08)');
  grd.addColorStop(1, 'rgba(10,12,24,0.25)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  scene.textures.addCanvas(key, out).setFilter(Phaser.Textures.FilterMode.LINEAR);
}

export class BattleStage {
  constructor(scene, location = 'emberfall', mood = 'night') {
    this.scene = scene;
    const L = LOCATIONS[location] || LOCATIONS.emberfall;
    const bd = scene.textures.get(L.backdrop).getSourceImage();
    const bs = 1440 / bd.width;
    // Painted backdrop: distant scenery above the horizon, with gentle parallax.
    this.sky = scene.add.image(GAME_W / 2, -90, L.backdrop).setOrigin(0.5, 0).setScale(bs).setDepth(0);
    this.sky.setScrollFactor(0.55);
    this.dawnSky = scene.add.image(GAME_W / 2, -40, 'sky:dawn_panorama').setOrigin(0.5, 0)
      .setScale(GAME_W * 1.3 / 2048).setDepth(0.5).setAlpha(0).setScrollFactor(0.4);
    floorTexture(scene, `floor_${location}`, L.floor);
    this.floor = scene.add.image(GAME_W / 2, 340, `floor_${location}`).setOrigin(0.5, 0).setDepth(1).setScale(1.25, 1);
    // Mood layers.
    this.tint = scene.add.rectangle(-200, -200, GAME_W + 400, GAME_H + 400, 0xffffff, 1).setOrigin(0).setDepth(2)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.void = scene.add.graphics().setDepth(2.5).setAlpha(0);
    this.drawVoid();
    this.fog = scene.add.tileSprite(-200, 0, GAME_W + 400, GAME_H, 'fog').setOrigin(0).setDepth(3).setAlpha(0.15);
    this.flames = scene.add.graphics().setDepth(4).setAlpha(0);
    this.vignette = scene.add.image(GAME_W / 2, GAME_H / 2, 'vignette').setDisplaySize(GAME_W + 300, GAME_H + 200).setDepth(5);
    this.emitter = null;
    this.t = 0;
    this.setMood(mood, 0);
    scene.events.on('update', (time, delta) => this.update(delta));
  }

  drawVoid() {
    // The inside of the seal: violet gradient with slow rune circles (animated in update()).
    const g = this.void;
    g.clear();
    g.fillGradientStyle(0x14061f, 0x14061f, 0x3d1670, 0x3d1670, 1, 1, 1, 1);
    g.fillRect(-200, -200, GAME_W + 400, GAME_H + 400);
    g.lineStyle(2, 0xb48cff, 0.35);
    for (let i = 0; i < 6; i++) g.strokeCircle(GAME_W / 2, 300, 80 + i * 70);
  }

  setMood(name, ms = 900) {
    const m = MOODS[name] || MOODS.night;
    this.moodName = name;
    const from = Phaser.Display.Color.IntegerToColor(this.tint.fillColor);
    const to = Phaser.Display.Color.IntegerToColor(m.tint);
    if (!ms) this.tint.setFillStyle(m.tint, 1);
    else {
      this.scene.tweens.addCounter({
        from: 0, to: 100, duration: ms,
        onUpdate: tw => {
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue());
          this.tint.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
        },
      });
    }
    const t = (obj, alpha) => (ms ? this.scene.tweens.add({ targets: obj, alpha, duration: ms }) : obj.setAlpha(alpha));
    t(this.fog, m.fog);
    t(this.void, m.void || 0);
    t(this.sky, m.sky);
    t(this.dawnSky, m.dawnSky || 0);
    t(this.flames, name === 'flame' ? 1 : 0);
    this.setParticles(m.particles);
  }

  setParticles(kind) {
    if (this.particleKind === kind) return;
    this.particleKind = kind;
    this.emitter?.destroy();
    const s = this.scene;
    const base = { x: { min: -100, max: GAME_W + 100 }, lifespan: 5000, frequency: 90 };
    const cfg = {
      ash: { ...base, y: { min: -20, max: 360 }, speedX: { min: 5, max: 18 }, speedY: { min: 6, max: 18 }, scale: { start: 1, end: 0.4 }, alpha: { start: 0.5, end: 0 }, tint: [0x8c8c96, 0xa06060] },
      motes: { ...base, y: { min: 100, max: 700 }, speedY: { min: -14, max: -4 }, scale: { start: 0.8, end: 0.2 }, alpha: { start: 0.6, end: 0 }, tint: 0xffe6b0, blendMode: 'ADD' },
      embers_red: { ...base, y: 740, speedY: { min: -70, max: -30 }, speedX: { min: -10, max: 10 }, scale: { start: 1.3, end: 0.2 }, alpha: { start: 0.9, end: 0 }, tint: [0xff4040, 0xff8a40], blendMode: 'ADD', frequency: 50 },
      violet: { ...base, y: { min: 0, max: 720 }, speedY: { min: -30, max: -10 }, speedX: { min: -12, max: 12 }, scale: { start: 1.6, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xa970ff, 0xd3b8ff, 0x7a3dff], blendMode: 'ADD', frequency: 40 },
      white_flame: { ...base, y: { min: 640, max: 720 }, speedY: { min: -120, max: -50 }, scale: { start: 1.8, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffffff, 0xfff0d0, 0xffd090], blendMode: 'ADD', frequency: 25, lifespan: 1200 },
    }[kind];
    if (!cfg) { this.emitter = null; return; }
    this.emitter = s.add.particles(0, 0, 'mote', cfg).setDepth(6);
  }

  // Pulse used when a technique lands: brief colour wash over the stage.
  wash(color, alpha = 0.35, ms = 420) {
    const r = this.scene.add.rectangle(-200, -200, GAME_W + 400, GAME_H + 400, color, settings.reducedFlashing ? alpha * 0.4 : alpha)
      .setOrigin(0).setDepth(4.5).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
  }

  update(delta) {
    this.t += delta;
    this.fog.tilePositionX += delta * 0.012;
    if (this.void.alpha > 0.01) this.void.rotation = Math.sin(this.t / 4000) * 0.03;
    if (this.flames.alpha > 0.01) {
      const g = this.flames;
      g.clear();
      for (let i = 0; i < 26; i++) {
        const x = (i / 25) * GAME_W;
        const h = 26 + Math.sin(this.t / 140 + i * 1.7) * 12 + Math.sin(this.t / 61 + i) * 6;
        g.fillStyle(0xfff4dc, 0.5); g.fillTriangle(x - 18, 700, x + 18, 700, x, 700 - h);
        g.fillStyle(0xffffff, 0.8); g.fillTriangle(x - 8, 700, x + 8, 700, x, 700 - h * 0.6);
      }
    }
  }
}
