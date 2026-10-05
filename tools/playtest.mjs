// Automated playthrough of the first playable build in headless Chromium.
//   npm run build && node tools/playtest.mjs [outdir]
// Clicks through the title, name entry, partner choice, the Act 1 story,
// shop, deck editor and saves; duels are played by the AI on both sides
// (window.__eidra.autoplay) except for a few real clicks in the first one.
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'playtest-shots');
fs.mkdirSync(out, { recursive: true });
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', process.env.CHROME].find((p) => p && fs.existsSync(p));

const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('file://' + path.join(root, 'dist', 'index.html'));

const S = 3;
const wait = (ms) => page.waitForTimeout(ms);
const top = () => page.evaluate(() => window.__eidra.top && window.__eidra.top.constructor.name);
const click = async (x, y, button = 'left') => {
  await page.mouse.move(x * S, y * S);
  await wait(40);
  await page.mouse.click(x * S, y * S, { button });
  await wait(90);
};
// click a widget by its id (as registered with the input system)
const clickId = async (id, button = 'left') => {
  const h = await page.evaluate((i) => window.__eidra.input.prevHits.find((x) => x.id === i || x.id.startsWith(i + ':')), id);
  if (!h) throw new Error(`widget ${id} not on screen (top: ${await top()})`);
  await click(h.x + h.w / 2, h.y + h.h / 2, button);
};
const hasId = (id) => page.evaluate((i) => window.__eidra.input.prevHits.some((x) => x.id === i), id);
let shot = 0;
const snap = async (name) => {
  await page.screenshot({ path: path.join(out, `${String(++shot).padStart(2, '0')}-${name}.png`) });
};
const game = () => page.evaluate(() => window.__eidra.game && JSON.parse(JSON.stringify(window.__eidra.game)));

// advance dialogues/banners/rewards until another scene is on top
async function advance(maxSteps = 200, choicePick = 0) {
  for (let i = 0; i < maxSteps; i++) {
    const t = await top();
    if (t === 'DialogueScene') {
      const isChoice = await page.evaluate(() => !!window.__eidra.top.line.choices);
      if (isChoice) {
        const n = await page.evaluate(() => window.__eidra.top.line.choices.length);
        const bw = n > 2 ? 140 : 200;
        const total = n * bw + (n - 1) * 8;
        const hasPrompt = await page.evaluate(() => !!window.__eidra.top.line.prompt);
        await click(240 - total / 2 + Math.min(choicePick, n - 1) * (bw + 8) + bw / 2, 218 + (hasPrompt ? 40 : 30) + 15);
      } else {
        await click(240, 270);
        await click(240, 270);
      }
    } else if (t === 'BannerScene') {
      await wait(900);
      await click(240, 160);
    } else if (t === 'RewardScene') {
      await wait(300);
      await click(240, 239);
    } else if (t === 'TutorialScene') {
      await click(379, 255);
    } else if (t === 'FxScene') {
      await wait(400);
    } else return t;
  }
  return top();
}

