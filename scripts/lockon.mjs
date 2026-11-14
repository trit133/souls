// Lock-on picks the enemy nearest the mouse cursor (not the nearest to you); with no mouse, the old pick
// (nearest the way you're heading). Also a screenshot of the skill tree: /tmp/look/tree-notables.png.
// node scripts/lockon.mjs [url]  (a build served on :4173)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const URL = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [], fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(URL); await p.waitForTimeout(600);
await p.evaluate(() => game.start('knight')); await p.waitForTimeout(1200);
// two enemies: a near one to the left, a further one to the right
const far = await p.evaluate(() => {
  const pl = game.player, es = game.enemiesAll().filter((e) => e.alive);
  for (const e of es) { e.update = () => {}; e.pos.set(pl.pos.x + 200, 0, pl.pos.z); }
  const [near, far] = es;
  near.pos.set(pl.pos.x - 2.5, 0, pl.pos.z); far.pos.set(pl.pos.x + 6, 0, pl.pos.z - 1);
  window.__near = near; window.__far = far;
  const v = far.pos.clone(); v.y = 1.1; v.project(game.camera);
  return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
});
await p.waitForTimeout(500);
await p.mouse.move(far.x + 15, far.y + 10);
await p.evaluate(() => game.toggleLock());
check(await p.evaluate(() => game.player.lock === window.__far), 'mouse on the far enemy: locks it, not the nearer one');
await p.evaluate(() => game.toggleLock());
check(await p.evaluate(() => game.player.lock === null), 'pressing again unlocks');
await p.mouse.move(300, 270);
await p.evaluate(() => game.toggleLock());
check(await p.evaluate(() => game.player.lock === window.__near), 'mouse to the left: locks the near one');
await p.evaluate(() => { game.player.lock = null; game.pings.mouse.seen = false; game.toggleLock(); });
check(await p.evaluate(() => !!game.player.lock), 'no mouse: still locks something');
// the tree
await p.evaluate(() => { game.toTitle(); game.treeUI.open('knight'); }); await p.waitForTimeout(1200);
await p.screenshot({ path: '/tmp/look/tree-notables.png' });
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
console.log(fails.length ? `${fails.length} FAILED` : 'ALL OK');
await b.close();
process.exit(fails.length || errs.length ? 1 : 0);
