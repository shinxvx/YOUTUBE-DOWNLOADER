// COFRE NINEFOX (07/11/2026, pedido do dono): cofre.ninefox.com.br — controle de tudo o que foi feito na NINEFOX.
// Sistemas (no ar ou não), links, acesso de administrador (senha lida dos arquivos de cada app), linha do tempo (HISTORICO.md
// de cada projeto), pendências (CLAUDE.md de cada projeto) e notas do dono. Só com senha. Sem dependências.
//
// Dados em /data: auth.json (hash scrypt da senha + segredo da sessão), sistemas.json (lista, vale na hora), notas.json.
// Fontes só leitura em /fontes/<projeto>/{HISTORICO.md,CLAUDE.md} e arquivos de senha montados no compose.
// Senha: node /app/server.js --senha 'NOVA'   (dentro do contêiner; derruba as sessões abertas)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORTA = +process.env.PORT || 4193;
const DADOS = process.env.DATA_DIR || '/data';
const FONTES = process.env.FONTES || '/fontes';
const PUBLICO = path.join(__dirname, 'public');
const MARCA = process.env.MARCA || '/marca';
const ARQ_AUTH = path.join(DADOS, 'auth.json');
const ARQ_SIS = path.join(DADOS, 'sistemas.json');
const ARQ_NOTAS = path.join(DADOS, 'notas.json');
const log = (...a) => console.log(new Date().toISOString(), ...a);

const lerJson = (f, padrao) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return padrao; } };
const gravarJson = (f, v) => { const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(v, null, 1), { mode: 0o600 }); fs.renameSync(t, f); };

// ---------------- senha e sessão ----------------
function definirSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  gravarJson(ARQ_AUTH, { salt, hash: crypto.scryptSync(senha, salt, 32).toString('hex'), segredo: crypto.randomBytes(32).toString('hex'), trocada: new Date().toISOString() });
}
const auth = () => lerJson(ARQ_AUTH, null);
function confere(senha) {
  const a = auth(); if (!a || !a.hash) return false;
  const h = crypto.scryptSync(String(senha || ''), a.salt, 32);
  return crypto.timingSafeEqual(h, Buffer.from(a.hash, 'hex'));
}
const assinar = (v) => crypto.createHmac('sha256', auth().segredo).update(v).digest('hex');
function token() { const ate = Date.now() + 30 * 86400e3; return ate + '.' + assinar(String(ate)); }
function cookies(req) { const o = {}; (req.headers.cookie || '').split(';').forEach((c) => { const i = c.indexOf('='); if (i > 0) o[c.slice(0, i).trim()] = c.slice(i + 1).trim(); }); return o; }
function logado(req) {
  const a = auth(); const c = cookies(req).nfc; if (!a || !c) return false;
  const [ate, sig] = c.split('.'); if (!ate || !sig || +ate < Date.now()) return false;
  const esperado = assinar(ate);
  return sig.length === esperado.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado));
}
const erros = new Map(); // ip -> {n, ate}
const ipDe = (req) => String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '');

