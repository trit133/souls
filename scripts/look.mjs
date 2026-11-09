// Screenshots for visual review: title, a fight in the camp, Varek's arena, at several screen sizes.
// node scripts/look.mjs <tag> [url]  -> /tmp/look/<tag>-<size>-<scene>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const tag = process.argv[2] || 'now', url = process.argv[3] || 'http://localhost:5180/?chain';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const SIZES = { hd: [1920, 1080, 1], uw: [3440, 1440, 1], phone: [844, 390, 3] };
const errs = [];
for (const [name, [w, h, dpr]] of Object.entries(SIZES)) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: name === 'phone' })).newPage();
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await page.goto(url); await page.waitForTimeout(1500);
  await page.screenshot({ path: `/tmp/look/${tag}-${name}-title.png` });
  await page.evaluate(() => {
    game.start('knight'); game.audio.play = () => {};
    game.buildRun(['camp', 'ruins', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss']);
    game.input.move = () => ({ x: 0, y: 0 });
    const p = game.player, e = game.enemies.filter((x) => x.mod === game.enemies[0].mod).slice(0, 3);
    p.pos.set(e[0].pos.x, 0, e[0].pos.z + 4); p.hp = 1e6;
    for (const x of e) x.alert?.();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `/tmp/look/${tag}-${name}-fight.png` });
  await page.evaluate(() => {
    const enc = game.encounters.find((x) => x.kind === 'boss'); const bo = enc.boss;
    game.player.pos.set(bo.pos.x, 0, bo.pos.z + 7); game.player.yaw = Math.PI;
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `/tmp/look/${tag}-${name}-boss.png` });
  await page.close();
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK screenshots in /tmp/look');
