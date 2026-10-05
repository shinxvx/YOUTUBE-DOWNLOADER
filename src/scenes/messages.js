// Dormitory messages.
import { VW, VH, rect, panel, text, textBlock, COLORS } from '../ui/core.js';
import { header } from '../ui/widgets.js';

export class MessagesScene {
  frame(g, dt, isTop) {
    const { ctx } = g;
    const game = g.game;
    rect(ctx, 0, 0, VW, VH, '#1a1a28');
    if (header(g, 'Messages') && isTop) {
      for (const m of game.messages) m.read = true;
      g.pop();
      return;
    }
    if (!game.messages.length) text(ctx, 'No messages yet.', 20, 40, { color: COLORS.textDim });
    let y = 30;
    for (const m of game.messages.slice(0, 6)) {
      panel(ctx, 10, y, VW - 20, 44, { fill: m.read ? '#24304e' : '#34446a' });
      text(ctx, `${m.read ? '' : '● '}From: ${m.from} · Day ${m.day}`, 18, y + 7, { size: 7, color: COLORS.gold });
      textBlock(ctx, m.text, 18, y + 18, VW - 40, { size: 7, lineHeight: 9, maxLines: 2 });
      y += 48;
    }
  }
}
