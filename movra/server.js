// MOVRA by Speed — servidor: contas, catálogo, progresso, pagamentos (Mercado Pago), saques e painel do dono.
'use strict';
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const BASE = (process.env.BASE_URL || 'https://movra.speedco.com.br').replace(/\/$/, '');
const FEE = 0.10;                 // taxa da plataforma
const MES = 30 * 864e5;           // acesso de turma/valor fixo dura 30 dias por pagamento
const SAQUE_MIN = 10;
const MP = {
  token: process.env.MP_ACCESS_TOKEN || '',         // conta Mercado Pago da MOVRA (recebe tudo de quem não conectou o MP)
  clientId: process.env.MP_CLIENT_ID || '',         // aplicação do MP para o professor conectar a conta (divisão automática)
  clientSecret: process.env.MP_CLIENT_SECRET || '',
  webhookSecret: process.env.MP_WEBHOOK_SECRET || ''
};
const mpOn = () => !!MP.token;
const oauthOn = () => !!(MP.clientId && MP.clientSecret);
const r2 = v => Math.round(Number(v || 0) * 100) / 100;
const agora = () => Date.now();
const uid = (p = '') => p + crypto.randomBytes(9).toString('base64url');

/* ---------------- banco ---------------- */
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(path.join(__dirname, 'data', 'movra.db'));
db.pragma('journal_mode = WAL');
db.exec(`
create table if not exists users(id text primary key, email text unique not null, nome text not null, senha text not null,
  papel text not null, teacher_id text, criado integer not null);
create table if not exists sessions(token text primary key, user_id text not null, criado integer not null);
create table if not exists teachers(id text primary key, dados text not null, ativo integer not null default 1, ordem integer not null default 0);
create table if not exists lessons(id text primary key, teacher_id text not null, dados text not null, ordem integer not null default 0);
create table if not exists progress(user_id text not null, lesson_id text not null, em integer not null, primary key(user_id, lesson_id));
create table if not exists access(id text primary key, user_id text not null, teacher_id text not null, kind text not null, ref text not null,
  expira integer, payment_id text, criado integer not null);
create table if not exists payments(id text primary key, user_id text not null, teacher_id text not null, kind text not null, ref text not null,
  titulo text not null, valor real not null, taxa real not null, liquido real not null, status text not null, split integer not null default 0,
  demo integer not null default 0, mp_pref text, mp_id text, metodo text, mp_tarifa real, criado integer not null, aprovado integer);
create table if not exists withdrawals(id text primary key, teacher_id text not null, valor real not null, pix text not null,
  status text not null, obs text, criado integer not null, resolvido integer);
create table if not exists demo_students(id text primary key, teacher_id text not null, dados text not null);
create table if not exists oauth_states(state text primary key, teacher_id text not null, criado integer not null);
`);

