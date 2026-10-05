// Background for story scenes (dialogue is drawn on top).
import { background } from '../ui/widgets.js';

export class StageScene {
  constructor(bg) {
    this.bg = bg;
  }

  frame(g) {
    background(g, this.bg, g.game ? g.game.period : null);
  }
}
