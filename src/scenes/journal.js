// Journal: objectives, quests, friendships and duel record.
import { VW, VH, rect, panel, text, textBlock, COLORS } from '../ui/core.js';
import { header } from '../ui/widgets.js';
import { QUESTS } from '../content/story.js';
import { CHARACTERS, PERIODS } from '../content/world.js';
import { currentObjective } from '../game/events.js';
import { LICENSES } from '../game/state.js';
import { portraitImg } from '../ui/assets.js';

export class JournalScene {
  frame(g, dt, isTop) {
    const { ctx } = g;
    const game = g.game;
    rect(ctx, 0, 0, VW, VH, '#1a1a28');
    if (header(g, 'Journal') && isTop) {
      g.pop();
      return;
    }
    const obj = currentObjective(game);
    panel(ctx, 6, 28, 300, 48);
    text(ctx, 'Current objective', 14, 34, { size: 7, color: COLORS.gold });
    textBlock(ctx, obj.text + (obj.wait ? ` — ${obj.wait}` : ''), 14, 46, 284, { size: 8, lineHeight: 10, maxLines: 2 });
    panel(ctx, 6, 80, 300, 234);
    text(ctx, 'Quests', 14, 86, { size: 8, bold: true, color: COLORS.gold });
    let y = 100;
    const entries = Object.entries(game.quests).filter(([id]) => QUESTS[id]);
    entries.sort((a, b) => (a[1] === b[1] ? 0 : a[1] === 'active' ? -1 : 1));
    for (const [id, st] of entries) {
      const q = QUESTS[id];
      text(ctx, `${st === 'done' ? '✓' : '•'} ${q.title}${q.main ? '' : ' (side)'}`, 14, y, { size: 8, color: st === 'done' ? COLORS.textDim : COLORS.text });
      y += 11;
      if (st !== 'done') y += textBlock(ctx, q.text, 24, y, 274, { size: 7, color: COLORS.textDim, lineHeight: 9 });
      y += 3;
      if (y > 300) break;
    }
    panel(ctx, 312, 28, 162, 80);
    text(ctx, game.name, 320, 34, { size: 9, bold: true, color: COLORS.gold });
    text(ctx, `License: ${LICENSES[game.license]}`, 320, 48, { size: 7 });
    text(ctx, `Day ${game.day} · ${PERIODS[game.period]} · Act ${game.chapter}`, 320, 60, { size: 7 });
    text(ctx, `Duels: ${game.stats.wins}W ${game.stats.losses}L ${game.stats.draws}D`, 320, 72, { size: 7 });
    const h = Math.floor(game.playtime / 3600);
    const m = Math.floor((game.playtime % 3600) / 60);
    text(ctx, `Play time: ${h}h${String(m).padStart(2, '0')}`, 320, 84, { size: 7 });
    panel(ctx, 312, 112, 162, 202);
    text(ctx, 'Bonds', 320, 118, { size: 8, bold: true, color: COLORS.gold });
    let by = 132;
    for (const [who, v] of Object.entries(game.friendship)) {
      if (!CHARACTERS[who]) continue;
      const pt = portraitImg(who);
      if (pt) ctx.drawImage(pt, 12, 6, 40, 40, 320, by, 18, 18);
      text(ctx, CHARACTERS[who].name, 342, by + 1, { size: 7 });
      for (let i = 0; i < 5; i++) rect(ctx, 342 + i * 9, by + 11, 7, 5, i < v ? '#ff7aa8' : '#3a3050');
      by += 22;
      if (by > 296) break;
    }
    if (!Object.keys(game.friendship).length) textBlock(ctx, 'Spend time with people around the island to grow your bonds.', 320, 134, 146, { size: 7, color: COLORS.textDim });
  }
}
