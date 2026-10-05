// Shared screen pieces: period tint, headers, back buttons.
import { VW, VH, rect, text, button, COLORS, img } from './core.js';
import { image } from './assets.js';

export function periodTint(ctx, period) {
  const tint = ['rgba(255,240,200,0.06)', 'rgba(255,150,60,0.16)', 'rgba(20,24,80,0.42)'][period] || null;
  if (tint) rect(ctx, 0, 0, VW, VH, tint);
}

export function background(g, key, period = null) {
  const { ctx } = g;
  const bg = image(`bg:${key}`);
  if (bg) img(ctx, bg, 0, 0);
  else rect(ctx, 0, 0, VW, VH, '#203040');
  if (period !== null) periodTint(ctx, period);
}

export function header(g, title, opts = {}) {
  const { ctx } = g;
  rect(ctx, 0, 0, VW, 22, '#1a2240');
  rect(ctx, 0, 22, VW, 2, COLORS.gold);
  text(ctx, title, 10, 6, { size: 10, bold: true, color: COLORS.gold });
  if (opts.right) text(ctx, opts.right, VW - 70, 7, { size: 8, align: 'right', color: COLORS.text });
  if (opts.back !== false) {
    if (button(g, 'hdr-back', VW - 62, 3, 56, 16, 'Back (Esc)', { size: 7, color: '#4a3a4a' }) || g.input.key('Escape')) {
      g.audio.sfx('back');
      return true;
    }
  }
  return false;
}
