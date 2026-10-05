import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { manifest } from '../gfx/assets.js';
import { fitCamera } from '../systems/display.js';
import { Controls } from '../systems/input.js';
import { text } from '../ui/widgets.js';

// Asset gallery: original walking atlases (logical 48x48, shown at world zoom) and the
// prepared battle sheets, each cycling its manifest animations.
export class GalleryScene extends Phaser.Scene {
  constructor() { super('Gallery'); }

  create() {
    fitCamera(this);
    this.controls = new Controls(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0d1020).setOrigin(0);
    this.page = 0;
    this.objs = [];
    this.pages = [
      { title: 'Exploration — original atlases (48×48 logical footprint, 2× world zoom)', kind: 'overworld' },
      { title: 'Combat — prepared hero sheets (128×128 cells)', kind: 'battle' },
      { title: 'Combat — prepared enemy sheets', kind: 'enemy' },
    ];
    this.help = text(this, GAME_W / 2, GAME_H - 22, '◂ ▸ change page · Z cycle animation · X back to title', { size: 14, color: '#a79f8c', origin: 0.5 });
    this.anim = 0;
    this.build();
  }

  build() {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    const pg = this.pages[this.page];
    this.objs.push(text(this, 30, 20, pg.title, { size: 22, title: true, color: '#f0d79a' }));
    const list = manifest().sprites.filter(s => s.kind === pg.kind);
    const big = pg.kind !== 'overworld';
    const cols = big ? 6 : 10;
    const cw = (GAME_W - 60) / cols, ch = big ? 300 : 150;
    this.sprites = [];
    list.forEach((a, i) => {
      const cx = 30 + cw * (i % cols) + cw / 2;
      const cy = 80 + Math.floor(i / cols) * ch + (big ? 230 : 110);
      const g = this.add.graphics();
      g.fillStyle(0x161a30, 1).fillRect(cx - cw / 2 + 4, cy - (big ? 220 : 100), cw - 8, ch - 12);
      this.objs.push(g);
      const sp = this.add.sprite(cx, cy, a.id, 0).setOrigin(a.gen.originX, a.gen.originY);
      if (a.loadMethod === 'atlas') sp.setScale(a.runtimeScale * 2);
      else sp.setScale(big ? 1.5 : 1);
      this.sprites.push({ sp, a });
      this.objs.push(sp);
      this.objs.push(text(this, cx, cy + 6, a.id.replace(/_(overworld|battle|enemy)$/, ''), { size: 12, color: '#a79f8c', origin: [0.5, 0] }));
    });
    this.playAll();
  }

  playAll() {
    for (const { sp, a } of this.sprites) {
      const names = Object.keys(a.animations).filter(n => a.loadMethod === 'atlas' ? n.startsWith('walk') : true);
      const name = names[this.anim % names.length];
      const key = `${a.id}:${name}`;
      sp.play({ key, repeat: -1 });
    }
  }

  update() {
    const c = this.controls;
    if (c.pressed('right')) { this.page = (this.page + 1) % this.pages.length; this.build(); }
    else if (c.pressed('left')) { this.page = (this.page + this.pages.length - 1) % this.pages.length; this.build(); }
    else if (c.pressed('confirm')) { this.anim++; this.playAll(); }
    else if (c.pressed('cancel') || c.pressed('menu')) this.scene.start('Title');
  }
}
