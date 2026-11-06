'use strict';
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const D = JSON.parse($('#dados')?.textContent || '{"loja":{},"categorias":[],"produtos":[]}');
  const { loja, categorias } = D; const produtos = D.produtos;
  const catNome = Object.fromEntries(categorias.map((c) => [c.id, c.nome]));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const real = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const foto = (f, mini) => `/f/${f.id}${mini ? '-p' : ''}.jpg`;
  const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const zap = (txt) => loja.whatsapp ? `https://wa.me/${loja.whatsapp}?text=${encodeURIComponent(txt)}` : '';
  const toast = (t) => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400); };

  // ---------- textos da loja ----------
  const marcas = [...new Set(produtos.map((p) => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const nums = [...new Set(produtos.flatMap((p) => (p.categoria === 'roupas' ? [] : p.numeros)))].filter((n) => n >= 30).sort((a, b) => a - b);
  const letrasTodas = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3', 'G4'].filter((l) => produtos.some((p) => p.letras.includes(l)));
  if (loja.titulo) { const t = loja.titulo.trim(); const i = t.lastIndexOf(' '); $('#heroTitulo').innerHTML = i > 0 ? `${esc(t.slice(0, i))} <em>${esc(t.slice(i + 1))}</em>` : esc(t); }
  $('#heroSub').textContent = loja.subtitulo || '';
  $('#nModelos').textContent = produtos.length;
  $('#nMarcas').textContent = marcas.length;
  if (nums.length) $('#nNumeracao').textContent = `${nums[0]}–${nums[nums.length - 1]}`;
  $('#ano').textContent = new Date().getFullYear();
  $('#rodapeEmp').textContent = loja.rodape || '';
  $('#nomeRodape').textContent = loja.nome || '';
  const avisos = (loja.aviso ? loja.aviso.split('|') : ['Catálogo 2026 atualizado', loja.whatsapp ? 'Pedido direto pelo WhatsApp' : 'Pedido pela sacola', nums.length ? `Numeração ${nums[0]} ao ${nums[nums.length - 1]}` : '', `${produtos.length} modelos`, 'Masculino e feminino']).map((s) => s.trim()).filter(Boolean);
  const umaVolta = avisos.map((a) => `<span>${esc(a)}</span>`).join('');
  $('#avisoTrilho').innerHTML = umaVolta.repeat(4) + umaVolta.repeat(4);
  const mv = (marcas.length ? marcas : ['Tênis', 'Esporte']).map((m) => `<span>${esc(m)}</span>`).join('');
  $('#faixaMarcas').innerHTML = mv.repeat(3) + mv.repeat(3);
  if (loja.whatsapp) {
    const z = zap(`Olá! Vim pelo site da ${loja.nome}.`);
    for (const el of [$('#heroZap'), $('#zapFixo')]) { el.href = z; el.target = '_blank'; el.rel = 'noopener'; el.hidden = false; }
  }
  const links = [];
  if (loja.instagram) links.push(`<a href="${esc(loja.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
  if (loja.whatsapp) links.push(`<a href="${esc(zap('Olá!'))}" target="_blank" rel="noopener">WhatsApp</a>`);
  links.push('<a href="#catalogo">Catálogo</a>');
  $('#rodapeLinks').innerHTML = links.join('');

  // vitrine do topo: 3 destaques (ou os 3 primeiros)
  const vitr = [...produtos.filter((p) => p.destaque), ...produtos.filter((p) => !p.destaque && p.categoria === 'tenis')].slice(0, 3);
  $('#heroVitrine').innerHTML = vitr.map((p, i) => `<figure class="hv ${'abc'[i]}"><img src="${foto(p.fotos[0], i !== 2)}" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}><figcaption>${esc(p.nome)}<small>${esc(faixa(p))}</small></figcaption></figure>`).join('')
    + (produtos.length ? `<div class="etiqueta-giro"><div>${produtos.length}<small>modelos</small></div></div>` : '');

  function faixa(p) {
    if (p.categoria === 'roupas' && p.letras.length) return p.letras.join(' / ');
    if (p.numeros.length) return `${p.numeros[0]} ao ${p.numeros[p.numeros.length - 1]}`;
    return p.letras.join(' / ');
  }

  // categorias
  const contCat = (id) => produtos.filter((p) => p.categoria === id).length;
  const catsComProd = categorias.filter((c) => contCat(c.id));
  $('#cats').innerHTML = catsComProd.map((c) => {
    const p = produtos.find((x) => x.categoria === c.id && x.destaque) || produtos.find((x) => x.categoria === c.id);
    const n = c.id === 'outlet' ? `${p.fotos.length} pares` : `${contCat(c.id)} modelo${contCat(c.id) > 1 ? 's' : ''}`;
    return `<button class="cat" data-cat="${c.id}"><img src="${foto(p.fotos[0], true)}" alt="" loading="lazy"><span>${esc(c.nome)}<small>${n}</small></span></button>`;
  }).join('');

  // ---------- filtros ----------
  const estado = { cat: '', marca: '', num: '', ordem: '', q: '' };
  $('#chipsCat').innerHTML = [`<button class="chip" role="tab" data-cat="" aria-selected="true">Tudo <small>${produtos.length}</small></button>`]
    .concat(catsComProd.map((c) => `<button class="chip" role="tab" data-cat="${c.id}" aria-selected="false">${esc(c.nome)} <small>${contCat(c.id)}</small></button>`)).join('');
  $('#fMarca').insertAdjacentHTML('beforeend', marcas.map((m) => `<option>${esc(m)}</option>`).join(''));
  $('#fNum').insertAdjacentHTML('beforeend', nums.map((n) => `<option value="${n}">${n}</option>`).join('') + letrasTodas.map((l) => `<option value="${l}">${l}</option>`).join(''));

  function filtrar() {
    const q = sem(estado.q).trim();
    let lista = produtos.filter((p) => {
      if (estado.cat && p.categoria !== estado.cat) return false;
      if (estado.marca && p.marca !== estado.marca) return false;
      if (estado.num) { if (/^\d+$/.test(estado.num) ? !p.numeros.includes(+estado.num) : !p.letras.includes(estado.num)) return false; }
      if (q) {
        const alvo = sem(`${p.nome} ${p.marca} ${catNome[p.categoria]} ${p.tamanhos} ${p.descricao}`);
        return q.split(/\s+/).every((t) => (/^\d{2}$/.test(t) ? p.numeros.includes(+t) || alvo.includes(t) : alvo.includes(t)));
      }
      return true;
    });
    if (estado.ordem === 'az') lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome));
    else if (estado.ordem === 'preco') lista = [...lista].sort((a, b) => (a.preco ?? 1e9) - (b.preco ?? 1e9));
    else if (estado.ordem === 'fotos') lista = [...lista].sort((a, b) => b.fotos.length - a.fotos.length);
    else lista = [...lista.filter((p) => p.destaque), ...lista.filter((p) => !p.destaque)];
    return lista;
  }
  function card(p) {
    const selos = [];
    if (p.novo) selos.push('<span class="selo l">Novo</span>');
    if (p.precoDe && p.preco && p.precoDe > p.preco) selos.push(`<span class="selo l">-${Math.round((1 - p.preco / p.precoDe) * 100)}%</span>`);
    if (p.categoria === 'outlet') selos.push('<span class="selo l">Últimas peças</span>');
    else if (p.destaque) selos.push('<span class="selo">Mais pedido</span>');
    const preco = p.preco ? `<b>${real(p.preco)}</b>${p.precoDe > p.preco ? `<s>${real(p.precoDe)}</s>` : ''}` : '<span class="consulta">Consultar preço</span>';
    const tam = p.categoria === 'roupas' && p.letras.length ? p.letras.join(' · ') : String(p.tamanhos || '').split('\n').join(' · ');
    return `<a class="card" href="/?p=${p.id}" data-id="${p.id}">
      <div class="card-foto">${selos.length ? `<div class="selos">${selos.join('')}</div>` : ''}
        <img class="a" src="${foto(p.fotos[0], true)}" alt="${esc(p.nome)}" loading="lazy" width="520" height="650">
        ${p.fotos[1] ? `<img class="b" src="${foto(p.fotos[1], true)}" alt="" loading="lazy">` : ''}
        ${p.fotos.length > 1 ? `<span class="n-fotos"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="m21 17-5-5-8 7"/></svg>${p.fotos.length}</span>` : ''}
      </div>
      <div class="card-txt">${p.marca ? `<span class="card-marca">${esc(p.marca)}</span>` : ''}<h3 class="card-nome">${esc(p.nome)}</h3>${tam ? `<p class="card-tam">${esc(tam)}</p>` : ''}<div class="card-preco">${preco}</div></div>
    </a>`;
  }
  function desenhar() {
    const lista = filtrar();
    $('#grade').innerHTML = lista.map(card).join('');
    $('#vazio').hidden = !!lista.length;
    $('#resultado').innerHTML = `<b>${lista.length}</b> ${lista.length === 1 ? 'modelo' : 'modelos'}${estado.cat ? ` em ${esc(catNome[estado.cat])}` : ''}${estado.num ? ` · numeração ${esc(estado.num)}` : ''}${estado.marca ? ` · ${esc(estado.marca)}` : ''}`;
    for (const b of document.querySelectorAll('#chipsCat .chip')) b.setAttribute('aria-selected', String(b.dataset.cat === estado.cat));
    for (const b of document.querySelectorAll('.cat')) b.classList.toggle('ativo', b.dataset.cat === estado.cat);
  }
  const irCatalogo = () => { const y = $('#catalogo').getBoundingClientRect().top + scrollY - ($('#topo').offsetHeight - 2); if (Math.abs(scrollY - y) > 40) scrollTo({ top: y, behavior: 'smooth' }); };
  $('#chipsCat').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; estado.cat = b.dataset.cat; desenhar(); irCatalogo(); });
  $('#cats').addEventListener('click', (e) => { const b = e.target.closest('.cat'); if (!b) return; estado.cat = estado.cat === b.dataset.cat ? '' : b.dataset.cat; desenhar(); irCatalogo(); });
  $('#fMarca').addEventListener('change', (e) => { estado.marca = e.target.value; desenhar(); });
  $('#fNum').addEventListener('change', (e) => { estado.num = e.target.value; desenhar(); });
  $('#fOrdem').addEventListener('change', (e) => { estado.ordem = e.target.value; desenhar(); });
  let tq; $('#q').addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { estado.q = e.target.value; desenhar(); if (estado.q) irCatalogo(); }, 160); });
  $('#limpar').addEventListener('click', () => { Object.assign(estado, { cat: '', marca: '', num: '', q: '' }); $('#q').value = ''; $('#fMarca').value = ''; $('#fNum').value = ''; desenhar(); });

  // destaques
  const dest = produtos.filter((p) => p.destaque && p.categoria !== 'outlet').slice(0, 12);
  if (dest.length >= 3) { $('#prateleira').innerHTML = dest.map(card).join(''); $('#blocoDestaques').hidden = false; }

  // ---------- produto ----------
  let atual = null, tamSel = '', fotoI = 0;
  const modal = $('#modal'), palco = $('#palco');
  function abrir(p, empurrar = true) {
    atual = p; tamSel = ''; fotoI = 0;
    $('#mCat').textContent = [p.marca, catNome[p.categoria]].filter(Boolean).join(' · ');
    $('#mNome').textContent = p.nome;
    $('#mPreco').innerHTML = p.preco ? `${real(p.preco)}${p.precoDe > p.preco ? `<s>${real(p.precoDe)}</s>` : ''}` : '<span class="consulta">Preço sob consulta: chama no WhatsApp que a gente passa na hora.</span>';
    const opcoes = p.categoria === 'roupas' && p.letras.length ? p.letras : (p.numeros.length ? p.numeros.map(String) : p.letras);
    $('#mTamRot').textContent = /^\d/.test(opcoes[0] || '') ? 'Numeração' : 'Tamanho';
    $('#mTams').innerHTML = opcoes.map((t) => `<button aria-pressed="false" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    $('#mTamTxt').textContent = p.tamanhos || '';
    $('#mDesc').textContent = p.descricao || '';
    $('#mObs').value = '';
    $('#mAvisoTam').hidden = true;
    palco.innerHTML = p.fotos.map((f, i) => `<img src="${foto(f)}" alt="${esc(p.nome)} – foto ${i + 1}" ${i > 1 ? 'loading="lazy"' : ''} width="${f.w || 1000}" height="${f.h || 1200}">`).join('');
    $('#minis').innerHTML = p.fotos.length > 1 ? p.fotos.map((f, i) => `<button data-i="${i}" aria-label="Foto ${i + 1}" aria-current="${i === 0}"><img src="${foto(f, true)}" alt="" loading="lazy"></button>`).join('') : '';
    $('#minis').hidden = p.fotos.length < 2; $('#galAnt').hidden = $('#galProx').hidden = p.fotos.length < 2;
    contador();
    atualizarZapProduto();
    modal.hidden = false; document.body.classList.add('travado');
    palco.scrollLeft = 0; $('.modal-caixa').scrollTop = 0;
    if (empurrar) history.pushState({ p: p.id }, '', `/?p=${p.id}`);
    document.title = `${p.nome} | ${loja.nome}`;
    setTimeout(() => $('.fechar', modal).focus({ preventScroll: true }), 50);
  }
  function fechar(voltar = true) {
    if (modal.hidden) return;
    modal.hidden = true; document.body.classList.remove('travado'); atual = null;
    document.title = `${loja.nome} | Tênis e materiais esportivos`;
    if (voltar && history.state && history.state.p) history.back(); else if (location.search) history.replaceState(null, '', '/');
  }
  function contador() { $('#galCont').textContent = atual && atual.fotos.length > 1 ? `${fotoI + 1} / ${atual.fotos.length}` : ''; for (const b of document.querySelectorAll('#minis button')) b.setAttribute('aria-current', String(+b.dataset.i === fotoI)); const m = $(`#minis button[data-i="${fotoI}"]`); if (m) m.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  function irFoto(i) { if (!atual) return; fotoI = (i + atual.fotos.length) % atual.fotos.length; palco.scrollTo({ left: palco.clientWidth * fotoI, behavior: 'smooth' }); contador(); }
  palco.addEventListener('scroll', () => { const i = Math.round(palco.scrollLeft / Math.max(1, palco.clientWidth)); if (i !== fotoI) { fotoI = i; contador(); } }, { passive: true });
  $('#galAnt').addEventListener('click', () => irFoto(fotoI - 1));
  $('#galProx').addEventListener('click', () => irFoto(fotoI + 1));
  $('#minis').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) irFoto(+b.dataset.i); });
  $('#mTams').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    tamSel = tamSel === b.dataset.t ? '' : b.dataset.t;
    for (const x of $('#mTams').children) x.setAttribute('aria-pressed', String(x.dataset.t === tamSel));
    $('#mAvisoTam').hidden = true; atualizarZapProduto();
  });
  $('#mObs').addEventListener('input', atualizarZapProduto);
  function linhaItem(p, tam, obs, qtd = 1) { return `• ${qtd > 1 ? qtd + 'x ' : ''}${p.nome}${tam ? ` — ${/^\d/.test(tam) ? 'nº ' : 'tam. '}${tam}` : ''}${obs ? ` (${obs})` : ''}${p.preco ? ` — ${real(p.preco)}` : ''}`; }
  function atualizarZapProduto() {
    const a = $('#mZap'); if (!atual) return;
    const txt = `Olá! Quero este produto da ${loja.nome}:\n${linhaItem(atual, tamSel, $('#mObs').value.trim())}\n${location.origin}/?p=${atual.id}`;
    if (loja.whatsapp) { a.href = zap(txt); a.hidden = false; } else a.hidden = true;
  }
  const precisaTam = () => $('#mTams').children.length > 0;
  $('#mZap').addEventListener('click', (e) => { if (precisaTam() && !tamSel) { e.preventDefault(); avisarTam(); } });
  function avisarTam() { $('#mAvisoTam').hidden = false; const t = $('#mTams'); t.classList.remove('tremer'); void t.offsetWidth; t.classList.add('tremer'); }
  $('#mAdd').addEventListener('click', () => {
    if (precisaTam() && !tamSel) return avisarTam();
    adicionar(atual, tamSel, $('#mObs').value.trim());
    toast(`${atual.nome}${tamSel ? ` (${tamSel})` : ''} foi para a sacola`);
    fechar();
  });
  $('#mCompart').addEventListener('click', async () => {
    const url = `${location.origin}/?p=${atual.id}`;
    try { if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({ title: atual.nome, url }); else { await navigator.clipboard.writeText(url); toast('Link copiado'); } } catch { /* cancelou */ }
  });
  document.addEventListener('click', (e) => {
    const c = e.target.closest('a.card'); if (c && !e.metaKey && !e.ctrlKey) { e.preventDefault(); const p = produtos.find((x) => x.id === c.dataset.id); if (p) abrir(p); return; }
    if (e.target.closest('#modal [data-fechar]')) fechar();
    if (e.target.closest('#gaveta [data-fechar]')) fecharSacola();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!$('#gaveta').hidden) fecharSacola(); else fechar(); }
    if (!modal.hidden && e.key === 'ArrowRight' && e.target.tagName !== 'INPUT') irFoto(fotoI + 1);
    if (!modal.hidden && e.key === 'ArrowLeft' && e.target.tagName !== 'INPUT') irFoto(fotoI - 1);
  });
  addEventListener('popstate', () => { const id = new URLSearchParams(location.search).get('p'); const p = id && produtos.find((x) => x.id === id); if (p) abrir(p, false); else fechar(false); });

  // ---------- sacola ----------
  let sacola = [];
  try { sacola = JSON.parse(localStorage.getItem('nfs-sacola') || '[]').filter((i) => produtos.some((p) => p.id === i.id)); } catch { sacola = []; }
  const guardar = () => { try { localStorage.setItem('nfs-sacola', JSON.stringify(sacola)); } catch { /* sem armazenamento */ } };
  function adicionar(p, tam, obs) {
    const ja = sacola.find((i) => i.id === p.id && i.tam === tam && i.obs === obs);
    if (ja) ja.qtd++; else sacola.push({ id: p.id, tam, obs, qtd: 1 });
    guardar(); desenharSacola();
  }
  function desenharSacola() {
    const n = sacola.reduce((s, i) => s + i.qtd, 0);
    $('#contSacola').textContent = n; $('#contSacola').hidden = !n;
    const el = $('#itens');
    if (!sacola.length) { el.innerHTML = '<div class="sacola-vazia"><svg class="vazio-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><p>Sua sacola está vazia.<br>Abra um produto e escolha a numeração.</p></div>'; }
    else el.innerHTML = sacola.map((i, k) => { const p = produtos.find((x) => x.id === i.id); return `<div class="item"><img src="${foto(p.fotos[0], true)}" alt=""><div><h3>${esc(p.nome)}</h3><p>${i.tam ? `${/^\d/.test(i.tam) ? 'Nº' : 'Tam.'} ${esc(i.tam)}` : ''}${i.obs ? ` · ${esc(i.obs)}` : ''}${p.preco ? ` · ${real(p.preco)}` : ''}</p><div class="qtd"><button data-k="${k}" data-d="-1" aria-label="Menos">−</button><span>${i.qtd}</span><button data-k="${k}" data-d="1" aria-label="Mais">+</button></div></div><button class="tirar" data-tirar="${k}" aria-label="Tirar da sacola"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div>`; }).join('');
    const comPreco = sacola.every((i) => produtos.find((x) => x.id === i.id).preco);
    const soma = sacola.reduce((s, i) => s + (produtos.find((x) => x.id === i.id).preco || 0) * i.qtd, 0);
    $('#total').innerHTML = sacola.length ? `<span>${n} ${n === 1 ? 'item' : 'itens'}</span>${comPreco ? real(soma) : soma ? `${real(soma)} + a consultar` : 'valor a consultar'}` : '';
    const enviar = $('#enviarPedido');
    enviar.hidden = !sacola.length;
    enviar.textContent = loja.whatsapp ? 'Enviar pedido pelo WhatsApp' : 'Copiar pedido';
    if (loja.whatsapp && sacola.length) enviar.href = zap(textoPedido());
  }
  function textoPedido() {
    const nome = $('#nomeCliente').value.trim();
    const linhas = sacola.map((i) => linhaItem(produtos.find((x) => x.id === i.id), i.tam, i.obs, i.qtd));
    return `Olá! Quero fazer um pedido na ${loja.nome}${nome ? `. Meu nome é ${nome}` : ''}:\n\n${linhas.join('\n')}\n\nPode confirmar estoque, valor e entrega?`;
  }
  $('#enviarPedido').addEventListener('click', async (e) => {
    if (loja.whatsapp) { e.currentTarget.href = zap(textoPedido()); return; }
    e.preventDefault(); try { await navigator.clipboard.writeText(textoPedido()); toast('Pedido copiado'); } catch { toast('Não deu para copiar'); }
  });
  $('#itens').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tirar != null) sacola.splice(+b.dataset.tirar, 1);
    else if (b.dataset.k != null) { const i = sacola[+b.dataset.k]; i.qtd = Math.max(1, Math.min(20, i.qtd + +b.dataset.d)); }
    guardar(); desenharSacola();
  });
  const abrirSacola = () => { $('#gaveta').hidden = false; document.body.classList.add('travado'); };
  function fecharSacola() { $('#gaveta').hidden = true; if (modal.hidden) document.body.classList.remove('travado'); }
  $('#abrirSacola').addEventListener('click', abrirSacola);
  $('#nomeCliente').addEventListener('input', desenharSacola);

  desenhar(); desenharSacola();
  const inicial = new URLSearchParams(location.search).get('p');
  const pi = inicial && produtos.find((x) => x.id === inicial);
  if (pi) { history.replaceState(null, '', '/'); abrir(pi); }
})();
