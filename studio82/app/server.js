// Studio 82 Training — plataforma de aulas de dança (Node 22 puro, sem dependências).
// Dados em DATA_DIR/db.json; vídeos em DATA_DIR/videos (convertidos para H.264 pelo ffmpeg).
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const PORT = +process.env.PORT || 4120;
const DATA = process.env.DATA_DIR || '/data';
const PUB = path.join(__dirname, 'public');
const VID = path.join(DATA, 'videos');
const TMP = path.join(DATA, 'tmp');
for (const d of [DATA, VID, TMP]) fs.mkdirSync(d, { recursive: true });

// ---------- Estilos e níveis (fixos; o professor só escolhe) ----------
const ESTILOS = [
  { id: 'kpop', nome: 'K-Pop', niveis: ['Iniciante', 'Básico', 'Intermediário'] },
  { id: 'jazzfunk', nome: 'Jazz Funk', niveis: ['Iniciante', 'Intermediário'] },
  { id: 'heels', nome: 'Heels', niveis: ['Iniciante'] },
  { id: 'flex', nome: 'Flexibilidade', niveis: ['Todos os níveis'] },
  { id: 'street', nome: 'Street Style', niveis: ['Convidados'], especial: true },
];
const ESTILO = Object.fromEntries(ESTILOS.map((e) => [e.id, e]));

// ---------- Banco (JSON com gravação atômica) ----------
const DBF = path.join(DATA, 'db.json');
let db;
try { db = JSON.parse(fs.readFileSync(DBF, 'utf8')); } catch { db = {}; }
db.config ??= { nome: 'Studio 82 Training', instagram: 'https://www.instagram.com/studio82br/', aprovar: true, professor: 'OLLY' };
db.users ??= [];
db.aulas ??= [];
db.prog ??= {};
db.sess ??= {};
let salvando = null;
function salvar() {
  if (salvando) return;
  salvando = setTimeout(() => {
    salvando = null;
    const t = DBF + '.tmp';
    fs.writeFileSync(t, JSON.stringify(db));
    fs.renameSync(t, DBF);
  }, 150);
}
const uid = (n = 9) => crypto.randomBytes(n).toString('base64url');

function hashSenha(s, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(String(s), salt, 32).toString('hex') };
}
function confere(s, u) {
  const h = crypto.scryptSync(String(s), u.salt, 32);
  return crypto.timingSafeEqual(h, Buffer.from(u.hash, 'hex'));
}
// Admin inicial vem do .env
(function adminInicial() {
  const email = (process.env.ADMIN_EMAIL || 'admin@studio82').toLowerCase();
  if (!db.users.some((u) => u.role === 'admin')) {
    db.users.push({ id: uid(), nome: db.config.professor, email, ...hashSenha(process.env.ADMIN_SENHA || 'studio82'), role: 'admin', status: 'ativo', criado: Date.now(), liberadas: [] });
    salvar();
  }
})();
const DRIVE = require('./drive')({ db, salvar: () => salvar(), VID });
// Processos de vídeo que pararam no meio (reinício) voltam para a fila
for (const a of db.aulas) if (a.estado === 'processando') a.estado = 'fila';

// ---------- Regras de liberação ----------
function progDe(u) { return (db.prog[u.id] ??= {}); }
function concluidas(u) { const p = progDe(u); return db.aulas.filter((a) => p[a.id]?.ok); }
// Devolve [] se liberada, ou a lista de motivos se trancada
function motivos(a, u) {
  if (!u || u.role === 'admin' || u.liberadas?.includes(a.id)) return [];
  const req = a.req || {};
  const p = progDe(u);
  const m = [];
  for (const rid of req.aulas || []) {
    const r = db.aulas.find((x) => x.id === rid);
    if (r && !p[rid]?.ok) m.push({ tipo: 'aula', id: rid, txt: `Conclua a aula “${r.titulo}”` });
  }
  if (req.min > 0) {
    const feitas = concluidas(u).filter((x) => !req.minEstilo || x.estilo === req.minEstilo).length;
    if (feitas < req.min) {
      const falta = req.min - feitas;
      const onde = req.minEstilo ? ` de ${ESTILO[req.minEstilo]?.nome}` : '';
      m.push({ tipo: 'min', txt: `Faça mais ${falta} aula${falta > 1 ? 's' : ''}${onde}`, feitas, precisa: req.min });
    }
  }
  return m;
}
// Aulas que a aula `id` ajuda a liberar
const libera = (id) => db.aulas.filter((a) => a.req?.aulas?.includes(id)).map((a) => a.id);

