'use strict';
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (t) => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); };
  async function api(caminho, metodo = 'GET', corpo) {
    const r = await fetch('/api/admin/' + caminho, { method: metodo, headers: { 'content-type': 'application/json', 'x-nfs': '1' }, body: corpo ? JSON.stringify(corpo) : undefined, credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && caminho !== 'entrar') { mostrarEntrar(); throw new Error(j.erro || 'Entre de novo.'); }
    if (!r.ok) throw new Error(j.erro || `Erro ${r.status}`);
    return j;
  }
  let D = { produtos: [], config: {}, categorias: [] };
  const catNome = (id) => (D.categorias.find((c) => c.id === id) || {}).nome || id;

  function mostrarEntrar() { $('#telaEntrar').hidden = false; $('#telaPainel').hidden = true; setTimeout(() => $('#senha').focus(), 30); }
  $('#formEntrar').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#erroEntrar').textContent = '';
    try { await api('entrar', 'POST', { senha: $('#senha').value }); $('#senha').value = ''; await carregar(); }
    catch (er) { $('#erroEntrar').textContent = er.message; }
  });
  $('#sair').addEventListener('click', async () => { await api('sair', 'POST').catch(() => {}); mostrarEntrar(); });

  async function carregar() {
    D = await api('tudo');
    $('#telaEntrar').hidden = true; $('#telaPainel').hidden = false;
    $('#filtroCat').innerHTML = '<option value="">Todas as categorias</option>' + D.categorias.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    $('#eCat').innerHTML = D.categorias.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    $('#listaMarcas').innerHTML = [...new Set(D.produtos.map((p) => p.marca).filter(Boolean))].sort().map((m) => `<option value="${esc(m)}">`).join('');
    const c = D.config;
    $('#cNome').value = c.nome || ''; $('#cNome2').value = c.nome2 || ''; $('#cCor').value = c.cor || '#c8f031'; $('#cRodape').value = c.rodape || '';
    previaLogo();
    $('#cZap').value = c.whatsapp || ''; $('#cInsta').value = c.instagram || ''; $('#cTitulo').value = c.titulo || ''; $('#cSub').value = c.subtitulo || ''; $('#cAviso').value = c.aviso || '';
    $('#albumUrl').value = c.albumUrl || '';
    lista();
    if (D.importacao && D.importacao.rodando) acompanhar();
  }

  // ---------- abas ----------
  $('.abas').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    for (const x of document.querySelectorAll('.abas button')) x.setAttribute('aria-selected', String(x === b));
    for (const s of document.querySelectorAll('[data-painel]')) s.hidden = s.dataset.painel !== b.dataset.aba;
  });

  // ---------- lista ----------
  const filtro = { q: '', cat: '' };
  const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function lista() {
    const q = sem(filtro.q);
    const vis = D.produtos.filter((p) => (!filtro.cat || p.categoria === filtro.cat) && (!q || sem(`${p.nome} ${p.marca} ${p.tamanhos}`).includes(q)));
    const ativos = D.produtos.filter((p) => p.ativo && p.fotos.length).length;
    $('#resumo').textContent = `${D.produtos.length} produtos · ${ativos} na loja · ${D.produtos.reduce((s, p) => s + p.fotos.length, 0)} fotos`;
    $('#lista').innerHTML = vis.map((p) => `<div class="pc${p.ativo ? '' : ' oculto'}" draggable="true" data-id="${p.id}">
      <div class="pc-foto">${p.fotos[0] ? `<img src="/f/${p.fotos[0].id}-p.jpg" alt="" loading="lazy">` : ''}${p.ativo ? '' : '<span class="selo">Oculto</span>'}
        <button class="estrela${p.destaque ? ' on' : ''}" data-estrela="${p.id}" title="Destaque" aria-label="Destaque"><svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg></button></div>
      <div class="pc-txt"><b>${esc(p.nome)}</b><span>${esc(catNome(p.categoria))} · ${p.fotos.length} foto${p.fotos.length === 1 ? '' : 's'}${p.preco ? ` · R$ ${p.preco.toFixed(2).replace('.', ',')}` : ''}</span></div></div>`).join('') || '<p class="sub">Nenhum produto. Clique em "+ Novo produto" ou importe do álbum.</p>';
  }
  $('#busca').addEventListener('input', (e) => { filtro.q = e.target.value; lista(); });
  $('#filtroCat').addEventListener('change', (e) => { filtro.cat = e.target.value; lista(); });
  $('#lista').addEventListener('click', async (e) => {
    const est = e.target.closest('[data-estrela]');
    if (est) { e.stopPropagation(); const p = D.produtos.find((x) => x.id === est.dataset.estrela); try { Object.assign(p, await api('produtos/' + p.id, 'PUT', { destaque: !p.destaque })); lista(); } catch (er) { toast(er.message); } return; }
    const c = e.target.closest('.pc'); if (c) editar(D.produtos.find((x) => x.id === c.dataset.id));
  });
  // arrastar para ordenar
  let arr = null;
  $('#lista').addEventListener('dragstart', (e) => { arr = e.target.closest('.pc'); if (arr) { arr.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; } });
  $('#lista').addEventListener('dragover', (e) => { const alvo = e.target.closest('.pc'); if (!arr || !alvo || alvo === arr) return; e.preventDefault(); const r = alvo.getBoundingClientRect(); const depois = (e.clientX - r.left) > r.width / 2; alvo.parentNode.insertBefore(arr, depois ? alvo.nextSibling : alvo); });
  $('#lista').addEventListener('dragend', async () => {
    if (!arr) return; arr.classList.remove('arrastando'); arr = null;
    const visiveis = [...document.querySelectorAll('#lista .pc')].map((x) => x.dataset.id);
    const fila = [...visiveis]; const ids = D.produtos.map((p) => (visiveis.includes(p.id) ? fila.shift() : p.id)); // reordena só os que estão na tela
    D.produtos.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    try { await api('ordem', 'POST', { ids }); toast('Ordem salva'); } catch (er) { toast(er.message); }
  });

  // ---------- editor ----------
  let ed = null; // {id?, fotos:[]}
  const editor = $('#editor');
  function editar(p) {
    ed = p ? { id: p.id, fotos: p.fotos.map((f) => ({ ...f })) } : { fotos: [] };
    $('#eTitulo').textContent = p ? 'Editar produto' : 'Novo produto';
    $('#eNome').value = p?.nome || ''; $('#eCat').value = p?.categoria || 'tenis'; $('#eMarca').value = p?.marca || '';
    $('#eTam').value = p?.tamanhos || ''; $('#ePreco').value = p?.preco ? String(p.preco).replace('.', ',') : ''; $('#ePrecoDe').value = p?.precoDe ? String(p.precoDe).replace('.', ',') : '';
    $('#eDesc').value = p?.descricao || ''; $('#eAtivo').checked = p ? p.ativo : true; $('#eDest').checked = !!p?.destaque; $('#eNovo').checked = p ? !!p.novo : true;
    $('#apagar').hidden = !p; $('#erroProd').textContent = ''; $('#progFotos').textContent = '';
    fotos(); editor.hidden = false; document.body.classList.add('travado');
    setTimeout(() => $('#eNome').focus(), 30);
  }
  function fecharEditor() { editor.hidden = true; document.body.classList.remove('travado'); ed = null; }
  editor.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) fecharEditor(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !editor.hidden) fecharEditor(); });
  $('#novo').addEventListener('click', () => editar(null));
  function fotos() {
    $('#nFotosEd').textContent = ed.fotos.length ? `(${ed.fotos.length})` : '';
    $('#fotosEd').innerHTML = ed.fotos.map((f, i) => `<div class="fe" draggable="true" data-i="${i}"><img src="/f/${f.id}-p.jpg" alt=""><button type="button" class="x" data-x="${i}" aria-label="Tirar foto"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><span class="mv">${i ? `<button type="button" data-m="${i}" data-d="-1" aria-label="Para a esquerda">‹</button>` : ''}${i < ed.fotos.length - 1 ? `<button type="button" data-m="${i}" data-d="1" aria-label="Para a direita">›</button>` : ''}</span></div>`).join('');
  }
  $('#fotosEd').addEventListener('click', (e) => {
    const x = e.target.closest('[data-x]'); if (x) { ed.fotos.splice(+x.dataset.x, 1); return fotos(); }
    const m = e.target.closest('[data-m]'); if (m) { const i = +m.dataset.m, j = i + +m.dataset.d; [ed.fotos[i], ed.fotos[j]] = [ed.fotos[j], ed.fotos[i]]; fotos(); }
  });
  let fArr = null;
  $('#fotosEd').addEventListener('dragstart', (e) => { const f = e.target.closest('.fe'); if (f) { fArr = +f.dataset.i; f.classList.add('arrastando'); } });
  $('#fotosEd').addEventListener('dragover', (e) => { if (fArr != null && e.target.closest('.fe')) e.preventDefault(); });
  $('#fotosEd').addEventListener('drop', (e) => { e.preventDefault(); const alvo = e.target.closest('.fe'); if (fArr == null || !alvo) return; const [f] = ed.fotos.splice(fArr, 1); ed.fotos.splice(+alvo.dataset.i, 0, f); fArr = null; fotos(); });
  $('#fotosEd').addEventListener('dragend', () => { fArr = null; fotos(); });

  function reduzir(img, max, q) {
    const esc2 = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * esc2); c.height = Math.round(img.naturalHeight * esc2);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/jpeg', q), w: c.width, h: c.height };
  }
  function carregarImg(arq) {
    return new Promise((ok, falha) => { const u = URL.createObjectURL(arq); const i = new Image(); i.onload = () => { ok(i); setTimeout(() => URL.revokeObjectURL(u), 1000); }; i.onerror = () => falha(new Error('não é imagem')); i.src = u; });
  }
  $('#arquivos').addEventListener('change', async (e) => {
    const arqs = [...e.target.files]; e.target.value = '';
    let n = 0;
    for (const a of arqs) {
      $('#progFotos').textContent = `Enviando ${++n} de ${arqs.length}…`;
      try {
        const img = await carregarImg(a);
        const g = reduzir(img, 1200, 0.86), m = reduzir(img, 520, 0.8);
        const r = await api('foto', 'POST', { grande: g.url, mini: m.url, w: g.w, h: g.h });
        if (ed) { ed.fotos.push(r); fotos(); }
      } catch (er) { toast(`${a.name}: ${er.message}`); }
    }
    $('#progFotos').textContent = arqs.length ? `${arqs.length} foto(s) adicionada(s). Lembre de salvar.` : '';
  });

  $('#formProd').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#erroProd').textContent = '';
    const dados = { nome: $('#eNome').value, categoria: $('#eCat').value, marca: $('#eMarca').value, tamanhos: $('#eTam').value, preco: $('#ePreco').value, precoDe: $('#ePrecoDe').value, descricao: $('#eDesc').value, ativo: $('#eAtivo').checked, destaque: $('#eDest').checked, novo: $('#eNovo').checked, fotos: ed.fotos };
    if (!ed.fotos.length && dados.ativo) { $('#erroProd').textContent = 'Ponha pelo menos uma foto (ou desmarque "Aparece na loja").'; return; }
    $('#salvar').disabled = true;
    try {
      if (ed.id) { const p = await api('produtos/' + ed.id, 'PUT', dados); Object.assign(D.produtos.find((x) => x.id === ed.id), p); }
      else D.produtos.unshift(await api('produtos', 'POST', dados));
      fecharEditor(); lista(); toast('Produto salvo');
    } catch (er) { $('#erroProd').textContent = er.message; }
    $('#salvar').disabled = false;
  });
  $('#apagar').addEventListener('click', async () => {
    const p = D.produtos.find((x) => x.id === ed.id);
    if (!confirm(`Apagar "${p.nome}" e as fotos dele? Não dá para desfazer.`)) return;
    try { await api('produtos/' + p.id, 'DELETE'); D.produtos = D.produtos.filter((x) => x.id !== p.id); fecharEditor(); lista(); toast('Produto apagado'); } catch (er) { toast(er.message); }
  });

  // ---------- álbum ----------
  $('#formAlbum').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('importar', 'POST', { url: $('#albumUrl').value.trim() }); acompanhar(); } catch (er) { toast(er.message); }
  });
  async function acompanhar() {
    $('#statusAlbum').hidden = false;
    for (;;) {
      const s = await api('importar').catch(() => null); if (!s) return;
      $('#msgAlbum').textContent = s.msg + (s.rodando && s.total ? ` (${s.feitos}/${s.total})` : '');
      $('#prog').style.width = s.total ? `${Math.round((s.feitos / s.total) * 100)}%` : (s.rodando ? '8%' : '100%');
      if (!s.rodando) { if (s.ok) { D = await api('tudo'); lista(); } return; }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // ---------- config ----------
  const CORES = ['#c8f031', '#ff5a1f', '#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#06b6d4', '#ffffff'];
  $('#coresProntas').innerHTML = CORES.map((c) => `<button type="button" data-cor="${c}" aria-label="Cor ${c}"></button>`).join('');
  for (const b of document.querySelectorAll('#coresProntas button')) b.style.background = b.dataset.cor;
  $('#coresProntas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { $('#cCor').value = b.dataset.cor; corAoVivo(); } });
  function corAoVivo() { document.documentElement.style.setProperty('--laranja', $('#cCor').value); }
  $('#cCor').addEventListener('input', corAoVivo);
  function previaLogo() {
    const c = D.config; const el = $('#logoPrev');
    if (c.logo) el.innerHTML = `<img class="logo-img" src="/logo?v=${c.logo.v}" alt="">`;
    else { const ini = String(c.nome || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase(); el.innerHTML = `<span class="logo-mono">${esc(ini)}</span><span class="logo-txt"><b>${esc(c.nome)}</b>${c.nome2 ? `<i>${esc(c.nome2)}</i>` : ''}</span>`; }
    $('#tirarLogo').hidden = !c.logo;
  }
  $('#cLogo').addEventListener('change', async (e) => {
    const a = e.target.files[0]; e.target.value = ''; if (!a) return;
    try {
      const img = await carregarImg(a);
      const esc2 = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * esc2); cv.height = Math.round(img.naturalHeight * esc2);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const r = await api('logo', 'POST', { dados: cv.toDataURL('image/png') });
      D.config.logo = r.logo; previaLogo(); toast('Logo salva');
    } catch (er) { toast(er.message); }
  });
  $('#tirarLogo').addEventListener('click', async () => { try { await api('logo', 'POST', { remover: true }); D.config.logo = null; previaLogo(); toast('Logo tirada'); } catch (er) { toast(er.message); } });
  $('#formConfig').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('config', 'PUT', { nome: $('#cNome').value, nome2: $('#cNome2').value, cor: $('#cCor').value, rodape: $('#cRodape').value, whatsapp: $('#cZap').value, instagram: $('#cInsta').value, titulo: $('#cTitulo').value, subtitulo: $('#cSub').value, aviso: $('#cAviso').value }); toast('Configurações salvas'); D = await api('tudo'); $('#cZap').value = D.config.whatsapp; $('#cInsta').value = D.config.instagram; previaLogo(); }
    catch (er) { toast(er.message); }
  });

  carregar().catch(() => mostrarEntrar());
})();
