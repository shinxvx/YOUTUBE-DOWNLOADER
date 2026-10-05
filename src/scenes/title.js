// Title screen: new game, continue, load, settings, quit.
import { VW, VH, rect, text, button, COLORS, img } from '../ui/core.js';
import { image, creatureImg } from '../ui/assets.js';
import { listSaves, readSave } from '../save/save.js';
import { SettingsScene } from './settings.js';
import { SaveLoadScene } from './saveload.js';
import { NameScene } from './name.js';
import { MapScene } from './map.js';

export class TitleScene {
  constructor() {
    this.saves = null;
    this.t = 0;
  }

  enter(g) {
    g.game = null;
    g.audio.play('title');
    this.refresh();
  }

  resume() {
    this.refresh();
  }

  async refresh() {
    this.saves = await listSaves();
  }

  latestSlot() {
    if (!this.saves) return null;
    let best = null;
    for (const [slot, meta] of Object.entries(this.saves)) if (!best || (meta.savedAt || 0) > (this.saves[best].savedAt || 0)) best = slot;
    return best;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    this.t += dt;
    const bg = image('bg:title');
    if (bg) img(ctx, bg, 0, 0);
    // drifting partners
    ['cindlet', 'ripplet', 'mossbit'].forEach((id, i) => {
      const im = creatureImg(id);
      if (im) img(ctx, im, 300 + i * 52, 196 + Math.sin(this.t * 2 + i) * 3, { flip: true });
    });
    const y = 34 + Math.sin(this.t) * 2;
    text(ctx, 'EIDRA', VW / 2, y, { align: 'center', size: 44, bold: true, color: '#ffe9a0', shadowColor: '#3a1a4a' });
    text(ctx, 'NEXUS ACADEMY', VW / 2, y + 50, { align: 'center', size: 14, bold: true, color: '#e2b8ff', shadowColor: '#1a0a2a' });
    if (!isTop) return;
    const latest = this.latestSlot();
    const bx = 28;
    let by = 140;
    const W = 130;
    if (button(g, 'tt-continue', bx, by, W, 22, 'Continue', { disabled: !latest, why: 'No saved game yet.' })) this.load(g, latest);
    by += 28;
    if (button(g, 'tt-new', bx, by, W, 22, 'New Game')) g.push(new NameScene(!!(this.saves && this.saves.auto)));
    by += 28;
    if (button(g, 'tt-load', bx, by, W, 22, 'Load Game', { disabled: !latest, why: 'No saved game yet.' })) g.push(new SaveLoadScene('load'));
    by += 28;
    if (button(g, 'tt-settings', bx, by, W, 22, 'Settings')) g.push(new SettingsScene());
    by += 28;
    if (g.host && button(g, 'tt-quit', bx, by, W, 22, 'Quit')) g.host.quit();
    text(ctx, 'v0.1 · First playable · Art and music are provisional', VW - 6, VH - 12, { align: 'right', size: 7, color: COLORS.textDim });
  }

  async load(g, slot) {
    const r = await readSave(slot);
    if (!r) {
      g.toast('That save could not be read.', COLORS.danger);
      return;
    }
    if (r.fromBackup) g.toast('Save restored from backup.');
    g.game = r.game;
    g.reset(new MapScene());
  }
}
