// Captura as telas REAIS de cada sistema, com dados FICTÍCIOS, para o vídeo "Speed desenvolve sistemas".
// Roda no contêiner do Playwright (ver ferramentas/capturar.sh, que também sobe as cópias de teste dos apps).
// Saída: /out/<sistema>/<estado>.jpg + /out/<sistema>/caixas.json (posição, em px da tela do app, de cada clique/campo).
//   ONLY=lojaspeed,aurora   refaz só esses sistemas
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = '/out';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--font-render-hinting=none'] });
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 };
const MOB = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true };

function sistema(nome) {
  const dir = `${OUT}/${nome}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const caixas = {};
  return {
    dir, caixas,
    async foto(p, est) { await sleep(250); await p.screenshot({ path: `${dir}/${est}.jpg`, type: 'jpeg', quality: 90 }); console.log(nome, est); },
    async caixa(p, nomeCx, sel) { const bb = await p.locator(sel).first().boundingBox(); if (!bb) throw new Error(`${nome}: sem caixa ${sel}`); caixas[nomeCx] = { x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.width), h: Math.round(bb.height) }; return bb; },
    salvar(extra = {}) { fs.writeFileSync(`${dir}/caixas.json`, JSON.stringify({ ...extra, caixas }, null, 1)); },
  };
}
async function digitar(s, p, sel, texto, prefixo) {
  // uma foto por letra: a digitação aparece de verdade no vídeo
  await p.click(sel);
  for (let i = 0; i < texto.length; i++) { await p.keyboard.type(texto[i]); await sleep(120); await s.foto(p, `${prefixo}${i + 1}`); }
}
const pagina = async (o, css) => { const c = await b.newContext(o); const p = await c.newPage(); p.on('pageerror', e => console.log('  [erro na página]', e.message.slice(0, 120))); if (css) await p.addInitScript(css => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }); }, css); return p; };

// ---------------- LojaSpeed: o programa do caixa (demonstração oficial, dados fictícios da Boutique Aurora)
if (want('lojaspeed')) {
  const s = sistema('lojaspeed'); const p = await pagina(DESK);
  await p.goto('file:///ls/demo.html'); await sleep(1200);
  await s.foto(p, 'l00'); await s.caixa(p, 'busca', '#q');
  await digitar(s, p, '#q', 'vestido', 'l0');
  await s.caixa(p, 'resultado', '#res > *:nth-child(3)'); await p.click('#res > *:nth-child(3)'); await sleep(500);
  await s.foto(p, 'l10'); await s.caixa(p, 'colocar', '.fundo [data-ok]'); await p.click('.fundo [data-ok]'); await sleep(600);
  await s.foto(p, 'l11'); await s.caixa(p, 'total', '.pdv-dir .total');
  const pix = p.locator('.pdv-dir button.bt', { hasText: 'Pix' }); await s.caixa(p, 'pix', '.pdv-dir button.bt:has-text("Pix")'); await pix.click(); await sleep(500);
  await s.foto(p, 'l12'); await s.caixa(p, 'finalizar', '#fim'); await p.click('#fim'); await sleep(900);
  await s.foto(p, 'l13'); await s.caixa(p, 'concluida', '.fundo h2');
  s.salvar({ tela: [1440, 900] }); await p.context().close();
}

// ---------------- Aurora Store: a loja online com Pix (demonstração oficial, Boutique Aurora)
if (want('aurora')) {
  const s = sistema('aurora'); const p = await pagina(MOB);
  await p.goto('file:///ls/demo-loja-online.html'); await sleep(1200);
  await s.foto(p, 'a00');
  await s.caixa(p, 'chip', 'button.chip:has-text("Vestidos")'); await p.click('button.chip:has-text("Vestidos")'); await sleep(600); await s.foto(p, 'a01');
  await s.caixa(p, 'item', 'button.item >> nth=0'); await p.click('button.item >> nth=0'); await sleep(700); await s.foto(p, 'a02');
  await s.caixa(p, 'tam', 'button.op:has-text("M")'); await p.click('button.op:has-text("M")'); await sleep(250);
  await s.caixa(p, 'cor', 'button.op:has-text("Vermelho")'); await p.click('button.op:has-text("Vermelho")'); await sleep(400); await s.foto(p, 'a03');
  const add = p.locator('button:has-text("Adicionar à sacola")'); await add.scrollIntoViewIfNeeded(); await sleep(400); await s.foto(p, 'a04');
  await s.caixa(p, 'add', 'button:has-text("Adicionar à sacola")'); await add.click(); await sleep(700); await s.foto(p, 'a05');
  await s.caixa(p, 'sacola', 'button:has-text("Ver sacola")'); await p.click('button:has-text("Ver sacola")'); await sleep(700); await s.foto(p, 'a06');
  await s.caixa(p, 'finalizar', 'button:has-text("Finalizar e pagar com Pix")'); await p.click('button:has-text("Finalizar e pagar com Pix")'); await sleep(700);
  await p.fill('label:has-text("Seu nome") input', 'Marina'); await p.fill('input[placeholder="11 99999-0000"]', '11 90000-0000'); await p.click('label:has-text("Retirar na loja")'); await sleep(300);
  await s.foto(p, 'a07'); await s.caixa(p, 'gerar', 'button:has-text("Gerar o Pix")'); await p.click('button:has-text("Gerar o Pix")'); await sleep(1500);
  await s.foto(p, 'a08');
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await p.locator('text=Pagamento confirmado').count()) break; }
  await sleep(500); await s.foto(p, 'a09');
  s.salvar({ tela: [390, 844] }); await p.context().close();
}

// ---------------- ZapBot: o simulador de conversa do próprio app (aba Testar), com um menu de exemplo fictício
const FLOW = {
  enabled: true, startOn: 'nova', keywords: ['menu', 'inicio', '0'], backKeywords: ['voltar'], backOption: true, backLabel: 'Voltar',
  resetHours: 12, menuCooldownHours: 12, numberStyle: 'emoji', footer: '_Responda com o número da opção._',
  answerFooter: '_Digite *0* pra voltar ao menu ou escolha outra opção._', invalidText: 'Não entendi 😅 Responde só com o *número* da opção:',
  maxInvalid: 2, onInvalid: 'sair', start: 'inicio', agentNode: '', ratingNode: '', shortcuts: [],
  nodes: [
    { id: 'inicio', name: 'Menu principal', type: 'menu', text: '{saudacao}, {nome}! 👋 Aqui é a *Loja Exemplo*. Como posso te ajudar?', options: [
      { label: 'Ver produtos', goto: 'produtos', keywords: ['produto', 'catalogo'] }, { label: 'Horário de atendimento', goto: 'horario', keywords: ['horario'] },
      { label: 'Fazer um pedido', goto: 'pedido', keywords: ['pedido', 'comprar'] }, { label: 'Falar com atendente', goto: '@humano', keywords: ['atendente'] }] },
    { id: 'produtos', name: 'Produtos', type: 'mensagem', text: '🛍️ Temos roupas, calçados e acessórios. Me conta o que você procura!', next: '@ficar' },
    { id: 'horario', name: 'Horário', type: 'mensagem', text: '🕘 Atendemos de segunda a sábado, das 9h às 19h.', next: '@ficar' },
    { id: 'pedido', name: 'Pedido', type: 'pergunta', text: 'Perfeito! Qual produto você quer pedir?', next: 'pedido_fim', saveAs: 'produto' },
    { id: 'pedido_fim', name: 'Pedido: fim', type: 'mensagem', text: 'Anotado: {produto} ✅ Um atendente confirma com você em instantes.', next: '@humano' },
  ],
};
async function zap(nome, o) {
  const s = sistema(nome); const p = await pagina(o);
  await p.goto('http://vss-zap:3777'); await sleep(1000); await p.fill('#loginPw', 'demo-video'); await p.keyboard.press('Enter'); await sleep(1200);
  const r = await p.evaluate(async f => (await fetch('/api/profiles/padrao/flow', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) })).status, FLOW);
  if (r !== 200) throw new Error('flow ' + r);
  await p.reload(); await sleep(1200);
  if (o.isMobile) { const m = p.locator('#menuBtn, .menu-btn, button[aria-label*="menu" i]'); if (await m.count()) { await m.first().click(); await sleep(400); } }
  await p.click('button:has(span:text-is("Testar"))'); await sleep(900);
  await p.fill('#simName', 'Marina'); await p.click('#simReset'); await sleep(800);
  await p.locator('#simText').scrollIntoViewIfNeeded();
  await s.foto(p, 'z00'); await s.caixa(p, 'campo', '#simText'); await s.caixa(p, 'enviar', 'button:has-text("Enviar")');
  await digitar(s, p, '#simText', 'Oi', 'z0'); await p.click('button:has-text("Enviar")'); await sleep(2500); await s.foto(p, 'z10');
  await digitar(s, p, '#simText', '2', 'z1'); await p.click('button:has-text("Enviar")'); await sleep(2500); await s.foto(p, 'z20');
  await s.caixa(p, 'chat', '#simText >> xpath=ancestor::*[contains(@class,"card") or contains(@class,"sim")][1]').catch(() => {});
  s.salvar({ tela: [o.viewport.width, o.viewport.height] }); await p.context().close();
}
if (want('zapbot')) await zap('zapbot', DESK);
if (want('zapbot-cel')) await zap('zapbot-cel', MOB);

// ---------------- Painel de RH: cópia de teste com banco vazio + funcionários fictícios (seed_rh.py)
if (want('rh')) {
  const s = sistema('rh'); const p = await pagina(DESK);
  await p.goto('http://vss-rh:5000/login'); await p.fill('input[name=login]', process.env.RHLOGIN || ''); await p.fill('input[name=senha]', process.env.RHPW || ''); await p.click('button[type=submit], input[type=submit]'); await sleep(900);
  await p.goto('http://vss-rh:5000/rh/funcionarios'); await sleep(800); await s.foto(p, 'r00');
  await p.goto('http://vss-rh:5000/rh/mensal/financeiro'); await sleep(800); await s.foto(p, 'r01');
  const lin = 'tr:has-text("Diego Alves") button.pill';
  await s.caixa(p, 'pendente', lin); await s.caixa(p, 'totais', 'div:text-is("Já pago") >> xpath=..');
  await p.click(lin); await sleep(900); await s.foto(p, 'r02');
  const lin2 = 'tr:has-text("Elisa Martins") button.pill'; await s.caixa(p, 'pendente2', lin2); await p.click(lin2); await sleep(900); await s.foto(p, 'r03');
  s.salvar({ tela: [1440, 900] }); await p.context().close();
}

// ---------------- Creator X (Central de Lojas): modo demonstração com dados fictícios (DEMO=1). A faixa "Demonstração · senha..." fica escondida.
async function cx(nome, o, papel) {
  const s = sistema(nome); const p = await pagina(o, '.faixa{display:none!important}');
  await p.goto('http://vss-cx:3830'); await p.evaluate(async papel => fetch('/api/demo/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ papel }) }), papel);
  await p.goto('http://vss-cx:3830'); await sleep(2200); await s.foto(p, 'c00');
  const chip = 'button.chip[data-a=periodo]:has-text("7 dias")';
  if (await p.locator(chip).count()) {
    await p.locator(chip).scrollIntoViewIfNeeded(); await sleep(300); await s.foto(p, 'c01');
    await s.caixa(p, 'periodo', chip); await p.click(chip); await sleep(1200); await s.foto(p, 'c02');
    await s.caixa(p, 'gmv', 'span:text-is("GMV de todas as lojas") >> xpath=..');
  }
  s.salvar({ tela: [o.viewport.width, o.viewport.height] }); await p.context().close();
}
if (want('creatorx')) await cx('creatorx', DESK, 'admin');
if (want('creatorx-cel')) await cx('creatorx-cel', MOB, 'admin');
if (want('creatorx-creator')) await cx('creatorx-creator', MOB, 'creator');

await b.close();
console.log('fim');
