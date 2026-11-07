// Aplica a identidade oficial (kit HitSlice_FoxGrab_Pacote_Geral, 07/11/2026) numa CÓPIA da página: app/public-nova.
// Uso (no servidor): node aplicar-marca.mjs foxgrab|hitslice <pasta public-nova>
// Não mexe na página no ar (app/public). Para publicar: trocar o volume do compose para ./app/public-nova (só com ordem do dono).
// Regras do kit: SVGs oficiais como imagem (sem redesenhar), paletas e fontes separadas.
// 07/11/2026: o DONO pediu de volta "by NINEFOX" no topo e o rodapé NINEFOX (com link para ninefox.com.br) — decisão dele, vale sobre o kit.
import fs from 'fs';
import path from 'path';

const [, , marca, dir] = process.argv;
if (!['foxgrab', 'hitslice'].includes(marca) || !dir) { console.error('uso: node aplicar-marca.mjs foxgrab|hitslice <pasta>'); process.exit(1); }
const F = (n) => path.join(dir, n);
const ler = (n) => fs.readFileSync(F(n), 'utf8');
const grava = (n, s) => { if (/�/.test(s)) throw new Error(n + ': caractere corrompido'); fs.writeFileSync(F(n), s); };
function troca(n, pares) {
  let s = ler(n);
  for (const [a, b, obrig = true] of pares) {
    const q = typeof a === 'string' ? s.split(a).length - 1 : (s.match(a) || []).length;
    if (!q) { if (obrig) throw new Error(`${n}: não achei ${String(a).slice(0, 70)}`); continue; }
    s = typeof a === 'string' ? s.split(a).join(b) : s.replace(a, b);
  }
  grava(n, s); console.log('ok', n);
}

