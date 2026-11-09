// Screenshots round a dungeon: each chamber theme, the three seals (with an elite, the circle running, the effigies),
// the sealed door, the full map. Files in /tmp/dl-*.png. node scripts/dungeon-look.mjs [seed]
import { chromium } from 'playwright';
const seed = +(process.argv[2] || 4242);
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5180/'); await page.waitForTimeout(800);
await page.evaluate((seed) => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.newLayout = () => 'dungeon'; const R = Math.random; let s = seed; Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  g.start('knight'); Math.random = R;
  g.player.hp = g.player.maxHp = 1e6; g.player.iframe = () => true;
  for (const e of g.enemies) e.cd = 99;
  window.snap = (x, z, sec = 0.6) => { g.player.pos.set(x, 0, z); g.lastGood = null; g.camPos.set(x, 14, z + 12); for (let i = 0; i < sec * 60; i++) g.step(1 / 60, 1 / 60); g.ui.toast('', 0); g.pixel.render(g.scene, g.camera); };
}, seed);
const shots = await page.evaluate(() => {
  const D = game.world.dungeon, list = [];
  const seen = new Set();
  for (const c of D.cells) if (c.kind === 'room' && !seen.has(c.theme)) { seen.add(c.theme); list.push(['room-' + c.theme, c.cx, c.cz + 5]); }
  for (const s of game.world.seals) list.push(['seal-' + s.kind, s.x, s.z + 5.5]);
  const gate = game.world.gates[D.enc.gateIn];
  list.push(['door', gate.x - D.arenaDir[0] * 5, gate.z - D.arenaDir[1] * 5 + 2]);
  return list;
});
for (const [name, x, z] of shots) {
  await page.evaluate(([x, z, name]) => { window.snap(x, z, name.startsWith('seal-c') || name.startsWith('seal-a') ? 3 : 0.6); }, [x, z, name]);
  await page.screenshot({ path: `/tmp/dl-${name}.png` });
}
await page.evaluate(() => { for (let i = 0; i < 40; i++) { const D = game.world.dungeon; const c = D.cells[i % D.cells.length]; game.minimap.reveal(c.cx, c.cz, 20); } game.minimap.toggle(true); game.minimap.t = 0; game.minimap.update(0.016); });
await page.screenshot({ path: '/tmp/dl-map.png' });
await b.close();
console.log(shots.map((s) => s[0]).join(' '));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
