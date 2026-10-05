import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { SPEAKERS } from '../data/characters.js';
import { settings, TEXT_SPEEDS } from '../systems/settings.js';
import { state } from '../systems/state.js';
import { panel, text, MenuList } from './widgets.js';

// Portrait dialogue box used by exploration (via UIScene) and battles.
export class DialogueBox {
  constructor(scene, depth = 1000) {
    this.scene = scene;
    this.depth = depth;
    this.root = scene.add.container(0, 0).setDepth(depth).setVisible(false);
    const bx = 40, by = GAME_H - 196, bw = GAME_W - 80, bh = 176;
    this.box = { bx, by, bw, bh };
    this.bg = panel(scene, bx, by, bw, bh, { alpha: 0.95 });
    this.portraitFrame = scene.add.graphics();
    this.portrait = scene.add.image(bx + 24 + 72, by + 16 + 72, '__DEFAULT').setDisplaySize(144, 144);
    this.markOverlay = scene.add.image(this.portrait.x, this.portrait.y, '__DEFAULT').setDisplaySize(144, 144).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.namePlate = scene.add.graphics();
    this.nameText = text(scene, 0, by - 16, '', { size: 20, title: true, bold: true, color: '#f0d79a' }).setOrigin(0, 0.5);
    this.body = text(scene, 0, by + 26, '', { size: 21, wrap: 900, lineSpacing: 8 });
    this.arrow = text(scene, bx + bw - 34, by + bh - 34, '▼', { size: 16, color: '#f0d79a' });
    this.root.add([this.bg, this.portraitFrame, this.portrait, this.markOverlay, this.namePlate, this.nameText, this.body, this.arrow]);
    scene.tweens.add({ targets: this.arrow, y: this.arrow.y + 5, duration: 450, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: this.markOverlay, alpha: { from: 0.55, to: 1 }, duration: 900, yoyo: true, repeat: -1 });

    this.hit = scene.add.zone(0, 0, GAME_W, GAME_H).setOrigin(0).setInteractive().setDepth(depth - 1);
    this.hit.on('pointerdown', () => { if (this.active && !this.choice) this.advance(); });
    this.hit.disableInteractive();
    this.active = false;
    this.choice = null;
  }

  layout(hasPortrait) {
    const { bx, by } = this.box;
    const textX = hasPortrait ? bx + 190 : bx + 40;
    this.body.setX(textX);
    this.body.setWordWrapWidth(hasPortrait ? 960 : 1120, true);
    this.portrait.setVisible(hasPortrait);
    this.portraitFrame.clear();
    if (hasPortrait) {
      this.portraitFrame.fillStyle(0x05060c, 1).fillRect(bx + 20, by + 12, 152, 152);
      this.portraitFrame.lineStyle(2, 0xc9a45c, 1).strokeRect(bx + 20, by + 12, 152, 152);
    }
    return textX;
  }

  setSpeaker(id, opts = {}) {
    const sp = SPEAKERS[id] || SPEAKERS.narrator;
    const name = opts.name ?? sp.name;
    const portraitKey = opts.portrait ?? sp.portrait;
    const hasPortrait = !!portraitKey && this.scene.textures.exists(`portrait:${portraitKey}`);
    const textX = this.layout(hasPortrait);
    if (hasPortrait) {
      this.portrait.setTexture(`portrait:${portraitKey}`).setDisplaySize(144, 144);
      this.portrait.setFlipX(!!opts.flip);
    }
    const showMark = hasPortrait && portraitKey === 'kai' && state.sealStage >= 1 && state.sealStage <= 3;
    this.markOverlay.setVisible(showMark);
    if (showMark) this.markOverlay.setTexture(`mark_overlay_${state.sealStage}`).setDisplaySize(144, 144);
    this.namePlate.clear();
    this.nameText.setText(name || '');
    if (name) {
      const w = this.nameText.width + 36;
      this.nameText.setX(textX + 18);
      this.namePlate.fillStyle(0x0c0f1e, 0.98).fillRect(textX, this.box.by - 32, w, 32);
      this.namePlate.lineStyle(2, 0xc9a45c, 1).strokeRect(textX, this.box.by - 32, w, 32);
    }
    const italic = !name;
    this.body.setFontStyle(italic ? 'italic' : 'normal');
    this.body.setColor(id === 'voice' ? '#d9b8ff' : '#efe6d2');
  }

  open() {
    this.root.setVisible(true);
    this.hit.setInteractive();
    this.active = true;
  }

  close() {
    this.root.setVisible(false);
    this.hit.disableInteractive();
    this.active = false;
    this.clearChoice();
  }

  say(speaker, str, opts = {}) {
    this.open();
    this.setSpeaker(speaker, opts);
    this.full = str;
    this.shown = 0;
    this.body.setText('');
    this.arrow.setVisible(false);
    const cps = TEXT_SPEEDS[settings.textSpeed] ?? 45;
    this.cps = cps;
    this.acc = 0;
    if (!cps) this.finishTyping();
    return new Promise(res => { this.resolve = res; });
  }

  finishTyping() {
    this.shown = this.full.length;
    this.body.setText(this.full);
    this.arrow.setVisible(!this.choice);
  }

  advance() {
    if (!this.active) return;
    if (this.shown < this.full.length) { this.finishTyping(); return; }
    this.scene.game.events.emit('sfx', 'blip');
    const r = this.resolve;
    this.resolve = null;
    r?.();
  }

  async choose(speaker, str, options, opts = {}) {
    this.choice = true;
    await new Promise(res => {
      this.say(speaker, str, opts);
      this.resolve = res;
      // Resolve immediately once typing finishes; choice list handles input.
      this.afterType = res;
    });
    return new Promise(res => {
      const w = 420, h = options.length * 40 + 30;
      const x = GAME_W - w - 60, y = this.box.by - h - 44;
      this.choiceBg = panel(this.scene, x, y, w, h).setDepth(this.depth + 2);
      this.choiceList = new MenuList(this.scene, x + 14, y + 16, options.map(o => ({ label: o })), {
        width: w - 40, lineH: 40, depth: this.depth + 3,
        onSelect: (_, i) => { this.clearChoice(); res(i); },
      });
    });
  }

  clearChoice() {
    this.choice = null;
    this.choiceBg?.destroy();
    this.choiceList?.destroy();
    this.choiceBg = null;
    this.choiceList = null;
  }

  update(controls, delta) {
    if (!this.active) return;
    if (this.shown < this.full.length) {
      this.acc += (delta / 1000) * this.cps;
      const n = Math.floor(this.acc);
      if (n > 0) {
        this.acc -= n;
        const prev = this.shown;
        this.shown = Math.min(this.full.length, this.shown + n);
        this.body.setText(this.full.slice(0, this.shown));
        if (Math.floor(prev / 3) !== Math.floor(this.shown / 3)) this.scene.game.events.emit('sfx', 'blip');
        if (this.shown >= this.full.length) this.finishTyping();
      }
      if (controls.pressed('confirm')) this.finishTyping();
    } else if (this.choice && this.afterType) {
      const r = this.afterType;
      this.afterType = null;
      this.resolve = null;
      r();
    } else if (this.choiceList) {
      this.choiceList.handle(controls);
    } else if (controls.pressed('confirm') || controls.pressed('cancel')) {
      this.advance();
    }
  }
}
