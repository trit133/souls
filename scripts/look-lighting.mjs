// The Proving Ring's enhanced lighting (lighting.js) at each graphics preset, and High with the Strict palette:
// /tmp/look/light-<name>.png, plus the frame time of each (software GL here, so only the differences mean anything).
// node scripts/look-lighting.mjs [url] [w] [h]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4173/', W = +process.argv[3] || 1280, H = +process.argv[4] || 720;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text().slice(0, 300)); });
await page.goto(url); await page.waitForTimeout(900);
await page.evaluate(() => { const g = game; g.audio.play = () => {}; g.training = true; g.start('knight'); g.player.hp = g.player.maxHp = 1e6; g.player.pos.set(-1.5, 0, -9); g.player.yaw = Math.PI; });
const looks = [['low', { gfx: 'low' }], ['medium', { gfx: 'medium' }], ['high', { gfx: 'high' }], ['ultra', { gfx: 'ultra' }], ['high-strict', { gfx: 'high', palette: 'strict' }]];
for (const [name, set] of looks) {
  await page.evaluate((set) => { const g = game, s = g.settings; s.palette = 'soft'; Object.assign(s, set); if (set.gfx !== 'custom') Object.assign(s, ({ low: { shadows: 'off', torchShadows: false, godRays: false, bloom: false, ao: false }, medium: { shadows: 'low', torchShadows: false, godRays: false, bloom: true, ao: false }, high: { shadows: 'high', torchShadows: true, godRays: true, bloom: true, ao: false }, ultra: { shadows: 'high', torchShadows: true, godRays: true, bloom: true, ao: true } })[set.gfx]); g.applySettings(s); }, set);
  await page.waitForTimeout(1800);
  const ms = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { if (++n >= 20) res(Math.round((performance.now() - t0) / n)); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  await page.screenshot({ path: `/tmp/look/light-${name}.png` });
  console.log(name.padEnd(12), ms + ' ms a frame', await page.evaluate(() => `lighting ${game.lighting.on ? 'on' : 'off'}, shadow casters ${game.lighting.marked.size}`));
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
