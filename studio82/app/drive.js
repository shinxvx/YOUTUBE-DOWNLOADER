// Google Drive: guarda os vídeos das aulas numa pasta do Drive do estúdio e devolve para o player pelo servidor.
// Conexão por OAuth com o cliente do próprio estúdio (escopo drive.file: o app só enxerga os arquivos que ele criou).
'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');

// Endereços do Google (trocáveis só para teste com um Google falso)
const URL_AUTH = process.env.G_AUTH || 'https://accounts.google.com/o/oauth2/v2/auth';
const URL_TOKEN = process.env.G_TOKEN || 'https://oauth2.googleapis.com/token';
const URL_API = process.env.G_API || 'https://www.googleapis.com';
const URL_INFO = process.env.G_INFO || 'https://openidconnect.googleapis.com/v1/userinfo';
const ESCOPO = 'openid email https://www.googleapis.com/auth/drive.file';
const PEDACO = +process.env.G_PEDACO || 32 * 1024 * 1024; // múltiplo de 256 KB, como o Drive pede

module.exports = function criaDrive({ db, salvar, VID }) {
  db.drive ??= {};
  const D = db.drive;
  const G = { tok: '', exp: 0, estados: new Map(), enviando: null };
  const conectado = () => !!(D.refresh && D.clientId && D.clientSecret);
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

  async function token() {
    if (G.tok && Date.now() < G.exp - 60e3) return G.tok;
    const r = await fetch(URL_TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: D.clientId, client_secret: D.clientSecret, refresh_token: D.refresh, grant_type: 'refresh_token' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      D.erro = j.error === 'invalid_grant' ? 'A conexão com o Google expirou ou foi removida. Clique em “Conectar de novo”.' : 'O Google recusou a conexão: ' + (j.error_description || j.error || r.status);
      salvar(); throw new Error(D.erro);
    }
    if (D.erro) { D.erro = ''; salvar(); }
    G.tok = j.access_token; G.exp = Date.now() + (j.expires_in || 3600) * 1000;
    return G.tok;
  }
  async function api(url, op = {}) {
    const t = await token();
    return fetch(url.startsWith('http') ? url : URL_API + url, { ...op, headers: { ...(op.headers || {}), Authorization: 'Bearer ' + t } });
  }
  async function apiJson(url, op) {
    const r = await api(url, op);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || 'Drive respondeu ' + r.status);
    return j;
  }

  // ----- Conectar -----
  function linkConectar(redirect, uid) {
    const st = crypto.randomBytes(18).toString('base64url');
    G.estados.set(st, { redirect, uid, ate: Date.now() + 15 * 60e3 });
    return URL_AUTH + '?' + new URLSearchParams({ client_id: D.clientId, redirect_uri: redirect, response_type: 'code', scope: ESCOPO, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: st });
  }
  async function volta(code, st, uid) {
    const e = G.estados.get(st); G.estados.delete(st);
    if (!e || e.ate < Date.now() || e.uid !== uid) throw new Error('O link de conexão venceu. Tente de novo.');
    const r = await fetch(URL_TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: D.clientId, client_secret: D.clientSecret, redirect_uri: e.redirect, grant_type: 'authorization_code' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.refresh_token) throw new Error('O Google não liberou o acesso: ' + (j.error_description || j.error || 'sem refresh_token'));
    const info = await fetch(URL_INFO, { headers: { Authorization: 'Bearer ' + j.access_token } }).then((x) => x.json()).catch(() => ({}));
    if (D.email && info.email && D.email !== info.email && D.pasta) D.pasta = ''; // conta diferente: pasta nova
    D.refresh = j.refresh_token; D.email = info.email || ''; D.erro = '';
    G.tok = j.access_token; G.exp = Date.now() + (j.expires_in || 3600) * 1000;
    if (!D.pasta) {
      const f = await apiJson('/drive/v3/files?fields=id', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Studio 82 Training — vídeos das aulas', mimeType: 'application/vnd.google-apps.folder' }) });
      D.pasta = f.id;
    }
    salvar();
    setTimeout(fila, 1000);
  }
  function desconectar() { D.refresh = ''; D.erro = ''; G.tok = ''; salvar(); }

  async function estado() {
    const s = { cliente: !!(D.clientId && D.clientSecret), clientId: D.clientId || '', conectado: conectado(), email: D.email || '', erro: D.erro || '', pasta: D.pasta || '' };
    const local = db.aulas.filter((a) => fs.existsSync(path.join(VID, a.id + '.mp4')));
    s.noDrive = db.aulas.filter((a) => a.drive).length;
    s.noServidor = local.filter((a) => !a.drive).length;
    s.enviando = G.enviando ? { titulo: G.enviando.titulo, prog: G.enviando.driveProg || 0 } : null;
    if (s.conectado && !s.erro) {
      try { const q = (await apiJson('/drive/v3/about?fields=storageQuota')).storageQuota; s.uso = { usado: +q.usage || 0, total: +q.limit || 0 }; } catch (e) { s.erroUso = e.message; }
    }
    return s;
  }

  // ----- Envio (upload retomável em pedaços) -----
  async function envia(a) {
    const arq = path.join(VID, a.id + '.mp4');
    const tam = (await fsp.stat(arq)).size;
    const ini = await api('/upload/drive/v3/files?uploadType=resumable&fields=id', { method: 'POST',
      headers: { 'content-type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(tam) },
      body: JSON.stringify({ name: `${a.titulo} [${a.id}].mp4`, parents: D.pasta ? [D.pasta] : undefined, appProperties: { studio82: a.id } }) });
    if (!ini.ok) throw new Error('Drive recusou o envio (' + ini.status + '): ' + (await ini.text()).slice(0, 200));
    const loc = ini.headers.get('location');
    const fh = await fsp.open(arq);
    let pos = 0, falhas = 0;
    try {
      for (;;) {
        const n = Math.min(PEDACO, tam - pos);
        const buf = Buffer.alloc(n); await fh.read(buf, 0, n, pos);
        let r;
        try { r = await fetch(loc, { method: 'PUT', headers: { 'Content-Range': `bytes ${pos}-${pos + n - 1}/${tam}` }, body: buf }); } catch { r = null; }
        if (r && (r.status === 200 || r.status === 201)) return (await r.json()).id;
        if (r && r.status === 308) { const rg = r.headers.get('range'); pos = rg ? +rg.split('-')[1] + 1 : 0; falhas = 0; a.driveProg = pos / tam; continue; }
        if (r && r.status < 500 && r.status !== 429) throw new Error('Drive ' + r.status + ': ' + (await r.text()).slice(0, 200));
        if (++falhas > 6) throw new Error('A internet caiu várias vezes no envio ao Drive');
        await espera(2000 * falhas);
        // Pergunta ao Drive quanto ele já recebeu e continua dali
        const q = await fetch(loc, { method: 'PUT', headers: { 'Content-Range': `bytes */${tam}` } }).catch(() => null);
        if (q && (q.status === 200 || q.status === 201)) return (await q.json()).id;
        if (q && q.status === 308) { const rg = q.headers.get('range'); pos = rg ? +rg.split('-')[1] + 1 : 0; }
      }
    } finally { await fh.close(); }
  }
  async function apaga(id) { if (id && conectado()) { try { await api('/drive/v3/files/' + id, { method: 'DELETE' }); } catch (e) { console.error('apagar no Drive', e.message); } } }

  // Fila: manda ao Drive, um por vez, os vídeos prontos que ainda estão no disco do servidor; depois apaga a cópia local
  async function fila() {
    if (G.enviando || !conectado() || D.erro) return;
    const a = db.aulas.find((x) => x.estado === 'pronto' && !x.drive && !(x.driveErroAte > Date.now()) && fs.existsSync(path.join(VID, x.id + '.mp4')));
    if (!a) return;
    G.enviando = a; a.driveProg = 0;
    const versao = a.v;
    try {
      const id = await envia(a);
      if (!db.aulas.includes(a) || a.v !== versao) { await apaga(id); } // apagada ou vídeo trocado durante o envio
      else { a.drive = id; a.driveErro = ''; delete a.driveErroAte; salvar(); await fsp.rm(path.join(VID, a.id + '.mp4'), { force: true }); }
    } catch (e) {
      console.error('envio ao Drive:', e.message);
      a.driveErro = String(e.message).slice(0, 200); a.driveErroAte = Date.now() + 10 * 60e3;
    } finally { G.enviando = null; delete a.driveProg; salvar(); setTimeout(fila, 1500); }
  }
  setInterval(fila, 5 * 60e3);
  setTimeout(fila, 5000);

  // Player: repassa o pedaço pedido (Range) direto do Drive
  async function stream(req, res, id, cab) {
    const ac = new AbortController();
    res.on('close', () => ac.abort());
    try {
      const h = req.headers.range ? { Range: req.headers.range } : {};
      const r = await api(`/drive/v3/files/${id}?alt=media`, { headers: h, signal: ac.signal });
      if (r.status !== 200 && r.status !== 206) { res.writeHead(r.status === 416 ? 416 : 502); r.body?.cancel().catch(() => {}); return res.end(); }
      cab(res, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' });
      const hh = {};
      for (const k of ['content-length', 'content-range']) { const v = r.headers.get(k); if (v) hh[k] = v; }
      res.writeHead(r.status, hh);
      if (req.method === 'HEAD') { ac.abort(); return res.end(); }
      Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
    } catch (e) {
      if (!res.headersSent) { res.writeHead(502); res.end(); } else res.destroy();
    }
  }
  // Para o ffmpeg ler o vídeo direto do Drive (capa escolhida pelo professor)
  async function entradaFfmpeg(id) {
    return { cab: `Authorization: Bearer ${await token()}\r\n`, url: `${URL_API}/drive/v3/files/${id}?alt=media` };
  }

  return { conectado, linkConectar, volta, desconectar, estado, fila, apaga, stream, entradaFfmpeg, salvaCliente(id, sec) { D.clientId = id; D.clientSecret = sec; D.refresh = ''; D.erro = ''; G.tok = ''; salvar(); } };
};
