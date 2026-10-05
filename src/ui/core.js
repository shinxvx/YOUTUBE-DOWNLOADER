// Screen, drawing helpers and immediate-mode input.
//
// Everything is laid out on a 480x320 logical screen. The canvas backing store
// is that size times an integer scale, so pixel art stays sharp while text is
// rasterized at full resolution (crisp and readable).
export const VW = 480;
export const VH = 320;

export const FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';

export const COLORS = {
  ink: '#1a1426',
  paper: '#f4ecd8',
  window: '#24304e',
  windowLight: '#34446a',
  border: '#e8e0c8',
  borderDark: '#0e1222',
  text: '#f4f0e4',
  textDim: '#a8b0c8',
  gold: '#ffd65a',
  danger: '#ff5a6a',
  good: '#7ae08a',
  focus: '#ffd65a',
  essence: '#9fe0ff',
};

export class Screen {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;
    this.offX = 0;
    this.offY = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // fit the logical screen keeping its proportion; integer scale for the
    // backing store so every art pixel maps to whole device pixels
    const fit = Math.min(w / VW, h / VH);
    const deviceScale = Math.max(1, Math.floor(fit * dpr));
    const cssScale = deviceScale / dpr;
    this.scale = deviceScale;
    this.canvas.width = VW * deviceScale;
    this.canvas.height = VH * deviceScale;
    this.canvas.style.width = `${VW * cssScale}px`;
    this.canvas.style.height = `${VH * cssScale}px`;
    this.offX = (w - VW * cssScale) / 2;
    this.offY = (h - VH * cssScale) / 2;
    this.canvas.style.left = `${this.offX}px`;
    this.canvas.style.top = `${this.offY}px`;
    this.cssScale = cssScale;
  }

  begin() {
    const c = this.ctx;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    c.textBaseline = 'top';
    c.clearRect(0, 0, VW, VH);
  }

  toLogical(clientX, clientY) {
    return { x: (clientX - this.offX) / this.cssScale, y: (clientY - this.offY) / this.cssScale };
  }
}

// ------------------------------------------------------------------ drawing

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function strokeRect(ctx, x, y, w, h, color, lw = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
}

// GBA-style window: dark fill, light double border with notched corners.
export function panel(ctx, x, y, w, h, opts = {}) {
  const fill = opts.fill || COLORS.window;
  const border = opts.border || COLORS.border;
  ctx.fillStyle = COLORS.borderDark;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = border;
  ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
  ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  ctx.fillStyle = COLORS.borderDark;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  if (!opts.flat) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 4, y + 4, w - 8, Math.min(10, h - 8));
  }
}

export function text(ctx, str, x, y, opts = {}) {
  const size = opts.size || 8;
  ctx.font = `${opts.bold ? '700' : '500'} ${size}px ${FONT}`;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = 'top';
  if (opts.shadow !== false) {
    ctx.fillStyle = opts.shadowColor || 'rgba(10,8,20,0.85)';
    ctx.fillText(str, x + size / 10, y + size / 10);
  }
  ctx.fillStyle = opts.color || COLORS.text;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

// Text that shrinks (down to 5px) and then truncates to fit maxW.
export function fitText(ctx, str, x, y, maxW, opts = {}) {
  let size = opts.size || 8;
  while (size > 5 && measure(ctx, str, size, opts.bold) > maxW) size -= 0.5;
  let s = str;
  while (s.length > 2 && measure(ctx, s, size, opts.bold) > maxW) s = s.slice(0, -2) + '…';
  text(ctx, s, x, y + ((opts.size || 8) - size) / 2, { ...opts, size });
}

export function measure(ctx, str, size = 8, bold = false) {
  ctx.font = `${bold ? '700' : '500'} ${size}px ${FONT}`;
  return ctx.measureText(str).width;
}

export function wrap(ctx, str, maxW, size = 8, bold = false) {
  const lines = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(' ');
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (measure(ctx, t, size, bold) > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    lines.push(cur);
  }
  return lines;
}

export function textBlock(ctx, str, x, y, maxW, opts = {}) {
  const size = opts.size || 8;
  const lh = opts.lineHeight || Math.round(size * 1.35);
  const lines = wrap(ctx, str, maxW, size, opts.bold);
  const max = opts.maxLines || lines.length;
  lines.slice(0, max).forEach((l, i) => text(ctx, l, x, y + i * lh, opts));
  return lines.length * lh;
}

export function img(ctx, image, x, y, opts = {}) {
  if (!image) return;
  const w = opts.w || image.width;
  const h = opts.h || image.height;
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.flip) {
    ctx.translate(Math.round(x + w), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, w, h);
  } else ctx.drawImage(image, Math.round(x), Math.round(y), w, h);
  ctx.restore();
}

