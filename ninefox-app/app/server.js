'use strict';
// NINEFOX (06/11/2026): 3 sites num servidor só, escolhidos pelo endereço (ver sites.js / HOSTS_* no .env).
// Sem dependências. Ofertas: ofertas.js (API de Afiliados Shopee da conta NINEFOX). Marca: app/marca (SVGs do kit do dono).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { SITES, siteDoHost } = require('./sites');
const ofertas = require('./ofertas');
const paginas = require('./paginas');

const PORTA = Number(process.env.PORT) || 4191;
const MARCA = path.join(__dirname, 'marca');
const TIPOS = { svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon' };
const CSP = "default-src 'none'; img-src 'self' https://cf.shopee.com.br https://down-br.img.susercontent.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const log = (...a) => console.log(new Date().toISOString(), ...a);
const lista = (v) => String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
let _vm = { em: 0, v: '' };
function versaoMarca() { // muda quando qualquer arquivo de app/marca muda (relida no máximo 1x por minuto)
  if (Date.now() - _vm.em < 60000) return _vm.v;
  try { const h = require('crypto').createHash('md5'); for (const f of fs.readdirSync(MARCA).sort()) { const s = fs.statSync(path.join(MARCA, f)); h.update(f + s.size + s.mtimeMs); } _vm = { em: Date.now(), v: h.digest('hex').slice(0, 8) }; } catch { /* sem pasta */ }
  return _vm.v;
}

function enviar(res, cod, tipo, corpo, extra = {}) {
  res.writeHead(cod, { 'Content-Type': tipo, 'Content-Length': Buffer.byteLength(corpo), 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...extra });
  res.end(corpo);
}

const servidor = http.createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return enviar(res, 405, 'text/plain; charset=utf-8', 'método não permitido');
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/saude') return enviar(res, 200, 'application/json', JSON.stringify({ ok: true, api: ofertas.pronta() }));
    const m = /^\/(marca|exemplo)\/([a-z0-9-]+\.(svg|png|ico))$/.exec(u.pathname);
    if (m) {
      let b; try { b = fs.readFileSync(path.join(__dirname, m[1], m[2])); } catch { return enviar(res, 404, 'text/plain; charset=utf-8', 'não encontrado'); }
      m[2] = m[3];
      return enviar(res, 200, TIPOS[m[2]], b, { 'Cache-Control': 'public, max-age=86400' });
    }
    let site = siteDoHost(req.headers.host);
    if (!site && process.env.DEV === '1') site = SITES[u.searchParams.get('site')] || SITES.inst; // teste local
    if (!site) return enviar(res, 404, 'text/plain; charset=utf-8', 'site não encontrado');
    // HOSTS_EMBREVE: endereços que ainda NÃO estão liberados pelo dono -> página "em breve" (site completo só nas prévias trancadas)
    if (lista(process.env.HOSTS_EMBREVE).includes(String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '')))
      return enviar(res, 200, 'text/html; charset=utf-8', paginas.emBreve(site).replace(/(\/marca\/[a-z0-9-]+\.(?:svg|png|ico))"/g, `$1?v=${versaoMarca()}"`), { 'Cache-Control': 'no-cache', 'Content-Security-Policy': CSP, 'X-Robots-Tag': 'noindex' });
    if (u.pathname !== '/') return enviar(res, 404, 'text/html; charset=utf-8', '<!doctype html><meta charset="utf-8"><title>Não encontrado</title><p style="font-family:sans-serif">Página não encontrada. <a href="/">Voltar</a></p>');
    const html = site.tipo === 'vitrine' ? paginas.vitrine(site, ofertas.carregar(site))
      : paginas.institucional(site, { whatsapp: String(process.env.CONTATO_WHATSAPP || '').replace(/\D/g, ''), email: process.env.CONTATO_EMAIL || '', rodape: process.env.RODAPE_EMPRESA || '' },
        ofertas.resumo([SITES.shop, SITES.tcg]));
    // ?v=<versão da pasta marca>: logo nova aparece na hora, mesmo para quem tem a antiga no cache do navegador
    return enviar(res, 200, 'text/html; charset=utf-8', html.replace(/(\/marca\/[a-z0-9-]+\.(?:svg|png|ico))"/g, `$1?v=${versaoMarca()}"`), { 'Cache-Control': 'no-cache', 'Content-Security-Policy': CSP });
  } catch (e) { log('erro', e.message); enviar(res, 500, 'text/plain; charset=utf-8', 'erro'); }
});
servidor.listen(PORTA, () => log('NINEFOX no ar na porta', PORTA, '| API Shopee NINEFOX:', ofertas.pronta() ? 'ligada' : 'SEM CHAVES (mostra "ofertas chegando")'));

// atualiza as vitrines a cada 3 h (só com as chaves da NINEFOX)
let rodando = false;
async function atualizarTudo() {
  if (rodando || !ofertas.pronta()) return; rodando = true;
  try { for (const s of [SITES.shop, SITES.tcg]) { const r = await ofertas.atualizar(s); log('ofertas', s.id, JSON.stringify(r)); } }
  catch (e) { log('ofertas erro', e.message); } finally { rodando = false; }
}
setTimeout(atualizarTudo, 20000);
setInterval(atualizarTudo, 3 * 3600e3);
