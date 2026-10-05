/** Framework-independent frame timeline. Zero-based frame indices. */
export class AnimationPlayer {
  constructor(animations) { this.animations = animations; this.key = null; this.elapsed = 0; this.finished = false; }
  play(key, restart = true) {
    if (!this.animations[key]) throw new Error(`Unknown animation: ${key}`);
    const clip = this.animations[key];
    if (!clip.frames.length || !(clip.fps > 0)) throw new Error(`Invalid animation: ${key}`);
    if (restart || this.key !== key) { this.elapsed = 0; this.finished = false; }
    this.key = key;
    return this;
  }
  update(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('deltaMs must be a finite nonnegative number');
    if (!this.key) return null;
    this.elapsed += deltaMs;
    const clip = this.animations[this.key];
    const step = Math.floor(this.elapsed * clip.fps / 1000);
    if (clip.repeat === -1) return clip.frames[step % clip.frames.length];
    this.finished = step >= clip.frames.length;
    return clip.frames[Math.min(step, clip.frames.length - 1)];
  }
  get frame() { return this.update(0); }
}