function hash(senha, salt = crypto.randomBytes(16).toString('hex')) {
  return 's1:' + salt + ':' + crypto.scryptSync(senha, salt, 32).toString('hex');
}
function confere(senha, h) {
  const [, salt, hx] = String(h).split(':');
  if (!salt) return false;
  const a = Buffer.from(hash(senha, salt).split(':')[2], 'hex'), b = Buffer.from(hx, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const getT = id => { const r = db.prepare('select dados, ativo from teachers where id=?').get(id); return r ? Object.assign(JSON.parse(r.dados), { ativo: !!r.ativo }) : null; };
const putT = t => { const { ativo, ...d } = t; db.prepare('update teachers set dados=? where id=?').run(JSON.stringify(d), t.id); };
const allT = () => db.prepare('select dados, ativo from teachers order by ordem, rowid').all().map(r => Object.assign(JSON.parse(r.dados), { ativo: !!r.ativo }));
const getL = id => { const r = db.prepare('select dados from lessons where id=?').get(id); return r ? JSON.parse(r.dados) : null; };
const allL = () => db.prepare('select dados from lessons order by ordem, rowid').all().map(r => JSON.parse(r.dados));
const putL = l => db.prepare('insert into lessons(id, teacher_id, dados, ordem) values(?,?,?,?) on conflict(id) do update set dados=excluded.dados')
  .run(l.id, l.teacherId, JSON.stringify(l), agora());

// primeira vez: dados de demonstração + contas de demonstração dos professores
if (!db.prepare('select count(*) n from teachers').get().n) {
  const s = require('./seed.js')();
  const tx = db.transaction(() => {
    s.teachers.forEach((t, i) => db.prepare('insert into teachers(id, dados, ordem) values(?,?,?)').run(t.id, JSON.stringify(Object.assign(t, { pixKey: '', mp: null, demo: true })), i));
    s.lessons.forEach((l, i) => db.prepare('insert into lessons(id, teacher_id, dados, ordem) values(?,?,?,?)').run(l.id, l.teacherId, JSON.stringify(l), i));
    s.students.forEach(st => db.prepare('insert into demo_students(id, teacher_id, dados) values(?,?,?)').run(st.id, st.teacherId, JSON.stringify(st)));
  });
  tx();
  console.log('banco criado com dados de demonstração');
}
// 04/11/2026 (pedido do dono): sem turmas e sem pré-requisitos. Cada professor tem UMA mensalidade (todas as aulas,
// inclusive as novas) e preço avulso por aula. Converte o que já existia, uma vez só.
db.exec('create table if not exists meta(k text primary key, v text)');
if (!db.prepare("select 1 from meta where k='sem_turmas'").get()) {
  const DEMO = { yago: [45, 5], mila: [50, 6], bela: [55, 6] }; // mensalidade e avulso dos professores de demonstração
  db.transaction(() => {
    for (const t of allT()) {
      const d = t.demo && DEMO[t.id];
      t.pricing = { mode: 'passe', passPrice: d ? d[0] : (t.pricing && t.pricing.passPrice) || 50, billing: 'mensal' };
      t.turmas = []; putT(t);
      for (const r of db.prepare('select id, dados from demo_students where teacher_id=?').all(t.id)) {
        const st = JSON.parse(r.dados);
        if (st.plan.type !== 'avulso') { st.plan = { type: 'passe' }; st.paid = t.pricing.passPrice; }
        else if (d) st.paid = st.plan.ids.length * d[1];
        db.prepare('update demo_students set dados=? where id=?').run(JSON.stringify(st), r.id);
      }
    }
    for (const l of allL()) {
      const d = DEMO[l.teacherId] && getT(l.teacherId).demo && DEMO[l.teacherId];
      l.turmaId = null; l.prereq = { mode: 'all', ids: [] };
      if (d && l.price > 0) l.price = d[1];
      putL(l);
    }
    // quem tinha turma passa a ter a mensalidade do professor até a mesma data
    db.prepare("update access set kind='passe', ref=teacher_id where kind='turma'").run();
    db.prepare("insert into meta values('sem_turmas', ?)").run(String(agora()));
  })();
  console.log('convertido: sem turmas e sem pré-requisitos');
}
// contas fixas (vêm do .env): dono e professores de demonstração
function garanteConta(email, nome, senha, papel, teacherId) {
  if (!email || !senha) return;
  const u = db.prepare('select id from users where email=?').get(email.toLowerCase());
  if (u) db.prepare('update users set senha=?, papel=?, teacher_id=? where id=?').run(hash(senha), papel, teacherId || null, u.id);
  else db.prepare('insert into users values(?,?,?,?,?,?,?)').run(uid('u_'), email.toLowerCase(), nome, hash(senha), papel, teacherId || null, agora());
}
garanteConta(process.env.DONO_EMAIL, 'Dono MOVRA', process.env.DONO_SENHA, 'dono');
if (process.env.DEMO_SENHA) for (const t of allT().filter(t => t.demo)) garanteConta(`${t.id}@demo.movra`, t.name, process.env.DEMO_SENHA, 'professor', t.id);

/* ---------------- regras ---------------- */
function activeAccess(userId) {
  return db.prepare('select * from access where user_id=? and (expira is null or expira>?)').all(userId, agora());
}
function saldoDe(tid) {
  const ganho = db.prepare("select coalesce(sum(liquido),0) v from payments where teacher_id=? and status='aprovado' and split=0 and (demo=0 or ?)").get(tid, mpOn() ? 0 : 1).v;
  const saques = db.prepare("select coalesce(sum(valor),0) v from withdrawals where teacher_id=? and status in ('pedido','pago')").get(tid).v;
  return r2(ganho - saques);
}
function publicTeacher(t) {
  const { pixKey, mp, ...pub } = t;
  return Object.assign(pub, { mpConectado: !!(mp && mp.access_token) });
}
function preco(kind, ref) {
  if (kind === 'passe') {
    const t = getT(ref); if (!t) return null;
    return { t, valor: r2(t.pricing.passPrice), titulo: `${t.name} · mensalidade (todas as aulas)` };
  }
  if (kind === 'lesson') {
    const l = getL(ref); if (!l || !(l.price > 0)) return null;
    return { t: getT(l.teacherId), valor: r2(l.price), titulo: `${l.title} · aula avulsa` };
  }
  return null;
}
function aprovar(p) {
  if (p.status === 'aprovado') return;
  db.transaction(() => {
    db.prepare("update payments set status='aprovado', aprovado=? where id=?").run(agora(), p.id);
    if (p.kind === 'lesson') {
      db.prepare('insert into access values(?,?,?,?,?,?,?,?)').run(uid('a_'), p.user_id, p.teacher_id, p.kind, p.ref, null, p.id, agora());
    } else {
      const atual = db.prepare('select max(expira) e from access where user_id=? and kind=? and ref=?').get(p.user_id, p.kind, p.ref).e || 0;
      const exp = Math.max(atual, agora()) + MES;
      db.prepare('insert into access values(?,?,?,?,?,?,?,?)').run(uid('a_'), p.user_id, p.teacher_id, p.kind, p.ref, exp, p.id, agora());
    }
  })();
}
function revogar(p, status) {
  db.prepare('update payments set status=? where id=?').run(status, p.id);
  db.prepare('delete from access where payment_id=?').run(p.id);
}

/* ---------------- app ---------------- */
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });

