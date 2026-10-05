// Partner selection: Cindlet, Ripplet or Mossbit.
import { VW, VH, rect, panel, text, textBlock, button, COLORS } from '../ui/core.js';
import { creatureImg } from '../ui/assets.js';
import { CARDS, AFFINITY_INFO } from '../content/cards.js';
import { LORE } from '../content/lore.js';
import { choosePartner, setFlag } from '../game/state.js';

const OPTIONS = [
  { id: 'cindlet', style: 'Aggressive: Burn and pressure.' },
  { id: 'ripplet', style: 'Control: healing and Stun.' },
  { id: 'mossbit', style: 'Endurance: Guard and fast evolution.' },
];

export class PartnerScene {
  constructor() {
    this.overlay = true;
    this.pick = null;
  }

  frame(g, dt, isTop) {
    const { ctx } = g;
    rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.55)');
    text(ctx, 'Choose your partner', VW / 2, 12, { align: 'center', size: 14, bold: true, color: COLORS.gold });
    OPTIONS.forEach((o, i) => {
      const c = CARDS[o.id];
      const a = AFFINITY_INFO[c.affinity];
      const x = 16 + i * 152;
      const y = 38;
      const sel = this.pick === o.id;
      const st = g.input.hit(`pt-${o.id}`, x, y, 144, 230);
      panel(ctx, x, y, 144, 230, { fill: sel ? '#3a4a2a' : st.active ? '#34446a' : COLORS.window });
      const bob = Math.sin(g.time * 3 + i) * 2;
      const im = creatureImg(o.id);
      rect(ctx, x + 22, y + 12, 100, 100, a.dark);
      if (im) ctx.drawImage(im, x + 24, y + 14 + bob, 96, 96);
      text(ctx, c.name, x + 72, y + 118, { align: 'center', size: 12, bold: true });
      text(ctx, a.name, x + 72, y + 134, { align: 'center', size: 8, color: a.light });
      textBlock(ctx, o.style, x + 10, y + 148, 124, { size: 7, color: COLORS.gold });
      textBlock(ctx, LORE[o.id].look, x + 10, y + 168, 124, { size: 7, color: COLORS.textDim, lineHeight: 9 });
      if (isTop && g.input.pressed(`pt-${o.id}`)) {
        this.pick = o.id;
        g.audio.sfx('select');
      }
    });
    if (!isTop) return;
    const label = this.pick ? `Bond with ${CARDS[this.pick].name}` : 'Pick a partner';
    if (button(g, 'pt-ok', VW / 2 - 80, 284, 160, 24, label, { disabled: !this.pick, bold: true, why: 'Click one of the three Eidra first.' })) {
      choosePartner(g.game, this.pick);
      setFlag(g.game, 'partner_chosen');
      g.audio.sfx('summon');
      g.pop(this.pick);
    }
  }
}
