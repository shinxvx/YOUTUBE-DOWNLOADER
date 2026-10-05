import Phaser from 'phaser';
import { spriteAsset } from '../gfx/assets.js';
import { state } from './state.js';

const DIRS = ['down', 'left', 'right', 'up'];

// Exploration character: original atlas sprite on a logical 48x48 footprint,
// with a contact shadow and y-sorted depth.
export class Actor {
  constructor(scene, id, spriteKey, x, y, facing = 'down') {
    this.scene = scene;
    this.id = id;
    this.key = spriteKey;
    this.asset = spriteAsset(spriteKey);
    this.shadow = scene.add.image(x, y, 'shadow').setScale(0.8, 0.8).setAlpha(0.9);
    this.sprite = scene.add.sprite(x, y, spriteKey, 0).setOrigin(this.asset.gen.originX, this.asset.gen.originY);
    this.sprite.setScale(this.asset.runtimeScale);
    this.facing = facing;
    this.moving = false;
    this.x = x;
    this.y = y;
    this.idle();
    this.sync();
  }

  get isKai() { return this.key === 'kai_overworld'; }

  setPos(x, y) { this.x = x; this.y = y; this.sync(); }

  sync() {
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y));
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y) - 1);
    this.sprite.setDepth(this.y);
    this.shadow.setDepth(this.y - 0.5);
    if (this.markGlow) {
      this.markGlow.setPosition(this.sprite.x + (this.facing === 'left' ? -2 : this.facing === 'right' ? 2 : 3), this.sprite.y - 30);
      this.markGlow.setDepth(this.y + 0.2);
      this.markGlow.setVisible(this.facing !== 'up');
    }
  }

  face(dir) {
    if (!DIRS.includes(dir)) return;
    this.facing = dir;
    if (!this.moving) this.idle();
  }

  walk(dir) {
    if (dir) this.facing = dir;
    this.moving = true;
    this.sprite.play(`${this.key}:walk_${this.facing}`, true);
  }

  idle() {
    this.moving = false;
    this.sprite.play(`${this.key}:idle_${this.facing}`, true);
  }

  // Simplified readable mark on the small sprite: a violet pulse at the chest.
  updateMark() {
    const show = this.isKai && state.sealStage >= 1 && state.sealStage <= 3;
    if (show && !this.markGlow) {
      this.markGlow = this.scene.add.image(this.x, this.y, 'glow').setTint(0xa970ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.22);
      this.scene.tweens.add({ targets: this.markGlow, alpha: { from: 0.35, to: 0.95 }, scale: { from: 0.18, to: 0.28 }, duration: 800, yoyo: true, repeat: -1 });
    } else if (!show && this.markGlow) {
      this.markGlow.destroy();
      this.markGlow = null;
    }
    this.sync();
  }

  setVisible(v) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
    this.markGlow?.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.markGlow?.destroy();
  }
}

export function dirFromVector(dx, dy, fallback) {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}
