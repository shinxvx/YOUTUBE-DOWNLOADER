'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const R = n => 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const cepFmt = v => String(v || '').replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
let LOJA = {};

async function api(url, dados) {
  const r = await fetch(url, dados ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.erro || 'Não foi possível concluir. Tente de novo.'), { status: r.status });
  return j;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2600); }

// ---------- sacola (guardada no navegador) ----------
const SAC = 'dh_sacola';
function sacola() { try { return JSON.parse(localStorage.getItem(SAC)) || []; } catch { return []; } }
function salvarSacola(s) { try { localStorage.setItem(SAC, JSON.stringify(s)); } catch {} contarSacola(); }
function contarSacola() { const n = sacola().reduce((a, i) => a + i.qtd, 0); $('#nSacola').textContent = n || ''; }
function addSacola(id, qtd = 1) { const s = sacola(); const i = s.find(x => x.id === id); if (i) i.qtd += qtd; else s.push({ id, qtd }); salvarSacola(s); }
function parcelaTxt(v) {
  const n = Math.max(1, Math.min(LOJA.parcelas_max || 1, Math.floor(v / (LOJA.parcela_minima || 30)) || 1));
  return n > 1 ? `ou ${n}x de ${R(v / n)} sem juros` : 'à vista no Pix ou cartão';
}

const ICON = {
  garantia: '<svg viewBox="0 0 32 32"><path d="M16 3l10 4v8c0 7-4.5 11.5-10 14C10.5 26.5 6 22 6 15V7z"/><path d="M11.5 16l3 3 6-6.5"/></svg>',
  pix: '<svg viewBox="0 0 32 32"><path d="M16 4l12 12-12 12L4 16z"/><path d="M11 16l5-5 5 5-5 5z"/></svg>',
  cartao: '<svg viewBox="0 0 32 32"><rect x="4" y="8" width="24" height="16" rx="3"/><path d="M4 13h24M8 19h6"/></svg>',
  caixa: '<svg viewBox="0 0 32 32"><path d="M5 10l11-5 11 5v12l-11 5-11-5z"/><path d="M5 10l11 5 11-5M16 15v12"/></svg>',
  cadeado: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
};

function card(p) {
  return `<article class="card${p.esgotado ? ' esgotado' : ''}">
    ${p.esgotado ? '<span class="tag esg">Esgotado</span>' : p.preco_de ? `<span class="tag">-${Math.round((1 - p.preco / p.preco_de) * 100)}%</span>` : ''}
    <a class="img" href="#/p/${esc(p.slug)}"><img src="${esc(p.img)}" alt="${esc(p.nome)}" loading="lazy"></a>
    <div class="info">
      <span class="cat-p">${esc(p.categoria)}</span>
      <h3><a href="#/p/${esc(p.slug)}">${esc(p.nome)}</a></h3>
      <div class="preco"><b>${R(p.preco)}</b>${p.preco_de ? `<s>${R(p.preco_de)}</s>` : ''}</div>
      <div class="parc">${parcelaTxt(p.preco)}</div>
      ${p.esgotado ? '<button class="btn linha add" disabled>Esgotado</button>' : `<button class="btn add" data-add="${p.id}">Adicionar</button>`}
    </div></article>`;
}
const grade = lista => lista.length ? `<div class="grade">${lista.map(card).join('')}</div>` : `<div class="vazio"><h3>Nada por aqui</h3><p>Não encontramos produtos.</p></div>`;