const M = {
  foxgrab: {
    nome: 'FoxGrab', pref: 'FoxGrab', fonte: 'Manrope', w: 1018, h: 306,
    vars: '--bg: #18152B; --vidro: rgba(36, 31, 66, .72); --vidro-2: rgba(241, 238, 255, .05); --borda: rgba(241, 238, 255, .10); --borda-2: rgba(241, 238, 255, .18);\n  --txt: #F1EEFF; --sub: #B9B3DA; --fraco: #8A84AE;\n  --m: #6554F0; --m-2: #5442E0; --m-txt: #FFFFFF;',
    rgbVelho: /rgba\(46, ?230, ?176,/g, rgbNovo: 'rgba(101, 84, 240,',
  },
  hitslice: {
    nome: 'HitSlice', pref: 'HitSlice', fonte: 'Sora', w: 1041, h: 306,
    vars: '--bg: #171717; --vidro: rgba(34, 34, 31, .76); --vidro-2: rgba(243, 241, 231, .05); --borda: rgba(243, 241, 231, .10); --borda-2: rgba(243, 241, 231, .18);\n  --txt: #F3F1E7; --sub: #BDBAB0; --fraco: #8C8A82;\n  --m: #D7FF3F; --m2: #C2EB2A; --m-txt: #171717;',
    rgbVelho: /rgba\(255, ?92, ?40,/g, rgbNovo: 'rgba(215, 255, 63,',
  },
}[marca];

// ---------- index.html ----------
const logoHTML = `<a class="marca" href="/" aria-label="${M.nome} by NINEFOX"><picture><source media="(max-width: 480px)" srcset="marca/${M.pref}-icone-negativa.svg"><img class="brand-logo" src="marca/${M.pref}-logo-negativa.svg" alt="${M.nome}" width="${M.w}" height="${M.h}"></picture></a>`;
troca('index.html', [
  [/<a class="marca" href="\/" aria-label="[^"]*"><img class="logo-nf"[^>]*><\/a>/, logoHTML],
  [/<a class="topo-link" href="https:\/\/(ninefox\.com\.br|foxgrab\.ninefox\.com\.br)\/"[^>]*>[\s\S]*?<\/a>/, '<a class="topo-link" href="https://ninefox.com.br/" target="_blank" rel="noopener">by NINEFOX <span aria-hidden="true">↗</span></a>'],
  [/<link rel="icon" href="icone\.svg\?v=\d+" type="image\/svg\+xml">/, '<link rel="icon" href="marca/favicon.svg?v=3" type="image/svg+xml">\n<link rel="icon" href="marca/favicon.ico?v=3" sizes="any">\n<link rel="apple-touch-icon" href="marca/apple-touch-icon.png?v=3">'],
  [/\n<link rel="icon" href="icone-192\.png\?v=\d+"[^>]*>/, '', false],
  [/\n<link rel="apple-touch-icon" href="apple-touch-icon\.png\?v=\d+">/, '', false],
  [/manifest\.json\?v=\d+/, 'manifest.json?v=3'],
  [/<meta name="theme-color" content="#[0-9A-Fa-f]{6}">/, `<meta name="theme-color" content="${marca === 'foxgrab' ? '#18152B' : '#171717'}">`],
  [/og\.png\?v=\d+/, 'og.png?v=4'],
  [/estilo\.css\?v=\d+/, (s) => s.replace(/\d+$/, (n) => String(+n + 1))],
]);

// ---------- manifest ----------
const man = JSON.parse(ler('manifest.json'));
man.background_color = man.theme_color = marca === 'foxgrab' ? '#18152B' : '#171717';
man.icons = [{ src: 'marca/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  { src: `marca/${M.pref}-icone-192.png`, sizes: '192x192', type: 'image/png' },
  { src: `marca/${M.pref}-icone-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }];
grava('manifest.json', JSON.stringify(man, null, 2) + '\n'); console.log('ok manifest.json');

// ---------- estilo.css ----------
let css = ler('estilo.css');
css = css.replace(M.rgbVelho, M.rgbNovo);
const comum = `
/* ===== Identidade oficial ${M.nome} (kit 07/11/2026) — sobrescreve o tema anterior ===== */
@font-face { font-family: "${M.fonte}"; src: url("fonts/${M.fonte.toLowerCase()}-latin.woff2") format("woff2"); font-weight: 600 800; font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "${M.fonte}"; src: url("fonts/${M.fonte.toLowerCase()}-latin-ext.woff2") format("woff2"); font-weight: 600 800; font-display: swap;
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
:root {
  ${M.vars}
  --brand-primary: var(--m); --brand-dark: ${marca === 'foxgrab' ? '#18152B' : '#171717'}; --brand-light: ${marca === 'foxgrab' ? '#F1EEFF' : '#F3F1E7'};
  --font-heading: "${M.fonte}", "Inter", system-ui, sans-serif; --radius-card: 16px; --radius-control: 10px;
}
body { background: var(--bg); color: var(--txt); }
h1, h2, h3, .num, .rec-ic + h3 { font-family: var(--font-heading); }
h1 { letter-spacing: -.03em; }
.grad { background: none; -webkit-background-clip: border-box; background-clip: border-box; color: var(--m); }
.brand-logo { display: block; max-width: 100%; height: auto; object-fit: contain; }
.marca picture { display: block; line-height: 0; }
.marca .brand-logo { width: 170px; height: auto; }
@media (max-width: 480px) { .marca .brand-logo { width: 40px; height: auto; } }
:focus-visible { outline-color: var(--m); }
/* "by NINEFOX" no topo também no celular; some se faltar espaço (logado no HitSlice) */
@media (max-width: 640px) { .topo-link { display: inline-flex; font-size: 12px; white-space: nowrap; } .topo-dir:has(.conta-topo:not([hidden])) .topo-link { display: none; } }
`;
const especifico = marca === 'foxgrab' ? `
/* FoxGrab: simples, amigável, superfícies limpas; violeta nas ações */
.l1 { background: radial-gradient(circle, rgba(101, 84, 240, .45), transparent 65%); }
.l2 { background: radial-gradient(circle, rgba(241, 238, 255, .10), transparent 65%); }
.l3 { background: radial-gradient(circle, rgba(101, 84, 240, .22), transparent 65%); }
.grade { opacity: .5; }
.h1-speed { color: var(--txt); letter-spacing: -.02em; }
` : `
/* HitSlice: expressiva e energética; blocos de cor e diagonais do corte do símbolo */
.l1 { background: radial-gradient(circle, rgba(215, 255, 63, .30), transparent 65%); }
.l2 { background: radial-gradient(circle, rgba(243, 241, 231, .10), transparent 65%); }
.l3 { background: radial-gradient(circle, rgba(215, 255, 63, .14), transparent 65%); }
/* diagonais só nos cantos (fundo é fixo: faixa larga cruzaria o texto ao rolar); some no celular */
.fundo::before, .fundo::after { content: ""; position: absolute; right: -6%; width: 34%; background: var(--m); transform: rotate(-9deg); pointer-events: none; }
.fundo::before { bottom: 14%; height: 10px; opacity: .55; }
.fundo::after { bottom: calc(14% - 26px); height: 2px; opacity: .35; }
@media (max-width: 1100px) { .fundo::before, .fundo::after { display: none; } }
`;
css += comum + especifico;
grava('estilo.css', css); console.log('ok estilo.css');
console.log('FIM', marca);
