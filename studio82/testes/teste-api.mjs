// Teste da API do Studio 82: node teste-api.mjs <base> <video>
import fs from 'node:fs';
const B = process.argv[2] || 'http://localhost:4199';
const VID = fs.readFileSync(process.argv[3]);
let falhas = 0;
const ok = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); if (!c) falhas++; };
function cliente() {
  let ck = '';
  return async (url, body, metodo) => {
    const r = await fetch(B + url, { method: metodo || (body !== undefined ? 'POST' : 'GET'), headers: { cookie: ck, ...(body !== undefined && !(body instanceof Uint8Array) ? { 'content-type': 'application/json' } : {}) }, body: body instanceof Uint8Array ? body : body !== undefined ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) ck = sc.split(';')[0];
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
    return { s: r.status, j, h: r.headers };
  };
}
const adm = cliente(), alu = cliente();
ok((await adm('/api/entrar', { email: 'olly@studio82', senha: 'errada' })).s === 401, 'senha errada recusada');
ok((await adm('/api/entrar', { email: 'OLLY@studio82', senha: 'teste123' })).s === 200, 'admin entra');
const cria = async (o) => (await adm('/api/admin/aula', { publicado: true, ...o })).j.aula;
const A = await cria({ titulo: 'Passo base: Body Roll', estilo: 'kpop', nivel: 'Iniciante', bio: 'O passo que abre tudo.' });
const Bq = await cria({ titulo: 'Coreo 1', estilo: 'kpop', nivel: 'Básico', req: { aulas: [A.id] } });
const C = await cria({ titulo: 'Coreo 2', estilo: 'kpop', nivel: 'Básico' });
// "Ao concluir A, libera C" pelo outro lado
await cria({ id: A.id, titulo: A.titulo, estilo: 'kpop', nivel: 'Iniciante', bio: A.bio, libera: [Bq.id, C.id] });
const D = await cria({ titulo: 'Intermediário', estilo: 'kpop', nivel: 'Intermediário', req: { min: 2, minEstilo: 'kpop' } });
const G = await cria({ titulo: 'Guest: Krump', estilo: 'street', convidado: { nome: 'Dani Guest', insta: '@dani', bio: 'Convidada.' } });
ok(G.professor === 'Dani Guest' && G.convidado.insta === 'dani', 'convidado do street');
// envio em pedaços
for (const a of [A, Bq, C, D, G]) {
  const parte = Math.ceil(VID.length / 3);
  let ini = 0, r;
  while (ini < VID.length) { r = await adm(`/api/admin/upload?id=${a.id}&ini=${ini}&total=${VID.length}`, new Uint8Array(VID.subarray(ini, ini + parte)), 'PUT'); ini = r.j.tem; }
  ok(r.j.fim, 'upload em 3 pedaços ' + a.titulo);
}
ok((await adm(`/api/admin/upload?id=${A.id}&ini=999&total=${VID.length}`, new Uint8Array(4), 'PUT')).s >= 400, 'pedaço fora de ordem recusado');
for (let i = 0; i < 120; i++) { const l = (await adm('/api/aulas')).j.aulas; if (l.every((a) => a.estado === 'pronto' || a.estado === 'erro')) break; await new Promise((o) => setTimeout(o, 1000)); }
const lA = (await adm('/api/aulas')).j.aulas;
ok(lA.every((a) => a.estado === 'pronto' && a.duracao > 19 && a.temCapa), 'todos os vídeos prontos com duração e capa: ' + lA.map((a) => a.estado + '/' + Math.round(a.duracao)).join(','));
ok(lA.find((a) => a.id === C.id).req.aulas.includes(A.id), '"libera" gravou o requisito em C');
// aluno
ok((await alu('/api/cadastro', { nome: 'Ana Souza', email: 'ana@x.com', senha: '123456' })).j.pendente, 'cadastro fica pendente');
ok((await alu('/api/entrar', { email: 'ana@x.com', senha: '123456' })).s === 403, 'pendente não entra');
const al = (await adm('/api/admin/alunos')).j.alunos;
await adm('/api/admin/aluno', { id: al[0].id, status: 'ativo' });
ok((await alu('/api/entrar', { email: 'ana@x.com', senha: '123456' })).s === 200, 'aluno liberado entra');
ok((await alu('/api/admin/alunos')).s === 403, 'aluno não acessa área do professor');
let l = (await alu('/api/aulas')).j.aulas;
const tr = (id) => l.find((a) => a.id === id).trancada;
ok(!tr(A.id) && tr(Bq.id) && tr(C.id) && tr(D.id), 'B, C e D trancadas; A aberta');
ok((await alu('/media/v/' + Bq.id)).s === 403, 'vídeo trancado não baixa');
const rg = await fetch(B + '/media/v/' + A.id, { headers: { cookie: '', range: 'bytes=0-99' } });
ok(rg.status === 401, 'vídeo sem login = 401');
ok((await alu('/api/progresso', { id: Bq.id, dt: 10 })).s === 403, 'progresso em aula trancada recusado');
let r;
for (let i = 0; i < 3; i++) r = (await alu('/api/progresso', { id: A.id, dt: 6, pos: 6 * i })).j;
ok(r.nova && r.liberou.length === 2, 'concluiu A e liberou 2 aulas: ' + JSON.stringify(r.liberou));
l = (await alu('/api/aulas')).j.aulas;
ok(!tr(Bq.id) && !tr(C.id) && tr(D.id), 'B e C liberadas, D ainda trancada (precisa 2 de K-Pop)');
ok(l.find((a) => a.id === D.id).motivos[0].txt === 'Faça mais 1 aula de K-Pop', 'motivo de D: ' + l.find((a) => a.id === D.id).motivos[0].txt);
await adm('/api/admin/aluno', { id: al[0].id, aula: C.id, feita: true });
l = (await alu('/api/aulas')).j.aulas;
ok(!tr(D.id), 'professor marcou C como feita -> D liberada');
await adm('/api/admin/aluno', { id: al[0].id, aula: C.id, feita: false });
await adm('/api/admin/aluno', { id: al[0].id, aula: D.id, liberar: true });
l = (await alu('/api/aulas')).j.aulas;
ok(!tr(D.id), 'liberação manual de D funciona');
// Range
const ck = await (async () => { const x = await fetch(B + '/api/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ana@x.com', senha: '123456' }) }); return x.headers.get('set-cookie').split(';')[0]; })();
const rr = await fetch(B + '/media/v/' + A.id, { headers: { cookie: ck, range: 'bytes=100-199' } });
ok(rr.status === 206 && (await rr.arrayBuffer()).byteLength === 100, 'vídeo com Range 206');
ok((await fetch(B + '/media/c/' + A.id, { headers: { cookie: ck } })).headers.get('content-type') === 'image/jpeg', 'capa jpg');
// CSRF
ok((await fetch(B + '/api/progresso', { method: 'POST', headers: { cookie: ck, origin: 'https://mal.com', 'content-type': 'application/json' }, body: '{}' })).status === 403, 'POST de outro site recusado');
// apagar
await adm('/api/admin/aula/apagar', { id: G.id });
ok(!(await adm('/api/aulas')).j.aulas.some((a) => a.id === G.id), 'aula apagada');
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