// ---------- páginas ----------
async function inicio() {
  const ps = await api('/api/produtos');
  const dest = ps.filter(p => p.destaque && !p.esgotado).slice(0, 8);
  const capas = {}; for (const p of ps) if (!capas[p.categoria]) capas[p.categoria] = p.img;
  app.innerHTML = `
  <section class="hero"><div class="wrap">
    <div>
      <p class="scr">Realçando sua essência</p>
      <h1>Semijoias que acompanham você todos os dias</h1>
      <p>Peças banhadas a ouro 18k com garantia de 1 ano, perfumes e beleza premium. Compre pelo site e receba em casa.</p>
      <a class="btn" href="#/c/Semijoias">Ver semijoias</a> &nbsp; <a class="btn linha" href="#/todos">Toda a loja</a>
    </div>
    <div class="arte"><img src="/img/emblema.png" alt=""></div>
  </div></section>
  <div class="wrap">
    <div class="selos">
      <div class="selo">${ICON.garantia}<div><b>Garantia de 1 ano</b><span>em todas as semijoias</span></div></div>
      <div class="selo">${ICON.pix}<div><b>Pix ou cartão</b><span>em até ${LOJA.parcelas_max}x sem juros</span></div></div>
      <div class="selo">${ICON.caixa}<div><b>Correios</b><span>PAC e SEDEX para todo o Brasil</span></div></div>
      <div class="selo">${ICON.cadeado.replace('24 24', '24 24')}<div><b>Compra segura</b><span>seus dados protegidos</span></div></div>
    </div>
    <section class="secao"><div class="tit"><h2><small>escolhidos para você</small>Destaques</h2><a href="#/todos">Ver tudo</a></div>${grade(dest)}</section>
    <section class="secao"><div class="tit"><h2><small>navegue por</small>Categorias</h2></div>
      <div class="cats">${LOJA.categorias.map(c => `<a class="cat" href="#/c/${encodeURIComponent(c)}"><img src="${esc(capas[c])}" alt="" loading="lazy"><span>${esc(c)}</span></a>`).join('')}</div></section>
    <section class="secao"><div class="tit"><h2><small>a coleção</small>Semijoias</h2><a href="#/c/Semijoias">Ver todas</a></div>${grade(ps.filter(p => p.categoria === 'Semijoias').slice(0, 8))}</section>
  </div>`;
}
async function lista(titulo, url, sub) {
  const ps = await api(url);
  app.innerHTML = `<div class="wrap pagina"><div class="tit"><h2><small>${esc(sub)}</small>${esc(titulo)}</h2><span class="parc">${ps.length} produto${ps.length === 1 ? '' : 's'}</span></div>${grade(ps)}</div>`;
}
async function produto(slug) {
  let p; try { p = await api('/api/produto/' + encodeURIComponent(slug)); } catch { app.innerHTML = '<div class="wrap vazio"><h3>Produto não encontrado</h3><p><a href="#/">Voltar à loja</a></p></div>'; return; }
  document.title = p.nome + ' · ' + LOJA.nome;
  app.innerHTML = `<div class="wrap">
  <p class="migalha"><a href="#/">Início</a> / <a href="#/c/${encodeURIComponent(p.categoria)}">${esc(p.categoria)}</a> / ${esc(p.nome)}</p>
  <div class="prod">
    <div class="foto"><img src="${esc(p.img)}" alt="${esc(p.nome)}"></div>
    <div>
      <span class="cat-p parc">${esc(p.categoria)}</span>
      <h1>${esc(p.nome)}</h1>
      <div class="preco"><b>${R(p.preco)}</b>${p.preco_de ? `<s>${R(p.preco_de)}</s>` : ''}</div>
      <div class="parc">${parcelaTxt(p.preco)}</div>
      ${p.categoria === 'Semijoias' ? `<div class="garantia">${ICON.garantia}Banho de ouro 18k com garantia de 1 ano</div>` : ''}
      ${p.esgotado ? '<div class="aviso">Este produto esgotou. Siga a loja no Instagram para saber quando voltar.</div>' : `
      <div class="linha-comprar">
        <div class="qtd"><button data-q="-1" aria-label="Menos">−</button><input id="qtd" type="number" value="1" min="1" max="20" aria-label="Quantidade"><button data-q="1" aria-label="Mais">+</button></div>
        <button class="btn" id="comprar">Adicionar à sacola</button>
      </div>`}
      <div class="caixa"><h4>Calcular frete</h4>
        <form class="cep" id="fCep"><input type="text" inputmode="numeric" id="cep" placeholder="Seu CEP" maxlength="9"><button class="btn linha">Calcular</button></form>
        <div class="fretes" id="fretes"></div></div>
      <div class="caixa"><h4>Descrição</h4><div class="desc">${esc(p.descricao)}</div></div>
    </div>
  </div>
  ${p.relacionados.length ? `<section class="secao"><div class="tit"><h2><small>você também vai gostar</small>Combina com</h2></div>${grade(p.relacionados)}</section>` : ''}
  </div>`;
  const q = $('#qtd');
  $$('[data-q]').forEach(b => b.onclick = () => { q.value = Math.max(1, Math.min(20, (+q.value || 1) + +b.dataset.q)); });
  const bc = $('#comprar'); if (bc) bc.onclick = async () => { addSacola(p.id, Math.max(1, +q.value || 1)); await conferir(); location.hash = '#/sacola'; };
  ligarCep($('#fCep'), $('#cep'), $('#fretes'), () => [{ id: p.id, qtd: Math.max(1, +(q ? q.value : 1) || 1) }]);
}
function ligarCep(form, input, saida, itens) {
  try { const c = localStorage.getItem('dh_cep'); if (c) input.value = cepFmt(c); } catch {}
  input.oninput = () => { input.value = cepFmt(input.value); };
  form.onsubmit = async e => {
    e.preventDefault(); saida.innerHTML = '<div>Calculando…</div>';
    try {
      const f = await api('/api/frete', { cep: input.value, itens: itens() });
      try { localStorage.setItem('dh_cep', input.value.replace(/\D/g, '')); } catch {}
      saida.innerHTML = (f.endereco.cidade ? `<span class="parc">${esc(f.endereco.cidade)} / ${esc(f.endereco.uf)}</span>` : '') +
        f.opcoes.map(o => `<div><span>${esc(o.nome)} · até ${o.prazo} dia${o.prazo > 1 ? 's' : ''} úteis</span><b>${o.valor ? R(o.valor) : 'Grátis'}</b></div>`).join('') +
        (LOJA.frete_gratis_acima ? `<span class="parc">PAC grátis em compras acima de ${R(LOJA.frete_gratis_acima)}</span>` : '');
    } catch (err) { saida.innerHTML = `<div class="aviso erro">${esc(err.message)}</div>`; }
  };
}
let CONF = null;
async function conferir() {
  const r = await api('/api/sacola', { itens: sacola() });
  const nova = r.itens.map(i => ({ id: i.id, qtd: i.qtd }));
  if (JSON.stringify(nova) !== JSON.stringify(sacola())) salvarSacola(nova);
  CONF = r; return r;
}
async function paginaSacola() {
  const r = await conferir();
  if (!r.itens.length) { app.innerHTML = `<div class="wrap pagina"><div class="vazio"><h3>Sua sacola está vazia</h3><p>Que tal conhecer as semijoias?</p><p><a class="btn" href="#/c/Semijoias">Ver semijoias</a></p></div></div>`; return; }
  const falta = LOJA.frete_gratis_acima - r.subtotal;
  app.innerHTML = `<div class="wrap pagina"><h1>Sacola</h1>
  ${r.avisos.map(a => `<div class="aviso">${esc(a)}</div>`).join('')}
  <div class="cols"><div>
    ${r.itens.map(i => `<div class="item"><a href="#/p/${esc(i.slug)}"><img src="${esc(i.img)}" alt=""></a>
      <div><h3>${esc(i.nome)}</h3><div class="parc">${R(i.preco)} cada</div></div>
      <div><div class="qtd"><button data-m="${i.id}" data-d="-1">−</button><input value="${i.qtd}" readonly aria-label="Quantidade"><button data-m="${i.id}" data-d="1">+</button></div><button class="rm" data-rm="${i.id}">remover</button></div></div>`).join('')}
    <p><a href="#/todos" class="parc">← continuar comprando</a></p>
  </div>
  <aside class="resumo"><h3>Resumo</h3>
    <div class="l"><span>Subtotal</span><b>${R(r.subtotal)}</b></div>
    ${falta > 0 ? `<div class="parc">Faltam ${R(falta)} para o PAC grátis</div>` : '<div class="parc" style="color:var(--ok)">Você ganhou PAC grátis</div>'}
    <div class="caixa" style="margin:14px 0"><h4>Frete</h4><form class="cep" id="fCep"><input type="text" inputmode="numeric" id="cep" placeholder="Seu CEP"><button class="btn linha">OK</button></form><div class="fretes" id="fretes"></div></div>
    <a class="btn cheio" href="#/checkout">Finalizar compra</a>
    <div class="segura">${ICON.cadeado}Pagamento seguro · Pix ou cartão</div>
  </aside></div></div>`;
  $$('[data-m]').forEach(b => b.onclick = async () => {
    const s = sacola(); const it = s.find(x => x.id === +b.dataset.m); it.qtd = Math.max(1, it.qtd + +b.dataset.d); salvarSacola(s);
    const r2 = await conferir(); if (r2.avisos.length) toast(r2.avisos[0]); paginaSacola();
  });
  $$('[data-rm]').forEach(b => b.onclick = () => { salvarSacola(sacola().filter(x => x.id !== +b.dataset.rm)); paginaSacola(); });
  ligarCep($('#fCep'), $('#cep'), $('#fretes'), sacola);
}

