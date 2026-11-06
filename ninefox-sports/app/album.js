'use strict';
// Lê um álbum compartilhado do Google Photos (link photos.google.com/share/...?key=...).
// Devolve os produtos na ordem do álbum: cada "texto" do álbum (ex.: "Nike Dunk Premium\n34 ao 39") abre um grupo
// e as fotos que vêm depois dele são desse produto. Sem login, sem API: é o mesmo dado que a página do álbum usa.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function idsDoLink(link) {
  const u = new URL(link);
  if (u.hostname !== 'photos.google.com' && u.hostname !== 'photos.app.goo.gl') throw new Error('o link precisa ser de photos.google.com');
  const m = /\/share\/([A-Za-z0-9_-]+)/.exec(u.pathname);
  return { album: m && m[1], chave: u.searchParams.get('key') };
}

async function baixarTexto(url, opcoes = {}) {
  const r = await fetch(url, { redirect: 'follow', ...opcoes, headers: { 'user-agent': UA, 'accept-language': 'pt-BR,pt;q=0.9', ...(opcoes.headers || {}) }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Google Photos respondeu ${r.status}`);
  return { texto: await r.text(), url: r.url };
}

function eventos(texto, vistos, lista) {
  for (const m of texto.matchAll(/\["(AF1Qip[A-Za-z0-9_-]+)",\{"99218341":\[\[1,\["((?:[^"\\]|\\.)*)"\]\]\],"101428965":\[0,"([a-z0-9]+)"\]/g)) {
    if (vistos.has('t' + m[3])) continue; vistos.add('t' + m[3]);
    lista.push({ k: m[3], tipo: 'texto', texto: JSON.parse('"' + m[2] + '"') });
  }
  for (const m of texto.matchAll(/\["(AF1Qip[A-Za-z0-9_-]+)",\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_-]+)",(\d+),(\d+)[\s\S]{0,900}?"101428965":\[0,"([a-z0-9]+)"\]/g)) {
    if (vistos.has('f' + m[1])) continue; vistos.add('f' + m[1]);
    lista.push({ k: m[5], tipo: 'foto', src: m[1], url: m[2], w: +m[3], h: +m[4] });
  }
}

async function lerAlbum(link) {
  let { album, chave } = idsDoLink(link);
  const pagina = await baixarTexto(link);
  if (!album) ({ album, chave } = idsDoLink(pagina.url)); // link curto photos.app.goo.gl
  if (!album || !chave) throw new Error('link do álbum sem o código de compartilhamento (?key=...)');
  const vistos = new Set(); const lista = [];
  eventos(pagina.texto, vistos, lista);
  const titulo = (/<title>([^<]*?)(?: - Google (?:Photos|Fotos))?<\/title>/.exec(pagina.texto) || [])[1] || '';
  // o resto das fotos vem em páginas (o mesmo pedido que a página faz ao rolar)
  let token = (/\]\],"(AKFEYq[A-Za-z0-9_-]+)",/.exec(pagina.texto) || [])[1];
  for (let n = 0; token && n < 40; n++) {
    const freq = JSON.stringify([[['snAcKc', JSON.stringify([album, token, null, chave]), null, 'generic']]]);
    const { texto } = await baixarTexto(`https://photos.google.com/_/PhotosUi/data/batchexecute?rpcids=snAcKc&source-path=%2Fshare%2F${album}&hl=pt-BR&rt=c`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'f.req=' + encodeURIComponent(freq),
    });
    const linha = texto.split('\n').find((l) => l.includes('wrb.fr'));
    if (!linha) break;
    const dentro = JSON.parse(JSON.parse(linha)[0][2]);
    eventos(JSON.stringify(dentro), vistos, lista);
    token = dentro[2];
  }
  lista.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  const grupos = []; let g = null;
  for (const e of lista) {
    if (e.tipo === 'texto') { if (!g || g.texto !== e.texto) { g = { texto: e.texto.trim(), fotos: [] }; grupos.push(g); } }
    else { if (!g) { g = { texto: '', fotos: [] }; grupos.push(g); } g.fotos.push({ src: e.src, url: e.url, w: e.w, h: e.h }); }
  }
  return { titulo, grupos: grupos.filter((x) => x.fotos.length) };
}

module.exports = { lerAlbum };
