/* Studio 82 Training — app (sem bibliotecas) */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { info: null, eu: null, aulas: [], feitas: 0, carregado: false };
const raiz = $('#raiz');
// A CSP bloqueia style="" vindo de HTML: aplica pelo CSSOM (permitido) e marca [data-w]/[data-p]
function ajusta(el) {
  if (el.nodeType !== 1) return;
  for (const x of [el, ...el.querySelectorAll('[style],[data-w],[data-p]')]) {
    const st = x.getAttribute('style'); if (st && !x.dataset.st) { x.dataset.st = 1; x.removeAttribute('style'); x.style.cssText = st; }
    if (x.dataset.w) x.style.setProperty('--w', x.dataset.w + '%');
    if (x.dataset.p) x.style.setProperty('--p', x.dataset.p);
  }
}
new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(ajusta))).observe(document.body, { childList: true, subtree: true });

async function api(url, body) {
  const r = await fetch(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(j.erro || 'Algo deu errado'); e.status = r.status; throw e; }
  return j;
}
const ICON = {
  cad: '<svg class="cadeado" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="3"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>',
  volta: '<svg viewBox="0 0 24 24"><path d="M12 5V1.5L7 6l5 4.5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="16.3" font-size="6.5" text-anchor="middle" font-weight="800" font-family="sans-serif">5</text></svg>',
  frente: '<svg viewBox="0 0 24 24"><path d="M12 5V1.5L17 6l-5 4.5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="16.3" font-size="6.5" text-anchor="middle" font-weight="800" font-family="sans-serif">5</text></svg>',
  espelho: '<svg viewBox="0 0 24 24"><path d="M11 2h2v20h-2zM9 6v12L2 18zM15 6l7 12h-7z" /></svg>',
  cheia: '<svg viewBox="0 0 24 24"><path d="M3 3h7v2H5v5H3zM14 3h7v7h-2V5h-5zM3 14h2v5h5v2H3zM19 14h2v7h-7v-2h5z"/></svg>',
  sai: '<svg viewBox="0 0 24 24"><path d="M8 3h2v7H3V8h5zM14 3h2v5h5v2h-7zM3 14h7v7H8v-5H3zM14 14h7v2h-5v5h-2z"/></svg>',
  enquadra: '<svg viewBox="0 0 24 24"><path d="M7 2h10v20H7zM9 4v16h6V4z"/></svg>',
  laco: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z"/></svg>',
};
const fmt = (s) => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const durTxt = (s) => (s >= 3600 ? Math.floor(s / 3600) + 'h ' + Math.round((s % 3600) / 60) + 'min' : Math.max(1, Math.round(s / 60)) + ' min');
const iniciais = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const est = (id) => S.info?.estilos.find((e) => e.id === id) || { id, nome: id, niveis: [] };
const capaUrl = (a) => `/media/c/${a.id}?v=${a.capa || 0}`;

// ---------- Toast + confete ----------
function toast(txt, tipo = '', ms = 3600) {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo; t.innerHTML = txt;
  $('#toasts').append(t);
  setTimeout(() => { t.style.transition = 'opacity .4s, transform .4s'; t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; setTimeout(() => t.remove(), 450); }, ms);
}
function confete() {
  const c = $('#confete'), x = c.getContext('2d');
  const W = (c.width = innerWidth * devicePixelRatio), H = (c.height = innerHeight * devicePixelRatio);
  const cores = ['#ff2d8a', '#8b5cff', '#d7ff3a', '#3dc5ff', '#ffffff', '#ff8a2b'];
  const ps = Array.from({ length: 170 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .62, vx: (Math.random() - .5) * 26 * devicePixelRatio, vy: -(10 + Math.random() * 22) * devicePixelRatio, r: (4 + Math.random() * 6) * devicePixelRatio, a: Math.random() * 6, va: (Math.random() - .5) * .4, c: cores[(Math.random() * cores.length) | 0] }));
  let n = 0;
  (function q() {
    x.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += .55 * devicePixelRatio; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
    if (++n < 190) requestAnimationFrame(q); else x.clearRect(0, 0, W, H);
  })();
}

// ---------- Modal ----------
function abreModal(html, larga) {
  const m = $('#modal');
  m.innerHTML = `<div class="folha ${larga ? 'larga' : ''}" role="dialog" aria-modal="true"><button class="fecha" data-fecha aria-label="Fechar">×</button>${html}</div>`;
  m.hidden = false; document.body.classList.add('trava');
  setTimeout(() => $('input', m)?.focus(), 60);
  return $('.folha', m);
}
function fechaModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; document.body.classList.remove('trava'); }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('[data-fecha]')) fechaModal(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) fechaModal(); });

function telaEntrar(modo = 'entrar') {
  const cad = modo === 'cadastro';
  const f = abreModal(`
    <h2>${cad ? 'Criar conta' : 'Bem-vinda de volta'}</h2>
    <p>${cad ? 'Cadastre-se para acessar as aulas do Studio 82.' : 'Entre para continuar seus treinos.'}</p>
    <form id="fAuth">
      ${cad ? '<label class="campo"><span>Seu nome</span><input name="nome" autocomplete="name" required></label>' : ''}
      <label class="campo"><span>E-mail</span><input name="email" type="email" autocomplete="email" required></label>
      <label class="campo"><span>Senha</span><input name="senha" type="password" autocomplete="${cad ? 'new-password' : 'current-password'}" minlength="${cad ? 6 : 1}" required></label>
      <div class="msg-erro" id="mErro"></div>
      <button class="btn btn-p"><span>${cad ? 'Criar minha conta' : 'Entrar'}</span></button>
    </form>
    <div class="troca">${cad ? 'Já tem conta? <button data-modo="entrar">Entrar</button>' : 'Ainda não tem conta? <button data-modo="cadastro">Criar conta</button>'}</div>`);
  $('[data-modo]', f).onclick = (e) => telaEntrar(e.target.dataset.modo);
  $('#fAuth', f).onsubmit = async (e) => {
    e.preventDefault();
    const b = $('button.btn', f); b.disabled = true;
    try {
      const r = await api(cad ? '/api/cadastro' : '/api/entrar', Object.fromEntries(new FormData(e.target)));
      if (r.pendente) {
        f.innerHTML = `<div class="sucesso"><div class="ic">✨</div><h2>Conta criada!</h2><p>Agora é só esperar o estúdio liberar seu acesso. Avise o professor que você se cadastrou.</p><button class="btn btn-g" data-fecha>Fechar</button></div>`;
        return;
      }
      fechaModal(); S.eu = r.eu; await carregar(); location.hash = '#/'; render();
    } catch (err) { $('#mErro', f).textContent = err.message; b.disabled = false; }
  };
}

