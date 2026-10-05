import Phaser from 'phaser';
import { flag } from './state.js';
import { settings } from './settings.js';

// Multiply-blended light map: the scene is darkened by an ambient colour, then each
// light source adds its colour back through a soft falloff. Glow halos and embers sit
// above the map with additive blending; fog and ash sit below it so they are lit too.

export const LIGHT_PRESETS = {
  dusk: { ambient: 0xb9a6ae, lamps: 0.85, personal: 0, fog: 0.08, wash: 0, particles: 'fireflies' },
  festival: { ambient: 0x9a92c0, lamps: 1.0, personal: 0, fog: 0.05, wash: 0, particles: 'embers' },
  dark: { ambient: 0x222a52, lamps: 0, personal: 0.6, fog: 0.15, wash: 0, particles: 'ash' },
  dawn: { ambient: 0xffe9d2, lamps: 0, personal: 0, fog: 0.06, wash: 0.7, haze: 1, sun: 0.75, particles: 'motes' },
};

// Image-based dawn: sun, sky and horizon colours come from the HDRI bake
// (public/assets/sky/dawn_light.json). The ambient keeps the painting readable while
// taking the HDRI's horizon hue; the sun is a broad warm light from the east.
const hex = s => parseInt(s.slice(1), 16);
export function applyDawnLight(json) {
  if (!json) return;
  const mix = (a, b, t) => {
    const A = toRGB(a), B = toRGB(b);
    return ((A.r + (B.r - A.r) * t) << 16) | ((A.g + (B.g - A.g) * t) << 8) | (A.b + (B.b - A.b) * t);
  };
  LIGHT_PRESETS.dawn.ambient = mix(0xffe6cc, hex(json.horizonColor), 0.45);
  LIGHT_PRESETS.dawn.sunColor = mix(hex(json.sunColor), 0xffb070, 0.35);
  LIGHT_PRESETS.dawn.washColor = mix(hex(json.horizonColor), 0xffa860, 0.5);
}

// Lamps that start broken at dusk and come on as Kai repairs them.
const BROKEN_AT_DUSK = { lamp_plaza: 'lantern_plaza', lamp_southeast: 'lantern_southeast', lamp_bridge: 'lantern_bridge' };

const LIGHT_RES = 0.5;

const toRGB = c => ({ r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255 });

export class Lighting {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    // The light map is a soft gradient, so it renders at reduced resolution and is
    // scaled up with linear filtering.
    this.res = LIGHT_RES;
    this.rt = scene.add.renderTexture(0, 0, Math.ceil(map.width * this.res), Math.ceil(map.height * this.res))
      .setOrigin(0).setScale(1 / this.res).setDepth(9000);
    this.rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.rt.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.lights = map.lights.map(l => ({ ...l, level: 0, override: null, flare: 0, phase: Math.random() * 10 }));
    this.glows = this.lights.map(l => scene.add.image(l.x, l.y - 4, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(9001).setTint(l.c).setScale(0.9).setAlpha(0));
    this.fogA = scene.add.tileSprite(0, 0, map.width, map.height, 'fog').setOrigin(0).setDepth(8500).setAlpha(0);
    this.fogB = scene.add.tileSprite(0, 0, map.width, map.height, 'fog').setOrigin(0).setDepth(8501).setAlpha(0).setTileScale(1.6);
    this.wash = scene.add.image(0, 0, 'dawnwash').setOrigin(0).setDisplaySize(map.width, map.height)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(9002).setAlpha(0);
    this.haze = map.dawnHaze && scene.textures.exists(map.dawnHaze)
      ? scene.add.image(0, 0, map.dawnHaze).setOrigin(0).setBlendMode(Phaser.BlendModes.SCREEN).setDepth(1).setAlpha(0)
      : null;
    this.ambient = toRGB(0x000000);
    this.target = null;
    this.personalLevel = 0;
    this.emitters = [];
    this.extraLights = [];
  }

