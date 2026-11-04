'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const R = n => 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const data = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + ' ' + s.slice(11, 16) : '';
const ST = { aguardando: 'Aguardando Pix', pago: 'Pago · enviar', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
const CATS = ['Semijoias', 'Perfumes', 'Maquiagem', 'Skincare'];
const C = $('#conteudo');
let DEMO = false;

async function api(url, dados) {
  const r = await fetch(url, dados ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) } : {});
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && !url.endsWith('/login')) { mostrarLogin(); throw new Error('Entre de novo'); }
  if (!r.ok) throw new Error(j.erro || 'Erro');
  return j;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2600); }
function abrir(html) { $('#folha').innerHTML = '<button class="fechar" data-fechar aria-label="Fechar">×</button>' + html; $('#veu').hidden = false; }
function fechar() { $('#veu').hidden = true; }
$('#veu').onclick = e => { if (e.target.id === 'veu' || e.target.closest('[data-fechar]')) fechar(); };

async function mostrarLogin() {
  $('#painel').hidden = true; $('#entrar').hidden = false;
  const d = await fetch('/api/admin/demo').then(r => r.json()).catch(() => ({}));
  if (d.email) { $('#lDemo').innerHTML = `<div class="aviso" style="margin-top:14px">Demonstração: e-mail <b>${esc(d.email)}</b> e senha <b>${esc(d.senha)}</b></div>`; $('#lEmail').value = d.email; }
}
$('#fLogin').onsubmit = async e => {
  e.preventDefault(); $('#lMsg').innerHTML = '';
  try { await api('/api/admin/login', { email: $('#lEmail').value, senha: $('#lSenha').value }); iniciar(); }
  catch (err) { $('#lMsg').innerHTML = `<div class="aviso erro">${esc(err.message)}</div>`; }
};
$('#sair').onclick = async () => { await api('/api/admin/logout', {}); mostrarLogin(); };

// ---------- resumo ----------
async function resumo() {
  const r = await api('/api/admin/resumo');
  const max = Math.max(1, ...r.dias.map(d => d.v));
  C.innerHTML = `<div class="cab"><h1>Resumo</h1>${DEMO ? '<button class="btn linha peq" id="reset">Restaurar demonstração</button>' : ''}</div>
  <div class="kpis">
    <div class="kpi"><span>Vendas hoje</span><b>${R(r.hoje.v)}</b><small>${r.hoje.n} pedido(s)</small></div>
    <div class="kpi"><span>Vendas no mês</span><b>${R(r.mes.v)}</b><small>${r.mes.n} pedido(s)</small></div>
    <div class="kpi ${r.a_enviar ? 'alerta' : ''}"><span>Para enviar</span><b>${r.a_enviar}</b><small>pagos esperando os Correios</small></div>
    <div class="kpi"><span>Aguardando Pix</span><b>${r.aguardando}</b><small>reservados por 30 min</small></div>
  </div>
  <div class="duasc">
    <div class="caixa"><h4>Vendas dos últimos 14 dias</h4><div class="barras">${r.dias.map(d => `<div title="${R(d.v)}"><i style="height:${Math.round(d.v / max * 100)}%"></i><span>${d.dia.slice(8)}</span></div>`).join('')}</div></div>
    <div>
      <div class="caixa"><h4>Estoque acabando</h4>${r.estoque_baixo.length ? r.estoque_baixo.map(p => `<div class="l"><span>${esc(p.nome)}</span><b class="estq baixo">${p.estoque ? p.estoque + ' un.' : 'esgotado'}</b></div>`).join('') : '<p class="parc">Tudo em dia.</p>'}</div>
      <div class="caixa"><h4>Mais vendidos</h4>${r.mais_vendidos.length ? r.mais_vendidos.map(p => `<div class="l"><span>${esc(p.nome)}</span><b>${p.q}</b></div>`).join('') : '<p class="parc">Ainda sem vendas.</p>'}</div>
    </div>
  </div>`;
  const b = $('#reset'); if (b) b.onclick = async () => { if (!confirm('Voltar a demonstração ao estado inicial? Pedidos e produtos de teste serão apagados.')) return; await api('/api/admin/reset-demo', {}); toast('Demonstração restaurada'); resumo(); };
}

