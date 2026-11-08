// Screenshots of every room and arena from above and from the player's view, to review the set dressing.
// node scripts/rooms-look.mjs [tag] -> /tmp/look/<tag>-room-<key>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const tag = process.argv[2] || 'r';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('http://localhost:4173/'); await page.waitForTimeout(800);
const LAYOUT = ['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
const n = await page.evaluate((LAYOUT) => {
  document.getElementById('hud').style.display = 'none';
  game.loop = () => {}; game.start('knight'); game.audio.play = () => {}; game.buildRun(LAYOUT, 11);
  for (const e of game.enemies) { e.update = () => {}; }
  return game.world.mods.length;
}, LAYOUT);
for (let i = 0; i < n; i++) {
  for (const view of ['play', 'high']) {
    await page.evaluate(({ i, view }) => {
      const m = game.world.mods[i], p = game.player, enc = game.encounters.find((e) => e.mod === i);
      const z = enc ? enc.arena.z + (view === 'play' ? 6 : 0) : m.z0 - m.len * 0.45;
      p.pos.set(0, 0, z + 4); game.world.mods.forEach((mm) => (mm.group.visible = Math.abs(mm.i - i) <= 1));
      if (enc && i < 10) { enc.active = true; }
      for (let k = 0; k < 40; k++) { game.world.update(1 / 60, game.time + k / 60, game.fx, p.pos); game.fx.update(1 / 60); }
      const c = game.camera;
      if (view === 'play') { c.position.set(0, 12, z + 14); c.lookAt(0, 0, z - 4); }
      else { c.position.set(0, 34, z + 16); c.lookAt(0, 0, z - 3); }
      game.pixel.render(game.scene, game.camera);
    }, { i, view });
    await page.screenshot({ path: `/tmp/look/${tag}-room-${i}-${LAYOUT[i].replace(':', '-')}-${view}.png` });
  }
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
