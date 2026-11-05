  // Identidade "ofertas Speed" (05/11/2026, pedido do dono; guia OFERTAS_SPEED v1): fundo claro #F7F8F2, preto #151714, acento lima #E9FF55
  // (texto preto sobre lima), Inter 400/600/800, cards brancos raio 16, botões raio 12, base 8 px. Logo = arquivos em data/marca (rota /marca/).
  // Só mostra o que é verdade: preço conferido no ML; "de R$ X" SÓ com o preço antigo (original_price) da MESMA oferta (precoDe); "novo" = últimas 24 h.
  // Visual anterior (creme/dourado, Dehleec): vitrine.js.bak-20261105-ofertas-speed.
  function pagina() {
    const itens = lista().filter((i) => !i.esgotado).sort((a, b) => String(b.em).localeCompare(String(a.em)));
    const contagem = {}; for (const i of itens) if (i.categoria) contagem[i.categoria] = (contagem[i.categoria] || 0) + 1;
    const cats = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a] || a.localeCompare(b));
    const dd = (n) => String(n).padStart(2, '0');
    const br = (iso) => new Date(Date.parse(iso) - 3 * 3600e3);
    const quando = (iso) => { const d = br(iso); return `preço de ${dd(d.getUTCDate())}/${dd(d.getUTCMonth() + 1)}, ${dd(d.getUTCHours())}h${dd(d.getUTCMinutes())}`; };
    const reais = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
    const ultimo = itens.map((i) => i.precoEm || i.em).filter(Boolean).sort().pop();
    const atualizado = ultimo ? (() => { const d = br(ultimo); return `${dd(d.getUTCHours())}h${dd(d.getUTCMinutes())}`; })() : '';
    const agoraMs = Date.now();
    const ZAP = 'https://chat.whatsapp.com/CeAVS9BsCikKysDzOC0JPw', INSTA = 'https://www.instagram.com/ofertas.speedco/';
    const cards = itens.map((i) => {
      const novo = agoraMs - Date.parse(i.em) < 24 * 3600e3;
      const desc = i.precoDe > i.preco ? Math.round((1 - i.preco / i.precoDe) * 100) : 0;
      return `<a class="card" href="${esc(i.link)}" rel="nofollow sponsored noopener" target="_blank" data-cat="${esc(i.categoria || '')}" data-preco="${Number(i.preco)}" data-desc="${desc >= 5 ? desc : 0}" data-em="${esc(i.em || '')}" data-busca="${esc((i.nome + ' ' + (i.categoria || '')).toLowerCase())}">
<div class="foto"><img loading="lazy" decoding="async" src="/foto/${esc(i.foto)}" alt="" width="400" height="400">${novo ? '<span class="novo">novo</span>' : ''}</div>
<div class="info"><div class="loja">${esc((i.categoria || 'ofertas').toLowerCase())} · mercado livre</div>
<div class="nome">${esc(i.nome)}</div>
<div class="precos">${desc >= 5 ? `<span class="de"><s>${reais(i.precoDe)}</s> <b>-${desc}%</b></span>` : ''}<span class="preco">${reais(i.preco)}</span></div>
<div class="conf">${esc(quando(i.precoEm || i.em))}</div>
<span class="btn">ver oferta</span></div></a>`;
    }).join('\n');
    const IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="ch"/></svg>';
    const WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20Z"/><path d="M9 8.8c0 3 2.6 6 6 6.4l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2L9 8.8Z" class="ch"/></svg>';
    const LUPA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ofertas Speed — achados do Mercado Livre</title><meta name="description" content="achou. gostou. aproveitou. Os mais vendidos do Mercado Livre com preço conferido, escolhidos pela ofertas Speed.">
