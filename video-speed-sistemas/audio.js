// Áudio do vídeo, todo gerado aqui (nada de música ou efeito de terceiros):
//  - trilha instrumental original (Web Audio, 120 BPM, Lá menor: Am7 – Fmaj7 – C – G), mais cheia no portfólio;
//  - efeitos discretos: passagem das setas (whoosh), cliques/toques, digitação, "pop" dos cartões, confirmações;
//  - narração (narracao/<voz>/*.wav, Piper) nos tempos de narracao/frases.json;
//  - mixagem: a trilha abaixa sozinha enquanto a voz fala (ducking).
// window.gerarAudio() devolve um WAV 48 kHz estéreo em base64 (o render.mjs normaliza o volume com o ffmpeg).
'use strict';
window.gerarAudio = async function (opc = {}) {
  const SR = 48000, DURA = R.duracao, ctx = new OfflineAudioContext(2, SR * DURA, SR);
  const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
  const master = ctx.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 3; master.attack.value = 0.01; master.release.value = 0.2;
  master.connect(ctx.destination);
  const musica = ctx.createGain(); musica.connect(master);
  const sfx = ctx.createGain(); sfx.gain.value = 0.55; sfx.connect(master);
  const vozBus = ctx.createGain(); vozBus.gain.value = 1.0; vozBus.connect(master);
  // ruído branco reaproveitado
  const ruido = ctx.createBuffer(1, SR * 2, SR); { const d = ruido.getChannelData(0); let s = 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const env = (g, t, a, pico, d, fim = 0.0001) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pico, t + a); g.gain.exponentialRampToValueAtTime(fim, t + a + d); };
  const pan = (no, p) => { const pn = ctx.createStereoPanner(); pn.pan.value = p; no.connect(pn); return pn; };

  // ---------- trilha
  const ACORDES = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 60], [55, 59, 62, 67]]; // Am7, Fmaj7, C, G
  const RAIZ = [45, 41, 48, 43];
  const sec = { intro: [0, 4], sol: [4, 11.8], port: [11.8, 40], prop: [40, 48], cta: [48, DURA] };
  const em = (t, [a, b]) => t >= a && t < b;
  // pad: duas serras desafinadas num passa-baixa, um acorde por compasso
  const padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 1400; padF.Q.value = 0.4;
  const padG = ctx.createGain(); padG.gain.value = 0.045; padF.connect(padG); padG.connect(musica);
  for (let bar = 0; bar * BAR < DURA; bar++) {
    const t = bar * BAR, ac = ACORDES[bar % 4];
    for (const n of ac) for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det;
      const g = ctx.createGain(); env(g, t, 0.35, 0.22, BAR + 0.2, 0.02); o.connect(g); g.connect(padF); o.start(t); o.stop(t + BAR + 0.6);
    }
  }
  // "respiração" do pad a cada tempo (sidechain) a partir da cena 2, e abre o filtro no portfólio
  for (let t = 4; t < DURA; t += BEAT) { padG.gain.setValueAtTime(0.02, t); padG.gain.linearRampToValueAtTime(0.045, t + BEAT * 0.8); }
  padF.frequency.setValueAtTime(1300, 0); padF.frequency.linearRampToValueAtTime(1500, 4); padF.frequency.linearRampToValueAtTime(2600, 11.8); padF.frequency.setValueAtTime(2600, 39.6);
  padF.frequency.linearRampToValueAtTime(1100, 40.2); padF.frequency.linearRampToValueAtTime(2000, 48);
  // baixo
  for (let t = 1; t < DURA - 0.5; t += BEAT / 2) {
    if (em(t, [40, 45.4])) continue;
    const bar = Math.floor(t / BAR), n = RAIZ[bar % 4] - 12 + ((Math.round(t / (BEAT / 2)) % 4 === 3) ? 12 : 0);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(n); const g = ctx.createGain(); env(g, t, 0.008, em(t, sec.sol) || em(t, sec.intro) ? 0.14 : 0.2, BEAT * 0.42);
    o.connect(g); g.connect(musica); o.start(t); o.stop(t + BEAT);
  }
  // bumbo
  const bumbo = (t, v = 1) => { const o = ctx.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16); const g = ctx.createGain(); env(g, t, 0.004, 0.55 * v, 0.34); o.connect(g); g.connect(musica); o.start(t); o.stop(t + 0.45); };
  for (let t = 0; t < DURA - 1; t += BEAT) { const b = Math.round(t / BEAT) % 4; if (em(t, sec.sol) && b % 2) continue; if (em(t, [40, 45.4])) continue; bumbo(t, em(t, sec.cta) ? 0.8 : em(t, sec.intro) ? 0.75 : 1); }
  // chimbal e palma (portfólio e final)
  const chimbal = (t, v) => { const s = ctx.createBufferSource(); s.buffer = ruido; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000; const g = ctx.createGain(); env(g, t, 0.002, v, 0.05); s.connect(f); f.connect(g); pan(g, 0.25).connect(musica); s.start(t, Math.random() * 1); s.stop(t + 0.08); };
  const palma = t => { const s = ctx.createBufferSource(); s.buffer = ruido; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.8; const g = ctx.createGain(); env(g, t, 0.003, 0.22, 0.16); s.connect(f); f.connect(g); g.connect(musica); s.start(t, 0.3); s.stop(t + 0.25); };
  for (let t = 4; t < DURA - 1; t += BEAT / 2) {
    const i = Math.round(t / (BEAT / 2));
    if (em(t, sec.port) || em(t, [45.4, 48]) || em(t, [48, DURA - 2])) { chimbal(t, i % 2 ? 0.06 : 0.03); if (i % 4 === 2) palma(t); }
    else if ((em(t, sec.sol) || em(t, [1, 4])) && i % 2) chimbal(t, 0.035);
  }
  // arpejo (pluck) no portfólio: dá ritmo às demonstrações
  for (let t = 11.8; t < 40; t += BEAT / 4) {
    const bar = Math.floor(t / BAR), ac = ACORDES[bar % 4], i = Math.round(t / (BEAT / 4));
    const n = ac[[0, 2, 1, 3, 2, 1, 3, 2][i % 8]] + 12;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz(n); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
    const g = ctx.createGain(); env(g, t, 0.004, 0.035, 0.16); o.connect(f); f.connect(g); pan(g, i % 2 ? -0.3 : 0.3).connect(musica); o.start(t); o.stop(t + 0.22);
  }
  // subida de ruído antes da cena 2 e antes do preço
  const subida = (a, b, v) => { const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(400, a); f.frequency.exponentialRampToValueAtTime(6000, b);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(v, b - 0.02); g.gain.linearRampToValueAtTime(0.0001, b + 0.03); s.connect(f); f.connect(g); g.connect(musica); s.start(a); s.stop(b + 0.1); };
  subida(2.6, 4.0, 0.08); subida(44.2, 45.45, 0.09); subida(10.6, 11.8, 0.05);
  // impacto do "preço que cabe no bolso"
  const impacto = (t) => { bumbo(t, 1.4); const s = ctx.createBufferSource(); s.buffer = ruido; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const g = ctx.createGain(); env(g, t, 0.005, 0.25, 0.9); s.connect(f); f.connect(g); g.connect(musica); s.start(t); s.stop(t + 1.1); };
  impacto(R.proposta.bEm);
  // acorde final (Am add9) que fica soando no fim
  for (const n of [57, 60, 64, 71, 76]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(n); const g = ctx.createGain(); env(g, 52.0, 0.8, 0.03, 4); o.connect(g); g.connect(musica); o.start(52); o.stop(DURA); }

  // ---------- efeitos
  const whoosh = (t, v = 0.5) => { const s = ctx.createBufferSource(); s.buffer = ruido; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.42);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.22); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.8, t); p.pan.linearRampToValueAtTime(0.8, t + 0.6); s.connect(f); f.connect(g); g.connect(p); p.connect(sfx); s.start(t, 0.5); s.stop(t + 0.65); };
  const clique = (t, v = 0.5, cel = false) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(cel ? 900 : 2400, t); o.frequency.exponentialRampToValueAtTime(cel ? 500 : 1400, t + 0.03);
    const g = ctx.createGain(); env(g, t, 0.001, v, cel ? 0.06 : 0.03); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.1); };
  const tecla = (t) => { const s = ctx.createBufferSource(); s.buffer = ruido; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3500; const g = ctx.createGain(); env(g, t, 0.001, 0.18, 0.025); s.connect(f); f.connect(g); g.connect(sfx); s.start(t, Math.random()); s.stop(t + 0.05); };
  const pop = (t, v = 0.25, n = 76) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(hz(n) * 0.7, t); o.frequency.exponentialRampToValueAtTime(hz(n), t + 0.05); const g = ctx.createGain(); env(g, t, 0.004, v, 0.12); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.2); };
  const ok = (t) => { [76, 83].forEach((n, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(n); const g = ctx.createGain(); env(g, t + i * 0.08, 0.005, 0.18, 0.35); o.connect(g); g.connect(sfx); o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.5); }); };
  for (const w of WIPES) whoosh(w + 0.05, w > 47 ? 0.4 : 0.5);
  whoosh(0.05, 0.35); // entrada das setas
  // cena 2: cartões chegando e blocos montando
  for (let i = 0; i < 6; i++) pop(R.cenas.solucao[0] + 0.25 + i * 0.09, 0.12, 72 + i);
  for (let i = 0; i < 6; i++) pop(R.cenas.solucao[0] + 2.1 + i * 0.16, 0.08, 79);
  ok(R.cenas.solucao[0] + 4.05);
  // demonstrações: toques, digitação e confirmações
  PROJ.forEach(P => {
    const cel = P.p.tela === 'cel';
    P.toques.forEach(q => clique(P.t0 + q.t, cel ? 0.35 : 0.4, cel));
    P.imgs.forEach((m, i) => { const ant = P.imgs[i - 1]; if (ant && m.t - ant.t < 0.15) tecla(P.t0 + m.t); });
    P.p.passos.forEach(s => { if (s.extra) { pop(P.t0 + s.t, 0.22, 84); ok(P.t0 + s.t + 0.1); } });
    pop(P.t0 + 0.1, 0.1, 69);
  });
  const conf = { lojaspeed: 'l13.jpg', aurora: 'a09.jpg', rh: 'r02.jpg', 'creatorx-cel': 'c02.jpg' };
  PROJ.forEach(P => { const f = conf[P.p.pasta]; const m = f && P.imgs.find(x => x.f === f); if (m) ok(P.t0 + m.t + 0.05); if (P.p.pasta === 'zapbot') P.imgs.filter(x => /z[12]0/.test(x.f)).forEach(x => pop(P.t0 + x.t, 0.2, 81)); });
  pop(R.cenas.cta[0] + 0.1, 0.18, 69); ok(frase('n10').em - 0.2);

  // ---------- narração
  const voz = opc.voz || R.voz, faixas = [];
  for (const f of FR) {
    try {
      const buf = await ctx.decodeAudioData(await (await fetch(`narracao/${voz}/${f.id}.wav`)).arrayBuffer());
      const s = ctx.createBufferSource(); s.buffer = buf; s.connect(vozBus); s.start(f.em); faixas.push([f.em + (DUR[f.id]?.fala_ini || 0), f.em + (DUR[f.id]?.fala_fim || buf.duration)]);
    } catch (e) { console.warn('narração faltando', f.id); }
  }
  // ducking: trilha a 0,5 e cai para 0,22 durante a fala
  const BASE = 0.5, BAIXO = 0.22;
  musica.gain.setValueAtTime(0.0001, 0); musica.gain.linearRampToValueAtTime(BASE, 0.25);
  faixas.sort((a, b) => a[0] - b[0]);
  const junt = []; for (const f of faixas) { const u = junt[junt.length - 1]; if (u && f[0] - u[1] < 0.5) u[1] = Math.max(u[1], f[1]); else junt.push([...f]); }
  for (const [a, b] of junt) { musica.gain.setValueAtTime(BASE, Math.max(0.3, a - 0.15)); musica.gain.linearRampToValueAtTime(BAIXO, a); musica.gain.setValueAtTime(BAIXO, b + 0.1); musica.gain.linearRampToValueAtTime(BASE, b + 0.4); }
  musica.gain.setValueAtTime(BASE, DURA - 1.6); musica.gain.linearRampToValueAtTime(0.0001, DURA - 0.05);
  sfx.gain.setValueAtTime(0.55, DURA - 1.6); sfx.gain.linearRampToValueAtTime(0.0001, DURA - 0.05);

  const out = await ctx.startRendering();
  // WAV 16 bits
  const n = out.length, L = out.getChannelData(0), Rc = out.getChannelData(1), buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
  let pico = 0; for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(L[i]), Math.abs(Rc[i]));
  const g = pico > 0.98 ? 0.98 / pico : 1;
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * g)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, Rc[i] * g)) * 32767, true); }
  const bytes = new Uint8Array(buf); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
