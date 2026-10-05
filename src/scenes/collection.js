// Collection (all cards, owned or not) and the Eidra encyclopedia with lineages.
import { VW, VH, rect, panel, text, textBlock, button, COLORS } from '../ui/core.js';
import { header } from '../ui/widgets.js';
import { creatureImg } from '../ui/assets.js';
import { CARDS, CARD_LIST, AFFINITY_INFO } from '../content/cards.js';
import { LORE } from '../content/lore.js';
import { drawHandCard, drawZoomCard, HAND_W, HAND_H, ZOOM_W, typeLine } from '../ui/cards.js';
import { filterBar, passFilters } from './deckeditor.js';

const CREATURES = CARD_LIST.filter((c) => c.type === 'creature');

function lineageOf(id) {
  const c = CARDS[id];
  return CREATURES.filter((x) => x.line === c.line).sort((a, b) => a.stage - b.stage);
}

export class CollectionScene {
  constructor(mode = 'cards') {
    this.mode = mode;
    this.filters = { affinity: 'all', type: 'all', cost: 'all', stage: 'all' };
    this.page = 0;
    this.sel = 'cindlet';
    this.zoom = null;
    this.listScroll = 0;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    const game = g.game;
    rect(ctx, 0, 0, VW, VH, '#141a30');
    const ownedKinds = CARD_LIST.filter((c) => game.collection[c.id]).length;
    const reg = CREATURES.filter((c) => game.registered[c.id]).length;
    if (header(g, this.mode === 'cards' ? 'Collection' : 'Eidra encyclopedia', { right: this.mode === 'cards' ? `${ownedKinds}/${CARD_LIST.length} cards` : `${reg}/${CREATURES.length} registered` }) && isTop) {
      if (this.zoom) this.zoom = null;
      else g.pop();
      return;
    }
    if (button(g, 'col-tab-cards', 8, 28, 80, 16, 'Cards', { size: 7, selected: this.mode === 'cards' })) this.mode = 'cards';
    if (button(g, 'col-tab-ency', 92, 28, 80, 16, 'Encyclopedia', { size: 7, selected: this.mode === 'ency' })) this.mode = 'ency';
    if (this.mode === 'cards') this.drawCards(g, isTop);
    else this.drawEncy(g, isTop);
  }

