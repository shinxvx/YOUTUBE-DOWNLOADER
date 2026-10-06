/* Painel administrativo: dashboard, produtos, pedidos, cupons e configurações. */
(function () {
  const { money, esc, toast, modal, confirmDialog, productArt, date, dateTime } = UI;
  const SESSION = 'loja-modelo:admin';
  const STATUS = {
    pendente: 'Pendente', pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado',
  };
  const PAY = { pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto' };
  const TABS = [
    ['dashboard', 'Visão geral', '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>'],
    ['produtos', 'Produtos', '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'],
    ['pedidos', 'Pedidos', '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>'],
    ['cupons', 'Cupons', '<path d="M3 9V5h18v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6z"/><path d="M14 5v14" stroke-dasharray="2 2"/>'],
    ['config', 'Configurações', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'],
  ];

  const isLogged = () => { try { return sessionStorage.getItem(SESSION) === '1'; } catch (e) { return window.__adm === true; } };
  const setLogged = (v) => { try { v ? sessionStorage.setItem(SESSION, '1') : sessionStorage.removeItem(SESSION); } catch (e) { window.__adm = v; } };
  const statusPill = (s) => `<span class="status status--${s}">${STATUS[s] || s}</span>`;

  function render(app, tab = 'dashboard') {
    if (!isLogged()) return login(app);
    if (!TABS.some((t) => t[0] === tab)) tab = 'dashboard';
    app.innerHTML = `
      <div class="admin">
        <aside class="admin__nav">
          <div class="admin__title">Painel</div>
          ${TABS.map(([id, label, icon]) => `<a href="#/admin/${id}" class="admin__link ${id === tab ? 'is-active' : ''}"><svg viewBox="0 0 24 24">${icon}</svg><span>${label}</span></a>`).join('')}
          <div class="admin__spacer"></div>
          <a href="#/" class="admin__link"><svg viewBox="0 0 24 24"><path d="M3 10 12 3l9 7v11H3z"/><path d="M9 21v-7h6v7"/></svg><span>Ver loja</span></a>
          <button class="admin__link" id="logout"><svg viewBox="0 0 24 24"><path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9"/></svg><span>Sair</span></button>
        </aside>
        <section class="admin__main" id="adminMain"></section>
      </div>`;
    app.querySelector('#logout').addEventListener('click', () => { setLogged(false); location.hash = '#/'; });
    const main = app.querySelector('#adminMain');
    ({ dashboard, produtos, pedidos, cupons, config })[tab](main);
  }

  // ---------- Login ----------
  function login(app) {
    app.innerHTML = `
      <div class="container section">
        <form class="login panel" id="loginForm">
          <div class="success__icon">🔐</div>
          <h1>Área do administrador</h1>
          <p class="muted">Entre com a senha do painel.</p>
          <label class="field">Senha<input type="password" name="pw" autocomplete="current-password" autofocus></label>
          <button class="btn btn--primary btn--block btn--lg">Entrar</button>
          <p class="muted small center">Senha padrão do modelo: <code>admin123</code> — troque em Configurações.</p>
        </form>
      </div>`;
    app.querySelector('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (e.target.pw.value === Store.settings().adminPassword) { setLogged(true); render(app, currentTab()); }
      else { toast('Senha incorreta', 'err'); e.target.pw.select(); }
    });
  }
  const currentTab = () => location.hash.split('/')[2] || 'dashboard';

  // ---------- Dashboard ----------
  function dashboard(main) {
    const orders = Store.orders();
    const valid = orders.filter((o) => o.status !== 'cancelado');
    const revenue = valid.reduce((s, o) => s + o.total, 0);
    const products = Store.products({ includeInactive: true });
    const low = products.filter((p) => p.active && p.stock < 6).sort((a, b) => a.stock - b.stock);
    const pending = orders.filter((o) => o.status === 'pendente' || o.status === 'pago').length;

    // Receita dos últimos 14 dias
    const days = [...Array(14)].map((_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i);
      return { d, total: 0 };
    });
    valid.forEach((o) => {
      const day = new Date(o.createdAt); day.setHours(0, 0, 0, 0);
      const slot = days.find((x) => x.d.getTime() === day.getTime());
      if (slot) slot.total += o.total;
    });
    const max = Math.max(1, ...days.map((x) => x.total));
    const top = products.slice().sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 5);

    main.innerHTML = `
      <header class="admin__head"><div><h1>Visão geral</h1><p class="muted">Resumo da operação da loja.</p></div>
        <a href="#/admin/produtos" class="btn btn--primary" data-new>+ Novo produto</a></header>
      <div class="kpis">
        <div class="kpi"><span>Receita</span><b>${money(revenue)}</b><small>${valid.length} pedidos válidos</small></div>
        <div class="kpi"><span>Ticket médio</span><b>${money(valid.length ? revenue / valid.length : 0)}</b><small>por pedido</small></div>
        <div class="kpi"><span>A processar</span><b>${pending}</b><small>pendentes ou pagos</small></div>
        <div class="kpi ${low.length ? 'kpi--warn' : ''}"><span>Estoque baixo</span><b>${low.length}</b><small>produtos com &lt; 6 un.</small></div>
      </div>
      <div class="admin__cols">
        <div class="panel">
          <h3>Receita — últimos 14 dias</h3>
          <div class="bars">
            ${days.map((x) => `<div class="bars__col" title="${x.d.toLocaleDateString('pt-BR')}: ${money(x.total)}"><i style="height:${(x.total / max) * 100}%"></i><span>${x.d.getDate()}</span></div>`).join('')}
          </div>
        </div>
        <div class="panel">
          <h3>Mais vendidos</h3>
          <ol class="rank">${top.map((p) => `<li>${productArt(p, 'art--xs')}<span class="grow">${esc(p.name)}</span><b>${p.sold || 0}</b></li>`).join('')}</ol>
        </div>
      </div>
      <div class="admin__cols">
        <div class="panel">
          <div class="row-between"><h3>Pedidos recentes</h3><a href="#/admin/pedidos" class="link-btn">Ver todos</a></div>
          ${ordersTable(orders.slice(0, 5))}
        </div>
        <div class="panel">
          <h3>Repor estoque</h3>
          ${low.length ? `<ul class="rank">${low.map((p) => `<li>${productArt(p, 'art--xs')}<span class="grow">${esc(p.name)}</span><b class="${p.stock ? 'warn' : 'bad'}">${p.stock} un.</b></li>`).join('')}</ul>` : '<p class="muted">Tudo certo por aqui.</p>'}
        </div>
      </div>`;
    main.querySelector('[data-new]').addEventListener('click', (e) => { e.preventDefault(); editProduct(); });
    bindOrderRows(main);
  }

  // ---------- Produtos ----------
  function produtos(main) {
    main.innerHTML = `
      <header class="admin__head"><div><h1>Produtos</h1><p class="muted">Cadastre, edite e controle o estoque.</p></div>
        <button class="btn btn--primary" id="newProd">+ Novo produto</button></header>
      <div class="toolbar">
        <input class="input" id="pSearch" placeholder="Buscar por nome…">
        <select class="select" id="pCat"><option value="">Todas as categorias</option>${Store.categories().map((c) => `<option>${esc(c)}</option>`).join('')}</select>
      </div>
      <div class="panel panel--flush"><div class="table-wrap" id="pTable"></div></div>`;
    const draw = () => {
      const q = main.querySelector('#pSearch').value.toLowerCase();
      const cat = main.querySelector('#pCat').value;
      const list = Store.products({ includeInactive: true }).filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!cat || p.category === cat));
      main.querySelector('#pTable').innerHTML = list.length ? `
        <table class="table">
          <thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Vendidos</th><th>Ativo</th><th></th></tr></thead>
          <tbody>${list.map((p) => `
            <tr>
              <td><div class="cell-prod">${productArt(p, 'art--xs')}<div><b>${esc(p.name)}</b>${p.featured ? '<span class="tag">Destaque</span>' : ''}</div></div></td>
              <td>${esc(p.category)}</td>
              <td>${money(p.price)}</td>
              <td><span class="${p.stock === 0 ? 'bad' : p.stock < 6 ? 'warn' : ''}">${p.stock}</span></td>
              <td>${p.sold || 0}</td>
              <td><label class="switch"><input type="checkbox" data-toggle="${p.id}" ${p.active ? 'checked' : ''}><i></i></label></td>
              <td class="actions"><button class="link-btn" data-edit="${p.id}">Editar</button><button class="link-btn bad" data-del="${p.id}">Excluir</button></td>
            </tr>`).join('')}</tbody>
        </table>` : '<div class="empty"><span>📦</span><p>Nenhum produto.</p></div>';
    };
    main.querySelector('#pSearch').addEventListener('input', draw);
    main.querySelector('#pCat').addEventListener('change', draw);
    main.querySelector('#newProd').addEventListener('click', () => editProduct());
    main.querySelector('#pTable').addEventListener('click', async (e) => {
      const ed = e.target.closest('[data-edit]');
      if (ed) return editProduct(Store.product(ed.dataset.edit));
      const del = e.target.closest('[data-del]');
      if (del && await confirmDialog('Excluir "' + Store.product(del.dataset.del).name + '"? Esta ação não pode ser desfeita.')) {
        Store.deleteProduct(del.dataset.del); toast('Produto excluído');
      }
    });
    main.querySelector('#pTable').addEventListener('change', (e) => {
      const t = e.target.closest('[data-toggle]');
      if (t) { Store.saveProduct({ id: t.dataset.toggle, active: t.checked }); toast(t.checked ? 'Produto visível na loja' : 'Produto oculto da loja'); }
    });
    draw();
    main._redraw = draw;
  }

  function editProduct(p) {
    const isNew = !p;
    p = p || { name: '', category: Store.categories()[0] || '', price: 0, comparePrice: 0, stock: 0, emoji: '📦', color: Store.settings().accent, image: '', description: '', featured: false, active: true };
    const m = modal(`
      <div class="row-between"><h3>${isNew ? 'Novo produto' : 'Editar produto'}</h3><button class="icon-btn" data-close aria-label="Fechar">✕</button></div>
      <form class="prod-form" id="prodForm">
        <div class="prod-form__preview" id="prev"></div>
        <div class="fields">
          <label class="field span-2">Nome<input name="name" required value="${esc(p.name)}"></label>
          <label class="field">Categoria<input name="category" list="catList" required value="${esc(p.category)}"><datalist id="catList">${Store.categories().map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
          <label class="field">Estoque<input name="stock" type="number" min="0" step="1" value="${p.stock}"></label>
          <label class="field">Preço (R$)<input name="price" type="number" min="0" step="0.01" required value="${p.price}"></label>
          <label class="field">Preço "de" (opcional)<input name="comparePrice" type="number" min="0" step="0.01" value="${p.comparePrice || ''}"></label>
          <label class="field span-2">URL da imagem (opcional)<input name="image" type="url" placeholder="https://…" value="${esc(p.image)}"></label>
          <label class="field">Emoji (sem imagem)<input name="emoji" maxlength="4" value="${esc(p.emoji)}"></label>
          <label class="field">Cor do fundo<input name="color" type="color" value="${esc(p.color || '#6d5efc')}"></label>
          <label class="field span-2">Descrição<textarea name="description" rows="3">${esc(p.description)}</textarea></label>
          <label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Destacar na página inicial</label>
          <label class="check"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Visível na loja</label>
        </div>
        <div class="row-end"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary">${isNew ? 'Cadastrar' : 'Salvar'}</button></div>
      </form>`, { wide: true });
    const form = m.el.querySelector('#prodForm');
    const read = () => {
      const f = Object.fromEntries(new FormData(form));
      return {
        ...f, price: +f.price || 0, comparePrice: +f.comparePrice || 0, stock: Math.max(0, parseInt(f.stock, 10) || 0),
        featured: form.featured.checked, active: form.active.checked, name: f.name.trim(), category: f.category.trim(),
      };
    };
    const preview = () => { const d = read(); m.el.querySelector('#prev').innerHTML = productArt({ ...d, name: d.name || 'Produto' }); };
    form.addEventListener('input', preview);
    preview();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = read();
      if (!d.name || !d.category) return toast('Informe nome e categoria', 'err');
      if (d.comparePrice && d.comparePrice <= d.price) d.comparePrice = 0;
      Store.addCategory(d.category);
      Store.saveProduct(isNew ? d : { ...d, id: p.id });
      m.close(); toast(isNew ? 'Produto cadastrado' : 'Alterações salvas');
    });
  }

  // ---------- Pedidos ----------
  function ordersTable(list) {
    if (!list.length) return '<div class="empty"><span>🧾</span><p>Nenhum pedido.</p></div>';
    return `<div class="table-wrap"><table class="table table--click">
      <thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Pagamento</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>${list.map((o) => `<tr data-order="${o.id}"><td><b>${o.id}</b></td><td>${esc(o.customer.name)}</td><td>${dateTime(o.createdAt)}</td><td>${PAY[o.payment] || o.payment}</td><td>${money(o.total)}</td><td>${statusPill(o.status)}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }
  function bindOrderRows(root) {
    root.addEventListener('click', (e) => { const r = e.target.closest('[data-order]'); if (r) orderDetail(r.dataset.order); });
  }

  function pedidos(main) {
    let filter = '';
    main.innerHTML = `
      <header class="admin__head"><div><h1>Pedidos</h1><p class="muted">Acompanhe e atualize o status de cada pedido.</p></div>
        <button class="btn btn--ghost" id="csv">Exportar CSV</button></header>
      <div class="chips" id="stFilter"></div>
      <div class="panel panel--flush" id="oTable"></div>`;
    const draw = () => {
      const all = Store.orders();
      main.querySelector('#stFilter').innerHTML = [['', 'Todos'], ...Object.entries(STATUS)].map(([k, v]) =>
        `<button class="chip ${k === filter ? 'is-active' : ''}" data-st="${k}">${v} <small>${k ? all.filter((o) => o.status === k).length : all.length}</small></button>`).join('');
      main.querySelector('#oTable').innerHTML = ordersTable(all.filter((o) => !filter || o.status === filter));
    };
    main.querySelector('#stFilter').addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (b) { filter = b.dataset.st; draw(); } });
    main.querySelector('#csv').addEventListener('click', () => {
      const rows = [['pedido', 'data', 'cliente', 'email', 'telefone', 'cidade', 'pagamento', 'status', 'total']]
        .concat(Store.orders().map((o) => [o.id, new Date(o.createdAt).toISOString(), o.customer.name, o.customer.email, o.customer.phone, o.customer.city, o.payment, o.status, o.total.toFixed(2)]));
      download('pedidos.csv', rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n'), 'text/csv');
    });
    bindOrderRows(main.querySelector('#oTable'));
    draw();
    main._redraw = draw;
  }

  function orderDetail(id) {
    const o = Store.order(id); if (!o) return;
    const c = o.customer;
    const m = modal(`
      <div class="row-between"><div><h3>${o.id}</h3><p class="muted small">${dateTime(o.createdAt)}</p></div><button class="icon-btn" data-close aria-label="Fechar">✕</button></div>
      <div class="detail">
        <div><h4>Cliente</h4><p><b>${esc(c.name)}</b><br>${esc(c.email)}<br>${esc(c.phone)}</p></div>
        <div><h4>Entrega</h4><p>${esc(c.address)}<br>${esc(c.city)}<br>CEP ${esc(c.cep)}</p></div>
      </div>
      ${o.notes ? `<p class="note">📝 ${esc(o.notes)}</p>` : ''}
      <div class="mini-lines">${o.items.map((it) => `<div class="mini"><span class="mini__q">${it.qty}×</span><span class="grow">${esc(it.name)}</span><span>${money(it.price * it.qty)}</span></div>`).join('')}</div>
      <div class="sum"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
      ${o.discount ? `<div class="sum ok"><span>Descontos${o.coupon ? ' (' + esc(o.coupon) + ')' : ''}</span><span>− ${money(o.discount)}</span></div>` : ''}
      <div class="sum"><span>Frete</span><span>${o.shipping ? money(o.shipping) : 'Grátis'}</span></div>
      <div class="sum sum--total"><span>Total · ${PAY[o.payment]}</span><span>${money(o.total)}</span></div>
      <h4>Status</h4>
      <div class="steps">${Object.entries(STATUS).map(([k, v]) => `<button class="chip ${o.status === k ? 'is-active' : ''}" data-set="${k}">${v}</button>`).join('')}</div>
      ${c.phone ? `<a class="btn btn--ghost btn--block" target="_blank" rel="noopener" href="https://wa.me/55${esc(c.phone.replace(/\D/g, ''))}?text=${encodeURIComponent('Olá ' + c.name.split(' ')[0] + ', sobre o seu pedido ' + o.id + '…')}">Falar com o cliente no WhatsApp</a>` : ''}`);
    m.el.querySelector('.steps').addEventListener('click', (e) => {
      const b = e.target.closest('[data-set]'); if (!b) return;
      Store.setOrderStatus(o.id, b.dataset.set);
      m.el.querySelectorAll('[data-set]').forEach((x) => x.classList.toggle('is-active', x === b));
      toast('Status: ' + STATUS[b.dataset.set]);
    });
  }

  // ---------- Cupons ----------
  function cupons(main) {
    main.innerHTML = `
      <header class="admin__head"><div><h1>Cupons</h1><p class="muted">Descontos aplicáveis no checkout.</p></div></header>
      <form class="panel toolbar" id="cpForm">
        <input class="input" name="code" placeholder="CÓDIGO" required style="text-transform:uppercase">
        <select class="select" name="type"><option value="percent">% de desconto</option><option value="fixed">Valor fixo (R$)</option><option value="shipping">Frete grátis</option></select>
        <input class="input" name="value" type="number" min="0" step="0.01" placeholder="Valor">
        <button class="btn btn--primary">Criar cupom</button>
      </form>
      <div class="panel panel--flush" id="cpList"></div>`;
    const draw = () => {
      const list = Store.coupons();
      main.querySelector('#cpList').innerHTML = list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Código</th><th>Tipo</th><th>Valor</th><th>Ativo</th><th></th></tr></thead>
        <tbody>${list.map((c) => `<tr><td><code>${esc(c.code)}</code></td>
          <td>${{ percent: 'Percentual', fixed: 'Valor fixo', shipping: 'Frete grátis' }[c.type]}</td>
          <td>${c.type === 'percent' ? c.value + '%' : c.type === 'fixed' ? money(c.value) : '—'}</td>
          <td><label class="switch"><input type="checkbox" data-cp="${esc(c.code)}" ${c.active ? 'checked' : ''}><i></i></label></td>
          <td class="actions"><button class="link-btn bad" data-cpdel="${esc(c.code)}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty"><span>🏷️</span><p>Nenhum cupom.</p></div>';
    };
    main.querySelector('#cpForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const code = f.code.value.trim().toUpperCase().replace(/\s+/g, '');
      const value = +f.value.value || 0;
      if (!code) return;
      if (f.type.value !== 'shipping' && value <= 0) return toast('Informe o valor do desconto', 'err');
      if (f.type.value === 'percent' && value > 100) return toast('Percentual máximo é 100', 'err');
      Store.saveCoupon({ code, type: f.type.value, value, active: true });
      f.reset(); toast('Cupom ' + code + ' criado');
    });
    main.querySelector('#cpList').addEventListener('change', (e) => {
      const t = e.target.closest('[data-cp]');
      if (t) { const c = Store.coupons().find((x) => x.code === t.dataset.cp); Store.saveCoupon({ ...c, active: t.checked }); }
    });
    main.querySelector('#cpList').addEventListener('click', async (e) => {
      const d = e.target.closest('[data-cpdel]');
      if (d && await confirmDialog('Excluir o cupom ' + d.dataset.cpdel + '?')) Store.deleteCoupon(d.dataset.cpdel);
    });
    draw();
    main._redraw = draw;
  }

  // ---------- Configurações ----------
  function config(main) {
    const s = Store.settings();
    main.innerHTML = `
      <header class="admin__head"><div><h1>Configurações</h1><p class="muted">Identidade da loja, frete e acesso.</p></div></header>
      <form class="panel" id="cfgForm">
        <h3>Loja</h3>
        <div class="fields">
          <label class="field">Nome da loja<input name="storeName" required value="${esc(s.storeName)}"></label>
          <label class="field">Cor de destaque<input name="accent" type="color" value="${esc(s.accent)}"></label>
          <label class="field span-2">Slogan<input name="tagline" value="${esc(s.tagline)}"></label>
          <label class="field span-2">Título do banner<input name="heroTitle" value="${esc(s.heroTitle)}"></label>
          <label class="field span-2">Texto do banner<textarea name="heroText" rows="2">${esc(s.heroText)}</textarea></label>
        </div>
        <h3>Frete</h3>
        <div class="fields">
          <label class="field">Frete fixo (R$)<input name="shipping" type="number" min="0" step="0.01" value="${s.shipping}"></label>
          <label class="field">Frete grátis a partir de (R$)<input name="freeShippingFrom" type="number" min="0" step="0.01" value="${s.freeShippingFrom}"></label>
        </div>
        <h3>Acesso ao painel</h3>
        <div class="fields">
          <label class="field">Nova senha (deixe vazio para manter)<input name="adminPassword" type="password" autocomplete="new-password"></label>
        </div>
        <div class="row-end"><button class="btn btn--primary">Salvar configurações</button></div>
      </form>
      <div class="panel">
        <h3>Categorias</h3>
        <div class="chips" id="cats">${Store.categories().map((c) => `<span class="chip">${esc(c)} <button class="x" data-rmcat="${esc(c)}" aria-label="Remover">✕</button></span>`).join('')}</div>
        <form class="toolbar" id="catForm"><input class="input" name="cat" placeholder="Nova categoria"><button class="btn btn--ghost">Adicionar</button></form>
      </div>
      <div class="panel">
        <h3>Dados</h3>
        <p class="muted small">Os dados do modelo ficam no navegador. Faça backup ou leve para outra máquina.</p>
        <div class="row wrap">
          <button class="btn btn--ghost" id="exp">Exportar backup (JSON)</button>
          <label class="btn btn--ghost">Importar backup<input type="file" accept="application/json" id="imp" hidden></label>
          <button class="btn btn--danger" id="rst">Restaurar dados de exemplo</button>
        </div>
      </div>`;
    main.querySelector('#cfgForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const patch = { ...f, shipping: +f.shipping || 0, freeShippingFrom: +f.freeShippingFrom || 0 };
      if (!patch.adminPassword) delete patch.adminPassword;
      Store.updateSettings(patch); UI.applyTheme(); toast('Configurações salvas');
    });
    const again = () => render(document.getElementById('app'), 'config');
    main.querySelector('#catForm').addEventListener('submit', (e) => { e.preventDefault(); Store.addCategory(e.target.cat.value); again(); });
    main.querySelector('#cats').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-rmcat]'); if (!b) return;
      const used = Store.products({ includeInactive: true }).some((p) => p.category === b.dataset.rmcat);
      if (used) return toast('Há produtos nessa categoria', 'err');
      Store.removeCategory(b.dataset.rmcat); again();
    });
    main.querySelector('#exp').addEventListener('click', () => download('loja-backup.json', Store.exportJSON(), 'application/json'));
    main.querySelector('#imp').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      file.text().then((t) => { Store.importJSON(t); UI.applyTheme(); again(); toast('Backup importado'); }).catch((err) => toast(err.message, 'err'));
    });
    main.querySelector('#rst').addEventListener('click', async () => {
      if (await confirmDialog('Apagar tudo e voltar aos dados de exemplo?')) { Store.reset(); UI.applyTheme(); again(); toast('Dados restaurados'); }
    });
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  window.Admin = { render };
})();
