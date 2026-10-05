// Card rendering at three sizes: hand (52x72), field (64x84) and zoom (150x214).
import { CARDS, AFFINITY_INFO } from '../content/cards.js';
import { creatureImg } from './assets.js';
import { text, rect, textBlock, fitText, COLORS } from './core.js';

export const HAND_W = 52;
export const HAND_H = 72;
export const FIELD_W = 64;
export const FIELD_H = 84;
export const ZOOM_W = 150;
export const ZOOM_H = 214;

const TYPE_LABEL = { creature: 'Creature', technique: 'Technique', relic: 'Relic', terrain: 'Terrain' };
const STAGE_LABEL = ['Basic', 'Stage 1', 'Stage 2'];

export function typeLine(c) {
  if (c.type === 'creature') return `${c.legendary ? 'Legendary' : STAGE_LABEL[c.stage]} · ${AFFINITY_INFO[c.affinity].name}`;
  return `${TYPE_LABEL[c.type]} · ${AFFINITY_INFO[c.affinity].name}`;
}

function frame(ctx, x, y, w, h, c, opts = {}) {
  const a = AFFINITY_INFO[c.affinity];
  rect(ctx, x, y, w, h, COLORS.ink);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, c.legendary ? '#ffe9a0' : a.light);
  rect(ctx, x + 2, y + 2, w - 4, h - 4, a.color);
  if (opts.dim) rect(ctx, x, y, w, h, 'rgba(20,20,30,0.45)');
}

// little pixel icons for non-creature cards
export function cardArt(ctx, c, x, y, w, h, t = 0) {
  const a = AFFINITY_INFO[c.affinity];
  rect(ctx, x, y, w, h, a.dark);
  if (c.type === 'creature') {
    // soft backdrop band
    rect(ctx, x, y + h - Math.floor(h / 3), w, Math.floor(h / 3), 'rgba(255,255,255,0.12)');
    const im = creatureImg(c.id);
    if (im) {
      const s = Math.max(1, Math.floor(Math.min(w / 48, h / 48)));
      const iw = 48 * s;
      ctx.drawImage(im, Math.round(x + (w - iw) / 2), Math.round(y + h - iw), iw, iw);
    }
    return;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 3;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  if (c.type === 'technique') {
    // starburst
    ctx.fillStyle = a.light;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + t * 0.5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'relic') {
    // amulet: chain + gem
    ctx.strokeStyle = '#e8d8a0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.7, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(r * 0.5, 0);
    ctx.lineTo(0, r * 0.75);
    ctx.lineTo(-r * 0.5, 0);
    ctx.fill();
    ctx.fillStyle = a.light;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.45);
    ctx.lineTo(r * 0.4, 0);
    ctx.lineTo(0, r * 0.62);
    ctx.lineTo(-r * 0.4, 0);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.15, -r * 0.2, 2, 2);
  } else {
    // terrain: hills under a sky
    ctx.fillStyle = a.light;
    ctx.fillRect(-w / 2, -h / 2, w, h * 0.55);
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.lineTo(-w / 6, -h / 4);
    ctx.lineTo(w / 8, h / 10);
    ctx.lineTo(w / 3, -h / 6);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w / 2, h / 2);
    ctx.fill();
    ctx.fillStyle = a.dark;
    ctx.fillRect(-w / 2, h / 4, w, h / 4);
  }
  ctx.restore();
}