function lerCookie(req, nome) {
  const m = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(nome + '='));
  return m ? decodeURIComponent(m.slice(nome.length + 1)) : null;
}
app.use((req, res, next) => {
  const tk = lerCookie(req, 'movra_s');
  if (tk) {
    const s = db.prepare('select u.* from sessions s join users u on u.id=s.user_id where s.token=? and s.criado>?').get(tk, agora() - 60 * 864e5);
    if (s) req.user = s;
  }
  next();
});
const precisa = (...papeis) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  if (papeis.length && !papeis.includes(req.user.papel)) return res.status(403).json({ erro: 'Sua conta não tem acesso a isso.' });
  next();
};
// professor (ou o dono olhando um professor)
function tidDe(req) {
  if (req.user.papel === 'professor') return req.user.teacher_id;
  if (req.user.papel === 'dono') return req.query.tid || req.body?.tid || allT()[0]?.id;
  return null;
}
function abrirSessao(res, userId) {
  const tk = crypto.randomBytes(32).toString('base64url');
  db.prepare('insert into sessions values(?,?,?)').run(tk, userId, agora());
  res.set('Set-Cookie', `movra_s=${tk}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 86400}`);
}
const tentativas = new Map();
function freio(req, res) {
  const k = req.ip, n = (tentativas.get(k) || []).filter(t => t > agora() - 10 * 60e3);
  n.push(agora()); tentativas.set(k, n);
  if (n.length > 20) { res.status(429).json({ erro: 'Muitas tentativas. Espere 10 minutos e tente de novo.' }); return true; }
  return false;
}

