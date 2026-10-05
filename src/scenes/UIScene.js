import Phaser from 'phaser';
import { GAME_W, GAME_H, WORLD_ZOOM } from '../config.js';
import { fitCamera } from '../systems/display.js';
import { Controls, keyNameFor } from '../systems/input.js';
import { state } from '../systems/state.js';
import { DialogueBox } from '../ui/dialogue.js';
import { panel, text } from '../ui/widgets.js';

const TIPS = {
  move: () => `Move: Arrow keys / WASD (hold Shift to run), or click a spot.\n${keyNameFor('confirm')} / Enter / Space: talk and interact.   ${keyNameFor('menu')}: menu — save, items, journal, settings.`,
};

// Screen-space HUD for exploration: objective, location, prompts, toasts, dialogue.
export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    fitCamera(this);
    this.controls = new Controls(this);
    this.dialogue = new DialogueBox(this, 1000);

    // Objective panel
    this.objBg = this.add.graphics().setDepth(10);
    this.objLabel = text(this, 34, 22, 'OBJECTIVE', { size: 12, color: '#c9a45c', bold: true }).setDepth(11);
    this.objText = text(this, 34, 40, '', { size: 16, wrap: 520 }).setDepth(11);

    // Location toast
    this.locText = text(this, GAME_W / 2, 92, '', { size: 30, title: true, color: '#f0d79a', origin: 0.5, stroke: '#000', strokeThickness: 4 }).setDepth(20).setAlpha(0);
    this.locRule = this.add.graphics().setDepth(20).setAlpha(0);

    // Interaction prompt
    this.marker = this.add.image(0, 0, 'marker').setDepth(30).setScale(2).setVisible(false);
    this.tweens.add({ targets: this.marker, y: '+=0', duration: 1 });
    this.markerBob = 0;
    this.hint = text(this, GAME_W - 24, GAME_H - 24, '', { size: 15, color: '#f0d79a', origin: [1, 1] }).setDepth(30);

    // Toasts stack (top right)
    this.toasts = [];

    // Full-screen tint for mark pulses
    this.tint = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x8a4dff, 0).setOrigin(0).setDepth(900).setBlendMode(Phaser.BlendModes.ADD);

    this.tipBox = null;
    this.ready = true;
    this.events.emit('ui-ready');
  }

  update(time, delta) {
    this.markerBob += delta / 1000;
    if (this.markerTarget) {
      const cam = this.scene.get('World').cameras.main;
      const sx = (this.markerTarget.x - cam.worldView.x) * WORLD_ZOOM;
      const sy = (this.markerTarget.y - cam.worldView.y) * WORLD_ZOOM;
      this.marker.setPosition(sx, sy - 104 + Math.sin(this.markerBob * 5) * 5);
    }
    if (this.tipBox && (this.controls.pressed('confirm') || this.controls.pressed('cancel'))) this.closeTip();
  }

  setObjective(str, flash = false) {
    this.objText.setText(str || '');
    const h = this.objText.height + 34;
    const w = Math.max(240, Math.min(560, this.objText.width + 40));
    this.objBg.clear();
    if (!str) return;
    this.objBg.fillStyle(0x0a0c18, 0.72).fillRect(18, 14, w, h);
    this.objBg.fillStyle(0xc9a45c, 1).fillRect(18, 14, 3, h);
    if (flash) {
      this.objText.setColor('#f0d79a');
      this.time.delayedCall(1200, () => this.objText.setColor('#efe6d2'));
    }
  }

  setLocation(name, animate) {
    if (!animate) return;
    this.locText.setText(name);
    const w = this.locText.width + 80;
    this.locRule.clear().fillStyle(0xc9a45c, 1).fillRect(GAME_W / 2 - w / 2, 116, w, 2);
    this.tweens.killTweensOf([this.locText, this.locRule]);
    this.locText.setAlpha(0); this.locRule.setAlpha(0);
    this.tweens.add({ targets: [this.locText, this.locRule], alpha: 1, duration: 500, hold: 1600, yoyo: true });
  }

  setPrompt(pos, showMarker = true) {
    this.markerTarget = pos;
    this.marker.setVisible(!!pos && showMarker);
    this.hint.setText(pos ? `${keyNameFor('confirm')}  Interact` : '');
  }

  toast(msg, kind) {
    const y = 24 + this.toasts.length * 46;
    const t = text(this, GAME_W - 40, y + 10, msg, { size: 17, color: kind === 'save' ? '#9be39b' : '#f0d79a', origin: [1, 0] }).setDepth(40);
    const bg = this.add.graphics().setDepth(39);
    bg.fillStyle(0x0a0c18, 0.85).fillRect(GAME_W - t.width - 60, y, t.width + 40, 40);
    bg.lineStyle(1, 0xc9a45c, 0.8).strokeRect(GAME_W - t.width - 60, y, t.width + 40, 40);
    const entry = { t, bg };
    this.toasts.push(entry);
    for (const o of [t, bg]) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 200 }); }
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: [t, bg], alpha: 0, duration: 300, onComplete: () => {
          t.destroy(); bg.destroy();
          this.toasts = this.toasts.filter(x => x !== entry);
        },
      });
    });
  }

  bubble(wx, wy, sym) {
    const cam = this.scene.get('World').cameras.main;
    const sx = (wx - cam.worldView.x) * WORLD_ZOOM;
    const sy = (wy - cam.worldView.y) * WORLD_ZOOM;
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0xf5efe0, 1).fillRoundedRect(sx - 26, sy - 64, 52, 40, 10);
    g.fillTriangle(sx - 6, sy - 26, sx + 6, sy - 26, sx, sy - 16);
    const t = text(this, sx, sy - 44, sym, { size: 22, color: '#1a1420', origin: 0.5, shadow: false, bold: true }).setDepth(51);
    return new Promise(res => {
      this.tweens.add({ targets: [g, t], alpha: { from: 0, to: 1 }, duration: 150 });
      this.time.delayedCall(900, () => { g.destroy(); t.destroy(); res(); });
    });
  }

  tintPulse(color, alpha, ms) {
    this.tint.setFillStyle(color, 1).setAlpha(0);
    this.tweens.add({ targets: this.tint, alpha, duration: ms * 0.3, yoyo: true, hold: ms * 0.2 });
  }

  chapterCard(title, subtitle) {
    const objs = [];
    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 1).setOrigin(0).setDepth(800);
    const t1 = text(this, GAME_W / 2, GAME_H / 2 - 40, title.toUpperCase(), { size: 20, color: '#c9a45c', origin: 0.5, title: true }).setDepth(801);
    const t2 = text(this, GAME_W / 2, GAME_H / 2 + 6, subtitle, { size: 46, color: '#f3ead6', origin: 0.5, title: true }).setDepth(801);
    const rule = this.add.rectangle(GAME_W / 2, GAME_H / 2 + 50, 360, 2, 0xc9a45c).setDepth(801).setScale(0, 1);
    objs.push(bg, t1, t2, rule);
    t1.setAlpha(0); t2.setAlpha(0);
    return new Promise(res => {
      this.tweens.add({ targets: [t1, t2], alpha: 1, duration: 900 });
      this.tweens.add({ targets: rule, scaleX: 1, duration: 1200, ease: 'Cubic.easeOut' });
      this.time.delayedCall(2800, () => {
        this.tweens.add({
          targets: [t1, t2, rule], alpha: 0, duration: 700, onComplete: () => {
            this.tweens.add({ targets: bg, alpha: 0, duration: 10, onComplete: () => { objs.forEach(o => o.destroy()); res(); } });
          },
        });
      });
    });
  }

  // Sunrise over the HDRI sky panorama: the exposure rises from black while the view
  // drifts toward the sun. Returns a handle; call end() to fade it out.
  skyCinematic() {
    const tex = this.textures.get('sky:dawn_panorama').getSourceImage();
    const light = this.cache.json.get('sky:dawn_light');
    const scale = GAME_H / tex.height;
    const sunX = (light?.panorama.sunX ?? tex.width * 0.7) * scale;
    const sunY = (light?.panorama.sunY ?? tex.height * 0.8) * scale;
    const img = this.add.image(0, 0, 'sky:dawn_panorama').setOrigin(0).setScale(scale).setDepth(700).setAlpha(0);
    img.x = GAME_W * 0.5 - sunX + 260;
    const sun = this.add.image(img.x + sunX, sunY, 'light').setDepth(701).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc890).setScale(0.6).setAlpha(0);
    const black = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05040a, 1).setOrigin(0).setDepth(702);
    img.setAlpha(1);
    this.tweens.add({ targets: black, alpha: 0, duration: 3200, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: sun, alpha: 0.6, scale: 2.2, duration: 4200, ease: 'Sine.easeOut' });
    this.tweens.add({
      targets: img, x: img.x - 220, duration: 14000, ease: 'Sine.easeInOut',
      onUpdate: () => sun.setX(img.x + sunX),
    });
    return {
      end: () => new Promise(res => {
        this.tweens.add({
          targets: [img, sun], alpha: 0, duration: 1200,
          onComplete: () => { img.destroy(); sun.destroy(); black.destroy(); res(); },
        });
      }),
    };
  }

  tip(id) {
    const str = TIPS[id]?.();
    if (!str || state.tutorials[id]) return;
    state.tutorials[id] = true;
    this.closeTip();
    const t = text(this, GAME_W / 2, 150, str, { size: 17, wrap: 760, align: 'center', origin: [0.5, 0] }).setDepth(60);
    const w = 820, h = t.height + 56;
    const bg = panel(this, GAME_W / 2 - w / 2, 128, w, h).setDepth(59);
    const head = text(this, GAME_W / 2, 132, 'HOW TO PLAY', { size: 12, color: '#c9a45c', bold: true, origin: [0.5, 0] }).setDepth(60);
    t.setY(156);
    const foot = text(this, GAME_W / 2, 128 + h - 22, `${keyNameFor('confirm')} to dismiss`, { size: 12, color: '#a79f8c', origin: 0.5 }).setDepth(60);
    this.tipBox = [bg, t, head, foot];
    this.tipTimer = this.time.delayedCall(12000, () => this.closeTip());
  }

  closeTip() {
    if (!this.tipBox) return;
    this.tipBox.forEach(o => o.destroy());
    this.tipBox = null;
    this.tipTimer?.remove();
  }

  endCard() {
    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0).setOrigin(0).setDepth(850);
    const lines = [
      text(this, GAME_W / 2, 230, 'END OF THE VERTICAL SLICE', { size: 18, color: '#c9a45c', origin: 0.5, title: true }),
      text(this, GAME_W / 2, 290, 'Chapter 1 continues at Firstlight Bastion.', { size: 34, color: '#f3ead6', origin: 0.5, title: true }),
      text(this, GAME_W / 2, 350, 'Ivo, Dawnbreak, Rowan and Daigo arrive in Milestone 2.', { size: 18, color: '#a79f8c', origin: 0.5 }),
      text(this, GAME_W / 2, 470, `Your progress was autosaved before departure.   ${keyNameFor('confirm')}: return to title`, { size: 16, color: '#efe6d2', origin: 0.5 }),
    ];
    lines.forEach(l => l.setDepth(851).setAlpha(0));
    this.endCardActive = true;
    return new Promise(res => {
      this.tweens.add({ targets: bg, fillAlpha: 1, duration: 800 });
      this.tweens.add({ targets: lines, alpha: 1, duration: 1200, delay: 600 });
      const wait = () => {
        if (this.controls.pressed('confirm')) { res(); return; }
        this.time.delayedCall(50, wait);
      };
      this.time.delayedCall(1800, wait);
      this.input.once('pointerdown', () => this.time.delayedCall(1800, res));
    });
  }
}
