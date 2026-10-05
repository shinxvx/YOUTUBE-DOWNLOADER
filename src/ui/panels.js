import { GAME_W, GAME_H } from '../config.js';
import { settings, saveSettings, TEXT_SPEEDS, resetKeys } from '../systems/settings.js';
import { listSaves, describeSave, saveTo, loadFrom, MANUAL_SLOTS } from '../systems/save.js';
import { panel, text, MenuList } from './widgets.js';

// Shared modal panels used by the title screen and the pause menu.
// Each panel exposes handle(controls) and resolves onClose when dismissed.

export class SettingsPanel {
  constructor(scene, onClose, depth = 500) {
    this.scene = scene;
    this.onClose = onClose;
    this.depth = depth;
    this.objs = [];
    const w = 680, h = 470, x = (GAME_W - w) / 2, y = (GAME_H - h) / 2;
    this.objs.push(panel(scene, x, y, w, h).setDepth(depth));
    this.objs.push(text(scene, x + 30, y + 22, 'Settings', { size: 28, title: true, color: '#f0d79a' }).setDepth(depth + 1));
    this.desc = text(scene, x + 30, y + h - 46, '', { size: 14, color: '#a79f8c', wrap: w - 60 }).setDepth(depth + 1);
    this.objs.push(this.desc);
    this.x = x; this.y = y; this.w = w;
    this.rows = [
      { key: 'textSpeed', label: 'Text speed', values: Object.keys(TEXT_SPEEDS), desc: 'How quickly dialogue appears. Instant shows the whole line at once.' },
      { key: 'battleSpeed', label: 'Battle speed', values: [1, 1.5, 2, 3], fmt: v => `${v}×`, desc: 'Speeds up battle animations and effects.' },
      { key: 'musicVolume', label: 'Music volume', values: [0, 0.2, 0.4, 0.6, 0.8, 1], fmt: v => `${Math.round(v * 100)}%`, desc: 'Procedural score volume.' },
      { key: 'sfxVolume', label: 'Effects volume', values: [0, 0.2, 0.4, 0.6, 0.8, 1], fmt: v => `${Math.round(v * 100)}%`, desc: 'Sound effects volume.' },
      { key: 'reducedShake', label: 'Reduced screen shake', values: [false, true], fmt: v => (v ? 'On' : 'Off'), desc: 'Softens or removes camera shake.' },
      { key: 'reducedFlashing', label: 'Reduced flashing', values: [false, true], fmt: v => (v ? 'On' : 'Off'), desc: 'Replaces bright flashes with gentle colour pulses.' },
      { key: 'difficulty', label: 'Difficulty', values: ['story', 'standard'], fmt: v => (v === 'story' ? 'Story' : 'Standard'), desc: 'Story: gentler enemies for players here for the narrative. Standard: the intended tactical balance.' },
      { key: 'skipSeenAnimations', label: 'Short skill animations', values: [false, true], fmt: v => (v ? 'On' : 'Off'), desc: 'Shortens skill effects you have already seen once.' },
      { key: '_keys', label: 'Reset key bindings', action: () => resetKeys(), desc: 'Keys: arrows/WASD move · Z/Enter/Space confirm · X/Backspace cancel · Esc/M menu. (Full remapping arrives in a later milestone.)' },
      { key: '_back', label: 'Back', action: () => this.close(), desc: '' },
    ];
    this.valueTexts = [];
    this.list = new MenuList(scene, x + 24, y + 78, this.rows.map(r => ({ label: r.label })), {
      width: w - 50, lineH: 34, size: 18, depth: depth + 2,
      onSelect: (_, i) => this.activate(i, 1),
      onCancel: () => this.close(),
      onChange: (_, i) => this.desc.setText(this.rows[i].desc),
    });
    this.rows.forEach((r, i) => {
      const t = text(scene, x + w - 40, y + 78 + i * 34, '', { size: 18, color: '#f0d79a', origin: [1, 0] }).setDepth(depth + 3);
      this.valueTexts.push(t);
      this.objs.push(t);
    });
    this.desc.setText(this.rows[0].desc);
    this.refresh();
  }