<meta name="theme-color" content="#151714"><link rel="icon" type="image/png" href="/marca/icone.png"><link rel="apple-touch-icon" href="/marca/icone.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap">
<style>
:root{--brand-lime:#E9FF55;--brand-ink:#151714;--bg:#F7F8F2;--surface:#FFFFFF;--muted:#6B7067;--border:#DFE2D8;--font:"Inter",Arial,sans-serif;--radius-card:16px;--radius-button:12px;--content-width:1200px;--gut:16px}
@media (min-width:1024px){:root{--gut:32px}}
*{box-sizing:border-box}[hidden]{display:none!important}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--font);font-size:16px;line-height:1.5;background:var(--bg);color:var(--brand-ink);-webkit-font-smoothing:antialiased}
a{color:inherit}
svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
svg .ch{fill:currentColor;stroke:none}
:focus-visible{outline:3px solid var(--brand-ink);outline-offset:3px;border-radius:6px}
.topo :focus-visible,.ticket :focus-visible{outline-color:var(--brand-lime)}
.pular{position:absolute;left:-999px;top:8px;background:var(--brand-lime);color:var(--brand-ink);padding:8px 16px;border-radius:var(--radius-button);font-weight:600;z-index:9}.pular:focus{left:16px}
.in{max-width:var(--content-width);margin:0 auto;padding:0 var(--gut)}
/* cabeçalho */
.topo{position:sticky;top:0;z-index:5;background:var(--brand-ink);color:#fff}
.topo .in{display:flex;align-items:center;gap:24px;min-height:72px}
.logo{display:block;flex:0 0 auto;line-height:0}.logo img{height:40px;width:auto}
.menu{display:flex;align-items:center;gap:8px;margin-left:auto}
.menu a{color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px;border-radius:var(--radius-button);min-height:44px;display:inline-flex;align-items:center}
.menu a:hover{color:var(--brand-lime)}
.pbusca{display:flex;align-items:center;gap:8px;min-height:44px;min-width:220px;padding:0 16px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff2e;color:#ffffffb3;text-decoration:none;font-size:15px}
.pbusca:hover{border-color:var(--brand-lime);color:#fff}
.bzap{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:var(--radius-button);background:var(--brand-lime);color:var(--brand-ink);font-weight:600;font-size:15px;text-decoration:none;white-space:nowrap}
.menu .bzap,.menu .bzap:hover{color:var(--brand-ink)}.bzap:hover{background:#f1ff8a}
/* hero */
.hero{margin-top:24px}
.hero .bloco{position:relative;overflow:hidden;background:var(--brand-lime);border-radius:var(--radius-card);padding:48px 32px;min-height:300px;display:flex;flex-direction:column;justify-content:center}
.hero h1{margin:0;font-weight:800;font-size:clamp(44px,6vw,72px);line-height:1;letter-spacing:-.035em;max-width:9ch;position:relative;z-index:1}
.hero p{margin:16px 0 24px;max-width:420px;font-size:17px;position:relative;z-index:1}
.hero .acao{align-self:flex-start;position:relative;z-index:1}
.b1{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 24px;border-radius:var(--radius-button);background:var(--brand-ink);color:#fff;font-weight:600;font-size:16px;text-decoration:none}
.b1:hover{background:#2b2e29}
.hero .diag{position:absolute;right:-8%;top:-20%;width:40%;height:140%;background:var(--brand-ink);transform:skewX(-24deg);transform-origin:top right}
.hero .simb{position:absolute;right:5%;top:50%;width:min(26%,240px);height:auto;transform:translateY(-50%)}
.status{display:flex;flex-wrap:wrap;gap:8px 24px;margin:16px 0 0;font-size:15px;color:var(--muted)}
.status b{color:var(--brand-ink);font-weight:600}
/* ofertas */
.sec{margin-top:48px;scroll-margin-top:88px}
.cab{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.cab h2{margin:0;font-weight:800;font-size:clamp(32px,4vw,44px);line-height:1.05;letter-spacing:-.03em}
.cab .dir{display:flex;align-items:center;gap:16px}
.qtd{font-size:15px;color:var(--muted)}
.ord select{min-height:44px;border:1px solid var(--border);border-radius:var(--radius-button);background:var(--surface);padding:0 12px;font:600 15px var(--font);color:var(--brand-ink);cursor:pointer}
.busca{position:relative;display:block;margin-top:24px}
.busca input{width:100%;min-height:52px;border:1px solid var(--border);border-radius:var(--radius-button);padding:0 16px 0 48px;font:400 16px var(--font);color:var(--brand-ink);background:var(--surface)}
.busca input::placeholder{color:var(--muted)}
.busca input:focus{outline:none;border-color:var(--brand-ink);box-shadow:0 0 0 3px var(--brand-lime)}
.busca svg{position:absolute;left:16px;top:16px;color:var(--muted)}
.chipsbox{position:relative;margin-top:16px}
.chips{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:var(--border) transparent;cursor:grab}
.chips.arrasta{cursor:grabbing;scroll-behavior:auto;user-select:none}
.chips::-webkit-scrollbar{height:6px}.chips::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}
.seta{position:absolute;top:4px;width:44px;height:44px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--brand-ink);display:grid;place-items:center;cursor:pointer;z-index:2;padding:0}
.seta:hover{border-color:var(--brand-ink)}.seta.esq{left:-8px}.seta.dir{right:-8px}
.chipsbox:before,.chipsbox:after{content:"";position:absolute;top:0;bottom:12px;width:56px;pointer-events:none;z-index:1;opacity:0;transition:opacity .2s}
.chipsbox:before{left:0;background:linear-gradient(90deg,var(--bg),transparent)}.chipsbox:after{right:0;background:linear-gradient(270deg,var(--bg),transparent)}
.chipsbox.temesq:before,.chipsbox.temdir:after{opacity:1}
@media (hover:none){.seta{display:none!important}}
.chip{flex:0 0 auto;min-height:44px;border:1px solid var(--border);border-radius:999px;padding:0 16px;background:var(--surface);color:var(--brand-ink);font:600 15px var(--font);cursor:pointer;display:flex;align-items:center;gap:8px}
.chip small{font-size:13px;color:var(--muted);font-weight:600}
.chip:hover{border-color:var(--brand-ink)}
.chip.on{background:var(--brand-ink);border-color:var(--brand-ink);color:#fff}.chip.on small{color:var(--brand-lime)}
.chip.preco{border-style:dashed}.chip.preco.on{background:var(--brand-lime);border:1px solid var(--brand-ink);color:var(--brand-ink)}.chip.preco.on small{color:var(--brand-ink)}
.grade{display:grid;grid-template-columns:1fr;gap:16px;padding:16px 0 8px}
@media (min-width:640px){.grade{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1024px){.grade{grid-template-columns:repeat(3,1fr);gap:24px}}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);text-decoration:none;color:inherit;display:grid;grid-template-columns:42% 1fr;gap:16px;padding:16px;transition:border-color .2s,box-shadow .2s,transform .2s}
.card:hover{border-color:var(--brand-ink);box-shadow:0 8px 24px #15171414;transform:translateY(-2px)}
.foto{position:relative;align-self:center;aspect-ratio:1/1;border-radius:12px;background:var(--bg);overflow:hidden}
.foto img{position:absolute;inset:8px;width:calc(100% - 16px);height:calc(100% - 16px);object-fit:contain;mix-blend-mode:multiply;transition:transform .25s}
.card:hover .foto img{transform:scale(1.04)}
.novo{position:absolute;left:8px;top:8px;background:var(--brand-lime);color:var(--brand-ink);font-size:13px;font-weight:600;line-height:1;padding:6px 8px;border-radius:8px}
.info{display:flex;flex-direction:column;gap:4px;min-width:0}
.loja{font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nome{font-weight:600;font-size:16px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.precos{display:flex;flex-direction:column;margin-top:4px}
.de{font-size:15px;color:var(--muted)}.de s{text-decoration-thickness:1.5px}.de b{font-weight:600;color:var(--brand-ink)}
.preco{font-weight:800;font-size:26px;line-height:1.1;letter-spacing:-.02em}
.conf{font-size:13px;color:var(--muted)}
.btn{margin-top:auto;align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 24px;border-radius:var(--radius-button);background:var(--brand-lime);color:var(--brand-ink);font-weight:600;font-size:16px;transition:background .2s}
.info .btn{margin-top:8px}
.card:hover .btn{background:var(--brand-ink);color:#fff}
.vazio{grid-column:1/-1;text-align:center;color:var(--muted);padding:48px 16px;background:var(--surface);border:1px dashed var(--border);border-radius:var(--radius-card)}
.vazio b{display:block;color:var(--brand-ink);font-size:20px;font-weight:800;margin-bottom:4px}
/* ticket */
.ticket{margin-top:48px;display:grid;grid-template-columns:1fr 32%;border-radius:var(--radius-card);overflow:hidden}
.ticket .t1{background:var(--brand-ink);color:#fff;padding:40px 32px;position:relative}
.ticket .t1 b{display:block;font-weight:800;font-size:clamp(30px,4vw,48px);line-height:1.05;letter-spacing:-.03em}
.ticket .t1 p{margin:16px 0 24px;color:#ffffffc7;max-width:460px}
.ticket .acoes{display:flex;gap:8px;flex-wrap:wrap}
.b2{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 20px;border-radius:var(--radius-button);font-weight:600;font-size:16px;text-decoration:none}
.b2.l{background:var(--brand-lime);color:var(--brand-ink)}.b2.l:hover{background:#f1ff8a}
.b2.o{border:1px solid #ffffff59;color:#fff}.b2.o:hover{border-color:var(--brand-lime);color:var(--brand-lime)}
.ticket .t2{background:var(--brand-lime);display:grid;place-items:center;border-left:3px dashed var(--brand-ink);padding:24px}
.ticket .t2 img{width:min(160px,70%);height:auto}
footer{margin-top:48px;border-top:1px solid var(--border)}
footer .in{padding-top:32px;padding-bottom:48px;display:grid;grid-template-columns:1.4fr 1fr;gap:24px;font-size:15px;color:var(--muted)}
footer b{color:var(--brand-ink);font-weight:600}footer a{color:var(--brand-ink);font-weight:600}
footer .emp{text-align:right;font-size:13px}
@media (max-width:1023px){.menu .lnk{display:none}.pbusca{min-width:0}}
@media (max-width:640px){
.topo .in{gap:8px;min-height:64px}.logo img{height:32px}.pbusca{width:44px;padding:0;justify-content:center}.pbusca span{display:none}.bzap{padding:0 12px}.bzap span{display:none}
.hero{margin-top:16px}.hero .bloco{padding:32px 24px 144px;min-height:0}.hero .diag{display:none}.hero .simb{right:24px;top:auto;bottom:24px;transform:none;width:96px}
.hero p{font-size:16px}
.card{grid-template-columns:38% 1fr;padding:12px;gap:12px}.preco{font-size:24px}
.ticket{grid-template-columns:1fr}.ticket .t1{padding:32px 24px}.ticket .t2{border-left:0;border-top:3px dashed var(--brand-ink);padding:24px}.ticket .t2 img{width:96px}
footer .in{grid-template-columns:1fr}footer .emp{text-align:left}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
</style></head><body>
<a class="pular" href="#ofertas">pular para as ofertas</a>
<header class="topo"><div class="in">
<a class="logo" href="#" aria-label="ofertas Speed, início"><img src="/marca/logo-h-lima.png" alt="ofertas Speed" width="579" height="160"></a>
<nav class="menu" aria-label="Principal"><a class="lnk" href="#ofertas">ofertas</a><a class="lnk" href="#categorias">categorias</a><a class="lnk" href="#ofertas" id="novidades">novidades</a>
<a class="pbusca" href="#ofertas" id="abrebusca" aria-label="Buscar ofertas">${LUPA}<span>buscar ofertas</span></a>
<a class="bzap" href="${ZAP}" target="_blank" rel="noopener" aria-label="Grupo de ofertas no WhatsApp">${WA}<span>whatsapp</span></a></nav>
</div></header>
<section class="hero in" aria-labelledby="t1"><div class="bloco">
<div class="diag" aria-hidden="true"></div><picture><source media="(max-width:640px)" srcset="/marca/simbolo-preto.png"><img class="simb" src="/marca/simbolo-lima.png" alt="" width="222" height="256"></picture>
<h1 id="t1">achou. gostou. aproveitou.</h1>
<p>Os mais vendidos do Mercado Livre, separados todo dia, com o preço conferido. Oferta boa, sem enrolação.</p>
<a class="b1 acao" href="#ofertas">ver ofertas</a></div>
<div class="status"><span><b>${itens.length}</b> ${itens.length === 1 ? 'oferta no ar' : 'ofertas no ar'}</span><span>${atualizado ? `preços atualizados hoje às <b>${atualizado}</b>` : 'preços atualizados a cada 2 horas'}</span><span>links de afiliado</span></div>
</section>
<section class="sec in" id="ofertas" aria-labelledby="t2">
<div class="cab"><h2 id="t2">ofertas do dia</h2>
<div class="dir"><span class="qtd" id="qtd" aria-live="polite">${itens.length} ${itens.length === 1 ? 'produto' : 'produtos'}</span>
<label class="ord"><span hidden>Ordenar</span><select id="ord" aria-label="Ordenar ofertas"><option value="novo">mais recentes</option><option value="desc">maior desconto</option><option value="menor">menor preço</option><option value="maior">maior preço</option></select></label></div></div>
<label class="busca">${LUPA}<input id="q" type="search" placeholder="buscar oferta (ex.: fone, organizador)" autocomplete="off" aria-label="Buscar oferta"></label>
<div class="chipsbox" id="chipsbox"><button class="seta esq" id="setaE" aria-label="Categorias anteriores" hidden><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></button>
<div class="chips" id="chips" role="group" aria-label="Categorias"><span id="categorias"></span><button class="chip on" data-c="" aria-pressed="true">tudo <small>${itens.length}</small></button>${cats.map((c) => `<button class="chip" data-c="${esc(c)}" aria-pressed="false">${esc(c.toLowerCase())} <small>${contagem[c]}</small></button>`).join('')}<button class="chip preco" data-p="20" aria-pressed="false">até R$ 20</button><button class="chip preco" data-p="40" aria-pressed="false">até R$ 40</button></div>
<button class="seta dir" id="setaD" aria-label="Mais categorias" hidden><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button></div>
<main class="grade" id="lista">${cards || '<div class="vazio"><b>nenhuma oferta agora</b>Os próximos achados aparecem aqui. Entre no grupo do WhatsApp para receber primeiro.</div>'}<div class="vazio" id="nada" hidden><b>nada por aqui</b>Tente outra palavra ou categoria.</div></main>
</section>
<section class="in" aria-labelledby="t3"><div class="ticket"><div class="t1"><b id="t3">seu próximo achado tá aqui.</b><p>Todo dia tem oferta nova no grupo do WhatsApp e no Instagram. Vale o clique.</p>
<div class="acoes"><a class="b2 l" href="${ZAP}" target="_blank" rel="noopener">${WA}entrar no grupo</a><a class="b2 o" href="${INSTA}" target="_blank" rel="noopener">${IG}@ofertas.speedco</a></div></div>
<div class="t2" aria-hidden="true"><img src="/marca/simbolo-preto.png" alt="" width="222" height="256"></div></div></section>
<footer><div class="in"><div><b>Links de afiliado:</b> podemos ganhar uma comissão se você comprar por eles, sem custo a mais pra você. Os preços são do horário indicado em cada oferta e podem mudar no Mercado Livre.<br>
<a href="${INSTA}">@ofertas.speedco</a> · <a href="https://legal.speedco.com.br/privacidade">Privacidade</a> · <a href="https://legal.speedco.com.br/termos">Termos</a></div>
<div class="emp">SPEED SISTEMAS DE PRODUCAO ENTRETENIMENTO E EXPERIENCIAS DIGITAIS LTDA<br>CNPJ 29.932.620/0001-40 · <a href="mailto:contato@speedco.com.br">contato@speedco.com.br</a></div></div></footer>
<script>
(function(){var q=document.getElementById('q'),ord=document.getElementById('ord'),lista=document.getElementById('lista'),qtd=document.getElementById('qtd'),cat='',teto=0,cards=[].slice.call(document.querySelectorAll('.card')),nada=document.getElementById('nada');
function tira(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')}
function filtra(){var t=tira(q.value),n=0;cards.forEach(function(c){var ok=(!cat||c.dataset.cat===cat)&&(!teto||Number(c.dataset.preco)<=teto)&&(!t||tira(c.dataset.busca).indexOf(t)>=0);c.hidden=!ok;if(ok)n++});nada.hidden=n>0||!cards.length;qtd.textContent=n+(n===1?' produto':' produtos')}
function ordena(){var o=ord.value;cards.slice().sort(function(a,b){if(o==='desc')return b.dataset.desc-a.dataset.desc;if(o==='menor')return a.dataset.preco-b.dataset.preco;if(o==='maior')return b.dataset.preco-a.dataset.preco;return a.dataset.em<b.dataset.em?1:a.dataset.em>b.dataset.em?-1:0}).forEach(function(c){lista.insertBefore(c,nada)})}
q.addEventListener('input',filtra);ord.addEventListener('change',ordena);
document.getElementById('abrebusca').addEventListener('click',function(ev){ev.preventDefault();document.getElementById('ofertas').scrollIntoView();setTimeout(function(){q.focus({preventScroll:true})},250)});
document.getElementById('novidades').addEventListener('click',function(){ord.value='novo';ordena()});
var ch=document.getElementById('chips'),box=document.getElementById('chipsbox'),sE=document.getElementById('setaE'),sD=document.getElementById('setaD'),arr=null,moveu=false;
function setas(){var max=ch.scrollWidth-ch.clientWidth,e=ch.scrollLeft>4,d=ch.scrollLeft<max-4;sE.hidden=!e;sD.hidden=!d;box.classList.toggle('temesq',e);box.classList.toggle('temdir',d)}
sE.addEventListener('click',function(){ch.scrollLeft-=ch.clientWidth*0.7});sD.addEventListener('click',function(){ch.scrollLeft+=ch.clientWidth*0.7});
ch.addEventListener('scroll',setas);window.addEventListener('resize',setas);setas();
ch.addEventListener('wheel',function(ev){if(Math.abs(ev.deltaY)>Math.abs(ev.deltaX)&&ch.scrollWidth>ch.clientWidth){var a=ch.scrollLeft;ch.scrollLeft+=ev.deltaY;if(ch.scrollLeft!==a)ev.preventDefault()}},{passive:false});
ch.addEventListener('pointerdown',function(ev){if(ev.pointerType!=='mouse')return;arr={x:ev.clientX,l:ch.scrollLeft};moveu=false});
window.addEventListener('pointermove',function(ev){if(!arr)return;var dx=ev.clientX-arr.x;if(Math.abs(dx)>5){moveu=true;ch.classList.add('arrasta')}if(moveu)ch.scrollLeft=arr.l-dx});
window.addEventListener('pointerup',function(){arr=null;ch.classList.remove('arrasta')});
ch.addEventListener('click',function(ev){if(moveu){ev.stopPropagation();ev.preventDefault();moveu=false}},true);
[].forEach.call(document.querySelectorAll('.chip'),function(b){b.addEventListener('click',function(){
if(b.dataset.p!==undefined){var v=Number(b.dataset.p);teto=teto===v?0:v;[].forEach.call(document.querySelectorAll('.chip.preco'),function(x){var on=Number(x.dataset.p)===teto;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)})}
else{cat=b.dataset.c;[].forEach.call(document.querySelectorAll('.chip:not(.preco)'),function(x){x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)})}filtra()})});
[].forEach.call(document.querySelectorAll('.foto img'),function(i){i.addEventListener('error',function(){i.style.visibility='hidden'})});})();
</script></body></html>`;
  }

