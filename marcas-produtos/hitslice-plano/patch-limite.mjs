// HitSlice (07/11/2026): Automático até 20 cortes; cortes à mão de volta a 30 por vídeo. Uso: node patch-limite.mjs <public-nova>
import fs from 'fs';
import path from 'path';
const dir = process.argv[2];
function troca(n, pares) {
  const f = path.join(dir, n); let s = fs.readFileSync(f, 'utf8');
  for (const [a, b] of pares) { const q = s.split(a).length - 1; if (q !== 1) throw new Error(`${n}: achei ${q}x ${a.slice(0, 60)}`); s = s.replace(a, () => b); }
  if (/�/.test(s)) throw new Error('corrompido'); fs.writeFileSync(f, s); console.log('ok', n);
}
troca('index.html', [['Automático: quanto mais longo o vídeo, mais cortes (sem limite).', 'Automático: quanto mais longo o vídeo, mais cortes (até 20).']]);
troca('app.js', [
  ['qtd_dica: "Automatic: the longer the video, the more clips (no limit).",', 'qtd_dica: "Automatic: the longer the video, the more clips (up to 20).",'],
  ['muitos: "Limite de 300 cortes por vídeo."', 'muitos: "Limite de 30 cortes por vídeo."'],
  ['muitos: "Limit of 300 clips per video."', 'muitos: "Limit of 30 clips per video."'],
]);
let h = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'); h = h.replace(/app\.js\?v=(\d+)/, (m, n) => 'app.js?v=' + (+n + 1)); fs.writeFileSync(path.join(dir, 'index.html'), h); console.log('app.js v+1');