// ---------- checkout ----------
const SALVO = 'dh_cliente';
async function checkout() {
  const r = await conferir();
  if (!r.itens.length) { location.hash = '#/sacola'; return; }
  let cli = {}; try { cli = JSON.parse(localStorage.getItem(SALVO)) || {}; } catch {}
  const st = { frete: null, opcoes: [], pagamento: 'pix', parcelas: 1, maxParc: 1 };
  app.innerHTML = `<div class="wrap pagina"><h1>Finalizar compra</h1>
  <div id="msg"></div>
  <div class="cols"><form id="fCk" novalidate>
    <section class="etapa"><h2><i>1</i>Seus dados</h2>
      <div class="campo"><label for="nome">Nome completo</label><input type="text" id="nome" autocomplete="name" value="${esc(cli.nome)}"></div>
      <div class="duas"><div class="campo"><label for="email">E-mail</label><input type="email" id="email" autocomplete="email" value="${esc(cli.email)}"></div>
      <div class="campo"><label for="tel">Celular com DDD</label><input type="tel" id="tel" autocomplete="tel" value="${esc(cli.telefone)}" placeholder="(11) 90000-0000"></div></div>
      <div class="campo"><label for="cpf">CPF (para a nota e os Correios)</label><input type="text" inputmode="numeric" id="cpf" value="${esc(cli.cpf)}" placeholder="000.000.000-00"></div>
    </section>
    <section class="etapa"><h2><i>2</i>Entrega</h2>
      <div class="duas"><div class="campo"><label for="cep">CEP</label><input type="text" inputmode="numeric" id="cep" autocomplete="postal-code" value="${esc(cepFmt(cli.cep))}" placeholder="00000-000"></div><div></div></div>
      <div class="tres"><div class="campo"><label for="rua">Rua</label><input type="text" id="rua" autocomplete="address-line1" value="${esc(cli.rua)}"></div>
      <div class="campo"><label for="numero">Número</label><input type="text" id="numero" value="${esc(cli.numero)}"></div>
      <div class="campo"><label for="compl">Complemento</label><input type="text" id="compl" value="${esc(cli.complemento)}"></div></div>
      <div class="tres"><div class="campo"><label for="bairro">Bairro</label><input type="text" id="bairro" value="${esc(cli.bairro)}"></div>
      <div class="campo"><label for="cidade">Cidade</label><input type="text" id="cidade" value="${esc(cli.cidade)}"></div>
      <div class="campo"><label for="uf">UF</label><input type="text" id="uf" maxlength="2" value="${esc(cli.uf)}"></div></div>
      <div id="opFrete"><p class="parc">Digite o CEP para ver as opções dos Correios.</p></div>
    </section>
    <section class="etapa"><h2><i>3</i>Pagamento</h2>
      <div class="pags">
        <div class="pag sel" data-pg="pix">${ICON.pix}Pix</div>
        <div class="pag" data-pg="credito">${ICON.cartao}Crédito</div>
        <div class="pag" data-pg="debito">${ICON.cartao}Débito</div>
      </div>
      <div id="pgPix"><p class="parc">Você recebe o QR Code e o código copia e cola na próxima tela. O pagamento é confirmado na hora e o Pix vale por ${LOJA.pix_minutos} minutos.</p></div>
      <div id="pgCartao" hidden>
        <div class="campo"><label for="cnum">Número do cartão</label><input type="text" inputmode="numeric" id="cnum" autocomplete="cc-number" placeholder="0000 0000 0000 0000"></div>
        <div class="campo"><label for="cnome">Nome impresso no cartão</label><input type="text" id="cnome" autocomplete="cc-name"></div>
        <div class="duas"><div class="campo"><label for="cval">Validade</label><input type="text" inputmode="numeric" id="cval" autocomplete="cc-exp" placeholder="MM/AA"></div>
        <div class="campo"><label for="ccvv">Código de segurança</label><input type="text" inputmode="numeric" id="ccvv" autocomplete="cc-csc" placeholder="CVV"></div></div>
        <div class="campo" id="cParc"><label for="parc">Parcelas</label><select id="parc"></select></div>
        ${LOJA.demo ? '<div class="aviso">Demonstração: use um cartão de teste como 4111 1111 1111 1111, validade futura e qualquer CVV. O final 0002 simula cartão recusado.</div>' : ''}
      </div>
    </section>
  </form>
  <aside class="resumo"><h3>Seu pedido</h3>
    ${r.itens.map(i => `<div class="mini"><img src="${esc(i.img)}" alt=""><span>${i.qtd}× ${esc(i.nome)}</span><b>${R(i.preco * i.qtd)}</b></div>`).join('')}
    <div class="l"><span>Subtotal</span><b>${R(r.subtotal)}</b></div>
    <div class="l"><span>Frete</span><b id="rFrete">—</b></div>
    <div class="l total"><span>Total</span><b id="rTotal">${R(r.subtotal)}</b></div>
    <div class="parc" id="rParc"></div>
    <button class="btn cheio vinho" id="pagar" style="margin-top:14px">Pagar</button>
    <div class="segura">${ICON.cadeado}Ambiente seguro</div>
  </aside></div></div>`;
  const v = id => $('#' + id).value.trim();
  const total = () => r.subtotal + (st.frete ? st.frete.valor : 0);
  function atualizar() {
    $('#rFrete').textContent = st.frete ? (st.frete.valor ? R(st.frete.valor) : 'Grátis') : '—';
    $('#rTotal').textContent = R(total());
    const n = Math.max(1, Math.min(LOJA.parcelas_max, Math.floor(total() / LOJA.parcela_minima) || 1)); st.maxParc = n;
    const sel = $('#parc'), atual = +sel.value || 1;
    sel.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}x de ${R(total() / (i + 1))} sem juros</option>`).join('');
    sel.value = Math.min(atual, n);
    $('#rParc').textContent = st.pagamento === 'credito' && +sel.value > 1 ? `${sel.value}x de ${R(total() / +sel.value)} sem juros` : '';
    $('#pagar').textContent = st.pagamento === 'pix' ? `Gerar Pix de ${R(total())}` : `Pagar ${R(total())}`;
  }
  $('#parc').onchange = atualizar;
  async function buscarFrete() {
    const cep = v('cep').replace(/\D/g, ''); if (cep.length !== 8) return;
    $('#opFrete').innerHTML = '<p class="parc">Calculando o frete…</p>';
    try {
      const f = await api('/api/frete', { cep, itens: sacola() });
      const e = f.endereco;
      if (e.rua && !v('rua')) $('#rua').value = e.rua;
      if (e.bairro && !v('bairro')) $('#bairro').value = e.bairro;
      if (e.cidade) $('#cidade').value = e.cidade;
      $('#uf').value = e.uf || f.uf;
      st.opcoes = f.opcoes; st.frete = st.opcoes.find(o => st.frete && o.servico === st.frete.servico) || st.opcoes[0];
      $('#opFrete').innerHTML = f.opcoes.map(o => `<label class="opc${o.servico === st.frete.servico ? ' sel' : ''}"><input type="radio" name="frete" value="${o.servico}"${o.servico === st.frete.servico ? ' checked' : ''}>
        <span class="t"><b>${esc(o.nome)}</b><span>Chega em até ${o.prazo} dia${o.prazo > 1 ? 's' : ''} úteis após a postagem</span></span><b>${o.valor ? R(o.valor) : 'Grátis'}</b></label>`).join('');
      $$('input[name=frete]').forEach(i => i.onchange = () => { st.frete = st.opcoes.find(o => o.servico === i.value); $$('.opc').forEach(l => l.classList.toggle('sel', l.contains(i))); atualizar(); });
      if (!v('numero')) $('#numero').focus();
    } catch (err) { st.frete = null; $('#opFrete').innerHTML = `<div class="aviso erro">${esc(err.message)}</div>`; }
    atualizar();
  }
  $('#cep').oninput = e => { e.target.value = cepFmt(e.target.value); if (e.target.value.length === 9) buscarFrete(); };
  $('#cpf').oninput = e => { const d = e.target.value.replace(/\D/g, '').slice(0, 11); e.target.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };
  $('#tel').oninput = e => { const d = e.target.value.replace(/\D/g, '').slice(0, 11); e.target.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3') : d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => `(${a}) ${b}${c ? '-' + c : ''}`); };
  $('#cnum').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '); };
  $('#cval').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2'); };
  $('#ccvv').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); };
  $('#uf').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); };
  $$('[data-pg]').forEach(b => b.onclick = () => {
    st.pagamento = b.dataset.pg; $$('[data-pg]').forEach(x => x.classList.toggle('sel', x === b));
    $('#pgPix').hidden = st.pagamento !== 'pix'; $('#pgCartao').hidden = st.pagamento === 'pix'; $('#cParc').hidden = st.pagamento !== 'credito'; atualizar();
  });
  if (v('cep').length === 9) buscarFrete();
  atualizar();
  $('#pagar').onclick = async () => {
    const msg = $('#msg'); msg.innerHTML = '';
    const cliente = { nome: v('nome'), email: v('email'), telefone: v('tel'), cpf: v('cpf') };
    const endereco = { cep: v('cep'), rua: v('rua'), numero: v('numero'), complemento: v('compl'), bairro: v('bairro'), cidade: v('cidade'), uf: v('uf') };
    if (!st.frete) { msg.innerHTML = '<div class="aviso erro">Digite o CEP para calcular o frete.</div>'; $('#cep').focus(); scrollTo(0, 0); return; }
    try { localStorage.setItem(SALVO, JSON.stringify({ ...cliente, ...endereco })); } catch {}
    const b = $('#pagar'); b.disabled = true; b.textContent = 'Processando…';
    try {
      const corpo = { itens: sacola(), cliente, endereco, frete: st.frete.servico, pagamento: st.pagamento, parcelas: +$('#parc').value || 1 };
      if (st.pagamento !== 'pix') corpo.cartao = { numero: v('cnum'), nome: v('cnome'), validade: v('cval'), cvv: v('ccvv') };
      const p = await api('/api/pedido', corpo);
      salvarSacola([]);
      location.hash = `#/pedido/${p.codigo}/${p.chave}`;
    } catch (err) {
      msg.innerHTML = `<div class="aviso erro">${esc(err.message)}</div>`; scrollTo({ top: 0, behavior: 'smooth' });
      b.disabled = false; atualizar();
      if (err.status === 409) conferir();
    }
  };
}

