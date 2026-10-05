// Map props built at runtime from the art pack's 32 px tiles plus hand-coded pixel detail:
// Japanese houses (roof/wall tiles), torii, lanterns, trees, bridge, stalls, stairs.
// Textures are drawn at PROP_RES texels per world pixel so they stay crisp at 2x zoom.
// Original procedural art (see ASSETS.md).

export const PROP_RES = 2;
const T = 32; // world px per tile

const TILE = {
  roof: [12, 13, 14, 15, 16, 17], woodDark: 18, slats: 19, shoji: 20, panel: 21, lattice: 22, copper: 23,
  planks: 4, flag: 3, stone: 0,
};

let tilesImg = null;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * PROP_RES);
  c.height = Math.ceil(h * PROP_RES);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.scale(PROP_RES, PROP_RES);
  return { c, g };
}

function tileAt(g, frame, x, y, w = T, h = T) {
  const sx = (frame % 6) * T, sy = Math.floor(frame / 6) * T;
  g.drawImage(tilesImg, sx, sy, T, T, x, y, w, h);
}

function fillTiles(g, frame, x, y, w, h, tw = T, th = T) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let yy = y; yy < y + h; yy += th) for (let xx = x; xx < x + w; xx += tw) tileAt(g, frame, xx, yy, tw, th);
  g.restore();
}

const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

function shade(g, x, y, w, h, a) { px(g, `rgba(0,0,0,${a})`, x, y, w, h); }
function light(g, x, y, w, h, a) { px(g, `rgba(255,236,200,${a})`, x, y, w, h); }

// Paper lantern (chochin) hanging at (x, y) top.
function paperLantern(g, x, y, color = '#d8452c', glow = '#ffd27a') {
  px(g, '#2b1d14', x + 3, y, 1, 3);
  px(g, '#2b1d14', x + 1, y + 3, 6, 1);
  px(g, color, x, y + 4, 8, 8);
  px(g, glow, x + 2, y + 5, 4, 6);
  px(g, 'rgba(0,0,0,0.25)', x, y + 7, 8, 1);
  px(g, 'rgba(0,0,0,0.25)', x, y + 10, 8, 1);
  px(g, '#2b1d14', x + 1, y + 12, 6, 1);
  px(g, '#2b1d14', x + 3, y + 13, 1, 2);
}

// ------------------------------------------------------------------ houses
// w tiles wide; roof r tiles tall (as seen from above), wall h tiles tall.
export function drawHouse(o) {
  const W = o.w * T, roofH = o.roof * T, wallH = o.wall * T;
  const over = 6; // eave overhang
  const { c, g } = canvas(W + over * 2, roofH + wallH + 4);
  const ox = over;
  // Wall (front face)
  const wy = roofH - 2;
  fillTiles(g, o.wallTile ?? TILE.woodDark, ox, wy, W, wallH, T, T);
  // posts
  for (let x = 0; x <= o.w; x++) px(g, '#2a1a10', ox + x * T - (x === o.w ? 3 : 0), wy, 3, wallH);
  px(g, '#1d130b', ox, wy + wallH - 3, W, 3); // sill
  // windows
  for (const wx of o.windows || []) {
    const x0 = ox + wx * T + 4;
    px(g, '#2a1a10', x0 - 2, wy + 8, T - 4, T - 10);
    tileAt(g, TILE.shoji, x0, wy + 10, T - 8, T - 14);
    if (o.lit !== false) px(g, 'rgba(255,190,90,0.35)', x0, wy + 10, T - 8, T - 14);
  }
  // door with noren curtain
  if (o.door !== undefined) {
    const dx = ox + o.door * T + 2;
    px(g, '#140c07', dx, wy + 6, T - 4, wallH - 9);
    const noren = o.noren || '#7a1f2b';
    for (let i = 0; i < 3; i++) px(g, noren, dx + 1 + i * 9, wy + 6, 8, 12);
    px(g, 'rgba(255,255,255,0.6)', dx + 11, wy + 9, 6, 6);
    if (o.lit !== false) px(g, 'rgba(255,170,70,0.4)', dx + 2, wy + 20, T - 8, wallH - 26);
  }
  // Roof seen from above: tiled shingles with ridge, eave and side shading.
  fillTiles(g, o.roofTile ?? TILE.roof[0], 0, 0, W + over * 2, roofH, T, T / 2);
  light(g, 0, Math.floor(roofH * 0.42), W + over * 2, 3, 0.18);              // ridge highlight
  shade(g, 0, Math.floor(roofH * 0.45) + 3, W + over * 2, Math.ceil(roofH * 0.55) - 3, 0.18); // front slope in shade
  shade(g, 0, 0, 4, roofH, 0.25); shade(g, W + over * 2 - 4, 0, 4, roofH, 0.3);
  px(g, '#151820', 0, roofH - 4, W + over * 2, 4);                           // eave
  shade(g, ox, roofH, W, 6, 0.35);                                          // eave shadow on wall
  // hanging lanterns under the eave
  for (const lx of o.lanterns || []) paperLantern(g, ox + lx * T + 12, roofH);
  if (o.sign) {
    px(g, '#3b2414', ox + o.sign.x * T + 4, wy + 2, 24, 10);
    px(g, '#e8d9b5', ox + o.sign.x * T + 6, wy + 4, 20, 6);
    px(g, '#a02020', ox + o.sign.x * T + 14, wy + 5, 4, 4);
  }
  return { canvas: c, w: W + over * 2, h: roofH + wallH + 4, anchorX: ox, baseline: roofH + wallH - 2 };
}