// ---------- pedidos ----------
let filtro = 'pago';
async function pedidos() {
  const ps = await api('/api/admin/pedidos' + (filtro ? '?status=' + filtro : ''));
  C.innerHTML = `<div class="cab"><h1>Pedidos</h1></div>
  <div class="filtros">${[['pago', 'Para enviar'], ['aguardando', 'Aguardando Pix'], ['enviado', 'Enviados'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados'], ['', 'Todos']].map(([v, t]) => `<button data-f="${v}" class="${v === filtro ? 'sel' : ''}">${t}</button>`).join('')}</div>
  <div class="lista">${ps.length ? ps.map(p => `<div class="lin" data-id="${p.id}"><img src="${esc(p.itens[0] && p.itens[0].img)}" alt="">
    <div><b>#${esc(p.codigo)} · ${esc(p.nome)}</b><small>${data(p.criado)} · ${p.itens.reduce((a, i) => a + i.qtd, 0)} item(ns) · ${esc(p.cidade)}/${esc(p.uf)} · ${esc(p.frete_servico)}</small></div>
    <span class="st ${p.status}">${ST[p.status]}</span><b class="vl">${R(p.total)}</b></div>`).join('') : '<div class="vazio"><p>Nenhum pedido aqui.</p></div>'}</div>`;
  $$('[data-f]').forEach(b => b.onclick = () => { filtro = b.dataset.f; pedidos(); });
  $$('.lin').forEach(l => l.onclick = () => detalhe(ps.find(p => p.id === +l.dataset.id)));
}
function detalhe(p) {
  const pg = p.pagamento === 'pix' ? 'Pix' : (p.pagamento === 'credito' ? 'Crédito' : 'Débito') + (p.cartao_final ? ' · ' + p.cartao_final : '') + (p.parcelas > 1 ? ` · ${p.parcelas}x` : '');
  const cpf = String(p.cpf || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  abrir(`<h2>Pedido #${esc(p.codigo)}</h2><span class="st ${p.status}">${ST[p.status]}</span> <span class="parc">feito em ${data(p.criado)}${p.pago_em ? ' · pago em ' + data(p.pago_em) : ''}</span>
  <div class="blocos">
    <div class="bloco"><h4>Cliente</h4>${esc(p.nome)}<br>CPF ${esc(cpf)}<br>${esc(p.email)}<br><a href="https://wa.me/55${esc(p.telefone)}" target="_blank" rel="noopener">WhatsApp ${esc(p.telefone)}</a></div>
    <div class="bloco"><h4>Entregar em (${esc(p.frete_servico)})</h4>${esc(p.rua)}, ${esc(p.numero)}${p.complemento ? ' · ' + esc(p.complemento) : ''}<br>${esc(p.bairro)} · ${esc(p.cidade)}/${esc(p.uf)}<br>CEP ${esc(String(p.cep).replace(/(\d{5})(\d{3})/, '$1-$2'))}</div>
  </div>
  ${p.itens.map(i => `<div class="mini"><img src="${esc(i.img)}" alt=""><span>${i.qtd}× ${esc(i.nome)}</span><b>${R(i.preco * i.qtd)}</b></div>`).join('')}
  <div class="l"><span>Frete</span><b>${p.frete_valor ? R(p.frete_valor) : 'Grátis'}</b></div>
  <div class="l total"><span>Total · ${esc(pg)}</span><b>${R(p.total)}</b></div>
  ${p.rastreio ? `<p>Rastreio: <b>${esc(p.rastreio)}</b></p>` : ''}${p.obs ? `<p class="parc">${esc(p.obs)}</p>` : ''}
  ${p.status === 'pago' ? `<div class="caixa" style="margin-top:14px"><h4>Postou nos Correios?</h4><div class="cep"><input type="text" id="rast" placeholder="Código de rastreio (ex.: AA123456789BR)" maxlength="13"><button class="btn" data-a="enviar">Marcar enviado</button></div></div>` : ''}
  <div class="bts">
    ${p.status === 'aguardando' ? '<button class="btn" data-a="pago">Confirmar Pix recebido</button>' : ''}
    ${p.status === 'enviado' ? '<button class="btn" data-a="entregue">Marcar entregue</button>' : ''}
    ${['aguardando', 'pago'].includes(p.status) ? '<button class="btn linha" data-a="cancelar">Cancelar pedido</button>' : ''}
  </div>`);
  const r = $('#rast'); if (r) r.oninput = () => { r.value = r.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  $$('[data-a]', $('#folha')).forEach(b => b.onclick = async () => {
    const a = b.dataset.a;
    if (a === 'cancelar' && !confirm(p.status === 'pago' ? 'Cancelar este pedido pago? Os produtos voltam ao estoque e você precisa devolver o dinheiro da cliente.' : 'Cancelar este pedido? Os produtos voltam ao estoque.')) return;
    try { const n = await api(`/api/admin/pedido/${p.id}/${a}`, { rastreio: r ? r.value : '' }); toast('Pedido atualizado'); detalhe(n); pedidos(); }
    catch (err) { toast(err.message); }
  });
}

// ---------- produtos ----------
async function produtos() {
  const ps = await api('/api/admin/produtos');
  C.innerHTML = `<div class="cab"><h1>Produtos</h1><button class="btn peq" id="novo">+ Novo produto</button></div>
  <div class="lista">${ps.map(p => `<div class="lin" data-id="${p.id}"><img src="${esc(p.img)}" alt="">
    <div><b>${esc(p.nome)}${p.ativo ? '' : ' (oculto)'}</b><small>${esc(p.categoria)}${p.destaque ? ' · destaque' : ''}</small></div>
    <span class="estq ${p.estoque <= 2 ? 'baixo' : ''}">${p.estoque} em estoque</span><b class="vl">${R(p.preco)}</b></div>`).join('')}</div>`;
  $('#novo').onclick = () => editar({ categoria: 'Semijoias', ativo: 1, peso_g: 30, estoque: 1 });
  $$('.lin').forEach(l => l.onclick = () => editar(ps.find(p => p.id === +l.dataset.id)));
}
function editar(p) {
  let foto = null, tirar = false;
  abrir(`<h2>${p.id ? 'Editar produto' : 'Novo produto'}</h2>
  <form id="fP">
    <div class="fotoed"><img id="pfImg" src="${esc(p.img || '/arte/0.svg')}" alt=""><div><label class="btn linha peq" for="pf">Escolher foto</label><input type="file" id="pf" accept="image/*" hidden>
      ${p.foto ? '<br><button type="button" class="rm" id="tirar">usar desenho em vez da foto</button>' : ''}<p class="parc">Foto quadrada ou em pé fica melhor.</p></div></div>
    <div class="campo"><label>Nome</label><input type="text" id="pn" value="${esc(p.nome)}" maxlength="100"></div>
    <div class="duas"><div class="campo"><label>Categoria</label><select id="pc">${CATS.map(c => `<option${c === p.categoria ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="campo"><label>Estoque (a cliente não vê)</label><input type="number" id="pe" min="0" value="${p.estoque ?? 0}"></div></div>
    <div class="tres"><div class="campo"><label>Preço (R$)</label><input type="text" inputmode="decimal" id="pp" value="${p.preco ? String(p.preco).replace('.', ',') : ''}"></div>
    <div class="campo"><label>Preço "de" (opcional)</label><input type="text" inputmode="decimal" id="pd" value="${p.preco_de ? String(p.preco_de).replace('.', ',') : ''}"></div>
    <div class="campo"><label>Peso (g)</label><input type="number" id="pg" min="10" value="${p.peso_g || 100}"></div></div>
    <div class="campo"><label>Descrição</label><textarea id="pdesc" maxlength="2000">${esc(p.descricao)}</textarea></div>
    <label class="chk"><input type="checkbox" id="pdest"${p.destaque ? ' checked' : ''}> Mostrar nos destaques</label>
    <label class="chk"><input type="checkbox" id="pat"${p.ativo !== 0 ? ' checked' : ''}> Visível na loja</label>
    <div id="pMsg"></div>
    <div class="bts"><button class="btn">Salvar</button></div>
  </form>`);
  $('#pf').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(); img.onload = () => {
      const s = Math.min(1, 1200 / Math.max(img.width, img.height)); const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      foto = cv.toDataURL('image/jpeg', .85); $('#pfImg').src = foto; URL.revokeObjectURL(img.src);
    }; img.src = URL.createObjectURL(f);
  };
  const t = $('#tirar'); if (t) t.onclick = () => { tirar = true; foto = null; $('#pfImg').src = '/arte/' + p.id + '.svg'; };
  $('#fP').onsubmit = async e => {
    e.preventDefault();
    try {
      await api('/api/admin/produto', { id: p.id, nome: $('#pn').value, categoria: $('#pc').value, estoque: $('#pe').value, preco: $('#pp').value,
        preco_de: $('#pd').value || null, peso_g: $('#pg').value, descricao: $('#pdesc').value, destaque: $('#pdest').checked, ativo: $('#pat').checked,
        foto_base64: foto, tirar_foto: tirar });
      fechar(); toast('Produto salvo'); produtos();
    } catch (err) { $('#pMsg').innerHTML = `<div class="aviso erro">${esc(err.message)}</div>`; }
  };
}

// ---------- config ----------
async function config() {
  const c = await api('/api/admin/config');
  const f = (k, t, extra = '') => `<div class="campo"><label for="c_${k}">${t}</label><input type="text" id="c_${k}" value="${esc(c[k])}" ${extra}></div>`;
  C.innerHTML = `<div class="cab"><h1>Configurações</h1></div>
  <form id="fC" class="etapa">
    <div class="duas">${f('loja_nome', 'Nome da loja')}${f('instagram', 'Instagram (sem @)')}</div>
    ${f('loja_frase', 'Frase da loja')}
    <div class="duas">${f('whatsapp', 'WhatsApp (só números, com 55 e DDD)', 'inputmode="numeric"')}${f('email', 'E-mail de contato')}</div>
    <div class="duas">${f('cep_origem', 'CEP de onde sai o envio', 'inputmode="numeric"')}${f('frete_gratis_acima', 'PAC grátis acima de (R$)', 'inputmode="decimal"')}</div>
    <div class="tres">${f('parcelas_max', 'Máximo de parcelas sem juros', 'inputmode="numeric"')}${f('parcela_minima', 'Parcela mínima (R$)', 'inputmode="decimal"')}${f('pix_minutos', 'Minutos para pagar o Pix', 'inputmode="numeric"')}</div>
    <div class="bts"><button class="btn">Salvar</button></div>
  </form>
  <div class="caixa"><h4>Pagamentos e frete</h4><p class="parc">${DEMO ? 'Na demonstração o Pix e o cartão são simulados e o frete usa uma tabela parecida com a dos Correios. Na loja de verdade, o pagamento entra pelo Mercado Pago (Pix, crédito e débito, dinheiro na conta da loja) e o frete vem direto dos Correios, com etiqueta.' : 'Pagamentos pelo Mercado Pago e frete dos Correios.'}</p></div>`;
  $('#fC').onsubmit = async e => {
    e.preventDefault(); const d = {}; for (const i of $$('#fC input')) d[i.id.slice(2)] = i.value;
    try { await api('/api/admin/config', d); toast('Configurações salvas'); } catch (err) { toast(err.message); }
  };
}

async function rota() {
  const a = location.hash.slice(1) || 'resumo';
  $$('#abas a').forEach(x => x.classList.toggle('ativo', x.getAttribute('href') === '#' + a));
  try { await ({ resumo, pedidos, produtos, config }[a] || resumo)(); } catch (e) { if (e.message !== 'Entre de novo') C.innerHTML = `<div class="aviso erro">${esc(e.message)}</div>`; }
}
async function iniciar() {
  try { const eu = await api('/api/admin/eu'); DEMO = eu.demo; } catch { return; }
  $('#entrar').hidden = true; $('#painel').hidden = false;
  rota();
}
addEventListener('hashchange', rota);
iniciar();
})();
