import {
  PROP_RES, initProps, addPropTexture, drawHouse, drawStoneLantern, drawLanternPost, drawTorii, drawPine,
  drawMaple, drawBush, drawStall, drawBarrel, drawFence, drawStairs, drawBridgeDeck, drawBridgeRail, drawYagura, drawWell,
} from '../gfx/props.js';

// Builds a top-down tile map from a declarative definition (src/data/maps/*.js):
// ground kinds painted in order, then props (buildings, trees, lanterns...). Produces the
// collision grid, light list and y-sorted sprites. Coordinates in the definition are tiles.

export const TS = 32;

export function makeCleanTiles(scene) {
  if (scene.textures.exists('tiles_clean')) return;
  const src = scene.textures.get('tiles').getSourceImage();
  const c = document.createElement('canvas');
  c.width = 6 * 64; c.height = 6 * 64;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const inset = 2;
  for (let i = 0; i < 36; i++) {
    const sx = (i % 6) * 32 + inset, sy = Math.floor(i / 6) * 32 + inset;
    g.drawImage(src, sx, sy, 32 - inset * 2, 32 - inset * 2, (i % 6) * 64, Math.floor(i / 6) * 64, 64, 64);
  }
  scene.textures.addCanvas('tiles_clean', c);
}

// Ground kinds -> tile frames in the pack atlas (6x6). Several variants per kind.
const KINDS = {
  grass: { frames: [6, 6, 6, 9] },
  moss: { frames: [7, 7, 7, 9] },
  dirt: { frames: [8, 8, 10] },
  cobble: { frames: [0, 5, 0, 3] },
  path: { frames: [1, 2, 1] },
  flag: { frames: [3, 3, 0] },
  planks: { frames: [4] },
  water: { frames: [30], block: true },
  shallow: { frames: [31], block: true },
  snow: { frames: [32] },
  ice: { frames: [33] },
  floor: { frames: [24, 25, 26, 27, 28, 29] },
};
const KIND_IDS = Object.keys(KINDS);

const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
};

