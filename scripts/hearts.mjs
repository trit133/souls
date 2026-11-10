// Hearts: about a third of kills drop one; walking over it while hurt heals 20 (×NUM), at full health it stays;
// a new level clears them. Also the combo window (340 ms). Screenshot /tmp/hearts.png. node scripts/hearts.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
const out = await page.evaluate(async () => {
  const g = game, o = {}; g.audio.play = () => {};
  const { COMBO_WINDOW } = await import('/src/combos.js').catch(() => ({}));
  o.comboWindow = COMBO_WINDOW ?? 'n/a (built)';
  g.start('knight');
  const p = g.player; p.hp = p.maxHp = 1e6;
  // drop rate over many kills
  let drops = 0; const N = 2000; const e0 = g.enemies[0];
  for (let i = 0; i < N; i++) { const before = g.hearts.length; g.onEnemyKilled(e0); if (g.hearts.length > before) drops++; }
  o.dropRate = +(drops / N).toFixed(3);
  g.clearHearts();
  // pickup: at full health it stays, hurt it heals 200
  p.maxHp = 1500; p.hp = 1500; g.spawnHeart(p.pos.x + 0.5, p.pos.z, 'ht1'); for (let i = 0; i < 10; i++) g.step(1 / 60, 1 / 60);
  o.stayedAtFull = g.hearts.length === 1;
  p.hp = 1000; for (let i = 0; i < 10; i++) g.step(1 / 60, 1 / 60);
  o.healed = Math.round(p.hp - 1000); o.taken = g.hearts.length === 0;
  p.hp = 1450; g.spawnHeart(p.pos.x, p.pos.z, 'ht2'); for (let i = 0; i < 5; i++) g.step(1 / 60, 1 / 60);
  o.cappedAtMax = Math.round(p.hp);
  g.spawnHeart(p.pos.x + 3, p.pos.z, 'ht3'); g.spawnHeart(p.pos.x - 3, p.pos.z + 1, 'ht4'); p.hp = p.maxHp;
  for (let i = 0; i < 20; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera);
  return o;
});
await page.screenshot({ path: '/tmp/hearts.png' });
out.clearedOnNewLevel = await page.evaluate(() => { game.start('knight'); return game.hearts.length; });
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
