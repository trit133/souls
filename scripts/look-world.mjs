// Screenshots of the world for the retheme: the start beacon and a few chambers in each dungeon, and the Varek
// approach. /tmp/look/world-*.png. node scripts/look-world.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
const shot = async (name, fn, arg) => {
  await page.evaluate(fn, arg);
  await page.evaluate(() => { const g = game; for (let i = 0; i < 40; i++) g.step(1 / 60, 1 / 60); document.getElementById('hud').style.display = 'none'; g.pixel.render(g.scene, g.camera); });
  await page.screenshot({ path: `/tmp/look/world-${name}.png` });
};
for (const act of [0, 1, 2]) {
  await shot(`a${act}-start`, (act) => { const g = game; g.audio.play = () => {}; g.start('knight'); if (act) g.buildAct(act); g.player.hp = g.player.maxHp = 1e9; for (const e of g.enemies) e.cd = 99; const bf = g.world.bonfires[0]; if (bf) bf.lit = true; }, act);
  for (const k of [3, 9, 15]) await shot(`a${act}-c${k}`, (k) => { const g = game, cells = g.world.dungeon.cells.filter((c) => c.kind !== 'corridor'); const c = cells[k % cells.length]; g.player.pos.set(c.cx, 0, c.cz); g.lastGood = null; g.camPos.set(c.cx, 14, c.cz + 12); }, k);
}
await shot('varek', () => { const g = game; g.start('knight'); g.buildRun(['gate', 'boss'], 3); g.player.hp = g.player.maxHp = 1e9; for (const e of g.enemies) e.cd = 99; });
await b.close();
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
