// Save / load slots (autosave + 3 manual slots).
import { VW, VH, rect, panel, text, button, COLORS } from '../ui/core.js';
import { header } from '../ui/widgets.js';
import { listSaves, readSave, writeSave, deleteSave, SLOTS } from '../save/save.js';
import { PERIODS } from '../content/world.js';
import { LICENSES } from '../game/state.js';

export class SaveLoadScene {
  constructor(mode) {
    this.mode = mode; // 'save' | 'load'
    this.saves = {};
    this.confirm = null;
  }

  enter() {
    this.refresh();
  }

  async refresh() {
    this.saves = await listSaves();
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    rect(ctx, 0, 0, VW, VH, '#141a30');
    if (header(g, this.mode === 'save' ? 'Save game' : 'Load game') && isTop) {
      g.pop();
      return;
    }
    SLOTS.forEach((slot, i) => {
      const y = 36 + i * 64;
      const meta = this.saves[slot];
      panel(ctx, 30, y, 420, 58);
      text(ctx, slot === 'auto' ? 'Autosave' : `Slot ${i}`, 44, y + 10, { size: 9, bold: true, color: COLORS.gold });
      if (meta) {
        text(ctx, `${meta.name} · Day ${meta.day} ${PERIODS[meta.period] || ''} · Act ${meta.chapter} · ${LICENSES[meta.license] || ''}`, 44, y + 24, { size: 8 });
        const h = Math.floor((meta.playtime || 0) / 3600);
        const m = Math.floor(((meta.playtime || 0) % 3600) / 60);
        text(ctx, `Play time ${h}h${String(m).padStart(2, '0')} · saved ${new Date(meta.savedAt || 0).toLocaleString()}`, 44, y + 38, { size: 7, color: COLORS.textDim });
      } else text(ctx, 'Empty', 44, y + 26, { size: 8, color: COLORS.textDim });
      if (!isTop) return;
      if (this.mode === 'save' && slot !== 'auto') {
        const label = this.confirm === slot ? 'Overwrite?' : 'Save here';
        if (button(g, `sv-${slot}`, 350, y + 10, 90, 18, label)) {
          if (meta && this.confirm !== slot) this.confirm = slot;
          else this.save(g, slot);
        }
      }
      if (this.mode === 'load' && meta) {
        if (button(g, `ld-${slot}`, 350, y + 10, 90, 18, 'Load')) this.load(g, slot);
        if (slot !== 'auto' && button(g, `del-${slot}`, 350, y + 32, 90, 16, this.confirm === `del${slot}` ? 'Really delete?' : 'Delete', { size: 7, color: '#5a2a3a' })) {
          if (this.confirm === `del${slot}`) {
            deleteSave(slot).then(() => this.refresh());
            this.confirm = null;
          } else this.confirm = `del${slot}`;
        }
      }
    });
  }

  async save(g, slot) {
    try {
      await writeSave(slot, g.game);
      g.toast('Game saved.');
      g.audio.sfx('coin');
    } catch (e) {
      console.error(e);
      g.toast('Could not save!', COLORS.danger);
    }
    this.confirm = null;
    this.refresh();
  }

  async load(g, slot) {
    const r = await readSave(slot);
    if (!r) {
      g.toast('That save could not be read.', COLORS.danger);
      return;
    }
    if (r.fromBackup) g.toast('Save restored from backup.');
    g.game = r.game;
    const { MapScene } = await import('./map.js');
    g.reset(new MapScene());
  }
}
