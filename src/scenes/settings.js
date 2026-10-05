// Settings: audio, animation and text speed, window size, fullscreen.
import { VW, VH, rect, panel, text, button, COLORS } from '../ui/core.js';
import { header } from '../ui/widgets.js';

const ANIM = [[1, 'Normal'], [2, 'Fast'], [0, 'Instant']];
const TEXT = ['Slow', 'Normal', 'Fast', 'Instant'];

export class SettingsScene {
  constructor() {
    this.overlay = false;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    rect(ctx, 0, 0, VW, VH, '#141a30');
    if (header(g, 'Settings') && isTop) {
      g.saveSettings();
      g.pop();
      return;
    }
    const s = g.settings;
    let y = 40;
    const row = (label) => {
      text(ctx, label, 40, y + 4, { size: 9 });
    };
    const vol = (key, label) => {
      row(label);
      const v = Math.round(s[key] * 10);
      if (button(g, `st-${key}-m`, 200, y, 22, 18, '-')) s[key] = Math.max(0, (v - 1) / 10);
      rect(ctx, 228, y + 6, 120, 6, '#2a3050');
      rect(ctx, 228, y + 6, 12 * v, 6, COLORS.essence);
      if (button(g, `st-${key}-p`, 354, y, 22, 18, '+')) s[key] = Math.min(1, (v + 1) / 10);
      text(ctx, `${v * 10}%`, 384, y + 4, { size: 8, color: COLORS.textDim });
      y += 26;
    };
    panel(ctx, 24, 30, 432, 270);
    vol('master', 'Master volume');
    vol('music', 'Music');
    vol('sfx', 'Sound effects');
    g.audio.applyVolumes();
    row('Animation speed');
    ANIM.forEach(([v, l], i) => {
      if (button(g, `st-anim-${v}`, 200 + i * 70, y, 64, 18, l, { selected: s.animSpeed === v, size: 7 })) s.animSpeed = v;
    });
    y += 26;
    row('Text speed');
    TEXT.forEach((l, i) => {
      if (button(g, `st-text-${i}`, 200 + i * 60, y, 56, 18, l, { selected: s.textSpeed === i, size: 7 })) s.textSpeed = i;
    });
    y += 26;
    if (g.host) {
      row('Window size');
      [2, 3, 4, 5].forEach((k, i) => {
        if (button(g, `st-win-${k}`, 200 + i * 52, y, 46, 18, `${480 * k}x${320 * k}`.replace('x', '×'), { selected: s.windowScale === k, size: 7 })) {
          s.windowScale = k;
          g.host.setWindowScale(k);
        }
      });
      y += 26;
    }
    row('Fullscreen');
    if (button(g, 'st-fs', 200, y, 100, 18, 'Toggle (Alt+Enter)', { size: 7 })) g.toggleFullscreen();
    y += 30;
    text(ctx, 'The picture always keeps its 3:2 shape and sharp pixels.', 40, y, { size: 7, color: COLORS.textDim });
    text(ctx, 'Settings are saved automatically when you leave this screen.', 40, y + 12, { size: 7, color: COLORS.textDim });
  }
}
