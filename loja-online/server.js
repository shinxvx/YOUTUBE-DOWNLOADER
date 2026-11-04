// Loja Online Speed — loja virtual com estoque, frete dos Correios e Pix/cartão.
// Hoje roda em MODO DEMONSTRAÇÃO (DEMO=1): pagamentos e frete são simulados.
'use strict';
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const QRCode = require('qrcode');
const { arte } = require('./arte');
const { semear } = require('./seed');

const PORT = Number(process.env.PORT || 3000);
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const DEMO = process.env.DEMO !== '0';
const FOTOS = path.join(DATA, 'fotos');
fs.mkdirSync(FOTOS, { recursive: true });

const db = new DatabaseSync(path.join(DATA, 'loja.db'));
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT);
CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE, nome TEXT NOT NULL, categoria TEXT, descricao TEXT,
  preco REAL NOT NULL, preco_de REAL, estoque INTEGER NOT NULL DEFAULT 0, peso_g INTEGER NOT NULL DEFAULT 200,
  foto TEXT, arte TEXT, destaque INTEGER DEFAULT 0, ativo INTEGER DEFAULT 1, criado TEXT DEFAULT (datetime('now','localtime')));
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY, codigo TEXT UNIQUE, chave TEXT, criado TEXT DEFAULT (datetime('now','localtime')),
  status TEXT NOT NULL, nome TEXT, email TEXT, telefone TEXT, cpf TEXT,
  cep TEXT, rua TEXT, numero TEXT, complemento TEXT, bairro TEXT, cidade TEXT, uf TEXT,
  frete_servico TEXT, frete_valor REAL, frete_prazo INTEGER, subtotal REAL, total REAL,
  pagamento TEXT, parcelas INTEGER DEFAULT 1, cartao_final TEXT, pago_em TEXT, expira_em TEXT,
  rastreio TEXT, enviado_em TEXT, cancelado_em TEXT, obs TEXT);