// ---------- Topo ----------
function topo() {
  const r = rota();
  const h = $('#topo');
  if (!S.eu) {
    h.innerHTML = `<nav class="nav"><a class="logo" href="#/"><span class="m">82</span><span class="lt">Studio 82<small>Training</small></span></a>
      <div class="nav-vis"><button class="btn btn-l btn-s" data-entrar>Entrar</button><button class="btn btn-p btn-s" data-cad>Criar conta</button></div></nav>`;
    $('[data-entrar]', h).onclick = () => telaEntrar();
    $('[data-cad]', h).onclick = () => telaEntrar('cadastro');
    return;
  }
  const abas = [['#/', 'Início', '']].concat(S.info.estilos.map((e) => [`#/${e.id === 'street' ? 'street' : 'estilo/' + e.id}`, e.especial ? e.nome : e.nome, 'e-' + e.id + (e.especial ? ' especial' : '')]));
  if (S.eu.role === 'admin') abas.push(['#/professor', 'Professor', '']);
  const atual = '#/' + (r[0] === 'estilo' ? 'estilo/' + r[1] : r[0] === 'aula' ? '' : r[0] || '');
  h.innerHTML = `<nav class="nav"><a class="logo" href="#/"><span class="m">82</span><span class="lt">Studio 82<small>Training</small></span></a>
    <div class="abas">${abas.map(([href, n, c]) => `<a class="aba ${c} ${atual === href || (href === '#/professor' && r[0] === 'professor') ? 'on' : ''}" href="${href}">${esc(n)}</a>`).join('')}</div>
    <button class="menu-btn" aria-label="Menu"><span></span></button>
    <button class="perfil" title="${esc(S.eu.nome)}">${esc(iniciais(S.eu.nome))}</button></nav>`;
  const nav = $('.nav', h);
  $('.menu-btn', h).onclick = () => nav.classList.toggle('aberto');
  $$('.aba', h).forEach((a) => (a.onclick = () => nav.classList.remove('aberto')));
  $('.perfil', h).onclick = telaPerfil;
}
function telaPerfil() {
  const f = abreModal(`<h2>${esc(S.eu.nome)}</h2><p>${esc(S.eu.email)}</p>
    <form id="fSenha"><label class="campo"><span>Senha atual</span><input name="atual" type="password" autocomplete="current-password" required></label>
    <label class="campo"><span>Nova senha</span><input name="nova" type="password" autocomplete="new-password" minlength="6" required></label>
    <div class="msg-erro" id="mErro"></div><button class="btn btn-g">Trocar senha</button></form>
    <button class="btn btn-x" id="bSair">Sair da conta</button>`);
  $('#fSenha', f).onsubmit = async (e) => { e.preventDefault(); try { await api('/api/senha', Object.fromEntries(new FormData(e.target))); fechaModal(); toast('Senha trocada ✓'); } catch (err) { $('#mErro', f).textContent = err.message; } };
  $('#bSair', f).onclick = async () => { await api('/api/sair', {}); S.eu = null; S.aulas = []; fechaModal(); location.hash = '#/'; render(); };
}

// ---------- Dados ----------
async function carregar() {
  const i = await api('/api/info');
  S.info = i; S.eu = i.eu;
  if (S.eu) { const a = await api('/api/aulas'); S.aulas = a.aulas; S.feitas = a.feitas; }
  S.carregado = true;
}
const rota = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