function aulaPub(a, u) {
  const p = progDe(u)[a.id] || {};
  const tr = motivos(a, u);
  return {
    id: a.id, titulo: a.titulo, estilo: a.estilo, nivel: a.nivel, bio: a.bio || '', professor: a.professor || db.config.professor,
    convidado: a.convidado || null, duracao: a.duracao || 0, criado: a.criado, ordem: a.ordem ?? 0, publicado: !!a.publicado,
    estado: a.estado || 'sem-video', progresso: a.progresso || 0, temCapa: !!a.capa, capa: a.capa || 0, v: a.v || 0, onde: a.drive ? 'drive' : 'servidor', driveProg: a.driveProg, driveErro: a.driveErro || '',
    trancada: tr.length > 0, motivos: tr, req: a.req || { aulas: [], min: 0, minEstilo: '' }, libera: libera(a.id),
    feito: Math.min(1, p.vis && a.duracao ? p.vis / a.duracao : 0), ok: !!p.ok, pos: p.pos || 0,
  };
}

// ---------- HTTP utilitários ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
function cab(res, extra = {}) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
}
function json(res, code, obj) { cab(res, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.writeHead(code); res.end(JSON.stringify(obj)); }
const erro = (res, code, msg) => json(res, code, { erro: msg });
function corpo(req, lim = 1e6) {
  return new Promise((ok, nao) => {
    let n = 0; const b = [];
    req.on('data', (c) => { n += c.length; if (n > lim) { nao(new Error('grande')); req.destroy(); } else b.push(c); });
    req.on('end', () => { try { ok(b.length ? JSON.parse(Buffer.concat(b)) : {}); } catch { nao(new Error('json')); } });
    req.on('error', nao);
  });
}
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])); }
function usuario(req) {
  const t = cookies(req).s82; const s = t && db.sess[t];
  if (!s || s.exp < Date.now()) return null;
  const u = db.users.find((x) => x.id === s.uid);
  return u && u.status === 'ativo' ? u : null;
}
function abreSessao(req, res, u) {
  const t = uid(24);
  db.sess[t] = { uid: u.id, exp: Date.now() + 90 * 864e5 };
  const seg = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `s82=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${90 * 86400}${seg}`);
  salvar();
}
const eu = (u) => u && ({ id: u.id, nome: u.nome, email: u.email, role: u.role });
const limpa = (s, n = 200) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const limpaBio = (s, n = 4000) => String(s ?? '').replace(/[\u0000-\u0009\u000b-\u001f]/g, '').trim().slice(0, n);

// Limite simples de tentativas de login
const tent = new Map();
// Conta só tentativas erradas (várias alunas no mesmo Wi-Fi do estúdio não se bloqueiam)
const ipDe = (req) => req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
function freio(req) { const t = tent.get(ipDe(req)); return !!t && Date.now() < t.ate && t.n >= 15; }
function errou(req) {
  const ip = ipDe(req); const t = tent.get(ip) || { n: 0, ate: 0 };
  if (Date.now() > t.ate) { t.n = 0; t.ate = Date.now() + 10 * 60e3; }
  t.n++; tent.set(ip, t);
}

