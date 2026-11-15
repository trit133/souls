// A raid area's map (ward.js and the areas built like it: cut.js, hill.js) seen from the game's camera at its
// landmarks, with its heights, everything reachable, and a walk between the given waypoints.
// /tmp/look/<area>-*.png    node scripts/look-raid.mjs <area> [url]     area: r1a2 | r1a3
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const area = process.argv[2] || 'r1a2';
const SPOTS = {
  r1a2: { heights: { yard: [0, 40], cut: [0, 0], bank: [-20, -14], line: [12, 0], tower: [-31, -21], basin: [0, -48], carriage: [-5, 8], turntable: [25, 11] },
    shots: [['yard', 2, 36], ['ramp', 0, 20], ['cut', 0, 2], ['tunnel', 0, -9], ['carriage', -2, 10], ['line', 12, 10], ['tower', -31, -15], ['bank-west', -20, -4], ['station', 28, 31], ['cathedral', -30, 20], ['turntable', 25, 18], ['basin', 0, -44], ['sluice', 32, -31]],
    walk: [[0, 40], [0, 20], [0, 0], [0, -9], [0, -20], [0, -35], [0, -46]] },
  r1a3: { heights: { yard: [0, 40], cloister: [-14, 20], garth: [0, 17], well: [24, 20], choir: [0, 0], foot: [-10, -30], rampart: [0, -46], bell: [-45, -45] },
    shots: [['yard', 0, 40], ['stair', 0, 34], ['switchback', 40, 34], ['crypt', -25, 24], ['garth', 0, 24], ['well', 24, 27], ['scriptorium', -36, 27], ['choir', 0, 4], ['nave', 0, -2], ['foot', -12, -24], ['foundry', 26, -24], ['rampart', -10, -45], ['belltower', -44, -42]],
    walk: [[0, 40], [0, 34], [0, 25], [-19, 8], [-19, 0], [-27, -20], [-27, -28], [-23, -38], [-23, -46], [-38, -46], [-44, -44]] },
}[area];
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(process.argv[3] || 'http://localhost:4199/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 }); await page.waitForTimeout(500);
const info = await page.evaluate(({ area, H }) => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  const t0 = performance.now(); g.start('knight'); g.buildRun({ raid: area }, 4242, 1); const built = Math.round(performance.now() - t0);
  for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const p = g.player; p.hp = p.maxHp = 1e9;
  for (const e of [...g.enemies, ...g.reserves]) { if (e.T.still) continue; e.update = () => {}; }
  const w = g.world, D = w.dungeon, f = (x, z) => +w.floorAt(x, z).toFixed(2), bad = [];
  const ok4 = (x, z) => [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].some(([a, c]) => D.reach(x + a, z + c) && w.walkable(x + a, z + c, 0.3));
  for (const e of g.enemies) if (!e.reserve && !e.T?.still && e.pos.x < 300 && !ok4(e.pos.x, e.pos.z)) bad.push(e.type + '@' + Math.round(e.pos.x) + ',' + Math.round(e.pos.z));
  for (const st of D.stairs) if (st.x < 300 && !ok4(st.x, st.z)) bad.push('stair@' + Math.round(st.x) + ',' + Math.round(st.z));
  for (const c of w.chests) if (c.x < 300 && !ok4(c.x, c.z)) bad.push('chest@' + Math.round(c.x) + ',' + Math.round(c.z));
  for (const d of w.drums) if (d.x < 300 && !ok4(d.x, d.z)) bad.push('drum@' + Math.round(d.x) + ',' + Math.round(d.z));
  for (const s of w.seals) if (s.x < 300 && !ok4(s.x, s.z + 2.5)) bad.push('shrine@' + Math.round(s.x) + ',' + Math.round(s.z));
  return { built, cls: D.constructor.name, heights: Object.fromEntries(Object.entries(H).map(([k, [x, z]]) => [k, f(x, z)])), reach: bad, enemies: g.enemies.length, chests: w.chests.length, drums: w.drums.length, seals: w.seals.map((s) => s.kind + '@' + Math.round(s.x) + ',' + Math.round(s.z)), sky: !!D.sky };
}, { area, H: SPOTS.heights });
console.log(JSON.stringify(info));
for (const [name, x, z] of SPOTS.shots) {
  await page.evaluate(([x, z]) => { const g = game, p = g.player; g.camLock = false; p.pos.set(x, 0, z); p.gy = g.world.floorAt(x, z); p.setState('move'); p.yaw = Math.PI; g.lastGood = null; g.camPos?.set(x, 14, z + 12); for (let i = 0; i < 50; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera); }, [x, z]);
  await page.screenshot({ path: `/tmp/look/${area}-${name}.png` });
}
const walk = await page.evaluate((way) => {
  const g = game, p = g.player; p.pos.set(way[0][0], 0, way[0][1]); p.gy = g.world.floorAt(way[0][0], way[0][1]); p.setState('move'); g.lastGood = null;
  for (const e of [...g.enemies, ...g.reserves]) { if (e.alive) e.die(true); }
  const seen = [];
  for (const [tx, tz] of way.slice(1)) {
    for (let i = 0; i < 900; i++) { const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.6) break; g.input.move = () => ({ x: dx / d, y: -dz / d }); g.step(1 / 60, 1 / 60); if (p.state !== 'move' && seen[seen.length - 1] !== p.state) seen.push(p.state); }
    seen.push(`${tx},${tz}:${Math.round(p.pos.x)},${Math.round(p.pos.z)}@${p.gy.toFixed(1)}`);
  }
  g.input.move = () => ({ x: 0, y: 0 }); return seen;
}, SPOTS.walk);
console.log('walk', walk.join(' '));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