/* contas */
app.post('/api/cadastro', (req, res) => {
  if (freio(req, res)) return;
  const nome = String(req.body.nome || '').trim().slice(0, 80), email = String(req.body.email || '').trim().toLowerCase(), senha = String(req.body.senha || '');
  const papel = req.body.papel === 'professor' ? 'professor' : 'aluno';
  if (nome.length < 2) return res.status(400).json({ erro: 'Escreva seu nome.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' });
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  if (db.prepare('select 1 from users where email=?').get(email)) return res.status(400).json({ erro: 'Já existe uma conta com esse e-mail. Use "Entrar".' });
  let tid = null;
  if (papel === 'professor') {
    tid = nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'prof';
    while (getT(tid)) tid += '-' + crypto.randomBytes(2).toString('hex');
    const t = { id: tid, name: nome, city: 'Aulas online', hue: Math.floor(Math.random() * 360), styles: ['kpop'], photo: null,
      bio: 'Professor(a) na MOVRA.', pricing: { mode: 'passe', passPrice: 45, billing: 'mensal' }, turmas: [], pixKey: '', mp: null, demo: false };
    db.prepare('insert into teachers(id, dados, ordem) values(?,?,?)').run(tid, JSON.stringify(t), agora());
  }
  const id = uid('u_');
  db.prepare('insert into users values(?,?,?,?,?,?,?)').run(id, email, nome, hash(senha), papel, tid, agora());
  abrirSessao(res, id);
  res.json({ ok: true });
});
app.post('/api/entrar', (req, res) => {
  if (freio(req, res)) return;
  const u = db.prepare('select * from users where email=?').get(String(req.body.email || '').trim().toLowerCase());
  if (!u || !confere(String(req.body.senha || ''), u.senha)) return res.status(400).json({ erro: 'E-mail ou senha errados.' });
  abrirSessao(res, u.id);
  res.json({ ok: true });
});
app.post('/api/sair', (req, res) => {
  const tk = lerCookie(req, 'movra_s'); if (tk) db.prepare('delete from sessions where token=?').run(tk);
  res.set('Set-Cookie', 'movra_s=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.json({ ok: true });
});

/* estado da página */
function studioData(tid) {
  const t = getT(tid); if (!t) return null;
  const ls = allL().filter(l => l.teacherId === tid);
  const demo = db.prepare('select dados from demo_students where teacher_id=?').all(tid).map(r => Object.assign(JSON.parse(r.dados), { demo: true }));
  const rows = db.prepare(`select a.*, u.nome, u.id uid from access a join users u on u.id=a.user_id where a.teacher_id=? and (a.expira is null or a.expira>?) order by a.criado`).all(tid, agora());
  const porAluno = new Map();
  for (const a of rows) {
    const p = a.payment_id ? db.prepare('select valor, criado from payments where id=?').get(a.payment_id) : null;
    const s = porAluno.get(a.uid) || { id: a.uid, teacherId: tid, name: a.nome, plan: null, paid: 0, since: '', progress: 0, real: true };
    if (a.kind === 'lesson') { s.plan = s.plan && s.plan.type !== 'avulso' ? s.plan : { type: 'avulso', ids: [...(s.plan?.ids || []), a.ref] }; }
    else s.plan = { type: 'passe' };
    s.paid = r2(s.paid + (p ? p.valor : 0));
    s.since = new Date(a.criado).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    porAluno.set(a.uid, s);
  }
  for (const s of porAluno.values()) {
    const feitas = db.prepare(`select count(*) n from progress where user_id=? and lesson_id in (${ls.map(() => '?').join(',') || "''"})`).get(s.id, ...ls.map(l => l.id)).n;
    s.progress = ls.length ? Math.round(feitas / ls.length * 100) : 0;
  }
  const pagamentos = db.prepare("select p.id, p.titulo, p.valor, p.taxa, p.liquido, p.split, p.metodo, p.aprovado, p.demo, u.nome from payments p join users u on u.id=p.user_id where p.teacher_id=? and p.status='aprovado' order by p.aprovado desc limit 50").all(tid);
  const saques = db.prepare('select id, valor, pix, status, obs, criado, resolvido from withdrawals where teacher_id=? order by criado desc limit 30').all(tid);
  return { teacherId: tid, students: [...porAluno.values(), ...demo], pagamentos, saques, saldo: saldoDe(tid), pixKey: t.pixKey || '',
    mpConectado: !!(t.mp && t.mp.access_token), oauth: oauthOn(), lessonsCount: ls.length };
}
app.get('/api/estado', (req, res) => {
  const u = req.user;
  const teachers = allT().filter(t => t.ativo).map(publicTeacher);
  const lessons = allL().filter(l => teachers.some(t => t.id === l.teacherId));
  const done = u ? db.prepare('select lesson_id from progress where user_id=?').all(u.id).map(r => r.lesson_id) : [];
  const access = { turmas: [], passes: [], lessons: [] };
  if (u) for (const a of activeAccess(u.id)) access[{ turma: 'turmas', passe: 'passes', lesson: 'lessons' }[a.kind]].push(a.ref);
  let studio = null;
  if (u && (u.papel === 'professor' || u.papel === 'dono')) {
    const tid = tidDe(req);
    studio = studioData(tid);
    if (studio && u.papel === 'dono' && !teachers.some(t => t.id === tid)) teachers.push(publicTeacher(getT(tid)));
  }
  res.json({ user: u ? { nome: u.nome, email: u.email, papel: u.papel, teacherId: u.teacher_id } : null,
    pagamentoReal: mpOn(), teachers, lessons, done, access, studio });
});

/* progresso */
app.post('/api/progresso', precisa(), (req, res) => {
  const l = getL(req.body.lessonId); if (!l) return res.status(404).json({ erro: 'Aula não encontrada.' });
  if (req.body.done) {
    const ok = !(l.price > 0) || activeAccess(req.user.id).some(a => (a.kind === 'lesson' && a.ref === l.id) || (a.kind === 'passe' && a.ref === l.teacherId));
    if (!ok && req.user.papel === 'aluno') return res.status(403).json({ erro: 'Libere o acesso a esta aula primeiro.' });
    db.prepare('insert or ignore into progress values(?,?,?)').run(req.user.id, l.id, agora());
  } else db.prepare('delete from progress where user_id=? and lesson_id=?').run(req.user.id, l.id);
  res.json({ ok: true });
});

/* pagamentos */
async function mpFetch(url, token, opts = {}) {
  const r = await fetch('https://api.mercadopago.com' + url, Object.assign({}, opts, {
    headers: Object.assign({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, opts.headers || {})
  }));
  let j = null; try { j = await r.json(); } catch (e) { }
  return { ok: r.ok, status: r.status, j };
}
app.post('/api/pagar', precisa(), async (req, res) => {
  const { kind, ref } = req.body || {};
  const pr = preco(kind, ref);
  if (!pr || !(pr.valor > 0)) return res.status(400).json({ erro: 'Esse plano não está disponível.' });
  const t = pr.t, split = !!(t.mp && t.mp.access_token);
  const id = uid('p_'), taxa = r2(pr.valor * FEE), liquido = r2(pr.valor - taxa);
  const demo = !mpOn() && !split;
  db.prepare('insert into payments(id,user_id,teacher_id,kind,ref,titulo,valor,taxa,liquido,status,split,demo,criado) values(?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, req.user.id, t.id, kind, ref, pr.titulo, pr.valor, taxa, liquido, 'pendente', split ? 1 : 0, demo ? 1 : 0, agora());
  if (demo) return res.json({ id, demo: true });
  const token = split ? t.mp.access_token : MP.token;
  const body = {
    items: [{ id: String(ref), title: pr.titulo, quantity: 1, unit_price: pr.valor, currency_id: 'BRL' }],
    external_reference: id,
    payer: { email: req.user.email, name: req.user.nome },
    notification_url: `${BASE}/api/mp/webhook?p=${id}`,
    back_urls: { success: `${BASE}/#pago-${id}`, pending: `${BASE}/#pago-${id}`, failure: `${BASE}/#pago-${id}` },
    auto_return: 'approved',
    statement_descriptor: 'MOVRA',
    payment_methods: { installments: 1, excluded_payment_types: [{ id: 'ticket' }] }
  };
  if (split) body.marketplace_fee = taxa;
  const r = await mpFetch('/checkout/preferences', token, { method: 'POST', body: JSON.stringify(body), headers: { 'X-Idempotency-Key': id } }).catch(e => ({ ok: false, j: { message: e.message } }));
  if (!r.ok) {
    console.error('preferência MP falhou', r.status, JSON.stringify(r.j).slice(0, 400));
    db.prepare("update payments set status='erro' where id=?").run(id);
    return res.status(502).json({ erro: 'Não deu para abrir o pagamento agora. Tente de novo em alguns minutos.' });
  }
  db.prepare('update payments set mp_pref=? where id=?').run(r.j.id, id);
  res.json({ id, url: r.j.init_point });
});
// só quando o Mercado Pago ainda não está configurado (demonstração)
app.post('/api/pagar/simular', precisa(), (req, res) => {
  const p = db.prepare('select * from payments where id=? and user_id=?').get(req.body.id, req.user.id);
  if (!p || !p.demo) return res.status(400).json({ erro: 'Pagamento não encontrado.' });
  aprovar(p); res.json({ ok: true });
});
async function conferir(p, mpId) {
  const t = getT(p.teacher_id);
  const token = p.split ? t?.mp?.access_token : MP.token;
  if (!token) return;
  let pay = null;
  if (mpId) { const r = await mpFetch('/v1/payments/' + encodeURIComponent(mpId), token); if (r.ok) pay = r.j; }
  else {
    const r = await mpFetch('/v1/payments/search?sort=date_created&criteria=desc&external_reference=' + encodeURIComponent(p.id), token);
    if (r.ok && r.j.results && r.j.results.length) pay = r.j.results.find(x => x.status === 'approved') || r.j.results[0];
  }
  if (!pay || pay.external_reference !== p.id) return;
  if (Math.abs(Number(pay.transaction_amount) - p.valor) > 0.01) { console.error('valor diferente no pagamento', p.id); return; }
  const tarifa = r2((pay.fee_details || []).filter(f => f.type === 'mercadopago_fee').reduce((a, f) => a + Number(f.amount || 0), 0));
  db.prepare('update payments set mp_id=?, metodo=?, mp_tarifa=? where id=?').run(String(pay.id), pay.payment_type_id || null, tarifa, p.id);
  const atual = db.prepare('select * from payments where id=?').get(p.id);
  if (pay.status === 'approved') aprovar(atual);
  else if (['refunded', 'charged_back'].includes(pay.status)) revogar(atual, 'estornado');
  else if (['rejected', 'cancelled'].includes(pay.status) && atual.status !== 'aprovado') db.prepare("update payments set status='recusado' where id=?").run(p.id);
}
function assinaturaOk(req) {
  if (!MP.webhookSecret) return true; // conferimos o pagamento direto na API do MP de qualquer jeito
  const sig = String(req.headers['x-signature'] || ''), rid = String(req.headers['x-request-id'] || '');
  const parts = Object.fromEntries(sig.split(',').map(x => x.trim().split('=')));
  const dataId = String(req.query['data.id'] || req.body?.data?.id || '').toLowerCase();
  const man = `id:${dataId};request-id:${rid};ts:${parts.ts};`;
  const h = crypto.createHmac('sha256', MP.webhookSecret).update(man).digest('hex');
  return parts.v1 && h.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(parts.v1));
}
app.post('/api/mp/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const tipo = req.body?.type || req.query.type || req.query.topic;
    if (tipo && tipo !== 'payment') return;
    if (!assinaturaOk(req)) { console.error('webhook com assinatura inválida'); return; }
    const p = db.prepare('select * from payments where id=?').get(String(req.query.p || ''));
    const mpId = req.body?.data?.id || req.query['data.id'] || req.query.id;
    if (p && mpId) await conferir(p, mpId);
  } catch (e) { console.error('webhook', e.message); }
});
app.get('/api/pagamento/:id', precisa(), async (req, res) => {
  let p = db.prepare('select * from payments where id=? and user_id=?').get(req.params.id, req.user.id);
  if (!p) return res.status(404).json({ erro: 'Pagamento não encontrado.' });
  if (p.status === 'pendente' && !p.demo) { await conferir(p, null).catch(() => { }); p = db.prepare('select * from payments where id=?').get(p.id); }
  res.json({ status: p.status, titulo: p.titulo, valor: p.valor, teacherId: p.teacher_id, demo: !!p.demo });
});