// ---------- Vídeo: conversão com ffmpeg (fila de 1) ----------
let rodando = false;
function proximoVideo() {
  if (rodando) return;
  const a = db.aulas.find((x) => x.estado === 'fila');
  if (!a) return;
  rodando = true;
  const ent = path.join(TMP, a.id + '.up');
  const sai = path.join(TMP, a.id + '.mp4');
  sondar(ent).then((dur) => {
    a.estado = 'processando'; a.progresso = 0; salvar();
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', ent, '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', "scale='min(1920,iw)':-2:flags=lanczos,format=yuv420p", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', sai];
    const f = spawn('ffmpeg', args);
    f.stdout.on('data', (d) => {
      const m = String(d).match(/out_time_us=(\d+)/g);
      if (m && dur) { a.progresso = Math.min(0.99, +m.at(-1).split('=')[1] / 1e6 / dur); }
    });
    let err = ''; f.stderr.on('data', (d) => { err += d; });
    f.on('close', async (code) => {
      try {
        if (code !== 0) throw new Error(err.slice(-400) || 'ffmpeg ' + code);
        await fsp.rename(sai, path.join(VID, a.id + '.mp4'));
        if (a.drive) { DRIVE.apaga(a.drive); a.drive = ''; } // vídeo trocado: o antigo sai do Drive
        a.duracao = (await sondar(path.join(VID, a.id + '.mp4'))) || dur;
        a.v = Date.now();
        if (!a.capa) await capa(a, a.duracao * 0.3).catch(() => {});
        a.estado = 'pronto'; a.progresso = 1; a.falha = '';
        await fsp.rm(ent, { force: true });
      } catch (e) {
        a.estado = 'erro'; a.falha = String(e.message).slice(0, 300);
        await fsp.rm(sai, { force: true }).catch(() => {});
      }
      salvar(); rodando = false; proximoVideo(); DRIVE.fila();
    });
  }).catch((e) => { a.estado = 'erro'; a.falha = 'Arquivo de vídeo inválido'; salvar(); rodando = false; proximoVideo(); });
}
function sondar(arq) {
  return new Promise((ok, nao) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]);
    let o = ''; p.stdout.on('data', (d) => { o += d; });
    p.on('close', (c) => { const d = parseFloat(o); c === 0 && d > 0 ? ok(d) : nao(new Error('ffprobe')); });
  });
}
async function capa(a, t) {
  const local = path.join(VID, a.id + '.mp4');
  let ent = ['-i', local];
  if (!fs.existsSync(local) && a.drive) { const d = await DRIVE.entradaFfmpeg(a.drive); ent = ['-headers', d.cab, '-i', d.url]; }
  // -ss antes da entrada (pula direto no ponto; no Drive pede só aquele pedaço)
  ent = ent.slice(0, -2).concat(['-ss', String(Math.max(0, t || 0))], ent.slice(-2));
  return new Promise((ok, nao) => {
    const out = path.join(VID, a.id + '.jpg');
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...ent, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', out]);
    p.on('close', (c) => { if (c === 0) { a.capa = Date.now(); salvar(); ok(); } else nao(new Error('capa')); });
  });
}
setTimeout(proximoVideo, 500);