// ------------------------------------------------------------------ small props
export function drawStoneLantern() {
  const { c, g } = canvas(20, 40);
  px(g, '#5e6168', 6, 30, 8, 10); px(g, '#4a4d54', 3, 36, 14, 4);
  px(g, '#6c6f77', 2, 20, 16, 4);
  px(g, '#3f4148', 5, 12, 10, 8); px(g, '#ffd27a', 7, 14, 6, 4);
  px(g, '#757880', 1, 8, 18, 4); px(g, '#5a5d64', 4, 4, 12, 4); px(g, '#6c6f77', 8, 1, 4, 3);
  shade(g, 10, 12, 5, 28, 0.25);
  return { canvas: c, w: 20, h: 40, light: { dx: 10, dy: -24, r: 70 } };
}

export function drawLanternPost() {
  const { c, g } = canvas(24, 64);
  px(g, '#3a2414', 10, 8, 4, 56); shade(g, 12, 8, 2, 56, 0.3);
  px(g, '#3a2414', 10, 8, 12, 3);
  paperLantern(g, 15, 11, '#e0532f');
  px(g, '#2b1d14', 6, 60, 12, 4);
  return { canvas: c, w: 24, h: 64, light: { dx: 7, dy: -42, r: 120 } };
}

export function drawTorii() {
  const w = 3 * T, h = 3.5 * T;
  const { c, g } = canvas(w, h);
  const red = '#c3361f', dark = '#7d1c10';
  px(g, red, 14, 22, 8, h - 22); px(g, red, w - 22, 22, 8, h - 22);
  shade(g, 18, 22, 4, h - 22, 0.3); shade(g, w - 18, 22, 4, h - 22, 0.3);
  px(g, '#1d1d22', 12, h - 8, 12, 8); px(g, '#1d1d22', w - 24, h - 8, 12, 8);
  px(g, '#1d1d22', 0, 4, w, 7);          // kasagi
  px(g, red, 4, 11, w - 8, 6);           // shimaki
  px(g, dark, 4, 16, w - 8, 2);
  px(g, red, 8, 30, w - 16, 6);          // nuki
  px(g, '#e8d9b5', w / 2 - 7, 18, 14, 12); px(g, '#1d1d22', w / 2 - 5, 20, 10, 8); // plaque
  return { canvas: c, w, h };
}

export function drawPine(seed = 1) {
  const w = 2 * T, h = 3 * T;
  const { c, g } = canvas(w, h);
  px(g, '#3a2414', w / 2 - 3, h - 22, 6, 22);
  const greens = ['#16301f', '#1e3d28', '#264d33', '#2f5b3c'];
  for (let i = 0; i < 4; i++) {
    const yy = 6 + i * 14, ww = 20 + i * 9;
    g.fillStyle = greens[i];
    g.beginPath(); g.moveTo(w / 2, yy - 6); g.lineTo(w / 2 - ww / 2, yy + 18); g.lineTo(w / 2 + ww / 2, yy + 18); g.closePath(); g.fill();
    px(g, 'rgba(255,255,255,0.06)', w / 2 - ww / 4, yy + 4, 4, 6);
  }
  let s = seed;
  for (let i = 0; i < 18; i++) { s = (s * 9301 + 49297) % 233280; px(g, '#0f2016', 8 + (s % 46), 10 + ((s >> 3) % 62), 2, 2); }
  return { canvas: c, w, h };
}

export function drawMaple(seed = 2) {
  const w = 2.5 * T, h = 3 * T;
  const { c, g } = canvas(w, h);
  px(g, '#3a2414', w / 2 - 3, h - 26, 6, 26);
  let s = seed;
  const reds = ['#7a1a22', '#a52a2a', '#c8402e', '#e0603a', '#f08a4a'];
  for (let i = 0; i < 140; i++) {
    s = (s * 9301 + 49297) % 233280;
    const a = (s % 628) / 100, r = (s >> 4) % 30;
    const x = w / 2 + Math.cos(a) * r * 1.2, y = 34 + Math.sin(a) * r * 0.85;
    px(g, reds[(s >> 2) % reds.length], Math.round(x), Math.round(y), 4, 4);
  }
  return { canvas: c, w, h };
}

export function drawBush(seed = 3) {
  const { c, g } = canvas(T, T * 0.75);
  let s = seed;
  for (let i = 0; i < 40; i++) { s = (s * 9301 + 49297) % 233280; px(g, ['#1d3a24', '#28502f', '#355f38'][s % 3], 4 + (s % 22), 4 + ((s >> 3) % 16), 4, 4); }
  return { canvas: c, w: T, h: T * 0.75 };
}

