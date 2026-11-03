// Teste da ligação com o Google Drive usando o google-falso.mjs: node teste-drive.mjs <site> <google-falso> <pasta-videos-do-servidor> <video.mp4>
import fs from 'node:fs';
import crypto from 'node:crypto';
const [B, GF, VID, VIDEO] = process.argv.slice(2);
let falhas = 0;
const ok = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); if (!c) falhas++; };
const espera = (ms) => new Promise((o) => setTimeout(o, ms));
let ck = '';
async function f(url, body, op = {}) {
  const r = await fetch(B + url, { method: op.metodo || (body !== undefined ? 'POST' : 'GET'), redirect: 'manual', headers: { cookie: ck, ...(body !== undefined && !(body instanceof Uint8Array) ? { 'content-type': 'application/json' } : {}) }, body: body instanceof Uint8Array ? body : body !== undefined ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc && !op.semCookie) ck = sc.split(';')[0];
  return r;
}
const j = async (...a) => (await f(...a)).json();
const sha = (b) => crypto.createHash('sha1').update(b).digest('hex');
await f('/api/entrar', { email: 'olly@studio82', senha: 'teste123' });
let s = await j('/api/admin/drive');
ok(!s.cliente && !s.conectado && /\/api\/admin\/drive\/volta$/.test(s.redirect), 'começa sem Drive e mostra o endereço de retorno: ' + s.redirect);
ok((await f('/api/admin/drive/cliente', { clientId: 'errado', clientSecret: 'x' })).status === 400, 'ID de cliente inválido recusado');
ok((await f('/api/admin/drive/cliente', { clientId: '123-abc.apps.googleusercontent.com', clientSecret: 'GOCSPX-segredo123' })).ok, 'ID e chave salvos');
let r = await f('/api/admin/drive/conectar');
const loc = new URL(r.headers.get('location'));
ok(r.status === 302 && loc.searchParams.get('access_type') === 'offline' && loc.searchParams.get('scope').includes('drive.file'), 'conectar manda ao Google pedindo acesso offline só aos arquivos do app');
const st = loc.searchParams.get('state');
r = await f('/api/admin/drive/volta?code=codigo-errado&state=' + st);
ok(decodeURIComponent(r.headers.get('location')).includes('drive=O Google não liberou'), 'código errado mostra erro');
r = await f('/api/admin/drive/conectar'); const st2 = new URL(r.headers.get('location')).searchParams.get('state');
r = await f('/api/admin/drive/volta?code=codigo-bom&state=' + st2);
ok(r.headers.get('location') === '/?drive=ok#/professor/ajustes', 'volta do Google conecta');
ok((await f('/api/admin/drive/volta?code=codigo-bom&state=' + st2)).headers.get('location').includes('venceu'), 'o mesmo link de volta não serve duas vezes');
s = await j('/api/admin/drive');
ok(s.conectado && s.email === 'studio82.aulas@gmail.com' && s.pasta.startsWith('pasta-'), 'conectado, com e-mail e pasta criada');
// vídeos locais vão sozinhos para o Drive e saem do disco
const aulas = (await j('/api/aulas')).aulas.filter((a) => a.estado === 'pronto');
const hashes = Object.fromEntries(aulas.map((a) => [a.id, sha(fs.readFileSync(`${VID}/${a.id}.mp4`))]));
for (let i = 0; i < 90; i++) { s = await j('/api/admin/drive'); if (!s.noServidor && !s.enviando) break; await espera(1000); }
ok(s.noDrive === aulas.length && s.noServidor === 0, `todos os ${aulas.length} vídeos foram para o Drive`);
ok(aulas.every((a) => !fs.existsSync(`${VID}/${a.id}.mp4`)), 'cópias do servidor apagadas (disco livre)');
ok(fs.existsSync(`${VID}/${aulas[0].id}.jpg`), 'capas continuam no servidor (pequenas)');
const est = await (await fetch(GF + '/__estado')).json();
ok(est.arquivos.filter((x) => x.id.startsWith('video-')).every((x) => x.pais[0] === s.pasta), 'vídeos dentro da pasta do estúdio');
ok(s.uso && s.uso.total > 0 && s.uso.usado > 0, 'mostra espaço usado do Drive');
const l2 = (await j('/api/aulas')).aulas;
ok(l2.filter((a) => a.estado === 'pronto').every((a) => a.onde === 'drive'), 'lista marca as aulas como "No Drive"');
// tocar: vídeo inteiro e pedaço (Range) vindos do Drive
const a0 = aulas[0];
r = await f('/media/v/' + a0.id);
const tudo = Buffer.from(await r.arrayBuffer());
ok(r.status === 200 && sha(tudo) === hashes[a0.id], 'vídeo tocado pelo Drive é idêntico ao original');
r = await fetch(B + '/media/v/' + a0.id, { headers: { cookie: ck, range: 'bytes=1000-1999' } });
const ped = Buffer.from(await r.arrayBuffer());
ok(r.status === 206 && ped.length === 1000 && r.headers.get('content-range') === `bytes 1000-1999/${tudo.length}` && ped.equals(tudo.subarray(1000, 2000)), 'pular no vídeo (Range 206) funciona pelo Drive');
ok((await fetch(B + '/media/v/' + a0.id)).status === 401, 'sem login continua bloqueado');
// capa escolhida lendo do Drive
const c = await j('/api/admin/capa', { id: a0.id, t: 7 });
ok(c.ok, 'trocar a capa lendo o vídeo do Drive');
// vídeo novo numa aula que já está no Drive: substitui e apaga o antigo
const velho = (await (await fetch(GF + '/__estado')).json()).arquivos.find((x) => x.nome.includes(a0.id)).id;
const V = fs.readFileSync(VIDEO);
r = await f(`/api/admin/upload?id=${a0.id}&ini=0&total=${V.length}`, new Uint8Array(V), { metodo: 'PUT' });
for (let i = 0; i < 120; i++) { const a = (await j('/api/aulas')).aulas.find((x) => x.id === a0.id); if (a.onde === 'drive' && a.estado === 'pronto' && a.driveProg == null) break; await espera(1000); }
const e2 = await (await fetch(GF + '/__estado')).json();
ok(e2.apagados.includes(velho) && e2.arquivos.some((x) => x.nome.includes(a0.id) && x.id !== velho), 'vídeo trocado: o novo foi ao Drive e o antigo foi apagado de lá');
// apagar aula apaga no Drive
const a1 = aulas[1]; const id1 = e2.arquivos.find((x) => x.nome.includes(a1.id)).id;
await j('/api/admin/aula/apagar', { id: a1.id }); await espera(500);
ok((await (await fetch(GF + '/__estado')).json()).apagados.includes(id1), 'apagar a aula apaga o vídeo no Drive');
// conexão vencida
await fetch(GF + '/__quebra');
await espera(200);
// força renovar o token: desconecta não; o token atual vale 1 h, então simula com Range de outra aula depois de zerar
s = await j('/api/admin/drive');
console.log('   (estado com token ainda válido:', s.erro || 'sem erro', ')');
await f('/api/admin/drive/desconectar', {});
s = await j('/api/admin/drive');
ok(!s.conectado && s.cliente, 'desconectar mantém o ID do cliente para reconectar');
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