CREATE TABLE IF NOT EXISTS itens (pedido_id INTEGER, produto_id INTEGER, nome TEXT, preco REAL, qtd INTEGER);
CREATE TABLE IF NOT EXISTS sessoes (token TEXT PRIMARY KEY, criado TEXT DEFAULT (datetime('now','localtime')));
`);
const all = (s, ...p) => db.prepare(s).all(...p);
const get = (s, ...p) => db.prepare(s).get(...p);
const run = (s, ...p) => db.prepare(s).run(...p);
function tx(fn) { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } }

const PADRAO = {
  loja_nome: 'Dehleec', loja_frase: 'Semijoias com garantia de 1 ano, perfumes e beleza com sofisticação',
  instagram: 'dehleecespacobeleza', whatsapp: '', email: '',
  cep_origem: '01310100', frete_gratis_acima: '299', parcelas_max: '6', parcela_minima: '30', pix_minutos: '30',
  admin_email: 'admin@demo.com', admin_senha_hash: ''
};
function cfg(k) { const r = get('SELECT valor FROM config WHERE chave=?', k); return r ? r.valor : PADRAO[k]; }
function setCfg(k, v) { run('INSERT INTO config(chave,valor) VALUES(?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor', k, String(v)); }
function hashSenha(s) { const sal = crypto.randomBytes(16).toString('hex'); return sal + ':' + crypto.scryptSync(s, sal, 32).toString('hex'); }
function confere(s, h) { if (!h) return false; const [sal, x] = h.split(':'); const y = crypto.scryptSync(s, sal, 32).toString('hex'); return crypto.timingSafeEqual(Buffer.from(x, 'hex'), Buffer.from(y, 'hex')); }

function preparar() {
  if (!get('SELECT 1 FROM produtos LIMIT 1')) semear({ run, tx });
  if (!cfg('admin_senha_hash')) setCfg('admin_senha_hash', hashSenha(process.env.ADMIN_SENHA || 'demo1234'));
  if (process.env.ADMIN_EMAIL) setCfg('admin_email', process.env.ADMIN_EMAIL);
}
preparar();

// Demonstração volta ao estado inicial todo dia às 04:00 (e pelo botão no painel).
function resetDemo() {
  tx(() => { for (const t of ['produtos', 'pedidos', 'itens', 'config']) run('DELETE FROM ' + t); });
  for (const f of fs.readdirSync(FOTOS)) fs.rmSync(path.join(FOTOS, f), { force: true });
  preparar();
}

const brl = n => Math.round(n * 100) / 100;
const agora = () => new Date();
const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 19).replace('T', ' '); };

// ---------- frete (tabela de demonstração no formato dos Correios: PAC e SEDEX) ----------
const FAIXAS = [ // prefixo de CEP (5 dígitos) -> UF
  [1000, 19999, 'SP'], [20000, 28999, 'RJ'], [29000, 29999, 'ES'], [30000, 39999, 'MG'], [40000, 48999, 'BA'],
  [49000, 49999, 'SE'], [50000, 56999, 'PE'], [57000, 57999, 'AL'], [58000, 58999, 'PB'], [59000, 59999, 'RN'],
  [60000, 63999, 'CE'], [64000, 64999, 'PI'], [65000, 65999, 'MA'], [66000, 68899, 'PA'], [68900, 68999, 'AP'],
  [69000, 69299, 'AM'], [69300, 69399, 'RR'], [69400, 69899, 'AM'], [69900, 69999, 'AC'], [70000, 73699, 'DF'],
  [73700, 76799, 'GO'], [76800, 76999, 'RO'], [77000, 77999, 'TO'], [78000, 78899, 'MT'], [79000, 79999, 'MS'],
  [80000, 87999, 'PR'], [88000, 89999, 'SC'], [90000, 99999, 'RS']
];
const REGIAO = { SP: 'SE', RJ: 'SE', ES: 'SE', MG: 'SE', PR: 'S', SC: 'S', RS: 'S', DF: 'CO', GO: 'CO', MT: 'CO', MS: 'CO',
  BA: 'NE', SE: 'NE', PE: 'NE', AL: 'NE', PB: 'NE', RN: 'NE', CE: 'NE', PI: 'NE', MA: 'NE',
  PA: 'N', AP: 'N', AM: 'N', RR: 'N', AC: 'N', RO: 'N', TO: 'N' };
function ufDoCep(cep) { const p = Number(String(cep).slice(0, 5)); const f = FAIXAS.find(([a, b]) => p >= a && p <= b); return f ? f[2] : null; }
function zona(o, d) {
  if (o === d) return 0; const ro = REGIAO[o], rd = REGIAO[d];
  if (ro === rd) return 1; const perto = { SE: ['S', 'CO'], S: ['SE'], CO: ['SE', 'N'], NE: ['N'], N: ['NE', 'CO'] };
  return (perto[ro] || []).includes(rd) ? 2 : 3;
}
function calcFrete(cepDestino, pesoG, subtotal) {
  const d = ufDoCep(cepDestino), o = ufDoCep(cfg('cep_origem')) || 'SP';
  if (!d) return null;
  const z = zona(o, d), kg = Math.max(0, Math.ceil((pesoG + 150 - 500) / 500));
  const pac = brl([18.9, 26.9, 33.9, 41.9][z] + kg * [2.5, 3.5, 4.5, 6][z]);
  const sedex = brl([23.9, 36.9, 52.9, 68.9][z] + kg * [4, 6, 8, 11][z]);
  const gratis = subtotal >= Number(cfg('frete_gratis_acima') || 1e9);
  return { uf: d, opcoes: [
    { servico: 'PAC', nome: 'Correios PAC', valor: gratis ? 0 : pac, valor_cheio: pac, prazo: [3, 5, 7, 10][z] },
    { servico: 'SEDEX', nome: 'Correios SEDEX', valor: sedex, valor_cheio: sedex, prazo: [1, 2, 3, 5][z] }
  ], gratis };
}
async function buscaEndereco(cep) {
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(3500) });
    const j = await r.json(); if (j.erro) return null;
    return { rua: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', uf: j.uf || '' };
  } catch { return null; }
}

// ---------- produtos ----------
const pub = p => ({ id: p.id, slug: p.slug, nome: p.nome, categoria: p.categoria, descricao: p.descricao,
  preco: p.preco, preco_de: p.preco_de || null, esgotado: p.estoque <= 0, destaque: !!p.destaque,
  img: p.foto ? '/f/' + p.foto : '/arte/' + p.id + '.svg' });
const CATS = ['Semijoias', 'Perfumes', 'Maquiagem', 'Skincare'];

// ---------- pedidos ----------
function devolverEstoque(pedidoId) {
  for (const i of all('SELECT produto_id, qtd FROM itens WHERE pedido_id=?', pedidoId))
    run('UPDATE produtos SET estoque=estoque+? WHERE id=?', i.qtd, i.produto_id);
}
function expirarPix() {
  const vencidos = all("SELECT id FROM pedidos WHERE status='aguardando' AND expira_em < ?", iso(agora()));
  for (const p of vencidos) tx(() => {
    devolverEstoque(p.id);
    run("UPDATE pedidos SET status='cancelado', cancelado_em=?, obs='Pix não pago no prazo' WHERE id=?", iso(agora()), p.id);
  });
}
setInterval(expirarPix, 60 * 1000).unref();
let ultimoReset = new Date().toDateString();
if (DEMO) setInterval(() => { const d = new Date(); if (d.getHours() === 4 && d.toDateString() !== ultimoReset) { ultimoReset = d.toDateString(); resetDemo(); } }, 5 * 60 * 1000).unref();

function luhn(n) { let s = 0, dbl = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; } s += d; dbl = !dbl; } return s % 10 === 0; }
function bandeira(n) { if (/^4/.test(n)) return 'Visa'; if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard'; if (/^3[47]/.test(n)) return 'Amex';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return 'Elo'; if (/^(606282|3841)/.test(n)) return 'Hipercard'; return 'Cartão'; }
function parcelasPermitidas(total) { const max = Number(cfg('parcelas_max')), min = Number(cfg('parcela_minima')); return Math.max(1, Math.min(max, Math.floor(total / min) || 1)); }
const pixTexto = p => `PIX DE DEMONSTRACAO - NAO PAGUE - ${cfg('loja_nome')} - pedido ${p.codigo} - R$ ${p.total.toFixed(2)}`;

function pedidoCompleto(p, admin) {
  const itens = all('SELECT produto_id, nome, preco, qtd FROM itens WHERE pedido_id=?', p.id)
    .map(i => ({ ...i, img: (get('SELECT foto FROM produtos WHERE id=?', i.produto_id) || {}).foto ? '/f/' + get('SELECT foto FROM produtos WHERE id=?', i.produto_id).foto : '/arte/' + i.produto_id + '.svg' }));
  const base = { codigo: p.codigo, criado: p.criado, status: p.status, itens, subtotal: p.subtotal, frete_servico: p.frete_servico,
    frete_valor: p.frete_valor, frete_prazo: p.frete_prazo, total: p.total, pagamento: p.pagamento, parcelas: p.parcelas,
    cartao_final: p.cartao_final, pago_em: p.pago_em, expira_em: p.expira_em, rastreio: p.rastreio, enviado_em: p.enviado_em,
    nome: p.nome, cidade: p.cidade, uf: p.uf, obs: p.obs };
  if (!admin) return base;
  return { ...base, id: p.id, email: p.email, telefone: p.telefone, cpf: p.cpf, cep: p.cep, rua: p.rua, numero: p.numero,
    complemento: p.complemento, bairro: p.bairro, cancelado_em: p.cancelado_em };
}

// ---------- app ----------
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'" });
  next();
});
app.use(express.json({ limit: '8mb' }));
const erro = (res, msg, cod = 400) => res.status(cod).json({ erro: msg });

app.get('/api/loja', (req, res) => {
  const cats = CATS.filter(c => get('SELECT 1 FROM produtos WHERE ativo=1 AND categoria=?', c));
  res.json({ nome: cfg('loja_nome'), frase: cfg('loja_frase'), instagram: cfg('instagram'), whatsapp: cfg('whatsapp'),
    email: cfg('email'), frete_gratis_acima: Number(cfg('frete_gratis_acima')), parcelas_max: Number(cfg('parcelas_max')),
    parcela_minima: Number(cfg('parcela_minima')), pix_minutos: Number(cfg('pix_minutos')), demo: DEMO, categorias: cats });
});
app.get('/api/produtos', (req, res) => {
  let s = 'SELECT * FROM produtos WHERE ativo=1', p = [];
  if (req.query.cat) { s += ' AND categoria=?'; p.push(String(req.query.cat)); }
  if (req.query.q) { s += ' AND (nome LIKE ? OR descricao LIKE ? OR categoria LIKE ?)'; const q = '%' + String(req.query.q).slice(0, 60) + '%'; p.push(q, q, q); }
  s += " ORDER BY (estoque<=0), CASE categoria WHEN 'Semijoias' THEN 0 WHEN 'Perfumes' THEN 1 WHEN 'Maquiagem' THEN 2 ELSE 3 END, destaque DESC, id";
  res.json(all(s, ...p).map(pub));
});
app.get('/api/produto/:slug', (req, res) => {
  const p = get('SELECT * FROM produtos WHERE slug=? AND ativo=1', req.params.slug);
  if (!p) return erro(res, 'Produto não encontrado', 404);
  const rel = all('SELECT * FROM produtos WHERE ativo=1 AND categoria=? AND id<>? AND estoque>0 ORDER BY destaque DESC, id DESC LIMIT 4', p.categoria, p.id);
  res.json({ ...pub(p), relacionados: rel.map(pub) });
});
app.get('/arte/:id.svg', (req, res) => {
  const p = get('SELECT id, nome, arte FROM produtos WHERE id=?', Number(req.params.id));
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(arte(p ? p.arte : 'perfume', p ? p.id : 1));
});
app.use('/f', express.static(FOTOS, { maxAge: '7d', fallthrough: false }));

// Confere a sacola: preço do sistema e quantidade que dá para vender (sem dizer o estoque).
function conferirSacola(itens) {
  const ok = [], avisos = [];
  for (const it of (Array.isArray(itens) ? itens : []).slice(0, 50)) {
    const p = get('SELECT * FROM produtos WHERE id=? AND ativo=1', Number(it.id)); const q = Math.max(1, Math.min(20, Number(it.qtd) || 1));
    if (!p) { avisos.push('Um produto saiu da loja e foi retirado da sacola.'); continue; }
    if (p.estoque <= 0) { avisos.push(`${p.nome} esgotou e foi retirado da sacola.`); continue; }
    const qtd = Math.min(q, p.estoque);
    if (qtd < q) avisos.push(`${p.nome}: não temos essa quantidade, ajustamos para ${qtd}.`);
    ok.push({ ...pub(p), qtd, peso_g: p.peso_g });
  }
  return { itens: ok, avisos, subtotal: brl(ok.reduce((s, i) => s + i.preco * i.qtd, 0)), peso: ok.reduce((s, i) => s + i.peso_g * i.qtd, 0) };
}
app.post('/api/sacola', (req, res) => { const r = conferirSacola(req.body.itens); res.json({ itens: r.itens.map(({ peso_g, ...i }) => i), avisos: r.avisos, subtotal: r.subtotal }); });

app.post('/api/frete', async (req, res) => {
  const cep = String(req.body.cep || '').replace(/\D/g, '');
  if (cep.length !== 8) return erro(res, 'CEP inválido');
  const s = conferirSacola(req.body.itens);
  const f = calcFrete(cep, s.peso, s.subtotal);
  if (!f) return erro(res, 'Não encontramos esse CEP');
  const endereco = await buscaEndereco(cep);
  res.json({ ...f, endereco: endereco || { rua: '', bairro: '', cidade: '', uf: f.uf }, parcelas_max: parcelasPermitidas(s.subtotal + f.opcoes[0].valor) });
});

app.post('/api/pedido', async (req, res) => {
  const b = req.body || {}, c = b.cliente || {}, e = b.endereco || {};
  const limpo = (v, n = 120) => String(v || '').trim().slice(0, n);
  const cep = limpo(e.cep).replace(/\D/g, ''), cpf = limpo(c.cpf).replace(/\D/g, ''), tel = limpo(c.telefone).replace(/\D/g, '');
  if (limpo(c.nome).length < 3) return erro(res, 'Informe seu nome completo');
  if (!/^\S+@\S+\.\S+$/.test(limpo(c.email))) return erro(res, 'E-mail inválido');
  if (tel.length < 10) return erro(res, 'Informe o telefone com DDD');
  if (cpf.length !== 11) return erro(res, 'CPF inválido');
  if (cep.length !== 8 || !limpo(e.rua) || !limpo(e.numero, 20) || !limpo(e.cidade) || !limpo(e.uf, 2)) return erro(res, 'Complete o endereço de entrega');
  if (!['pix', 'credito', 'debito'].includes(b.pagamento)) return erro(res, 'Escolha a forma de pagamento');
  let cartao = null;
  if (b.pagamento !== 'pix') {
    const n = String((b.cartao || {}).numero || '').replace(/\D/g, ''), val = String((b.cartao || {}).validade || ''), cvv = String((b.cartao || {}).cvv || '');
    if (n.length < 13 || !luhn(n)) return erro(res, 'Número do cartão inválido');
    const m = val.match(/^(\d{2})\/(\d{2})$/); if (!m || +m[1] < 1 || +m[1] > 12) return erro(res, 'Validade inválida (MM/AA)');
    const fim = new Date(2000 + +m[2], +m[1], 0); if (fim < new Date()) return erro(res, 'Cartão vencido');
    if (!/^\d{3,4}$/.test(cvv)) return erro(res, 'Código de segurança inválido');
    if (!limpo((b.cartao || {}).nome)) return erro(res, 'Nome impresso no cartão');
    cartao = { final: n.slice(-4), bandeira: bandeira(n), recusado: DEMO && n.endsWith('0002') };
  }
  try {
    const r = tx(() => {
      const s = conferirSacola(b.itens);
      if (!s.itens.length) throw new Error('Sua sacola está vazia');
      const pedidoQ = new Map((b.itens || []).map(i => [Number(i.id), Number(i.qtd)]));
      for (const i of s.itens) if (i.qtd < (pedidoQ.get(i.id) || 0)) throw new Error(s.avisos[0] || 'Quantidade indisponível');
      if (s.avisos.length) throw new Error(s.avisos[0]);
      const f = calcFrete(cep, s.peso, s.subtotal); if (!f) throw new Error('CEP inválido');
      const op = f.opcoes.find(o => o.servico === b.frete) || f.opcoes[0];
      const total = brl(s.subtotal + op.valor);
      const parcelas = b.pagamento === 'credito' ? Math.max(1, Math.min(parcelasPermitidas(total), Number(b.parcelas) || 1)) : 1;
      if (cartao && cartao.recusado) throw Object.assign(new Error('Pagamento recusado pelo banco. Tente outro cartão.'), { recusa: true });
      const codigo = String(Date.now()).slice(-6) + crypto.randomInt(10, 99), chave = crypto.randomBytes(12).toString('hex');
      const pago = b.pagamento !== 'pix';
      const exp = new Date(Date.now() + Number(cfg('pix_minutos')) * 60000);
      const ins = run(`INSERT INTO pedidos(codigo,chave,status,nome,email,telefone,cpf,cep,rua,numero,complemento,bairro,cidade,uf,
        frete_servico,frete_valor,frete_prazo,subtotal,total,pagamento,parcelas,cartao_final,pago_em,expira_em)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        codigo, chave, pago ? 'pago' : 'aguardando', limpo(c.nome), limpo(c.email), tel, cpf, cep, limpo(e.rua), limpo(e.numero, 20),
        limpo(e.complemento), limpo(e.bairro), limpo(e.cidade), limpo(e.uf, 2).toUpperCase(), op.servico, op.valor, op.prazo,
        s.subtotal, total, b.pagamento, parcelas, cartao ? cartao.bandeira + ' final ' + cartao.final : null,
        pago ? iso(agora()) : null, pago ? null : iso(exp));
      for (const i of s.itens) {
        run('INSERT INTO itens(pedido_id,produto_id,nome,preco,qtd) VALUES(?,?,?,?,?)', ins.lastInsertRowid, i.id, i.nome, i.preco, i.qtd);
        const u = run('UPDATE produtos SET estoque=estoque-? WHERE id=? AND estoque>=?', i.qtd, i.id, i.qtd);
        if (!u.changes) throw new Error(`${i.nome} acabou de esgotar`);
      }
      return { codigo, chave };
    });
    res.json(r);
  } catch (err) { erro(res, err.message, err.recusa ? 402 : 409); }
});
function pedidoDoCliente(req) { const p = get('SELECT * FROM pedidos WHERE codigo=?', req.params.codigo); return p && p.chave === String(req.query.k || req.body?.k || '') ? p : null; }
app.get('/api/pedido/:codigo', async (req, res) => {
  expirarPix();
  const p = pedidoDoCliente(req); if (!p) return erro(res, 'Pedido não encontrado', 404);
  const o = pedidoCompleto(p, false);
  if (p.status === 'aguardando') { o.pix = pixTexto(p); o.pix_qr = await QRCode.toDataURL(o.pix, { margin: 1, width: 260 }); }
  res.json(o);
});
app.post('/api/pedido/:codigo/simular-pix', (req, res) => {
  if (!DEMO) return erro(res, 'Indisponível', 404);
  const p = pedidoDoCliente(req); if (!p) return erro(res, 'Pedido não encontrado', 404);
  if (p.status !== 'aguardando') return erro(res, 'Este pedido não está aguardando pagamento');
  run("UPDATE pedidos SET status='pago', pago_em=? WHERE id=?", iso(agora()), p.id); res.json({ ok: true });
});

