'use strict';
// Páginas da NINEFOX (identidade: GUIA_DA_IDENTIDADE.md do kit do dono, 06/11/2026).
// Laranja #FF5A1F só em destaque (botões laranja com texto preto), preto #151515, branco quente #F5F2EC; Space Grotesk 500/700 (títulos) + Inter 400/500/600.
// Logo SEMPRE pelos SVGs do kit (/marca/...), nunca recriada com fonte. Sem "by Speed". Sem preço antigo/desconto/nota que a fonte não confirme.
const { SITES } = require('./sites');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reais = (v) => 'R$ ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));
const urlDe = (s) => 'https://' + s.hosts[0];
const quandoBR = (iso) => {
  if (!iso) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} às ${p.hour}h${p.minute}`;
};
const milhar = (n) => (n >= 1000 ? `+${Math.floor(n / 1000)} mil` : String(n));

const SVG = {
  lupa: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  zap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20Z"/><path d="M9 8.8c0 3 2.6 6 6 6.4l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2L9 8.8Z" class="ch"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="ch"/></svg>',
  seta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

function cabeca(titulo, descricao, tema) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descricao)}"><meta name="theme-color" content="${tema}">
<link rel="icon" href="/marca/favicon.svg" type="image/svg+xml"><link rel="icon" href="/marca/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/marca/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap">
<style>${CSS_BASE}`;
}

const CSS_BASE = `
:root{--ninefox-orange:#FF5A1F;--ninefox-black:#151515;--ninefox-ivory:#F5F2EC;--white:#FFFFFF;--muted:#5E5A54;--muted-dark:#BDB7AE;--line:#E3DED5;--line-dark:#2C2C2C;
--font-heading:"Space Grotesk",Arial,sans-serif;--font-body:"Inter",Arial,sans-serif;--radius-card:16px;--radius-control:10px;--gut:16px;--max:1200px}
@media (min-width:1024px){:root{--gut:32px}}
*{box-sizing:border-box}[hidden]{display:none!important}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--font-body);font-size:16px;line-height:1.5;background:var(--ninefox-ivory);color:var(--ninefox-black);-webkit-font-smoothing:antialiased}
a{color:inherit}img{max-width:100%}
svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}svg .ch{fill:currentColor;stroke:none}
:focus-visible{outline:3px solid var(--ninefox-black);outline-offset:3px;border-radius:6px}
.escuro :focus-visible{outline-color:var(--ninefox-ivory)}
.in{max-width:var(--max);margin:0 auto;padding:0 var(--gut)}
.pular{position:absolute;left:-999px;top:8px;z-index:9;background:var(--ninefox-orange);color:var(--ninefox-black);padding:8px 16px;border-radius:var(--radius-control);font-weight:600}.pular:focus{left:16px}
h1,h2,h3{font-family:var(--font-heading);font-weight:700;letter-spacing:-.02em;margin:0}
.ninefox-logo{display:block;height:auto;object-fit:contain}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:var(--radius-control);border:2px solid transparent;font:600 16px var(--font-body);text-decoration:none;cursor:pointer;white-space:nowrap}
.btn.laranja{background:var(--ninefox-orange);color:var(--ninefox-black)}.btn.laranja:hover{background:#ff7a47}
.btn.preto{background:var(--ninefox-black);color:var(--ninefox-ivory)}.btn.preto:hover{background:#2b2b2b}
.btn.linha{border-color:currentColor;background:transparent}.btn.linha:hover{background:#1515150d}
.escuro .btn.linha:hover{background:#ffffff14}
.btn[aria-disabled=true]{opacity:.55;cursor:default}
.escuro{background:var(--ninefox-black);color:var(--ninefox-ivory)}
footer{border-top:1px solid var(--line);margin-top:64px}
footer .in{padding-top:32px;padding-bottom:48px;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;font-size:14px;color:var(--muted)}
footer b{color:var(--ninefox-black);font-weight:600}footer a{color:var(--ninefox-black);font-weight:500}
footer .marcas{display:flex;gap:16px;flex-wrap:wrap}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
`;