async function playDuel(name, manual = false) {
  await page.waitForFunction(() => window.__eidra.top && window.__eidra.top.constructor.name === 'DuelScene');
  await wait(300);
  await snap(`${name}-mulligan`);
  // keep hand (real click)
  await clickId('keep');
  await wait(400);
  if (manual) {
    // select first hand card and try its action; screenshot the zoom
    await page.waitForFunction(() => {
      const d = window.__eidra.top;
      return d.state && d.state.phase !== 'mulligan';
    });
    await page.waitForFunction(() => {
      const d = window.__eidra.top;
      return d.state.active === 0 && d.anims.length === 0;
    }, null, { timeout: 20000 });
    const firstCard = await page.evaluate(() => window.__eidra.input.prevHits.find((h) => /^h\d+$/.test(h.id)).id);
    await clickId(firstCard);
    await wait(200);
    await snap(`${name}-zoom`);
    // press the first action button, then pick the first highlighted slot
    const actBtn = await page.evaluate(() => window.__eidra.input.prevHits.find((h) => h.id.startsWith('act-') && h.id !== 'act-close' && !h.disabled));
    if (actBtn) await click(actBtn.x + actBtn.w / 2, actBtn.y + actBtn.h / 2);
    await wait(150);
    await snap(`${name}-target`);
    const tgt = await page.evaluate(() => {
      const d = window.__eidra.top;
      const k = d.targets[0];
      if (k === undefined) return null;
      if (String(k).startsWith('slot')) return `f0-${String(k).slice(4)}`;
      for (const p of [0, 1]) {
        const i = d.state.players[p].field.findIndex((c) => c && c.uid === k);
        if (i >= 0) return `f${p}-${i}`;
      }
      return k === 'nexus' ? 'tgt-nexus' : null;
    });
    if (tgt) await clickId(tgt);
    await wait(500);
    await snap(`${name}-after-play`);
  }
  await page.evaluate(() => {
    window.__eidra.autoplay = true;
    window.__eidra.settings.animSpeed = 0;
  });
  await page.waitForFunction(() => window.__eidra.top.state && window.__eidra.top.state.winner !== null && window.__eidra.top.anims.length === 0, null, { timeout: 240000 });
  await wait(300);
  await snap(`${name}-result`);
  const res = await page.evaluate(() => window.__eidra.top.state.winner);
  await page.evaluate(() => {
    window.__eidra.autoplay = false;
    window.__eidra.settings.animSpeed = 1;
  });
  await clickId('res-continue');
  return res;
}

// ---- title
await page.waitForFunction(() => window.__eidra && window.__eidra.top, null, { timeout: 20000 });
await wait(500);
await snap('title');
await clickId('tt-new');
await wait(200);
await page.keyboard.type('Aster');
await snap('name');
await clickId('nm-ok');
// ---- arrival + partner
let t = await advance();
if (t !== 'PartnerScene') throw new Error(`expected partner scene, got ${t}`);
await snap('partner');
await clickId('pt-ripplet');
await snap('partner-picked');
await clickId('pt-ok');
t = await advance();
if (t !== 'MapScene') throw new Error(`expected map, got ${t}`);
await snap('map');
let g = await game();
console.log('after arrival:', g.partner, g.coins, Object.keys(g.flags));

// hover the classroom pin and go there
await page.mouse.move(280 * S, 128 * S);
await wait(200);
await snap('map-hover');
await clickId('loc-classroom');
t = await top();
if (t !== 'LocationScene') throw new Error(`expected location, got ${t}`);
await snap('classroom');
await clickId('ev-first_class');
t = await advance();
if (t !== 'DuelScene') throw new Error(`expected tutorial duel, got ${t}`);
let r = await playDuel('tutorial', true);
console.log('tutorial duel winner:', r);
t = await advance(200, 0);
// mandatory duel lost -> choice 'Try again' handled by advance (pick 0)
while (t === 'DuelScene') {
  r = await playDuel('tutorial-retry');
  console.log('retry winner:', r);
  t = await advance(200, 0);
}
await snap('after-lesson');
g = await game();
console.log('after lesson: day', g.day, 'period', g.period, 'flags', Object.keys(g.flags));

// back to map, evening admission duel at the arena
async function toMap() {
  for (let i = 0; i < 5 && (await top()) !== 'MapScene'; i++) {
    await page.keyboard.press('Escape');
    await wait(150);
  }
}
async function goto(loc) {
  await toMap();
  await clickId(`loc-${loc}`);
  const tt = await top();
  if (tt !== 'LocationScene') throw new Error(`could not open ${loc}: ${tt}`);
}
// shop visit
await goto('shop');
await clickId('sh-open');
await snap('shop');
await clickId('buy-academy');
await wait(300);
await snap('pack');
await advance();
await page.keyboard.press('Escape');
await wait(100);
// deck editor
await page.evaluate(() => {});
await clickId('loc-deck');
await wait(200);
await snap('deck-editor');
await page.keyboard.press('Escape');
await wait(100);
// collection via map
await toMap();
await clickId('m-coll');
await wait(150);
await snap('collection');
await clickId('col-tab-ency');
await wait(100);
await snap('encyclopedia');
await page.keyboard.press('Escape');
await wait(100);

