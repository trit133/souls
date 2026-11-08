// Close-up and in-game screenshots of the character models for visual review.
// node scripts/models.mjs <tag> [kinds]  -> /tmp/look/<tag>-model-<kind>-<pose>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const tag = process.argv[2] || 'm', kinds = (process.argv[3] || 'knight,rogue,mage').split(',');
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await page.goto('http://localhost:4173/?chain'); await page.waitForTimeout(800);
await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
for (const kind of kinds) {
  for (const [pose, dist] of [['walk', 3.2], ['sprint', 3.2], ['attack', 3.2], ['game', 0]]) {
    await page.evaluate(({ kind, pose, dist }) => {
      game.loop = () => {};
      if (!game.player || game.player.kind !== kind || pose === 'walk') {
        game.start(kind); game.audio.play = () => {};
        for (const e of game.enemies) { e.die(); e.rig.root.visible = false; }
      }
      const p = game.player;
      p.pos.set(0, 0, 0); p.yaw = 0;
      const mv = pose === 'walk' ? { x: 0.0, y: 0.55 } : pose === 'sprint' ? { x: 0.3, y: 1 } : { x: 0, y: 0 };
      game.input.move = () => mv;
      game.input.sprintHeld = () => pose === 'sprint';
      const frames = pose === 'attack' ? 14 : 70;
      if (pose === 'attack') { p.setState('move'); p.st = p.maxSt; game.input.pressed.add('attack'); }
      for (let i = 0; i < frames; i++) game.step(1 / 60, 1 / 60);
      if (dist) {
        // in front of the character, three-quarters to its left
        const c = game.camera, q = p.pos, a = p.yaw + 0.6;
        c.position.set(q.x + Math.sin(a) * dist, 1.8, q.z + Math.cos(a) * dist); c.lookAt(q.x, 0.95, q.z);
      }
      game.pixel.render(game.scene, game.camera);
    }, { kind, pose, dist });
    await page.screenshot({ path: `/tmp/look/${tag}-model-${kind}-${pose}.png` });
  }
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].slice(0, 8).join('\n') : 'OK');