  refresh() {
    this.rows.forEach((r, i) => {
      if (!r.values) { this.valueTexts[i].setText(''); return; }
      const v = settings[r.key];
      this.valueTexts[i].setText(`◂ ${r.fmt ? r.fmt(v) : String(v)[0].toUpperCase() + String(v).slice(1)} ▸`);
    });
  }

  activate(i, dir) {
    const r = this.rows[i];
    if (r.action) { r.action(); return; }
    const idx = r.values.indexOf(settings[r.key]);
    settings[r.key] = r.values[(idx + dir + r.values.length) % r.values.length];
    saveSettings();
    this.refresh();
  }

  handle(c) {
    if (c.pressed('left')) { this.activate(this.list.index, -1); this.scene.game.events.emit('sfx', 'move'); return; }
    if (c.pressed('right')) { this.activate(this.list.index, 1); this.scene.game.events.emit('sfx', 'move'); return; }
    this.list.handle(c);
  }

  close() {
    this.destroy();
    this.onClose?.();
  }

  destroy() {
    this.list.destroy();
    for (const o of this.objs) o.destroy();
  }
}

export class SaveLoadPanel {
  // mode: 'save' | 'load'
  constructor(scene, mode, onClose, onLoaded, depth = 500) {
    this.scene = scene;
    this.mode = mode;
    this.onClose = onClose;
    this.onLoaded = onLoaded;
    this.depth = depth;
    this.objs = [];
    this.build();
  }

  build() {
    for (const o of this.objs) o.destroy();
    this.list?.destroy();
    this.objs = [];
    const scene = this.scene, depth = this.depth;
    const w = 860, h = 420, x = (GAME_W - w) / 2, y = (GAME_H - h) / 2;
    this.objs.push(panel(scene, x, y, w, h).setDepth(depth));
    this.objs.push(text(scene, x + 30, y + 22, this.mode === 'save' ? 'Save Game' : 'Load Game', { size: 28, title: true, color: '#f0d79a' }).setDepth(depth + 1));
    const saves = listSaves().filter(s => this.mode === 'load' || MANUAL_SLOTS.includes(s.slot));
    this.saves = saves;
    const items = saves.map(s => {
      const name = s.slot.startsWith('auto') ? `Autosave ${s.slot.slice(4)}` : `Slot ${s.slot.slice(4)}`;
      const label = s.data?.label && s.slot.startsWith('auto') ? ` — ${s.data.label}` : '';
      return { label: `${name}${label}`, disabled: this.mode === 'load' && !s.data };
    });
    items.push({ label: 'Back' });
    this.descs = saves.map(s => describeSave(s));
    this.info = text(scene, x + 30, y + h - 54, '', { size: 15, color: '#a79f8c', wrap: w - 60 }).setDepth(depth + 1);
    this.objs.push(this.info);
    saves.forEach((s, i) => {
      this.objs.push(text(scene, x + w - 36, y + 84 + i * 40, this.descs[i], { size: 14, color: s.data ? '#efe6d2' : '#6d6758', origin: [1, 0] }).setDepth(depth + 1));
    });
    this.list = new MenuList(scene, x + 24, y + 80, items, {
      width: w - 50, lineH: 40, size: 18, depth: depth + 2,
      onSelect: (_, i) => this.select(i),
      onCancel: () => this.close(),
      onChange: (_, i) => this.info.setText(i < saves.length && saves[i].data ? `Objective: ${saves[i].data.summary.objective}` : ''),
    });
  }

  select(i) {
    if (i >= this.saves.length) { this.close(); return; }
    const s = this.saves[i];
    if (this.mode === 'save') {
      const ok = saveTo(s.slot);
      this.scene.game.events.emit('sfx', ok ? 'save' : 'cancel');
      const idx = this.list.index;
      this.build();
      this.list.index = idx;
      this.list.refresh();
      this.info.setText(ok ? 'Game saved.' : 'Could not save (browser storage unavailable).');
    } else if (s.data && loadFrom(s.slot)) {
      this.destroy();
      this.onLoaded?.();
    }
  }

  handle(c) { this.list.handle(c); }

  close() {
    this.destroy();
    this.onClose?.();
  }

  destroy() {
    this.list?.destroy();
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }
}