function costGem(ctx, x, y, cost, size = 'small') {
  const r = size === 'big' ? 9 : 6;
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.arc(x + r, y + r, r + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a6ab0';
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.essence;
  ctx.beginPath();
  ctx.arc(x + r - 1, y + r - 1, r - 3, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, String(cost), x + r, y + r - (size === 'big' ? 6 : 4), { align: 'center', size: size === 'big' ? 12 : 8, bold: true, color: COLORS.ink, shadow: false });
}

export function statPill(ctx, x, y, label, color, fg = '#ffffff') {
  const w = Math.max(10, label.length * 5 + 5);
  rect(ctx, x, y, w, 9, COLORS.ink);
  rect(ctx, x + 1, y + 1, w - 2, 7, color);
  text(ctx, label, x + w / 2, y + 1, { align: 'center', size: 7, bold: true, color: fg, shadow: false });
  return w;
}

// Card as it appears in hand / lists.
export function drawHandCard(ctx, id, x, y, opts = {}) {
  const c = CARDS[id];
  frame(ctx, x, y, HAND_W, HAND_H, c, opts);
  cardArt(ctx, c, x + 4, y + 13, HAND_W - 8, 34, opts.t || 0);
  rect(ctx, x + 3, y + 3, HAND_W - 6, 10, 'rgba(10,8,20,0.55)');
  fitText(ctx, c.name, x + HAND_W / 2 + 5, y + 4, HAND_W - 14, { align: 'center', size: 7, bold: true });
  costGem(ctx, x - 2, y - 2, opts.cost ?? c.cost);
  rect(ctx, x + 3, y + 48, HAND_W - 6, 21, 'rgba(10,8,20,0.55)');
  if (c.type === 'creature') {
    text(ctx, c.legendary ? 'Legend' : STAGE_LABEL[c.stage], x + 5, y + 49, { size: 7, color: COLORS.textDim });
    statPill(ctx, x + 4, y + 59, `${c.atk}`, '#c0402a');
    statPill(ctx, x + HAND_W - 16, y + 59, `${c.hp}`, '#2a8a4a');
  } else {
    text(ctx, TYPE_LABEL[c.type], x + 5, y + 49, { size: 7, color: COLORS.textDim });
  }
  if (opts.count !== undefined) {
    rect(ctx, x + HAND_W - 18, y + HAND_H - 12, 16, 10, COLORS.ink);
    text(ctx, `x${opts.count}`, x + HAND_W - 10, y + HAND_H - 11, { align: 'center', size: 7, color: COLORS.gold, shadow: false });
  }
  if (opts.highlight) {
    ctx.strokeStyle = opts.highlight;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, HAND_W + 2, HAND_H + 2);
  }
}

export function drawCardBack(ctx, x, y, w = HAND_W, h = HAND_H) {
  rect(ctx, x, y, w, h, COLORS.ink);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, '#3a3a6a');
  rect(ctx, x + 3, y + 3, w - 6, h - 6, '#24244a');
  ctx.strokeStyle = '#ffd65a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 4, 0, Math.PI * 2);
  ctx.stroke();
  rect(ctx, x + w / 2 - 1, y + h / 2 - 1, 2, 2, '#ffd65a');
}

// Large card with full rules text.
export function drawZoomCard(ctx, id, x, y, opts = {}) {
  const c = CARDS[id];
  frame(ctx, x, y, ZOOM_W, ZOOM_H, c);
  rect(ctx, x + 4, y + 4, ZOOM_W - 8, 16, 'rgba(10,8,20,0.6)');
  fitText(ctx, c.name, x + 24, y + 7, ZOOM_W - 30, { size: 10, bold: true });
  costGem(ctx, x - 3, y - 3, opts.cost ?? c.cost, 'big');
  cardArt(ctx, c, x + 6, y + 22, ZOOM_W - 12, 96, opts.t || 0);
  rect(ctx, x + 4, y + 120, ZOOM_W - 8, 12, 'rgba(10,8,20,0.6)');
  text(ctx, typeLine(c), x + 8, y + 122, { size: 7, color: COLORS.gold });
  rect(ctx, x + 4, y + 134, ZOOM_W - 8, ZOOM_H - 138, '#f4ecd8');
  textBlock(ctx, c.text, x + 8, y + 137, ZOOM_W - 16, { size: 7, color: COLORS.ink, shadow: false, lineHeight: 9 });
  if (c.type === 'creature') {
    const evo = c.evolvesFrom ? `Evolves from ${CARDS[c.evolvesFrom].name}` : '';
    if (evo) text(ctx, evo, x + 8, y + ZOOM_H - 26, { size: 7, color: '#5a4a6a', shadow: false });
    statPill(ctx, x + 8, y + ZOOM_H - 15, `ATK ${opts.atk ?? c.atk}`, '#c0402a');
    statPill(ctx, x + ZOOM_W - 50, y + ZOOM_H - 15, `HP ${opts.hp ?? c.hp}${opts.maxHp ? `/${opts.maxHp}` : ''}`, '#2a8a4a');
  }
}
