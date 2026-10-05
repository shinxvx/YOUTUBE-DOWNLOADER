// Dialogue box with portrait, name, expression and choices. Drawn as an
// overlay on top of the location scene.
import { VW, VH, rect, panel, text, wrap, button, COLORS, img } from '../ui/core.js';
import { portraitImg, image } from '../ui/assets.js';
import { CHARACTERS } from '../content/world.js';

export class DialogueScene {
  // line: { speaker, expr, text } | { choices: [label] }
  constructor(line, opts = {}) {
    this.overlay = true;
    this.line = line;
    this.shown = 0;
    this.opts = opts;
  }

  enter(g) {
    this.shown = g.settings.textSpeed >= 3 ? 1e9 : 0;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    const L = this.line;
    if (this.opts.bg) {
      const bg = image(`bg:${this.opts.bg}`);
      if (bg) img(ctx, bg, 0, 0);
    }
    if (this.opts.dim) rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.35)');
    const boxY = 218;
    // portrait
    const who = L.speaker && L.speaker !== 'you' && L.speaker !== 'narrator' ? L.speaker : null;
    if (who) {
      const pt = portraitImg(who, L.expr || 'neutral');
      if (pt) {
        panel(ctx, 8, boxY - 92, 88, 88, { fill: '#2a3858' });
        ctx.drawImage(pt, 12, boxY - 88, 80, 80);
      }
    }
    panel(ctx, 6, boxY, VW - 12, VH - boxY - 6);
    if (L.choices) {
      if (L.prompt) text(ctx, L.prompt, 18, boxY + 10, { size: 9 });
      const n = L.choices.length;
      const bw = n > 2 ? 140 : 200;
      const total = n * bw + (n - 1) * 8;
      L.choices.forEach((c, i) => {
        const x = VW / 2 - total / 2 + i * (bw + 8);
        if (button(g, `choice${i}`, x, boxY + (L.prompt ? 40 : 30), bw, 30, c, { size: 8 }) && isTop) g.pop(i);
      });
      return;
    }
    let name = null;
    if (L.speaker === 'you') name = g.game ? g.game.name : 'You';
    else if (who) name = CHARACTERS[who] ? CHARACTERS[who].name : who;
    if (name) {
      panel(ctx, 14, boxY - 14, Math.max(70, name.length * 7 + 20), 18, { fill: '#4a3a78' });
      text(ctx, name, 22, boxY - 9, { size: 8, bold: true, color: COLORS.gold });
    }
    const full = L.text;
    const speed = [25, 45, 90, 1e9][g.settings.textSpeed] || 45;
    const before = Math.floor(this.shown);
    this.shown += dt * speed;
    if (Math.floor(this.shown) > before && Math.floor(this.shown) % 3 === 0 && this.shown < full.length) g.audio.sfx('text');
    const visible = full.slice(0, Math.floor(this.shown));
    const lines = wrap(ctx, full, VW - 48, 9);
    let count = 0;
    lines.forEach((ln, i) => {
      const part = visible.length > count ? ln.slice(0, Math.max(0, visible.length - count)) : '';
      count += ln.length + 1;
      text(ctx, part, 20, boxY + 12 + i * 14, { size: 9, color: L.speaker ? COLORS.text : '#d8e0f0' });
    });
    const done = this.shown >= full.length;
    if (done && Math.floor(g.time * 2) % 2 === 0) text(ctx, '▼', VW - 26, VH - 22, { size: 8, color: COLORS.gold });
    const st = g.input.hit('dlg', 0, 0, VW, VH);
    void st;
    if (isTop && (g.input.pressed('dlg') || g.input.key('Escape'))) {
      if (!done) this.shown = full.length;
      else g.pop();
    }
  }
}

// Full-screen rules pages for tutorials.
export class TutorialScene {
  constructor(pages) {
    this.overlay = true;
    this.pages = pages;
    this.i = 0;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.7)');
    panel(ctx, 40, 30, 400, 250);
    const p = this.pages[this.i];
    text(ctx, `Lesson ${this.i + 1}/${this.pages.length}: ${p.title}`, 56, 44, { size: 12, bold: true, color: COLORS.gold });
    wrap(ctx, p.text, 360, 10).forEach((l, k) => text(ctx, l, 56, 72 + k * 16, { size: 10 }));
    if (!isTop) return;
    if (this.i > 0 && button(g, 'tut-prev', 56, 244, 90, 22, 'Back')) this.i--;
    const last = this.i === this.pages.length - 1;
    if (button(g, 'tut-next', 334, 244, 90, 22, last ? 'Got it!' : 'Next')) {
      if (last) g.pop();
      else this.i++;
    }
  }
}

// Short banner (chapter titles, license promotions).
export class BannerScene {
  constructor(textStr, sub) {
    this.overlay = true;
    this.textStr = textStr;
    this.sub = sub;
    this.t = 0;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    this.t += dt;
    const a = Math.min(1, this.t * 2);
    ctx.globalAlpha = a;
    rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.8)');
    rect(ctx, 0, 120, VW, 64, '#24304e');
    rect(ctx, 0, 120, VW, 2, COLORS.gold);
    rect(ctx, 0, 182, VW, 2, COLORS.gold);
    text(ctx, this.textStr, VW / 2, 136, { align: 'center', size: 14, bold: true, color: COLORS.gold });
    if (this.sub) text(ctx, this.sub, VW / 2, 160, { align: 'center', size: 9 });
    ctx.globalAlpha = 1;
    g.input.hit('banner', 0, 0, VW, VH);
    if (isTop && this.t > 0.8 && (g.input.pressed('banner') || g.input.key('Escape'))) g.pop();
  }
}

// Screen effects: violet pulse / white flash.
export class FxScene {
  constructor(kind) {
    this.overlay = true;
    this.kind = kind;
    this.t = 0;
  }

  enter(g) {
    if (this.kind === 'pulse') g.audio.sfx('pulse');
  }

  frame(g, dt) {
    const { ctx } = g;
    this.t += dt;
    const d = 1.2;
    const k = Math.sin(Math.min(1, this.t / d) * Math.PI);
    const col = this.kind === 'pulse' ? `rgba(154,92,208,${k * 0.6})` : `rgba(255,255,255,${k * 0.85})`;
    rect(ctx, 0, 0, VW, VH, col);
    if (this.kind === 'pulse') {
      ctx.strokeStyle = `rgba(226,184,255,${k})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(VW * 0.8, VH * 0.2, this.t * 300, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.t >= d) g.pop();
  }
}
