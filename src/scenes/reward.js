// Reward screen: coins and new cards.
import { VW, VH, rect, panel, text, button, COLORS } from '../ui/core.js';
import { drawHandCard, HAND_W } from '../ui/cards.js';
import { CARDS } from '../content/cards.js';

export class RewardScene {
  constructor(reward, title = 'Rewards') {
    this.overlay = true;
    this.reward = reward;
    this.title = title;
    this.t = 0;
  }

  enter(g) {
    g.audio.sfx('coin');
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    this.t += dt;
    rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.7)');
    panel(ctx, 60, 50, 360, 210);
    text(ctx, this.title, VW / 2, 62, { align: 'center', size: 12, bold: true, color: COLORS.gold });
    let y = 84;
    if (this.reward.coins) {
      text(ctx, `+${this.reward.coins} coins`, VW / 2, y, { align: 'center', size: 10, color: COLORS.gold });
      y += 18;
    }
    const cards = Object.entries(this.reward.cards || {});
    const total = cards.length;
    cards.forEach(([id, n], i) => {
      const x = VW / 2 - (total * (HAND_W + 10)) / 2 + i * (HAND_W + 10) + 5;
      const appear = Math.min(1, Math.max(0, this.t * 3 - i * 0.6));
      ctx.globalAlpha = appear;
      drawHandCard(ctx, id, x, y + (1 - appear) * 10, { t: g.time, count: n > 1 ? n : undefined });
      text(ctx, CARDS[id].name, x + HAND_W / 2, y + 76, { align: 'center', size: 7 });
      ctx.globalAlpha = 1;
    });
    if (!total && !this.reward.coins) text(ctx, 'Nothing this time.', VW / 2, y, { align: 'center' });
    if (isTop && button(g, 'rw-ok', VW / 2 - 50, 228, 100, 22, 'OK')) g.pop();
  }
}
