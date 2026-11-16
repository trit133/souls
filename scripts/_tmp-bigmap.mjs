import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1440, height: 860 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4199/'); await page.waitForFunction(() => window.game?.world); await page.waitForTimeout(500);
for (const [id, name] of [['r1a1', 'ashfall-ward'], ['r1a2', 'sump-lines'], ['r1a3', 'saint-orsks-spire']]) {
  const info = await page.evaluate((id) => { const g = game; g.loop = () => {}; g.audio.play = () => {}; g.start('knight'); g.buildRun({ raid: id }, 4242, 1); for (let i = 0; i < 5; i++) g.step(1 / 60, 1 / 60);
    const M = g.minimap; for (let x = -50; x <= 50; x += 8) for (let z = -50; z <= 62; z += 8) M.reveal(x, z, 13);
    M.toggle(true); for (let i = 0; i < 3; i++) g.step(1 / 60, 1 / 60); M.update(0.1);
    return { layers: M.layers.length, seen: M.layers[0].seen.reduce((a, v) => a + v, 0), on: M.on }; }, id);
  console.log(id, JSON.stringify(info));
  await page.waitForTimeout(300);
  const el = await page.$('#bigmap canvas');
  await el.screenshot({ path: `/home/h-e-r-b-i-e/hermes-claude-projects/souls/public/maps/old/area-${id}-${name}.png` });
}
await b.close(); console.log(errs.length ? errs : 'ok');
