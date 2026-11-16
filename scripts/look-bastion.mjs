// The Sentinel's Bastion and Varek's throne (modules.js FINAL_MODULES): seen from the game's camera along the climb,
// with the heights along the way, a walk from the beacon to the throne and the crowd in the stands.
// /tmp/look/bastion-*.png    node scripts/look-bastion.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(process.argv[2] || 'http://localhost:4199/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 }); await page.waitForTimeout(500);
const SHOTS = [['landing', 0, -4], ['causeway', 0, -14], ['court', 0, -32], ['gallery', -10, -38], ['door', 0, -54], ['arena-in', 0, -72], ['arena', 0, -90], ['stands', 12, -100]];
const info = await page.evaluate(() => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  const t0 = performance.now(); g.start('knight'); g.buildRun({ raid: 'r1f' }, 4242, 1); const built = Math.round(performance.now() - t0);
  for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const p = g.player; p.hp = p.maxHp = 1e9;
  for (const e of g.enemies) e.update = () => {};
  const w = g.world, f = (x, z) => +w.floorAt(x, z).toFixed(2);
  const heights = []; for (let z = -2; z > -124; z -= 4) heights.push(f(0, z));
  return { built, heights, enemies: g.enemies.map((e) => e.type + '@' + Math.round(e.pos.x) + ',' + Math.round(e.pos.z) + ' gy' + (e.gy ?? 0).toFixed(1)), mods: w.mods.map((m) => m.name + ' ' + m.z0 + '..' + m.z1), crowd: w.crowd?.length || 0 };
});
console.log(JSON.stringify(info));
for (const [name, x, z] of SHOTS) {
  await page.evaluate(([x, z]) => { const g = game, p = g.player; g.camLock = false; p.pos.set(x, 0, z); p.gy = g.world.floorAt(x, z); p.pos.y = p.gy; p.setState('move'); p.yaw = Math.PI; g.lastGood = null; for (let i = 0; i < 50; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera); }, [x, z]);
  await page.screenshot({ path: `/tmp/look/bastion-${name}.png` });
}
// a walk from the beacon, up the causeway, across the court, up the grand stair, through the Gem Door into the arena
const walk = await page.evaluate(() => {
  const g = game, p = g.player, seen = [];
  for (const e of g.enemies) e.update = Object.getPrototypeOf(e).update;
  for (let i = 0; i < 5; i++) g.step(1 / 60, 1 / 60);
  seen.push('enemies gy ' + g.enemies.map((e) => e.type + ':' + e.gy.toFixed(1)).join(' '));
  for (const e of g.enemies) if (e.alive) e.die(true);
  for (let i = 0; i < 90; i++) g.step(1 / 60, 1 / 60);
  p.pos.set(0, 0, -3); p.gy = g.world.floorAt(0, -3); p.setState('move'); g.lastGood = null;
  for (const [tx, tz] of [[2.6, -3.5], [2.6, -7.5], [0, -10], [0, -28], [0, -33], [-8.5, -35.5], [-12, -36], [-12, -45], [0, -50], [0, -60], [0, -73], [0, -82], [0, -95]]) {
    for (let i = 0; i < 900; i++) { const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.6) break; g.input.move = () => ({ x: dx / d, y: -dz / d }); g.step(1 / 60, 1 / 60); if (p.state !== 'move' && seen[seen.length - 1] !== p.state) seen.push(p.state); }
    seen.push(`${tx},${tz}:${Math.round(p.pos.x)},${Math.round(p.pos.z)}@${p.gy.toFixed(1)}`);
  }
  g.input.move = () => ({ x: 0, y: 0 }); return seen.join(' ');
});
console.log('walk', JSON.stringify(walk));
// the crowd through the fight: cheering, a roar when he hits you, banging while he's staggered, erupting at his
// second phase, silent once he's dead
const moods = [['cheer', () => {}], ['roar', (g) => { g.player.hp -= 50; }], ['hush', (g, B) => { B.setState('parried'); }], ['erupt', (g, B) => { B.hp = B.maxHp * 0.5; }], ['dead', (g, B) => { B.hp = 0; B.die?.(); }]];
await page.evaluate(() => {
  const g = game, p = g.player, enc = g.encounters.find((e) => e.kind === 'boss');
  p.pos.set(enc.arena.x, 0, enc.arena.z + enc.arena.r - 3); p.gy = 0; p.setState('move'); g.lastGood = null;
  for (let i = 0; i < 240; i++) g.step(1 / 60, 1 / 60);
  window.__enc = enc; enc.boss.update = () => {}; // (he stands still for the pictures)
  p.pos.set(enc.arena.x + 6, 0, enc.arena.z - 12); g.camPos.set(p.pos.x, 14, p.pos.z + 12);
  for (let i = 0; i < 60; i++) g.step(1 / 60, 1 / 60);
});
for (const [name, fn] of moods) {
  const st = await page.evaluate((src) => { const g = game, B = __enc.boss; (0, eval)('(' + src + ')')(g, B); const out = []; for (let i = 0; i < 40; i++) { g.step(1 / 60, 1 / 60); } g.pixel.render(g.scene, g.camera); return { active: __enc.active, A: +(g.world.crowdObj?.A ?? -1).toFixed(2), state: B.state, alive: B.alive }; }, fn.toString());
  console.log(name, JSON.stringify(st));
  await page.screenshot({ path: `/tmp/look/bastion-crowd-${name}.png` });
}
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
await b.close();
