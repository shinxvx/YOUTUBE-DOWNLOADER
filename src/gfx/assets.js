import { VOD, WORLD_ZOOM } from '../config.js';

// Asset loading built on the package manifest (public/assets/vod/manifest.json).
// Exploration: original high-resolution atlases. At runtime we derive a high-quality
// downscaled copy in memory (the source PNG on disk is untouched), sized so that one
// texel maps to one screen pixel at WORLD_ZOOM. This keeps the logical 48x48 footprint
// crisp instead of shimmering from a 7x nearest-neighbour downsample.
// Combat: prepared battle sheets loaded as fixed-grid spritesheets.

const url = p => `${VOD}/${p}`;

export function queueManifestAssets(scene, manifest) {
  for (const a of manifest.sprites) {
    if (a.loadMethod === 'atlas') {
      scene.load.image(`src:${a.id}`, url(a.path));
      scene.load.json(`atlasjson:${a.id}`, url(a.atlasPath));
    } else {
      scene.load.spritesheet(a.id, url(a.path), { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
    }
  }
  for (const p of manifest.portraits) scene.load.image(`portrait:${p.id}`, url(p.path));
  for (const e of manifest.environments) scene.load.image(`environment:${e.id}`, url(e.path));
  for (const l of manifest.logos) scene.load.image(`logo:${l.id}`, url(l.path));
  scene.load.spritesheet('tiles', url(manifest.tiles.path), { frameWidth: 32, frameHeight: 32 });
}

function downscale(img, tw, th) {
  let src = img;
  let w = img.width, h = img.height;
  // Progressive halving keeps the box-filter quality high.
  while (w / 2 >= tw * 1.0001 && h / 2 >= th) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w / 2));
    c.height = Math.max(1, Math.round(h / 2));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    src = c; w = c.width; h = c.height;
  }
  const out = document.createElement('canvas');
  out.width = tw; out.height = th;
  const g = out.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, tw, th);
  return out;
}

export function buildOverworldTextures(scene, manifest) {
  for (const a of manifest.sprites) {
    if (a.loadMethod !== 'atlas') continue;
    const img = scene.textures.get(`src:${a.id}`).getSourceImage();
    const json = scene.cache.json.get(`atlasjson:${a.id}`);
    const target = a.displayScale * WORLD_ZOOM;
    const tw = Math.round(img.width * target);
    const th = Math.round(img.height * target);
    const sx = tw / img.width;
    const sy = th / img.height;
    const canvas = downscale(img, tw, th);
    const frames = {};
    for (const [name, f] of Object.entries(json.frames)) {
      const x = Math.floor(f.frame.x * sx), y = Math.floor(f.frame.y * sy);
      const w = Math.ceil((f.frame.x + f.frame.w) * sx) - x;
      const h = Math.ceil((f.frame.y + f.frame.h) * sy) - y;
      frames[name] = {
        frame: { x, y, w, h },
        rotated: false,
        trimmed: true,
        spriteSourceSize: { x: Math.round(f.spriteSourceSize.x * sx), y: Math.round(f.spriteSourceSize.y * sy), w, h },
        sourceSize: { w: Math.round(f.sourceSize.w * sx), h: Math.round(f.sourceSize.h * sy) },
      };
    }
    scene.textures.addAtlasJSONHash(a.id, canvas, { frames, meta: { scale: 1 } });
    // Sprite scale that converts derived texels back to the logical footprint.
    a.runtimeScale = a.displayScale / sx;
    scene.textures.remove(`src:${a.id}`);
  }
}

export function registerAnimations(scene, manifest) {
  for (const a of manifest.sprites) {
    for (const [name, clip] of Object.entries(a.animations)) {
      const key = `${a.id}:${name}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: clip.frames.map(f => ({ key: a.id, frame: a.loadMethod === 'atlas' ? String(f) : f })),
        frameRate: clip.fps,
        repeat: clip.repeat,
      });
    }
  }
}

let MANIFEST = null;
export const setManifest = m => { MANIFEST = m; };
export const manifest = () => MANIFEST;
export const spriteAsset = id => MANIFEST.sprites.find(s => s.id === id);
