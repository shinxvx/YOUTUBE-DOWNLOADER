// Card shop: packs with published odds, and single cards. In-game coins only.
import { VW, VH, rect, panel, text, textBlock, button, COLORS } from '../ui/core.js';
import { header } from '../ui/widgets.js';
import { CARDS, CARD_LIST, AFFINITIES, AFFINITY_INFO } from '../content/cards.js';
import { addCards } from '../game/state.js';
import { RewardScene } from './reward.js';
import { drawHandCard, HAND_W } from '../ui/cards.js';
import { portraitImg } from '../ui/assets.js';

export const PACK_ODDS = [['common', 0.7], ['uncommon', 0.25], ['rare', 0.05]];
const PACK_SIZE = 5;

export const PACKS = [
  { id: 'academy', name: 'Academy Pack', price: 120, pool: () => CARD_LIST, desc: 'Any affinity.' },
  ...AFFINITIES.map((a) => ({ id: a, name: `${AFFINITY_INFO[a].name} Pack`, price: 150, pool: () => CARD_LIST.filter((c) => c.affinity === a || c.affinity === 'neutral'), desc: `${AFFINITY_INFO[a].name} and neutral cards.` })),
];

const SINGLE_PRICE = { common: 40, uncommon: 90, rare: 220 };

function rollRarity(rand) {
  let r = rand();
  for (const [rar, p] of PACK_ODDS) {
    if (r < p) return rar;
    r -= p;
  }
  return 'common';
}

export function openPack(pack, rand = Math.random) {
  const pool = pack.pool().filter((c) => !c.legendary);
  const out = {};
  for (let i = 0; i < PACK_SIZE; i++) {
    const rar = i === PACK_SIZE - 1 && rand() < 0.5 ? 'uncommon' : rollRarity(rand);
    let cands = pool.filter((c) => c.rarity === rar);
    if (!cands.length) cands = pool.filter((c) => c.rarity === 'common');
    const c = cands[Math.floor(rand() * cands.length)];
    out[c.id] = (out[c.id] || 0) + 1;
  }
  return out;
}

// daily rotating singles
function singlesFor(day) {
  const list = CARD_LIST.filter((c) => !c.legendary);
  const out = [];
  let x = day * 7919;
  while (out.length < 4) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const c = list[x % list.length];
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

export class ShopScene {
  constructor() {
    this.tab = 'packs';
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    const game = g.game;
    rect(ctx, 0, 0, VW, VH, '#20161a');
    if (header(g, 'Card Shop', { right: `${game.coins} coins` }) && isTop) {
      g.pop();
      return;
    }
    const pt = portraitImg('nell', 'happy');
    if (pt) ctx.drawImage(pt, 8, 4, 48, 48, 8, 30, 48, 48);
    textBlock(ctx, '"Fair odds, posted right here. No real money, no tricks — only coins you earn on the island."', 62, 34, 240, { size: 7, color: COLORS.textDim });
    if (button(g, 'sh-tab-packs', 316, 30, 76, 16, 'Packs', { size: 7, selected: this.tab === 'packs' })) this.tab = 'packs';
    if (button(g, 'sh-tab-single', 396, 30, 76, 16, 'Single cards', { size: 7, selected: this.tab === 'single' })) this.tab = 'single';
    // odds table
    panel(ctx, 316, 50, 156, 66);
    text(ctx, 'Pack odds (per card)', 324, 56, { size: 7, color: COLORS.gold });
    PACK_ODDS.forEach(([r, p], i) => text(ctx, `${r[0].toUpperCase() + r.slice(1)}: ${Math.round(p * 100)}%`, 324, 68 + i * 10, { size: 7 }));
    text(ctx, 'Legendary: 0% (story only)', 324, 98, { size: 7, color: COLORS.textDim });
    text(ctx, '5 cards; last card has a 50% boost to Uncommon.', 8, VH - 12, { size: 7, color: COLORS.textDim });

    if (this.tab === 'packs') {
      PACKS.forEach((p, i) => {
        const x = 8 + (i % 4) * 76;
        const y = 84 + Math.floor(i / 4) * 104;
        const col = p.id === 'academy' ? '#3a3a6a' : AFFINITY_INFO[p.id].dark;
        panel(ctx, x, y, 72, 100, { fill: col });
        rect(ctx, x + 18, y + 10, 36, 46, p.id === 'academy' ? '#ffd65a' : AFFINITY_INFO[p.id].color);
        rect(ctx, x + 22, y + 14, 28, 6, '#ffffff');
        text(ctx, p.name.replace(' Pack', ''), x + 36, y + 60, { size: 7, align: 'center', bold: true });
        const can = game.coins >= p.price;
        if (isTop && button(g, `buy-${p.id}`, x + 6, y + 76, 60, 16, `${p.price} c`, { size: 7, disabled: !can, why: 'Not enough coins.', tooltip: p.desc })) {
          game.coins -= p.price;
          const cards = openPack(p);
          addCards(game, cards);
          g.audio.sfx('evolve');
          g.push(new RewardScene({ cards }, p.name));
          g.autosave();
        }
      });
    } else {
      singlesFor(game.day).forEach((c, i) => {
        const x = 20 + i * 76;
        const y = 90;
        drawHandCard(ctx, c.id, x, y, { t: g.time, count: game.collection[c.id] || 0 });
        text(ctx, c.name, x + HAND_W / 2, y + 76, { size: 7, align: 'center' });
        const price = SINGLE_PRICE[c.rarity] || 60;
        const can = game.coins >= price;
        if (isTop && button(g, `single-${c.id}`, x, y + 90, HAND_W, 16, `${price} c`, { size: 7, disabled: !can, why: 'Not enough coins.' })) {
          game.coins -= price;
          addCards(game, { [c.id]: 1 });
          g.audio.sfx('coin');
          g.toast(`Bought ${c.name}.`);
          g.autosave();
        }
      });
      text(ctx, 'Singles change every day.', 20, 220, { size: 7, color: COLORS.textDim });
    }
    void CARDS;
  }
}