  setPreset(name, instant = false) {
    const p = LIGHT_PRESETS[name] || LIGHT_PRESETS.festival;
    this.presetName = name;
    this.target = { ...p, ambientRGB: toRGB(p.ambient) };
    if (instant) {
      this.ambient = { ...this.target.ambientRGB };
      this.personalLevel = p.personal;
      for (const l of this.lights) l.level = this.lampTarget(l);
      this.fogA.setAlpha(p.fog);
      this.fogB.setAlpha(p.fog * 0.7);
      this.wash.setAlpha(p.wash);
      this.haze?.setAlpha(p.haze || 0);
    }
    if (p.washColor) this.wash.setTint(p.washColor); else this.wash.clearTint();
    this.setParticles(p.particles);
  }

  lampTarget(l) {
    if (l.override !== null) return l.override;
    const base = this.target.lamps;
    if (this.presetName === 'dusk' && BROKEN_AT_DUSK[l.id] && !flag(BROKEN_AT_DUSK[l.id])) return base * 0.18;
    return base;
  }

  // Cinematic: extinguish lamps one by one (west to east), calling onEach after each.
  async extinguishAll(onEach) {
    const order = [...this.lights].sort((a, b) => a.x - b.x);
    for (const l of order) {
      l.override = 0;
      onEach?.(l);
      await new Promise(r => this.scene.time.delayedCall(170, r));
    }
  }

  clearOverrides() { for (const l of this.lights) l.override = null; }

  flare(id) {
    const l = this.lights.find(x => x.id === id);
    if (l) l.flare = 1;
  }

  addTempLight(x, y, r, c, life) {
    const t = { x, y, r, c, level: 1, life, age: 0 };
    this.extraLights.push(t);
    return t;
  }