// ---------- vitrine (SHOP / TCG) ----------
function vitrine(site, dados) {
  const inst = SITES.inst;
  const itens = dados.itens || [];
  const cats = [...new Set(itens.map((i) => i.cat))];
  const conta = (c) => itens.filter((i) => i.cat === c).length;
  const exemplo = dados.exemplo;
  const cards = itens.map((i) => {
    const tag = i.link ? 'a' : 'div';
    const attrs = i.link ? ` href="${esc(i.link)}" target="_blank" rel="nofollow sponsored noopener"` : ' aria-disabled="true"';
    return `<${tag} class="card"${attrs} data-cat="${esc(i.cat)}" data-preco="${i.preco}" data-desc="${i.desconto}" data-vendas="${i.vendas}" data-busca="${esc(i.nome.toLowerCase())}">
<div class="foto">${i.img ? `<img loading="lazy" decoding="async" src="${esc(i.img)}" alt="" width="400" height="400">` : ''}${exemplo ? '<span class="ex">exemplo</span>' : ''}</div>
<div class="info"><div class="loja">${esc(i.cat)} · Shopee</div>
<div class="nome">${esc(i.nome)}</div>
<div class="precos">${i.precoDe ? `<span class="de"><s>${reais(i.precoDe)}</s> <b>-${i.desconto}%</b></span>` : ''}<span class="preco">${reais(i.preco)}</span></div>
<div class="prova">${i.nota ? `★ ${i.nota.toFixed(1)}` : ''}${i.vendas ? ` · ${milhar(i.vendas)} vendidos` : ''}</div>
<span class="btn laranja ver">${exemplo ? 'exemplo' : 'ver oferta'}</span></div></${tag}>`;
  }).join('\n');
  const zapBtn = (cls) => (site.zap ? `<a class="btn ${cls}" href="${esc(site.zap)}" target="_blank" rel="noopener">${SVG.zap}grupo no WhatsApp</a>` : `<span class="btn ${cls}" aria-disabled="true" title="em breve">${SVG.zap}grupo em breve</span>`);
  const igBtn = site.insta ? `<a class="btn linha" href="${esc(site.insta)}" target="_blank" rel="noopener">${SVG.ig}Instagram</a>` : '';
  return cabeca(site.titulo, site.descricao, '#151515') + `
.topo{position:sticky;top:0;z-index:5}
.topo .in{display:flex;align-items:center;gap:16px;min-height:96px}
.topo .ninefox-logo{width:220px;flex:0 0 auto}
.topo nav{margin-left:auto;display:flex;align-items:center;gap:8px}
.topo .pbusca{display:inline-flex;align-items:center;gap:8px;min-height:48px;min-width:220px;padding:0 16px;border-radius:999px;border:1px solid var(--line-dark);color:var(--muted-dark);text-decoration:none}
.topo .pbusca:hover{border-color:var(--ninefox-orange);color:var(--ninefox-ivory)}
.hero{display:grid;grid-template-columns:1.4fr .6fr;gap:32px;align-items:center;padding-top:48px;padding-bottom:16px}
.hero h1{font-size:clamp(40px,6vw,72px);line-height:1}
.hero h1 span{display:block}.hero h1 .l2{color:var(--ninefox-orange)}
.hero p{margin:24px 0 32px;font-size:18px;max-width:560px;color:var(--muted)}
.hero .acoes{display:flex;gap:12px;flex-wrap:wrap}
.hero .raposa{justify-self:end;width:min(280px,100%);height:auto}
.status{display:flex;flex-wrap:wrap;gap:8px 24px;padding-top:24px;padding-bottom:8px;font-size:15px;color:var(--muted)}
.status b{color:var(--ninefox-black);font-weight:600}
.aviso{margin-top:16px;padding:12px 16px;border-radius:var(--radius-control);border:1px dashed var(--ninefox-black);font-size:15px}
.sec{margin-top:40px;scroll-margin-top:110px}
.cab{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.cab h2{font-size:clamp(30px,4vw,44px);line-height:1.05}
.cab .dir{display:flex;align-items:center;gap:16px}.qtd{color:var(--muted);font-size:15px}
select{min-height:44px;border:1px solid var(--line);border-radius:var(--radius-control);background:var(--white);padding:0 12px;font:500 15px var(--font-body);color:var(--ninefox-black);cursor:pointer}
.busca{position:relative;display:block;margin-top:24px}
.busca input{width:100%;min-height:52px;border:1px solid var(--line);border-radius:var(--radius-control);padding:0 16px 0 48px;font:400 16px var(--font-body);background:var(--white);color:var(--ninefox-black)}
.busca input::placeholder{color:var(--muted)}
.busca input:focus{outline:none;border-color:var(--ninefox-black);box-shadow:0 0 0 3px #ff5a1f55}
.busca svg{position:absolute;left:16px;top:16px;color:var(--muted)}
.chips{display:flex;gap:8px;overflow-x:auto;padding:16px 2px 12px;scrollbar-width:thin}
.chip{flex:0 0 auto;min-height:44px;border:1px solid var(--line);border-radius:999px;padding:0 16px;background:var(--white);color:var(--ninefox-black);font:500 15px var(--font-body);cursor:pointer;display:flex;align-items:center;gap:8px}
.chip small{color:var(--muted);font-weight:600;font-size:13px}
.chip:hover{border-color:var(--ninefox-black)}
.chip.on{background:var(--ninefox-black);border-color:var(--ninefox-black);color:var(--ninefox-ivory)}.chip.on small{color:var(--ninefox-orange)}
.grade{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:8px 0}
@media (min-width:768px){.grade{grid-template-columns:repeat(3,1fr);gap:16px}}
@media (min-width:1100px){.grade{grid-template-columns:repeat(4,1fr);gap:24px}}
.card{display:flex;flex-direction:column;background:var(--white);border:1px solid var(--line);border-radius:var(--radius-card);overflow:hidden;text-decoration:none;color:inherit;transition:border-color .2s,transform .2s}
a.card:hover{border-color:var(--ninefox-black);transform:translateY(-2px)}
.foto{position:relative;aspect-ratio:1/1;background:var(--white);border-bottom:1px solid var(--line)}
.foto img{position:absolute;inset:8px;width:calc(100% - 16px);height:calc(100% - 16px);object-fit:contain}
.ex{position:absolute;left:8px;top:8px;background:var(--ninefox-black);color:var(--ninefox-ivory);font-size:12px;font-weight:600;padding:4px 8px;border-radius:6px}
.info{display:flex;flex-direction:column;gap:4px;padding:12px 12px 16px;flex:1}
.loja{font-size:13px;color:var(--muted)}
.nome{font-weight:500;font-size:15px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.precos{display:flex;flex-direction:column;margin-top:6px}
.de{font-size:14px;color:var(--muted)}.de b{color:var(--ninefox-black);font-weight:600}
.preco{font-family:var(--font-heading);font-weight:700;font-size:26px;line-height:1.1;letter-spacing:-.02em}
.prova{font-size:13px;color:var(--muted);min-height:20px}
.ver{margin-top:auto;align-self:stretch;min-height:44px}.info .ver{margin-top:10px}
a.card:hover .ver{background:var(--ninefox-black);color:var(--ninefox-ivory)}
.vazio{grid-column:1/-1;text-align:center;padding:56px 16px;background:var(--white);border:1px dashed var(--line);border-radius:var(--radius-card);color:var(--muted)}
.vazio b{display:block;font-family:var(--font-heading);font-size:24px;color:var(--ninefox-black);margin-bottom:8px}
.convite{margin-top:56px;border-radius:var(--radius-card);padding:40px 32px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
.convite h2{font-size:clamp(28px,4vw,40px);line-height:1.05}
.convite p{margin:12px 0 0;color:var(--muted-dark);max-width:520px}
.convite .acoes{display:flex;gap:12px;flex-wrap:wrap}
@media (max-width:820px){.hero{grid-template-columns:1fr}.hero .raposa{display:none}.convite{grid-template-columns:1fr}}
@media (max-width:640px){.topo .in{min-height:84px}.topo .pbusca{min-width:0;width:48px;padding:0;justify-content:center}.topo .pbusca span,.topo .zaptxt{display:none}
.hero{padding-top:32px}.hero p{font-size:16px}.preco{font-size:22px}.nome{font-size:14px}.convite{padding:32px 20px}}
@media (max-width:420px){.topo .ninefox-logo{width:200px}}
</style></head><body>
<a class="pular" href="#ofertas">pular para as ofertas</a>
<header class="topo escuro"><div class="in">
<a href="/" aria-label="${esc(site.nome)}, início"><img class="ninefox-logo" src="/marca/${site.logo}-negativa.svg" alt="${esc(site.nome)}" width="1042" height="393"></a>
<nav aria-label="Principal"><a class="pbusca" href="#ofertas" id="abrebusca" aria-label="Buscar ofertas">${SVG.lupa}<span>buscar ofertas</span></a>
${site.zap ? `<a class="btn laranja" href="${esc(site.zap)}" target="_blank" rel="noopener" aria-label="Grupo no WhatsApp">${SVG.zap}<span class="zaptxt">grupo</span></a>` : ''}</nav>
</div></header>
<main>
<section class="in hero" aria-labelledby="t1"><div>
<h1 id="t1"><span>${esc(site.hero[0])}</span><span class="l2">${esc(site.hero[1])}</span></h1>
<p>${esc(site.sub)}</p>
<div class="acoes"><a class="btn laranja" href="#ofertas">ver ofertas ${SVG.seta}</a>${zapBtn('linha')}</div></div>
<img class="raposa" src="/marca/ninefox-icone-principal.svg" alt="" width="324" height="371"></section>
<div class="in status"><span><b>${itens.length}</b> ${itens.length === 1 ? 'oferta' : 'ofertas'}</span>${dados.em && !exemplo ? `<span>preços conferidos na Shopee em <b>${esc(quandoBR(dados.em))}</b></span>` : ''}<span>links de afiliado</span></div>
${exemplo ? '<div class="in"><p class="aviso"><b>Dados de exemplo:</b> produtos apenas para ver o layout, sem links. As ofertas reais entram quando a API de afiliados da NINEFOX for ligada.</p></div>' : ''}
<section class="in sec" id="ofertas" aria-labelledby="t2">
<div class="cab"><h2 id="t2">ofertas de hoje</h2><div class="dir"><span class="qtd" id="qtd" aria-live="polite">${itens.length} ${itens.length === 1 ? 'produto' : 'produtos'}</span>
<label><span hidden>Ordenar</span><select id="ord" aria-label="Ordenar ofertas"><option value="rel">mais relevantes</option><option value="desc">maior desconto</option><option value="menor">menor preço</option><option value="vendas">mais vendidos</option></select></label></div></div>
<label class="busca">${SVG.lupa}<input id="q" type="search" placeholder="${esc(site.busca)}" autocomplete="off" aria-label="Buscar oferta"></label>
<div class="chips" role="group" aria-label="Categorias"><button class="chip on" data-c="" aria-pressed="true">tudo <small>${itens.length}</small></button>${cats.map((c) => `<button class="chip" data-c="${esc(c)}" aria-pressed="false">${esc(c)} <small>${conta(c)}</small></button>`).join('')}</div>
<div class="grade" id="lista">${cards || '<div class="vazio"><b>ofertas chegando</b>Estamos ligando a busca de ofertas. Entre no grupo para receber as primeiras.</div>'}<div class="vazio" id="nada" hidden><b>nada por aqui</b>Tente outra palavra ou categoria.</div></div>
</section>
<section class="in"><div class="convite escuro"><div><h2>a próxima oferta chega primeiro no grupo.</h2><p>Todo dia tem achado novo no WhatsApp e no Instagram da ${esc(site.nome)}.</p></div>
<div class="acoes">${zapBtn('laranja')}${igBtn}</div></div></section>
</main>
<footer><div class="in"><div><b>Links de afiliado:</b> podemos receber uma comissão se você comprar por eles, sem custo a mais para você.<br>Preços e disponibilidade são da Shopee no horário indicado e podem mudar.</div>
<div class="marcas"><a href="${esc(urlDe(inst))}">NINEFOX</a><a href="${esc(urlDe(SITES.shop))}">NINEFOX SHOP</a><a href="${esc(urlDe(SITES.tcg))}">NINEFOX TCG</a></div></div></footer>
<script>
(function(){var q=document.getElementById('q'),ord=document.getElementById('ord'),lista=document.getElementById('lista'),qtd=document.getElementById('qtd'),nada=document.getElementById('nada'),cat='',cards=[].slice.call(document.querySelectorAll('.card')),orig=cards.slice();
function tira(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}
function filtra(){var t=tira(q.value),n=0;cards.forEach(function(c){var ok=(!cat||c.dataset.cat===cat)&&(!t||tira(c.dataset.busca).indexOf(t)>=0);c.hidden=!ok;if(ok)n++});nada.hidden=n>0||!cards.length;qtd.textContent=n+(n===1?' produto':' produtos')}
function ordena(){var o=ord.value,l=o==='rel'?orig.slice():cards.slice().sort(function(a,b){if(o==='desc')return b.dataset.desc-a.dataset.desc;if(o==='menor')return a.dataset.preco-b.dataset.preco;return b.dataset.vendas-a.dataset.vendas});l.forEach(function(c){lista.insertBefore(c,nada)})}
q.addEventListener('input',filtra);ord.addEventListener('change',ordena);
document.getElementById('abrebusca').addEventListener('click',function(e){e.preventDefault();document.getElementById('ofertas').scrollIntoView();setTimeout(function(){q.focus({preventScroll:true})},250)});
[].forEach.call(document.querySelectorAll('.chip'),function(b){b.addEventListener('click',function(){cat=b.dataset.c;[].forEach.call(document.querySelectorAll('.chip'),function(x){x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});filtra()})});
[].forEach.call(document.querySelectorAll('.foto img'),function(i){i.addEventListener('error',function(){i.style.visibility='hidden'})});})();
</script></body></html>`;
}

