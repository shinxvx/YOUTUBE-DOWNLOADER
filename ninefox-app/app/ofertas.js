'use strict';
// Ofertas da API de Afiliados da Shopee para as vitrines NINEFOX (SHOP e TCG).
// Credenciais SÓ da conta NINEFOX (NINEFOX_SHOPEE_APPID / NINEFOX_SHOPEE_SECRET no .env): nunca as da Speed — a comissão tem que ir para a conta do dono.
// Sem credenciais o site mostra "ofertas chegando" (ou, com EXEMPLO=1, data/exemplo-<site>.json sem links, marcado como exemplo).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API = 'https://open-api.affiliate.shopee.com.br/graphql';
const DATA = process.env.DATA_DIR || '/data';
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function pronta() { return !!(process.env.NINEFOX_SHOPEE_APPID && process.env.NINEFOX_SHOPEE_SECRET); }

async function gql(query) {
  const appid = process.env.NINEFOX_SHOPEE_APPID, secret = process.env.NINEFOX_SHOPEE_SECRET;
  const payload = JSON.stringify({ query }), ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHash('sha256').update(appid + ts + payload + secret).digest('hex');
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `SHA256 Credential=${appid}, Timestamp=${ts}, Signature=${sig}` }, body: payload, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (j.errors && j.errors.length) throw new Error(j.errors[0].message || 'erro da API');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return j.data;
}

const IMG_OK = /^https:\/\/(cf\.shopee\.com\.br|down-br\.img\.susercontent\.com)\/file\/[\w-]+$/;
const LINK_OK = /^https:\/\/s\.shopee\.com\.br\/\w+$/;

// transforma um produto da API no item da vitrine (só dados confirmados pela fonte)
function item(n, cat) {
  const preco = Math.round(parseFloat(n.price) * 100) / 100, d = Number(n.priceDiscountRate) || 0;
  return {
    id: String(n.itemId), nome: String(n.productName || '').replace(/\s+/g, ' ').trim().slice(0, 140), cat,
    preco, desconto: d >= 5 && d <= 90 ? d : 0, precoDe: d >= 5 && d <= 90 ? Math.round((preco / (1 - d / 100)) * 100) / 100 : 0,
    img: IMG_OK.test(n.imageUrl || '') ? n.imageUrl : '', link: LINK_OK.test(n.offerLink || '') ? n.offerLink : '',
    loja: String(n.shopName || '').slice(0, 60), vendas: Number(n.sales) || 0, nota: parseFloat(n.ratingStar) || 0,
  };
}

// atualiza data/<site>.json com as ofertas de todas as palavras da vitrine
async function atualizar(site) {
  if (!pronta()) return { ok: false, erro: 'sem credenciais NINEFOX_SHOPEE_*' };
  const c = site.ofertas, vistos = new Map(); let erros = 0, ultimoErro = '';
  for (const g of c.grupos) {
    for (const kw of g.palavras) {
      try {
        const d = await gql(`{ productOfferV2(keyword:${JSON.stringify(kw)}, limit:50, page:1, sortType:2){ nodes{ itemId productName price priceDiscountRate sales ratingStar imageUrl offerLink shopName } } }`);
        for (const n of (d && d.productOfferV2 && d.productOfferV2.nodes) || []) {
          const it = item(n, g.cat), nome = norm(it.nome);
          if (!it.img || !it.link || !(it.preco >= c.precoMin && it.preco <= c.precoMax)) continue;
          if (it.nota < c.notaMin || it.vendas < c.vendasMin) continue;
          if (c.exigir && !c.exigir.test(nome)) continue;
          if (c.bloquear && c.bloquear.test(nome)) continue;
          if (!vistos.has(it.id)) vistos.set(it.id, it);
        }
      } catch (e) { erros++; ultimoErro = e.message; if (/rate|limit|frequen/i.test(e.message)) break; }
      await dorme(900);
    }
  }
  const pontos = (i) => i.desconto * 0.6 + Math.log10(i.vendas + 1) * 8 + i.nota * 4;
  const itens = [...vistos.values()].sort((a, b) => pontos(b) - pontos(a)).slice(0, c.max || 150);
  const res = { em: new Date().toISOString(), itens, erros, ultimoErro };
  if (itens.length) { const f = path.join(DATA, site.id + '.json'); fs.writeFileSync(f + '.tmp', JSON.stringify(res)); fs.renameSync(f + '.tmp', f); }
  return { ok: true, total: itens.length, erros, ultimoErro };
}

// o que a página mostra: ofertas reais; sem elas e com EXEMPLO=1, o exemplo (sem links, marcado)
function carregar(site) {
  const ler = (n) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8')); } catch { return null; } };
  const real = ler(site.id + '.json');
  if (real && real.itens && real.itens.length) return { ...real, exemplo: false };
  if (process.env.EXEMPLO === '1') { const ex = ler('exemplo-' + site.id + '.json'); if (ex && ex.itens) return { ...ex, itens: ex.itens.map((i) => ({ ...i, link: '' })), exemplo: true }; }
  return { em: '', itens: [], exemplo: false };
}

module.exports = { pronta, atualizar, carregar, item };
