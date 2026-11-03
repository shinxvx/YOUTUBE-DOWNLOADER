// Teste de telas do Studio 82 com Playwright: node teste-ui.cjs <base> <pasta-prints>
const { chromium } = require('playwright');
const B = process.argv[2], OUT = process.argv[3];
(async () => {
  const br = await chromium.launch();
  const erros = [];
  const nova = async (vp, mob) => {
    const c = await br.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: !!mob, hasTouch: !!mob });
    const p = await c.newPage();
    p.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && erros.push(m.text()));
    p.on('pageerror', (e) => erros.push('JS: ' + e.message));
    return p;
  };
  const larg = async (p, nome) => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    if (w[0] > w[1] + 1) erros.push(`${nome}: estouro de largura ${w[0]} > ${w[1]}`);
  };
  const shot = async (p, nome, full = true) => { await p.waitForTimeout(900); await larg(p, nome); await p.screenshot({ path: `${OUT}/${nome}.png`, fullPage: full }); };

  // Visitante
  for (const [nome, vp, mob] of [['pc', { width: 1360, height: 820 }], ['cel', { width: 390, height: 780 }, 1]]) {
    const p = await nova(vp, mob);
    await p.goto(B + '/'); await p.waitForTimeout(1600);
    await p.evaluate(() => document.querySelectorAll('.revela').forEach((e) => e.classList.add('vis')));
    await shot(p, 'visitante-' + nome);
    await p.click('[data-cad] >> nth=0'); await shot(p, 'cadastro-' + nome, false);
    await p.close();
  }
  // Aluno no PC
  let p = await nova({ width: 1360, height: 820 });
  await p.goto(B + '/'); await p.click('[data-entrar]');
  await p.fill('input[name=email]', 'ana@x.com'); await p.fill('input[name=senha]', '123456'); await p.click('form button.btn');
  await p.waitForSelector('.ola'); await p.evaluate(() => document.querySelectorAll('.revela').forEach((e) => e.classList.add('vis')));
  await shot(p, 'inicio-pc');
  await p.goto(B + '/#/estilo/kpop'); await shot(p, 'kpop-pc');
  const ids = await p.evaluate(() => fetch('/api/aulas').then((r) => r.json()).then((j) => j.aulas.map((a) => [a.id, a.titulo, a.trancada])));
  console.log(ids);
  await p.goto(B + '/#/aula/' + ids[0][0]); await p.waitForSelector('.pl video');
  await p.click('.pl .big'); await p.waitForTimeout(1500);
  await p.click('[data-a=vel]'); await p.click('[data-a=espelho]');
  await p.mouse.move(600, 300);
  await shot(p, 'aula-pc', false);
  const st = await p.evaluate(() => { const v = document.querySelector('.pl video'); return { t: v.currentTime, rate: v.playbackRate, paused: v.paused, esp: getComputedStyle(v).transform }; });
  console.log('player', st);
  // Aula trancada: cria aluno novo
  await p.goto(B + '/#/street'); await shot(p, 'street-pc');
  // Admin
  await p.evaluate(() => fetch('/api/sair', { method: 'POST' }));
  await p.goto(B + '/'); await p.reload(); await p.click('[data-entrar]');
  await p.fill('input[name=email]', 'olly@studio82'); await p.fill('input[name=senha]', 'teste123'); await p.click('form button.btn');
  await p.waitForSelector('.ola');
  await p.goto(B + '/#/professor'); await shot(p, 'prof-aulas');
  await p.goto(B + '/#/professor/aula/' + ids[3][0]); await p.waitForSelector('#edReq'); await shot(p, 'prof-editor');
  await p.goto(B + '/#/professor/alunos'); await p.waitForSelector('.aluno'); await shot(p, 'prof-alunos');
  await p.click('[data-ver]'); await shot(p, 'prof-progresso', false);
  await p.close();
  // Celular: aluno, tela cheia
  p = await nova({ width: 390, height: 780 }, 1);
  await p.goto(B + '/'); await p.click('[data-entrar]');
  await p.fill('input[name=email]', 'ana@x.com'); await p.fill('input[name=senha]', '123456'); await p.click('form button.btn');
  await p.waitForSelector('.ola'); await p.evaluate(() => document.querySelectorAll('.revela').forEach((e) => e.classList.add('vis')));
  await shot(p, 'inicio-cel');
  await p.click('.menu-btn'); await shot(p, 'menu-cel', false); await p.click('.menu-btn');
  await p.goto(B + '/#/aula/' + ids[0][0]); await p.waitForSelector('.pl video'); await shot(p, 'aula-cel');
  await p.evaluate(() => document.querySelector('.pl .big').click()); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = document.querySelector('.pl .salto.d'); d.click(); d.click(); }); const t2 = await p.evaluate(() => document.querySelector('.pl video').currentTime); console.log('depois do duplo toque', t2);
  await p.click('[data-a=cheia]'); await p.waitForTimeout(1200);
  const fs = await p.evaluate(() => { const v = document.querySelector('.pl video'); const r = v.getBoundingClientRect(); return { fs: !!document.fullscreenElement, cls: document.querySelector('.pl').className, fit: getComputedStyle(v).objectFit, w: r.width, h: r.height }; });
  console.log('tela cheia', fs);
  await p.screenshot({ path: `${OUT}/telacheia-cel.png` });
  await p.close();
  await br.close();
  console.log(erros.length ? 'ERROS:\n' + erros.join('\n') : 'sem erros de console');
})();
