'use strict';
// Vitrine de tênis e materiais esportivos (modelo para vender, cada cliente põe nome/logo/cor no painel) + painel /admin.
// Sem dependências. Dados em DATA_DIR (produtos.json, config.json, fotos/). Pedido pela sacola -> WhatsApp.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { lerAlbum } = require('./album');

const PORTA = Number(process.env.PORT) || 4192;
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FOTOS = path.join(DATA, 'fotos');
const PUB = path.join(__dirname, 'public');
const SENHA = process.env.ADMIN_SENHA || '';
const SEGREDO = crypto.createHash('sha256').update('nf-sports|' + (process.env.SEGREDO || SENHA)).digest();
const ENDERECO = (process.env.ENDERECO || '').replace(/\/$/, '');
fs.mkdirSync(FOTOS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString(), ...a);

const CATEGORIAS = [
  { id: 'tenis', nome: 'Tênis' },
  { id: 'chinelos', nome: 'Chinelos e sandálias' },
  { id: 'roupas', nome: 'Roupas esportivas' },
  { id: 'botas', nome: 'Botas e sapatênis' },
  { id: 'outlet', nome: 'Últimas peças' },
];
const MARCAS = ['New Balance', 'Louis Vuitton', 'Nike', 'Adidas', 'Mizuno', 'Vans', 'Puma', 'Olympikus', 'Lacoste', 'Oakley', 'Tesla', 'Asics', 'Fila', 'Kenner', 'Caterpillar', 'Boss', 'Gucci', 'Samba'];

// ---------- dados ----------
function ler(nome, padrao) { try { return JSON.parse(fs.readFileSync(path.join(DATA, nome), 'utf8')); } catch { return padrao; } }
function gravar(nome, obj) { const f = path.join(DATA, nome); fs.writeFileSync(f + '.tmp', JSON.stringify(obj, null, 1)); fs.renameSync(f + '.tmp', f); }
let produtos = ler('produtos.json', []);
let config = Object.assign({
  nome: 'Loja Demo', nome2: 'Sports', cor: '#C8F031', logo: null, rodape: '', whatsapp: '', instagram: '', aviso: '',
  titulo: 'Tênis e roupa esportiva pra ir mais longe.',
  subtitulo: 'Catálogo 2026 com os modelos que mais saem: corrida, casual, skate e treino. Escolha o modelo e a numeração e mande o pedido direto pelo WhatsApp.',
  albumUrl: '', albumIgnorar: [], fotosIgnorar: [],
}, ler('config.json', {}));
if (config.nome === 'NINEFOX SPORTS') Object.assign(config, { nome: 'Loja Demo', nome2: 'Sports' }); // identidade antiga (06/11/2026)
const salvarProdutos = () => gravar('produtos.json', produtos);
const salvarConfig = () => gravar('config.json', config);

const novoId = () => crypto.randomBytes(6).toString('hex');
function numeros(txt) {
  const s = new Set(); txt = String(txt || '');
  for (const m of txt.matchAll(/(\d{2})(?:\/(\d{2}))?\s*(?:ao|a|até|-)\s*(\d{2})(?:\/(\d{2}))?/gi)) {
    const a = +m[1], b = +(m[4] || m[3]);
    if (a >= 16 && b <= 50 && a <= b) for (let i = a; i <= b; i++) s.add(i);
  }
  for (const m of txt.matchAll(/(?<![\d,.])(1[6-9]|[2-4]\d|50)(?![\d,.])/g)) s.add(+m[1]);
  return [...s].sort((x, y) => x - y);
}
function letras(txt) {
  const ord = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3', 'G4'];
  const s = new Set();
  for (const m of String(txt || '').toUpperCase().matchAll(/(?<![A-Z0-9])(PP|P|M|GG|G[1-4]|XG|G)(?![A-Z0-9])/g)) s.add(m[1]);
  return ord.filter((x) => s.has(x));
}
function marcaDe(nome) {
  let melhor = '', pos = 1e9;
  for (const m of MARCAS) { const i = nome.toLowerCase().indexOf(m.toLowerCase()); if (i >= 0 && i < pos) { pos = i; melhor = m; } }
  return melhor === 'Samba' ? 'Adidas' : melhor;
}
function categoriaDe(nome) {
  const n = nome.toLowerCase();
  if (/[uú]ltimas pe[cç]as/.test(n)) return 'outlet';
  if (/^(conjunto|short|blusa|camis|cal[cç]a|jaqueta|moletom|regata|top\b|legging|bermuda)/.test(n)) return 'roupas';
  if (/chinelo|sand[aá]lia|slide/.test(n)) return 'chinelos';
  if (/^bota|sapat[eê]nis/.test(n)) return 'botas';
  return 'tenis';
}
const ARRUMAR = [[/\bTenis\b/g, 'Tênis'], [/\bSandalias\b/gi, 'Sandálias'], [/\bSapatenis\b/gi, 'Sapatênis'], [/\bUltimas Peças\b/gi, 'Últimas peças'], [/\bD[Ii]sponiveis\b/g, 'Disponíveis'], [/\bTérmica\b/g, 'Térmicas'], [/\bNumeração Duplas\b/g, 'Numeração dupla']];
const arrumar = (s) => ARRUMAR.reduce((t, [a, b]) => t.replace(a, b), s);

