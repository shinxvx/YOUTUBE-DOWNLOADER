// Automated end-to-end playthrough of the vertical slice in headless Chromium.
// Drives the real game through keyboard input; battles use a simple tactical policy
// that issues the same commands a player would (via the battle's commit()).
// Default: runs the real desktop app (Electron) — use `xvfb-run -a node tools/playthrough.mjs`
// on a machine without a display. WEB=1 runs the dev build in headless Chromium instead.
import { chromium, _electron } from 'playwright-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
let browser, page;
if (process.env.WEB) {
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(process.env.URL || 'http://localhost:4173/?test');
} else {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'vh-test-'));
  browser = await _electron.launch({
    executablePath: path.resolve('node_modules/electron/dist/electron'),
    args: ['.', '--no-sandbox', `--user-data-dir=${userData}`],
    env: { ...process.env, VH_QUERY: '?test' },
  });
  page = await browser.firstWindow();
  console.log('electron userData:', userData);
}
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message} ${e.stack?.split('\n')[1] || ''}`));
await page.waitForFunction(() => window.__VH?.game?.scene.getScene('Title')?.sys.isActive(), null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.mouse.click(4, 4);
await page.evaluate(() => window.dispatchEvent(new Event('focus')));
let shotN = 0;
const shot = async (name) => { await page.screenshot({ path: `test-output/pt_${String(++shotN).padStart(2, '0')}_${name}.png` }); };
const ev = (fn, arg) => page.evaluate(fn, arg);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const POLICY = () => {
  const V = window.__VH;
  const b = V.battle;
  const bActive = b && b.sys.isActive();
  if (bActive) {
    if (b.clashOpen) {
      const table = { thrust: 'evade', pounce: 'parry', sweep: 'counter' };
      let want = table[b.clashOpen.type];
      let i = b.clashOpen.opts.findIndex(o => o.id === want && !o.disabled);
      if (i < 0) i = b.clashOpen.opts.findIndex(o => o.id === 'parry');
      b.clashOpen.pick(i);
      return { acted: `clash_${b.clashOpen ? want : want}` };
    }
    if (b.modalWait || b.dialogue.active || b.resultMenu) return { key: 'z', where: 'battle-ui' };
    if (b.choiceResolve && b.currentUnit) {
      const u = b.currentUnit;
      const foes = b.foes();
      const anchors = b.enemies().filter(e => e.anchor);
      const threatened = u.status.marked || b.enemies().some(e => e.windup && e.windupTarget === u);
      if (threatened) { b.commit({ type: 'guard' }); return { acted: 'guard' }; }
      if (u.hp < u.maxHp * 0.35 && (V.stateNow().inventory.tonic || 0) > 0) { b.commit({ type: 'item', item: 'tonic', targets: [u] }); return { acted: 'tonic' }; }
      if (anchors.length && u.key === 'elara_ashen' && u.focus >= 14) { b.commit({ type: 'skill', skill: 'white_funeral', targets: b.enemies() }); return { acted: 'white_funeral' }; }
      const stage = V.stateNow().sealStage;
      if (u.key === 'kai' && stage >= 1) {
        if (u.strain >= 70) { b.commit({ type: 'guard' }); return { acted: 'guard-strain' }; }
        if (anchors.length && u.strain <= 60) { b.commit({ type: 'skill', skill: 'seal_rend', targets: [anchors[0]] }); return { acted: 'seal_rend' }; }
        if (u.strain <= 50) { b.commit({ type: 'skill', skill: 'veilpiercer', targets: [foes[0]] }); return { acted: 'veilpiercer' }; }
      }
      const cad = u.key === 'kai' ? ['ember_cut', 4] : u.key === 'elara_ashen' ? ['ashen_arc', 6] : null;
      if (cad && u.focus >= cad[1]) { b.commit({ type: 'skill', skill: cad[0], targets: [foes[0]] }); return { acted: cad[0] }; }
      b.commit({ type: 'skill', skill: 'attack', targets: [foes[0]] });
      return { acted: 'attack' };
    }
    return { where: 'battle-wait' };
  }
  const ui = V.game.scene.getScene('UI');
  if (ui?.sys.isActive()) {
    if (ui.dialogue?.active) return { key: 'z', where: 'dialogue' };
    if (ui.tipBox || ui.endCardActive) return { key: 'z', where: 'tip' };
  }
  return { where: 'idle' };
};

async function pump(cond, label, timeout = 240000) {
  const t0 = Date.now();
  const acts = {};
  while (Date.now() - t0 < timeout) {
    if (await ev(cond)) { if (Object.keys(acts).length) log(`  [${label}] battle actions:`, JSON.stringify(acts)); return true; }
    const r = await ev(POLICY);
    if (r.acted) acts[r.acted] = (acts[r.acted] || 0) + 1;
    if (r.key) await page.keyboard.press(r.key);
    await page.waitForTimeout(r.key ? 140 : 200);
  }
  log(`TIMEOUT waiting for ${label}`);
  await shot(`timeout_${label}`);
  return false;
}


const cond = (extra) => `(() => { const w = window.__VH.world; const ok = !!(w && w.sys.isActive() && w.started && !w.busy && !window.__VH.game.scene.getScene('UI').dialogue.active); return ok && !!(${extra}); })()`;

async function interact(x, y, facing, label) {
  const reach = await ev(([x, y]) => window.__VH.world.canStand(x, y), [x, y]);
  await ev(([x, y, f]) => window.__VH.debug.teleport(x, y, f), [x, y, facing]);
  await page.waitForTimeout(300);
  await page.keyboard.press('z');
  await page.waitForTimeout(300);
  log(`interact ${label} @${x},${y} standable=${reach}`);
}

// ---------------------------------------------------------------- run
log('Title → New Game');
await page.keyboard.press('z');
await pump(() => window.__VH.world?.started, 'world-start', 30000);
await shot('intro');
await pump(cond("window.__VH_flags().intro_done"), 'intro');
await shot('dusk_free');

// Movement + collision check
const p0 = await ev(() => ({ x: window.__VH.world.player.x, y: window.__VH.world.player.y }));
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(800); await page.keyboard.up('ArrowRight');
await page.keyboard.down('ArrowDown'); await page.waitForTimeout(600); await page.keyboard.up('ArrowDown');
const p1 = await ev(() => ({ x: window.__VH.world.player.x, y: window.__VH.world.player.y }));
log('walk', JSON.stringify(p0), '→', JSON.stringify(p1));

for (const [id, x, y, f] of [['lantern_plaza', 403, 846], ['lantern_southeast', 1005, 846], ['lantern_bridge', 1120, 590]]) {
  await interact(x, y, f || 'up', id);
  await pump(cond(`window.__VH_flags()['${id}']`), id, 60000);
}
await shot('lanterns_done');
await interact(240, 380, 'up', 'hana');
await pump(cond("window.__VH_flags().met_hana"), 'hana', 60000);
await interact(420, 566, 'up', 'kids');
await pump(cond("window.__VH_flags().kids_dusk"), 'kids', 60000);

// Save into slot 1 through the pause menu.
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
await shot('menu');
for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(250); log('menu idx', await ev(() => window.__VH.game.scene.getScene('Menu').list.index)); }
await page.keyboard.press('z'); await page.waitForTimeout(500);
await page.keyboard.press('z'); await page.waitForTimeout(600);
await shot('saved');
const saved = await ev(() => !!(window.vhNative ? window.vhNative.storage.getItem('vampirehunters.save.slot1') : localStorage.getItem('vampirehunters.save.slot1')));
log('manual save slot1 present:', saved);
await page.keyboard.press('x'); await page.waitForTimeout(300);
await page.keyboard.press('x'); await page.waitForTimeout(500);

await interact(760, 716, 'up', 'mira');
await pump(cond("window.__VH.stateNow().phase === 'dark' && window.__VH_flags().festival_done"), 'festival', 120000);
await shot('lanterns_dead');
await interact(864, 558, 'up', 'blade');
await pump(cond("window.__VH_flags().has_blade && window.__VH.stateNow().objective.startsWith('Find Nell')"), 'tutorial-battle', 180000);
await shot('after_tutorial');

// Optional bridge hound
await ev(() => window.__VH.debug.teleport(1150, 612, 'right'));
await pump(cond("window.__VH.stateNow().defeated.hound_bridge"), 'hound', 180000);
// Lower square pair
await ev(() => window.__VH.debug.teleport(760, 1040, 'up'));
await pump(cond("window.__VH_flags().pair_lower_cleared"), 'pair', 180000);
await interact(640, 1072, 'left', 'kids-dark');
await pump(cond("window.__VH_flags().kids_safe"), 'kids-dark', 60000);
// Stalker on the stairs
await ev(() => window.__VH.debug.teleport(1480, 610, 'up'));
await pump(cond("window.__VH_flags().stairs_cleared"), 'stalker', 180000);
await interact(1504, 284, 'up', 'shelter');
await pump(cond("window.__VH_flags().hana_shelter"), 'shelter', 60000);
await shot('shelter_done');
// Garran
await ev(() => window.__VH.debug.teleport(760, 760, 'left'));
await pump(() => window.__VH.battle?.sys.isActive(), 'garran-start', 120000);
await page.waitForTimeout(1500);
await shot('garran_battle');
await pump(() => window.__VH.stateNow().sealStage >= 1 && window.__VH.battle?.units.some(u => u.key === 'elara_ashen'), 'awakening', 240000);
await shot('awakened');
await pump(cond("window.__VH.stateNow().phase === 'dawn'"), 'garran-defeat', 300000);
await shot('dawn');
await interact(330, 404, 'left', 'elara');
await pump(cond("window.__VH_flags().dawn_talk"), 'dawn-talk', 120000);
await interact(330, 404, 'left', 'elara-depart');
await pump(() => window.__VH.game.scene.getScene('Title')?.sys.isActive(), 'end', 60000);
await page.waitForTimeout(1200);
await shot('back_to_title');

const final = await ev(() => ({ desktop: !!window.vhNative, saves: (window.vhNative ? window.vhNative.storage.keys() : Object.keys(localStorage)).filter(k => k.startsWith('vampirehunters.save')), stage: window.__VH.stateNow().sealStage, level: window.__VH.stateNow().party[0].level, playtime: Math.round(window.__VH.stateNow().playtime) }));
log('final', JSON.stringify(final));
// Continue → should land on the pre-departure autosave at dawn.
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
await page.keyboard.press('ArrowUp'); await page.waitForTimeout(200);
await page.keyboard.press('z');
await pump(() => window.__VH.world?.started && window.__VH.world.sys.isActive(), 'continue', 30000);
const cont = await ev(() => ({ phase: window.__VH.stateNow().phase, objective: window.__VH.stateNow().objective }));
log('continue →', JSON.stringify(cont));
await page.waitForTimeout(1500);
await shot('continued');
log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'NO PAGE ERRORS');
await browser.close();
