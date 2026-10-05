import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { fitCamera } from '../systems/display.js';
import { Controls } from '../systems/input.js';
import { newGame } from '../systems/state.js';
import { latestSave, loadFrom } from '../systems/save.js';
import { SettingsPanel, SaveLoadPanel } from '../ui/panels.js';
import { MenuList, text } from '../ui/widgets.js';
import { audio } from '../audio/audio.js';
import { isDesktop, desktop } from '../systems/storage.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    fitCamera(this);
    this.controls = new Controls(this);
    this.cameras.main.fadeIn(900);

    // Slow drifting view across Emberfall at night.
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'environment:emberfall');
    bg.setScale(Math.max(GAME_W / bg.width, GAME_H / bg.height) * 1.12);
    this.tweens.add({ targets: bg, x: GAME_W / 2 - 60, y: GAME_H / 2 + 20, duration: 24000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a1830, 1).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'fog').setOrigin(0).setAlpha(0.18).setName('fog');
    this.add.image(GAME_W / 2, GAME_H / 2, 'vignette').setDisplaySize(GAME_W, GAME_H);
    this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: GAME_W }, y: GAME_H + 10, lifespan: 7000, speedY: { min: -60, max: -25 }, speedX: { min: -10, max: 10 },
      scale: { start: 1.4, end: 0.3 }, alpha: { start: 0.8, end: 0 }, tint: [0xffc070, 0xff9a40, 0xb48cff], frequency: 120, blendMode: 'ADD',
    });

    const logo = this.add.image(GAME_W / 2, 210, 'logo:vampire_hunters');
    logo.setScale(560 / logo.width);
    logo.setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, y: 200, duration: 1600, ease: 'Sine.easeOut' });

    const hasSave = !!latestSave();
    const items = [
      { label: 'New Game', id: 'new' },
      { label: 'Continue', id: 'continue', disabled: !hasSave },
      { label: 'Load Game', id: 'load', disabled: !hasSave },
      { label: 'Settings', id: 'settings' },
      { label: 'Art Gallery', id: 'gallery' },
      ...(isDesktop ? [{ label: 'Quit', id: 'quit' }] : []),
    ];
    this.menu = new MenuList(this, GAME_W / 2 - 110, 400, items, {
      width: 240, lineH: 38, size: 22, index: hasSave ? 1 : 0,
      onSelect: it => this.select(it.id),
    });
    text(this, GAME_W / 2, GAME_H - 26, 'An original JRPG · Vertical slice (Milestone 1) · F11 fullscreen', { size: 13, color: '#8a826f', origin: 0.5 });
    text(this, 24, GAME_H - 26, 'v0.1', { size: 13, color: '#6d6758', origin: [0, 0.5] });
    this.modal = null;
    audio.play('title');
    window.__VH = Object.assign(window.__VH || {}, { title: this });
  }

  select(id) {
    if (id === 'new') {
      newGame();
      this.startWorld();
    } else if (id === 'continue') {
      const s = latestSave();
      if (s && loadFrom(s.slot)) this.startWorld();
    } else if (id === 'load') {
      this.menu.setActive(false);
      this.modal = new SaveLoadPanel(this, 'load', () => this.closeModal(), () => this.startWorld());
    } else if (id === 'settings') {
      this.menu.setActive(false);
      this.modal = new SettingsPanel(this, () => this.closeModal());
    } else if (id === 'gallery') {
      this.scene.start('Gallery');
    } else if (id === 'quit') {
      desktop.quit();
    }
  }

  closeModal() {
    this.modal = null;
    this.time.delayedCall(0, () => this.menu.setActive(true));
  }

  startWorld() {
    this.menu.setActive(false);
    this.modal = null;
    this.cameras.main.fadeOut(700);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      audio.stopMusic();
      this.scene.start('World');
    });
  }

  update(time, delta) {
    const fog = this.children.getByName('fog');
    if (fog) fog.tilePositionX += delta * 0.01;
    if (this.modal) this.modal.handle(this.controls);
    else this.menu.handle(this.controls);
  }
}