// ------------------------------------------------------------------ input

// Immediate-mode input: every frame, widgets register hit areas; clicks and
// keyboard focus resolve against the areas registered in the previous frame.
export class Input {
  constructor(screen) {
    this.screen = screen;
    this.mouse = { x: -1, y: -1, down: false };
    this.clicked = null; // {x,y,button}
    this.keys = [];
    this.hits = [];
    this.prevHits = [];
    this.focusIndex = -1;
    this.usingKeyboard = false;
    this.wheel = 0;
    const cv = screen.canvas;
    cv.addEventListener('mousemove', (e) => {
      const p = screen.toLogical(e.clientX, e.clientY);
      if (Math.abs(p.x - this.mouse.x) + Math.abs(p.y - this.mouse.y) > 0.5) this.usingKeyboard = false;
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    });
    cv.addEventListener('mousedown', (e) => {
      const p = screen.toLogical(e.clientX, e.clientY);
      this.mouse.down = true;
      this.clicked = { x: p.x, y: p.y, button: e.button };
      this.usingKeyboard = false;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'Enter') return;
      this.keys.push(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', ' '].includes(e.key)) e.preventDefault();
    });
  }

  // Called by widgets while drawing.
  hit(id, x, y, w, h, opts = {}) {
    this.hits.push({ id, x, y, w, h, focusable: opts.focusable !== false, disabled: !!opts.disabled });
    const prevFocus = this.prevHits.filter((hh) => hh.focusable)[this.focusIndex];
    const focused = this.usingKeyboard && prevFocus && prevFocus.id === id;
    const hover = !this.usingKeyboard && this.mouse.x >= x && this.mouse.x < x + w && this.mouse.y >= y && this.mouse.y < y + h;
    return { hover, focused, active: hover || focused };
  }

  // Did this widget get activated (click or Enter on focus)?
  pressed(id, button = 0) {
    if (this._consumed) return false;
    const h = this.prevHits.find((hh) => hh.id === id);
    if (!h || h.disabled) return false;
    if (this.clicked && this.clicked.button === button) {
      const top = this.topHitAt(this.clicked.x, this.clicked.y);
      if (top && top.id === id) {
        this._consumed = true;
        return true;
      }
    }
    if (button === 0 && this.keyEnter) {
      const f = this.prevHits.filter((hh) => hh.focusable)[this.focusIndex];
      if (f && f.id === id) {
        this._consumed = true;
        return true;
      }
    }
    return false;
  }

  rightClicked(id) {
    return this.pressed(id, 2);
  }

  topHitAt(x, y) {
    for (let i = this.prevHits.length - 1; i >= 0; i--) {
      const h = this.prevHits[i];
      if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h;
    }
    return null;
  }

  key(name) {
    const i = this.keys.indexOf(name);
    if (i >= 0) {
      this.keys.splice(i, 1);
      return true;
    }
    return false;
  }

  anyKey(names) {
    return names.some((n) => this.key(n));
  }

