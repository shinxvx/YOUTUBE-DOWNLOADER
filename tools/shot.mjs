// Headless driver: node tools/shot.mjs <script.json-ish steps via argv>
import { chromium } from 'playwright-core';
const base = process.env.URL || 'http://localhost:4173/';
const steps = JSON.parse(process.argv[2] || '[]');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(base + (process.env.Q || ''));
await page.waitForTimeout(2500);
await page.mouse.click(4, 4);
await page.evaluate(() => window.dispatchEvent(new Event('focus')));
for (const s of steps) {
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.key) { for (let i = 0; i < (s.n || 1); i++) { await page.keyboard.press(s.key); await page.waitForTimeout(s.gap ?? 120); } }
  if (s.hold) { await page.keyboard.down(s.hold); await page.waitForTimeout(s.ms); await page.keyboard.up(s.hold); }
  if (s.eval) { const r = await page.evaluate(s.eval); if (r !== undefined) console.log('eval:', JSON.stringify(r)); }
  if (s.shot) await page.screenshot({ path: `test-output/${s.shot}.png` });
  if (s.until) {
    const t0 = Date.now();
    while (Date.now() - t0 < (s.timeout || 30000)) {
      const ok = await page.evaluate(s.until);
      if (ok) break;
      if (s.press) await page.keyboard.press(s.press);
      await page.waitForTimeout(s.every || 200);
    }
  }
}
console.log(errors.length ? errors.join('\n') : 'NO CONSOLE ERRORS');
await browser.close();