// spend time until evening by practice duels at the arena
g = await game();
for (let guard = 0; g.period !== 2 && guard < 4; guard++) {
  await goto('arena');
  await clickId('ar-practice');
  t = await advance();
  if (t === 'DuelScene') {
    r = await playDuel(`practice-${g.period}`);
    console.log('practice winner:', r);
    await advance();
  }
  g = await game();
}
// admission duel
await goto('arena');
await snap('arena-evening');
await clickId('ev-admission');
t = await advance();
while (t === 'DuelScene') {
  r = await playDuel('admission');
  console.log('admission winner:', r);
  t = await advance(200, 0);
}
g = await game();
console.log('after admission: day', g.day, 'period', g.period, 'flags', Object.keys(g.flags));
// next day: ceremony at plaza
await goto('plaza');
await snap('plaza');
await clickId('ev-ceremony');
t = await advance();
g = await game();
console.log('after ceremony:', Object.keys(g.flags));
// demonstration at arena
await goto('arena');
await clickId('ev-demonstration');
t = await advance();
while (t === 'DuelScene') {
  r = await playDuel('demonstration');
  console.log('demonstration winner:', r);
  t = await advance(300, 0);
}
await snap('act1-done');
g = await game();
console.log('after act 1:', g.license, g.coins, 'act1_done' in g.flags, 'stats', g.stats);

// tactical challenge (manual solve of puzzle 1)
await goto('classroom');
await snap('classroom-after');
await clickId('cl-puzzle');
t = await advance(5, 0); // choose first puzzle then lesson line
t = await advance(5, 0);
if (t === 'DuelScene') {
  await wait(400);
  await snap('puzzle');
  // solve: Heat Rush on Brasear, Flare on Pebblit, Brasear attacks Pebblit, Zippip hits Nexus
  const sol = await page.evaluate(() => {
    const d = window.__eidra.top;
    const s = d.state;
    const hand = s.players[0].hand;
    const f0 = s.players[0].field;
    const f1 = s.players[1].field;
    const heat = hand.find((h) => h.id === 't_heat_rush').uid;
    const flare = hand.find((h) => h.id === 't_flare').uid;
    return { heat, flare, bras: f0[0].uid, zip: f0[1].uid, peb: f1[0].uid };
  });
  for (const a of [
    { type: 'technique', p: 0, uid: sol.heat, target: sol.bras },
    { type: 'technique', p: 0, uid: sol.flare, target: sol.peb },
    { type: 'attack', p: 0, attacker: sol.bras, target: sol.peb },
    { type: 'attack', p: 0, attacker: sol.zip, target: 'nexus' },
  ]) {
    await page.evaluate((act) => window.__eidra.top.doAction(window.__eidra, act), a);
    await wait(700);
  }
  await page.waitForFunction(() => window.__eidra.top.state.winner !== null && window.__eidra.top.anims.length === 0);
  await wait(300);
  await snap('puzzle-solved');
  await clickId('res-continue');
  await advance();
}
// save in dorm
await goto('dorm');
await snap('dorm');
await clickId('dorm-save');
await wait(200);
await clickId('sv-slot1');
await wait(400);
await snap('saved');
const saves = await page.evaluate(() => Object.keys(localStorage));
console.log('localStorage keys:', saves);
g = await game();
console.log('final flags:', Object.keys(g.flags).join(','));
console.log('quests:', JSON.stringify(g.quests));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length) process.exitCode = 1;
