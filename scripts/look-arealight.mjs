// The enhanced lighting (lighting.js) in the Shattered March's four raid areas, a Night Raid and a hideout: each on
// High, beside the old lighting (lighting off) to compare how bright it is. /tmp/look/al-<place>-<new|old>.png
// node scripts/look-arealight.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
await page.goto(url); await page.waitForTimeout(900);
await page.evaluate(() => {
  const g = game; g.audio.play = () => {}; g.audio.music = () => {};
  g.accounts.data = g.accounts.data || { gems: {}, raids: {}, stats: { wins: 0, runs: 0 } }; g.accounts.data.stats ||= { wins: 0, runs: 0 };
  Object.assign(g.settings, { gfx: 'high', shadows: 'high', torchShadows: true, godRays: true, bloom: true, ao: false, palette: 'soft' }); g.applySettings(g.settings);
  g._site = g.lighting.site.bind(g.lighting);
});
const shoot = async (name) => {
  await page.waitForTimeout(2200); await page.screenshot({ path: `/tmp/look/al-${name}-new.png` });
  const on = await page.evaluate(() => game.lighting.on);
  await page.evaluate(() => { game.lighting.site = () => null; }); await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/look/al-${name}-old.png` });
  await page.evaluate(() => { game.lighting.site = game._site; });
  console.log(name.padEnd(8), 'lighting:', on);
};
const only = process.argv[3]; // (one place: r1a1 ... r1f, night, hideout)
for (const area of ['r1a1', 'r1a2', 'r1a3', 'r1f'].filter((a) => !only || a === only)) {
  await page.evaluate((area) => { const g = game; g.start('knight'); g.buildRun({ raid: area }, 7, 1); g.player.pos.set(g.world.start.x, g.player.pos.y, g.world.start.z); g.player.hp = g.player.maxHp = 1e6; g.enemies.forEach((e) => { e.ai = false; }); }, area);
  await shoot(area);
}
if (!only || only === 'night') await page.evaluate(() => { const g = game; g.start('knight'); g.buildRun({ raid: 'r1a1', night: true }, 7, 1); g.night = true; g.setNight(true); g.player.pos.set(g.world.start.x, g.player.pos.y, g.world.start.z); });
if (!only || only === 'night') await shoot('night');
await page.evaluate(() => { const g = game; g.toTitle(); g.accounts.user = g.accounts.user || 'looker'; g.accounts.save = () => {}; g.accounts.data.lastKind = 'knight'; g.hermitage.open('knight'); g.hermitage.setGuide(false); });
await shoot('hideout');
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
