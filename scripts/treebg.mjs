// Screenshots of the three skill tree backgrounds: node scripts/treebg.mjs -> /tmp/look/tbg-<kind>.png
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('http://localhost:4173/'); await page.waitForTimeout(800);
for (const k of ['knight', 'rogue', 'mage']) {
  await page.evaluate((k) => { game.treeUI.open(k); game.treeUI.fit(); game.treeUI.applyView(); }, k);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `/tmp/look/tbg-${k}.png` });
  if (k === 'knight') { await page.evaluate(() => { game.treeUI.view.x = -120; game.treeUI.view.z = 1.6; game.treeUI.applyView(); }); await page.waitForTimeout(500); await page.screenshot({ path: '/tmp/look/tbg-knight-panned.png' }); }
}
await b.close(); console.log(errs.length ? errs.join('\n') : 'OK');
