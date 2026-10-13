// Renderiza o film.html quadro a quadro (1080x1920, 30 fps), gera o áudio (audio.js) e junta tudo com o ffmpeg em MP4 H.264.
// Uso: node render.mjs  (variáveis: RAIZ = pasta do projeto, SAIDA = pasta de saída, WORKERS = páginas em paralelo,
//   AUDIT=1 só confere a tipografia/área segura, ONLY_T=3,12.5 só tira esses quadros, VOZ=faber|cadu|jeff, KEEP=1 reaproveita quadros)
// No servidor: sh ferramentas/render.sh (imagem Docker tikspeed-video:2 = Playwright + ffmpeg).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const RAIZ = process.env.RAIZ || '/v', OUT = process.env.SAIDA || '/out', FR = OUT + '/quadros';
const W = Number(process.env.WORKERS || 4), VOZ = process.env.VOZ || '';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };
const b = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
const errs = [];
async function pagina() {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text()); });
  await p.route('http://film.local/**', r => { const f = path.join(RAIZ, decodeURIComponent(new URL(r.request().url()).pathname)); try { r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); } catch { r.fulfill({ status: 404, body: '' }); } });
  await p.goto('http://film.local/film.html' + (VOZ ? '?voz=' + VOZ : ''), { waitUntil: 'load' });
  await p.evaluate(() => window.carregar());
  return p;
}
const p = await pagina();
const { fps, duracao } = await p.evaluate(() => ({ fps: ROTEIRO.fps, duracao: ROTEIRO.duracao }));
const N = Math.round(fps * duracao);

if (process.env.AUDIT) {
  const probs = new Map();
  for (let f = 0; f < N; f += 3) { const t = f / fps; await p.evaluate(t => render(t), t); for (const x of await p.evaluate(() => audit())) { const k = x.split(' [')[0]; if (!probs.has(k)) probs.set(k, [x, []]); probs.get(k)[1].push(t.toFixed(1)); } }
  console.log(probs.size ? [...probs.values()].map(([x, v]) => `${x}  @ ${v.slice(0, 6).join(', ')}${v.length > 6 ? ' …(' + v.length + ')' : ''}`).join('\n') : 'tipografia: nenhum texto fora da área segura');
}
const only = process.env.ONLY_T ? process.env.ONLY_T.split(',').map(Number) : null;
if (only) for (const t of only) { await p.evaluate(t => render(t), t); await p.screenshot({ path: `${OUT}/t${t}.jpg`, type: 'jpeg', quality: 85 }); }
if (process.env.AUDIT || only) { console.log('erros:', errs.length ? [...new Set(errs)] : 'nenhum'); await b.close(); process.exit(0); }

if (!process.env.KEEP) fs.rmSync(FR, { recursive: true, force: true });
fs.mkdirSync(FR, { recursive: true });
const pages = [p]; for (let i = 1; i < W; i++) pages.push(await pagina());
let feitos = 0;
await Promise.all(pages.map(async (q, w) => {
  for (let f = w; f < N; f += W) {
    const fn = `${FR}/f${String(f).padStart(4, '0')}.png`; if (process.env.KEEP && fs.existsSync(fn)) continue;
    await q.evaluate(t => render(t), f / fps); await q.screenshot({ path: fn, type: 'png' });
    if (++feitos % 150 === 0) console.log('quadros', feitos, '/', N);
  }
}));
await p.evaluate(() => render(49.0)); await p.screenshot({ path: OUT + '/capa.jpg', type: 'jpeg', quality: 90 });
console.log('áudio…');
const wav = await p.evaluate(v => window.gerarAudio(v ? { voz: v } : {}), VOZ);
fs.writeFileSync(OUT + '/audio-mix.wav', Buffer.from(wav, 'base64'));
await b.close();
console.log('erros na página:', errs.length ? [...new Set(errs)] : 'nenhum');
// volume para redes sociais: -14 LUFS, pico -1,5 dB
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', OUT + '/audio-mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', OUT + '/audio-final.wav'], { stdio: 'inherit' });
const MP4 = OUT + '/speed-sistemas-reels.mp4';
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', FR + '/f%04d.png', '-i', OUT + '/audio-final.wav',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'animation',
  '-r', String(fps), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', MP4], { stdio: 'inherit' });
console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate', '-of', 'default=nw=1', MP4]).toString());
console.log('fim:', MP4);
