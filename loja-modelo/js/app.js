/* Roteador por hash: #/ · #/produto/ID · #/checkout · #/pedido/ID · #/admin/ABA */
(function () {
  const app = document.getElementById('app');

  function route() {
    const [, page = '', arg] = location.hash.replace(/^#/, '').split('/');
    if (location.hash && !location.hash.startsWith('#/')) return; // âncoras internas (#catalogo)
    app._refresh = null;
    document.body.classList.toggle('is-admin', page === 'admin');
    if (page === 'produto') Shop.productPage(app, arg);
    else if (page === 'checkout') Shop.checkoutPage(app);
    else if (page === 'pedido') Shop.successPage(app, arg);
    else if (page === 'admin') Admin.render(app, arg);
    else Shop.home(app);
    window.scrollTo({ top: 0 });
  }

  // Quando os dados mudam, atualiza só o que precisa (sem perder o que está sendo digitado).
  Store.onChange(() => {
    Shop.renderCart();
    if (app._refresh) return app._refresh();
    const page = location.hash.split('/')[1] || '';
    if (page === 'admin') {
      const main = document.getElementById('adminMain');
      if (main && main._redraw) main._redraw();
      else if (main && (location.hash.split('/')[2] || 'dashboard') === 'dashboard') Admin.render(app, 'dashboard');
    } else if (page === '') Shop.renderGrid();
  });

  UI.initThemeToggle();
  UI.applyTheme();
  Shop.init();
  document.getElementById('year').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', route);
  route();
})();