  drawCards(g, isTop) {
    const { ctx } = g;
    const game = g.game;
    filterBar(g, this.filters, 8, 48, 'colf');
    const list = CARD_LIST.filter((c) => passFilters(c, this.filters));
    const cols = 8;
    const per = cols * 2;
    const pages = Math.max(1, Math.ceil(list.length / per));
    this.page = Math.min(this.page, pages - 1);
    list.slice(this.page * per, this.page * per + per).forEach((c, i) => {
      const x = 10 + (i % cols) * (HAND_W + 6);
      const y = 112 + Math.floor(i / cols) * (HAND_H + 14);
      const n = game.collection[c.id] || 0;
      const st = g.input.hit(`col-${c.id}`, x, y, HAND_W, HAND_H);
      if (n) drawHandCard(ctx, c.id, x, y, { t: g.time, count: n, highlight: st.active ? '#ffffff' : null });
      else {
        rect(ctx, x, y, HAND_W, HAND_H, '#20263a');
        rect(ctx, x + 2, y + 2, HAND_W - 4, HAND_H - 4, '#2a3048');
        text(ctx, '?', x + HAND_W / 2, y + 26, { align: 'center', size: 16, color: '#4a5070' });
        text(ctx, c.legendary ? 'Legend' : c.rarity, x + HAND_W / 2, y + 56, { align: 'center', size: 7, color: '#6a7090' });
      }
      if (isTop && n && g.input.pressed(`col-${c.id}`)) this.zoom = c.id;
    });
    if (button(g, 'col-prev', 10, 296, 50, 16, '< Prev', { size: 7, disabled: this.page === 0 })) this.page--;
    text(ctx, `Page ${this.page + 1}/${pages}`, 100, 300, { size: 7, align: 'center', color: COLORS.textDim });
    if (button(g, 'col-next', 140, 296, 50, 16, 'Next >', { size: 7, disabled: this.page >= pages - 1 })) this.page++;
    text(ctx, 'Legendary Eidra are never sold.', 200, 300, { size: 7, color: COLORS.textDim });
    if (this.zoom) {
      rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.75)');
      drawZoomCard(ctx, this.zoom, VW / 2 - ZOOM_W / 2, 40, { t: g.time });
      g.input.hit('col-zoom', 0, 0, VW, VH);
      if (isTop && g.input.pressed('col-zoom')) this.zoom = null;
    }
  }

  drawEncy(g, isTop) {
    const { ctx } = g;
    const game = g.game;
    // list
    panel(ctx, 6, 48, 130, 266);
    const visible = 19;
    this.listScroll = Math.max(0, Math.min(this.listScroll + (g.input.mouse.x < 140 ? g.input.wheel : 0), CREATURES.length - visible));
    CREATURES.slice(this.listScroll, this.listScroll + visible).forEach((c, i) => {
      const y = 54 + i * 13;
      const known = !!game.registered[c.id];
      const st = g.input.hit(`enc-${c.id}`, 10, y, 122, 12);
      rect(ctx, 10, y, 122, 12, this.sel === c.id ? '#5a4a2a' : st.active ? '#34446a' : 'transparent');
      text(ctx, `${String(CREATURES.indexOf(c) + 1).padStart(2, '0')} ${known ? c.name : '?????'}`, 14, y + 2, { size: 7, color: known ? COLORS.text : COLORS.textDim });
      if (isTop && g.input.pressed(`enc-${c.id}`)) this.sel = c.id;
    });
    // detail
    const c = CARDS[this.sel];
    const known = !!game.registered[c.id];
    const a = AFFINITY_INFO[c.affinity];
    panel(ctx, 142, 48, VW - 148, 266);
    rect(ctx, 152, 58, 100, 100, a.dark);
    const im = creatureImg(c.id);
    if (im) {
      if (known) ctx.drawImage(im, 154, 60, 96, 96);
      else {
        ctx.globalAlpha = 0.9;
        ctx.filter = 'brightness(0)';
        ctx.drawImage(im, 154, 60, 96, 96);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
    }
    text(ctx, known ? c.name : '?????', 262, 60, { size: 12, bold: true, color: COLORS.gold });
    text(ctx, typeLine(c), 262, 78, { size: 8, color: a.light });
    if (known) {
      text(ctx, `Cost ${c.cost} · ATK ${c.atk} · HP ${c.hp}`, 262, 92, { size: 8 });
      textBlock(ctx, `Ability: ${c.text}`, 262, 106, VW - 276, { size: 7, lineHeight: 9, maxLines: 5 });
      const L = LORE[c.id];
      let y = 166;
      for (const [k, v] of [['Appearance', L.look], ['Personality', L.personality], ['Habitat', L.habitat], ['Notes', L.desc]]) {
        text(ctx, k, 152, y, { size: 7, color: COLORS.gold });
        y += textBlock(ctx, v, 214, y, VW - 226, { size: 7, lineHeight: 9 }) + 3;
      }
    } else {
      textBlock(ctx, c.legendary ? 'A legendary Eidra. Its signature has never been recorded at the academy.' : 'Not registered yet. Obtain its card to record its signature.', 262, 96, VW - 276, { size: 8, color: COLORS.textDim });
    }
    // lineage strip
    const line = lineageOf(c.id);
    if (line.length > 1) {
      text(ctx, 'Lineage', 152, 268, { size: 7, color: COLORS.gold });
      line.forEach((x, i) => {
        const lx = 200 + i * 86;
        const kn = !!game.registered[x.id];
        const st = g.input.hit(`lin-${x.id}`, lx, 262, 70, 44);
        rect(ctx, lx, 262, 70, 44, x.id === c.id ? '#4a3a2a' : st.active ? '#34446a' : 'rgba(255,255,255,0.06)');
        const xi = creatureImg(x.id);
        if (xi) {
          if (!kn) ctx.filter = 'brightness(0)';
          ctx.drawImage(xi, lx + 2, 263, 32, 32);
          ctx.filter = 'none';
        }
        text(ctx, kn ? x.name : '???', lx + 36, 270, { size: 7 });
        text(ctx, ['Basic', 'Stage 1', 'Stage 2'][x.stage], lx + 36, 282, { size: 7, color: COLORS.textDim });
        if (i < line.length - 1) text(ctx, '→', lx + 76, 276, { size: 8, color: COLORS.gold });
        if (isTop && g.input.pressed(`lin-${x.id}`)) this.sel = x.id;
      });
    }
    void HAND_H;
  }
}
