'use strict';
// Páginas da NINEFOX v2 (06/11/2026, dono: "mais inovador, está xoxo e tudo igual"; institucional diferente das vitrines).
// Identidade (kit do dono): laranja #FF5A1F em destaque (botão laranja = texto preto), preto #151515, branco quente #F5F2EC,
// Space Grotesk 500/700 + Inter 400/500/600; logos SEMPRE pelos SVGs de /marca. Nada de preço antigo/desconto/selo que a fonte não confirme.
// Vitrines: faixa correndo, "achado do momento" girando, cômodos (SHOP) / tipos e coleções (TCG), prateleiras, selo de menor preço em 7 dias,
// preço por booster (TCG), cards holográficos (TCG). Institucional: escuro, painel "ao vivo" com os números reais dos robôs, mosaico animado.
const { SITES } = require('./sites');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reais = (v) => 'R$ ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));
const urlDe = (s) => 'https://' + s.hosts[0];
const horaBR = (iso, comDia) => {
  if (!iso) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return (comDia ? `${p.day}/${p.month} às ` : '') + `${p.hour}h${p.minute}`;
};
const milhar = (n) => (n >= 1000 ? `+${Math.floor(n / 1000)} mil` : String(n));

// TCG: quantos boosters vêm no produto (só quando o NOME diz; booster avulso = 1) e coleção (pelo nome)
function boosters(i) {
  const m = /(\d+)\s*(boosters?|pacotes?|packs?)\b/i.exec(i.nome);
  if (m && +m[1] > 0 && +m[1] <= 60) return +m[1];
  if (i.cat === 'booster' && /booster/i.test(i.nome) && !/box|caixa|kit|blister|cole[cç][aã]o|\d+\s*x\b/i.test(i.nome)) return 1;
  return 0;
}
const COLECOES = ['151', 'Evoluções Prismáticas', 'Fagulhas Impetuosas', 'Coroa Estelar', 'Destinos de Paldea', 'Forças Temporais', 'Máscaras do Crepúsculo',
  'Rivais Predestinados', 'Amigos de Jornada', 'Chamas Obsidianas', 'Fenda Paradoxal', 'Evoluções em Paldea', 'Megaevolução', 'Escarlate e Violeta'];
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const colecao = (nome) => COLECOES.find((c) => (c === '151' ? /\b151\b/.test(nome) : norm(nome).includes(norm(c)))) || '';

const I = { // ícones de linha (24px)
  lupa: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  zap: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20Z"/><path d="M9 8.8c0 3 2.6 6 6 6.4l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2L9 8.8Z" class="ch"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="ch"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  esq: '<path d="m15 6-6 6 6 6"/>', dir: '<path d="m9 6 6 6-6 6"/>',
  sala: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M3 11a2 2 0 0 1 2 2v2h14v-2a2 2 0 0 1 4 0v5H1v-5a2 2 0 0 1 2-2Z"/><path d="M5 18v2M19 18v2"/>',
  cozinha: '<path d="M4 10h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-3Z"/><path d="M2 10h20M9 4c0 1.5 1 1.5 1 3M13 4c0 1.5 1 1.5 1 3"/>',
  quarto: '<path d="M2 18v-7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7M2 15h20M2 18v2M22 18v2"/><rect x="5" y="9" width="5" height="3" rx="1"/>',
  banheiro: '<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2Z"/><path d="M6 12V5a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
  varanda: '<path d="M7 21h10l1-6H6l1 6Z"/><path d="M12 15V9M12 11c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 9c0-3 2-5 5-5 0 3-2 5-5 5Z"/>',
  booster: '<path d="M7 3l1.7 1.2L10.3 3 12 4.2 13.7 3l1.6 1.2L17 3v18l-1.7-1.2-1.6 1.2-1.7-1.2-1.7 1.2-1.6-1.2L7 21Z"/><circle cx="12" cy="12" r="2.5"/>',
  box: '<path d="M3 8h18v12H3z"/><path d="M2 5h20v3H2zM12 5v15"/>',
  deck: '<rect x="8" y="3" width="11" height="15" rx="2"/><path d="M5 6v13a2 2 0 0 0 2 2h9"/>',
  'acessórios': '<rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8.5" y="5" width="7" height="14" rx="1"/>',
};
const ic = (n, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${I[n] || ''}</svg>`;

function cabeca(titulo, descricao, tema, corpoCls) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descricao)}"><meta name="theme-color" content="${tema}">
<link rel="icon" href="/marca/favicon.svg" type="image/svg+xml"><link rel="icon" href="/marca/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/marca/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap">
<style>${CSS_BASE}`;
}

const CSS_BASE = `
:root{--or:#FF5A1F;--bk:#151515;--iv:#F5F2EC;--wh:#FFFFFF;--mu:#5E5A54;--mud:#BDB7AE;--li:#E3DED5;--lid:#2C2C2C;
--fh:"Space Grotesk",Arial,sans-serif;--fb:"Inter",Arial,sans-serif;--rc:16px;--rk:10px;--gut:16px;--max:1240px}
@media (min-width:1024px){:root{--gut:32px}}
*{box-sizing:border-box}[hidden]{display:none!important}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--fb);font-size:16px;line-height:1.5;background:var(--iv);color:var(--bk);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit}img{max-width:100%}
svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}svg .ch{fill:currentColor;stroke:none}
:focus-visible{outline:3px solid var(--bk);outline-offset:3px;border-radius:6px}
.dk :focus-visible{outline-color:var(--iv)}
.in{max-width:var(--max);margin:0 auto;padding:0 var(--gut)}
.pular{position:absolute;left:-999px;top:8px;z-index:20;background:var(--or);color:var(--bk);padding:8px 16px;border-radius:var(--rk);font-weight:600}.pular:focus{left:16px}
h1,h2,h3{font-family:var(--fh);font-weight:700;letter-spacing:-.025em;margin:0}
.logo{display:block;height:auto;object-fit:contain}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;border-radius:var(--rk);border:2px solid transparent;font:600 16px var(--fb);text-decoration:none;cursor:pointer;white-space:nowrap;transition:background .2s,color .2s,transform .2s}
.btn:hover{transform:translateY(-1px)}
.btn.or{background:var(--or);color:var(--bk)}.btn.or:hover{background:#ff7a47}
.btn.bk{background:var(--bk);color:var(--iv)}.btn.bk:hover{background:#2b2b2b}
.btn.ln{border-color:currentColor;background:transparent}.btn.ln:hover{background:#1515150d}.dk .btn.ln:hover{background:#ffffff14}
.btn[aria-disabled=true]{opacity:.5;cursor:default;transform:none}
.dk{background:var(--bk);color:var(--iv)}
.tag{display:inline-flex;align-items:center;gap:6px;font:600 12px var(--fb);letter-spacing:.02em;padding:5px 9px;border-radius:7px;line-height:1}
.tag.bk{background:var(--bk);color:var(--iv)}.tag.or{background:var(--or);color:var(--bk)}.tag.iv{background:var(--iv);color:var(--bk);border:1px solid var(--li)}
.pulso{width:9px;height:9px;border-radius:50%;background:var(--or);box-shadow:0 0 0 0 #ff5a1f99;animation:pulso 1.8s infinite}
@keyframes pulso{70%{box-shadow:0 0 0 10px #ff5a1f00}100%{box-shadow:0 0 0 0 #ff5a1f00}}
.rv{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease}.rv.vis{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.rv{opacity:1;transform:none}}
`;
const JS_REVELA = `(function(){var o='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vis');o.unobserve(e.target)}})},{threshold:.12}):null;[].forEach.call(document.querySelectorAll('.rv'),function(el){o?o.observe(el):el.classList.add('vis')})})();`;