  // Start of frame: compute keyboard navigation over last frame's widgets.
  beginFrame() {
    this._consumed = false;
    this.keyEnter = false;
    const focusables = this.prevHits.filter((h) => h.focusable && !h.disabled);
    const move = (dx, dy) => {
      this.usingKeyboard = true;
      const all = this.prevHits.filter((h) => h.focusable);
      if (!focusables.length) return;
      const cur = all[this.focusIndex];
      if (!cur || cur.disabled) {
        this.focusIndex = all.indexOf(focusables[0]);
        return;
      }
      const cx = cur.x + cur.w / 2;
      const cy = cur.y + cur.h / 2;
      let best = null;
      let bestD = Infinity;
      for (const h of focusables) {
        if (h === cur) continue;
        const hx = h.x + h.w / 2;
        const hy = h.y + h.h / 2;
        const ddx = hx - cx;
        const ddy = hy - cy;
        if (dx && Math.sign(ddx) !== dx) continue;
        if (dy && Math.sign(ddy) !== dy) continue;
        const d = dx ? Math.abs(ddx) + Math.abs(ddy) * 2.5 : Math.abs(ddy) + Math.abs(ddx) * 2.5;
        if (d < bestD) {
          bestD = d;
          best = h;
        }
      }
      if (best) this.focusIndex = all.indexOf(best);
    };
    const letters = !this.textMode;
    for (const k of [...this.keys]) {
      if (k === 'ArrowUp' || (letters && k === 'w')) move(0, -1);
      else if (k === 'ArrowDown' || (letters && k === 's')) move(0, 1);
      else if (k === 'ArrowLeft' || (letters && k === 'a')) move(-1, 0);
      else if (k === 'ArrowRight' || (letters && k === 'd')) move(1, 0);
      else if (k === 'Tab') {
        this.usingKeyboard = true;
        const all = this.prevHits.filter((h) => h.focusable);
        if (focusables.length) {
          const idx = focusables.indexOf(all[this.focusIndex]);
          this.focusIndex = all.indexOf(focusables[(idx + 1) % focusables.length]);
        }
      } else if (k === 'Enter' || (letters && (k === ' ' || k === 'z'))) {
        const all = this.prevHits.filter((h) => h.focusable);
        const cur = all[this.focusIndex];
        if (!this.usingKeyboard || !cur || cur.disabled) {
          // keyboard takes over: focus the first widget and activate it
          this.usingKeyboard = true;
          if (focusables.length) this.focusIndex = all.indexOf(focusables[0]);
        }
        if (this.focusIndex >= 0) this.keyEnter = true;
      } else continue;
      this.keys.splice(this.keys.indexOf(k), 1);
    }
  }

  endFrame() {
    // keep focus on the same widget id across frames when the list changes
    const oldAll = this.prevHits.filter((h) => h.focusable);
    const focusedId = oldAll[this.focusIndex] && oldAll[this.focusIndex].id;
    this.prevHits = this.hits;
    this.hits = [];
    const newAll = this.prevHits.filter((h) => h.focusable);
    const idx = newAll.findIndex((h) => h.id === focusedId);
    this.focusIndex = idx >= 0 ? idx : Math.min(this.focusIndex, newAll.length - 1);
    this.clicked = null;
    this.keys = [];
    this.wheel = 0;
  }

  resetFocus() {
    this.focusIndex = -1;
  }
}

// ------------------------------------------------------------------ widgets

export function button(g, id, x, y, w, h, label, opts = {}) {
  const { ctx, input } = g;
  const st = input.hit(id, x, y, w, h, { disabled: opts.disabled, focusable: opts.focusable });
  const base = opts.color || '#3a4a78';
  let fill = opts.disabled ? '#3a3e4e' : base;
  if (!opts.disabled && st.active) fill = opts.hover || '#5468a8';
  if (opts.selected) fill = opts.selectedColor || '#7a5a20';
  ctx.fillStyle = COLORS.borderDark;
  ctx.fillRect(x, y + 1, w, h - 1);
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 3);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
  if (st.focused) {
    ctx.strokeStyle = COLORS.focus;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  }
  const size = opts.size || 8;
  text(ctx, label, x + w / 2, y + (h - size) / 2 - 1, { size, align: 'center', color: opts.disabled ? '#7a7e8e' : opts.textColor || COLORS.text, bold: opts.bold });
  if (st.active && opts.tooltip) g.tooltip = opts.tooltip;
  if (opts.disabled) {
    if (st.hover && opts.why) g.tooltip = opts.why;
    // still report presses so callers can explain why it is disabled
    return false;
  }
  if (input.pressed(id)) {
    g.audio && g.audio.sfx('click');
    return true;
  }
  return false;
}

export function drawTooltip(g) {
  if (!g.tooltip) return;
  const { ctx, input } = g;
  const maxW = 180;
  const lines = wrap(ctx, g.tooltip, maxW - 10, 8);
  const w = Math.min(maxW, Math.max(...lines.map((l) => measure(ctx, l, 8))) + 12);
  const h = lines.length * 11 + 8;
  let x = input.mouse.x + 10;
  let y = input.mouse.y + 10;
  if (input.usingKeyboard) {
    x = VW / 2 - w / 2;
    y = VH - h - 6;
  }
  x = Math.min(x, VW - w - 2);
  y = Math.min(y, VH - h - 2);
  rect(ctx, x, y, w, h, 'rgba(12,14,28,0.95)');
  strokeRect(ctx, x, y, w, h, COLORS.border);
  lines.forEach((l, i) => text(ctx, l, x + 6, y + 4 + i * 11));
  g.tooltip = null;
}
