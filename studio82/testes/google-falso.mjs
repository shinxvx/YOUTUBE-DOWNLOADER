// Google falso para testar a ligação com o Drive sem conta de verdade: node google-falso.mjs <porta>
import http from 'node:http';
const PORTA = +process.argv[2] || 4300;
const B = `http://localhost:${PORTA}`;
export const G = { arquivos: new Map(), sessoes: new Map(), apagados: [], n: 0, falhaUmaVez: true, refreshQuebrado: false, log: [] };
const json = (res, c, o, h = {}) => { res.writeHead(c, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(o)); };
const corpo = (req) => new Promise((ok) => { const b = []; req.on('data', (c) => b.push(c)); req.on('end', () => ok(Buffer.concat(b))); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, B); const p = u.pathname; const b = await corpo(req);
  G.log.push(req.method + ' ' + p);
  if (p === '/__estado') return json(res, 200, { arquivos: [...G.arquivos].map(([id, f]) => ({ id, nome: f.nome, tam: f.dados.length, pais: f.pais })), apagados: G.apagados });
  if (p === '/__quebra') { G.refreshQuebrado = true; return json(res, 200, {}); }
  if (p === '/token') {
    const f = new URLSearchParams(b.toString());
    if (f.get('grant_type') === 'authorization_code') return f.get('code') === 'codigo-bom' ? json(res, 200, { access_token: 'tok-a', refresh_token: 'ref-1', expires_in: 3600 }) : json(res, 400, { error: 'invalid_grant' });
    if (G.refreshQuebrado) return json(res, 400, { error: 'invalid_grant' });
    return json(res, 200, { access_token: 'tok-r' + ++G.n, expires_in: 3600 });
  }
  if (p === '/userinfo') return json(res, 200, { email: 'studio82.aulas@gmail.com' });
  if (!/^Bearer tok-/.test(req.headers.authorization || '') && !p.startsWith('/up/')) return json(res, 401, { error: { message: 'sem token' } });
  if (p === '/drive/v3/files' && req.method === 'POST') { const m = JSON.parse(b); const id = 'pasta-' + ++G.n; G.arquivos.set(id, { nome: m.name, dados: Buffer.alloc(0), pasta: true }); return json(res, 200, { id }); }
  if (p === '/upload/drive/v3/files') { const m = JSON.parse(b); const s = 's' + ++G.n; G.sessoes.set(s, { nome: m.name, pais: m.parents, tam: +req.headers['x-upload-content-length'], partes: [] , rec: 0 }); res.writeHead(200, { location: `${B}/up/${s}` }); return res.end(); }
  if (p.startsWith('/up/')) {
    const s = G.sessoes.get(p.slice(4)); const cr = req.headers['content-range'];
    const range = s.rec ? { range: `bytes=0-${s.rec - 1}` } : {};
    if (/^bytes \*\//.test(cr)) { res.writeHead(308, range); return res.end(); }
    if (G.falhaUmaVez && s.rec > 0) { G.falhaUmaVez = false; res.writeHead(503); return res.end(); } // simula queda no meio
    const [, a, z] = /bytes (\d+)-(\d+)\//.exec(cr).map(Number);
    if (a !== s.rec) { res.writeHead(308, range); return res.end(); }
    s.partes.push(b); s.rec += b.length;
    if (s.rec >= s.tam) { const id = 'video-' + ++G.n; G.arquivos.set(id, { nome: s.nome, pais: s.pais, dados: Buffer.concat(s.partes) }); return json(res, 200, { id }); }
    res.writeHead(308, { range: `bytes=0-${s.rec - 1}` }); return res.end();
  }
  const m = /^\/drive\/v3\/files\/([\w-]+)$/.exec(p);
  if (m && req.method === 'DELETE') { G.arquivos.delete(m[1]); G.apagados.push(m[1]); res.writeHead(204); return res.end(); }
  if (m && u.searchParams.get('alt') === 'media') {
    const f = G.arquivos.get(m[1]); if (!f) return json(res, 404, {});
    const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (!r) { res.writeHead(200, { 'content-length': f.dados.length, 'content-type': 'video/mp4' }); return res.end(f.dados); }
    const ini = +r[1] || 0, fim = r[2] ? Math.min(+r[2], f.dados.length - 1) : f.dados.length - 1;
    res.writeHead(206, { 'content-range': `bytes ${ini}-${fim}/${f.dados.length}`, 'content-length': fim - ini + 1, 'content-type': 'video/mp4' });
    return res.end(f.dados.subarray(ini, fim + 1));
  }
  if (p === '/drive/v3/about') return json(res, 200, { storageQuota: { usage: String([...G.arquivos.values()].reduce((s, f) => s + f.dados.length, 0)), limit: '16106127360' } });
  json(res, 404, { error: { message: 'rota falsa não existe ' + p } });
}).listen(PORTA, () => console.log('Google falso na porta ' + PORTA));
