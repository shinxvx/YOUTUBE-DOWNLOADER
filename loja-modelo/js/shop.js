/* Vitrine: catálogo, página de produto, carrinho e checkout. */
(function () {
  const { money, esc, toast, productArt } = UI;
  const state = { category: 'Todos', sort: 'relevancia', search: '', coupon: '' };

  // ---------- Card de produto ----------
  function card(p) {
    const off = p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
    const out = p.stock <= 0;
    return `<article class="card ${out ? 'is-out' : ''}">
      <a href="#/produto/${p.id}" class="card__media">
        ${productArt(p)}
        ${off ? `<span class="pill pill--sale">-${off}%</span>` : ''}
        ${out ? '<span class="pill pill--muted">Esgotado</span>' : ''}
      </a>
      <div class="card__body">
        <span class="card__cat">${esc(p.category)}</span>
        <a href="#/produto/${p.id}" class="card__title">${esc(p.name)}</a>
        <div class="card__foot">
          <div class="price">
            ${off ? `<s>${money(p.comparePrice)}</s>` : ''}
            <strong>${money(p.price)}</strong>
          </div>
          <button class="btn btn--icon" data-add="${p.id}" ${out ? 'disabled' : ''} aria-label="Adicionar ao carrinho">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
    </article>`;
  }

  function filtered() {
    const q = state.search.trim().toLowerCase();
    let list = Store.products().filter((p) =>
      (state.category === 'Todos' || p.category === state.category) &&
      (!q || (p.name + ' ' + p.description + ' ' + p.category).toLowerCase().includes(q)));
    const by = {
      relevancia: (a, b) => (b.featured - a.featured) || (b.sold - a.sold),
      menor: (a, b) => a.price - b.price,
      maior: (a, b) => b.price - a.price,
      novos: (a, b) => b.createdAt - a.createdAt,
      vendidos: (a, b) => b.sold - a.sold,
    }[state.sort];
    // Esgotados sempre por último.
    return list.sort((a, b) => ((a.stock <= 0) - (b.stock <= 0)) || by(a, b));
  }

  // ---------- Página inicial / catálogo ----------
  function home(app) {
    const s = Store.settings();
    const featured = Store.products().filter((p) => p.featured && p.stock > 0).slice(0, 4);
    const cats = ['Todos', ...Store.categories()];
    app.innerHTML = `
      <section class="hero">
        <div class="container hero__inner">
          <div class="hero__text">
            <span class="eyebrow">${esc(s.tagline)}</span>
            <h1>${esc(s.heroTitle)}</h1>
            <p>${esc(s.heroText)}</p>
            <div class="row">
              <a href="#catalogo" class="btn btn--primary btn--lg" data-scroll>Ver catálogo</a>
              ${featured[0] ? `<a href="#/produto/${featured[0].id}" class="btn btn--ghost btn--lg">Destaque da semana</a>` : ''}
            </div>
          </div>
          <div class="hero__grid">
            ${featured.map((p, i) => `<a href="#/produto/${p.id}" class="hero__tile hero__tile--${i}">${productArt(p)}<span>${esc(p.name)}<b>${money(p.price)}</b></span></a>`).join('')}
          </div>
        </div>
      </section>

      <section class="perks container">
        <div><b>🚚 Frete grátis</b><span>acima de ${money(s.freeShippingFrom)}</span></div>
        <div><b>🔁 Troca fácil</b><span>até 30 dias</span></div>
        <div><b>🔒 Compra segura</b><span>dados protegidos</span></div>
        <div><b>⚡ Pix</b><span>aprovação imediata</span></div>
      </section>

      <section class="container section" id="catalogo">
        <div class="section__head">
          <h2>Catálogo</h2>
          <select id="sortSel" class="select">
            <option value="relevancia">Relevância</option>
            <option value="novos">Novidades</option>
            <option value="vendidos">Mais vendidos</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
          </select>
        </div>
        <div class="chips" id="chips">
          ${cats.map((c) => `<button class="chip ${c === state.category ? 'is-active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
        <div class="grid" id="grid"></div>
      </section>`;

    const sel = app.querySelector('#sortSel');
    sel.value = state.sort;
    sel.addEventListener('change', () => { state.sort = sel.value; renderGrid(); });
    app.querySelector('#chips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      state.category = b.dataset.cat;
      app.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === b));
      renderGrid();
    });
    app.querySelector('[data-scroll]').addEventListener('click', (e) => {
      e.preventDefault(); document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
    });
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    const list = filtered();
    grid.innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty"><span>🔍</span><p>Nenhum produto encontrado${state.search ? ` para “${esc(state.search)}”` : ''}.</p></div>`;
  }

  // ---------- Página do produto ----------
  function productPage(app, id) {
    const p = Store.product(id);
    if (!p || !p.active) { app.innerHTML = `<div class="container section empty"><span>😕</span><p>Produto não encontrado.</p><a class="btn btn--primary" href="#/">Voltar à loja</a></div>`; return; }
    const off = p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
    const related = Store.products().filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
    app.innerHTML = `
      <div class="container section">
        <nav class="crumbs"><a href="#/">Início</a> / <span>${esc(p.category)}</span> / <span>${esc(p.name)}</span></nav>
        <div class="pdp">
          <div class="pdp__media">${productArt(p, 'art--xl')}</div>
          <div class="pdp__info">
            <span class="eyebrow">${esc(p.category)}</span>
            <h1>${esc(p.name)}</h1>
            <div class="price price--lg">
              ${off ? `<s>${money(p.comparePrice)}</s>` : ''}<strong>${money(p.price)}</strong>
              ${off ? `<span class="pill pill--sale">-${off}%</span>` : ''}
            </div>
            <p class="muted">ou 3x de ${money(p.price / 3)} sem juros · ${money(p.price * 0.95)} no Pix</p>
            <p>${esc(p.description)}</p>
            <p class="stock ${p.stock <= 0 ? 'stock--out' : p.stock < 6 ? 'stock--low' : ''}">
              ${p.stock <= 0 ? 'Esgotado' : p.stock < 6 ? `Restam só ${p.stock} unidades` : 'Em estoque'}
            </p>
            <div class="row">
              <div class="qty" id="qty">
                <button data-d="-1" aria-label="Menos">−</button><input value="1" inputmode="numeric" aria-label="Quantidade"><button data-d="1" aria-label="Mais">+</button>
              </div>
              <button class="btn btn--primary btn--lg grow" id="addBtn" ${p.stock <= 0 ? 'disabled' : ''}>Adicionar ao carrinho</button>
            </div>
            <button class="btn btn--ghost btn--block" id="buyNow" ${p.stock <= 0 ? 'disabled' : ''}>Comprar agora</button>
            <ul class="pdp__perks"><li>🚚 Frete grátis acima de ${money(Store.settings().freeShippingFrom)}</li><li>🔁 Primeira troca grátis</li></ul>
          </div>
        </div>
        ${related.length ? `<h2 class="mt">Você também pode gostar</h2><div class="grid">${related.map(card).join('')}</div>` : ''}
      </div>`;

    const input = app.querySelector('#qty input');
    const clamp = (v) => Math.max(1, Math.min(p.stock || 1, parseInt(v, 10) || 1));
    app.querySelector('#qty').addEventListener('click', (e) => {
      const b = e.target.closest('[data-d]'); if (b) input.value = clamp(+input.value + +b.dataset.d);
    });
    input.addEventListener('change', () => { input.value = clamp(input.value); });
    app.querySelector('#addBtn').addEventListener('click', () => {
      if (Store.addToCart(p.id, clamp(input.value))) { toast('Adicionado ao carrinho'); openCart(); }
    });
    app.querySelector('#buyNow').addEventListener('click', () => {
      if (Store.addToCart(p.id, clamp(input.value))) location.hash = '#/checkout';
    });
  }

  // ---------- Gaveta do carrinho ----------
  function renderCart() {
    const t = Store.totals(state.coupon);
    document.getElementById('cartCount').textContent = t.lines.reduce((s, l) => s + l.qty, 0);
    const body = document.getElementById('cartItems');
    const foot = document.getElementById('cartFoot');
    if (!t.lines.length) {
      body.innerHTML = `<div class="empty"><span>🛒</span><p>Seu carrinho está vazio.</p></div>`;
      foot.innerHTML = `<button class="btn btn--primary btn--block" data-close-drawer>Continuar comprando</button>`;
      return;
    }
    const s = Store.settings();
    const missing = s.freeShippingFrom - t.subtotal;
    body.innerHTML = `
      ${missing > 0
        ? `<div class="ship-bar"><p>Faltam <b>${money(missing)}</b> para frete grátis</p><div><i style="width:${Math.min(100, t.subtotal / s.freeShippingFrom * 100)}%"></i></div></div>`
        : `<div class="ship-bar ship-bar--ok"><p>🎉 Você ganhou <b>frete grátis</b></p></div>`}
      ${t.lines.map((l) => `
        <div class="line">
          ${productArt(l.product, 'art--sm')}
          <div class="line__info">
            <a href="#/produto/${l.id}">${esc(l.product.name)}</a>
            <span class="muted small">${money(l.product.price)}</span>
            <div class="qty qty--sm" data-line="${l.id}">
              <button data-d="-1" aria-label="Menos">−</button><span>${l.qty}</span><button data-d="1" aria-label="Mais">+</button>
            </div>
          </div>
          <div class="line__end">
            <b>${money(l.product.price * l.qty)}</b>
            <button class="link-btn" data-remove="${l.id}">Remover</button>
          </div>
        </div>`).join('')}`;
    foot.innerHTML = `
      <div class="sum"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
      <div class="sum"><span>Frete</span><span>${t.shipping ? money(t.shipping) : 'Grátis'}</span></div>
      <a href="#/checkout" class="btn btn--primary btn--block btn--lg">Fechar compra · ${money(t.subtotal + t.shipping)}</a>`;
  }

  function openCart() {
    document.getElementById('cartDrawer').classList.add('is-open');
    document.getElementById('cartDrawer').setAttribute('aria-hidden', 'false');
    document.getElementById('overlay').hidden = false;
  }
  function closeCart() {
    document.getElementById('cartDrawer').classList.remove('is-open');
    document.getElementById('cartDrawer').setAttribute('aria-hidden', 'true');
    document.getElementById('overlay').hidden = true;
  }

  // ---------- Checkout ----------
  function checkoutPage(app) {
    const t0 = Store.totals(state.coupon);
    if (!t0.lines.length) {
      app.innerHTML = `<div class="container section empty"><span>🛒</span><p>Seu carrinho está vazio.</p><a class="btn btn--primary" href="#/">Ir às compras</a></div>`;
      return;
    }
    app.innerHTML = `
      <div class="container section">
        <nav class="crumbs"><a href="#/">Início</a> / <span>Finalizar compra</span></nav>
        <h1>Finalizar compra</h1>
        <form class="checkout" id="ckForm" novalidate>
          <div class="checkout__main">
            <fieldset class="panel">
              <legend><span class="step">1</span> Seus dados</legend>
              <div class="fields">
                <label class="field span-2">Nome completo<input name="name" required autocomplete="name"></label>
                <label class="field">E-mail<input name="email" type="email" required autocomplete="email"></label>
                <label class="field">Telefone / WhatsApp<input name="phone" required autocomplete="tel" placeholder="(11) 99999-9999"></label>
              </div>
            </fieldset>
            <fieldset class="panel">
              <legend><span class="step">2</span> Entrega</legend>
              <div class="fields">
                <label class="field">CEP<input name="cep" required inputmode="numeric" autocomplete="postal-code" placeholder="00000-000"></label>
                <label class="field">Cidade - UF<input name="city" required autocomplete="address-level2"></label>
                <label class="field span-2">Endereço e número<input name="address" required autocomplete="street-address"></label>
                <label class="field span-2">Observações (opcional)<textarea name="notes" rows="2"></textarea></label>
              </div>
            </fieldset>
            <fieldset class="panel">
              <legend><span class="step">3</span> Pagamento</legend>
              <div class="pay">
                <label class="pay__opt"><input type="radio" name="payment" value="pix" checked><span><b>Pix</b><small>5% de desconto · aprovação na hora</small></span></label>
                <label class="pay__opt"><input type="radio" name="payment" value="cartao"><span><b>Cartão de crédito</b><small>até 3x sem juros · link seguro enviado por e-mail</small></span></label>
                <label class="pay__opt"><input type="radio" name="payment" value="boleto"><span><b>Boleto</b><small>compensação em até 2 dias úteis</small></span></label>
              </div>
              <p class="muted small">Modelo: o pagamento é registrado no pedido. Conecte seu gateway (Mercado Pago, Stripe, PagSeguro…) em <code>Store.checkout</code>.</p>
            </fieldset>
          </div>
          <aside class="checkout__side panel" id="ckSummary"></aside>
        </form>
      </div>`;

    const form = app.querySelector('#ckForm');
    const summary = app.querySelector('#ckSummary');

    function renderSummary() {
      const pay = form.payment.value;
      const t = Store.totals(state.coupon);
      const pixOff = pay === 'pix' ? (t.subtotal - t.discount) * 0.05 : 0;
      summary.innerHTML = `
        <h3>Resumo do pedido</h3>
        <div class="mini-lines">
          ${t.lines.map((l) => `<div class="mini"><span class="mini__q">${l.qty}×</span><span class="grow">${esc(l.product.name)}</span><span>${money(l.product.price * l.qty)}</span></div>`).join('')}
        </div>
        <div class="coupon">
          <input id="couponIn" placeholder="Cupom de desconto" value="${esc(state.coupon)}">
          <button type="button" class="btn btn--ghost" id="couponBtn">${t.coupon ? 'Remover' : 'Aplicar'}</button>
        </div>
        ${t.coupon ? `<p class="small ok">Cupom <b>${esc(t.coupon.code)}</b> aplicado</p>` : ''}
        <div class="sum"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        ${t.discount ? `<div class="sum ok"><span>Desconto</span><span>− ${money(t.discount)}</span></div>` : ''}
        ${pixOff ? `<div class="sum ok"><span>Desconto Pix (5%)</span><span>− ${money(pixOff)}</span></div>` : ''}
        <div class="sum"><span>Frete</span><span>${t.shipping ? money(t.shipping) : 'Grátis'}</span></div>
        <div class="sum sum--total"><span>Total</span><span>${money(t.total - pixOff)}</span></div>
        <button class="btn btn--primary btn--block btn--lg" type="submit">Confirmar pedido</button>
        <p class="muted small center">🔒 Ambiente seguro</p>`;
      summary.querySelector('#couponBtn').addEventListener('click', () => {
        if (t.coupon) { state.coupon = ''; renderSummary(); return; }
        const code = summary.querySelector('#couponIn').value;
        if (Store.findCoupon(code)) { state.coupon = code.trim().toUpperCase(); toast('Cupom aplicado'); }
        else toast('Cupom inválido', 'err');
        renderSummary();
      });
    }
    form.addEventListener('change', (e) => { if (e.target.name === 'payment') renderSummary(); });
    form.addEventListener('input', (e) => { e.target.closest('.field')?.classList.remove('is-bad'); });
    form.cep.addEventListener('input', () => {
      const d = form.cep.value.replace(/\D/g, '').slice(0, 8);
      form.cep.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
    });
    renderSummary();
    app._refresh = () => (Store.cart().length ? renderSummary() : checkoutPage(app));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('[required]').forEach((inp) => {
        const bad = !inp.value.trim() || (inp.type === 'email' && !/^\S+@\S+\.\S+$/.test(inp.value));
        inp.closest('.field').classList.toggle('is-bad', bad);
        if (bad) ok = false;
      });
      if (!ok) { toast('Preencha os campos destacados', 'err'); form.querySelector('.is-bad input')?.focus(); return; }
      const fd = Object.fromEntries(new FormData(form));
      const payment = fd.payment; delete fd.payment;
      try {
        const order = Store.checkout(fd, payment, state.coupon);
        state.coupon = '';
        location.hash = '#/pedido/' + order.id;
      } catch (err) { toast(err.message, 'err'); }
    });
  }

  function successPage(app, id) {
    const o = Store.order(id);
    if (!o) { location.hash = '#/'; return; }
    const pay = { pix: 'Pix', cartao: 'Cartão de crédito', boleto: 'Boleto' }[o.payment];
    app.innerHTML = `
      <div class="container section">
        <div class="success panel">
          <div class="success__icon">✓</div>
          <h1>Pedido confirmado!</h1>
          <p class="muted">Obrigado, ${esc(o.customer.name.split(' ')[0])}. Enviamos os detalhes para <b>${esc(o.customer.email)}</b>.</p>
          <div class="success__meta">
            <div><span>Pedido</span><b>${o.id}</b></div>
            <div><span>Pagamento</span><b>${pay}</b></div>
            <div><span>Total</span><b>${money(o.total)}</b></div>
          </div>
          ${o.payment === 'pix' ? `<div class="pix"><div class="pix__qr" aria-hidden="true"></div><div><b>Pague com Pix</b><p class="muted small">Escaneie o QR Code ou copie o código. (Modelo: gere o código real no seu gateway.)</p><button class="btn btn--ghost" id="copyPix">Copiar código Pix</button></div></div>` : ''}
          <a href="#/" class="btn btn--primary btn--lg">Continuar comprando</a>
        </div>
      </div>`;
    app.querySelector('#copyPix')?.addEventListener('click', () => {
      navigator.clipboard?.writeText('00020126-PIX-EXEMPLO-' + o.id).then(() => toast('Código copiado'), () => toast('Não foi possível copiar', 'err'));
    });
  }

  function init() {
    document.getElementById('cartBtn').addEventListener('click', openCart);
    document.getElementById('overlay').addEventListener('click', closeCart);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-drawer]')) { closeCart(); return; }
      const add = e.target.closest('[data-add]');
      if (add) { if (Store.addToCart(add.dataset.add)) { toast('Adicionado ao carrinho'); renderCart(); } return; }
      const rm = e.target.closest('[data-remove]');
      if (rm) { Store.setQty(rm.dataset.remove, 0); return; }
      const step = e.target.closest('[data-line] [data-d]');
      if (step) {
        const id = step.closest('[data-line]').dataset.line;
        const line = Store.cart().find((l) => l.id === id);
        if (line) Store.setQty(id, line.qty + +step.dataset.d);
      }
    });
    document.getElementById('cartItems').addEventListener('click', (e) => { if (e.target.closest('a')) closeCart(); });
    document.getElementById('cartFoot').addEventListener('click', (e) => { if (e.target.closest('a')) closeCart(); });

    const search = document.getElementById('searchInput');
    search.addEventListener('input', () => {
      state.search = search.value;
      if (!document.getElementById('grid')) { location.hash = '#/'; return; }
      renderGrid();
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
    });
    renderCart();
  }

  window.Shop = { init, home, productPage, checkoutPage, successPage, renderCart, renderGrid };
})();