// ---------- painel da loja ----------
function cookie(req, n) { const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + n + '=([^;]+)')); return m ? m[1] : null; }
function admin(req, res, next) { const t = cookie(req, 'ls_adm'); if (t && get('SELECT 1 FROM sessoes WHERE token=?', t)) return next(); erro(res, 'Entre de novo', 401); }
const tentativas = new Map();
app.post('/api/admin/login', (req, res) => {
  const ip = req.headers['cf-connecting-ip'] || req.ip, t = tentativas.get(ip) || { n: 0, ate: 0 };
  if (t.ate > Date.now()) return erro(res, 'Muitas tentativas. Espere alguns minutos.', 429);
  const ok = String(req.body.email || '').trim().toLowerCase() === cfg('admin_email').toLowerCase() && confere(String(req.body.senha || ''), cfg('admin_senha_hash'));
  if (!ok) { t.n++; if (t.n >= 6) { t.ate = Date.now() + 10 * 60000; t.n = 0; } tentativas.set(ip, t); return erro(res, 'E-mail ou senha incorretos', 401); }
  tentativas.delete(ip);
  const tok = crypto.randomBytes(24).toString('hex'); run('INSERT INTO sessoes(token) VALUES(?)', tok);
  res.set('Set-Cookie', `ls_adm=${tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`).json({ ok: true });
});
app.get('/api/admin/demo', (req, res) => res.json(DEMO ? { email: cfg('admin_email'), senha: 'demo1234' } : {}));
app.post('/api/admin/logout', (req, res) => { const t = cookie(req, 'ls_adm'); if (t) run('DELETE FROM sessoes WHERE token=?', t); res.set('Set-Cookie', 'ls_adm=; Path=/; Max-Age=0').json({ ok: true }); });
app.use('/api/admin', admin);
app.get('/api/admin/eu', (req, res) => res.json({ ok: true, demo: DEMO, loja: cfg('loja_nome') }));
app.get('/api/admin/resumo', (req, res) => {
  expirarPix();
  const hoje = iso(agora()).slice(0, 10), mes = hoje.slice(0, 7);
  const soma = w => get(`SELECT COUNT(*) n, COALESCE(SUM(total),0) v FROM pedidos WHERE status IN ('pago','enviado','entregue') AND ${w}`);
  const dias = [];
  for (let i = 13; i >= 0; i--) { const d = iso(new Date(Date.now() - i * 864e5)).slice(0, 10); dias.push({ dia: d, ...soma(`substr(pago_em,1,10)='${d}'`) }); }
  res.json({ hoje: soma(`substr(pago_em,1,10)='${hoje}'`), mes: soma(`substr(pago_em,1,7)='${mes}'`),
    a_enviar: get("SELECT COUNT(*) n FROM pedidos WHERE status='pago'").n, aguardando: get("SELECT COUNT(*) n FROM pedidos WHERE status='aguardando'").n,
    estoque_baixo: all('SELECT id, nome, estoque FROM produtos WHERE ativo=1 AND estoque<=2 ORDER BY estoque, nome LIMIT 12'),
    mais_vendidos: all("SELECT i.nome, SUM(i.qtd) q FROM itens i JOIN pedidos p ON p.id=i.pedido_id WHERE p.status IN ('pago','enviado','entregue') GROUP BY i.produto_id ORDER BY q DESC LIMIT 5"),
    dias });
});
app.get('/api/admin/pedidos', (req, res) => {
  expirarPix();
  const st = String(req.query.status || ''); const w = st ? 'WHERE status=?' : ''; const p = st ? [st] : [];
  res.json(all(`SELECT * FROM pedidos ${w} ORDER BY id DESC LIMIT 300`, ...p).map(x => pedidoCompleto(x, true)));
});
app.post('/api/admin/pedido/:id/:acao', (req, res) => {
  const p = get('SELECT * FROM pedidos WHERE id=?', Number(req.params.id)); if (!p) return erro(res, 'Pedido não encontrado', 404);
  const a = req.params.acao;
  if (a === 'enviar') { if (p.status !== 'pago') return erro(res, 'Só dá para enviar pedido pago');
    const r = String(req.body.rastreio || '').trim().toUpperCase(); if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(r)) return erro(res, 'Código de rastreio dos Correios no formato AA123456789BR');
    run("UPDATE pedidos SET status='enviado', rastreio=?, enviado_em=? WHERE id=?", r, iso(agora()), p.id); }
  else if (a === 'entregue') { if (p.status !== 'enviado') return erro(res, 'O pedido ainda não foi enviado'); run("UPDATE pedidos SET status='entregue' WHERE id=?", p.id); }
  else if (a === 'pago') { if (p.status !== 'aguardando') return erro(res, 'Este pedido não está aguardando'); run("UPDATE pedidos SET status='pago', pago_em=? WHERE id=?", iso(agora()), p.id); }
  else if (a === 'cancelar') { if (!['aguardando', 'pago'].includes(p.status)) return erro(res, 'Pedido já enviado não pode ser cancelado aqui');
    tx(() => { devolverEstoque(p.id); run("UPDATE pedidos SET status='cancelado', cancelado_em=?, obs=? WHERE id=?", iso(agora()), p.status === 'pago' ? 'Cancelado pela loja (estornar o pagamento)' : 'Cancelado pela loja', p.id); }); }
  else return erro(res, 'Ação inválida');
  res.json(pedidoCompleto(get('SELECT * FROM pedidos WHERE id=?', p.id), true));
});
app.get('/api/admin/produtos', (req, res) => res.json(all('SELECT * FROM produtos ORDER BY ativo DESC, categoria, nome').map(p => ({ ...p, img: p.foto ? '/f/' + p.foto : '/arte/' + p.id + '.svg' }))));
function slugify(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'produto'; }
app.post('/api/admin/produto', (req, res) => {
  const b = req.body || {}, id = Number(b.id) || 0;
  const nome = String(b.nome || '').trim().slice(0, 100); if (nome.length < 2) return erro(res, 'Nome do produto');
  const preco = Number(String(b.preco).replace(',', '.')); if (!(preco > 0)) return erro(res, 'Preço inválido');
  const de = b.preco_de ? Number(String(b.preco_de).replace(',', '.')) : null; if (de !== null && !(de > preco)) return erro(res, 'O preço "de" precisa ser maior que o preço');
  const est = Math.max(0, Math.floor(Number(b.estoque) || 0)), peso = Math.max(10, Math.floor(Number(b.peso_g) || 200));
  const cat = CATS.includes(b.categoria) ? b.categoria : CATS[0];
  let foto;
  if (b.foto_base64) {
    const m = String(b.foto_base64).match(/^data:image\/(jpeg|png|webp);base64,(.+)$/); if (!m) return erro(res, 'Foto precisa ser JPG, PNG ou WEBP');
    const buf = Buffer.from(m[2], 'base64'); if (buf.length > 5e6) return erro(res, 'Foto muito grande (até 5 MB)');
    foto = crypto.randomBytes(8).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]); fs.writeFileSync(path.join(FOTOS, foto), buf);
  }
  if (id) {
    const ant = get('SELECT * FROM produtos WHERE id=?', id); if (!ant) return erro(res, 'Produto não encontrado', 404);
    run('UPDATE produtos SET nome=?, categoria=?, descricao=?, preco=?, preco_de=?, estoque=?, peso_g=?, destaque=?, ativo=?, foto=? WHERE id=?',
      nome, cat, String(b.descricao || '').slice(0, 2000), preco, de, est, peso, b.destaque ? 1 : 0, b.ativo === false ? 0 : 1,
      foto || (b.tirar_foto ? null : ant.foto), id);
    if ((foto || b.tirar_foto) && ant.foto) fs.rmSync(path.join(FOTOS, ant.foto), { force: true });
    return res.json({ id });
  }
  let slug = slugify(nome), n = 2; while (get('SELECT 1 FROM produtos WHERE slug=?', slug)) slug = slugify(nome) + '-' + n++;
  const r = run('INSERT INTO produtos(slug,nome,categoria,descricao,preco,preco_de,estoque,peso_g,destaque,ativo,foto,arte) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    slug, nome, cat, String(b.descricao || '').slice(0, 2000), preco, de, est, peso, b.destaque ? 1 : 0, b.ativo === false ? 0 : 1, foto || null,
    { Semijoias: 'anel', Perfumes: 'perfume', Maquiagem: 'batom', Skincare: 'serum' }[cat]);
  res.json({ id: Number(r.lastInsertRowid) });
});
const CFG_EDITAVEL = ['loja_nome', 'loja_frase', 'instagram', 'whatsapp', 'email', 'cep_origem', 'frete_gratis_acima', 'parcelas_max', 'parcela_minima', 'pix_minutos'];
app.get('/api/admin/config', (req, res) => res.json(Object.fromEntries(CFG_EDITAVEL.map(k => [k, cfg(k)]))));
app.post('/api/admin/config', (req, res) => {
  const b = req.body || {};
  if (b.cep_origem !== undefined && !ufDoCep(String(b.cep_origem).replace(/\D/g, ''))) return erro(res, 'CEP de origem inválido');
  for (const k of CFG_EDITAVEL) if (b[k] !== undefined) setCfg(k, k === 'cep_origem' ? String(b[k]).replace(/\D/g, '') : String(b[k]).trim().slice(0, 200));
  res.json({ ok: true });
});
app.post('/api/admin/reset-demo', (req, res) => { if (!DEMO) return erro(res, 'Só na demonstração', 404); resetDemo(); res.json({ ok: true }); });

// ---------- páginas ----------
const PUB = path.join(__dirname, 'public');
app.use(express.static(PUB, { index: false, maxAge: '1h' }));
app.get(['/admin', '/admin/'], (req, res) => res.sendFile(path.join(PUB, 'admin.html')));
app.get(/^\/(?!api\/|f\/|arte\/).*/, (req, res) => res.sendFile(path.join(PUB, 'index.html')));
app.use((err, req, res, next) => { console.error(err); erro(res, 'Erro no servidor', 500); });
app.listen(PORT, () => console.log('Loja Online Speed na porta', PORT, DEMO ? '(demonstração)' : ''));