// ---------- Componentes ----------
function cartao(a) {
  const e = est(a.estilo);
  const m = a.motivos?.[0]?.txt || '';
  return `<a class="cartao e-${a.estilo} ${a.trancada ? 'tranca' : ''}" href="#/aula/${a.id}" data-tilt>
    <div class="cv">
      ${a.temCapa ? `<img src="${capaUrl(a)}" alt="" loading="lazy">` : `<div class="sem-capa">82</div>`}
      <div class="topo-cv"><span class="tag"><span class="pt"></span>${esc(a.nivel)}</span>${a.ok ? '<span class="feito" title="Concluída">✓</span>' : ''}</div>
      ${a.trancada ? `<div class="cad"><div class="ic">${ICON.cad}</div><span>${esc(m)}</span></div>` : '<div class="play"></div>'}
      ${a.duracao ? `<span class="dur">${durTxt(a.duracao)}</span>` : ''}
      ${!a.trancada && a.feito > 0 ? `<i class="prog" data-w="${Math.round(a.feito * 100)}"></i>` : ''}
    </div>
    <div class="info"><h4>${esc(a.titulo)}</h4><div class="meta"><span>${esc(e.nome)}</span><i></i><span>${esc(a.professor)}</span></div></div>
  </a>`;
}
function depoisRender() {
  $$('[data-w]').forEach((el) => el.style.setProperty('--w', el.dataset.w + '%'));
  $$('[data-p]').forEach((el) => el.style.setProperty('--p', el.dataset.p));
  const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('vis'); io.unobserve(x.target); } }), { threshold: .12 });
  $$('.revela').forEach((el) => io.observe(el));
  if (matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('mousemove', (ev) => { const r = el.getBoundingClientRect(); const x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5; el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-6px)`; });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }
}

// ---------- Páginas ----------
function paginaVisitante() {
  const es = S.info.estilos;
  const total = Object.values(S.info.contagem).reduce((a, b) => a + b, 0);
  const banda = [0, 1].map(() => es.map((e) => `<span>${esc(e.nome)}</span><i>✦</i>`).join('')).join('');
  raiz.innerHTML = `
  <section class="hero wrap">
    <div class="hero-tx">
      <div class="selo-top"><span class="vivo"></span>Studio 82 Training · aulas com OLLY</div>
      <h1>Aprenda a dançar <em>no seu ritmo.</em></h1>
      <p class="sub">As aulas do estúdio na palma da mão: K-Pop, Jazz Funk, Heels, Flexibilidade e Street Style. Assista quando quiser, em câmera lenta ou no espelho, e libere passos novos conforme evolui.</p>
      <div class="acoes"><button class="btn btn-p" data-cad>Começar agora <span class="seta">→</span></button><button class="btn btn-l" data-entrar>Já tenho conta</button></div>
      <ul class="numeros"><li><b>5</b><span>estilos de dança</span></li><li><b>${total || '—'}</b><span>aula${total === 1 ? '' : 's'} no catálogo</span></li><li><b>0,5x</b><span>câmera lenta e espelho</span></li></ul>
    </div>
    <div class="deck" aria-hidden="true">${es.map((e, i) => `
      <div class="deck-c e-${e.id}"><span class="num">${String(i + 1).padStart(2, '0')}</span><b>${esc(e.nome)}</b><span class="niv">${esc(e.niveis.join(' · '))}</span><span class="ir">↗</span></div>`).join('')}</div>
  </section>
  <div class="banda" aria-hidden="true"><div class="trilho">${banda}</div></div>
  <section class="sec wrap" id="estilos">
    <div class="sec-top revela"><div><p class="eyebrow">Modalidades</p><h2 class="h-sec">Escolha seu <em>estilo</em></h2></div><p>Do primeiro passo ao intermediário. Cada estilo tem seus níveis, e o Street Style traz professores convidados.</p></div>
    <div class="estilos">${es.map((e, i) => `
      <button class="est e-${e.id} revela" data-cad data-tilt>
        <div class="est-top"><span class="num">${String(i + 1).padStart(2, '0')} / 05</span>${e.especial ? '<span class="tag">Convidados</span>' : ''}</div>
        <div><h3>${esc(e.nome)}</h3><div class="niveis">${e.niveis.map((n) => `<span class="tag">${esc(n)}</span>`).join('')}</div></div>
        <div class="rodape-est"><span>${S.info.contagem[e.id] || 0} aula${S.info.contagem[e.id] === 1 ? '' : 's'}</span><span class="ir">↗</span></div>
      </button>`).join('')}</div>
  </section>
  <section class="sec wrap">
    <div class="sec-top revela"><div><p class="eyebrow">Como funciona</p><h2 class="h-sec">Treine, conclua e <em>desbloqueie.</em></h2></div></div>
    <div class="passos">
      <div class="passo revela"><span class="n">1</span><h4>Assista no seu ritmo</h4><p>Câmera lenta, modo espelho e tela cheia que ocupa o celular todo. Volte 5 segundos quantas vezes precisar.</p></div>
      <div class="passo revela"><span class="n">2</span><h4>Conclua as aulas</h4><p>Seu progresso fica salvo. Assistiu a aula até o fim? Ela conta como feita.</p></div>
      <div class="passo revela"><span class="n">3</span><h4>Libere passos novos</h4><p>Algumas aulas abrem só depois que você domina o passo base. É a sua trilha de evolução.</p></div>
    </div>
  </section>
  <section class="wrap"><div class="cta-final revela"><h2>Bora <em>dançar?</em></h2><p>Crie sua conta e comece hoje. Quem é aluna do estúdio tem o acesso liberado pelo professor.</p><button class="btn btn-claro" data-cad>Criar minha conta <span class="seta">→</span></button></div></section>`;
  $$('[data-cad]').forEach((b) => (b.onclick = () => telaEntrar('cadastro')));
  $$('[data-entrar]').forEach((b) => (b.onclick = () => telaEntrar()));
}

function paginaInicio() {
  const pub = S.aulas.filter((a) => a.publicado && a.estado === 'pronto');
  const total = pub.length, feitas = pub.filter((a) => a.ok).length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  const cont = pub.filter((a) => !a.trancada && !a.ok && a.feito > 0.02).sort((a, b) => b.feito - a.feito)[0] || pub.find((a) => !a.trancada && !a.ok);
  const nome = S.eu.nome.split(' ')[0];
  const hora = new Date().getHours();
  const sauda = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  raiz.innerHTML = `<div class="wrap">
    <section class="ola">
      <div><p class="eyebrow">${sauda}</p><h1>Oi, <em>${esc(nome)}</em>.<br>Bora treinar?</h1><p class="lead">${total ? `Você tem ${total} aula${total > 1 ? 's' : ''} no catálogo. Cada aula concluída pode liberar passos novos.` : 'As aulas vão aparecer aqui assim que o professor publicar.'}</p></div>
      <div class="stat"><div class="anel" data-p="${pct}"><b>${feitas}</b></div><div class="t"><b>${feitas} de ${total} aulas</b><span>concluídas · ${pct}% da trilha</span></div></div>
    </section>
    ${cont ? `<a class="continuar e-${cont.estilo} revela" href="#/aula/${cont.id}"><div class="im">${cont.temCapa ? `<img src="${capaUrl(cont)}" alt="">` : ''}<span class="play"></span></div>
      <div class="tx"><p class="eyebrow">${cont.feito > 0.02 ? 'Continue de onde parou' : 'Comece por aqui'}</p><h3>${esc(cont.titulo)}</h3><div class="tags"><span class="tag">${esc(est(cont.estilo).nome)}</span><span class="tag neutra">${esc(cont.nivel)}</span></div>
      ${cont.feito > 0.02 ? `<div class="barra"><i data-w="${Math.round(cont.feito * 100)}"></i></div>` : ''}<span class="btn btn-p btn-s">${cont.feito > 0.02 ? 'Continuar' : 'Assistir'} <span class="seta">→</span></span></div></a>` : ''}
    ${S.info.estilos.map((e) => {
      const l = pub.filter((a) => a.estilo === e.id);
      if (!l.length) return '';
      const href = e.id === 'street' ? '#/street' : '#/estilo/' + e.id;
      return `<section class="trilha e-${e.id} revela"><div class="trilha-top"><h2><span class="bola"></span>${esc(e.nome)}</h2><a href="${href}">Ver todas (${l.length}) →</a></div><div class="grade">${l.slice(0, 4).map(cartao).join('')}</div></section>`;
    }).join('')}
    ${!total ? '<div class="vazio"><b>Nenhuma aula publicada ainda</b>Volte daqui a pouco!</div>' : ''}
  </div>`;
}

function paginaEstilo(id, nivel) {
  const e = est(id);
  const l = S.aulas.filter((a) => a.publicado && a.estado === 'pronto' && a.estilo === id);
  const f = nivel ? l.filter((a) => a.nivel === nivel) : l;
  raiz.innerHTML = `<div class="wrap e-${id}">
    <section class="cab-est">
      <p class="eyebrow">${l.length} aula${l.length === 1 ? '' : 's'}</p>
      <h1><span class="bola"></span>${esc(e.nome)}</h1>
      <p class="niveis-txt"><em>${esc(e.niveis.join(', ').replace(/, ([^,]*)$/, ' e $1'))}</em></p>
      ${e.niveis.length > 1 ? `<div class="chips">${['', ...e.niveis].map((n) => `<button class="chip ${n === (nivel || '') ? 'on' : ''}" data-n="${esc(n)}">${n || 'Todos'}</button>`).join('')}</div>` : ''}
    </section>
    ${f.length ? `<div class="grade">${f.map(cartao).join('')}</div>` : '<div class="vazio"><b>Em breve</b>Ainda não tem aula aqui.</div>'}
  </div>`;
  $$('[data-n]').forEach((b) => (b.onclick = () => { paginaEstilo(id, b.dataset.n); depoisRender(); }));
}

function paginaStreet() {
  const l = S.aulas.filter((a) => a.publicado && a.estado === 'pronto' && a.estilo === 'street');
  const conv = new Map();
  for (const a of l) { const c = a.convidado; if (c?.nome && !conv.has(c.nome)) conv.set(c.nome, c); }
  raiz.innerHTML = `<div class="wrap e-street">
    <section class="street-hero"><div class="fita">✦ Guest sessions</div>
      <h1>Street Style <em>com convidados</em></h1>
      <p class="lead">Uma aba especial para os professores convidados do Studio 82. Cada um traz a sua linguagem. Venha conhecer.</p>
    </section>
    ${conv.size ? `<p class="eyebrow">Professores convidados</p><div class="convidados">${[...conv.values()].map((c) => `
      <div class="conv revela"><div class="av">${esc(iniciais(c.nome))}</div><div><h3>${esc(c.nome)}</h3>
      ${c.insta ? `<a class="ig" href="https://www.instagram.com/${encodeURIComponent(c.insta)}/" target="_blank" rel="noopener">@${esc(c.insta)}</a>` : ''}</div>
      ${c.bio ? `<p>${esc(c.bio)}</p>` : ''}</div>`).join('')}</div>` : ''}
    <p class="eyebrow">Aulas</p>
    ${l.length ? `<div class="grade">${l.map(cartao).join('')}</div>` : '<div class="vazio"><b>Os convidados estão chegando</b>As aulas especiais aparecem aqui.</div>'}
  </div>`;
}

function paginaAula(id) {
  const a = S.aulas.find((x) => x.id === id);
  if (!a) { raiz.innerHTML = '<div class="wrap"><div class="vazio" style="margin:60px 0"><b>Aula não encontrada</b><a href="#/">Voltar ao início</a></div></div>'; return; }
  const e = est(a.estilo);
  const volta = a.estilo === 'street' ? '#/street' : '#/estilo/' + a.estilo;
  if (a.trancada) {
    raiz.innerHTML = `<div class="wrap e-${a.estilo}"><section class="trancada">
      <div class="cv">${a.temCapa ? `<img src="${capaUrl(a)}" alt="">` : ''}<div class="ic"><div>${ICON.cad}</div></div></div>
      <div><a class="voltar" href="${volta}">← ${esc(e.nome)}</a><div class="tags"><span class="tag">${esc(e.nome)}</span> <span class="tag neutra">${esc(a.nivel)}</span></div>
      <h1>${esc(a.titulo)}</h1><p style="color:var(--mu)">Essa aula ainda está trancada. Para liberar:</p>
      <div class="req">${a.motivos.map((m) => {
        const r = m.tipo === 'aula' && S.aulas.find((x) => x.id === m.id);
        return `<div class="req-it"><span class="b"></span><span>${esc(m.txt)}</span>${r && !r.trancada ? `<a href="#/aula/${r.id}">Ir →</a>` : ''}</div>`;
      }).join('')}</div></div></section></div>`;
    return;
  }
  const libera = a.libera.map((i) => S.aulas.find((x) => x.id === i)).filter((x) => x && x.publicado && x.estado === 'pronto');
  raiz.innerHTML = `<div class="wrap e-${a.estilo}"><section class="aula">
    <a class="voltar" href="${volta}">← ${esc(e.nome)}</a>
    <div class="pl" id="pl"></div>
    <div class="aula-info">
      <div><div class="tags"><span class="tag"><span class="pt"></span>${esc(e.nome)}</span><span class="tag neutra">${esc(a.nivel)}</span>${a.duracao ? `<span class="tag neutra">${durTxt(a.duracao)}</span>` : ''}</div>
        <h1>${esc(a.titulo)}</h1>
        <div class="prof-card"><div class="av">${esc(iniciais(a.professor))}</div><div><b>${esc(a.professor)}</b><span>${a.convidado?.nome ? 'Professor convidado' + (a.convidado.insta ? ' · @' + esc(a.convidado.insta) : '') : 'Studio 82 Training'}</span></div></div>
        ${a.bio ? `<div class="bio">${esc(a.bio)}</div>` : ''}
        ${a.convidado?.bio ? `<div class="caixa sobre"><h5>Sobre ${esc(a.convidado.nome)}</h5><div class="bio">${esc(a.convidado.bio)}</div></div>` : ''}
      </div>
      <div class="lateral">
        <div class="caixa" id="cxProg"></div>
        ${libera.length ? `<div class="caixa"><h5>Esta aula libera</h5><div class="lib-lista">${libera.map((x) => `<a class="lib-it" href="#/aula/${x.id}"><div class="mini">${x.temCapa ? `<img src="${capaUrl(x)}" alt="" loading="lazy">` : ''}</div><div><b>${esc(x.titulo)}</b><span>${x.trancada ? '🔒 ' + esc(x.motivos[0]?.txt || '') : '✓ Liberada'}</span></div></a>`).join('')}</div></div>` : ''}
        <div class="caixa"><h5>Dicas do player</h5><div class="dicas">Use o <b>espelho</b> para dançar de frente, a <b>velocidade</b> para pegar o passo devagar e toque duas vezes nas laterais para voltar ou avançar 5 s. No celular, a tela cheia enche a tela com o centro do vídeo.</div></div>
      </div>
    </div></section></div>`;
  progCaixa(a);
  player($('#pl'), a);
}
function progCaixa(a) {
  const c = $('#cxProg'); if (!c) return;
  c.innerHTML = a.ok ? `<h5>Seu progresso</h5><div class="ok-selo">✓ Aula concluída</div><div class="barra mt"><i data-w="100"></i></div>`
    : `<h5>Seu progresso</h5><div class="num">${Math.round(a.feito * 100)}%<small>assistido</small></div><div class="barra mt"><i data-w="${Math.round(a.feito * 100)}"></i></div><div class="prog-nota">Assista até o fim para concluir.</div>`;
}

// ---------- Player ----------
let plAtual = null;
function player(el, a) {
  plAtual?.fim();
  const vel = [0.5, 0.75, 1, 1.25];
  el.innerHTML = `<video playsinline webkit-playsinline preload="metadata" ${a.temCapa ? `poster="${capaUrl(a)}"` : ''} src="/media/v/${a.id}?v=${a.v}"></video>
    <div class="salto e"></div><div class="salto d"></div>
    <button class="big" aria-label="Tocar"></button><div class="aviso"></div>
    <div class="ctr"><div class="busca"><div class="tr"><i class="bf"></i><i class="pr"></i></div><i class="cab"></i></div>
    <div class="linha"><button class="bt" data-a="tocar" aria-label="Tocar">${ICON.play}</button><button class="bt esconde-cel" data-a="volta" aria-label="Voltar 5 s">${ICON.volta}</button><button class="bt esconde-cel" data-a="frente" aria-label="Avançar 5 s">${ICON.frente}</button>
    <span class="tempo">0:00 / ${fmt(a.duracao)}</span><span class="esp"></span>
    <button class="bt" data-a="vel" title="Velocidade">1x</button><button class="bt" data-a="espelho" title="Espelhar (M)">${ICON.espelho}</button><button class="bt so-fs" data-a="enquadra" title="Encaixar / preencher">${ICON.enquadra}</button><button class="bt" data-a="cheia" title="Tela cheia (F)">${ICON.cheia}</button></div></div>`;
  const v = $('video', el), ctr = $('.ctr', el), busca = $('.busca', el), aviso = $('.aviso', el);
  let ultimo = 0, acum = 0, enviando = false, quieto, avisoT;
  let espelho = false; try { espelho = localStorage.getItem('s82-esp') === '1'; } catch {}
  el.classList.toggle('espelho', espelho); $('[data-a=espelho]', el).classList.toggle('on', espelho);
  let cheio = true;
  const diz = (t) => { aviso.textContent = t; aviso.classList.add('on'); clearTimeout(avisoT); avisoT = setTimeout(() => aviso.classList.remove('on'), 1100); };
  const acorda = () => { el.classList.remove('quieto'); clearTimeout(quieto); quieto = setTimeout(() => !v.paused && el.classList.add('quieto'), 2600); };
  const tocar = () => (v.paused ? v.play().catch(() => {}) : v.pause());
  const pula = (s) => { v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.2, v.currentTime + s)); diz((s > 0 ? '+' : '−') + Math.abs(s) + ' s'); acorda(); };
  v.addEventListener('loadedmetadata', () => { if (a.pos > 5 && !a.ok && a.pos < v.duration - 10) { v.currentTime = a.pos; diz('Continuando de ' + fmt(a.pos)); } });
  v.addEventListener('play', () => { el.classList.add('tocando'); $('[data-a=tocar]', el).innerHTML = ICON.pause; acorda(); });
  v.addEventListener('pause', () => { el.classList.remove('tocando', 'quieto'); $('[data-a=tocar]', el).innerHTML = ICON.play; envia(); });
  v.addEventListener('ended', envia);
  v.addEventListener('timeupdate', () => {
    const t = v.currentTime, d = t - ultimo;
    if (!v.paused && d > 0 && d < 1.6) acum += d;
    ultimo = t;
    busca.style.setProperty('--w', (v.duration ? (t / v.duration) * 100 : 0) + '%');
    $('.tempo', el).textContent = fmt(t) + ' / ' + fmt(v.duration || a.duracao);
    if (acum >= 15) envia();
  });
  v.addEventListener('progress', () => { try { const b = v.buffered; if (b.length) busca.style.setProperty('--b', (b.end(b.length - 1) / v.duration) * 100 + '%'); } catch {} });
  async function envia() {
    if (enviando || (acum < 1 && v.currentTime === a.pos)) return;
    enviando = true; const dt = acum; acum = 0;
    try {
      const r = await api('/api/progresso', { id: a.id, dt, pos: v.currentTime });
      a.feito = r.feito; a.pos = v.currentTime;
      if (r.nova) {
        a.ok = true; confete();
        toast(`<b>Aula concluída! 🎉</b>${r.liberou.length ? 'Você liberou: ' + r.liberou.map(esc).join(', ') : 'Mandou bem. Bora para a próxima?'}`, 'grande', 6000);
        const n = await api('/api/aulas'); S.aulas = n.aulas; S.feitas = n.feitas;
      }
      progCaixa(a);
    } catch { acum += dt; } finally { enviando = false; }
  }
  // Busca arrastando
  const vaiPara = (ev) => { const r = busca.getBoundingClientRect(); const x = Math.max(0, Math.min(1, ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / r.width)); if (v.duration) { v.currentTime = x * v.duration; ultimo = v.currentTime; } };
  busca.addEventListener('pointerdown', (ev) => { busca.setPointerCapture(ev.pointerId); vaiPara(ev); const mv = (e2) => vaiPara(e2); busca.addEventListener('pointermove', mv); busca.addEventListener('pointerup', () => busca.removeEventListener('pointermove', mv), { once: true }); });
  // Toque: no vídeo toca/pausa; duplo toque nas laterais pula 5 s
  let toqueT = 0, toqueLado = null, toqueTimer = 0;
  const toque = (lado) => (ev) => {
    ev.stopPropagation();
    const agora = Date.now();
    clearTimeout(toqueTimer);
    if (agora - toqueT < 320 && toqueLado === lado) { pula(lado === 'e' ? -5 : 5); toqueT = 0; return; }
    toqueT = agora; toqueLado = lado;
    const visivel = !el.classList.contains('quieto');
    toqueTimer = setTimeout(() => { if (matchMedia('(pointer: coarse)').matches && el.classList.contains('tocando') && !visivel) acorda(); else tocar(); }, 320);
  };
  const tE = toque('e'), tD = toque('d');
  $('.salto.e', el).addEventListener('click', tE); $('.salto.d', el).addEventListener('click', tD);
  v.addEventListener('click', () => { if (matchMedia('(pointer: coarse)').matches && el.classList.contains('quieto')) acorda(); else tocar(); });
  $('.big', el).onclick = (ev) => { ev.stopPropagation(); v.play().catch(() => {}); };
  el.addEventListener('pointermove', acorda);
  ctr.addEventListener('click', (ev) => ev.stopPropagation());
  // Tela cheia (no iPhone, o navegador não deixa: usa uma tela cheia "falsa" que ocupa a tela toda)
  const nativa = el.requestFullscreen || el.webkitRequestFullscreen;
  const emFs = () => document.fullscreenElement === el || document.webkitFullscreenElement === el || el.classList.contains('pfs');
  function mudouFs() {
    const on = emFs();
    el.classList.toggle('fs', on); el.classList.toggle('cheio', on && cheio);
    $('[data-a=cheia]', el).innerHTML = on ? ICON.sai : ICON.cheia;
    document.body.classList.toggle('trava', el.classList.contains('pfs'));
  }
  document.addEventListener('fullscreenchange', mudouFs); document.addEventListener('webkitfullscreenchange', mudouFs);
  function telaCheia() {
    if (emFs()) {
      if (el.classList.contains('pfs')) el.classList.remove('pfs');
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return mudouFs();
    }
    cheio = true;
    if (nativa) { Promise.resolve(nativa.call(el)).catch(() => { el.classList.add('pfs'); mudouFs(); }); }
    else { el.classList.add('pfs'); mudouFs(); scrollTo(0, 0); }
  }
  const acoes = {
    tocar, volta: () => pula(-5), frente: () => pula(5), cheia: telaCheia,
    vel(b) { const i = (vel.indexOf(v.playbackRate) + 1) % vel.length; v.playbackRate = vel[i]; b.textContent = vel[i] + 'x'; b.classList.toggle('on', vel[i] !== 1); diz('Velocidade ' + vel[i] + 'x'); },
    espelho(b) { espelho = !espelho; el.classList.toggle('espelho', espelho); b.classList.toggle('on', espelho); try { localStorage.setItem('s82-esp', espelho ? '1' : '0'); } catch {} diz(espelho ? 'Modo espelho ligado' : 'Modo espelho desligado'); },
    enquadra() { cheio = !cheio; el.classList.toggle('cheio', cheio); diz(cheio ? 'Preenchendo a tela' : 'Vídeo inteiro'); },
  };
  $$('[data-a]', el).forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); acoes[b.dataset.a](b); acorda(); }));
  const tecla = (ev) => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) || !$('#modal').hidden) return;
    const k = ev.key.toLowerCase();
    if (k === ' ' || k === 'k') { ev.preventDefault(); tocar(); } else if (k === 'arrowleft' || k === 'j') pula(-5); else if (k === 'arrowright' || k === 'l') pula(5);
    else if (k === 'm') acoes.espelho($('[data-a=espelho]', el)); else if (k === 'f') telaCheia();
    else if (k === 'escape' && el.classList.contains('pfs')) telaCheia();
  };
  addEventListener('keydown', tecla);
  const vis = () => document.hidden && envia();
  document.addEventListener('visibilitychange', vis);
  plAtual = { fim() { envia(); v.pause(); removeEventListener('keydown', tecla); document.removeEventListener('visibilitychange', vis); document.removeEventListener('fullscreenchange', mudouFs); document.removeEventListener('webkitfullscreenchange', mudouFs); document.body.classList.remove('trava'); plAtual = null; } };
}

// ---------- Professor ----------
let ED = null, pollT = null;
function paginaProfessor(sub, id) {
  if (S.eu.role !== 'admin') { location.hash = '#/'; return; }
  if (sub === 'aula') return editor(id);
  const abas = [['', 'Aulas'], ['alunos', 'Alunos'], ['ajustes', 'Ajustes']];
  raiz.innerHTML = `<div class="wrap"><div class="adm-top"><div><div class="kicker">Área do professor</div><h1>${sub === 'alunos' ? 'Alunos' : sub === 'ajustes' ? 'Ajustes' : 'Suas aulas'}</h1></div>
    ${!sub ? '<a class="btn btn-p" href="#/professor/aula/nova"><span>+ Nova aula</span></a>' : ''}</div>
    <div class="sub-abas">${abas.map(([k, n]) => `<a class="chip ${(sub || '') === k ? 'on' : ''}" href="#/professor${k ? '/' + k : ''}">${n}</a>`).join('')}</div><div id="admC"></div></div>`;
  if (sub === 'alunos') return admAlunos();
  if (sub === 'ajustes') return admAjustes();
  admAulas();
}
function estadoTxt(a) {
  if (a.estado === 'enviando') return `<span class="estado proc">Enviando ${Math.round(a.progresso * 100)}%</span>`;
  if (a.estado === 'fila') return '<span class="estado proc">Na fila</span>';
  if (a.estado === 'processando') return `<span class="estado proc">Preparando vídeo ${Math.round(a.progresso * 100)}%</span>`;
  if (a.estado === 'erro') return '<span class="estado err">Erro no vídeo</span>';
  if (a.estado === 'sem-video') return '<span class="estado err">Sem vídeo</span>';
  return a.publicado ? '<span class="estado pub">● Publicada</span>' : '<span class="estado ras">Rascunho</span>';
}
function admAulas() {
  const c = $('#admC');
  const l = S.aulas;
  if (!l.length) { c.innerHTML = '<div class="vazio"><b>Nenhuma aula ainda</b>Clique em “Nova aula” para subir a primeira.</div>'; return; }
  c.innerHTML = l.map((a, i) => `<div class="linha-aula e-${a.estilo}" data-id="${a.id}">
    <div class="ord"><button data-m="-1" ${i ? '' : 'disabled'} aria-label="Subir">▲</button><button data-m="1" ${i < l.length - 1 ? '' : 'disabled'} aria-label="Descer">▼</button></div>
    <div class="mini">${a.temCapa ? `<img src="${capaUrl(a)}" alt="" loading="lazy">` : ''}</div>
    <div><h4>${esc(a.titulo)}</h4><div class="meta"><span class="tag">${esc(est(a.estilo).nome)}</span><span class="tag neutra">${esc(a.nivel)}</span>${estadoTxt(a)}${a.req.aulas.length || a.req.min ? '<span>🔒 com requisito</span>' : ''}${a.duracao ? `<span>${durTxt(a.duracao)}</span>` : ''}</div></div>
    <div class="acts"><a class="btn btn-g btn-s" href="#/professor/aula/${a.id}">Editar</a>${a.estado === 'pronto' ? `<a class="btn btn-g btn-s" href="#/aula/${a.id}">Ver</a>` : ''}</div></div>`).join('');
  $$('[data-m]', c).forEach((b) => (b.onclick = async () => {
    const id = b.closest('[data-id]').dataset.id; const i = S.aulas.findIndex((x) => x.id === id); const j = i + +b.dataset.m;
    [S.aulas[i], S.aulas[j]] = [S.aulas[j], S.aulas[i]];
    await api('/api/admin/ordem', { ids: S.aulas.map((x) => x.id) }); S.aulas.forEach((x, k) => (x.ordem = k + 1)); admAulas();
  }));
  agendaPoll();
}
function agendaPoll() {
  clearTimeout(pollT);
  if (!S.aulas.some((a) => ['fila', 'processando'].includes(a.estado))) return;
  pollT = setTimeout(async () => {
    const r = rota(); if (r[0] !== 'professor') return;
    const n = await api('/api/aulas').catch(() => null); if (!n) return agendaPoll();
    S.aulas = n.aulas;
    if (!r[1]) admAulas(); else if (r[1] === 'aula' && ED) { const a = S.aulas.find((x) => x.id === ED.id); if (a) { ED.estado = a.estado; ED.progresso = a.progresso; ED.v = a.v; ED.temCapa = a.temCapa; ED.capa = a.capa; ED.duracao = a.duracao; desenhaVideo(); } agendaPoll(); }
  }, 2500);
}

function editor(id) {
  const a = S.aulas.find((x) => x.id === id);
  if (id !== 'nova' && !a) { location.hash = '#/professor'; return; }
  ED = a ? JSON.parse(JSON.stringify(a)) : { id: null, titulo: '', estilo: 'kpop', nivel: 'Iniciante', bio: '', professor: S.info.config.professor, convidado: { nome: '', insta: '', bio: '' }, publicado: false, req: { aulas: [], min: 0, minEstilo: '' }, libera: [], estado: 'sem-video' };
  ED.convidado ??= { nome: '', insta: '', bio: '' };
  const outras = S.aulas.filter((x) => x.id !== ED.id);
  raiz.innerHTML = `<div class="wrap"><div class="adm-top"><div><a class="voltar" href="#/professor">← Suas aulas</a><h1>${a ? 'Editar aula' : 'Nova aula'}</h1></div></div>
  <form class="editor" id="fEd">
    <div>
      <div class="painel"><h3>Vídeo da aula</h3><p class="dica">MP4 ou MOV (até vídeos grandes, direto do celular). O site prepara o vídeo sozinho para tocar liso em qualquer aparelho.</p><div id="edVideo"></div></div>
      <div class="painel"><h3>Informações</h3><p class="dica">O que o aluno vai ver.</p>
        <label class="campo"><span>Título</span><input name="titulo" maxlength="120" required placeholder="Ex.: Coreografia ‘Super Shy’ — parte 1"></label>
        <span class="campo"><span>Estilo</span></span><div class="escolhe" id="edEst"></div>
        <span class="campo"><span>Nível</span></span><div class="escolhe" id="edNiv"></div>
        <div id="edConv"></div>
        <label class="campo" id="edProfL"><span>Professor</span><input name="professor" maxlength="60"></label>
        <label class="campo"><span>Bio da aula</span><textarea name="bio" maxlength="4000" placeholder="Sobre o que é a aula, música, passos trabalhados, dicas…"></textarea></label>
      </div>
    </div>
    <div>
      <div class="painel"><h3>Publicação</h3><p class="dica">Rascunho fica escondido dos alunos.</p>
        <label class="chave"><div><b>Publicar para os alunos</b><span>Aparece no catálogo assim que o vídeo estiver pronto</span></div><input type="checkbox" name="publicado"></label></div>
      <div class="painel"><h3>🔒 Para liberar esta aula</h3><p class="dica">Deixe em branco para a aula ficar aberta. Se marcar, o aluno precisa cumprir tudo.</p>
        <span class="campo"><span>Concluir estas aulas antes</span></span><div id="edReq"></div>
        <span class="campo"><span>E ter feito pelo menos</span></span>
        <div class="min-lin"><input type="number" name="min" min="0" max="500" inputmode="numeric"> aulas de <select name="minEstilo"><option value="">qualquer estilo</option>${S.info.estilos.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}</select></div>
      </div>
      <div class="painel"><h3>✦ Ao concluir esta aula, libera</h3><p class="dica">Ex.: a aula do passo base libera 5 coreografias. Marque aqui as aulas que dependem desta.</p><div id="edLib"></div></div>
      ${a ? '<button type="button" class="btn btn-x" id="bApagar">Apagar aula</button>' : ''}
    </div>
    <div class="barra-salvar"><a class="btn btn-g" href="#/professor">Cancelar</a><button class="btn btn-p" id="bSalvar"><span>${a ? 'Salvar' : 'Criar aula'}</span></button></div>
  </form></div>`;
  const f = $('#fEd');
  f.titulo.value = ED.titulo; f.bio.value = ED.bio; f.professor.value = ED.professor; f.publicado.checked = ED.publicado;
  f.min.value = ED.req.min || ''; f.minEstilo.value = ED.req.minEstilo || '';
  const desenhaEst = () => {
    $('#edEst').innerHTML = S.info.estilos.map((e) => `<button type="button" class="e-${e.id} ${ED.estilo === e.id ? 'on' : ''}" data-e="${e.id}">${esc(e.nome)}</button>`).join('');
    const e = est(ED.estilo); if (!e.niveis.includes(ED.nivel)) ED.nivel = e.niveis[0];
    $('#edNiv').innerHTML = e.niveis.map((n) => `<button type="button" class="e-${e.id} ${ED.nivel === n ? 'on' : ''}" data-nv="${esc(n)}">${esc(n)}</button>`).join('');
    const st = ED.estilo === 'street';
    $('#edProfL').hidden = st;
    $('#edConv').innerHTML = st ? `<div class="painel e-street conv-ed"><h3>Professor convidado</h3><p class="dica">Aparece na aba especial do Street Style.</p>
      <label class="campo"><span>Nome</span><input data-cv="nome" maxlength="60" value="${esc(ED.convidado.nome)}"></label>
      <label class="campo"><span>Instagram (sem @)</span><input data-cv="insta" maxlength="60" value="${esc(ED.convidado.insta)}"></label>
      <label class="campo"><span>Bio do convidado</span><textarea data-cv="bio" maxlength="1500">${esc(ED.convidado.bio)}</textarea></label></div>` : '';
    $$('[data-cv]').forEach((i) => (i.oninput = () => (ED.convidado[i.dataset.cv] = i.value)));
    $$('[data-e]').forEach((b) => (b.onclick = () => { ED.estilo = b.dataset.e; desenhaEst(); }));
    $$('[data-nv]').forEach((b) => (b.onclick = () => { ED.nivel = b.dataset.nv; desenhaEst(); }));
  };
  desenhaEst();
  const lista = (alvo, sel, bloqueia) => {
    const box = $(alvo);
    if (!outras.length) { box.innerHTML = '<div class="dica" style="margin:0">Crie outras aulas para usar aqui.</div>'; return; }
    box.innerHTML = `<input class="busca-in" placeholder="Procurar aula…"><div class="marcar"></div>`;
    const m = $('.marcar', box);
    const pinta = (q = '') => {
      const qq = q.toLowerCase();
      m.innerHTML = S.info.estilos.map((e) => {
        const it = outras.filter((x) => x.estilo === e.id && (!qq || x.titulo.toLowerCase().includes(qq)));
        if (!it.length) return '';
        return `<div class="gr">${esc(e.nome)}</div>` + it.map((x) => `<label class="e-${x.estilo}"><input type="checkbox" value="${x.id}" ${sel.includes(x.id) ? 'checked' : ''}><span class="pt"></span><div><b>${esc(x.titulo)}</b><span>${esc(x.nivel)}${x.publicado ? '' : ' · rascunho'}</span></div></label>`).join('');
      }).join('') || '<div class="dica">Nada encontrado.</div>';
      $$('input', m).forEach((i) => (i.onchange = () => {
        if (i.checked) { if (bloqueia().includes(i.value)) { i.checked = false; return toast('Essa aula já depende desta — não dá para ser as duas coisas.', 'erro'); } sel.push(i.value); }
        else sel.splice(sel.indexOf(i.value), 1);
      }));
    };
    pinta(); $('.busca-in', box).oninput = (e) => pinta(e.target.value);
  };
  lista('#edReq', ED.req.aulas, () => ED.libera);
  lista('#edLib', ED.libera, () => ED.req.aulas);
  desenhaVideo();
  f.onsubmit = async (e) => {
    e.preventDefault(); const b = $('#bSalvar'); b.disabled = true;
    try {
      const r = await api('/api/admin/aula', { id: ED.id, titulo: f.titulo.value, estilo: ED.estilo, nivel: ED.nivel, bio: f.bio.value, professor: f.professor.value, convidado: ED.convidado, publicado: f.publicado.checked, req: { aulas: ED.req.aulas, min: +f.min.value || 0, minEstilo: f.minEstilo.value }, libera: ED.libera });
      const nova = !ED.id; ED.id = r.aula.id;
      const n = await api('/api/aulas'); S.aulas = n.aulas;
      toast(nova ? 'Aula criada ✓ Agora envie o vídeo.' : 'Aula salva ✓');
      if (nova) { history.replaceState(null, '', '#/professor/aula/' + ED.id); editor(ED.id); depoisRender(); }
      else if (!ED.enviando) location.hash = '#/professor';
    } catch (err) { toast(esc(err.message), 'erro'); } finally { b.disabled = false; }
  };
  const ba = $('#bApagar');
  if (ba) ba.onclick = async () => { if (!confirm('Apagar esta aula e o vídeo? Não dá para desfazer.')) return; await api('/api/admin/aula/apagar', { id: ED.id }); const n = await api('/api/aulas'); S.aulas = n.aulas; toast('Aula apagada'); location.hash = '#/professor'; };
  agendaPoll();
}
function desenhaVideo() {
  const c = $('#edVideo'); if (!c || !ED) return;
  if (!ED.id) { c.innerHTML = '<div class="solta" id="semId"><div class="ic">🎬</div><b>Primeiro dê um título e clique em “Criar aula”</b><span>Depois você envia o vídeo aqui.</span></div>'; return; }
  if (ED.enviando) return;
  if (ED.estado === 'fila' || ED.estado === 'processando') {
    c.innerHTML = `<div class="envio"><div class="lin"><span>${ED.estado === 'fila' ? 'Na fila para preparar…' : 'Preparando o vídeo para todos os aparelhos'}</span><span>${Math.round((ED.progresso || 0) * 100)}%</span></div><div class="barra"><i data-w="${Math.round((ED.progresso || 0) * 100)}"></i></div><p class="dica" style="margin-top:10px">Pode sair desta tela: continua sozinho.</p></div>`;
    return;
  }
  const temVideo = ED.estado === 'pronto';
  c.innerHTML = `${temVideo ? `<div class="previa"><video controls playsinline preload="metadata" src="/media/v/${ED.id}?v=${ED.v}"></video></div>
    <div class="chips" id="capaL"><button type="button" class="btn btn-g btn-s" id="bCapa">📸 Usar este momento como capa</button></div>` : ''}
    ${ED.estado === 'erro' ? '<p class="msg-erro">Não consegui ler esse vídeo. Tente outro arquivo (MP4 ou MOV).</p>' : ''}
    <div class="solta e-${ED.estilo}" id="solta"><input type="file" accept="video/*,.mov,.mp4,.m4v,.webm,.mkv"><div class="ic">⬆</div><b>${temVideo ? 'Trocar o vídeo' : 'Arraste o vídeo aqui'}</b><span>ou toque para escolher</span></div>`;
  const s = $('#solta'), inp = $('input', s);
  inp.onchange = () => inp.files[0] && enviar(inp.files[0]);
  s.ondragover = (e) => { e.preventDefault(); s.classList.add('em-cima'); };
  s.ondragleave = () => s.classList.remove('em-cima');
  s.ondrop = (e) => { e.preventDefault(); s.classList.remove('em-cima'); e.dataTransfer.files[0] && enviar(e.dataTransfer.files[0]); };
  const bc = $('#bCapa');
  if (bc) bc.onclick = async () => { const v = $('.previa video', c); bc.disabled = true; try { const r = await api('/api/admin/capa', { id: ED.id, t: v.currentTime }); const a = S.aulas.find((x) => x.id === ED.id); if (a) { a.temCapa = true; a.capa = r.capa; } toast('Capa trocada ✓'); } catch (e) { toast(esc(e.message), 'erro'); } bc.disabled = false; };
}
async function enviar(file) {
  if (!/^video\//.test(file.type) && !/\.(mov|mp4|m4v|webm|mkv)$/i.test(file.name)) return toast('Escolha um arquivo de vídeo', 'erro');
  const c = $('#edVideo'); ED.enviando = true;
  c.innerHTML = `<div class="envio"><div class="lin"><span id="eTx">Enviando ${esc(file.name)}</span><span id="ePc">0%</span></div><div class="barra"><i id="eBar"></i></div><div class="lin" style="margin-top:8px"><span id="eVel"></span><span id="eMb"></span></div><p class="dica">Não feche esta tela até terminar o envio.</p></div>`;
  const PED = 16 * 1024 * 1024, total = file.size;
  let ini = 0, t0 = Date.now(), falhas = 0;
  const trava = (e) => { e.preventDefault(); e.returnValue = ''; };
  addEventListener('beforeunload', trava);
  try {
    while (ini < total) {
      const fim = Math.min(total, ini + PED);
      try {
        const r = await fetch(`/api/admin/upload?id=${ED.id}&ini=${ini}&total=${total}`, { method: 'PUT', body: file.slice(ini, fim) });
        const j = await r.json().catch(() => ({}));
        if (r.status === 409 && j.tem !== undefined) { ini = j.tem; continue; }
        if (!r.ok) throw new Error(j.erro || 'Falha no envio');
        ini = j.tem; falhas = 0;
      } catch (e) {
        if (++falhas > 6) throw e;
        $('#eTx').textContent = 'Conexão instável, tentando de novo…';
        await new Promise((ok) => setTimeout(ok, 1500 * falhas));
        continue;
      }
      const pc = Math.round((ini / total) * 100), s = (Date.now() - t0) / 1000;
      $('#eTx').textContent = 'Enviando ' + file.name; $('#ePc').textContent = pc + '%'; $('#eBar').style.setProperty('--w', pc + '%');
      $('#eVel').textContent = (ini / 1048576 / s).toFixed(1) + ' MB/s';
      $('#eMb').textContent = (ini / 1048576).toFixed(0) + ' de ' + (total / 1048576).toFixed(0) + ' MB';
    }
    ED.estado = 'fila'; ED.progresso = 0; toast('Vídeo enviado ✓ Preparando…');
    const n = await api('/api/aulas'); S.aulas = n.aulas;
  } catch (e) { toast('Envio falhou: ' + esc(e.message), 'erro', 6000); ED.estado = 'sem-video'; }
  finally { removeEventListener('beforeunload', trava); ED.enviando = false; desenhaVideo(); agendaPoll(); }
}

async function admAlunos() {
  const c = $('#admC');
  c.innerHTML = '<div class="carregando"><div class="giro"></div></div>';
  const { alunos } = await api('/api/admin/alunos');
  const pend = alunos.filter((x) => x.status === 'pendente').length;
  c.innerHTML = (pend ? `<div class="toast" style="margin-bottom:16px;text-align:left">⏳ ${pend} aluno${pend > 1 ? 's' : ''} esperando liberação</div>` : '') +
    (alunos.length ? alunos.map((x) => `<div class="aluno ${x.status === 'pendente' ? 'pend' : ''}" data-id="${x.id}"><div class="av">${esc(iniciais(x.nome))}</div>
      <div><b>${esc(x.nome)}</b><span>${esc(x.email)} · ${x.feitas.length} aula${x.feitas.length === 1 ? '' : 's'} feita${x.feitas.length === 1 ? '' : 's'}${x.status === 'bloqueado' ? ' · <b style="display:inline;color:#ff7d94">bloqueado</b>' : ''}</span></div>
      <div class="acts">${x.status === 'pendente' ? '<button class="btn btn-p btn-s" data-st="ativo"><span>Liberar acesso</span></button><button class="btn btn-x btn-s" data-apaga>Recusar</button>' : `<button class="btn btn-g btn-s" data-ver>Progresso</button>${x.status === 'ativo' ? '<button class="btn btn-g btn-s" data-st="bloqueado">Bloquear</button>' : '<button class="btn btn-g btn-s" data-st="ativo">Desbloquear</button>'}`}</div></div>`).join('')
    : '<div class="vazio"><b>Nenhum aluno ainda</b>Mande o link do site para seus alunos criarem a conta.</div>');
  const de = (el) => alunos.find((x) => x.id === el.closest('[data-id]').dataset.id);
  $$('[data-st]', c).forEach((b) => (b.onclick = async () => { await api('/api/admin/aluno', { id: de(b).id, status: b.dataset.st }); toast(b.dataset.st === 'ativo' ? 'Acesso liberado ✓' : 'Aluno bloqueado'); admAlunos(); }));
  $$('[data-apaga]', c).forEach((b) => (b.onclick = async () => { if (!confirm('Recusar e apagar este cadastro?')) return; await api('/api/admin/aluno', { id: de(b).id, apagar: true }); admAlunos(); }));
  $$('[data-ver]', c).forEach((b) => (b.onclick = () => progressoAluno(de(b))));
}
function progressoAluno(x) {
  const f = abreModal(`<h2>${esc(x.nome)}</h2><p>Marque aula feita (ex.: fez presencial) ou libere uma aula trancada só para este aluno.</p>
    <div class="prog-aluno">${S.aulas.map((a) => `<div class="it e-${a.estilo}"><span class="pt"></span><span>${esc(a.titulo)}</span>
      <button class="${x.feitas.includes(a.id) ? 'on' : ''}" data-f="${a.id}">${x.feitas.includes(a.id) ? '✓ Feita' : 'Feita?'}</button>
      <button class="lib ${x.liberadas.includes(a.id) ? 'on' : ''}" data-l="${a.id}">${x.liberadas.includes(a.id) ? 'Liberada' : 'Liberar'}</button></div>`).join('') || '<div class="dica">Sem aulas.</div>'}</div>
    <form id="fNs" style="margin-top:18px"><label class="campo"><span>Nova senha para o aluno (se ele esqueceu)</span><input name="senha" minlength="6" autocomplete="off"></label><button class="btn btn-g">Trocar senha do aluno</button></form>`, true);
  $$('[data-f]', f).forEach((b) => (b.onclick = async () => { const on = !x.feitas.includes(b.dataset.f); await api('/api/admin/aluno', { id: x.id, aula: b.dataset.f, feita: on }); on ? x.feitas.push(b.dataset.f) : x.feitas.splice(x.feitas.indexOf(b.dataset.f), 1); b.classList.toggle('on', on); b.textContent = on ? '✓ Feita' : 'Feita?'; }));
  $$('[data-l]', f).forEach((b) => (b.onclick = async () => { const on = !x.liberadas.includes(b.dataset.l); await api('/api/admin/aluno', { id: x.id, aula: b.dataset.l, liberar: on }); on ? x.liberadas.push(b.dataset.l) : x.liberadas.splice(x.liberadas.indexOf(b.dataset.l), 1); b.classList.toggle('on', on); b.textContent = on ? 'Liberada' : 'Liberar'; }));
  $('#fNs', f).onsubmit = async (e) => { e.preventDefault(); try { await api('/api/admin/aluno', { id: x.id, senha: e.target.senha.value }); toast('Senha do aluno trocada ✓'); e.target.reset(); } catch (err) { toast(esc(err.message), 'erro'); } };
}
function admAjustes() {
  const c = $('#admC');
  const cf = S.info.config;
  c.innerHTML = `<div class="painel"><h3>Cadastro de alunos</h3><p class="dica">Com a aprovação ligada, quem cria conta só entra depois que você liberar em Alunos.</p>
    <label class="chave"><div><b>Aprovar cada aluno novo</b><span>Recomendado: só seus alunos assistem</span></div><input type="checkbox" id="cAprovar" ${cf.aprovar ? 'checked' : ''}></label></div>
    <div class="painel"><h3>Professor principal</h3><p class="dica">Nome que aparece nas aulas.</p><form id="fCf"><label class="campo"><span>Nome</span><input name="professor" value="${esc(cf.professor)}" maxlength="60"></label><button class="btn btn-g">Salvar</button></form></div>
    <div class="painel"><h3>Link do site</h3><p class="dica">Mande para seus alunos:</p><div class="tag neutra" id="lnk"></div></div>`;
  $('#lnk').textContent = location.origin;
  $('#cAprovar').onchange = async (e) => { await api('/api/admin/config', { aprovar: e.target.checked }); cf.aprovar = e.target.checked; toast('Salvo ✓'); };
  $('#fCf').onsubmit = async (e) => { e.preventDefault(); await api('/api/admin/config', { professor: e.target.professor.value }); cf.professor = e.target.professor.value; toast('Salvo ✓'); };
}

// ---------- Roteador ----------
function render() {
  plAtual?.fim(); clearTimeout(pollT);
  if (rota()[0] !== 'professor' || rota()[1] !== 'aula') ED = null;
  topo();
  if (!S.eu) paginaVisitante();
  else {
    const [p, a, b] = rota();
    if (p === 'estilo') paginaEstilo(a);
    else if (p === 'street') paginaStreet();
    else if (p === 'aula') paginaAula(a);
    else if (p === 'professor') paginaProfessor(a, b);
    else paginaInicio();
  }
  depoisRender();
  }
addEventListener('hashchange', () => { render(); scrollTo({ top: 0, behavior: 'instant' }); });

(async function inicio() {
  raiz.innerHTML = '<div class="carregando"><div class="giro"></div></div>';
  try { await carregar(); } catch { raiz.innerHTML = '<div class="wrap"><div class="vazio" style="margin:60px 0"><b>Sem conexão</b>Tente de novo em instantes.</div></div>'; return; }
  render();
})();
