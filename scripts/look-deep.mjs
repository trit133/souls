// The Sunless Deep's raid areas (lanternhold.js, wormways.js, glasshallow.js): built, their heights, everything that
// can be reached, a walk between waypoints, and shots from the game's camera at the landmarks.
// /tmp/look/<area>-*.png    node scripts/look-deep.mjs <area> [url]     area: r2a1 | r2a2 | r2a3
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const area = process.argv[2] || 'r2a1';
const SPOTS = {
  r2a1: { heights: { landing: [0, 40], ledges: [0, 20], market: [0, 0], workings: [0, -22], pit: [0, -42] },
    shots: [['landing', 0, 40], ['ledges', -10, 20], ['market', 0, 2], ['chapel', -24, -1], ['workings', 0, -22], ['hall', 14, -24], ['pit', 0, -38], ['winding', 10, 38]],
    walk: [[0, 40], [0, 31], [0, 25], [1, 13], [1, 4], [-3, -11], [-3, -26], [0, -31], [0, -40]] },
  r2a2: { heights: { camp: [0, 40], longbore: [0, 30], trunk: [0, 10], junction: [0, -8], farm: [-35, 12], graveyard: [36, 2], nest: [-36, -33] },
    shots: [['camp', 0, 40], ['longbore', -10, 30], ['trunk', 0, 12], ['junction', 0, -8], ['farm', -34, 12], ['graveyard', 36, 4], ['spiral', 30, -16], ['nest', -36, -22], ['grind', -6, -38]],
    walk: [[0, 40], [10, 38], [10, 31], [0, 30], [0, 10], [0, -8], [-34, -8], [-34, -16], [-34, 4], [0, -8], [22, -8], [22, -20], [30, -20]] },
  r2a3: { heights: { lake: [0, 40], streets: [0, 10], terrace: [0, -12], upper: [0, -30], lakewater: [-34, 38] },
    shots: [['lake', -12, 34], ['quarter', 6, 40], ['gardens', 0, 10], ['streets', -28, 18], ['terrace', 0, -12], ['hallm', -24, -12], ['upper', 0, -28], ['lens', 0, -36], ['altar', 30, -30]],
    walk: [[0, 40], [0, 24], [0, 20], [0, 10], [16, 2], [16, -2], [0, -10], [0, -22], [0, -27], [0, -30], [30, -30]] },
}[area] || { heights: {}, shots: [['start', 0, 40]], walk: [[0, 40]] };
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await page.goto(process.argv[3] || 'http://localhost:5180/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 }); await page.waitForTimeout(500);
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
  for (const s of w.seals) if (s.x < 300 && !ok4(s.x, s.z + 2.5)) bad.push('shrine@' + Math.round(s.x) + ',' + Math.round(s.z));
  const types = {}; for (const e of g.enemies) types[e.type] = (types[e.type] || 0) + 1;
  return { built, cls: D.constructor.name, heights: Object.fromEntries(Object.entries(H).map(([k, [x, z]]) => [k, f(x, z)])), reach: bad, enemies: types, reserves: g.reserves.length, chests: w.chests.length, drums: w.drums.length, seals: w.seals.map((s) => s.kind + '@' + Math.round(s.x) + ',' + Math.round(s.z)), boss: g.bosses.map((x) => x.cfg.id), lights: w.lights.length };
}, { area, H: SPOTS.heights });
console.log(JSON.stringify(info));
for (const [name, x, z] of SPOTS.shots) {
  await page.evaluate(([x, z]) => { const g = game, p = g.player; g.camLock = false; p.pos.set(x, 0, z); p.gy = g.world.floorAt(x, z); p.setState('move'); p.yaw = Math.PI; g.lastGood = null; g.camPos?.set(x, 14, z + 12); for (let i = 0; i < 50; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera); }, [x, z]);
  await page.screenshot({ path: `/tmp/look/${area}-${name}.png` });
}
const walk = await page.evaluate((way) => {
  const g = game, p = g.player; p.pos.set(way[0][0], 0, way[0][1]); p.gy = g.world.floorAt(way[0][0], way[0][1]); p.setState('move'); g.lastGood = null;
  for (const e of [...g.enemies, ...g.reserves]) { if (e.alive && !e.T.still) e.die(true); }
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
