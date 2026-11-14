// Shots of the world map and the Shattered March's map (mapart.js), as a signed-in account with no gems and with all
// three, and how long each takes to draw. /tmp/look/map-world.png, /tmp/look/map-r1-<state>.png
// node scripts/look-map.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4199/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1440, height: 860 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(900);
const t = await page.evaluate(() => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.accounts.data = g.accounts.data || { gems: {}, raids: {}, stats: {} }; g.accounts.data.gems = {};
  const t0 = performance.now(); g.worldMap.open(() => {}, () => {}); return Math.round(performance.now() - t0);
});
await page.waitForTimeout(300); await page.screenshot({ path: '/tmp/look/map-world.png' });
const t2 = await page.evaluate(() => { const t0 = performance.now(); game.worldMap.showRegion('r1'); return Math.round(performance.now() - t0); });
await page.waitForTimeout(300); await page.screenshot({ path: '/tmp/look/map-r1-none.png' });
await page.evaluate(() => { const d = game.accounts.data; d.gems = { gem_hask: 1, gem_vael: 1, gem_gorrath: 1 }; game.worldMap.showRegion('r1'); });
await page.waitForTimeout(300); await page.screenshot({ path: '/tmp/look/map-r1-all.png' });
console.log(`world drawn in ${t} ms, region in ${t2} ms`);
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
