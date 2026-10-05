import Phaser from 'phaser';
import { ART } from '../config.js';

// Asset loading built on the art pack manifest (public/assets/vh/manifest.json) plus the
// runtime sheets generated from it by tools/prepare_sprites.py (public/assets/vh/gen/):
//  - walking: every atlas frame re-aligned (feet on one baseline, head centred) into uniform
//    192 px cells, so animations no longer jitter; drawn at the logical 48x48 footprint.
//  - combat: prepared battle sheets re-cut so poses and sword arcs that spilled past their
//    cell are reunited with their own frame.

const url = p => `${ART}/${p}`;
let MANIFEST = null;
let GEN = null;

export function queueManifestAssets(scene, manifest, gen) {
  for (const a of manifest.sprites) {
    const g = a.loadMethod === 'atlas' ? gen.walk[a.id] : gen.battle[a.id];
    scene.load.spritesheet(a.id, url(g.path), { frameWidth: g.frameWidth, frameHeight: g.frameHeight });
  }
  for (const p of manifest.portraits) scene.load.image(`portrait:${p.id}`, url(p.path));
  for (const e of manifest.environments) scene.load.image(`environment:${e.id}`, url(e.path));
  for (const l of manifest.logos) scene.load.image(`logo:${l.id}`, url(l.path));
  scene.load.spritesheet('tiles', url(manifest.tiles.path), { frameWidth: 32, frameHeight: 32 });
}

export function finishSprites(scene, manifest, gen) {
  for (const a of manifest.sprites) {
    const walk = a.loadMethod === 'atlas';
    const g = walk ? gen.walk[a.id] : gen.battle[a.id];
    a.gen = g;
    if (walk) {
      // World units: the cell is 4x the logical footprint.
      a.runtimeScale = g.logical / g.frameWidth;
      scene.textures.get(a.id).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
}

export function registerAnimations(scene, manifest) {
  for (const a of manifest.sprites) {
    for (const [name, clip] of Object.entries(a.animations)) {
      const key = `${a.id}:${name}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: clip.frames.map(f => ({ key: a.id, frame: f })),
        frameRate: clip.fps,
        repeat: clip.repeat,
      });
    }
  }
}

export const setManifest = (m, g) => { MANIFEST = m; GEN = g; };
export const manifest = () => MANIFEST;
export const genManifest = () => GEN;
export const spriteAsset = id => MANIFEST.sprites.find(s => s.id === id);