// ======================= VITRINE (SHOP / TCG) =======================
function card(i, site, exemplo, extraCls = '') {
  const tag = i.link ? 'a' : 'div';
  const attrs = i.link ? ` href="${esc(i.link)}" target="_blank" rel="nofollow sponsored noopener"` : '';
  const nb = site.id === 'tcg' ? boosters(i) : 0, col = site.id === 'tcg' ? colecao(i.nome) : '';
  const selos = [i.desconto ? `<span class="tag bk">-${i.desconto}%</span>` : '', i.menor7 ? '<span class="tag or">menor preço em 7 dias</span>' : '', i.novo ? '<span class="tag iv">chegou agora</span>' : ''].join('');
  return `<${tag} class="card ${extraCls}"${attrs} data-cat="${esc(i.cat)}" data-col="${esc(col)}" data-preco="${i.preco}" data-desc="${i.desconto}" data-vendas="${i.vendas}" data-pb="${nb ? (i.preco / nb).toFixed(2) : ''}" data-busca="${esc(norm(i.nome + ' ' + col))}">
<div class="foto">${i.img ? `<img loading="lazy" decoding="async" src="${esc(i.img)}" alt="" width="400" height="400">` : ''}<div class="selos">${selos}</div>${exemplo ? '<span class="ex">exemplo</span>' : ''}</div>
<div class="info"><div class="cat">${esc(col || i.cat)} · Shopee</div><div class="nome">${esc(i.nome)}</div>
<div class="pr">${i.precoDe ? `<s>${reais(i.precoDe)}</s>` : ''}<b>${reais(i.preco)}</b></div>
${nb > 1 ? `<div class="pb">${reais(i.preco / nb)} <span>por booster · ${nb} boosters</span></div>` : ''}
<div class="prova">${i.nota ? `★ ${i.nota.toFixed(1)}` : ''}${i.vendas ? ` · ${milhar(i.vendas)} vendidos` : ''}</div>
<span class="btn or ver">${exemplo ? 'exemplo' : 'ver oferta'}</span></div></${tag}>`;
}