// ---------- pedido ----------
let poll = null;
async function pedido(cod, k) {
  clearInterval(poll);
  let p; try { p = await api(`/api/pedido/${encodeURIComponent(cod)}?k=${encodeURIComponent(k)}`); } catch { app.innerHTML = '<div class="wrap vazio"><h3>Pedido não encontrado</h3></div>'; return; }
  const passos = [['Pedido', true], ['Pago', ['pago', 'enviado', 'entregue'].includes(p.status)], ['Enviado', ['enviado', 'entregue'].includes(p.status)], ['Entregue', p.status === 'entregue']];
  const etapas = `<div class="etapas">${passos.map(([t, f], i) => `<div class="${f ? 'feito' : ''}"><i>${f ? '✓' : i + 1}</i>${t}</div>`).join('')}</div>`;
  const resumo = `<div style="text-align:left;margin-top:18px">${p.itens.map(i => `<div class="mini"><img src="${esc(i.img)}" alt=""><span>${i.qtd}× ${esc(i.nome)}</span><b>${R(i.preco * i.qtd)}</b></div>`).join('')}
    <div class="l"><span>Frete (${esc(p.frete_servico)})</span><b>${p.frete_valor ? R(p.frete_valor) : 'Grátis'}</b></div>
    <div class="l total"><span>Total</span><b>${R(p.total)}</b></div>
    <p class="parc">${p.pagamento === 'pix' ? 'Pix' : (p.pagamento === 'credito' ? 'Crédito' : 'Débito') + (p.cartao_final ? ' · ' + esc(p.cartao_final) : '') + (p.parcelas > 1 ? ` · ${p.parcelas}x` : '')} · Entrega em ${esc(p.cidade)}/${esc(p.uf)}</p></div>`;
  let corpo;
  if (p.status === 'aguardando') {
    corpo = `<p class="scr">quase lá</p><h1>Pague com Pix</h1><p class="parc">Pedido nº ${esc(p.codigo)} · ${R(p.total)}</p>
      <img class="qr" src="${p.pix_qr}" alt="QR Code do Pix">
      <div class="copia"><input type="text" readonly value="${esc(p.pix)}" id="pixTxt"><button class="btn" id="copiar">Copiar</button></div>
      <p class="tempo" id="tempo"></p>
      ${LOJA.demo ? '<div class="aviso">Demonstração: este Pix não é real. Toque abaixo para simular o pagamento.</div><button class="btn vinho" id="simular">Simular pagamento do Pix</button>' : ''}`;
  } else if (p.status === 'cancelado') {
    corpo = `<h1>Pedido cancelado</h1><p class="parc">${esc(p.obs || '')}</p><p><a class="btn" href="#/">Voltar à loja</a></p>`;
  } else {
    corpo = `<p class="scr">obrigada!</p><h1>${p.status === 'pago' ? 'Pagamento aprovado' : p.status === 'enviado' ? 'Seu pedido está a caminho' : 'Pedido entregue'}</h1>
      <p class="parc">Pedido nº ${esc(p.codigo)}. ${p.status === 'pago' ? `Vamos preparar e postar nos Correios. Prazo de entrega: até ${p.frete_prazo} dias úteis após a postagem.` : ''}</p>
      ${p.rastreio ? `<div class="caixa"><h4>Rastreio dos Correios</h4><b>${esc(p.rastreio)}</b><br><a class="parc" target="_blank" rel="noopener" href="https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(p.rastreio)}">Acompanhar no site dos Correios</a></div>` : ''}`;
  }
  app.innerHTML = `<div class="wrap pagina"><div class="status">${corpo}${etapas}${resumo}
    <p class="parc" style="margin-top:14px">Guarde este link para acompanhar seu pedido.</p></div></div>`;
  if (p.status === 'aguardando') {
    $('#copiar').onclick = () => { navigator.clipboard?.writeText($('#pixTxt').value).then(() => toast('Código Pix copiado')).catch(() => { $('#pixTxt').select(); }); };
    const fim = new Date(p.expira_em.replace(' ', 'T'));
    const tick = () => { const s = Math.max(0, Math.round((fim - new Date()) / 1000)); $('#tempo') && ($('#tempo').textContent = s ? `Este Pix vale por mais ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : 'Pix expirado'); };
    tick();
    let n = 0; poll = setInterval(async () => { tick(); if (++n % 4) return; const q = await api(`/api/pedido/${cod}?k=${k}`).catch(() => null); if (q && q.status !== 'aguardando') { clearInterval(poll); pedido(cod, k); } }, 1000);
    const bs = $('#simular'); if (bs) bs.onclick = async () => { bs.disabled = true; await api(`/api/pedido/${cod}/simular-pix`, { k }); clearInterval(poll); pedido(cod, k); };
  }
}

// ---------- rotas ----------
async function rota() {
  clearInterval(poll);
  const h = decodeURIComponent(location.hash.slice(2)); const [a, b, c] = h.split('/');
  $('#menu').classList.remove('aberto');
  $$('#menu a').forEach(x => x.classList.toggle('ativo', x.getAttribute('href') === '#/' + (a === 'c' ? 'c/' + encodeURIComponent(b) : a)));
  document.title = LOJA.nome + ' · Semijoias e Beleza';
  scrollTo(0, 0);
  try {
    if (!a) await inicio();
    else if (a === 'c') await lista(b, '/api/produtos?cat=' + encodeURIComponent(b), 'coleção');
    else if (a === 'todos') await lista('Toda a loja', '/api/produtos', 'tudo da');
    else if (a === 'busca') await lista(`“${b}”`, '/api/produtos?q=' + encodeURIComponent(b), 'resultado para');
    else if (a === 'p') await produto(b);
    else if (a === 'sacola') await paginaSacola();
    else if (a === 'checkout') await checkout();
    else if (a === 'pedido') await pedido(b, c);
    else await inicio();
  } catch (e) { app.innerHTML = `<div class="wrap vazio"><h3>Ops</h3><p>${esc(e.message)}</p></div>`; }
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-add]'); if (!b) return;
  addSacola(+b.dataset.add, 1); const r = await conferir().catch(() => null);
  toast(r && r.avisos.length ? r.avisos[0] : 'Adicionado à sacola');
});
async function iniciar() {
  LOJA = await api('/api/loja');
  $('#menu').innerHTML = `<a href="#/">Início</a>` + LOJA.categorias.map(c => `<a href="#/c/${encodeURIComponent(c)}">${esc(c)}</a>`).join('');
  $('#fCats').innerHTML = LOJA.categorias.map(c => `<li><a href="#/c/${encodeURIComponent(c)}">${esc(c)}</a></li>`).join('') + '<li><a href="#/sacola">Minha sacola</a></li>';
  const ig = 'https://www.instagram.com/' + encodeURIComponent(LOJA.instagram) + '/';
  $('#lInsta').href = ig; $('#fInsta').href = ig; $('#fInsta').textContent = '@' + LOJA.instagram;
  if (LOJA.whatsapp) { $('#fZap').hidden = false; $('#fZap a').href = 'https://wa.me/' + LOJA.whatsapp; }
  $('#faixa').innerHTML = `Semijoias com <b>garantia de 1 ano</b> · Parcele em até <b>${LOJA.parcelas_max}x sem juros</b> · <b>PAC grátis</b> acima de ${R(LOJA.frete_gratis_acima)}`;
  $('#direitos').textContent = `© ${new Date().getFullYear()} ${LOJA.nome} · Espaço Beleza e Bem Estar`;
  let semAviso = false; try { semAviso = sessionStorage.getItem('dh_demo') === '1'; } catch {}
  $('#demo').hidden = !LOJA.demo || semAviso;
  $('#fDemo').onclick = () => { $('#demo').hidden = true; try { sessionStorage.setItem('dh_demo', '1'); } catch {} };
  $('#bMenu').onclick = () => $('#menu').classList.toggle('aberto');
  $('#bBusca').onclick = () => { $('#busca').classList.toggle('aberta'); $('#q').focus(); };
  $('#busca').onsubmit = e => { e.preventDefault(); const q = $('#q').value.trim(); if (q) { $('#busca').classList.remove('aberta'); location.hash = '#/busca/' + encodeURIComponent(q); } };
  contarSacola();
  addEventListener('hashchange', rota);
  rota();
}
iniciar().catch(e => { app.innerHTML = `<div class="wrap vazio"><h3>Loja fora do ar</h3><p>${esc(e.message)}</p></div>`; });
})();
