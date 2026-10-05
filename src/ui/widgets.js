import Phaser from 'phaser';
import { COLORS, FONT_UI, FONT_TITLE } from '../config.js';
import { textResolution } from '../systems/display.js';


export function text(scene, x, y, str, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: opts.title ? FONT_TITLE : FONT_UI,
    fontSize: `${opts.size || 18}px`,
    color: opts.color || COLORS.text,
    fontStyle: opts.bold ? 'bold' : (opts.italic ? 'italic' : 'normal'),
    align: opts.align || 'left',
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: opts.lineSpacing ?? 4,
    stroke: opts.stroke || undefined,
    strokeThickness: opts.stroke ? (opts.strokeThickness || 3) : 0,
    shadow: opts.shadow === false ? undefined : { offsetX: 0, offsetY: 2, color: '#000', blur: 3, fill: true, stroke: false },
  });
  t.setResolution(textResolution());
  if (opts.origin !== undefined) t.setOrigin(...[].concat(opts.origin));
  return t;
}

// Ornamented panel: layered gradient fill, gold frame, corner studs and a faint inner rule,
// so menus feel like crafted objects instead of empty dark boxes.
export function panel(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  const a = opts.alpha ?? 0.94;
  const top = opts.top ?? 0x1d2340;
  const bottom = opts.bottom ?? 0x0c0f1e;
  g.fillStyle(0x000000, 0.35 * a);
  g.fillRoundedRect(x + 3, y + 5, w, h, 8);
  g.fillGradientStyle(top, top, bottom, bottom, a, a, a, a);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  // Fine diagonal texture
  g.fillStyle(0xffffff, 0.022);
  for (let yy = y + 4; yy < y + h - 4; yy += 4) g.fillRect(x + 4, yy, w - 8, 1);
  g.lineStyle(2, opts.border ?? COLORS.gold, 0.95);
  g.strokeRoundedRect(x, y, w, h, 6);
  g.lineStyle(1, opts.border ?? COLORS.gold, 0.28);
  g.strokeRect(x + 6, y + 6, w - 12, h - 12);
  // Corner studs
  g.fillStyle(COLORS.goldLight, 1);
  for (const [cx, cy] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
    g.fillTriangle(cx, cy - 4, cx + 4, cy, cx, cy + 4);
    g.fillTriangle(cx, cy - 4, cx - 4, cy, cx, cy + 4);
  }
  if (opts.depth !== undefined) g.setDepth(opts.depth);
  return g;
}

export function bar(scene, x, y, w, h, color, back = 0x101010) {
  const g = scene.add.graphics();
  const api = {
    g, value: 1,
    set(v, ghost) {
      api.value = Phaser.Math.Clamp(v, 0, 1);
      g.clear();
      g.fillStyle(0x000000, 0.6); g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle(back, 1); g.fillRect(x, y, w, h);
      if (ghost !== undefined && ghost > api.value) { g.fillStyle(0xffffff, 0.35); g.fillRect(x, y, w * ghost, h); }
      g.fillStyle(color, 1); g.fillRect(x, y, Math.round(w * api.value), h);
      g.fillStyle(0xffffff, 0.22); g.fillRect(x, y, Math.round(w * api.value), Math.max(1, Math.floor(h / 3)));
      return api;
    },
    setDepth(d) { g.setDepth(d); return api; },
    destroy() { g.destroy(); },
  };
  return api.set(1);
}

// Keyboard + mouse vertical list. Returns a controller; call handle(controls) each frame.
export class MenuList {
  constructor(scene, x, y, items, opts = {}) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.items = items; // {label, disabled?, value?, hint?}
    this.index = opts.index || 0;
    this.lineH = opts.lineH || 34;
    this.width = opts.width || 220;
    this.size = opts.size || 20;
    this.onSelect = opts.onSelect || (() => {});
    this.onCancel = opts.onCancel || null;
    this.onChange = opts.onChange || null;
    this.depth = opts.depth ?? 0;
    this.objs = [];
    this.active = true;
    this.build();
  }

  build() {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    this.cursor = this.scene.add.graphics().setDepth(this.depth);
    this.objs.push(this.cursor);
    this.labels = this.items.map((it, i) => {
      const t = text(this.scene, this.x + 28, this.y + i * this.lineH, it.label, {
        size: this.size, color: it.disabled ? '#6d6758' : (it.color || '#efe6d2'),
      }).setDepth(this.depth + 1);
      t.setInteractive(new Phaser.Geom.Rectangle(-24, -4, this.width, this.lineH), Phaser.Geom.Rectangle.Contains);
      t.on('pointerover', () => { if (!this.active) return; if (this.index !== i) { this.index = i; this.refresh(); this.emitChange(); } });
      t.on('pointerdown', () => { if (!this.active) return; this.index = i; this.refresh(); this.choose(); });
      this.objs.push(t);
      return t;
    });
    this.refresh();
  }

  emitChange() { this.onChange?.(this.items[this.index], this.index); }

  refresh() {
    const c = this.cursor;
    c.clear();
    if (!this.items.length) return;
    const yy = this.y + this.index * this.lineH + this.size * 0.62;
    c.fillStyle(0xc9a45c, 0.16);
    c.fillRect(this.x + 6, yy - this.lineH / 2 + 1, this.width, this.lineH - 4);
    c.fillStyle(this.active ? 0xf0d79a : 0x8a7a55, 1);
    c.fillTriangle(this.x + 8, yy - 7, this.x + 18, yy, this.x + 8, yy + 7);
  }

  move(d) {
    if (!this.items.length) return;
    this.index = (this.index + d + this.items.length) % this.items.length;
    this.refresh();
    this.emitChange();
    return true;
  }

  choose() {
    const it = this.items[this.index];
    if (!it || it.disabled) { this.scene.game.events.emit('sfx', 'cancel'); return; }
    this.scene.game.events.emit('sfx', 'confirm');
    this.onSelect(it, this.index);
  }

  handle(controls) {
    if (!this.active) return;
    if (controls.pressed('up')) { this.move(-1); this.scene.game.events.emit('sfx', 'move'); }
    else if (controls.pressed('down')) { this.move(1); this.scene.game.events.emit('sfx', 'move'); }
    else if (controls.pressed('confirm')) this.choose();
    else if (controls.pressed('cancel') && this.onCancel) { this.scene.game.events.emit('sfx', 'cancel'); this.onCancel(); }
  }

  setActive(a) { this.active = a; this.refresh(); }

  destroy() { for (const o of this.objs) o.destroy(); this.objs = []; }
}
