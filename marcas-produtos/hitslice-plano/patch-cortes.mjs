// HitSlice (07/11/2026): duração "2–3 min", automático sem limite pela duração do vídeo, gancho no meio/embaixo por pouco tempo.
// Uso: node patch-cortes.mjs <pasta public-nova>
import fs from 'fs';
import path from 'path';
const dir = process.argv[2];
const F = (n) => path.join(dir, n);
function troca(n, pares) {
  let s = fs.readFileSync(F(n), 'utf8');
  for (const [a, b] of pares) {
    const q = typeof a === 'string' ? s.split(a).length - 1 : (s.match(new RegExp(a.source, a.flags + 'g')) || []).length;
    if (q !== 1) throw new Error(`${n}: achei ${q}x ${String(a).slice(0, 70)}`);
    s = typeof a === 'string' ? s.replace(a, () => b) : s.replace(a, b);
  }
  if (/�/.test(s)) throw new Error(n + ' corrompido');
  fs.writeFileSync(F(n), s); console.log('ok', n);
}
troca('index.html', [
  ['<button type="button" data-v="120">2 min</button>\n', '<button type="button" data-v="120">2 min</button>\n        <button type="button" data-v="150">2–3 min</button>\n'],
  [/(<div class="chips" data-campo="qtd">[\s\S]*?<\/div>\n)/, '$1      <p class="dica" data-i18n="qtd_dica">Automático: quanto mais longo o vídeo, mais cortes (sem limite).</p>\n'],
  ['<b data-i18n="gt_tit">Título do gancho no topo</b><small data-i18n="gt_sub">Frase curta que prende nos primeiros segundos</small>',
   '<b data-i18n="gt_tit">Frase de gancho na tela</b><small data-i18n="gt_sub">Aparece rápido (até 3 segundos) no meio ou embaixo para prender a atenção</small>'],
  ['<span class="chave"><input type="checkbox" id="titulo_gancho" checked><span></span></span></label>\n',
   '<span class="chave"><input type="checkbox" id="titulo_gancho" checked><span></span></span></label>\n      <div class="chips peq gancho-pos" data-campo="posicao_gancho">\n        <span class="chips-rot" data-i18n="posicao">Posição</span>\n        <button type="button" data-v="meio" aria-pressed="true" data-i18n="p_meio">Meio</button>\n        <button type="button" data-v="baixo" data-i18n="p_baixo">Embaixo</button>\n      </div>\n'],
  [/estilo\.css\?v=(\d+)/, (m, n) => 'estilo.css?v=' + (+n + 1)],
  [/app\.js\?v=(\d+)/, (m, n) => 'app.js?v=' + (+n + 1)],
]);
troca('app.js', [
  ['posicao_legenda: "baixo", marca_tipo: "nenhuma"', 'posicao_legenda: "baixo", posicao_gancho: "meio", marca_tipo: "nenhuma"'],
  ['gt_tit: "Hook title on top", gt_sub: "Short line that grabs attention in the first seconds",',
   'gt_tit: "Hook line on screen", gt_sub: "Shows quickly (up to 3 seconds) in the middle or bottom to grab attention", qtd_dica: "Automatic: the longer the video, the more clips (no limit).",'],
  ['muitos: "Limite de 30 cortes por vídeo."', 'muitos: "Limite de 300 cortes por vídeo."'],
  ['muitos: "Limit of 30 clips per video."', 'muitos: "Limit of 300 clips per video."'],
]);
fs.appendFileSync(F('estilo.css'), '\n/* posição do gancho (07/11/2026) */\n.gancho-pos { margin-top: 10px; }\n'); console.log('ok estilo.css');