function limpar(p) { // normaliza o que veio do formulário
  const nome = String(p.nome || '').trim().slice(0, 120);
  const tamanhos = String(p.tamanhos || '').trim().slice(0, 400);
  const preco = p.preco === '' || p.preco == null ? null : Math.max(0, Math.round(Number(String(p.preco).replace(',', '.')) * 100) / 100);
  const precoDe = p.precoDe === '' || p.precoDe == null ? null : Math.max(0, Math.round(Number(String(p.precoDe).replace(',', '.')) * 100) / 100);
  return {
    nome, tamanhos,
    categoria: CATEGORIAS.some((c) => c.id === p.categoria) ? p.categoria : categoriaDe(nome),
    marca: String(p.marca ?? marcaDe(nome)).trim().slice(0, 40),
    descricao: String(p.descricao || '').trim().slice(0, 1500),
    preco: Number.isFinite(preco) ? preco : null,
    precoDe: Number.isFinite(precoDe) && precoDe > 0 ? precoDe : null,
    destaque: !!p.destaque, ativo: p.ativo !== false, novo: !!p.novo,
    fotos: Array.isArray(p.fotos) ? p.fotos.filter((f) => f && /^[a-f0-9]{12,40}$/.test(f.id)).map((f) => ({ id: f.id, w: +f.w || 0, h: +f.h || 0, ...(f.src ? { src: String(f.src) } : {}) })) : [],
    numeros: numeros(tamanhos), letras: letras(tamanhos),
  };
}
const publico = (p) => ({ id: p.id, nome: p.nome, categoria: p.categoria, marca: p.marca, tamanhos: p.tamanhos, descricao: p.descricao, preco: p.preco, precoDe: p.precoDe, destaque: p.destaque, novo: p.novo, fotos: p.fotos.map((f) => ({ id: f.id, w: f.w, h: f.h })), numeros: p.numeros, letras: p.letras });
function catalogo() {
  return {
    loja: { nome: config.nome, whatsapp: config.whatsapp, instagram: config.instagram, aviso: config.aviso, titulo: config.titulo, subtitulo: config.subtitulo, rodape: config.rodape },
    categorias: CATEGORIAS,
    produtos: produtos.filter((p) => p.ativo && p.fotos.length).map(publico),
  };
}

// ---------- fotos ----------
const fotoArq = (id, mini) => path.join(FOTOS, `${id}${mini ? '-p' : ''}.jpg`);
function jpegDeDataUrl(d) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(d || ''));
  if (!m) return null;
  const b = Buffer.from(m[1], 'base64');
  return b.length > 100 && b[0] === 0xff && b[1] === 0xd8 ? b : null;
}
function apagarFotosSoltas() { // apaga do disco as fotos que nenhum produto usa mais
  const usadas = new Set(produtos.flatMap((p) => p.fotos.map((f) => f.id)));
  for (const f of fs.readdirSync(FOTOS)) { const id = f.replace(/(-p)?\.jpg$/, ''); if (!usadas.has(id) && !pendentes.has(id)) try { fs.unlinkSync(path.join(FOTOS, f)); } catch { /* ok */ } }
}
const pendentes = new Map(); // fotos enviadas mas ainda não salvas num produto (id -> hora)