// ---------------- leitura das fontes ----------------
function lerTexto(rel) { try { return fs.readFileSync(path.join(FONTES, rel), 'utf8'); } catch (e) { return null; } }
// senha de admin: {arquivo, chave?} — arquivo de texto puro (1ª linha) ou .env (chave=valor)
function senhaDe(fonte) {
  if (!fonte || !fonte.arquivo) return null;
  const t = lerTexto(fonte.arquivo); if (t == null) return null;
  if (!fonte.chave) return t.split('\n')[0].trim();
  const l = t.split('\n').find((x) => x.replace(/^\s*export\s+/, '').startsWith(fonte.chave + '='));
  if (!l) return null;
  return l.slice(l.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
}
// data do título: "2026-11-06 ~17:45 (BRT) — x" ou "07/11/2026 — x" ou "2026-11-06 12:52 — x"
function dataDoTitulo(t) {
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})(?:\s*~?\s*(\d{1,2}):(\d{2}))?/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${(m[4] || '00').padStart(2, '0')}:${m[5] || '00'}`;
  m = t.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s*~?\s*(\d{1,2}):(\d{2}))?/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${(m[4] || '00').padStart(2, '0')}:${m[5] || '00'}`;
  return '';
}
function historico(rel) {
  const t = lerTexto(rel); if (!t) return [];
  return t.split(/^## /m).slice(1).map((b) => {
    const i = b.indexOf('\n'); const titulo = (i < 0 ? b : b.slice(0, i)).trim();
    return { titulo, quando: dataDoTitulo(titulo), texto: (i < 0 ? '' : b.slice(i + 1)).trim().slice(0, 6000) };
  });
}
function pendencias(rel) {
  const t = lerTexto(rel); if (!t) return [];
  const i = t.search(/^## Pend/m); if (i < 0) return [];
  let r = t.slice(i); r = r.slice(r.indexOf('\n') + 1);
  const j = r.search(/^## /m); if (j >= 0) r = r.slice(0, j);
  return r.split('\n').map((l) => l.trim()).filter((l) => /^(\d+\.|-)\s/.test(l)).map((l) => l.replace(/^(\d+\.|-)\s+/, ''));
}

// ---------------- situação dos endereços (no ar?) ----------------
const situacao = {}; // url -> {codigo, ms, quando}
async function checar(url) {
  const ini = Date.now();
  try {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'cofre-ninefox/1' } });
    situacao[url] = { codigo: r.status, ms: Date.now() - ini, quando: Date.now() };
  } catch (e) { situacao[url] = { codigo: 0, erro: String(e.cause && e.cause.code || e.name || e).slice(0, 60), ms: Date.now() - ini, quando: Date.now() }; }
}
async function checarTudo() {
  const s = lerJson(ARQ_SIS, { sistemas: [] });
  const urls = new Set();
  for (const x of s.sistemas || []) { for (const l of x.links || []) if (l.checar !== false) urls.add(l.url); if (x.admin && x.admin.url) urls.add(x.admin.url); }
  await Promise.all([...urls].map(checar));
}

function montar() {
  const s = lerJson(ARQ_SIS, { sistemas: [] });
  const sistemas = (s.sistemas || []).map((x) => ({
    id: x.id, nome: x.nome, grupo: x.grupo || '', oque: x.oque || '', desde: x.desde || '', estado: x.estado || '', logo: x.logo || '',
    links: (x.links || []).map((l) => ({ ...l, situacao: situacao[l.url] || null })),
    admin: x.admin ? { url: x.admin.url || '', usuario: x.admin.usuario || '', obs: x.admin.obs || '', senha: x.admin.senhaDe ? senhaDe(x.admin.senhaDe) : undefined, situacao: x.admin.url ? situacao[x.admin.url] || null : null } : null,
    tecnico: x.tecnico || '',
    pendencias: x.claude ? pendencias(x.claude) : [],
  }));
  const linha = [];
  for (const x of s.sistemas || []) for (const h of x.historico ? historico(x.historico) : []) linha.push({ ...h, sistema: x.nome, id: x.id });
  linha.sort((a, b) => (b.quando || '').localeCompare(a.quando || ''));
  return { sistemas, linha: linha.slice(0, 300), notas: lerJson(ARQ_NOTAS, []), atualizado: Date.now() };
}

// ---------------- HTTP ----------------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const SEG = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
};
function json(res, cod, obj, extra) { res.writeHead(cod, { ...SEG, 'Content-Type': 'application/json; charset=utf-8', ...(extra || {}) }); res.end(JSON.stringify(obj)); }
function corpo(req, max = 65536) {
  return new Promise((ok, falha) => {
    let t = ''; req.on('data', (c) => { t += c; if (t.length > max) { falha(new Error('grande')); req.destroy(); } });
    req.on('end', () => { try { ok(t ? JSON.parse(t) : {}); } catch (e) { falha(e); } }); req.on('error', falha);
  });
}
function arquivo(res, f) {
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404, SEG); return res.end('não achei'); }
    res.writeHead(200, { ...SEG, 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(b);
  });
}
function mesmaOrigem(req) {
  const o = req.headers.origin; if (!o) return false;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}

