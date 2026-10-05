// Island map: pick a destination. Moving is free; activities cost time.
import { VW, VH, rect, panel, text, textBlock, button, COLORS, img } from '../ui/core.js';
import { image, portraitImg } from '../ui/assets.js';
import { LOCATIONS, PERIODS, CHARACTERS } from '../content/world.js';
import { hasFlag, LICENSES } from '../game/state.js';
import { autoEvent, currentObjective, hasEventMarker } from '../game/events.js';
import { peopleAt } from '../game/people.js';
import { runEvent } from '../game/script.js';
import { LocationScene } from './location.js';
import { DeckEditorScene } from './deckeditor.js';
import { CollectionScene } from './collection.js';
import { JournalScene } from './journal.js';
import { SettingsScene } from './settings.js';
import { periodTint } from '../ui/widgets.js';

export const MAP_POINTS = {
  dorm: [136, 200], plaza: [224, 168], classroom: [280, 128], arena: [328, 184], shop: [184, 132], lab: [352, 112],
  garden: [120, 128], library: [244, 100], port: [276, 256], lighthouse: [416, 72], reserve: [80, 80], core: [224, 216],
};

export function locationOpen(game, id) {
  const L = LOCATIONS[id];
  return hasFlag(game, L.unlock);
}

export class MapScene {
  constructor() {
    this.busy = false;
    this.hover = null;
    this.confirmTitle = false;
  }

  enter(g) {
    g.audio.play(g.game.period === 2 ? 'night' : 'day');
    this.checkAuto(g);
  }

  resume(g) {
    if (!this.busy) g.audio.play(g.game.period === 2 ? 'night' : 'day');
    this.checkAuto(g);
  }

  async checkAuto(g) {
    if (this.busy) return;
    const ev = autoEvent(g.game);
    if (!ev) return;
    this.busy = true;
    await runEvent(g, ev, ev.at);
    this.busy = false;
    await g.autosave();
    g.audio.play(g.game.period === 2 ? 'night' : 'day');
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    const game = g.game;
    const silenced = hasFlag(game, 'island_silenced');
    const m = image(silenced ? 'map:silenced' : 'map');
    if (m) img(ctx, m, 0, 0);
    periodTint(ctx, game.period);
    if (!isTop || this.busy) return;
    const obj = currentObjective(game);
    this.hover = null;
    for (const [id, [x, y]] of Object.entries(MAP_POINTS)) {
      const L = LOCATIONS[id];
      const open = locationOpen(game, id);
      if (L.hidden && !open) continue;
      const st = g.input.hit(`loc-${id}`, x - 14, y - 14, 28, 28, { disabled: !open });
      const marker = open ? hasEventMarker(game, id) : null;
      const isObj = obj.at === id;
      // pin
      const r = st.active ? 9 : 7;
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(x, y, r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = !open ? '#5a5a6a' : isObj ? COLORS.gold : '#f4ecd8';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (marker) {
        const bob = Math.sin(g.time * 5) * 2;
        rect(ctx, x + 6, y - 20 + bob, 9, 12, COLORS.ink);
        rect(ctx, x + 7, y - 19 + bob, 7, 10, marker === 'main' ? '#e8503c' : '#3b8fe0');
        text(ctx, '!', x + 10.5, y - 19 + bob, { align: 'center', size: 8, bold: true, shadow: false });
      }
      if (!open) text(ctx, '×', x, y - 5, { align: 'center', size: 9, color: '#2a2a3a', shadow: false });
      if (st.active) this.hover = id;
      if (g.input.pressed(`loc-${id}`)) {
        g.audio.sfx('select');
        g.push(new LocationScene(id));
      }
    }
    this.drawHud(g, obj);
    if (this.hover) this.drawInfo(g, this.hover);
  }

  drawHud(g, obj) {
    const { ctx } = g;
    const game = g.game;
    panel(ctx, 4, 4, 196, 44);
    text(ctx, `Day ${game.day} · ${PERIODS[game.period]}`, 12, 10, { size: 10, bold: true, color: COLORS.gold });
    text(ctx, `${game.name} · ${LICENSES[game.license]}`, 12, 26, { size: 7, color: COLORS.textDim });
    text(ctx, `${game.coins} coins`, 192, 26, { size: 7, align: 'right', color: COLORS.gold });
    panel(ctx, 4, VH - 46, 300, 42);
    text(ctx, 'Objective', 12, VH - 40, { size: 7, color: COLORS.gold });
    textBlock(ctx, obj.text + (obj.wait ? ` (${obj.wait})` : ''), 12, VH - 30, 284, { size: 7, lineHeight: 9, maxLines: 2 });
    // menu
    const bx = VW - 92;
    let by = 6;
    const B = (id, label) => {
      const r = button(g, id, bx, by, 86, 18, label, { size: 7 });
      by += 21;
      return r;
    };
    if (B('m-deck', 'Decks')) g.push(new DeckEditorScene());
    if (B('m-coll', 'Collection')) g.push(new CollectionScene());
    if (B('m-journal', 'Journal')) g.push(new JournalScene());
    if (B('m-settings', 'Settings')) g.push(new SettingsScene());
    if (B('m-title', this.confirmTitle ? 'Sure? (autosaved)' : 'Title screen')) {
      if (this.confirmTitle) {
        g.autosave().then(async () => {
          const { TitleScene } = await import('./title.js');
          g.reset(new TitleScene());
        });
      } else this.confirmTitle = true;
    }
  }

  drawInfo(g, id) {
    const { ctx } = g;
    const game = g.game;
    const L = LOCATIONS[id];
    const open = locationOpen(game, id);
    const [px, py] = MAP_POINTS[id];
    const w = 170;
    const people = open ? peopleAt(game, id) : [];
    const h = 46 + (people.length ? 30 : 0);
    let x = px + 16;
    let y = py - 20;
    if (x + w > VW - 96) x = px - w - 16;
    if (y + h > VH - 50) y = VH - 50 - h;
    if (y < 52) y = 52;
    panel(ctx, x, y, w, h);
    text(ctx, L.name, x + 8, y + 7, { size: 9, bold: true, color: COLORS.gold });
    textBlock(ctx, open ? L.desc : 'Not accessible yet.', x + 8, y + 21, w - 16, { size: 7, lineHeight: 9, maxLines: 2 });
    people.forEach((p, i) => {
      const pt = portraitImg(p);
      if (pt) ctx.drawImage(pt, 12, 6, 40, 40, x + 8 + i * 28, y + h - 30, 24, 24);
    });
    void CHARACTERS;
  }
}
