// The Crucible and the Kiln (modules.js FINAL_MODULES crucible, kiln; regions.js r2f): heights down the approach,
// a walk from the beacon over the chained bridge, through the Kiln-Works and down to the Gem Door, the lava pools
// burning whoever stands in them, and shots along the way. /tmp/look/crucible-*.png   node scripts/look-crucible.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await page.goto(process.argv[2] || 'http://localhost:5180/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 });
const info = await page.evaluate(() => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.start('knight'); g.buildRun({ raid: 'r2f' }, 4242, 1);
  for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const w = g.world, h = []; for (let d = 2; d < 78; d += 4) h.push(+w.floorAt(0, -d).toFixed(1));
  return { mods: w.mods.map((m) => m.name), heights: h, enemies: g.enemies.map((e) => e.type + (e.elite ? '*' : '') + '@' + e.gy.toFixed(1)), reserves: g.reserves.map((e) => e.type).join(','), boss: g.bosses.map((x) => x.cfg.id) };
});
console.log(JSON.stringify(info));
for (const [name, x, z] of [['landing', 0, -4], ['bridge', 0, -24], ['works', 0, -40], ['door', 0, -68], ['kiln', 0, -96], ['kiln-edge', 10, -104]]) {
  await page.evaluate(([x, z]) => { const g = game, p = g.player; p.pos.set(x, 0, z); p.gy = g.world.floorAt(x, z); p.setState('move'); p.yaw = Math.PI; g.lastGood = null; g.camPos.set(x, 14 + p.gy, z + 12); for (let i = 0; i < 50; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera); }, [x, z]);
  await page.screenshot({ path: `/tmp/look/crucible-${name}.png` });
}
const walk = await page.evaluate(() => {
  const g = game, p = g.player, seen = []; p.hp = p.maxHp = 1e9;
  for (const e of g.enemies) if (e.alive) e.die(true);
  for (let i = 0; i < 90; i++) g.step(1 / 60, 1 / 60);
  p.pos.set(2.6, 0, -3); p.gy = g.world.floorAt(2.6, -3); p.setState('move'); g.lastGood = null;
  for (const [tx, tz] of [[2.6, -8], [0, -12], [0, -24], [0, -34], [-4, -40], [0, -50], [0, -60], [0, -75], [0, -82]]) {
    for (let i = 0; i < 900; i++) { const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.6) break; g.input.move = () => ({ x: dx / d, y: -dz / d }); g.step(1 / 60, 1 / 60); if (p.state !== 'move' && seen[seen.length - 1] !== p.state) seen.push(p.state); }
    seen.push(`${tx},${tz}:${Math.round(p.pos.x)},${Math.round(p.pos.z)}@${p.gy.toFixed(1)}`);
  }
  // the lava pool among the furnaces burns
  g.input.move = () => ({ x: 0, y: 0 }); p.hp = p.maxHp = 5000; p.pos.set(-10.5, 0, -39); p.gy = g.world.floorAt(-10.5, -39); p.setState('move');
  const hp0 = p.hp; for (let i = 0; i < 120; i++) g.step(1 / 60, 1 / 60);
  seen.push('lava burned ' + Math.round(hp0 - p.hp));
  return seen.join(' ');
});
console.log('walk', walk);
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
await b.close();
