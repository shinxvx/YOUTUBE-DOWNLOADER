'use strict';
const $ = (s) => document.querySelector(s);
const el = (tag, attrs, ...filhos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
  for (const f of filhos.flat()) if (f != null && f !== false) e.append(f.nodeType ? f : document.createTextNode(String(f)));
  return e;
};
let DADOS = null;

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2000); }
async function chamar(url, corpo) {
  const r = await fetch(url, corpo === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/entrar') { mostrarEntrada(); throw new Error(j.erro || 'Entre com a senha.'); }
  if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
  return j;
}
function mostrarEntrada() { $('#app').hidden = true; $('#entrada').hidden = false; $('#senha').focus(); }

const quando = (iso) => { if (!iso) return ''; const d = new Date(iso.length <= 16 ? iso + ':00' : iso); return isNaN(d) ? iso : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(', 00:00', ''); };
function classe(s) {
  if (!s) return ['', 'conferindo…'];
  if (s.codigo === 0) return ['mal', 'fora do ar'];
  if (s.codigo >= 500) return ['mal', 'erro ' + s.codigo];
  if (s.codigo === 401 || s.codigo === 403 || (s.codigo === 302 && s.trancado)) return ['tranca', 'no ar · trancado'];
  if (s.codigo === 404) return ['mal', 'não achou (404)'];
  return ['ok', 'no ar'];
}
async function copiar(t) { try { await navigator.clipboard.writeText(t); toast('Copiado'); } catch (e) { toast('Não deu para copiar'); } }

function cartaoSistema(s) {
  const links = el('div', { class: 'links' }, s.links.map((l) => {
    const [c, txt] = classe(l.situacao);
    return el('div', { class: 'lnk' }, el('span', { class: 'ponto ' + c, title: txt }), el('a', { href: l.url, target: '_blank', rel: 'noopener', text: l.rotulo ? l.rotulo + ' — ' + l.url.replace(/^https?:\/\//, '') : l.url.replace(/^https?:\/\//, '') }), el('small', { text: txt }));
  }));
  let admin = null;
  if (s.admin) {
    const a = s.admin;
    const cod = el('code', { text: a.senha ? '••••••••••' : 'não encontrada' });
    let visivel = false;
    const btnVer = a.senha ? el('button', { class: 'mini', type: 'button', text: 'Mostrar' }) : null;
    if (btnVer) btnVer.onclick = () => { visivel = !visivel; cod.textContent = visivel ? a.senha : '••••••••••'; btnVer.textContent = visivel ? 'Esconder' : 'Mostrar'; };
    const btnCop = a.senha ? el('button', { class: 'mini', type: 'button', text: 'Copiar' }) : null;
    if (btnCop) btnCop.onclick = () => copiar(a.senha);
    admin = el('div', { class: 'admin' },
      el('span', { class: 'tit', text: 'Administrador' }),
      a.url ? el('div', { class: 'campo' }, el('span', { text: 'Entrar' }), el('a', { href: a.url, target: '_blank', rel: 'noopener', text: a.url.replace(/^https?:\/\//, '') })) : null,
      a.usuario ? el('div', { class: 'campo' }, el('span', { text: 'Usuário' }), el('code', { text: a.usuario })) : null,
      'senha' in a ? el('div', { class: 'campo' }, el('span', { text: 'Senha' }), cod, btnVer, btnCop) : null,
      a.obs ? el('small', { class: 'sub', text: a.obs }) : null);
  }
  return el('article', { class: 'sis', 'data-busca': [s.nome, s.grupo, s.oque, s.estado, ...s.links.map((l) => l.url)].join(' ').toLowerCase() },
    el('div', { class: 'sis-topo' }, s.logo ? el('img', { src: s.logo, alt: '' }) : null,
      el('div', {}, el('h3', { text: s.nome }), s.grupo ? el('span', { class: 'etq', text: s.grupo }) : null, s.estado ? el('span', { class: 'etq laranja', text: s.estado }) : null, s.desde ? el('span', { class: 'etq', text: 'desde ' + s.desde }) : null)),
    s.oque ? el('p', { text: s.oque }) : null,
    links, admin,
    s.tecnico ? el('details', {}, el('summary', { text: 'Onde fica no servidor' }), el('div', { class: 'tec', text: s.tecnico })) : null);
}

function desenhar() {
  const d = DADOS; if (!d) return;
  // resumo
  let no = 0, fora = 0, total = 0;
  d.sistemas.forEach((s) => s.links.forEach((l) => { total++; const c = classe(l.situacao)[0]; if (c === 'ok' || c === 'tranca') no++; else if (c === 'mal') fora++; }));
  const ultimo = d.linha[0];
  $('#resumo').replaceChildren(
    el('div', { class: 'num' }, el('b', { text: d.sistemas.length }), el('span', { text: 'sistemas' })),
    el('div', { class: 'num ok' }, el('b', { text: no + '/' + total }), el('span', { text: 'endereços no ar' })),
    el('div', { class: 'num' + (fora ? ' mal' : '') }, el('b', { text: fora }), el('span', { text: 'com problema' })),
    el('div', { class: 'num' }, el('b', { text: d.linha.length }), el('span', { text: ultimo ? 'registros · último ' + quando(ultimo.quando).slice(0, 10) : 'registros' })));
  $('#sistemas').replaceChildren(...d.sistemas.map(cartaoSistema));
  filtrar();
  // selects
  for (const sel of ['#filtroLinha', '#notaSistema']) {
    const s = $(sel); const v = s.value; const primeiro = s.options[0];
    s.replaceChildren(primeiro, ...d.sistemas.map((x) => el('option', { value: x.nome, text: x.nome }))); s.value = v;
  }
  desenharLinha();
  // pendências
  const comP = d.sistemas.filter((s) => s.pendencias.length);
  $('#pendencias').replaceChildren(...(comP.length ? comP.map((s) => el('div', { class: 'grupo-p' }, el('h3', { text: s.nome }), el('ol', {}, s.pendencias.map((p) => el('li', { text: p.replace(/\*\*/g, '') }))))) : [el('p', { class: 'vazio', text: 'Nenhuma pendência anotada.' })]));
  desenharNotas();
}
function desenharLinha() {
  const f = $('#filtroLinha').value;
  const itens = DADOS.linha.filter((h) => !f || h.sistema === f);
  $('#linha').replaceChildren(...(itens.length ? itens.map((h) => {
    const titulo = h.titulo.replace(/^\s*\d{4}-\d{2}-\d{2}\s*(~?\s*\d{1,2}:\d{2})?\s*(\(BRT\))?\s*[—-]?\s*/, '').replace(/^\s*\d{2}\/\d{2}\/\d{4}\s*[—-]?\s*/, '');
    return el('li', {}, el('span', { class: 'quando', text: (quando(h.quando) || h.titulo.slice(0, 20)) + ' · ' + h.sistema }), el('h3', { text: titulo || h.titulo }),
      el('details', {}, el('summary', { text: 'Detalhes' }), el('div', { class: 'txt', text: h.texto })));
  }) : [el('p', { class: 'vazio', text: 'Nada registrado.' })]));
}
function desenharNotas() {
  const n = DADOS.notas;
  $('#notas').replaceChildren(...(n.length ? n.map((x) => {
    const b = el('button', { class: 'mini', type: 'button', text: 'Apagar' });
    let confirmar = false;
    b.onclick = async () => {
      if (!confirmar) { confirmar = true; b.textContent = 'Apagar mesmo?'; setTimeout(() => { confirmar = false; b.textContent = 'Apagar'; }, 3000); return; }
      try { DADOS.notas = (await chamar('/api/notas', { apagar: x.id })).notas; desenharNotas(); } catch (e) { toast(e.message); }
    };
    return el('div', { class: 'nota' }, el('div', {}, el('small', { text: quando(x.quando) + (x.sistema ? ' · ' + x.sistema : '') }), el('p', { text: x.texto })), b);
  }) : [el('p', { class: 'vazio', text: 'Nenhuma nota ainda.' })]));
}
function filtrar() {
  const t = $('#filtro').value.trim().toLowerCase();
  document.querySelectorAll('.sis').forEach((s) => { s.hidden = !!t && !s.dataset.busca.includes(t); });
}

async function carregar() {
  try { DADOS = await chamar('/api/tudo'); $('#entrada').hidden = true; $('#app').hidden = false; desenhar(); } catch (e) { if (!$('#entrada').hidden) return; toast(e.message); }
}

$('#formEntrar').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#erroEntrar').textContent = '';
  try { await chamar('/api/entrar', { senha: $('#senha').value }); $('#senha').value = ''; await carregar(); } catch (x) { $('#erroEntrar').textContent = x.message; }
});
document.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-aba]').forEach((x) => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.aba').forEach((s) => { s.hidden = s.id !== 'aba-' + b.dataset.aba; });
  try { localStorage.setItem('cofre-aba', b.dataset.aba); } catch (e) {}
}));
$('#filtro').addEventListener('input', filtrar);
$('#filtroLinha').addEventListener('change', desenharLinha);
$('#checar').addEventListener('click', async () => {
  const b = $('#checar'); b.disabled = true; b.textContent = 'Conferindo…';
  try { DADOS = await chamar('/api/checar', {}); desenhar(); toast('Conferido'); } catch (e) { toast(e.message); }
  b.disabled = false; b.textContent = 'Conferir agora';
});
$('#formNota').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { DADOS.notas = (await chamar('/api/notas', { texto: $('#notaTexto').value, sistema: $('#notaSistema').value })).notas; $('#notaTexto').value = ''; desenharNotas(); toast('Nota guardada'); } catch (x) { toast(x.message); }
});
$('#formSenha').addEventListener('submit', async (e) => {
  e.preventDefault(); const m = $('#msgSenha');
  try { await chamar('/api/senha', { atual: $('#atual').value, nova: $('#nova').value }); m.textContent = 'Senha trocada.'; $('#atual').value = $('#nova').value = ''; } catch (x) { m.textContent = x.message; }
});
$('#sair').addEventListener('click', async () => { await chamar('/api/sair', {}).catch(() => {}); mostrarEntrada(); });

try { const a = localStorage.getItem('cofre-aba'); const b = a && document.querySelector(`[data-aba="${a}"]`); if (b) b.click(); } catch (e) {}
fetch('/api/tudo').then((r) => (r.status === 401 ? mostrarEntrada() : carregar())).catch(mostrarEntrada);
setInterval(() => { if (!$('#app').hidden) chamar('/api/tudo').then((d) => { DADOS = d; desenhar(); }).catch(() => {}); }, 5 * 60e3);
