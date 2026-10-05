// Deck editor: three deck slots, filters, validation.
import { VW, VH, rect, panel, text, textBlock, button, COLORS } from '../ui/core.js';
import { header } from '../ui/widgets.js';
import { CARDS, CARD_LIST, AFFINITIES, AFFINITY_INFO } from '../content/cards.js';
import { validateDeck, DECK_SIZE } from '../engine/deck.js';
import { drawHandCard, drawZoomCard, HAND_W, HAND_H, ZOOM_W } from '../ui/cards.js';

export const FILTERS = {
  affinity: ['all', ...AFFINITIES, 'neutral'],
  type: ['all', 'creature', 'technique', 'relic', 'terrain'],
  cost: ['all', '0-1', '2', '3', '4+'],
  stage: ['all', '0', '1', '2'],
};
const LABEL = {
  all: 'All', creature: 'Creat.', technique: 'Tech.', relic: 'Relic', terrain: 'Terr.',
  '0-1': '0-1', 2: '2', 3: '3', '4+': '4+', 0: 'Basic', 1: 'S1', neutral: 'Neut.',
};

export function passFilters(c, f) {
  if (f.affinity !== 'all' && c.affinity !== f.affinity) return false;
  if (f.type !== 'all' && c.type !== f.type) return false;
  if (f.cost !== 'all') {
    if (f.cost === '0-1' && c.cost > 1) return false;
    if (f.cost === '4+' && c.cost < 4) return false;
    if (!['0-1', '4+'].includes(f.cost) && c.cost !== Number(f.cost)) return false;
  }
  if (f.stage !== 'all' && (c.type !== 'creature' || String(c.stage) !== f.stage)) return false;
  return true;
}

export function filterBar(g, f, x, y, prefix) {
  let yy = y;
  for (const key of Object.keys(FILTERS)) {
    let xx = x;
    for (const v of FILTERS[key]) {
      const label = key === 'affinity' && v !== 'all' && v !== 'neutral' ? AFFINITY_INFO[v].name.slice(0, 5) : LABEL[v] || v;
      const w = key === 'affinity' ? 34 : 38;
      const col = key === 'affinity' && AFFINITY_INFO[v] ? AFFINITY_INFO[v].dark : undefined;
      if (button(g, `${prefix}-${key}-${v}`, xx, yy, w - 2, 13, label, { size: 7, selected: f[key] === v, color: col, focusable: false })) f[key] = v;
      xx += w;
    }
    yy += 15;
  }
}

const sortCards = (a, b) => (a.type === b.type ? 0 : a.type === 'creature' ? -1 : b.type === 'creature' ? 1 : a.type < b.type ? -1 : 1) || a.cost - b.cost || a.name.localeCompare(b.name);

export class DeckEditorScene {
  constructor() {
    this.filters = { affinity: 'all', type: 'all', cost: 'all', stage: 'all' };
    this.page = 0;
    this.zoom = null;
    this.scroll = 0;
  }