  setParticles(kind) {
    if (this.particleKind === kind) return;
    this.particleKind = kind;
    for (const e of this.emitters) e.destroy();
    this.emitters = [];
    const s = this.scene;
    const lamps = this.lights;
    const lampZone = { getRandomPoint: (p) => { const l = lamps[Math.floor(Math.random() * lamps.length)]; p.x = l.x + (Math.random() - 0.5) * 20; p.y = l.y - 6; return p; } };
    const fieldZone = { getRandomPoint: (p) => { const c = s.cameras.main; p.x = c.worldView.x + Math.random() * c.worldView.width; p.y = c.worldView.y + Math.random() * c.worldView.height; return p; } };
    if (kind === 'embers') {
      this.emitters.push(s.add.particles(0, 0, 'mote', {
        emitZone: { type: 'random', source: lampZone }, lifespan: 2600, speedY: { min: -26, max: -12 }, speedX: { min: -6, max: 6 },
        scale: { start: 0.9, end: 0.2 }, alpha: { start: 0.9, end: 0 }, tint: [0xffc070, 0xff9a40, 0xffe0a0], frequency: 90, blendMode: 'ADD',
      }).setDepth(9003));
    } else if (kind === 'fireflies') {
      this.emitters.push(s.add.particles(0, 0, 'mote', {
        emitZone: { type: 'random', source: fieldZone }, lifespan: 4000, speedX: { min: -8, max: 8 }, speedY: { min: -8, max: 8 },
        scale: 0.6, alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.8 }, tint: 0xd8ff9a, frequency: 260, blendMode: 'ADD',
      }).setDepth(9003));
    } else if (kind === 'ash') {
      this.emitters.push(s.add.particles(0, 0, 'mote', {
        emitZone: { type: 'random', source: fieldZone }, lifespan: 5000, speedX: { min: 4, max: 16 }, speedY: { min: 6, max: 18 },
        scale: { start: 0.7, end: 0.4 }, alpha: { start: 0.55, end: 0 }, tint: [0x8c8c96, 0x5a5a66, 0xa06060], frequency: 70,
      }).setDepth(8600));
    } else if (kind === 'motes') {
      this.emitters.push(s.add.particles(0, 0, 'mote', {
        emitZone: { type: 'random', source: fieldZone }, lifespan: 5000, speedX: { min: -4, max: 4 }, speedY: { min: -10, max: -3 },
        scale: { start: 0.5, end: 0.2 }, alpha: { start: 0.6, end: 0 }, tint: 0xffe6b0, frequency: 140, blendMode: 'ADD',
      }).setDepth(9003));
    }
  }

  update(time, delta, player) {
    if (!this.target) return;
    const k = Math.min(1, delta / 600);
    const a = this.ambient, t = this.target.ambientRGB;
    a.r += (t.r - a.r) * k; a.g += (t.g - a.g) * k; a.b += (t.b - a.b) * k;
    this.personalLevel += (this.target.personal - this.personalLevel) * k;
    this.fogA.setAlpha(this.fogA.alpha + (this.target.fog - this.fogA.alpha) * k);
    this.fogB.setAlpha(this.fogB.alpha + (this.target.fog * 0.7 - this.fogB.alpha) * k);
    this.wash.setAlpha(this.wash.alpha + (this.target.wash - this.wash.alpha) * k);
    if (this.haze) this.haze.setAlpha(this.haze.alpha + ((this.target.haze || 0) - this.haze.alpha) * k * 0.5);
    this.fogA.tilePositionX += delta * 0.006;
    this.fogA.tilePositionY += delta * 0.002;
    this.fogB.tilePositionX -= delta * 0.004;

    const rt = this.rt;
    const R = this.res;
    rt.clear();
    rt.fill(Phaser.Display.Color.GetColor(a.r | 0, a.g | 0, a.b | 0), 1);
    const reduced = settings.reducedFlashing;
    this.lights.forEach((l, i) => {
      const target = this.lampTarget(l);
      // Lamps die fast but kindle slowly.
      l.level += (target - l.level) * (target < l.level ? Math.min(1, delta / 90) : k);
      l.flare = Math.max(0, l.flare - delta / 900);
      const flick = reduced ? 1 : 0.94 + Math.sin(time / 130 + l.phase) * 0.03 + Math.sin(time / 47 + l.phase * 3) * 0.03;
      const lvl = Math.min(1.4, l.level * flick + l.flare * 0.8);
      const g = this.glows[i];
      g.setAlpha(Math.min(0.9, lvl * 0.55));
      g.setScale(0.7 + lvl * 0.35);
      if (lvl > 0.01) {
        rt.stamp('light', null, l.x * R, l.y * R, { scale: R * (l.r * 2 / 256) * (0.9 + 0.1 * flick) * (1 + l.flare * 0.4), tint: l.c, alpha: Math.min(1, lvl), blendMode: Phaser.BlendModes.ADD });
      }
    });
    for (const e of this.extraLights) {
      e.age += delta;
      const f = e.life ? Math.max(0, 1 - e.age / e.life) : 1;
      rt.stamp('light', null, e.x * R, e.y * R, { scale: R * e.r * 2 / 256, tint: e.c, alpha: e.level * f, blendMode: Phaser.BlendModes.ADD });
    }
    this.extraLights = this.extraLights.filter(e => !e.life || e.age < e.life);
    if (player && this.personalLevel > 0.01) {
      rt.stamp('light', null, player.x * R, (player.y - 20) * R, { scale: R * 190 / 256, tint: 0x8fa2e0, alpha: this.personalLevel, blendMode: Phaser.BlendModes.ADD });
    }
    // Low dawn sun from the east, behind the mountains.
    if (this.target.sun) {
      rt.stamp('light', null, 1250 * R, 60 * R, { scale: R * 9, tint: this.target.sunColor || 0xffc890, alpha: this.target.sun * Math.min(1, this.wash.alpha / Math.max(0.01, this.target.wash)), blendMode: Phaser.BlendModes.ADD });
    }
    // Faint cold moonlight wash over the whole upper map when it is dark.
    if (this.presetName === 'dark' && this.map.moon) {
      rt.stamp('light', null, this.map.moon.x * R, (this.map.moon.y + 200) * R, { scale: R * 6, tint: 0x3a4a80, alpha: 0.5, blendMode: Phaser.BlendModes.ADD });
    }
  }
}