/* professor */
const prof = precisa('professor', 'dono');
app.put('/api/professor/perfil', prof, (req, res) => {
  const t = getT(tidDe(req)); if (!t) return res.status(404).json({ erro: 'Professor não encontrado.' });
  const b = req.body || {};
  if (typeof b.bio === 'string') t.bio = b.bio.slice(0, 400);
  if (typeof b.photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(b.photo) && b.photo.length < 600000) t.photo = b.photo;
  if (typeof b.pixKey === 'string') t.pixKey = b.pixKey.trim().slice(0, 120);
  if (Array.isArray(b.styles)) t.styles = b.styles.filter(s => ['kpop', 'jazzfunk', 'autoral'].includes(s)).slice(0, 3);
  putT(t); res.json({ ok: true });
});
app.put('/api/professor/precos', prof, (req, res) => {
  const t = getT(tidDe(req)); if (!t) return res.status(404).json({ erro: 'Professor não encontrado.' });
  const v = Number(req.body?.pricing?.passPrice);
  if (!Number.isFinite(v) || v < 0) return res.status(400).json({ erro: 'Mensalidade inválida.' });
  t.pricing = { mode: 'passe', passPrice: r2(v), billing: 'mensal' }; t.turmas = [];
  putT(t); res.json({ ok: true });
});
const LVL = [0, 1, 2, 3], MODS = ['kpop', 'jazzfunk', 'autoral'], CATS = ['fundamentos', 'tecnica', 'coreografia', 'performance'];
app.post('/api/professor/aula', prof, (req, res) => {
  const tid = tidDe(req), t = getT(tid); if (!t) return res.status(404).json({ erro: 'Professor não encontrado.' });
  const b = req.body || {};
  const old = b.id ? getL(b.id) : null;
  if (old && old.teacherId !== tid) return res.status(403).json({ erro: 'Essa aula é de outro professor.' });
  const song = String(b.song || '').trim().slice(0, 80), artist = String(b.artist || '').trim().slice(0, 60);
  if (!song) return res.status(400).json({ erro: 'Escreva o título da aula.' });
  const l = Object.assign(old || { id: 'n' + crypto.randomBytes(5).toString('hex'), created: new Date().toISOString().slice(0, 10) }, {
    teacherId: tid, artist, song, title: artist ? `${artist} - ${song}` : song,
    modality: MODS.includes(b.modality) ? b.modality : 'kpop', category: CATS.includes(b.category) ? b.category : 'coreografia',
    level: LVL.includes(Number(b.level)) ? Number(b.level) : 0, orientation: b.orientation === 'v' ? 'v' : 'h',
    cropMobile: b.orientation === 'v' ? true : !!b.cropMobile, price: Math.max(0, r2(b.price)),
    duration: /^\d{1,3}:\d{2}$/.test(b.duration || '') ? b.duration : '15:00', bpm: 110,
    turmaId: null, prereq: { mode: 'all', ids: [] },
    hue: Number.isFinite(Number(b.hue)) ? Number(b.hue) % 360 : 260
  });
  putL(l); res.json({ ok: true, id: l.id });
});
app.delete('/api/professor/aula/:id', prof, (req, res) => {
  const tid = tidDe(req), l = getL(req.params.id);
  if (!l || l.teacherId !== tid) return res.status(404).json({ erro: 'Aula não encontrada.' });
  db.prepare('delete from lessons where id=?').run(l.id);
  res.json({ ok: true });
});
app.post('/api/professor/saque', prof, (req, res) => {
  const tid = tidDe(req), t = getT(tid);
  if (!t.pixKey) return res.status(400).json({ erro: 'Cadastre sua chave Pix antes de pedir o saque.' });
  const saldo = saldoDe(tid), v = r2(req.body.valor || saldo);
  if (v < SAQUE_MIN) return res.status(400).json({ erro: `O saque mínimo é R$ ${SAQUE_MIN},00.` });
  if (v > saldo) return res.status(400).json({ erro: 'Valor maior que o seu saldo.' });
  db.prepare('insert into withdrawals values(?,?,?,?,?,?,?,?)').run(uid('w_'), tid, v, t.pixKey, 'pedido', null, agora(), null);
  res.json({ ok: true });
});
// conectar a conta Mercado Pago do professor (divisão automática: 90% caem direto na conta dele)
app.get('/api/professor/mp/conectar', prof, (req, res) => {
  if (!oauthOn()) return res.status(400).send('A conexão com o Mercado Pago ainda não foi configurada pela MOVRA.');
  const state = crypto.randomBytes(16).toString('hex');
  db.prepare('insert into oauth_states values(?,?,?)').run(state, tidDe(req), agora());
  const u = new URL('https://auth.mercadopago.com.br/authorization');
  u.search = new URLSearchParams({ client_id: MP.clientId, response_type: 'code', platform_id: 'mp', state, redirect_uri: `${BASE}/api/mp/oauth` });
  res.redirect(u.toString());
});
app.get('/api/mp/oauth', async (req, res) => {
  const st = db.prepare('select * from oauth_states where state=? and criado>?').get(String(req.query.state || ''), agora() - 30 * 60e3);
  if (!st || !req.query.code) return res.redirect('/#studio-mp-erro');
  db.prepare('delete from oauth_states where state=?').run(st.state);
  const r = await fetch('https://api.mercadopago.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: MP.clientId, client_secret: MP.clientSecret, grant_type: 'authorization_code', code: String(req.query.code), redirect_uri: `${BASE}/api/mp/oauth` }) })
    .then(r => r.json().then(j => ({ ok: r.ok, j }))).catch(() => ({ ok: false }));
  if (!r.ok || !r.j.access_token) { console.error('oauth MP falhou', JSON.stringify(r.j || {}).slice(0, 300)); return res.redirect('/#studio-mp-erro'); }
  const t = getT(st.teacher_id);
  t.mp = { access_token: r.j.access_token, refresh_token: r.j.refresh_token, user_id: r.j.user_id, expira: agora() + (r.j.expires_in || 15552000) * 1000 };
  putT(t); res.redirect('/#studio-mp-ok');
});
// renova o token dos professores conectados (vale 180 dias) uma vez por dia
setInterval(async () => {
  if (!oauthOn()) return;
  for (const t of allT().filter(t => t.mp && t.mp.refresh_token && t.mp.expira < agora() + 20 * 864e5)) {
    const r = await fetch('https://api.mercadopago.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: MP.clientId, client_secret: MP.clientSecret, grant_type: 'refresh_token', refresh_token: t.mp.refresh_token }) })
      .then(r => r.json()).catch(() => null);
    if (r && r.access_token) { t.mp = Object.assign(t.mp, { access_token: r.access_token, refresh_token: r.refresh_token, expira: agora() + (r.expires_in || 15552000) * 1000 }); putT(t); }
  }
}, 864e5);

/* painel do dono */
const dono = precisa('dono');
app.get('/api/dono/resumo', dono, (req, res) => {
  const aprov = db.prepare("select * from payments where status='aprovado' and (demo=0 or ?)").all(mpOn() ? 0 : 1);
  const soma = (arr, k) => r2(arr.reduce((a, p) => a + Number(p[k] || 0), 0));
  const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
  const doMes = aprov.filter(p => p.aprovado >= mes.getTime());
  const viaMovra = aprov.filter(p => !p.split);
  const professores = allT().map(t => {
    const pt = aprov.filter(p => p.teacher_id === t.id);
    return { id: t.id, nome: t.name, ativo: t.ativo, demo: !!t.demo, vendido: soma(pt, 'valor'), saldo: saldoDe(t.id), pix: t.pixKey || '',
      mp: !!(t.mp && t.mp.access_token), alunos: db.prepare('select count(distinct user_id) n from access where teacher_id=? and (expira is null or expira>?)').get(t.id, agora()).n,
      aulas: allL().filter(l => l.teacherId === t.id).length };
  });
  const pagamentos = db.prepare("select p.*, u.nome aluno, u.email from payments p join users u on u.id=p.user_id order by p.criado desc limit 100").all()
    .map(p => Object.assign(p, { professor: getT(p.teacher_id)?.name || p.teacher_id }));
  const saques = db.prepare("select w.* from withdrawals w order by (w.status='pedido') desc, w.criado desc limit 100").all()
    .map(w => Object.assign(w, { professor: getT(w.teacher_id)?.name || w.teacher_id }));
  res.json({
    config: { mercadoPago: mpOn(), conexaoProfessores: oauthOn(), webhookAssinado: !!MP.webhookSecret, base: BASE },
    totais: {
      vendido: soma(aprov, 'valor'), vendidoMes: soma(doMes, 'valor'), taxaMovra: soma(aprov, 'taxa'), taxaMovraMes: soma(doMes, 'taxa'),
      tarifaMp: soma(viaMovra, 'mp_tarifa'), aRepassar: r2(professores.reduce((a, t) => a + Math.max(0, t.saldo), 0) + soma(saques.filter(w => w.status === 'pedido'), 'valor')),
      saquesPedidos: saques.filter(w => w.status === 'pedido').length, alunos: db.prepare("select count(*) n from users where papel='aluno'").get().n,
      pagamentosDemo: db.prepare("select count(*) n from payments where demo=1 and status='aprovado'").get().n
    },
    professores, pagamentos, saques
  });
});
app.post('/api/dono/saque/:id', dono, (req, res) => {
  const w = db.prepare('select * from withdrawals where id=?').get(req.params.id);
  if (!w || w.status !== 'pedido') return res.status(400).json({ erro: 'Esse saque já foi resolvido.' });
  const status = req.body.status === 'pago' ? 'pago' : 'recusado';
  db.prepare('update withdrawals set status=?, obs=?, resolvido=? where id=?').run(status, String(req.body.obs || '').slice(0, 200), agora(), w.id);
  res.json({ ok: true });
});
app.post('/api/dono/professor/:id', dono, (req, res) => {
  if (!getT(req.params.id)) return res.status(404).json({ erro: 'Professor não encontrado.' });
  db.prepare('update teachers set ativo=? where id=?').run(req.body.ativo ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

/* site */
const pub = path.join(__dirname, 'public');
app.use(express.static(pub, { index: false, maxAge: '5m' }));
app.get(['/', '/dono'], (req, res) => res.sendFile(path.join(pub, 'index.html')));
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use((req, res) => res.redirect('/'));
app.listen(PORT, () => console.log('MOVRA na porta', PORT, '| Mercado Pago:', mpOn() ? 'ligado' : 'demonstração', '| conexão de professores:', oauthOn() ? 'ligada' : 'desligada'));
