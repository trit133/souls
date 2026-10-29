// Close-up screenshots of every player/boss attack at its strike frame.
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 480 } })).newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(URL); await page.waitForTimeout(600);
for (const kind of ['knight', 'rogue']) {
  await page.click(`.char[data-char="${kind}"]`); await page.waitForTimeout(600);
  const names = await page.evaluate(() => Object.keys(game.player.c.attacks));
  for (const n of names) {
    for (const [lbl, frac] of [['wind', 0.45], ['hit', 0.75]]) {
      await page.evaluate(([n, frac]) => {
        const p = game.player; p.pos.set(0, 0, -8); p.yaw = 0.6;
        game.debugCam = { follow: p, off: [3.5, 2.6, 3.5], lookY: 1 };
        p.startAttack(p.c.attacks[n]);
        const d = p.c.attacks[n], h = d.hits[0];
        p.__freezeAt = (h.t0 + h.t1) / 2 * (frac / 0.75);
      }, [n, frac]);
      // step manually until the target time
      await page.evaluate(() => { const p = game.player; game.mode = 'paused';
        for (let i = 0; i < 200 && p.atk && p.atk.t < p.__freezeAt; i++) { p.update(1 / 60, game.input, new Set()); }
        game.renderer.render(game.scene, game.camera); game.updateCamera(1); game.renderer.render(game.scene, game.camera); });
      await page.screenshot({ path: `.shots/pose-${kind}-${n}-${lbl}.png` });
      await page.evaluate(() => { game.mode = 'play'; });
    }
  }
  await page.evaluate(() => { game.debugCam = null; game.toTitle(); });
}
await browser.close();