// ---------- Arquivo com Range (vídeo) ----------
function servirArquivo(req, res, arq, tipo, cache = 'private, max-age=3600') {
  fs.stat(arq, (e, st) => {
    if (e) { res.writeHead(404); return res.end(); }
    cab(res, { 'Content-Type': tipo, 'Accept-Ranges': 'bytes', 'Cache-Control': cache });
    const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (r) {
      let ini = r[1] ? +r[1] : st.size - +r[2];
      let fim = r[1] && r[2] ? +r[2] : st.size - 1;
      if (!r[1] && !r[2] || ini >= st.size || ini < 0) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      fim = Math.min(fim, st.size - 1);
      res.writeHead(206, { 'Content-Range': `bytes ${ini}-${fim}/${st.size}`, 'Content-Length': fim - ini + 1 });
      fs.createReadStream(arq, { start: ini, end: fim }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Length': st.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(arq).pipe(res);
    }
  });
}
function estatico(req, res, p) {
  if (p === '/' || !path.extname(p)) p = '/index.html';
  const arq = path.normalize(path.join(PUB, p));
  if (!arq.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (e, b) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    cab(res, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': p === '/index.html' ? 'no-cache' : 'public, max-age=86400' });
    res.writeHead(200); res.end(b);
  });
}

// ---------- Rotas ----------
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/saude') return json(res, 200, { ok: true });
    if (p.startsWith('/media/')) return media(req, res, p);
    if (!p.startsWith('/api/')) return estatico(req, res, p);
    if (req.method === 'POST' && p !== '/api/admin/upload') {
      // Proteção CSRF: só aceita POST da própria origem
      const o = req.headers.origin; if (o && new URL(o).host !== req.headers.host) return erro(res, 403, 'Origem inválida');
    }
    const u = usuario(req);

    if (p === '/api/info') {
      const cont = Object.fromEntries(ESTILOS.map((e) => [e.id, db.aulas.filter((a) => a.publicado && a.estilo === e.id && a.estado === 'pronto').length]));
      return json(res, 200, { config: { nome: db.config.nome, instagram: db.config.instagram, professor: db.config.professor, aprovar: db.config.aprovar }, estilos: ESTILOS, contagem: cont, eu: eu(u) });
    }
    if (p === '/api/cadastro' && req.method === 'POST') {
      if (freio(req)) return erro(res, 429, 'Muitas tentativas. Espere alguns minutos.');
      const b = await corpo(req);
      const nome = limpa(b.nome, 80), email = limpa(b.email, 120).toLowerCase(), senha = String(b.senha || '');
      if (nome.length < 2) return erro(res, 400, 'Digite seu nome');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erro(res, 400, 'E-mail inválido');
      if (senha.length < 6) return erro(res, 400, 'A senha precisa de pelo menos 6 caracteres');
      if (db.users.some((x) => x.email === email)) return erro(res, 400, 'Esse e-mail já tem conta. Entre com ele.');
      errou(req); // cadastro também conta, para ninguém criar contas em massa
      const novo = { id: uid(), nome, email, ...hashSenha(senha), role: 'aluno', status: db.config.aprovar ? 'pendente' : 'ativo', criado: Date.now(), liberadas: [] };
      db.users.push(novo); salvar();
      if (novo.status === 'ativo') { abreSessao(req, res, novo); return json(res, 200, { ok: true, eu: eu(novo) }); }
      return json(res, 200, { ok: true, pendente: true });
    }
    if (p === '/api/entrar' && req.method === 'POST') {
      if (freio(req)) return erro(res, 429, 'Muitas tentativas. Espere alguns minutos.');
      const b = await corpo(req);
      const x = db.users.find((y) => y.email === limpa(b.email, 120).toLowerCase());
      if (!x || !confere(b.senha || '', x)) { errou(req); return erro(res, 401, 'E-mail ou senha incorretos'); }
      if (x.status === 'pendente') return erro(res, 403, 'Sua conta está esperando a liberação do estúdio. Avise o professor!');
      if (x.status !== 'ativo') return erro(res, 403, 'Conta bloqueada. Fale com o estúdio.');
      abreSessao(req, res, x);
      return json(res, 200, { ok: true, eu: eu(x) });
    }
    if (p === '/api/sair' && req.method === 'POST') {
      const t = cookies(req).s82; if (t) delete db.sess[t]; salvar();
      res.setHeader('Set-Cookie', 's82=; Path=/; Max-Age=0');
      return json(res, 200, { ok: true });
    }

    if (!u) return erro(res, 401, 'Entre para continuar');

    if (p === '/api/aulas') {
      const lista = db.aulas.filter((a) => u.role === 'admin' || (a.publicado && a.estado === 'pronto')).map((a) => aulaPub(a, u));
      lista.sort((a, b) => a.ordem - b.ordem || b.criado - a.criado);
      return json(res, 200, { aulas: lista, feitas: concluidas(u).length });
    }
    if (p === '/api/senha' && req.method === 'POST') {
      const b = await corpo(req);
      if (!confere(b.atual || '', u)) return erro(res, 400, 'Senha atual incorreta');
      if (String(b.nova || '').length < 6) return erro(res, 400, 'A nova senha precisa de 6 caracteres');
      Object.assign(u, hashSenha(b.nova)); salvar();
      return json(res, 200, { ok: true });
    }
    if (p === '/api/progresso' && req.method === 'POST') {
      const b = await corpo(req);
      const a = db.aulas.find((x) => x.id === b.id);
      if (!a || motivos(a, u).length) return erro(res, 403, 'Aula trancada');
      const pr = (progDe(u)[a.id] ??= { vis: 0, pos: 0 });
      const dt = Math.max(0, Math.min(30, +b.dt || 0)); // segundos assistidos desde o último envio
      pr.vis = Math.min(a.duracao || 1e9, (pr.vis || 0) + dt);
      pr.pos = Math.max(0, +b.pos || 0);
      pr.em = Date.now();
      let nova = false;
      if (!pr.ok && a.duracao && pr.vis >= a.duracao * 0.85) { pr.ok = Date.now(); nova = true; }
      salvar();
      const liberou = nova ? db.aulas.filter((x) => x.publicado && libera(a.id).includes(x.id) && !motivos(x, u).length).map((x) => x.titulo) : [];
      return json(res, 200, { ok: !!pr.ok, feito: a.duracao ? Math.min(1, pr.vis / a.duracao) : 0, nova, liberou });
    }

    // ----- Área do professor -----
    if (!p.startsWith('/api/admin/')) return erro(res, 404, 'Não encontrado');
    if (u.role !== 'admin') return erro(res, 403, 'Só o professor');

    if (p === '/api/admin/aula' && req.method === 'POST') {
      const b = await corpo(req, 2e5);
      let a = b.id && db.aulas.find((x) => x.id === b.id);
      if (!a) { a = { id: uid(6), criado: Date.now(), estado: 'sem-video', ordem: (Math.max(0, ...db.aulas.map((x) => x.ordem || 0)) + 1) }; db.aulas.push(a); }
      const est = ESTILO[b.estilo] ? b.estilo : 'kpop';
      a.titulo = limpa(b.titulo, 120) || 'Aula sem título';
      a.estilo = est;
      a.nivel = ESTILO[est].niveis.includes(b.nivel) ? b.nivel : ESTILO[est].niveis[0];
      a.bio = limpaBio(b.bio);
      a.professor = limpa(b.professor, 60) || db.config.professor;
      a.convidado = est === 'street' ? { nome: limpa(b.convidado?.nome, 60), insta: limpa(b.convidado?.insta, 60).replace(/^@/, ''), bio: limpaBio(b.convidado?.bio, 1500) } : null;
      if (a.convidado?.nome) a.professor = a.convidado.nome;
      a.publicado = !!b.publicado;
      const ids = new Set(db.aulas.map((x) => x.id));
      a.req = {
        aulas: [...new Set((b.req?.aulas || []).filter((x) => ids.has(x) && x !== a.id))].slice(0, 50),
        min: Math.max(0, Math.min(500, parseInt(b.req?.min) || 0)),
        minEstilo: ESTILO[b.req?.minEstilo] ? b.req.minEstilo : '',
      };
      // "Ao concluir esta aula, libera:" — grava o requisito nas outras aulas
      if (Array.isArray(b.libera)) {
        const quer = new Set(b.libera);
        for (const x of db.aulas) {
          if (x.id === a.id) continue;
          x.req ??= { aulas: [], min: 0, minEstilo: '' };
          const tem = x.req.aulas.includes(a.id);
          if (quer.has(x.id) && !tem && !a.req.aulas.includes(x.id)) x.req.aulas.push(a.id);
          if (!quer.has(x.id) && tem) x.req.aulas = x.req.aulas.filter((y) => y !== a.id);
        }
      }
      salvar();
      return json(res, 200, { ok: true, aula: aulaPub(a, u) });
    }
    if (p === '/api/admin/aula/apagar' && req.method === 'POST') {
      const b = await corpo(req);
      const i = db.aulas.findIndex((x) => x.id === b.id);
      if (i < 0) return erro(res, 404, 'Aula não existe');
      const [a] = db.aulas.splice(i, 1);
      for (const x of db.aulas) if (x.req?.aulas) x.req.aulas = x.req.aulas.filter((y) => y !== a.id);
      for (const ux of db.users) ux.liberadas = (ux.liberadas || []).filter((y) => y !== a.id);
      if (a.drive) DRIVE.apaga(a.drive);
      for (const ext of ['.mp4', '.jpg']) fsp.rm(path.join(VID, a.id + ext), { force: true }).catch(() => {});
      fsp.rm(path.join(TMP, a.id + '.up'), { force: true }).catch(() => {});
      salvar();
      return json(res, 200, { ok: true });
    }
    if (p === '/api/admin/ordem' && req.method === 'POST') {
      const b = await corpo(req);
      (b.ids || []).forEach((id, i) => { const a = db.aulas.find((x) => x.id === id); if (a) a.ordem = i + 1; });
      salvar();
      return json(res, 200, { ok: true });
    }
    if (p === '/api/admin/upload') {
      // Envio em pedaços: PUT ?id=&ini=&total=  (Cloudflare limita cada requisição a 100 MB)
      const a = db.aulas.find((x) => x.id === url.searchParams.get('id'));
      if (!a) return erro(res, 404, 'Aula não existe');
      if (a.estado === 'processando') return erro(res, 409, 'Espere o vídeo atual terminar de processar');
      const ini = +url.searchParams.get('ini'), total = +url.searchParams.get('total');
      if (!(total > 0) || total > 20e9 || !(ini >= 0)) return erro(res, 400, 'Tamanho inválido');
      const arq = path.join(TMP, a.id + '.up');
      let tam = 0; try { tam = (await fsp.stat(arq)).size; } catch {}
      if (ini === 0) { await fsp.rm(arq, { force: true }); tam = 0; a.estado = 'enviando'; a.progresso = 0; salvar(); }
      if (ini !== tam) return json(res, 409, { erro: 'fora de ordem', tem: tam });
      const ws = fs.createWriteStream(arq, { flags: 'a' });
      let n = 0;
      req.on('data', (c) => { n += c.length; if (n > 64 * 1024 * 1024) { req.destroy(); ws.destroy(); } });
      req.pipe(ws);
      ws.on('error', () => erro(res, 500, 'Falha ao gravar'));
      ws.on('finish', async () => {
        const agora = tam + n;
        a.progresso = agora / total;
        if (agora >= total) { a.estado = 'fila'; a.progresso = 0; salvar(); proximoVideo(); }
        json(res, 200, { ok: true, tem: agora, fim: agora >= total });
      });
      return;
    }
    if (p === '/api/admin/capa' && req.method === 'POST') {
      const b = await corpo(req);
      const a = db.aulas.find((x) => x.id === b.id);
      if (!a || a.estado !== 'pronto') return erro(res, 400, 'O vídeo ainda não está pronto');
      await capa(a, +b.t || 0);
      return json(res, 200, { ok: true, capa: a.capa });
    }
    if (p === '/api/admin/alunos') {
      const lista = db.users.filter((x) => x.role !== 'admin').map((x) => {
        const pr = progDe(x);
        return { id: x.id, nome: x.nome, email: x.email, status: x.status, criado: x.criado, liberadas: x.liberadas || [],
          feitas: Object.keys(pr).filter((k) => pr[k].ok && db.aulas.some((a) => a.id === k)), ultimo: Math.max(0, ...Object.values(pr).map((v) => v.em || 0)) };
      }).sort((a, b) => (a.status === 'pendente' ? -1 : 0) - (b.status === 'pendente' ? -1 : 0) || b.criado - a.criado);
      return json(res, 200, { alunos: lista });
    }
    if (p === '/api/admin/aluno' && req.method === 'POST') {
      const b = await corpo(req);
      const x = db.users.find((y) => y.id === b.id && y.role !== 'admin');
      if (!x) return erro(res, 404, 'Aluno não existe');
      if (['ativo', 'pendente', 'bloqueado'].includes(b.status)) {
        x.status = b.status;
        if (b.status !== 'ativo') for (const [t, s] of Object.entries(db.sess)) if (s.uid === x.id) delete db.sess[t];
      }
      if (b.senha) { if (String(b.senha).length < 6) return erro(res, 400, 'Senha com pelo menos 6 caracteres'); Object.assign(x, hashSenha(b.senha)); }
      if (b.aula && db.aulas.some((a) => a.id === b.aula)) {
        if ('liberar' in b) { x.liberadas = (x.liberadas || []).filter((y) => y !== b.aula); if (b.liberar) x.liberadas.push(b.aula); }
        if ('feita' in b) { const pr = progDe(x); if (b.feita) (pr[b.aula] ??= { vis: 0, pos: 0 }).ok = Date.now(); else if (pr[b.aula]) delete pr[b.aula].ok; }
      }
      if (b.apagar) { db.users = db.users.filter((y) => y !== x); delete db.prog[x.id]; for (const [t, s] of Object.entries(db.sess)) if (s.uid === x.id) delete db.sess[t]; }
      salvar();
      return json(res, 200, { ok: true });
    }
    // ----- Google Drive -----
    if (p === '/api/admin/drive') return json(res, 200, { ...(await DRIVE.estado()), redirect: redirDrive(req) });
    if (p === '/api/admin/drive/cliente' && req.method === 'POST') {
      const b = await corpo(req);
      const id = limpa(b.clientId, 200), sec = limpa(b.clientSecret, 200);
      if (!/\.apps\.googleusercontent\.com$/.test(id)) return erro(res, 400, 'O ID do cliente termina com .apps.googleusercontent.com');
      if (sec.length < 10) return erro(res, 400, 'Cole a chave secreta do cliente');
      DRIVE.salvaCliente(id, sec);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/admin/drive/conectar') {
      if (!db.drive.clientId) return erro(res, 400, 'Cole o ID e a chave do cliente primeiro');
      res.writeHead(302, { Location: DRIVE.linkConectar(redirDrive(req), u.id) }); return res.end();
    }
    if (p === '/api/admin/drive/volta') {
      let msg = 'ok';
      if (url.searchParams.get('error')) msg = 'O acesso ao Google foi cancelado';
      else { try { await DRIVE.volta(url.searchParams.get('code'), url.searchParams.get('state'), u.id); } catch (e) { msg = e.message; } }
      res.writeHead(302, { Location: '/?drive=' + encodeURIComponent(msg) + '#/professor/ajustes' }); return res.end();
    }
    if (p === '/api/admin/drive/desconectar' && req.method === 'POST') { DRIVE.desconectar(); return json(res, 200, { ok: true }); }
    if (p === '/api/admin/config' && req.method === 'POST') {
      const b = await corpo(req);
      if ('aprovar' in b) db.config.aprovar = !!b.aprovar;
      if (b.professor) db.config.professor = limpa(b.professor, 60);
      if (b.instagram) db.config.instagram = limpa(b.instagram, 200);
      salvar();
      return json(res, 200, { ok: true });
    }
    return erro(res, 404, 'Não encontrado');
  } catch (e) {
    console.error(e);
    if (!res.headersSent) erro(res, 500, 'Erro no servidor');
  }
});

