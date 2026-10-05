import { settings, onSettingsChange } from '../systems/settings.js';

// Procedural WebAudio music and sound effects (original, generated at runtime).
// Temporary audio: listed in ASSETS.md as placeholder until a composed score exists.

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);

// Kai's leitmotif (MIDI): rises, hesitates, resolves downward.
const KAI_MOTIF = [62, 65, 69, 67, 64];

const TRACKS = {
  title: { bpm: 64, root: 50, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], pad: 0.05, arp: 'motif', drums: false },
  village: { bpm: 84, root: 55, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], pad: 0.035, arp: 'pluck', drums: false },
  festival: { bpm: 104, root: 57, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], pad: 0.03, arp: 'pluck', drums: 'light' },
  danger: { bpm: 70, root: 45, scale: [0, 1, 3, 5, 6, 8, 10], chords: [[0, 6, 12], [1, 7, 13]], pad: 0.05, arp: 'bell', drums: 'heart' },
  battle: { bpm: 132, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]], pad: 0.025, arp: 'fast', drums: 'full', bass: true },
  boss: { bpm: 144, root: 43, scale: [0, 1, 3, 5, 7, 8, 11], chords: [[0, 3, 7], [1, 5, 8], [8, 11, 15], [7, 11, 14]], pad: 0.03, arp: 'fast', drums: 'full', bass: true },
  awakening: { bpm: 60, root: 50, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 7, 15], [8, 15, 19]], pad: 0.06, arp: 'motif', drums: false },
  dawn: { bpm: 72, root: 50, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], pad: 0.045, arp: 'motif', drums: false },
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.trackName = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    onSettingsChange(() => this.applyVolumes());
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    // Gentle space for the music bus.
    this.delay = this.ctx.createDelay(1);
    this.delay.delayTime.value = 0.33;
    this.feedback = this.ctx.createGain();
    this.feedback.gain.value = 0.28;
    this.delay.connect(this.feedback).connect(this.delay);
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.delay);
    this.delay.connect(this.master);
    this.sfxBus.connect(this.master);
    this.applyVolumes();
    if (this.pending) { const p = this.pending; this.pending = null; this.play(p); }
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.musicBus.gain.value = settings.musicVolume * 0.5;
    this.sfxBus.gain.value = settings.sfxVolume * 0.6;
  }

  play(name) {
    if (this.trackName === name) return;
    if (!this.ctx) { this.pending = name; this.trackName = null; return; }
    this.stopMusic();
    if (!name || !TRACKS[name]) return;
    this.trackName = name;
    this.track = TRACKS[name];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.trackName = null;
  }

  schedule() {
    const t = this.track;
    const sixteenth = 60 / t.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      this.playStep(t, this.step, this.nextTime, sixteenth);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  playStep(t, step, time, dur) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = t.chords[bar % t.chords.length];
    if (s === 0) {
      for (const iv of chord) this.tone(NOTE(t.root + iv), time, dur * 16, 'triangle', t.pad, this.musicBus, 0.6, 1.2);
      this.tone(NOTE(t.root - 12 + chord[0]), time, dur * 16, 'sine', t.pad * 1.4, this.musicBus, 0.3, 1);
    }
    const sc = t.scale;
    if (t.arp === 'pluck' && (s % 2 === 0)) {
      const deg = [0, 2, 4, 2, 1, 3, 4, 3][(s / 2) % 8];
      const n = t.root + 12 + sc[(chord[0] + deg) % sc.length] + (deg > 3 ? 12 : 0);
      if (Math.random() > 0.2) this.tone(NOTE(n), time, dur * 1.6, 'triangle', 0.05, this.musicBus, 0.005, 0.25);
    } else if (t.arp === 'fast') {
      const n = t.root + 12 + chord[s % 3] + (s % 8 > 3 ? 12 : 0);
      this.tone(NOTE(n), time, dur * 0.9, 'square', 0.018, this.musicBus, 0.003, 0.08);
    } else if (t.arp === 'motif' && s % 4 === 0) {
      const idx = (bar * 4 + s / 4) % 8;
      if (idx < KAI_MOTIF.length) {
        const n = KAI_MOTIF[idx] + (t.root - 50);
        this.tone(NOTE(n + 12), time, dur * 4, 'sine', 0.06, this.musicBus, 0.02, 0.9);
      }
    } else if (t.arp === 'bell' && s === 8 && bar % 2 === 1) {
      this.tone(NOTE(t.root + 24 + chord[1]), time, dur * 8, 'sine', 0.05, this.musicBus, 0.005, 1.6);
      this.tone(NOTE(t.root + 25 + chord[1]), time, dur * 8, 'sine', 0.025, this.musicBus, 0.005, 1.6);
    }
    if (t.bass && s % 2 === 0) {
      const n = t.root - 12 + chord[0] + (s % 8 === 6 ? 7 : 0);
      this.tone(NOTE(n), time, dur * 1.8, 'sawtooth', 0.035, this.musicBus, 0.005, 0.12, 900);
    }
    if (t.drums === 'full') {
      if (s % 8 === 0 || s === 11) this.kick(time, 0.4);
      if (s % 8 === 4) this.snare(time, 0.16);
      if (s % 2 === 1) this.hat(time, 0.04);
    } else if (t.drums === 'light') {
      if (s === 0 || s === 10) this.kick(time, 0.18);
      if (s % 4 === 2) this.hat(time, 0.03);
    } else if (t.drums === 'heart') {
      if (s === 0) this.kick(time, 0.35);
      if (s === 3) this.kick(time, 0.22);
    }
  }

  tone(freq, time, dur, type, gain, dest, attack = 0.01, release = 0.2, lowpass = 0) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), time + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);
    let node = o;
    if (lowpass) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(dest);
    o.start(time);
    o.stop(time + dur + release + 0.05);
  }

  noise(time, dur, gain, filterType, freq, dest) {
    const c = this.ctx;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(dest);
    src.start(time);
  }

  kick(time, gain) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(120, time);
    o.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    o.connect(g).connect(this.musicBus);
    o.start(time);
    o.stop(time + 0.2);
  }

  snare(time, gain) { this.noise(time, 0.14, gain, 'highpass', 1500, this.musicBus); }
  hat(time, gain) { this.noise(time, 0.04, gain, 'highpass', 7000, this.musicBus); }

  sfx(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    const B = this.sfxBus;
    switch (name) {
      case 'blip': this.tone(880, t, 0.015, 'square', 0.025, B, 0.002, 0.02); break;
      case 'move': this.tone(660, t, 0.03, 'triangle', 0.08, B, 0.002, 0.05); break;
      case 'confirm': this.tone(784, t, 0.05, 'triangle', 0.12, B, 0.002, 0.08); this.tone(1175, t + 0.05, 0.08, 'triangle', 0.1, B, 0.002, 0.12); break;
      case 'cancel': this.tone(440, t, 0.06, 'triangle', 0.1, B, 0.002, 0.1); this.tone(330, t + 0.05, 0.08, 'triangle', 0.08, B, 0.002, 0.1); break;
      case 'slash': this.noise(t, 0.18, 0.5, 'bandpass', 2600, B); this.tone(300, t, 0.08, 'sawtooth', 0.05, B, 0.002, 0.1, 1200); break;
      case 'hit': this.noise(t, 0.12, 0.6, 'lowpass', 900, B); this.kickSfx(t, 0.5); break;
      case 'heavy': this.noise(t, 0.3, 0.8, 'lowpass', 600, B); this.kickSfx(t, 0.8); break;
      case 'guard': this.tone(520, t, 0.1, 'square', 0.05, B, 0.002, 0.15, 2000); this.tone(780, t, 0.1, 'square', 0.03, B, 0.002, 0.15, 2000); break;
      case 'heal': [0, 4, 7, 12].forEach((n, i) => this.tone(NOTE(72 + n), t + i * 0.06, 0.12, 'sine', 0.08, B, 0.005, 0.3)); break;
      case 'veil': this.tone(110, t, 0.6, 'sawtooth', 0.08, B, 0.05, 0.6, 700); this.tone(NOTE(74), t + 0.05, 0.5, 'sine', 0.08, B, 0.05, 0.7); this.tone(NOTE(75), t + 0.05, 0.5, 'sine', 0.06, B, 0.05, 0.7); break;
      case 'flame': this.noise(t, 0.5, 0.5, 'bandpass', 900, B); this.tone(NOTE(79), t, 0.3, 'triangle', 0.05, B, 0.02, 0.4); break;
      case 'break': [0, 7, 12].forEach((n, i) => this.tone(NOTE(76 + n), t + i * 0.04, 0.1, 'square', 0.05, B, 0.002, 0.2)); this.noise(t, 0.2, 0.4, 'highpass', 3000, B); break;
      case 'lanternOut': this.tone(180, t, 0.25, 'sine', 0.2, B, 0.005, 0.4); this.noise(t, 0.15, 0.2, 'lowpass', 500, B); break;
      case 'levelup': [0, 4, 7, 12, 16].forEach((n, i) => this.tone(NOTE(67 + n), t + i * 0.08, 0.14, 'triangle', 0.1, B, 0.005, 0.25)); break;
      case 'sparkle': [0, 7, 12].forEach((n, i) => this.tone(NOTE(84 + n), t + i * 0.05, 0.06, 'sine', 0.05, B, 0.002, 0.2)); break;
      case 'encounter': this.tone(NOTE(57), t, 0.12, 'sawtooth', 0.08, B, 0.002, 0.1, 1800); this.tone(NOTE(63), t + 0.1, 0.12, 'sawtooth', 0.08, B, 0.002, 0.1, 1800); this.tone(NOTE(69), t + 0.2, 0.3, 'sawtooth', 0.08, B, 0.002, 0.3, 1800); break;
      case 'scream': this.tone(900, t, 0.4, 'sawtooth', 0.03, B, 0.02, 0.3, 2500); break;
      case 'save': [0, 5, 9].forEach((n, i) => this.tone(NOTE(76 + n), t + i * 0.07, 0.1, 'sine', 0.08, B, 0.005, 0.3)); break;
      default: break;
    }
  }

  kickSfx(time, gain) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.1);
    g.gain.setValueAtTime(gain * 0.4, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    o.connect(g).connect(this.sfxBus);
    o.start(time);
    o.stop(time + 0.16);
  }
}

export const audio = new AudioEngine();
