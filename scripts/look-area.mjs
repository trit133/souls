// Shots round a raid area from the game's own camera: the camp, a tunnel or lane, inside a house, a square, each big
// building, each shrine, a chest and a drum close up, and the whole map from above. /tmp/look/area-<id>-<name>.png
// node scripts/look-area.mjs <area> [url]     (area: r1a1, r1a2, r1a3)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const area = process.argv[2] || 'r1a2', url = process.argv[3] || 'http://localhost:4199/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(900);
const spots = await page.evaluate((area) => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.start('knight'); g.buildRun({ raid: area }, 4242, 1);
  for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const D = g.world.dungeon, p = g.player; p.hp = p.maxHp = 1e9;
  for (const e of [...g.enemies, ...g.reserves]) { if (e.T.still) continue; e.update = () => {}; }
  const out = [];
  const add = (name, x, z, o = {}) => out.push({ name, x, z, ...o });
  add('camp', D.startAt.x, D.startAt.z - 3);
  const lane = [...D.open].map((e) => e).find((e) => e.startsWith('h')); if (lane) { const [i, j] = lane.slice(1).split(',').map(Number); add('lane', -48 + i * 16 + 8, -48 + j * 16); }
  const house = D.buildings.find((x) => x.kind === 'house' && !x.ruin && !x.yard); add('house', house.cx, house.cz);
  const ruin = D.buildings.find((x) => x.ruin); if (ruin) add('ruin', ruin.cx, ruin.cz);
  const yard = D.buildings.find((x) => x.yard); if (yard) add('yard', yard.cx, yard.cz + 2);
  const sq = D.blocks.find((B) => B.type === 'plaza' && !D.shrineSites.includes(B.key)); if (sq) add('square', sq.cx, sq.cz + 3);
  const rb = D.blocks.find((B) => B.type === 'rubble'); if (rb) add('rubble', rb.cx, rb.z1 + 2.5);
  for (const k of ['chapel', 'works', 'barracks']) { const x = D.buildings.find((y) => y.kind === k); if (x) add(k, x.cx, x.cz + 3); }
  for (const s of g.world.seals) add('shrine-' + s.kind, s.x, s.z + 4);
  const c = g.world.chests.find((c) => !c.big); if (c) add('chest', c.x, c.z + 1.6, { close: true });
  const big = g.world.chests.find((c) => c.big); if (big) add('hoard', big.x, big.z + 2.4, { close: true });
  const d = g.world.drums.find((d) => !d.plain); if (d) add('drum', d.x, d.z + 1.4, { close: true });
  return out;
}, area);
for (const s of spots) {
  await page.evaluate((s) => {
    const g = game, p = g.player;
    p.pos.set(s.x, 0, s.z); p.setState('move'); p.yaw = Math.PI; g.lastGood = null; g.camPos?.set(s.x, 14, s.z + 12);
    for (let i = 0; i < 50; i++) g.step(1 / 60, 1 / 60);
    g.pixel.render(g.scene, g.camera);
    if (s.close) { const c = g.camera; g.camLock = true; c.position.set(s.x + 1.8, 2.4, s.z + 2.2); c.lookAt(s.x, 0.4, s.z - 1.4); p.rig.root.visible = false; g.pixel.render(g.scene, c); p.rig.root.visible = true; g.camLock = false; }
  }, s);
  await page.screenshot({ path: `/tmp/look/area-${area}-${s.name}.png` });
}
// from above
await page.evaluate(() => {
  const g = game, c = g.camera; g.camLock = true; g.darkK = 0;
  g.hemi.intensity = 2; g.sun.intensity = 2;
  c.position.set(0, 120, 40); c.lookAt(0, 0, 2); g.pixel.render(g.scene, c);
});
await page.screenshot({ path: `/tmp/look/area-${area}-map.png` });
console.log(spots.map((s) => s.name).join(' '));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
