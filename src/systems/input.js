import Phaser from 'phaser';
import { settings } from './settings.js';

const REPEATABLE = new Set(['up', 'down', 'left', 'right']);

// Action-based input. Presses are buffered from keydown events, so a tap that goes
// down and up within a single frame is never lost; held state comes from Key objects.
// Key remapping only touches settings.keys.
export class Controls {
  constructor(scene) {
    this.scene = scene;
    this.kb = scene.input.keyboard;
    this.keys = {};
    this.codes = new Map();
    this.buffer = new Set();
    this.onKey = (e) => {
      const action = this.codes.get(e.keyCode);
      if (!action) return;
      if (e.repeat && !REPEATABLE.has(action)) return;
      this.buffer.add(action);
    };
    this.kb.on('keydown', this.onKey);
    scene.events.on('postupdate', () => this.buffer.clear());
    scene.events.once('shutdown', () => this.kb.off('keydown', this.onKey));
    this.rebuild();
  }

  rebuild() {
    for (const list of Object.values(this.keys)) for (const k of list) this.kb.removeKey(k);
    this.keys = {};
    this.codes.clear();
    for (const [action, names] of Object.entries(settings.keys)) {
      this.keys[action] = names.map(n => this.kb.addKey(n, true, false));
      for (const n of names) {
        const code = Phaser.Input.Keyboard.KeyCodes[n];
        if (code !== undefined && !this.codes.has(code)) this.codes.set(code, action);
      }
    }
    this.buffer.clear();
  }

  down(action) {
    return (this.keys[action] || []).some(k => k.isDown);
  }

  pressed(action) {
    if (!this.buffer.has(action)) return false;
    this.buffer.delete(action);
    return true;
  }

  axis() {
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    return { x, y };
  }
}

export function keyNameFor(action) {
  const k = settings.keys[action]?.[0] ?? '?';
  return k === 'ENTER' ? 'Enter' : k === 'ESC' ? 'Esc' : k === 'SPACE' ? 'Space' : k;
}
