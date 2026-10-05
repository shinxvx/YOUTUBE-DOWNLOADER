// The game shell: main loop, scene stack, settings, audio, pause on blur.
import { Screen, Input, VW, VH, rect, text, drawTooltip, COLORS } from './ui/core.js';
import { Audio } from './ui/audio.js';
import { loadAll } from './ui/assets.js';
import { readSettings, writeSettings, writeSave } from './save/save.js';
import { TitleScene } from './scenes/title.js';

export class App {
  constructor(canvas) {
    this.screen = new Screen(canvas);
    this.ctx = this.screen.ctx;
    this.input = new Input(this.screen);
    this.scenes = [];
    this.game = null; // campaign state
    this.time = 0;
    this.paused = false;
    this.tooltip = null;
    this.toasts = [];
    this.loading = 0;
    this.host = window.eidraHost || null;
  }

  async start() {
    this.settings = await readSettings();
    this.audio = new Audio(this.settings);
    if (this.host) {
      this.host.onFocus((focused) => this.setPaused(!focused));
      if (this.settings.fullscreen) this.host.setFullscreen(true);
    } else {
      window.addEventListener('blur', () => this.setPaused(true));
      window.addEventListener('focus', () => this.setPaused(false));
    }
    // first user gesture unlocks audio
    const unlock = () => {
      this.audio.ensure();
      if (this.audio.ctx && this.audio.ctx.state === 'suspended' && !this.paused) this.audio.ctx.resume();
    };
    window.addEventListener('mousedown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        this.toggleFullscreen();
      }
    });

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (document.fonts && document.fonts.load) {
      await Promise.all([document.fonts.load(`500 8px "Pixelify Sans"`), document.fonts.load(`700 8px "Pixelify Sans"`)]).catch(() => {});
    }
    await loadAll((p) => {
      this.loading = p;
    });
    this.loading = 1;
    this.push(new TitleScene());
  }

  setPaused(p) {
    this.paused = p;
    this.audio.setPaused(p);
  }

  async toggleFullscreen() {
    if (this.host) this.settings.fullscreen = await this.host.setFullscreen();
    else if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
    this.saveSettings();
  }

  saveSettings() {
    this.audio.applyVolumes();
    writeSettings(this.settings);
  }

  // speed multiplier for animations (0 = instant)
  get anim() {
    return this.settings.animSpeed;
  }

  // ------------------------------------------------------------- scenes
  get top() {
    return this.scenes[this.scenes.length - 1];
  }

  push(scene) {
    this.scenes.push(scene);
    this.input.resetFocus();
    if (scene.enter) scene.enter(this);
    return scene;
  }

  pop(result) {
    const s = this.scenes.pop();
    this.input.resetFocus();
    if (s && s.exit) s.exit(this, result);
    if (s && s.resolve) s.resolve(result);
    if (this.top && this.top.resume) this.top.resume(this, result);
    return s;
  }

  replace(scene) {
    const s = this.scenes.pop();
    if (s && s.exit) s.exit(this);
    return this.push(scene);
  }

  reset(scene) {
    while (this.scenes.length) {
      const s = this.scenes.pop();
      if (s.exit) s.exit(this);
    }
    return this.push(scene);
  }

  // Push a scene and wait until it pops itself with a result.
  run(scene) {
    return new Promise((resolve) => {
      scene.resolve = resolve;
      this.push(scene);
    });
  }

  toast(msg, color) {
    this.toasts.push({ msg, color, t: 2.6 });
  }

  async autosave() {
    if (!this.game) return;
    try {
      await writeSave('auto', this.game);
    } catch (e) {
      console.error(e);
      this.toast('Autosave failed!', COLORS.danger);
    }
  }

  // ------------------------------------------------------------- frame
  frame(dt) {
    const { ctx } = this;
    this.screen.begin();
    if (!this.top) {
      rect(ctx, 0, 0, VW, VH, '#10131c');
      text(ctx, 'Loading...', VW / 2, VH / 2 - 12, { align: 'center', size: 12 });
      rect(ctx, VW / 2 - 60, VH / 2 + 6, 120, 6, '#2a3050');
      rect(ctx, VW / 2 - 60, VH / 2 + 6, 120 * this.loading, 6, COLORS.essence);
      this.input.beginFrame();
      this.input.endFrame();
      return;
    }
    if (!this.paused) {
      this.time += dt;
      if (this.game) this.game.playtime += dt;
    }
    const step = this.paused ? 0 : dt;
    this.input.beginFrame();
    // draw every scene from the lowest opaque one up; only the top gets input
    let start = this.scenes.length - 1;
    while (start > 0 && this.scenes[start].overlay) start--;
    for (let i = start; i < this.scenes.length; i++) {
      const s = this.scenes[i];
      const isTop = i === this.scenes.length - 1;
      s.frame(this, isTop ? step : 0, isTop);
      if (!isTop) this.input.hits = []; // only the top scene is interactive
    }
    // toasts
    let ty = 28;
    for (const t of this.toasts) {
      t.t -= dt;
      const w = Math.min(VW - 20, this.ctx.measureText(t.msg).width + 40);
      rect(ctx, VW / 2 - w / 2, ty, w, 16, 'rgba(10,12,24,0.9)');
      text(ctx, t.msg, VW / 2, ty + 4, { align: 'center', color: t.color || COLORS.gold });
      ty += 18;
    }
    this.toasts = this.toasts.filter((t) => t.t > 0);
    drawTooltip(this);
    if (this.paused) {
      rect(ctx, 0, 0, VW, VH, 'rgba(8,10,20,0.6)');
      text(ctx, 'PAUSED', VW / 2, VH / 2 - 8, { align: 'center', size: 16, bold: true });
      text(ctx, 'Click the window to continue', VW / 2, VH / 2 + 12, { align: 'center', color: COLORS.textDim });
    }
    this.input.endFrame();
  }
}