async function api(req, res, p, m) {
  if (m === 'POST' && !mesmaOrigem(req)) return json(res, 403, { erro: 'Origem não permitida.' });
  if (p === '/api/entrar' && m === 'POST') {
    const ip = ipDe(req); const e = erros.get(ip);
    if (e && e.n >= 8 && e.ate > Date.now()) return json(res, 429, { erro: 'Muitas tentativas. Espere 15 minutos.' });
    let b; try { b = await corpo(req, 2048); } catch (x) { return json(res, 400, { erro: 'Pedido inválido.' }); }
    if (!auth()) return json(res, 503, { erro: 'Senha do cofre ainda não criada.' });
    if (!confere(b.senha)) { const x = e && e.ate > Date.now() ? e : { n: 0 }; x.n++; x.ate = Date.now() + 15 * 60e3; erros.set(ip, x); log('senha errada', ip); return json(res, 401, { erro: 'Senha errada.' }); }
    erros.delete(ip); log('entrou', ip);
    return json(res, 200, { ok: true }, { 'Set-Cookie': `nfc=${token()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 86400}` });
  }
  if (p === '/api/sair' && m === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': 'nfc=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
  if (!logado(req)) return json(res, 401, { erro: 'Entre com a senha.' });
  if (p === '/api/tudo' && m === 'GET') return json(res, 200, montar());
  if (p === '/api/checar' && m === 'POST') { await checarTudo(); return json(res, 200, montar()); }
  if (p === '/api/notas' && m === 'POST') {
    let b; try { b = await corpo(req); } catch (x) { return json(res, 400, { erro: 'Pedido inválido.' }); }
    const notas = lerJson(ARQ_NOTAS, []);
    if (b.apagar) { const i = notas.findIndex((n) => n.id === b.apagar); if (i >= 0) notas.splice(i, 1); }
    else {
      const texto = String(b.texto || '').trim().slice(0, 4000); if (!texto) return json(res, 400, { erro: 'Escreva a nota.' });
      notas.unshift({ id: crypto.randomBytes(6).toString('hex'), texto, sistema: String(b.sistema || '').slice(0, 60), quando: new Date().toISOString() });
    }
    gravarJson(ARQ_NOTAS, notas.slice(0, 1000)); return json(res, 200, { notas });
  }
  if (p === '/api/senha' && m === 'POST') {
    let b; try { b = await corpo(req, 2048); } catch (x) { return json(res, 400, { erro: 'Pedido inválido.' }); }
    if (!confere(b.atual)) return json(res, 400, { erro: 'A senha atual não confere.' });
    if (typeof b.nova !== 'string' || b.nova.length < 8) return json(res, 400, { erro: 'A senha nova precisa ter pelo menos 8 caracteres.' });
    definirSenha(b.nova); log('senha do cofre trocada');
    return json(res, 200, { ok: true }, { 'Set-Cookie': `nfc=${token()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 86400}` });
  }
  return json(res, 404, { erro: 'Não existe.' });
}

function servidor() {
  http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'); const p = u.pathname; const m = req.method;
    try {
      if (p.startsWith('/api/')) return await api(req, res, p, m);
      if (m !== 'GET' && m !== 'HEAD') { res.writeHead(405, SEG); return res.end(); }
      if (p === '/' || p === '/index.html') return arquivo(res, path.join(PUBLICO, 'index.html'));
      if (/^\/(cofre\.css|cofre\.js)$/.test(p)) return arquivo(res, path.join(PUBLICO, p.slice(1)));
      if (/^\/marca\/[a-z0-9-]+\.(svg|png|ico)$/.test(p)) return arquivo(res, path.join(MARCA, p.slice(7)));
      if (p === '/favicon.ico') return arquivo(res, path.join(MARCA, 'favicon.ico'));
      if (p === '/robots.txt') { res.writeHead(200, { ...SEG, 'Content-Type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /\n'); }
      res.writeHead(404, SEG); res.end('não achei');
    } catch (e) { log('erro', p, e); if (!res.headersSent) json(res, 500, { erro: 'Erro no servidor.' }); }
  }).listen(PORTA, () => log(`Cofre NINEFOX na porta ${PORTA}${auth() ? '' : ' (SEM SENHA: rode --senha)'}`));
  checarTudo(); setInterval(checarTudo, 5 * 60e3);
}

if (process.argv[2] === '--senha') {
  const s = process.argv[3]; if (!s || s.length < 8) { console.error('Use: node server.js --senha "senha com 8+ caracteres"'); process.exit(1); }
  definirSenha(s); console.log('Senha do cofre definida.');
} else servidor();

module.exports = { dataDoTitulo, pendencias, senhaDe, historico };
