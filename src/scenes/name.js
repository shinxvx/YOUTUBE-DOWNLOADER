// New game: type the protagonist's name.
import { VW, VH, rect, panel, text, button, COLORS } from '../ui/core.js';
import { background } from '../ui/widgets.js';
import { newGame } from '../game/state.js';
import { MapScene } from './map.js';

const ALLOWED = /^[a-zA-Z0-9 '\-]$/;

export class NameScene {
  constructor(overwritesAuto) {
    this.name = '';
    this.overwritesAuto = overwritesAuto;
  }

  enter(g) {
    g.input.textMode = true;
  }

  exit(g) {
    g.input.textMode = false;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    background(g, 'port');
    rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.5)');
    panel(ctx, 80, 60, 320, 190);
    text(ctx, 'Your scholarship letter reads:', VW / 2, 74, { align: 'center', size: 9, color: COLORS.textDim });
    text(ctx, '"Welcome to Nexus Academy, ..."', VW / 2, 90, { align: 'center', size: 10 });
    rect(ctx, 130, 112, 220, 26, COLORS.paper);
    const caret = Math.floor(g.time * 2) % 2 ? '_' : ' ';
    text(ctx, this.name + caret, 140, 117, { size: 12, color: COLORS.ink, shadow: false, bold: true });
    text(ctx, 'Type your name (up to 12 letters).', VW / 2, 146, { align: 'center', size: 8, color: COLORS.textDim });
    if (this.overwritesAuto) text(ctx, 'Starting a new game replaces the autosave. Manual saves are kept.', VW / 2, 160, { align: 'center', size: 7, color: COLORS.gold });
    if (!isTop) return;
    for (const k of g.input.keys) {
      if (k === 'Backspace') this.name = this.name.slice(0, -1);
      else if (k.length === 1 && ALLOWED.test(k) && this.name.length < 12) this.name += k;
    }
    g.input.keys = g.input.keys.filter((k) => k === 'Escape' || k === 'Enter');
    const ok = this.name.trim().length > 0;
    if (button(g, 'nm-ok', 250, 214, 120, 22, 'Begin', { disabled: !ok, why: 'Type a name first.' }) || (ok && g.input.key('Enter'))) {
      g.game = newGame(this.name.trim());
      g.reset(new MapScene());
    }
    if (button(g, 'nm-back', 110, 214, 120, 22, 'Back') || g.input.key('Escape')) g.pop();
  }
}