  enter(g) {
    this.deckIdx = g.game.activeDeck;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    const game = g.game;
    rect(ctx, 0, 0, VW, VH, '#141a30');
    const deck = game.decks[this.deckIdx];
    const v = validateDeck(deck.cards, game.collection);
    if (header(g, 'Deck editor', { right: `Active: ${game.decks[game.activeDeck].name}` }) && isTop) {
      if (!this.zoom) {
        if (!validateDeck(game.decks[game.activeDeck].cards, game.collection).ok) g.toast('Your active deck is not legal: duels will use another legal deck.', COLORS.danger);
        g.pop();
        return;
      }
      this.zoom = null;
    }
    // deck tabs
    game.decks.forEach((d, i) => {
      if (button(g, `dk-tab${i}`, 8 + i * 74, 28, 70, 16, `${i === game.activeDeck ? '★ ' : ''}Deck ${i + 1}`, { size: 7, selected: this.deckIdx === i })) {
        this.deckIdx = i;
        this.scroll = 0;
      }
    });
    if (button(g, 'dk-active', 232, 28, 82, 16, game.activeDeck === this.deckIdx ? 'Active deck' : 'Use this deck', { size: 7, disabled: game.activeDeck === this.deckIdx || !v.ok, why: v.ok ? '' : 'Fix the deck first.' })) game.activeDeck = this.deckIdx;

    filterBar(g, this.filters, 8, 48, 'dkf');
    // collection grid (owned cards only)
    const owned = CARD_LIST.filter((c) => (game.collection[c.id] || 0) > 0 && passFilters(c, this.filters)).sort(sortCards);
    const cols = 5;
    const rows = 2;
    const per = cols * rows;
    const pages = Math.max(1, Math.ceil(owned.length / per));
    this.page = Math.min(this.page, pages - 1);
    const gx = 10;
    const gy = 112;
    let hovered = null;
    owned.slice(this.page * per, this.page * per + per).forEach((c, i) => {
      const x = gx + (i % cols) * (HAND_W + 6);
      const y = gy + Math.floor(i / cols) * (HAND_H + 16);
      const inDeck = deck.cards.filter((id) => id === c.id).length;
      const have = game.collection[c.id];
      const can = inDeck < Math.min(have, c.maxCopies) && deck.cards.length < DECK_SIZE;
      const st = g.input.hit(`dk-c-${c.id}`, x, y, HAND_W, HAND_H);
      drawHandCard(ctx, c.id, x, y - (st.active ? 2 : 0), { t: g.time, dim: !can, highlight: st.active ? '#ffffff' : null });
      text(ctx, `${inDeck}/${Math.min(have, c.maxCopies)}`, x + HAND_W / 2, y + HAND_H + 2, { align: 'center', size: 7, color: inDeck ? COLORS.gold : COLORS.textDim });
      if (st.active) hovered = c;
      if (isTop && g.input.pressed(`dk-c-${c.id}`)) {
        if (can) {
          deck.cards.push(c.id);
          g.audio.sfx('click');
        } else {
          g.audio.sfx('back');
          g.toast(deck.cards.length >= DECK_SIZE ? 'The deck already has 30 cards.' : inDeck >= c.maxCopies ? `At most ${c.maxCopies} copies of ${c.name}.` : `You own only ${have}.`, COLORS.danger);
        }
      }
      if (isTop && g.input.rightClicked(`dk-c-${c.id}`)) this.zoom = c.id;
    });
    if (!owned.length) text(ctx, 'No owned cards match these filters.', 20, 140, { color: COLORS.textDim });
    if (button(g, 'dk-prev', 10, 290, 50, 16, '< Prev', { size: 7, disabled: this.page === 0 })) this.page--;
    text(ctx, `Page ${this.page + 1}/${pages}`, 100, 294, { size: 7, align: 'center', color: COLORS.textDim });
    if (button(g, 'dk-next', 140, 290, 50, 16, 'Next >', { size: 7, disabled: this.page >= pages - 1 })) this.page++;
    text(ctx, 'Click: add · Right-click: zoom', 200, 294, { size: 7, color: COLORS.textDim });
    if (hovered) {
      rect(ctx, 8, 274, 300, 14, 'rgba(10,12,28,0.9)');
      text(ctx, `${hovered.name}: ${hovered.text}`.slice(0, 70), 12, 276, { size: 7 });
    }

    // deck list
    const lx = 318;
    panel(ctx, lx, 48, VW - lx - 4, 230);
    text(ctx, `${deck.name}`, lx + 8, 54, { size: 8, bold: true, color: COLORS.gold });
    text(ctx, `${deck.cards.length}/${DECK_SIZE}`, VW - 14, 54, { size: 8, align: 'right', color: deck.cards.length === DECK_SIZE ? COLORS.good : COLORS.danger });
    const counts = {};
    for (const id of deck.cards) counts[id] = (counts[id] || 0) + 1;
    const rowsList = Object.keys(counts).map((id) => CARDS[id]).sort(sortCards);
    const visible = 15;
    this.scroll = Math.max(0, Math.min(this.scroll + (g.input.mouse.x > lx ? g.input.wheel : 0), Math.max(0, rowsList.length - visible)));
    rowsList.slice(this.scroll, this.scroll + visible).forEach((c, i) => {
      const y = 68 + i * 13;
      const st = g.input.hit(`dk-r-${c.id}`, lx + 6, y, VW - lx - 16, 12);
      rect(ctx, lx + 6, y, VW - lx - 16, 12, st.active ? '#4a3a5a' : i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)');
      rect(ctx, lx + 8, y + 2, 8, 8, AFFINITY_INFO[c.affinity].color);
      text(ctx, String(c.cost), lx + 12, y + 2, { align: 'center', size: 7, bold: true, shadow: false, color: COLORS.ink });
      text(ctx, c.name, lx + 20, y + 2, { size: 7 });
      text(ctx, `x${counts[c.id]}`, VW - 16, y + 2, { size: 7, align: 'right', color: COLORS.gold });
      if (isTop && g.input.pressed(`dk-r-${c.id}`)) {
        deck.cards.splice(deck.cards.lastIndexOf(c.id), 1);
        g.audio.sfx('back');
      }
      if (isTop && g.input.rightClicked(`dk-r-${c.id}`)) this.zoom = c.id;
    });
    if (rowsList.length > visible) text(ctx, `scroll ${this.scroll + 1}-${Math.min(rowsList.length, this.scroll + visible)} of ${rowsList.length}`, lx + 8, 266, { size: 7, color: COLORS.textDim });
    // validation
    const vy = 282;
    if (v.ok) text(ctx, `✓ Legal deck · ${v.basics} basic creatures`, lx, vy, { size: 7, color: COLORS.good });
    else textBlock(ctx, v.problems[0], lx, vy, VW - lx - 6, { size: 7, color: COLORS.danger, lineHeight: 8, maxLines: 2 });
    if (button(g, 'dk-clear', lx, 300, 74, 16, this.confirmClear ? 'Sure?' : 'Clear', { size: 7, color: '#5a2a3a' })) {
      if (this.confirmClear) {
        deck.cards = [];
        this.confirmClear = false;
      } else this.confirmClear = true;
    }
    if (button(g, 'dk-copy', lx + 80, 300, 76, 16, 'Copy active', { size: 7, disabled: this.deckIdx === game.activeDeck })) deck.cards = [...game.decks[game.activeDeck].cards];

    if (this.zoom) {
      rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.75)');
      drawZoomCard(ctx, this.zoom, VW / 2 - ZOOM_W / 2, 40, { t: g.time });
      g.input.hit('dk-zoom', 0, 0, VW, VH);
      if (isTop && (g.input.pressed('dk-zoom') || g.input.rightClicked('dk-zoom'))) this.zoom = null;
    }
  }
}