function vitrine(site, dados) {
  const itens = dados.itens || [], ex = dados.exemplo, tcg = site.id === 'tcg';
  const cats = site.ofertas.grupos.map((g) => g.cat).filter((c) => itens.some((i) => i.cat === c));
  const cols = tcg ? [...new Set(itens.map((i) => colecao(i.nome)).filter(Boolean))] : [];
  const top = itens.slice(0, 5);
  const teto = tcg ? 50 : 30;
  const prateleiras = [
    ['maior desconto hoje', [...itens].filter((i) => i.desconto).sort((a, b) => b.desconto - a.desconto)],
    [`até ${reais(teto).replace(',00', '')}`, itens.filter((i) => i.preco <= teto)],
    ['mais vendidos', [...itens].sort((a, b) => b.vendas - a.vendas)],
    tcg ? ['melhor preço por booster', [...itens].filter((i) => boosters(i) > 1).sort((a, b) => a.preco / boosters(a) - b.preco / boosters(b))] : ['chegou agora', itens.filter((i) => i.novo)],
  ].filter(([, l]) => l.length >= 2).map(([t, l]) => [t, l.slice(0, 12)]);
  const fila = itens.slice(0, 14).map((i) => `<span>${esc(i.nome.length > 48 ? i.nome.slice(0, 46) + '…' : i.nome)} <b>${reais(i.preco)}</b></span>`).join('<i>🦊</i>');
  const zapBtn = (cls, txt = 'grupo no WhatsApp') => (site.zap ? `<a class="btn ${cls}" href="${esc(site.zap)}" target="_blank" rel="noopener">${ic('zap')}${txt}</a>` : `<span class="btn ${cls}" aria-disabled="true" title="em breve">${ic('zap')}grupo em breve</span>`);
  const topJSON = JSON.stringify(top.map((i) => ({ n: i.nome, p: i.preco, d: i.precoDe, pc: i.desconto, img: i.img, l: i.link, c: tcg ? colecao(i.nome) || i.cat : i.cat, nb: tcg ? boosters(i) : 0, m7: !!i.menor7 }))).replace(/</g, '\\u003c');
  return cabeca(site.titulo, site.descricao, '#151515') + `
main{overflow-x:clip}
.fita{background:var(--or);color:var(--bk);overflow:hidden;white-space:nowrap;font:500 14px var(--fb);height:38px;display:flex;align-items:center}
.fita .trilho{display:inline-flex;gap:28px;padding-left:28px;animation:corre 60s linear infinite}
.fita:hover .trilho{animation-play-state:paused}
.fita b{font-weight:700}.fita i{font-style:normal}
@keyframes corre{to{transform:translateX(-50%)}}
.topo{position:sticky;top:0;z-index:10}
.topo .in{display:flex;align-items:center;gap:16px;min-height:88px}
.topo .logo{width:220px;flex:0 0 auto}
.topo nav{margin-left:auto;display:flex;align-items:center;gap:8px}
.pbusca{display:inline-flex;align-items:center;gap:8px;min-height:48px;min-width:240px;padding:0 16px;border-radius:999px;border:1px solid var(--lid);color:var(--mud);text-decoration:none}
.pbusca:hover{border-color:var(--or);color:var(--iv)}
/* palco: achado do momento */
.palco{display:grid;grid-template-columns:1fr 1.05fr;gap:40px;align-items:center;padding-top:48px;padding-bottom:24px}
.palco h1{font-size:clamp(40px,5.6vw,68px);line-height:.98}.palco h1 .l2{display:block;color:var(--or)}
.palco p{margin:20px 0 28px;font-size:18px;color:var(--mu);max-width:520px}
.palco .acoes{display:flex;gap:12px;flex-wrap:wrap}
.nums{display:flex;gap:28px;margin-top:32px;flex-wrap:wrap}.nums div{font-size:14px;color:var(--mu)}.nums b{display:block;font:700 30px var(--fh);color:var(--bk);letter-spacing:-.02em}
.dest{position:relative;background:var(--wh);border:1px solid var(--li);border-radius:24px;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px;box-shadow:0 30px 60px -30px #15151540}
.dest:before{content:"";position:absolute;inset:-14px -14px auto auto;width:120px;height:120px;background:var(--or);border-radius:24px;z-index:-1;transform:rotate(8deg)}
.dest .rot{position:absolute;top:-14px;left:20px}
.dest .im{aspect-ratio:1/1;border-radius:16px;background:var(--iv);display:grid;place-items:center;overflow:hidden}
.dest .im img{width:88%;height:88%;object-fit:contain;transition:opacity .35s,transform .35s}
.dest .tx{display:flex;flex-direction:column;gap:8px;min-width:0}
.dest .cat{font-size:13px;color:var(--mu)}.dest h2{font-size:22px;line-height:1.15;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.dest s{color:var(--mu);font-size:15px}.dest .vale{font:700 44px var(--fh);letter-spacing:-.03em;line-height:1}
.dest .pbx{font-size:14px;color:var(--mu)}
.dest .btn{margin-top:auto}
.dest .pontos{position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);display:flex;gap:8px}
.dest .pontos button{width:28px;height:6px;border-radius:9px;border:0;background:var(--li);cursor:pointer;padding:0}.dest .pontos button.on{background:var(--bk)}
.dest.trocando img,.dest.trocando .tx{opacity:0;transform:translateY(8px)}
.dest .tx{transition:opacity .35s,transform .35s}
/* cômodos / tipos */
.sec{margin-top:72px;scroll-margin-top:110px}
.sec>h2,.cab h2{font-size:clamp(28px,3.6vw,40px);line-height:1.05}
.tiles{display:grid;grid-template-columns:repeat(${tcg ? 4 : 5},1fr);gap:12px;margin-top:20px}
.tile{position:relative;overflow:hidden;min-height:150px;border-radius:var(--rc);padding:18px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;border:1px solid var(--li);background:var(--wh);text-align:left;font:inherit;color:inherit}
.tile svg{width:44px;height:44px;stroke-width:1.5}
.tile b{font:700 22px var(--fh);letter-spacing:-.02em}.tile small{display:block;color:var(--mu);font-size:14px;font-weight:400}
.tile:after{content:"";position:absolute;right:-30px;bottom:-30px;width:90px;height:90px;border-radius:50%;background:var(--or);transform:scale(0);transition:transform .35s}
.tile:hover:after,.tile.on:after{transform:scale(1)}
.tile:nth-child(2n){background:var(--bk);color:var(--iv);border-color:var(--bk)}.tile:nth-child(2n) small{color:var(--mud)}
.tile.on{outline:3px solid var(--or);outline-offset:2px}
/* prateleiras */
.prat{margin-top:56px}
.prat .cab{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.prat .setas{display:flex;gap:8px}.prat .setas button{width:44px;height:44px;border-radius:50%;border:1px solid var(--li);background:var(--wh);display:grid;place-items:center;cursor:pointer}
.prat .setas button:hover{border-color:var(--bk)}
.trilha{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,250px);gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:20px 2px 12px;scrollbar-width:none}
.trilha::-webkit-scrollbar{display:none}.trilha .card{scroll-snap-align:start}
/* cards */
.card{position:relative;display:flex;flex-direction:column;background:var(--wh);border:1px solid var(--li);border-radius:var(--rc);overflow:hidden;text-decoration:none;color:inherit;transition:border-color .2s,transform .25s,box-shadow .25s}
a.card:hover{border-color:var(--bk);transform:translateY(-3px);box-shadow:0 18px 40px -24px #15151566}
.foto{position:relative;aspect-ratio:1/1;background:var(--wh);border-bottom:1px solid var(--li)}
.foto img{position:absolute;inset:10px;width:calc(100% - 20px);height:calc(100% - 20px);object-fit:contain;transition:transform .3s}
a.card:hover .foto img{transform:scale(1.05)}
.selos{position:absolute;left:10px;top:10px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.ex{position:absolute;right:10px;top:10px;font-size:11px;font-weight:600;padding:3px 7px;border-radius:6px;background:#15151514;color:var(--mu)}
.info{display:flex;flex-direction:column;gap:4px;padding:12px 14px 16px;flex:1}
.info .cat{font-size:13px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nome{font-weight:500;font-size:15px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:40px}
.pr{display:flex;flex-direction:column;margin-top:4px}.pr s{font-size:14px;color:var(--mu)}.pr b{font:700 26px var(--fh);letter-spacing:-.02em;line-height:1.1}
.pb{font:600 15px var(--fb)}.pb span{font-weight:400;color:var(--mu);font-size:13px}
.prova{font-size:13px;color:var(--mu);min-height:20px}
.ver{margin-top:auto;min-height:44px}.info .ver{margin-top:10px}
a.card:hover .ver{background:var(--bk);color:var(--iv)}
${tcg ? `/* holo (TCG) */
.tcg .card{transform-style:preserve-3d;will-change:transform}
.tcg a.card:hover{transform:perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(-3px)}
.tcg .card .foto:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;mix-blend-mode:color-dodge;
background:radial-gradient(circle at var(--mx,50%) var(--my,50%),#ffffffcc 0,#ffd4c055 18%,transparent 45%),linear-gradient(115deg,transparent 30%,#ff5a1f33 45%,#ffe9a833 52%,#9fd8ff33 60%,transparent 75%);background-size:100% 100%,250% 250%;background-position:center,var(--mx,50%) var(--my,50%)}
.tcg a.card:hover .foto:after{opacity:1}` : ''}
/* lista completa */
.busca{position:relative;display:block;margin-top:20px}
.busca input{width:100%;min-height:54px;border:1px solid var(--li);border-radius:var(--rk);padding:0 16px 0 48px;font:400 16px var(--fb);background:var(--wh);color:var(--bk)}
.busca input::placeholder{color:var(--mu)}.busca input:focus{outline:none;border-color:var(--bk);box-shadow:0 0 0 3px #ff5a1f55}
.busca svg{position:absolute;left:16px;top:17px;color:var(--mu)}
.filtros{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px}
.chips{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:thin;flex:1}
.chip{flex:0 0 auto;min-height:44px;border:1px solid var(--li);border-radius:999px;padding:0 16px;background:var(--wh);color:var(--bk);font:500 15px var(--fb);cursor:pointer;display:flex;align-items:center;gap:8px}
.chip small{color:var(--mu);font-weight:600;font-size:13px}.chip:hover{border-color:var(--bk)}
.chip.on{background:var(--bk);border-color:var(--bk);color:var(--iv)}.chip.on small{color:var(--or)}
select{min-height:44px;border:1px solid var(--li);border-radius:var(--rk);background:var(--wh);padding:0 12px;font:500 15px var(--fb);color:var(--bk);cursor:pointer}
.qtd{color:var(--mu);font-size:15px}
.grade{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px 0}
@media (min-width:768px){.grade{grid-template-columns:repeat(3,1fr);gap:16px}}
@media (min-width:1100px){.grade{grid-template-columns:repeat(4,1fr);gap:20px}}
.vazio{grid-column:1/-1;text-align:center;padding:56px 16px;background:var(--wh);border:1px dashed var(--li);border-radius:var(--rc);color:var(--mu)}
.vazio b{display:block;font:700 24px var(--fh);color:var(--bk);margin-bottom:8px}
.aviso{margin:16px 0 0;padding:12px 16px;border-radius:var(--rk);border:1px dashed var(--bk);font-size:15px;background:var(--wh)}
.convite{margin-top:72px;border-radius:24px;padding:48px 40px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;position:relative;overflow:hidden}
.convite h2{font-size:clamp(30px,4vw,46px);line-height:1.02;max-width:620px}.convite p{margin:12px 0 0;color:var(--mud);max-width:520px}
.convite .acoes{display:flex;gap:12px;flex-wrap:wrap;position:relative}
.convite .raposa{position:absolute;right:-40px;bottom:-60px;width:260px;opacity:.12}
.flutua{position:fixed;right:16px;bottom:16px;z-index:15;box-shadow:0 10px 30px -10px #15151599;display:none}
footer{border-top:1px solid var(--li);margin-top:72px}
footer .in{padding-top:32px;padding-bottom:48px;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;font-size:14px;color:var(--mu)}
footer b{color:var(--bk);font-weight:600}footer a{color:var(--bk);font-weight:500}footer .marcas{display:flex;gap:16px;flex-wrap:wrap}
@media (max-width:900px){.palco{grid-template-columns:1fr;gap:56px}.tiles{grid-template-columns:repeat(${tcg ? 2 : 3},1fr)}.convite{grid-template-columns:1fr}}
@media (max-width:640px){.topo .in{min-height:76px}.topo .logo{width:200px}.pbusca{min-width:0;width:48px;padding:0;justify-content:center}.pbusca span,.zaptxt{display:none}
.palco{padding-top:28px}.palco p{font-size:16px}.dest{grid-template-columns:1fr;padding:14px}.dest:before{inset:-10px -4px auto auto;width:80px;height:80px}.dest .vale{font-size:38px}
.tiles{grid-template-columns:repeat(2,1fr)}.tile{min-height:120px}.tile b{font-size:19px}.pr b{font-size:22px}.nome{font-size:14px}
.convite{padding:36px 22px}.flutua{display:inline-flex}}
</style></head><body class="${site.id}">
<a class="pular" href="#ofertas">pular para as ofertas</a>
${fila ? `<div class="fita" aria-label="Ofertas em destaque"><div class="trilho"><span>🦊 <b>no radar agora:</b></span>${fila}<i>🦊</i>${fila}</div></div>` : ''}
<header class="topo dk"><div class="in">
<a href="/" aria-label="${esc(site.nome)}, início"><img class="logo" src="/marca/${site.logo}-negativa.svg" alt="${esc(site.nome)}" width="1042" height="393"></a>
<nav aria-label="Principal"><a class="pbusca" href="#ofertas" id="abrebusca" aria-label="Buscar ofertas">${ic('lupa')}<span>buscar ofertas</span></a>
${site.zap ? `<a class="btn or" href="${esc(site.zap)}" target="_blank" rel="noopener" aria-label="Grupo no WhatsApp">${ic('zap')}<span class="zaptxt">grupo</span></a>` : ''}</nav>
</div></header>
<main>
<section class="in palco" aria-labelledby="t1"><div>
<h1 id="t1">${esc(site.hero[0])}<span class="l2">${esc(site.hero[1])}</span></h1>
<p>${esc(site.sub)}</p>
<div class="acoes"><a class="btn or" href="#ofertas">ver todas as ofertas ${ic('seta')}</a>${zapBtn('ln')}</div>
<div class="nums"><div><b>${itens.length}</b>ofertas no radar</div>${dados.em && !ex ? `<div><b>${horaBR(dados.em)}</b>última conferência</div>` : ''}<div><b>${cats.length}</b>${tcg ? 'tipos de produto' : 'cômodos'}</div></div></div>
${top.length ? `<div class="dest" id="dest" aria-live="polite"><span class="tag bk rot"><span class="pulso"></span>achado do momento</span>
<div class="im"><img id="d-img" src="${esc(top[0].img)}" alt="" width="400" height="400"></div>
<div class="tx"><span class="cat" id="d-cat"></span><h2 id="d-nome"></h2><div><s id="d-de"></s></div><div class="vale" id="d-preco"></div><div class="pbx" id="d-pb"></div><div id="d-selo"></div>
<a class="btn or" id="d-link" target="_blank" rel="nofollow sponsored noopener">ver oferta ${ic('seta')}</a></div>
<div class="pontos" role="tablist" aria-label="Escolher achado">${top.map((_, k) => `<button role="tab" aria-label="Achado ${k + 1}" data-k="${k}"></button>`).join('')}</div></div>` : ''}
</section>
${ex ? '<div class="in"><p class="aviso"><b>Dados de exemplo:</b> produtos e ilustrações só para ver o layout, sem links. As ofertas reais (com foto) entram quando a API de afiliados da NINEFOX for ligada.</p></div>' : ''}
${cats.length ? `<section class="in sec rv" aria-labelledby="t-cats"><h2 id="t-cats">${tcg ? 'o que você procura?' : 'navegue pelo cômodo'}</h2>
<div class="tiles">${cats.map((c) => `<button class="tile" data-ir="${esc(c)}" aria-label="Ver ${esc(c)}">${ic(c)}<span><b>${esc(c)}</b><small>${itens.filter((i) => i.cat === c).length} ofertas</small></span></button>`).join('')}</div></section>` : ''}
${prateleiras.map(([t, l], k) => `<section class="in prat rv" aria-labelledby="pt${k}"><div class="cab"><h2 id="pt${k}">${esc(t)}</h2><div class="setas"><button aria-label="Voltar" data-t="${k}" data-d="-1">${ic('esq')}</button><button aria-label="Avançar" data-t="${k}" data-d="1">${ic('dir')}</button></div></div>
<div class="trilha" id="tr${k}">${l.map((i) => card(i, site, ex)).join('')}</div></section>`).join('')}
<section class="in sec" id="ofertas" aria-labelledby="t2">
<div class="cab" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><h2 id="t2">todas as ofertas</h2><span class="qtd" id="qtd" aria-live="polite">${itens.length} ${itens.length === 1 ? 'produto' : 'produtos'}</span></div>
<label class="busca">${ic('lupa')}<input id="q" type="search" placeholder="${esc(site.busca)}" autocomplete="off" aria-label="Buscar oferta"></label>
<div class="filtros"><div class="chips" role="group" aria-label="Filtrar"><button class="chip on" data-c="" aria-pressed="true">tudo <small>${itens.length}</small></button>${cats.map((c) => `<button class="chip" data-c="${esc(c)}" aria-pressed="false">${esc(c)} <small>${itens.filter((i) => i.cat === c).length}</small></button>`).join('')}${cols.map((c) => `<button class="chip" data-col="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div>
<label><span hidden>Ordenar</span><select id="ord" aria-label="Ordenar ofertas"><option value="rel">mais relevantes</option><option value="desc">maior desconto</option><option value="menor">menor preço</option><option value="vendas">mais vendidos</option>${tcg ? '<option value="pb">menor preço por booster</option>' : ''}</select></label></div>
<div class="grade" id="lista">${itens.map((i) => card(i, site, ex)).join('\n') || '<div class="vazio"><b>ofertas chegando</b>Estamos ligando a busca de ofertas. Entre no grupo para receber as primeiras.</div>'}<div class="vazio" id="nada" hidden><b>nada por aqui</b>Tente outra palavra ou filtro.</div></div>
</section>
<section class="in"><div class="convite dk rv"><img class="raposa" src="/marca/ninefox-icone-principal.svg" alt="" width="324" height="371"><div><h2>a próxima oferta chega primeiro no grupo.</h2><p>Todo dia tem achado novo no WhatsApp e no Instagram da ${esc(site.nome)}.</p></div>
<div class="acoes">${zapBtn('or')}${site.insta ? `<a class="btn ln" href="${esc(site.insta)}" target="_blank" rel="noopener">${ic('ig')}Instagram</a>` : ''}</div></div></section>
</main>
${site.zap ? `<a class="btn or flutua" href="${esc(site.zap)}" target="_blank" rel="noopener">${ic('zap')}receba no zap</a>` : ''}
<footer><div class="in"><div><b>Links de afiliado:</b> podemos receber uma comissão se você comprar por eles, sem custo a mais para você.<br>Preços e disponibilidade são da Shopee no horário indicado e podem mudar.</div>
<div class="marcas"><a href="${esc(urlDe(SITES.inst))}">NINEFOX</a><a href="${esc(urlDe(SITES.shop))}">NINEFOX SHOP</a><a href="${esc(urlDe(SITES.tcg))}">NINEFOX TCG</a></div></div></footer>
<script type="application/json" id="top">${topJSON}</script>
<script>
(function(){
var R=function(v){return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})};
var top=JSON.parse(document.getElementById('top').textContent),dest=document.getElementById('dest'),k=0,timer=null;
function anima(el,de,ate){if(!de||window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=R(ate);return}var t0=performance.now();(function f(t){var p=Math.min(1,(t-t0)/900),e=1-Math.pow(1-p,3);el.textContent=R(de+(ate-de)*e);if(p<1)requestAnimationFrame(f)})(t0)}
function mostra(i){if(!dest||!top.length)return;k=i;var o=top[i];dest.classList.add('trocando');setTimeout(function(){
document.getElementById('d-img').src=o.img;document.getElementById('d-cat').textContent=o.c+' · Shopee';document.getElementById('d-nome').textContent=o.n;
document.getElementById('d-de').textContent=o.d?'de '+R(o.d):'';anima(document.getElementById('d-preco'),o.d,o.p);
document.getElementById('d-pb').textContent=o.nb>1?R(o.p/o.nb)+' por booster ('+o.nb+' boosters)':'';
document.getElementById('d-selo').innerHTML=(o.pc?'<span class="tag bk">-'+o.pc+'%</span> ':'')+(o.m7?'<span class="tag or">menor preço em 7 dias</span>':'');
var a=document.getElementById('d-link');if(o.l){a.href=o.l;a.removeAttribute('aria-disabled');a.firstChild.textContent='ver oferta '}else{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.firstChild.textContent='exemplo '}
[].forEach.call(dest.querySelectorAll('.pontos button'),function(b,j){b.classList.toggle('on',j===i);b.setAttribute('aria-selected',j===i)});dest.classList.remove('trocando')},220)}
function roda(){clearInterval(timer);timer=setInterval(function(){mostra((k+1)%top.length)},6000)}
if(dest){mostra(0);roda();dest.addEventListener('mouseenter',function(){clearInterval(timer)});dest.addEventListener('mouseleave',roda);
[].forEach.call(dest.querySelectorAll('.pontos button'),function(b){b.addEventListener('click',function(){mostra(+b.dataset.k);roda()})})}
[].forEach.call(document.querySelectorAll('.setas button'),function(b){b.addEventListener('click',function(){var t=document.getElementById('tr'+b.dataset.t);t.scrollBy({left:t.clientWidth*0.8*b.dataset.d,behavior:'smooth'})})});
var q=document.getElementById('q'),ord=document.getElementById('ord'),lista=document.getElementById('lista'),qtd=document.getElementById('qtd'),nada=document.getElementById('nada'),cat='',col='',cards=[].slice.call(lista.querySelectorAll('.card')),orig=cards.slice();
function tira(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}
function filtra(){var t=tira(q.value),n=0;cards.forEach(function(c){var ok=(!cat||c.dataset.cat===cat)&&(!col||c.dataset.col===col)&&(!t||c.dataset.busca.indexOf(t)>=0);c.hidden=!ok;if(ok)n++});nada.hidden=n>0||!cards.length;qtd.textContent=n+(n===1?' produto':' produtos')}
function ordena(){var o=ord.value,l=o==='rel'?orig.slice():cards.slice().sort(function(a,b){if(o==='desc')return b.dataset.desc-a.dataset.desc;if(o==='menor')return a.dataset.preco-b.dataset.preco;if(o==='pb'){var x=+a.dataset.pb||1e9,y=+b.dataset.pb||1e9;return x-y}return b.dataset.vendas-a.dataset.vendas});l.forEach(function(c){lista.insertBefore(c,nada)})}
function marca(fn){[].forEach.call(document.querySelectorAll('.chip'),function(x){var on=fn(x);x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)})}
q.addEventListener('input',filtra);ord.addEventListener('change',ordena);
[].forEach.call(document.querySelectorAll('.chip'),function(b){b.addEventListener('click',function(){if(b.dataset.col!==undefined){col=col===b.dataset.col?'':b.dataset.col}else{cat=b.dataset.c;col=''}marca(function(x){return x.dataset.col!==undefined?x.dataset.col===col:x.dataset.c===cat});filtra()})});
[].forEach.call(document.querySelectorAll('.tile'),function(t){t.addEventListener('click',function(){cat=t.dataset.ir;col='';marca(function(x){return x.dataset.c===cat});[].forEach.call(document.querySelectorAll('.tile'),function(y){y.classList.toggle('on',y===t)});filtra();document.getElementById('ofertas').scrollIntoView()})});
document.getElementById('abrebusca').addEventListener('click',function(e){e.preventDefault();document.getElementById('ofertas').scrollIntoView();setTimeout(function(){q.focus({preventScroll:true})},300)});
[].forEach.call(document.querySelectorAll('.foto img'),function(i){i.addEventListener('error',function(){i.style.visibility='hidden'})});
if(document.body.classList.contains('tcg')&&window.matchMedia('(hover:hover)').matches){[].forEach.call(document.querySelectorAll('a.card'),function(c){c.addEventListener('mousemove',function(e){var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;c.style.setProperty('--ry',((x-.5)*10)+'deg');c.style.setProperty('--rx',((.5-y)*10)+'deg');c.style.setProperty('--mx',(x*100)+'%');c.style.setProperty('--my',(y*100)+'%')});c.addEventListener('mouseleave',function(){c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg')})})}
})();
${JS_REVELA}
</script></body></html>`;
}

// ======================= INSTITUCIONAL =======================
function institucional(site, cfg, vivo) {
  const contato = cfg.whatsapp ? `https://wa.me/${cfg.whatsapp}` : cfg.email ? `mailto:${cfg.email}` : '';
  const btnContato = (cls, txt = 'fale com a gente') => (contato ? `<a class="btn ${cls}" href="${esc(contato)}"${cfg.whatsapp ? ' target="_blank" rel="noopener"' : ''}>${txt} ${ic('seta')}</a>` : `<span class="btn ${cls}" aria-disabled="true">contato em breve</span>`);
  const contaShop = (vivo.porSite && vivo.porSite.shop) || 0, contaTcg = (vivo.porSite && vivo.porSite.tcg) || 0;
  const feed = vivo.ultimos.map((u) => `<li><span class="q">${esc(u.frente)}</span><span class="n">${esc(u.nome)}</span><b>${reais(u.preco)}</b></li>`).join('');
  return cabeca(site.titulo, site.descricao, '#151515') + `
body{background:var(--bk);color:var(--iv)}
.topo{position:absolute;top:0;left:0;right:0;z-index:10}
.topo .in{display:flex;align-items:center;gap:24px;min-height:88px}
.topo .logo{width:190px}
.topo nav{margin-left:auto;display:flex;align-items:center;gap:4px}
.topo nav a.lk{text-decoration:none;font-weight:500;padding:12px;border-radius:var(--rk);color:var(--iv)}.topo nav a.lk:hover{color:var(--or)}
/* hero escuro com a raposa gigante */
.hero{position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden;padding:120px 0 80px}
.hero .gigante{position:absolute;right:-8vw;top:50%;transform:translateY(-46%);width:min(62vw,760px);height:auto;opacity:.95;animation:respira 9s ease-in-out infinite}
@keyframes respira{50%{transform:translateY(-49%) scale(1.02)}}
.hero .faixa{position:absolute;left:-10%;bottom:-120px;width:70%;height:240px;background:var(--or);transform:rotate(-8deg);opacity:.95}
.hero .in{position:relative;display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center;width:100%}
.hero h1{font-size:clamp(48px,7.4vw,104px);line-height:.94}
.hero h1 em{font-style:normal;color:var(--or)}
.hero p{margin:24px 0 32px;font-size:19px;color:var(--mud);max-width:540px}
.hero .acoes{display:flex;gap:12px;flex-wrap:wrap}
.vivo{background:#151515e6;backdrop-filter:blur(10px);border:1px solid var(--lid);border-radius:20px;padding:22px}
.vivo .t{display:flex;align-items:center;gap:10px;font:600 14px var(--fb);color:var(--mud)}.vivo .t b{color:var(--iv)}
.vivo .ex{margin-left:auto;font-size:11px;padding:3px 7px;border-radius:6px;background:#ffffff14;color:var(--mud)}
.vivo .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}
.vivo .grid div{border:1px solid var(--lid);border-radius:12px;padding:12px}
.vivo .grid b{display:block;font:700 30px var(--fh);letter-spacing:-.02em;color:var(--iv)}.vivo .grid span{font-size:12px;color:var(--mud)}
.vivo ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.vivo li{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font-size:14px;padding:10px 12px;border-radius:10px;background:#ffffff08;animation:entra .6s both}
.vivo li:nth-child(2){animation-delay:.15s}.vivo li:nth-child(3){animation-delay:.3s}.vivo li:nth-child(4){animation-delay:.45s}.vivo li:nth-child(5){animation-delay:.6s}
@keyframes entra{from{opacity:0;transform:translateX(16px)}}
.vivo .q{font:600 11px var(--fb);color:var(--bk);background:var(--or);padding:3px 6px;border-radius:5px;white-space:nowrap}
.vivo .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--iv)}.vivo li b{font-family:var(--fh)}
.vivo .rod{margin-top:14px;font-size:13px;color:var(--mud)}
/* seções claras */
.claro{background:var(--iv);color:var(--bk)}
.sec{padding:96px 0}
.sec h2.g{font-size:clamp(36px,5.4vw,68px);line-height:1;max-width:900px}
.sec .lead{margin:18px 0 0;font-size:19px;color:var(--mu);max-width:640px}
.bento{display:grid;grid-template-columns:repeat(6,1fr);grid-auto-rows:minmax(150px,auto);gap:16px;margin-top:48px}
.bx{border-radius:22px;padding:26px;position:relative;overflow:hidden;border:1px solid var(--li);background:var(--wh)}
.bx h3{font-size:28px;line-height:1.05}.bx p{margin:10px 0 0;color:var(--mu);max-width:420px}
.bx.a{grid-column:span 4;grid-row:span 2;background:var(--bk);color:var(--iv);border-color:var(--bk)}.bx.a p{color:var(--mud)}
.bx.b{grid-column:span 2;grid-row:span 2}.bx.c{grid-column:span 2;background:var(--or);border-color:var(--or)}.bx.c p{color:var(--bk)}.bx.d{grid-column:span 4}
/* conversa animada */
.chat{margin-top:24px;display:flex;flex-direction:column;gap:10px;max-width:440px}
.chat div{max-width:80%;padding:10px 14px;border-radius:16px;font-size:15px;opacity:0;animation:fala 12s infinite}
.chat .c{align-self:flex-end;background:#ffffff1a;border-bottom-right-radius:4px}.chat .r{align-self:flex-start;background:var(--or);color:var(--bk);border-bottom-left-radius:4px}
.chat div:nth-child(2){animation-delay:1.5s}.chat div:nth-child(3){animation-delay:3s}.chat div:nth-child(4){animation-delay:4.5s}
@keyframes fala{0%{opacity:0;transform:translateY(8px)}5%,85%{opacity:1;transform:none}95%,100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.chat div{opacity:1}}
/* barras */
.barras{display:flex;align-items:flex-end;gap:8px;height:120px;margin-top:24px}
.barras i{flex:1;background:var(--bk);border-radius:6px 6px 2px 2px;transform-origin:bottom;animation:sobe 3.5s ease-in-out infinite alternate}
.barras i:nth-child(odd){background:var(--or)}
.barras i:nth-child(1){height:40%}.barras i:nth-child(2){height:65%;animation-delay:.3s}.barras i:nth-child(3){height:50%;animation-delay:.6s}.barras i:nth-child(4){height:85%;animation-delay:.9s}.barras i:nth-child(5){height:70%;animation-delay:1.2s}.barras i:nth-child(6){height:100%;animation-delay:1.5s}
@keyframes sobe{from{transform:scaleY(.55)}}
.mini{margin-top:18px;background:var(--wh);border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;max-width:260px}
.mini s{color:var(--mu);font-size:13px;display:block}.mini b{font:700 24px var(--fh)}
.mini span{font:600 12px var(--fb);background:var(--bk);color:var(--iv);padding:4px 8px;border-radius:6px}
.integra{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.integra span{border:1px solid var(--li);border-radius:999px;padding:8px 14px;font-weight:500;font-size:14px}
/* projetos */
.projs{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:48px}
.proj{position:relative;overflow:hidden;border-radius:24px;padding:36px;min-height:320px;display:flex;flex-direction:column;gap:16px;text-decoration:none;border:1px solid var(--li);background:var(--wh);color:var(--bk);transition:transform .3s}
.proj:hover{transform:translateY(-4px)}
.proj.e{background:var(--bk);color:var(--iv);border-color:var(--bk)}
.proj .logo{width:260px}.proj p{margin:0;font-size:17px;max-width:400px;color:var(--mu)}.proj.e p{color:var(--mud)}
.proj .n{font:700 64px var(--fh);letter-spacing:-.04em;line-height:1;margin-top:auto}.proj .n small{display:block;font:500 15px var(--fb);letter-spacing:0;color:var(--mu)}.proj.e .n small{color:var(--mud)}
.proj .ir{position:absolute;right:28px;bottom:28px;width:56px;height:56px;border-radius:50%;background:var(--or);color:var(--bk);display:grid;place-items:center;transition:transform .3s}
.proj:hover .ir{transform:rotate(-45deg)}
/* passos */
.passos{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px}
.passos div{border-top:2px solid var(--bk);padding-top:20px}
.passos b{font:700 72px var(--fh);color:var(--or);letter-spacing:-.04em;line-height:1}.passos h3{font-size:26px;margin:12px 0 8px}.passos p{margin:0;color:var(--mu)}
/* contato laranja */
.cta{background:var(--or);color:var(--bk);padding:96px 0;position:relative;overflow:hidden}
.cta h2{font-size:clamp(40px,6.4vw,92px);line-height:.95;max-width:980px}
.cta p{font-size:19px;margin:20px 0 32px;max-width:560px}
.cta .raposa{position:absolute;right:-60px;bottom:-80px;width:420px;opacity:.9}
footer{background:var(--bk)}footer .in{padding-top:32px;padding-bottom:40px;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;font-size:14px;color:var(--mud)}
footer a{color:var(--iv)}footer b{color:var(--iv)}footer .marcas{display:flex;gap:16px}
@media (max-width:980px){.hero .in{grid-template-columns:1fr}.hero .gigante{width:90vw;right:-30vw;top:30%;opacity:.25}.bento{grid-template-columns:1fr 1fr}.bx.a,.bx.d{grid-column:span 2}.bx.b,.bx.c{grid-column:span 1}.bx.b{grid-row:span 1}.projs{grid-template-columns:1fr}.passos{grid-template-columns:1fr}}
@media (max-width:640px){.topo nav a.lk{display:none}.topo .logo{width:160px}.hero{padding-top:110px}.hero p{font-size:17px}.vivo .grid b{font-size:24px}
.bento{grid-template-columns:1fr}.bx.a,.bx.b,.bx.c,.bx.d{grid-column:span 1}.sec{padding:72px 0}.proj{padding:26px;min-height:260px}.proj .logo{width:220px}.proj .n{font-size:48px}.cta .raposa{width:240px;opacity:.35}}
</style></head><body>
<a class="pular" href="#solucoes">pular para o conteúdo</a>
<header class="topo dk" style="background:transparent"><div class="in">
<a href="/" aria-label="NINEFOX, início"><img class="logo" src="/marca/ninefox-logo-negativa.svg" alt="NINEFOX" width="1042" height="371"></a>
<nav aria-label="Principal"><a class="lk" href="#solucoes">soluções</a><a class="lk" href="#projetos">projetos</a><a class="lk" href="#contato">contato</a>${btnContato('or')}</nav>
</div></header>
<main>
<section class="hero dk" aria-labelledby="t1">
<img class="gigante" src="/marca/ninefox-icone-principal.svg" alt="" width="324" height="371"><div class="faixa" aria-hidden="true"></div>
<div class="in"><div>
<h1 id="t1">tecnologia que <em>trabalha</em> por você.</h1>
<p>A NINEFOX cria sistemas, automações e lojas online que rodam sozinhos, enquanto você cuida do que importa.</p>
<div class="acoes">${btnContato('or')}<a class="btn ln" href="#solucoes">ver o que fazemos</a></div></div>
<div class="vivo" aria-label="Painel ao vivo"><div class="t"><span class="pulso"></span><b>ao vivo</b> · os robôs da NINEFOX agora${vivo.exemplo ? '<span class="ex">prévia com dados de exemplo</span>' : ''}</div>
<div class="grid"><div><b>${vivo.total}</b><span>ofertas no radar</span></div><div><b>2</b><span>frentes no ar</span></div><div><b>${vivo.em && !vivo.exemplo ? horaBR(vivo.em) : '—'}</b><span>última conferência</span></div></div>
${feed ? `<ul>${feed}</ul>` : '<p class="rod">Os robôs começam a trabalhar assim que as frentes forem ligadas.</p>'}
<p class="rod">Isto aqui roda sozinho enquanto você lê.</p></div>
</div></section>
<div class="claro">
<section class="in sec" id="solucoes" aria-labelledby="t2"><h2 class="g rv" id="t2">a gente não faz só site. a gente faz o seu negócio <span style="color:var(--or)">rodar sozinho</span>.</h2>
<p class="lead rv">Três frentes, um objetivo: tirar trabalho repetido das suas mãos e colocar resultado no lugar.</p>
<div class="bento">
<article class="bx a rv"><h3>Automação e robôs</h3><p>Atendimento no WhatsApp, postagens, relatórios e avisos acontecendo sozinhos, no horário certo.</p>
<div class="chat" aria-hidden="true"><div class="c">tem horário amanhã?</div><div class="r">🦊 tenho 10h ou 15h. qual prefere?</div><div class="c">15h!</div><div class="r">🦊 marcado ✅ te lembro 1h antes.</div></div></article>
<article class="bx b rv"><h3>Sistemas sob medida</h3><p>Painéis, agendas, caixa, estoque e área do cliente, do jeito que o seu negócio funciona.</p><div class="barras" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></article>
<article class="bx c rv"><h3>Lojas e vitrines</h3><p>Lojas e vitrines de ofertas prontas para vender no celular.</p><div class="mini" aria-hidden="true"><div><s>R$ 89,90</s><b>R$ 59,90</b></div><span>-33%</span></div></article>
<article class="bx d rv"><h3>Conecta com o que você já usa</h3><div class="integra"><span>WhatsApp</span><span>Instagram</span><span>Shopee</span><span>Mercado Livre</span><span>TikTok</span><span>Pix</span><span>Planilhas</span><span>IA</span></div></article>
</div></section>
<section class="in sec" id="projetos" aria-labelledby="t3" style="padding-top:0"><h2 class="g rv" id="t3">projetos da casa</h2><p class="lead rv">A gente usa o que constrói. Estes rodam todos os dias com a nossa tecnologia.</p>
<div class="projs">
<a class="proj rv" href="${esc(urlDe(SITES.shop))}"><img class="logo" src="/marca/ninefox-shop-principal.svg" alt="NINEFOX SHOP" width="1042" height="393"><p>Achados de casa e decoração da Shopee, conferidos todos os dias.</p><div class="n">${contaShop}<small>ofertas no radar agora</small></div><span class="ir">${ic('seta')}</span></a>
<a class="proj e rv" href="${esc(urlDe(SITES.tcg))}"><img class="logo" src="/marca/ninefox-tcg-negativa.svg" alt="NINEFOX TCG" width="1042" height="393"><p>Boosters, boxes e acessórios de TCG, com preço por booster calculado.</p><div class="n">${contaTcg}<small>ofertas no radar agora</small></div><span class="ir">${ic('seta')}</span></a>
</div></section>
<section class="in sec" aria-labelledby="t4" style="padding-top:0"><h2 class="g rv" id="t4">como trabalhamos</h2>
<div class="passos"><div class="rv"><b>01</b><h3>Conversa</h3><p>Você conta o problema. A gente entende o dia a dia antes de falar de tecnologia.</p></div>
<div class="rv"><b>02</b><h3>Protótipo</h3><p>Uma primeira versão para você usar e ajustar, sem esperar meses.</p></div>
<div class="rv"><b>03</b><h3>No ar e evoluindo</h3><p>O sistema vai para o ar e continua melhorando com o uso.</p></div></div></section>
</div>
<section class="cta" id="contato" aria-labelledby="t5"><img class="raposa" src="/marca/ninefox-icone-preta.svg" alt="" width="324" height="371"><div class="in" style="position:relative">
<h2 id="t5">tem uma ideia? a gente coloca no ar.</h2><p>Conte o que você precisa. A resposta vem rápido e sem enrolação.</p>${btnContato('bk')}</div></section>
</main>
<footer><div class="in"><div><b>NINEFOX</b> · tecnologia e soluções${cfg.rodape ? `<br>${esc(cfg.rodape)}` : ''}</div><div class="marcas"><a href="${esc(urlDe(SITES.shop))}">NINEFOX SHOP</a><a href="${esc(urlDe(SITES.tcg))}">NINEFOX TCG</a></div></div></footer>
<script>${JS_REVELA}</script>
</body></html>`;
}

module.exports = { vitrine, institucional, boosters, colecao };
