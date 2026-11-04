// Desenhos de produto em traço dourado (no estilo da logo) para a demonstração,
// até a loja subir as fotos reais. Cada tipo é um desenho simples de linhas.
'use strict';
const O = '#a8823f', O2 = '#c9a668';
const folha = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})" fill="none" stroke="${O2}" stroke-width="2">
  <path d="M0 0 C 10 -30, 10 -70, 0 -100"/>${[-20, -40, -60, -80].map((t, i) => `<path d="M${i % 2 ? 1 : 0} ${t} c ${i % 2 ? 14 : -14} -4 ${i % 2 ? 20 : -20} -16 ${i % 2 ? 18 : -18} -24 c ${i % 2 ? -10 : 10} 2 ${i % 2 ? -16 : 16} 12 ${i % 2 ? -18 : 18} 24z"/>`).join('')}</g>`;
const D = {
  anel: `<ellipse cx="200" cy="270" rx="70" ry="74"/><ellipse cx="200" cy="270" rx="58" ry="62"/>
    <path d="M176 202 l24 -34 l24 34 z M176 202 l24 14 l24 -14 M188 185 l12 31 l12 -31"/><path d="M200 152 v-12 M178 160 l-8 -9 M222 160 l8 -9" stroke-width="2"/>`,
  brinco: `${[150, 250].map(x => `<path d="M${x} 120 c 0 -14 18 -14 18 0" /><circle cx="${x + 9}" cy="132" r="5"/><path d="M${x + 9} 137 v 30"/>
    <path d="M${x + 9} 167 c -26 34 -26 64 0 82 c 26 -18 26 -48 0 -82 z"/><path d="M${x + 9} 180 l-12 36 l12 30 l12 -30 z" stroke-width="1.6"/>`).join('')}`,
  argola: `${[140, 260].map(x => `<circle cx="${x}" cy="250" r="54"/><circle cx="${x}" cy="250" r="44"/>${[0, 40, 80, 120, 160, 200, 240, 280, 320].map(a => `<circle cx="${x + 49 * Math.cos(a * Math.PI / 180)}" cy="${250 + 49 * Math.sin(a * Math.PI / 180)}" r="3"/>`).join('')}`).join('')}`,
  colar: `<path d="M110 110 C 120 230, 180 280, 200 290 C 220 280, 280 230, 290 110"/><path d="M118 110 C 128 222, 184 270, 200 279" stroke-dasharray="2 5"/>
    <circle cx="200" cy="306" r="14"/><path d="M190 296 l20 20 M210 296 l-20 20 M200 292 v28 M186 306 h28" stroke-width="1.4"/>`,
  'colar-folha': `<path d="M110 100 C 125 220, 180 262, 200 270 C 220 262, 275 220, 290 100"/>
    <path d="M200 272 c -6 18 -6 40 0 62 c 6 -22 6 -44 0 -62 z"/><path d="M200 280 c -24 6 -34 22 -34 38 c 18 -6 30 -20 34 -38 z M200 280 c 24 6 34 22 34 38 c -18 -6 -30 -20 -34 -38 z"/>`,
  pulseira: `<ellipse cx="200" cy="250" rx="110" ry="46"/>${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<ellipse cx="${200 + 110 * Math.cos(a)}" cy="${250 + 46 * Math.sin(a)}" rx="11" ry="7" transform="rotate(${a * 57.3 + 90} ${200 + 110 * Math.cos(a)} ${250 + 46 * Math.sin(a)})"/>`; }).join('')}
    <path d="M190 300 c 0 16 20 16 20 0 c 0 -10 -20 -10 -20 0 z" />`,
  earcuff: `<path d="M150 330 C 120 260, 140 160, 220 130 C 270 112, 300 150, 290 200"/><path d="M290 200 C 280 250, 230 250, 228 300"/>
    ${folha(160, 300, -20, .9)}`,
  perfume: `<rect x="130" y="190" width="140" height="150" rx="22"/><rect x="146" y="206" width="108" height="118" rx="14" stroke-width="1.6"/>
    <rect x="178" y="160" width="44" height="30" rx="4"/><rect x="166" y="116" width="68" height="44" rx="10"/><path d="M170 258 h60 M182 274 h36" stroke-width="1.6"/>`,
  perfume2: `<path d="M200 170 l70 70 l-70 110 l-70 -110 z"/><path d="M200 190 l52 52 l-52 84 l-52 -84 z" stroke-width="1.6"/>
    <rect x="184" y="140" width="32" height="30" rx="3"/><circle cx="200" cy="120" r="20"/>`,
  splash: `<path d="M150 180 h100 l10 160 c 0 12 -10 20 -20 20 h-80 c -10 0 -20 -8 -20 -20 z"/><rect x="164" y="150" width="72" height="30" rx="6"/>
    <rect x="186" y="122" width="28" height="28" rx="4"/><path d="M168 240 h64 M176 258 h48" stroke-width="1.6"/>`,
  batom: `<rect x="160" y="250" width="80" height="110" rx="6"/><rect x="166" y="210" width="68" height="40" rx="4"/>
    <path d="M176 210 v-58 c 0 -18 48 -44 48 -44 v102"/><path d="M160 290 h80" stroke-width="1.6"/>`,
  base: `<path d="M150 200 h100 v130 c 0 14 -10 22 -22 22 h-56 c -12 0 -22 -8 -22 -22 z"/><rect x="166" y="160" width="68" height="40" rx="6"/>
    <path d="M190 160 v-26 h20 v26"/><path d="M166 270 c 20 -14 48 -14 68 0" stroke-width="1.6"/>`,
  paleta: `<rect x="100" y="170" width="200" height="140" rx="16"/>${[0, 1, 2, 3].map(c => [0, 1].map(r => `<circle cx="${140 + c * 40}" cy="${215 + r * 52}" r="16"/>`).join('')).join('')}`,
  serum: `<path d="M160 210 h80 v120 c 0 14 -10 22 -22 22 h-36 c -12 0 -22 -8 -22 -22 z"/><rect x="176" y="182" width="48" height="28" rx="4"/>
    <path d="M190 182 v-40 c 0 -16 20 -16 20 0 v40"/><path d="M200 230 c -12 16 -12 28 0 34 c 12 -6 12 -18 0 -34 z" stroke-width="1.6"/>`,
  creme: `<path d="M120 230 h160 v80 c 0 22 -18 34 -40 34 h-80 c -22 0 -40 -12 -40 -34 z"/><rect x="112" y="196" width="176" height="34" rx="10"/>
    <path d="M150 280 h100" stroke-width="1.6"/>`,
  bisnaga: `<path d="M160 120 h80 l-10 200 h-60 z"/><rect x="176" y="320" width="48" height="34" rx="6"/><path d="M160 120 l6 -12 h68 l6 12" stroke-width="1.6"/><path d="M176 200 h48 M182 220 h36" stroke-width="1.6"/>`,
  oleo: `<path d="M170 200 c -30 20 -40 60 -40 100 c 0 30 20 50 70 50 s 70 -20 70 -50 c 0 -40 -10 -80 -40 -100 z"/><rect x="180" y="160" width="40" height="40" rx="4"/>
    <path d="M192 160 v-34 h16 v34"/><path d="M160 290 c 20 10 60 10 80 0" stroke-width="1.6"/>`
};
function arte(tipo, id) {
  const t = String(tipo || '').split(':')[0];
  const corpo = D[t] || D.perfume;
  const lado = id % 2 ? 1 : -1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 460">
<defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#fbf5ec"/><stop offset="1" stop-color="#efe2cf"/></radialGradient></defs>
<rect width="400" height="460" fill="url(#g)"/>
<circle cx="200" cy="240" r="168" fill="none" stroke="${O2}" stroke-width="1.2" opacity=".55"/>
${folha(lado > 0 ? 330 : 70, 420, lado * 18, .9)}
<g fill="none" stroke="${O}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${corpo}</g>
</svg>`;
}
module.exports = { arte };