// ---------- importar do álbum ----------
let importacao = { rodando: false, msg: '', feitos: 0, total: 0 };
async function baixarFoto(url, destino, largura) {
  if (fs.existsSync(destino)) return;
  const r = await fetch(`${url}=w${largura}-rj`, // -rj: o Google entrega em JPEG mesmo se a original for PNG
    { signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error(`foto ${r.status}`);
  const b = Buffer.from(await r.arrayBuffer());
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error('foto não é JPEG');
  fs.writeFileSync(destino + '.tmp', b); fs.renameSync(destino + '.tmp', destino);
}
async function importarAlbum(link) {
  importacao = { rodando: true, msg: 'Lendo o álbum…', feitos: 0, total: 0, inicio: Date.now() };
  try {
    const { titulo, grupos } = await lerAlbum(link);
    const ignorar = new Set(config.albumIgnorar); const fotosIgnorar = new Set(config.fotosIgnorar);
    const fila = []; let novos = 0, atualizados = 0, baixadas = 0, falhas = 0;
    for (const g of grupos) {
      const linhas = g.texto.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!linhas.length || /^pedimos|^aten[cç][aã]o|^aviso/i.test(linhas[0]) || linhas[0].length > 70) continue; // recado do fornecedor
      const chave = g.texto.toLowerCase().replace(/\s+/g, ' ');
      if (ignorar.has(chave)) continue;
      let p = produtos.find((x) => x.origem === chave);
      const fotosNovas = g.fotos.filter((f) => !fotosIgnorar.has(f.src) && !(p && p.fotos.some((x) => x.src === f.src)));
      if (!fotosNovas.length) continue;
      if (!p) {
        const nome = arrumar(linhas[0]);
        p = { id: novoId(), ...limpar({ nome, tamanhos: arrumar(linhas.slice(1).join('\n')), ativo: true }), origem: chave, criado: Date.now(), fotos: [] };
        p.novo = false; produtos.push(p); novos++;
      } else atualizados++;
      for (const f of fotosNovas) { const id = crypto.createHash('sha1').update(f.src).digest('hex').slice(0, 16); fila.push({ p, f, id }); }
    }
    importacao.total = fila.length;
    importacao.msg = `Baixando ${fila.length} fotos…`;
    let i = 0;
    const trabalhador = async () => {
      while (i < fila.length) {
        const { p, f, id } = fila[i++];
        try {
          await baixarFoto(f.url, fotoArq(id, false), 1200);
          await baixarFoto(f.url, fotoArq(id, true), 520);
          const esc = Math.min(1, 1200 / Math.max(f.w, f.h));
          if (!p.fotos.some((x) => x.id === id)) p.fotos.push({ id, w: Math.round(f.w * esc), h: Math.round(f.h * esc), src: f.src });
          baixadas++;
        } catch (e) { falhas++; log('foto falhou', f.src, e.message); }
        importacao.feitos++;
        if (importacao.feitos % 25 === 0) salvarProdutos();
      }
    };
    await Promise.all([1, 2, 3, 4].map(trabalhador));
    produtos = produtos.filter((p) => p.fotos.length || !p.origem);
    salvarProdutos();
    config.albumUrl = link; salvarConfig();
    importacao = { rodando: false, ok: true, msg: `Álbum "${titulo || 'sem nome'}": ${novos} produto(s) novo(s), ${atualizados} com fotos novas, ${baixadas} foto(s) baixada(s)${falhas ? `, ${falhas} não baixaram (tente de novo depois)` : ''}.`, feitos: fila.length, total: fila.length, fim: Date.now() };
    log('importação', importacao.msg);
  } catch (e) {
    log('importação falhou', e);
    salvarProdutos();
    importacao = { rodando: false, ok: false, msg: 'Não deu para ler o álbum: ' + e.message, feitos: 0, total: 0, fim: Date.now() };
  }
}

// ---------- sessão do admin ----------
function assinar(v) { return crypto.createHmac('sha256', SEGREDO).update(v).digest('base64url'); }
function cookies(req) { return Object.fromEntries(String(req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])); }
function logado(req) {
  const c = cookies(req).nfs; if (!c || !SENHA) return false;
  const [ts, sig] = c.split('.');
  if (!ts || !sig || Date.now() - Number(ts) > 7 * 864e5) return false;
  const a = Buffer.from(assinar(ts)), b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const tentativas = new Map();
function ipDe(req) { return String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }

// ---------- http ----------
const CSP = "default-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const TIPOS = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', ico: 'image/x-icon', json: 'application/json', txt: 'text/plain; charset=utf-8', xml: 'application/xml' };
function enviar(res, cod, tipo, corpo, extra = {}) {
  res.writeHead(cod, { 'Content-Type': tipo, 'Content-Length': Buffer.byteLength(corpo), 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': CSP, ...extra });
  res.end(corpo);
}
const json = (res, cod, obj, extra) => enviar(res, cod, 'application/json; charset=utf-8', JSON.stringify(obj), { 'Cache-Control': 'no-store', ...extra });
function corpo(req, limite) {
  return new Promise((ok, falha) => {
    const partes = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limite) { falha(Object.assign(new Error('grande demais'), { cod: 413 })); req.destroy(); } else partes.push(c); });
    req.on('end', () => { try { ok(n ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {}); } catch { falha(Object.assign(new Error('JSON inválido'), { cod: 400 })); } });
    req.on('error', falha);
  });
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function corSobre(hex) { // texto preto ou branco em cima da cor principal
  const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.3 ? '#151515' : '#ffffff';
}
const iniciais = (n) => String(n || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || 'L';
function logoHtml() {
  const n = esc(config.nome), n2 = esc(config.nome2 || '');
  if (config.logo) return `<img class="logo-img" src="/logo?v=${config.logo.v}" alt="${n}">`;
  return `<span class="logo-mono">${esc(iniciais(config.nome))}</span><span class="logo-txt"><b>${n}</b>${n2 ? `<i>${n2}</i>` : ''}</span>`;
}
function temaHtml() {
  const v = config.logo ? config.logo.v : crypto.createHash('md5').update(config.nome + config.cor).digest('hex').slice(0, 6);
  return `<link rel="icon" href="${config.logo ? '/logo' : '/favicon.svg'}?v=${v}"><style>:root:root{--laranja:${config.cor};--sobre:${corSobre(config.cor)}}</style><meta name="theme-color" content="#151515">`;
}
const nomeCompleto = () => [config.nome, config.nome2].filter(Boolean).join(' ');
let versao = '';
function versaoArquivos() { // muda quando qualquer arquivo de public/ muda (cache do navegador)
  const h = crypto.createHash('md5');
  for (const f of fs.readdirSync(PUB)) { try { const s = fs.statSync(path.join(PUB, f)); h.update(f + s.size + s.mtimeMs); } catch { /* ok */ } }
  return h.digest('hex').slice(0, 8);
}
function pagina(nome, req) {
  if (!versao || Date.now() % 60000 < 2000) versao = versaoArquivos();
  let html = fs.readFileSync(path.join(PUB, nome), 'utf8').replace(/(\/(?:[a-z-]+)\.(?:css|js))"/g, `$1?v=${versao}"`)
    .replaceAll('<!--LOGO-->', logoHtml()).replace('<!--TEMA-->', temaHtml());
  if (nome === 'index.html') {
    const c = catalogo();
    const u = new URL(req.url, 'http://x'); const pid = u.searchParams.get('p'); const prod = pid && c.produtos.find((p) => p.id === pid);
    const titulo = prod ? `${prod.nome} | ${nomeCompleto()}` : `${nomeCompleto()} | Tênis e materiais esportivos`;
    const base = ENDERECO || `https://${String(req.headers.host || '').replace(/[^a-z0-9.:-]/gi, '')}`;
    const desc = prod ? `${prod.nome}${prod.tamanhos ? ' · ' + prod.tamanhos.replace(/\n/g, ' · ') : ''}. Peça pelo WhatsApp.` : config.subtitulo;
    const img = prod ? `${base}/f/${prod.fotos[0].id}.jpg` : (c.produtos[0] ? `${base}/f/${c.produtos[0].fotos[0].id}.jpg` : '');
    html = html.replace('<!--SEO-->', `<title>${esc(titulo)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${base}/${prod ? '?p=' + prod.id : ''}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${base}/${prod ? '?p=' + prod.id : ''}">${img ? `<meta property="og:image" content="${img}">` : ''}<meta name="twitter:card" content="summary_large_image">`)
      .replace('<!--DADOS-->', `<script id="dados" type="application/json">${JSON.stringify(c).replace(/</g, '\\u003c')}</script>`);
  }
  return html;
}

async function rota(req, res) {
  const u = new URL(req.url, 'http://x'); const p = u.pathname; const m = req.method;
  if (p === '/saude') return json(res, 200, { ok: true, produtos: produtos.length });
  if (m === 'GET' && (p === '/' || p === '/index.html')) return enviar(res, 200, TIPOS.html, pagina('index.html', req), { 'Cache-Control': 'no-cache' });
  if (m === 'GET' && (p === '/admin' || p === '/admin/')) return enviar(res, 200, TIPOS.html, pagina('admin.html', req), { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  if (m === 'GET' && p === '/api/catalogo') return json(res, 200, catalogo());
  const base = ENDERECO || `https://${String(req.headers.host || '').replace(/[^a-z0-9.:-]/gi, '')}`;
  if (m === 'GET' && p === '/robots.txt') return enviar(res, 200, TIPOS.txt, `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`);
  if (m === 'GET' && p === '/sitemap.xml') {
    const urls = [`${base}/`, ...produtos.filter((x) => x.ativo && x.fotos.length).map((x) => `${base}/?p=${x.id}`)];
    return enviar(res, 200, TIPOS.xml, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((x) => `<url><loc>${esc(x)}</loc></url>`).join('')}</urlset>`);
  }
  if (m === 'GET' && p === '/logo') {
    let b; try { b = fs.readFileSync(path.join(DATA, 'logo.' + (config.logo && config.logo.tipo))); } catch { return enviar(res, 404, TIPOS.txt, 'sem logo'); }
    return enviar(res, 200, config.logo.tipo === 'png' ? TIPOS.png : TIPOS.jpg, b, { 'Cache-Control': 'public, max-age=31536000, immutable' });
  }
  if (m === 'GET' && p === '/favicon.svg') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${config.cor}"/><text x="32" y="41" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${iniciais(config.nome).length > 1 ? 24 : 30}" fill="${corSobre(config.cor)}">${esc(iniciais(config.nome))}</text></svg>`;
    return enviar(res, 200, TIPOS.svg, svg, { 'Cache-Control': 'public, max-age=86400' });
  }
  if (m === 'GET' && p === '/favicon.ico') { res.writeHead(302, { Location: config.logo ? `/logo?v=${config.logo.v}` : '/favicon.svg' }); return res.end(); }
  let f = /^\/f\/([a-f0-9]{12,40})(-p)?\.jpg$/.exec(p);
  if (m === 'GET' && f) {
    let b; try { b = fs.readFileSync(fotoArq(f[1], !!f[2])); } catch { return enviar(res, 404, TIPOS.txt, 'não encontrado'); }
    return enviar(res, 200, TIPOS.jpg, b, { 'Cache-Control': 'public, max-age=31536000, immutable' });
  }
  f = /^\/([a-z0-9-]+\.(css|js|svg|png|ico|json))$/.exec(p);
  if (m === 'GET' && f) {
    let b; try { b = fs.readFileSync(path.join(PUB, f[1])); } catch { return enviar(res, 404, TIPOS.txt, 'não encontrado'); }
    return enviar(res, 200, TIPOS[f[2]], b, { 'Cache-Control': u.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=300' });
  }

  // ----- admin -----
  if (p.startsWith('/api/admin/')) {
    const acao = p.slice(11);
    if (m === 'POST' && acao === 'entrar') {
      const ip = ipDe(req); const t = tentativas.get(ip) || { n: 0, desde: Date.now() };
      if (Date.now() - t.desde > 15 * 60000) { t.n = 0; t.desde = Date.now(); }
      if (t.n >= 8) return json(res, 429, { erro: 'Muitas tentativas. Espere 15 minutos.' });
      const { senha } = await corpo(req, 4096);
      const a = crypto.createHash('sha256').update(String(senha || '')).digest(); const b = crypto.createHash('sha256').update(SENHA).digest();
      if (!SENHA || !crypto.timingSafeEqual(a, b)) { t.n++; tentativas.set(ip, t); return json(res, 401, { erro: 'Senha errada.' }); }
      tentativas.delete(ip);
      const ts = String(Date.now()); const seguro = req.headers['x-forwarded-proto'] === 'https' || !!req.headers['cf-ray'];
      return json(res, 200, { ok: true }, { 'Set-Cookie': `nfs=${ts}.${assinar(ts)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${seguro ? '; Secure' : ''}` });
    }
    if (m === 'POST' && acao === 'sair') return json(res, 200, { ok: true }, { 'Set-Cookie': 'nfs=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' });
    if (!logado(req)) return json(res, 401, { erro: 'Entre de novo.' });
    if (m !== 'GET' && req.headers['x-nfs'] !== '1') return json(res, 403, { erro: 'pedido recusado' }); // contra formulário de outro site

    if (m === 'GET' && acao === 'tudo') return json(res, 200, { produtos, config: { ...config, albumIgnorar: undefined, fotosIgnorar: undefined }, categorias: CATEGORIAS, importacao });
    if (m === 'GET' && acao === 'importar') return json(res, 200, importacao);
    if (m === 'POST' && acao === 'importar') {
      if (importacao.rodando) return json(res, 409, { erro: 'Já está importando.' });
      const { url } = await corpo(req, 4096);
      try { new URL(url); } catch { return json(res, 400, { erro: 'Cole o link do álbum.' }); }
      importarAlbum(String(url)); return json(res, 200, { ok: true });
    }
    if (m === 'PUT' && acao === 'config') {
      const c = await corpo(req, 20000);
      for (const k of ['aviso', 'titulo', 'subtitulo', 'instagram', 'rodape']) if (k in c) config[k] = String(c[k] || '').trim().slice(0, 300);
      if ('nome' in c) { const n = String(c.nome || '').trim().slice(0, 40); if (!n) return json(res, 400, { erro: 'Dê um nome à loja.' }); config.nome = n; }
      if ('nome2' in c) config.nome2 = String(c.nome2 || '').trim().slice(0, 24);
      if ('cor' in c) { if (!/^#[0-9a-f]{6}$/i.test(c.cor)) return json(res, 400, { erro: 'Cor inválida.' }); config.cor = c.cor.toLowerCase(); }
      if ('whatsapp' in c) config.whatsapp = String(c.whatsapp || '').replace(/\D/g, '').slice(0, 15);
      if (config.instagram && !/^https:\/\//.test(config.instagram)) config.instagram = 'https://instagram.com/' + config.instagram.replace(/^@/, '');
      salvarConfig(); return json(res, 200, { ok: true });
    }
    if (m === 'POST' && acao === 'logo') {
      const { dados, remover } = await corpo(req, 4 * 1024 * 1024);
      if (remover) { config.logo = null; salvarConfig(); return json(res, 200, { ok: true }); }
      const mm = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(dados || ''));
      const b = mm && Buffer.from(mm[2], 'base64');
      const ok = b && b.length > 50 && (mm[1] === 'png' ? b.readUInt32BE(0) === 0x89504e47 : b[0] === 0xff && b[1] === 0xd8);
      if (!ok) return json(res, 400, { erro: 'Logo precisa ser PNG ou JPG.' });
      const tipo = mm[1] === 'png' ? 'png' : 'jpg';
      fs.writeFileSync(path.join(DATA, 'logo.' + tipo), b);
      config.logo = { tipo, v: crypto.createHash('md5').update(b).digest('hex').slice(0, 8) }; salvarConfig();
      return json(res, 200, { ok: true, logo: config.logo });
    }
    if (m === 'POST' && acao === 'foto') {
      const { grande, mini, w, h } = await corpo(req, 12 * 1024 * 1024);
      const bg = jpegDeDataUrl(grande), bm = jpegDeDataUrl(mini);
      if (!bg || !bm) return json(res, 400, { erro: 'Foto inválida (precisa ser JPEG).' });
      const id = crypto.createHash('sha1').update(bg).digest('hex').slice(0, 16);
      fs.writeFileSync(fotoArq(id, false), bg); fs.writeFileSync(fotoArq(id, true), bm); pendentes.set(id, Date.now());
      return json(res, 200, { id, w: +w || 0, h: +h || 0 });
    }
    if (m === 'POST' && acao === 'produtos') {
      const dados = limpar(await corpo(req, 200000));
      if (!dados.nome) return json(res, 400, { erro: 'Dê um nome ao produto.' });
      const novo = { id: novoId(), ...dados, criado: Date.now() };
      produtos.unshift(novo); novo.fotos.forEach((x) => pendentes.delete(x.id)); salvarProdutos();
      return json(res, 200, novo);
    }
    if (m === 'POST' && acao === 'ordem') {
      const { ids } = await corpo(req, 100000);
      if (!Array.isArray(ids)) return json(res, 400, { erro: 'lista' });
      const pos = new Map(ids.map((id, i) => [id, i]));
      produtos.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9)); salvarProdutos();
      return json(res, 200, { ok: true });
    }
    const pm = /^produtos\/([a-f0-9]{12})$/.exec(acao);
    if (pm) {
      const i = produtos.findIndex((x) => x.id === pm[1]);
      if (i < 0) return json(res, 404, { erro: 'Produto não encontrado.' });
      const antigo = produtos[i];
      if (m === 'PUT') {
        const dados = limpar({ ...antigo, ...(await corpo(req, 200000)) });
        if (!dados.nome) return json(res, 400, { erro: 'Dê um nome ao produto.' });
        const tirou = antigo.fotos.filter((x) => x.src && !dados.fotos.some((y) => y.id === x.id)).map((x) => x.src);
        if (tirou.length) { config.fotosIgnorar = [...new Set([...config.fotosIgnorar, ...tirou])]; salvarConfig(); }
        produtos[i] = { ...antigo, ...dados, id: antigo.id };
        dados.fotos.forEach((x) => pendentes.delete(x.id)); salvarProdutos(); apagarFotosSoltas();
        return json(res, 200, produtos[i]);
      }
      if (m === 'DELETE') {
        if (antigo.origem) { config.albumIgnorar = [...new Set([...config.albumIgnorar, antigo.origem])]; salvarConfig(); }
        produtos.splice(i, 1); salvarProdutos(); apagarFotosSoltas();
        return json(res, 200, { ok: true });
      }
    }
    return json(res, 404, { erro: 'não encontrado' });
  }
  return enviar(res, 404, TIPOS.html, '<!doctype html><meta charset="utf-8"><title>Não encontrado</title><p>Página não encontrada. <a href="/">Voltar para a loja</a></p>');
}

// fotos enviadas e nunca salvas num produto somem depois de 1 dia
setInterval(() => { const lim = Date.now() - 864e5; for (const [id, t] of pendentes) if (t < lim) pendentes.delete(id); apagarFotosSoltas(); }, 3600e3).unref();

if (process.argv[2] === 'importar' && process.argv[3]) { // node server.js importar <link> (com o site parado ou num contêiner de teste)
  importarAlbum(process.argv[3]).then(() => { console.log(importacao.msg); process.exit(importacao.ok ? 0 : 1); });
} else {
  http.createServer((req, res) => {
    rota(req, res).catch((e) => { log('erro', req.method, req.url, e.message); if (!res.headersSent) json(res, e.cod || 500, { erro: e.cod ? e.message : 'Erro no servidor.' }); });
  }).listen(PORTA, () => log(`Loja na porta ${PORTA}, ${produtos.length} produtos, admin ${SENHA ? 'com senha' : 'SEM SENHA (bloqueado)'}`));
}
