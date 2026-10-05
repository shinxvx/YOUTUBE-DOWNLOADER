// Chiptune music and sound effects synthesized with WebAudio (no audio files,
// works offline). Tracks are original compositions written as note strings:
// "C4" plays a note, "-" holds it, "." is a rest. One token = one step.

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(tok) {
  const m = /^([A-G]#?)(\d)$/.exec(tok);
  if (!m) return 0;
  const n = NOTE[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * Math.pow(2, (n - 69) / 12);
}
const seq = (str) => str.trim().split(/\s+/);
const rep = (str, n) => Array(n).fill(str).join(' ');

const TRACKS = {
  title: {
    bpm: 84, step: 0.5,
    voices: [
      { wave: 'triangle', vol: 0.22, notes: seq('A4 - - C5 E5 - D5 - C5 - B4 - A4 - - - G4 - - A4 B4 - C5 - B4 - G4 - E4 - - - F4 - - A4 C5 - B4 - A4 - G4 - A4 - B4 - C5 - - B4 A4 - G4 - E4 - - - - - - -') },
      { wave: 'square', vol: 0.05, notes: seq(rep('A2 . E3 . A3 . E3 .', 2) + ' ' + rep('F2 . C3 . F3 . C3 .', 1) + ' ' + rep('G2 . D3 . G3 . D3 .', 1) + ' ' + rep('F2 . C3 . F3 . C3 .', 1) + ' ' + rep('E2 . B2 . E3 . B2 .', 1) + ' ' + rep('A2 . E3 . A3 . E3 .', 2)) },
    ],
  },
  day: {
    bpm: 112, step: 0.5,
    voices: [
      { wave: 'square', vol: 0.07, notes: seq('E5 - D5 C5 D5 - E5 G5 E5 - D5 - C5 - - - D5 - C5 A4 C5 - D5 E5 D5 - C5 - A4 - - - C5 - D5 E5 G5 - A5 G5 E5 - D5 - C5 - D5 - E5 - D5 C5 A4 - C5 D5 C5 - - - - - . .') },
      { wave: 'triangle', vol: 0.2, notes: seq(rep('C3 . G3 . C3 . G3 .', 2) + ' ' + rep('A2 . E3 . A2 . E3 .', 2) + ' ' + rep('F2 . C3 . F2 . C3 .', 2) + ' ' + rep('G2 . D3 . G2 . D3 .', 2)) },
    ],
  },
  night: {
    bpm: 76, step: 0.5,
    voices: [
      { wave: 'triangle', vol: 0.2, notes: seq('E4 - - G4 B4 - A4 - G4 - - - E4 - - - D4 - - F4 A4 - G4 - F4 - - - D4 - - - C4 - - E4 G4 - F4 - E4 - D4 - E4 - - - B3 - - D4 E4 - - - - - - - . . . .') },
      { wave: 'sine', vol: 0.12, notes: seq(rep('E2 - - - B2 - - -', 2) + ' ' + rep('D2 - - - A2 - - -', 2) + ' ' + rep('C2 - - - G2 - - -', 2) + ' ' + rep('B1 - - - F#2 - - -', 2)) },
    ],
  },
  duel: {
    bpm: 138, step: 0.5,
    voices: [
      { wave: 'square', vol: 0.065, notes: seq('E5 . E5 G5 . E5 D5 . B4 . D5 E5 . . B4 . A4 . A4 C5 . A4 G4 . E4 . G4 A4 . . B4 . E5 . E5 G5 . A5 G5 . E5 . D5 E5 . . G5 . F#5 . E5 D5 . B4 D5 . E5 . - - . . . .') },
      { wave: 'triangle', vol: 0.22, notes: seq(rep('E2 E3 E2 E3', 4) + ' ' + rep('C2 C3 C2 C3', 2) + ' ' + rep('D2 D3 D2 D3', 2) + ' ' + rep('E2 E3 E2 E3', 4) + ' ' + rep('C2 C3 D2 D3', 2) + ' ' + rep('B1 B2 B1 B2', 2)) },
      { wave: 'noise', vol: 0.05, notes: seq(rep('x . x x', 16)) },
    ],
  },
  tension: {
    bpm: 92, step: 0.5,
    voices: [
      { wave: 'square', vol: 0.05, notes: seq('D5 - - - C#5 - - - D5 - F5 - E5 - - - A4 - - - G#4 - - - A4 - C5 - B4 - - -') },
      { wave: 'triangle', vol: 0.22, notes: seq(rep('D2 . D2 . D2 . D3 .', 2) + ' ' + rep('A1 . A1 . A1 . A2 .', 2)) },
    ],
  },
};

const SFX = {
  click: [['square', 880, 0.04, 0.08]],
  select: [['square', 660, 0.05, 0.08], ['square', 990, 0.06, 0.08, 0.05]],
  back: [['square', 520, 0.05, 0.08], ['square', 390, 0.06, 0.08, 0.05]],
  summon: [['triangle', 392, 0.08, 0.2], ['triangle', 523, 0.08, 0.2, 0.07], ['triangle', 784, 0.14, 0.2, 0.14]],
  attack: [['noise', 0, 0.12, 0.25], ['square', 220, 0.08, 0.1]],
  hit: [['noise', 0, 0.08, 0.3], ['square', 140, 0.1, 0.12]],
  heal: [['sine', 660, 0.1, 0.15], ['sine', 880, 0.12, 0.15, 0.08]],
  shield: [['triangle', 1040, 0.1, 0.12], ['triangle', 780, 0.12, 0.1, 0.06]],
  evolve: [['square', 392, 0.07, 0.08], ['square', 494, 0.07, 0.08, 0.07], ['square', 587, 0.07, 0.08, 0.14], ['square', 784, 0.2, 0.1, 0.21]],
  defeat: [['square', 330, 0.1, 0.1], ['square', 220, 0.18, 0.1, 0.1], ['noise', 0, 0.2, 0.15, 0.1]],
  win: [['square', 523, 0.12, 0.1], ['square', 659, 0.12, 0.1, 0.12], ['square', 784, 0.12, 0.1, 0.24], ['square', 1046, 0.4, 0.1, 0.36]],
  lose: [['triangle', 392, 0.2, 0.2], ['triangle', 330, 0.2, 0.2, 0.2], ['triangle', 262, 0.5, 0.2, 0.4]],
  coin: [['square', 988, 0.05, 0.08], ['square', 1319, 0.15, 0.08, 0.05]],
  page: [['noise', 0, 0.05, 0.08]],
  text: [['square', 1200, 0.015, 0.03]],
  pulse: [['sine', 110, 0.8, 0.3], ['sine', 220, 0.6, 0.15, 0.2]],
};

export class Audio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.track = null;
    this.timer = null;
    this.paused = false;
  }

  ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.fx = this.ctx.createGain();
    this.music.connect(this.master);
    this.fx.connect(this.master);
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    return true;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    this.master.gain.value = s.master;
    this.music.gain.value = s.music;
    this.fx.gain.value = s.sfx;
  }

  tone(wave, f, dur, vol, at, dest) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(dest);
    let src;
    if (wave === 'noise') {
      src = c.createBufferSource();
      src.buffer = this.noise;
      const bp = c.createBiquadFilter();
      bp.type = 'highpass';
      bp.frequency.value = 1200;
      src.connect(bp);
      bp.connect(g);
    } else {
      src = c.createOscillator();
      src.type = wave;
      src.frequency.value = f;
      src.connect(g);
    }
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  sfx(name) {
    if (!this.ensure() || this.paused) return;
    const list = SFX[name];
    if (!list) return;
    const t = this.ctx.currentTime;
    for (const [wave, f, dur, vol, delay = 0] of list) this.tone(wave, f, dur, vol, t + delay, this.fx);
  }

  play(name) {
    if (this.track === name) return;
    this.track = name;
    if (!this.ensure()) return;
    clearInterval(this.timer);
    const tr = TRACKS[name];
    if (!tr) return;
    const stepDur = (60 / tr.bpm) * tr.step;
    const len = Math.max(...tr.voices.map((v) => v.notes.length));
    let step = 0;
    let next = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => {
      if (this.paused || !this.ctx) return;
      while (next < this.ctx.currentTime + 0.2) {
        for (const v of tr.voices) {
          const tok = v.notes[step % v.notes.length];
          if (tok === '-' || tok === '.') continue;
          let hold = 1;
          while (v.notes[(step + hold) % v.notes.length] === '-' && hold < 16) hold++;
          if (v.wave === 'noise') this.tone('noise', 0, 0.05, v.vol, next, this.music);
          else this.tone(v.wave, freq(tok), stepDur * hold * 0.95, v.vol, next, this.music);
        }
        step = (step + 1) % len;
        next += stepDur;
      }
      if (next < this.ctx.currentTime) next = this.ctx.currentTime + 0.05;
    }, 25);
  }

  stop() {
    clearInterval(this.timer);
    this.track = null;
  }

  setPaused(p) {
    this.paused = p;
    if (!this.ctx) return;
    if (p) this.ctx.suspend();
    else this.ctx.resume();
  }
}