function redirDrive(req) {
  const https = (req.headers['x-forwarded-proto'] || '').includes('https') || /speedco|brgirlslive/.test(req.headers.host || '');
  return `${https ? 'https' : 'http'}://${req.headers.host}/api/admin/drive/volta`;
}
function media(req, res, p) {
  const m = /^\/media\/(v|c)\/([\w-]+)$/.exec(p);
  const u = usuario(req);
  if (!m || !u) { res.writeHead(401); return res.end(); }
  const a = db.aulas.find((x) => x.id === m[2]);
  if (!a) { res.writeHead(404); return res.end(); }
  if (m[1] === 'c') return servirArquivo(req, res, path.join(VID, a.id + '.jpg'), 'image/jpeg');
  if ((!a.publicado && u.role !== 'admin') || motivos(a, u).length) { res.writeHead(403); return res.end(); }
  const local = path.join(VID, a.id + '.mp4');
  if (a.drive && !fs.existsSync(local)) return DRIVE.stream(req, res, a.drive, cab);
  return servirArquivo(req, res, local, 'video/mp4');
}

// Limpa sessões vencidas uma vez por dia
setInterval(() => { const t = Date.now(); for (const [k, s] of Object.entries(db.sess)) if (s.exp < t) delete db.sess[k]; salvar(); }, 864e5);
servidor.requestTimeout = 0;
servidor.listen(PORT, () => console.log('Studio 82 na porta ' + PORT));
