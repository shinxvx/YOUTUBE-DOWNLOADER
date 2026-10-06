/* Utilidades de interface compartilhadas pela loja e pelo painel. */
(function () {
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); }, 2600);
  }

  /** Abre um modal com o HTML dado; devolve o elemento do conteúdo e a função de fechar. */
  function modal(html, { wide = false } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal__backdrop"></div><div class="modal__card ${wide ? 'modal__card--wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('is-open'));
    const close = () => { wrap.classList.remove('is-open'); setTimeout(() => wrap.remove(), 200); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.querySelector('.modal__backdrop').addEventListener('click', close);
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    return { el: wrap.querySelector('.modal__card'), close };
  }

  function confirmDialog(text) {
    return new Promise((resolve) => {
      const m = modal(`<h3>Confirmar</h3><p class="muted">${esc(text)}</p>
        <div class="row-end"><button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger" data-ok>Confirmar</button></div>`);
      m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); resolve(true); });
      m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => resolve(false)));
    });
  }

  /** Imagem do produto: usa a URL cadastrada ou um "cartão" com gradiente e emoji. */
  function productArt(p, size = '') {
    if (p.image) return `<div class="art ${size}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>`;
    const c = p.color || '#6d5efc';
    return `<div class="art art--gen ${size}" style="--c:${esc(c)}"><span>${esc(p.emoji || '📦')}</span></div>`;
  }

  function applyTheme() {
    const s = Store.settings();
    document.documentElement.style.setProperty('--accent', s.accent);
    document.title = s.storeName;
    document.getElementById('brandName').textContent = s.storeName;
    document.getElementById('brandLogo').textContent = s.storeName.trim().charAt(0).toUpperCase() || '◆';
    document.getElementById('footerName').textContent = s.storeName;
    document.getElementById('footerTagline').textContent = s.tagline;
  }

  function initThemeToggle() {
    let saved = null;
    try { saved = localStorage.getItem('loja-modelo:theme'); } catch (e) {}
    if (saved) document.documentElement.dataset.theme = saved;
    document.getElementById('themeBtn').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark'
        : matchMedia('(prefers-color-scheme: dark)').matches;
      const next = dark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('loja-modelo:theme', next); } catch (e) {}
    });
  }

  const date = (ts) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const dateTime = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  window.UI = { money: (v) => fmt.format(v || 0), esc, toast, modal, confirmDialog, productArt, applyTheme, initThemeToggle, date, dateTime };
})();