export function drawStall(color = '#b0302a') {
  const w = 3 * T, h = 2.5 * T;
  const { c, g } = canvas(w, h);
  px(g, '#3a2414', 4, 20, 4, h - 20); px(g, '#3a2414', w - 8, 20, 4, h - 20);
  fillTiles(g, TILE.planks, 2, h - 30, w - 4, 26, 16, 16);
  px(g, '#2a1a10', 2, h - 30, w - 4, 3);
  for (let i = 0; i < 6; i++) px(g, i % 2 ? '#e8d9b5' : color, i * (w / 6), 4, w / 6, 18); // awning stripes
  shade(g, 0, 18, w, 4, 0.35);
  for (let i = 0; i < 4; i++) paperLantern(g, 10 + i * 20, 20, i % 2 ? '#e0532f' : '#f2c14e');
  // goods
  for (let i = 0; i < 6; i++) px(g, ['#f2c14e', '#d8452c', '#e8d9b5', '#7fb069'][i % 4], 10 + i * 13, h - 36, 8, 6);
  return { canvas: c, w, h };
}

export function drawBarrel() {
  const { c, g } = canvas(20, 24);
  px(g, '#5a3a20', 2, 4, 16, 18); px(g, '#7a5030', 4, 2, 12, 4); px(g, '#2a1a10', 2, 8, 16, 2); px(g, '#2a1a10', 2, 16, 16, 2);
  shade(g, 12, 4, 6, 18, 0.25);
  return { canvas: c, w: 20, h: 24 };
}

export function drawFence(len) {
  const w = len * T;
  const { c, g } = canvas(w, 22);
  px(g, '#4a2e18', 0, 6, w, 3); px(g, '#4a2e18', 0, 13, w, 3);
  for (let x = 0; x <= w; x += 16) { px(g, '#3a2414', Math.min(x, w - 4), 2, 4, 20); }
  return { canvas: c, w, h: 22 };
}

export function drawStairs(wTiles, hTiles) {
  const w = wTiles * T, h = hTiles * T;
  const { c, g } = canvas(w, h);
  for (let y = 0; y < h; y += 8) {
    fillTiles(g, TILE.flag, 0, y, w, 8, 16, 16);
    px(g, 'rgba(255,255,255,0.10)', 0, y, w, 1);
    shade(g, 0, y + 6, w, 2, 0.35);
  }
  shade(g, 0, 0, 3, h, 0.4); shade(g, w - 3, 0, 3, h, 0.4);
  return { canvas: c, w, h };
}

// Red arched bridge seen from above: plank deck between two railings.
export function drawBridgeDeck(wTiles, hTiles) {
  const w = wTiles * T, h = hTiles * T;
  const { c, g } = canvas(w, h);
  fillTiles(g, TILE.planks, 0, 0, w, h, 16, 16);
  for (let x = 0; x < w; x += 8) shade(g, x, 0, 1, h, 0.25);
  light(g, w / 2 - 6, 0, 12, h, 0.08);
  return { canvas: c, w, h };
}

export function drawBridgeRail(wTiles) {
  const w = wTiles * T;
  const { c, g } = canvas(w, 18);
  px(g, '#c3361f', 0, 2, w, 4); px(g, '#7d1c10', 0, 6, w, 2);
  for (let x = 0; x < w; x += 24) { px(g, '#c3361f', x, 2, 5, 16); px(g, '#e9c46a', x, 0, 5, 3); }
  px(g, '#c3361f', w - 5, 2, 5, 16);
  return { canvas: c, w, h: 18 };
}

export function drawYagura() {
  // Festival tower: wooden platform with a drum and strings of lanterns.
  const w = 3 * T, h = 4 * T;
  const { c, g } = canvas(w, h);
  for (const x of [6, w - 12]) px(g, '#4a2e18', x, 30, 6, h - 30);
  px(g, '#4a2e18', 0, 40, w, 6); px(g, '#2a1a10', 0, 46, w, 3);
  fillTiles(g, TILE.roof[2], 0, 4, w, 28, 16, 16); px(g, '#151820', 0, 28, w, 4);
  px(g, '#c3361f', w / 2 - 10, 50, 20, 16); px(g, '#e8d9b5', w / 2 - 7, 53, 14, 10);
  for (let i = 0; i < 5; i++) paperLantern(g, 4 + i * 18, 32, i % 2 ? '#f2c14e' : '#e0532f');
  px(g, '#2b1d14', 2, h - 6, w - 4, 6);
  return { canvas: c, w, h, light: { dx: 0, dy: -70, r: 170 } };
}

export function drawWell() {
  const { c, g } = canvas(T, T);
  px(g, '#5e6168', 4, 10, 24, 20); px(g, '#0d1a26', 8, 14, 16, 10); px(g, '#3a2414', 2, 2, 4, 26); px(g, '#3a2414', 26, 2, 4, 26); px(g, '#3a2414', 2, 2, 28, 4);
  return { canvas: c, w: T, h: T };
}

export function initProps(scene) {
  tilesImg = scene.textures.get('tiles').getSourceImage();
}

export function addPropTexture(scene, key, made) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, made.canvas);
  return made;
}
