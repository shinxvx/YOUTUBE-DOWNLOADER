/*
 * Camada de dados da loja.
 * Tudo fica no localStorage do navegador para o modelo funcionar sem servidor.
 * Para produção, troque as funções load/save por chamadas à sua API
 * (o resto do código só usa os métodos de Store, então a troca é localizada).
 */
(function () {
  const KEY = 'loja-modelo:v1';

  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

  const SEED = {
    settings: {
      storeName: 'Aurora Store',
      tagline: 'Produtos com design, entregues rápido.',
      accent: '#6d5efc',
      shipping: 19.9,
      freeShippingFrom: 299,
      whatsapp: '',
      adminPassword: 'admin123',
      heroTitle: 'Nova coleção de outono',
      heroText: 'Peças selecionadas, frete grátis acima de R$ 299 e troca em até 30 dias.',
    },
    categories: ['Roupas', 'Acessórios', 'Casa', 'Eletrônicos'],
    products: [
      { name: 'Jaqueta Corta-Vento', category: 'Roupas', price: 249.9, comparePrice: 319.9, stock: 14, emoji: '🧥', color: '#8b7cf6', featured: true, description: 'Leve, impermeável e com capuz embutido. Ideal para o dia a dia na cidade.' },
      { name: 'Camiseta Essential', category: 'Roupas', price: 79.9, comparePrice: 0, stock: 40, emoji: '👕', color: '#38bdf8', featured: false, description: 'Algodão penteado 100%, modelagem regular e toque macio.' },
      { name: 'Tênis Runner', category: 'Roupas', price: 399.9, comparePrice: 459.9, stock: 8, emoji: '👟', color: '#f472b6', featured: true, description: 'Amortecimento responsivo e cabedal respirável para treinos e passeios.' },
      { name: 'Óculos Solar Retro', category: 'Acessórios', price: 159.9, comparePrice: 0, stock: 22, emoji: '🕶️', color: '#f59e0b', featured: false, description: 'Lentes com proteção UV400 e armação de acetato.' },
      { name: 'Mochila Urbana', category: 'Acessórios', price: 289.9, comparePrice: 349.9, stock: 11, emoji: '🎒', color: '#10b981', featured: true, description: 'Compartimento para notebook de 15", tecido resistente à água.' },
      { name: 'Relógio Minimal', category: 'Acessórios', price: 529.9, comparePrice: 0, stock: 5, emoji: '⌚', color: '#64748b', featured: false, description: 'Caixa de aço inox, pulseira de couro e resistência a respingos.' },
      { name: 'Luminária de Mesa', category: 'Casa', price: 189.9, comparePrice: 229.9, stock: 17, emoji: '💡', color: '#facc15', featured: false, description: 'LED com 3 temperaturas de cor e regulagem de intensidade.' },
      { name: 'Caneca Cerâmica', category: 'Casa', price: 49.9, comparePrice: 0, stock: 60, emoji: '☕', color: '#fb7185', featured: false, description: 'Feita à mão, 350 ml, pode ir ao micro-ondas.' },
      { name: 'Planta Decorativa', category: 'Casa', price: 99.9, comparePrice: 0, stock: 0, emoji: '🪴', color: '#22c55e', featured: false, description: 'Vaso de cerâmica com planta artificial de alta fidelidade.' },
      { name: 'Fone Bluetooth', category: 'Eletrônicos', price: 349.9, comparePrice: 449.9, stock: 19, emoji: '🎧', color: '#6366f1', featured: true, description: 'Cancelamento de ruído ativo e até 30 h de bateria.' },
      { name: 'Caixa de Som Mini', category: 'Eletrônicos', price: 199.9, comparePrice: 0, stock: 25, emoji: '🔊', color: '#ef4444', featured: false, description: 'Som 360°, resistente à água (IPX7) e 12 h de autonomia.' },
      { name: 'Carregador Turbo', category: 'Eletrônicos', price: 129.9, comparePrice: 0, stock: 33, emoji: '🔌', color: '#14b8a6', featured: false, description: 'USB-C de 30 W com proteção contra superaquecimento.' },
    ],
    coupons: [
      { code: 'BEMVINDO10', type: 'percent', value: 10, active: true },
      { code: 'FRETE0', type: 'shipping', value: 0, active: true },
    ],
    orders: [],
  };

  function seed() {
    const data = JSON.parse(JSON.stringify(SEED));
    const now = Date.now();
    data.products = data.products.map((p, i) => ({
      id: uid('p'), image: '', active: true, createdAt: now - i * 3600e3, sold: 0, ...p,
    }));
    // Alguns pedidos de exemplo para o painel não começar vazio.
    const names = ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Elisa Prado', 'Felipe Nunes'];
    const statuses = ['entregue', 'enviado', 'pago', 'pendente', 'entregue', 'cancelado'];
    names.forEach((name, i) => {
      const picks = [data.products[i % 12], data.products[(i * 5 + 3) % 12]];
      const items = picks.map((p, k) => ({ id: p.id, name: p.name, price: p.price, qty: k + 1 }));
      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      const shipping = subtotal >= data.settings.freeShippingFrom ? 0 : data.settings.shipping;
      data.orders.push({
        id: 'PED-' + (1001 + i),
        createdAt: now - (i * 1.7 + 0.3) * 86400e3,
        customer: { name, email: name.split(' ')[0].toLowerCase() + '@exemplo.com', phone: '(11) 9' + (8000 + i * 37) + '-' + (1000 + i * 91), cep: '01000-000', address: 'Rua Exemplo, ' + (100 + i * 12), city: 'São Paulo - SP' },
        items, subtotal, shipping, discount: 0, total: subtotal + shipping,
        payment: ['pix', 'cartao', 'boleto'][i % 3], status: statuses[i], notes: '',
      });
      if (statuses[i] !== 'cancelado') items.forEach((it) => { const p = data.products.find((x) => x.id === it.id); p.sold += it.qty; });
    });
    return data;
  }

  let db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !db.products) { db = seed(); save(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* modo privado: segue só em memória */ }
    listeners.forEach((fn) => fn());
  }
  const listeners = new Set();

  // ---------- Carrinho (separado do banco, por visitante) ----------
  const CART_KEY = 'loja-modelo:cart';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    listeners.forEach((fn) => fn());
  }

  load();

  window.Store = {
    uid,
    onChange: (fn) => listeners.add(fn),

    // Configurações
    settings: () => db.settings,
    updateSettings(patch) { Object.assign(db.settings, patch); save(); },

    // Categorias
    categories: () => db.categories.slice(),
    addCategory(name) { name = name.trim(); if (name && !db.categories.includes(name)) { db.categories.push(name); save(); } },
    removeCategory(name) { db.categories = db.categories.filter((c) => c !== name); save(); },

    // Produtos
    products: ({ includeInactive = false } = {}) => db.products.filter((p) => includeInactive || p.active),
    product: (id) => db.products.find((p) => p.id === id),
    saveProduct(data) {
      if (data.id) {
        const p = db.products.find((x) => x.id === data.id);
        Object.assign(p, data);
      } else {
        db.products.unshift({ id: uid('p'), createdAt: Date.now(), sold: 0, active: true, image: '', emoji: '📦', color: db.settings.accent, ...data });
      }
      save();
    },
    deleteProduct(id) { db.products = db.products.filter((p) => p.id !== id); save(); },

    // Cupons
    coupons: () => db.coupons,
    findCoupon: (code) => db.coupons.find((c) => c.active && c.code.toUpperCase() === String(code).trim().toUpperCase()),
    saveCoupon(c) {
      const i = db.coupons.findIndex((x) => x.code === c.code);
      if (i >= 0) db.coupons[i] = c; else db.coupons.push(c);
      save();
    },
    deleteCoupon(code) { db.coupons = db.coupons.filter((c) => c.code !== code); save(); },

    // Pedidos
    orders: () => db.orders.slice().sort((a, b) => b.createdAt - a.createdAt),
    order: (id) => db.orders.find((o) => o.id === id),
    setOrderStatus(id, status) {
      const o = db.orders.find((x) => x.id === id);
      if (!o) return;
      // Cancelar devolve o estoque; reabrir um cancelado retira de novo.
      if (status === 'cancelado' && o.status !== 'cancelado') moveStock(o, +1);
      if (status !== 'cancelado' && o.status === 'cancelado') moveStock(o, -1);
      o.status = status; save();
    },

    // Carrinho
    cart: () => cart.map((c) => ({ ...c, product: db.products.find((p) => p.id === c.id) })).filter((c) => c.product && c.product.active),
    addToCart(id, qty = 1) {
      const p = db.products.find((x) => x.id === id);
      if (!p || p.stock <= 0) return false;
      const line = cart.find((c) => c.id === id);
      const next = Math.min(p.stock, (line ? line.qty : 0) + qty);
      if (line) line.qty = next; else cart.push({ id, qty: next });
      saveCart(); return true;
    },
    setQty(id, qty) {
      const p = db.products.find((x) => x.id === id);
      const line = cart.find((c) => c.id === id);
      if (!line) return;
      if (qty <= 0) cart = cart.filter((c) => c.id !== id);
      else line.qty = Math.min(qty, p ? p.stock : qty);
      saveCart();
    },
    clearCart() { cart = []; saveCart(); },

    /** Calcula totais do carrinho com um cupom opcional. */
    totals(couponCode) {
      const lines = this.cart();
      const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
      const coupon = couponCode ? this.findCoupon(couponCode) : null;
      let shipping = lines.length === 0 || subtotal >= db.settings.freeShippingFrom ? 0 : db.settings.shipping;
      let discount = 0;
      if (coupon) {
        if (coupon.type === 'percent') discount = subtotal * coupon.value / 100;
        else if (coupon.type === 'fixed') discount = Math.min(subtotal, coupon.value);
        else if (coupon.type === 'shipping') shipping = 0;
      }
      return { lines, subtotal, shipping, discount, total: Math.max(0, subtotal - discount + shipping), coupon };
    },

    /** Fecha a compra: valida estoque, grava o pedido, baixa estoque e limpa o carrinho. */
    checkout(customer, payment, couponCode) {
      const t = this.totals(couponCode);
      if (!t.lines.length) throw new Error('Carrinho vazio.');
      for (const l of t.lines) {
        if (l.qty > l.product.stock) throw new Error('Estoque insuficiente para ' + l.product.name + '.');
      }
      // Pix tem 5% de desconto sobre o valor dos produtos (já com cupom).
      const pixOff = payment === 'pix' ? (t.subtotal - t.discount) * 0.05 : 0;
      const next = db.orders.reduce((m, o) => Math.max(m, parseInt(o.id.split('-')[1], 10) || 0), 1000) + 1;
      const order = {
        id: 'PED-' + next,
        createdAt: Date.now(),
        customer,
        items: t.lines.map((l) => ({ id: l.id, name: l.product.name, price: l.product.price, qty: l.qty })),
        subtotal: t.subtotal, shipping: t.shipping, discount: t.discount + pixOff, total: t.total - pixOff,
        coupon: t.coupon ? t.coupon.code : '',
        payment, status: 'pendente', notes: customer.notes || '',
      };
      db.orders.push(order);
      moveStock(order, -1);
      cart = [];
      try { localStorage.setItem(CART_KEY, '[]'); } catch (e) {}
      save();
      return order;
    },

    // Utilidades do painel
    exportJSON: () => JSON.stringify(db, null, 2),
    importJSON(text) {
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.products) || !data.settings) throw new Error('Arquivo inválido.');
      db = data; save();
    },
    reset() { db = seed(); cart = []; saveCart(); save(); },
  };

  function moveStock(order, sign) {
    order.items.forEach((it) => {
      const p = db.products.find((x) => x.id === it.id);
      if (!p) return;
      p.stock = Math.max(0, p.stock + sign * it.qty);
      p.sold = Math.max(0, (p.sold || 0) - sign * it.qty);
    });
  }
})();