export function buildMap(scene, def) {
  initProps(scene);
  const W = def.w, H = def.h;
  const kind = new Uint8Array(W * H).fill(KIND_IDS.indexOf(def.base || 'grass'));
  const set = (x, y, k) => { if (x >= 0 && y >= 0 && x < W && y < H) kind[y * W + x] = KIND_IDS.indexOf(k); };
  for (const op of def.ground) {
    if (op.rect) {
      const [x0, y0, w, h] = op.rect;
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, op.k);
    } else if (op.line) {
      const half = Math.floor((op.w || 2) / 2);
      for (let i = 0; i < op.line.length - 1; i++) {
        const [ax, ay] = op.line[i], [bx, by] = op.line[i + 1];
        const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let s = 0; s <= steps; s++) {
          const cx = Math.round(ax + (bx - ax) * s / steps), cy = Math.round(ay + (by - ay) * s / steps);
          for (let dy = -half; dy < (op.w || 2) - half; dy++) for (let dx = -half; dx < (op.w || 2) - half; dx++) set(cx + dx, cy + dy, op.k);
        }
      }
    }
  }

  // Ground tilemap. The pack tiles carry a dark outline that turns large areas into a visible
  // grid, so a "clean" 2x tileset is built from each tile's inner area; random flips break
  // repetition further.
  makeCleanTiles(scene);
  const tm = scene.make.tilemap({ tileWidth: TS * 2, tileHeight: TS * 2, width: W, height: H });
  const ts = tm.addTilesetImage('tiles_clean', 'tiles_clean', TS * 2, TS * 2, 0, 0);
  const layer = tm.createBlankLayer('ground', ts, 0, 0).setDepth(-20).setScale(0.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = KINDS[KIND_IDS[kind[y * W + x]]];
    const h = hash(x, y);
    const t = layer.putTileAt(k.frames[h % k.frames.length], x, y);
    if (!k.block) { t.flipX = !!(h & 8); t.flipY = !!(h & 16); }
  }

  // Seams: soft dark lines where paving meets grass, foam where land meets water.
  const seams = scene.add.graphics().setDepth(-19);
  const kAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : kind[y * W + x]);
  const isWater = id => id >= 0 && KINDS[KIND_IDS[id]].block;
  const soft = new Set(['grass', 'moss', 'dirt'].map(k => KIND_IDS.indexOf(k)));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const me = kAt(x, y);
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nb = kAt(x + dx, y + dy);
      if (nb < 0 || nb === me) continue;
      const px = x * TS, py = y * TS;
      const edge = (c, a, t) => {
        seams.fillStyle(c, a);
        if (dx === 1) seams.fillRect(px + TS - t, py, t, TS);
        if (dx === -1) seams.fillRect(px, py, t, TS);
        if (dy === 1) seams.fillRect(px, py + TS - t, TS, t);
        if (dy === -1) seams.fillRect(px, py, TS, t);
      };
      if (isWater(nb) && !isWater(me)) edge(0x000000, 0.35, 3);
      else if (isWater(me) && !isWater(nb)) edge(0xbfe6ff, 0.25, 2);
      else if (soft.has(nb) && !soft.has(me) && !isWater(me)) edge(0x000000, 0.28, 2);
    }
  }

  // Collision.
  const blocked = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) blocked[i] = KINDS[KIND_IDS[kind[i]]].block ? 1 : 0;
  const rects = [];      // extra blocking rects in world px
  const openRects = [];  // walkable overrides (bridge decks)
  const lights = [];
  const sprites = [];
  let lampN = 0;

  const img = (key, made, x, y, ox, oy, depth) => {
    addPropTexture(scene, key, made);
    const s = scene.add.image(x, y, key).setOrigin(ox, oy).setScale(1 / PROP_RES).setDepth(depth);
    sprites.push(s);
    return s;
  };
  const addLight = (x, y, r, id, c = 0xffb56b) => lights.push({ x, y, r, c, id: id || `lamp_auto_${lampN++}` });

  def.props.forEach((p, n) => {
    const X = p.x * TS, Y = p.y * TS;
    switch (p.t) {
      case 'house': {
        const made = drawHouse(p);
        const s = img(`house_${def.id}_${n}`, made, X - 6, Y, 0, 0, Y + made.baseline);
        rects.push([X, Y, p.w * TS, (p.roof + p.wall) * TS - 6]);
        for (const lx of p.lanterns || []) addLight(X + lx * TS + 16, Y + p.roof * TS + 10, 90);
        if (p.door !== undefined && p.lit !== false) addLight(X + p.door * TS + 16, Y + (p.roof + p.wall) * TS - 8, 70, null, 0xffa050);
        s.name = p.id || '';
        break;
      }
      case 'torii': {
        const made = drawTorii();
        img(`torii_${def.id}`, made, X, Y, 0.5, 1, Y);
        rects.push([X - made.w / 2 + 12, Y - 10, 12, 10], [X + made.w / 2 - 24, Y - 10, 12, 10]);
        break;
      }
      case 'stoneLantern': {
        const made = drawStoneLantern();
        img('stone_lantern', made, X, Y, 0.5, 1, Y);
        rects.push([X - 8, Y - 10, 16, 10]);
        addLight(X, Y - 24, 80, p.id, 0xffc27a);
        break;
      }
      case 'lanternPost': {
        const made = drawLanternPost();
        img('lantern_post', made, X, Y, 0.5, 1, Y);
        rects.push([X - 5, Y - 6, 10, 6]);
        addLight(X + 7, Y - 42, p.r || 130, p.id);
        break;
      }
      case 'pine': img(`pine_${n % 4}`, drawPine(n % 4 + 1), X, Y, 0.5, 1, Y); rects.push([X - 8, Y - 10, 16, 10]); break;
      case 'maple': img(`maple_${n % 3}`, drawMaple(n % 3 + 2), X, Y, 0.5, 1, Y); rects.push([X - 8, Y - 10, 16, 10]); break;
      case 'bush': img(`bush_${n % 3}`, drawBush(n % 3 + 3), X, Y, 0.5, 1, Y); rects.push([X - 12, Y - 10, 24, 10]); break;
      case 'stall': {
        const made = drawStall(p.color);
        img(`stall_${p.color || 'red'}`, made, X, Y, 0.5, 1, Y);
        rects.push([X - made.w / 2 + 2, Y - 30, made.w - 4, 30]);
        addLight(X, Y - 50, 100, p.id, 0xffc070);
        break;
      }
      case 'barrel': img('barrel', drawBarrel(), X, Y, 0.5, 1, Y); rects.push([X - 8, Y - 10, 16, 10]); break;
      case 'well': img('well', drawWell(), X, Y, 0.5, 1, Y); rects.push([X - 14, Y - 22, 28, 22]); break;
      case 'fence': img(`fence_${p.len}`, drawFence(p.len), X, Y, 0, 1, Y); rects.push([X, Y - 8, p.len * TS, 8]); break;
      case 'stairs': img(`stairs_${p.w}x${p.h}`, drawStairs(p.w, p.h), X, Y, 0, 0, -15); break;
      case 'yagura': {
        const made = drawYagura();
        img('yagura', made, X, Y, 0.5, 1, Y);
        rects.push([X - made.w / 2 + 4, Y - 20, made.w - 8, 20]);
        addLight(X, Y - 70, 170, p.id);
        break;
      }
      case 'bridge': {
        img(`bridge_deck_${p.w}x${p.h}`, drawBridgeDeck(p.w, p.h), X, Y, 0, 0, -15);
        openRects.push([X, Y + 10, p.w * TS, p.h * TS - 20]);
        img(`bridge_rail_${p.w}`, drawBridgeRail(p.w), X, Y + 6, 0, 1, Y + 6);
        img(`bridge_rail_${p.w}`, drawBridgeRail(p.w), X, Y + p.h * TS, 0, 1, Y + p.h * TS);
        rects.push([X + TS, Y, (p.w - 2) * TS, 10], [X + TS, Y + p.h * TS - 10, (p.w - 2) * TS, 10]);
        break;
      }
      default: break;
    }
  });

  const inRect = (x, y, r) => x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3];
  const collides = (x, y) => {
    if (x < 4 || y < 4 || x > W * TS - 4 || y > H * TS - 4) return true;
    for (const r of rects) if (inRect(x, y, r)) return true;
    for (const r of openRects) if (inRect(x, y, r)) return false;
    return !!blocked[Math.floor(y / TS) * W + Math.floor(x / TS)];
  };

  return {
    width: W * TS, height: H * TS, collides, lights, rects, openRects, sprites, layer,
    debugDraw(g) {
      g.fillStyle(0xff0000, 0.25);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (blocked[y * W + x]) g.fillRect(x * TS, y * TS, TS, TS);
      g.lineStyle(1, 0xffff00, 0.9);
      for (const r of rects) g.strokeRect(...r);
      g.lineStyle(1, 0x00ff00, 0.9);
      for (const r of openRects) g.strokeRect(...r);
    },
  };
}