// ---------- institucional (ninefox.com.br) ----------
function institucional(site, cfg) {
  const contato = cfg.whatsapp ? `https://wa.me/${cfg.whatsapp}` : cfg.email ? `mailto:${cfg.email}` : '';
  const btnContato = (cls) => (contato ? `<a class="btn ${cls}" href="${esc(contato)}"${cfg.whatsapp ? ' target="_blank" rel="noopener"' : ''}>fale com a gente ${SVG.seta}</a>` : `<span class="btn ${cls}" aria-disabled="true">contato em breve</span>`);
  const projeto = (s, txt) => `<a class="proj" href="${esc(urlDe(s))}"><img class="ninefox-logo" src="/marca/${s.logo}-principal.svg" alt="${esc(s.nome)}" width="1042" height="393"><p>${esc(txt)}</p><span class="ir">visitar ${SVG.seta}</span></a>`;
  const SOL = [
    ['Sistemas sob medida', 'Painéis, agendas, controle de caixa e estoque, áreas de cliente. Do jeito que o seu negócio funciona, não o contrário.'],
    ['Automação e robôs', 'Rotinas que trabalham sozinhas: atendimento no WhatsApp, postagens, relatórios e avisos na hora certa.'],
    ['Lojas e vitrines online', 'Lojas, catálogos e vitrines de ofertas com links de afiliado, prontos para vender no celular.'],
  ];
  const PASSOS = [['01', 'Conversa', 'Você conta o problema. A gente entende o dia a dia antes de falar de tecnologia.'],
    ['02', 'Protótipo', 'Uma primeira versão para você usar e ajustar, sem esperar meses.'],
    ['03', 'No ar e evoluindo', 'O sistema vai para o ar e continua melhorando com o uso.']];
  return cabeca(site.titulo, site.descricao, '#F5F2EC') + `
.topo{position:sticky;top:0;z-index:5;background:#F5F2ECf2;backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.topo .in{display:flex;align-items:center;gap:24px;min-height:80px}
.topo .ninefox-logo{width:180px}
.topo nav{margin-left:auto;display:flex;align-items:center;gap:4px}
.topo nav a.lnk{text-decoration:none;font-weight:500;padding:12px;border-radius:var(--radius-control)}.topo nav a.lnk:hover{background:#1515150d}
.hero{display:grid;grid-template-columns:1.3fr .7fr;gap:48px;align-items:center;padding-top:72px;padding-bottom:72px}
.hero h1{font-size:clamp(44px,7vw,88px);line-height:.98}
.hero h1 em{font-style:normal;color:var(--ninefox-orange)}
.hero p{margin:24px 0 32px;font-size:19px;max-width:560px;color:var(--muted)}
.hero .acoes{display:flex;gap:12px;flex-wrap:wrap}
.hero .raposa{justify-self:end;width:min(320px,100%);height:auto}
.sec{padding-top:72px;scroll-margin-top:90px}
.sec>h2{font-size:clamp(32px,4.5vw,52px);line-height:1.05;max-width:720px}
.sec>.lead{margin:16px 0 0;color:var(--muted);max-width:620px;font-size:18px}
.sol{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px}
.sol article{background:var(--white);border:1px solid var(--line);border-radius:var(--radius-card);padding:28px 24px}
.sol .num{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:10px;background:var(--ninefox-orange);color:var(--ninefox-black);font:700 18px var(--font-heading)}
.sol h3{font-size:24px;margin-top:20px}.sol p{margin:8px 0 0;color:var(--muted)}
.projs{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:32px}
.proj{display:flex;flex-direction:column;gap:16px;background:var(--white);border:1px solid var(--line);border-radius:var(--radius-card);padding:32px;text-decoration:none;color:inherit;transition:border-color .2s}
.proj:hover{border-color:var(--ninefox-black)}.proj .ninefox-logo{width:240px}.proj p{margin:0;color:var(--muted)}
.proj .ir{display:inline-flex;align-items:center;gap:8px;font-weight:600;margin-top:auto}
.passos{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px}
.passos div{border-top:2px solid var(--ninefox-black);padding-top:16px}
.passos b{font:700 14px var(--font-heading);color:var(--muted)}.passos h3{font-size:24px;margin:8px 0}.passos p{margin:0;color:var(--muted)}
.contato{margin-top:72px;border-radius:var(--radius-card);padding:56px 40px;display:grid;grid-template-columns:1fr auto;gap:32px;align-items:center}
.contato h2{font-size:clamp(32px,4.5vw,52px);line-height:1.02}
.contato p{margin:16px 0 0;color:var(--muted-dark);max-width:520px;font-size:18px}
.contato img{width:120px;height:auto;justify-self:end}
@media (max-width:900px){.hero{grid-template-columns:1fr;padding-top:48px;padding-bottom:40px}.hero .raposa{display:none}.sol,.passos{grid-template-columns:1fr}.projs{grid-template-columns:1fr}}
@media (max-width:640px){.topo nav a.lnk{display:none}.topo .ninefox-logo{width:160px}.hero p{font-size:17px}.contato{grid-template-columns:1fr;padding:40px 24px}.contato img{display:none}.proj{padding:24px}}
</style></head><body>
<a class="pular" href="#solucoes">pular para o conteúdo</a>
<header class="topo"><div class="in">
<a href="/" aria-label="NINEFOX, início"><img class="ninefox-logo" src="/marca/ninefox-logo-principal.svg" alt="NINEFOX" width="1042" height="371"></a>
<nav aria-label="Principal"><a class="lnk" href="#solucoes">soluções</a><a class="lnk" href="#projetos">projetos</a><a class="lnk" href="#contato">contato</a>${btnContato('laranja')}</nav>
</div></header>
<main>
<section class="in hero" aria-labelledby="t1"><div>
<h1 id="t1">tecnologia que <em>trabalha</em> por você.</h1>
<p>A NINEFOX cria sistemas, automações e lojas online para negócios que querem crescer sem complicar.</p>
<div class="acoes">${btnContato('laranja')}<a class="btn linha" href="#solucoes">ver soluções</a></div></div>
<img class="raposa" src="/marca/ninefox-icone-principal.svg" alt="" width="324" height="371"></section>
<section class="in sec" id="solucoes" aria-labelledby="t2"><h2 id="t2">o que a gente faz</h2>
<p class="lead">Três frentes, um objetivo: tirar trabalho repetido das suas mãos e colocar resultado no lugar.</p>
<div class="sol">${SOL.map((s, k) => `<article><span class="num">${k + 1}</span><h3>${esc(s[0])}</h3><p>${esc(s[1])}</p></article>`).join('')}</div></section>
<section class="in sec" id="projetos" aria-labelledby="t3"><h2 id="t3">projetos da casa</h2>
<p class="lead">A gente usa o que constrói. Estes rodam todos os dias com a nossa tecnologia.</p>
<div class="projs">${projeto(SITES.shop, 'Achados de casa e decoração da Shopee, com preço conferido todos os dias.')}${projeto(SITES.tcg, 'Ofertas de boosters, boxes e acessórios de TCG garimpadas na Shopee.')}</div></section>
<section class="in sec" aria-labelledby="t4"><h2 id="t4">como trabalhamos</h2>
<div class="passos">${PASSOS.map((p) => `<div><b>${p[0]}</b><h3>${esc(p[1])}</h3><p>${esc(p[2])}</p></div>`).join('')}</div></section>
<section class="in" id="contato" aria-labelledby="t5"><div class="contato escuro"><div><h2 id="t5">tem uma ideia? a gente coloca no ar.</h2>
<p>Conte o que você precisa. A resposta vem rápido e sem enrolação.</p><div style="margin-top:24px">${btnContato('laranja')}</div></div>
<img src="/marca/ninefox-icone-negativa.svg" alt="" width="324" height="371"></div></section>
</main>
<footer><div class="in"><div><b>NINEFOX</b> · tecnologia e soluções${cfg.rodape ? `<br>${esc(cfg.rodape)}` : ''}</div>
<div class="marcas"><a href="${esc(urlDe(SITES.shop))}">NINEFOX SHOP</a><a href="${esc(urlDe(SITES.tcg))}">NINEFOX TCG</a></div></div></footer>
</body></html>`;
}

module.exports = { vitrine, institucional };
