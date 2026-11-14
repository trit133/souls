// Guard for a raid area's map: a hash of everything gameplay touches (solids, obstacles, slow water, walkable cells,
// stairs, shrines, chests, drums, every enemy with its defences and elements) over three draws (the third a party of
// two). Run before and after a change that shouldn't touch play: the hashes must match.
// node scripts/raid-fingerprint.mjs [url] [areas]   areas: comma list (default r1a1)
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4199/';
const areas = (process.argv[3] || 'r1a1').split(',');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 320, height: 200 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(800);
const out = await page.evaluate((areas) => {
  const g = game, res = {}; g.loop = () => {}; g.audio.play = () => {};
  const h = (x) => { let v = 2166136261; for (let i = 0; i < x.length; i++) { v ^= x.charCodeAt(i); v = Math.imul(v, 16777619) >>> 0; } return v.toString(16); };
  const r2 = (v) => Math.round(v * 100) / 100;
  g.start('knight');
  for (const area of areas) for (const s of [1, 2, 3]) {
    g.buildRun({ raid: area }, s * 1000, s === 3 ? 2 : 1);
    const W = g.world, D = W.dungeon;
    let walk = 0; for (let x = -52; x <= 52; x += 1.5) for (let z = -52; z <= 66; z += 1.5) if (W.walkable(x, z, 0.42, null, true)) walk += x * 7 + z * 13 + 1;
    res[area + ' ' + s] = h(JSON.stringify({
      solids: W.solids.map((q) => [q.x0, q.x1, q.z0, q.z1].map(r2)), obs: W.obstacles.map((o) => [o.x, o.z, o.r].map(r2)), slows: W.slows.map((q) => [q.x, q.z, q.r, q.f].map(r2)),
      walk: r2(walk), stairs: D.stairs.map((q) => [r2(q.x), r2(q.z)]), seals: W.seals.map((q) => [q.kind, r2(q.x), r2(q.z)]),
      chests: W.chests.map((c) => [r2(c.x), r2(c.z), c.rarity, c.guards.length]), drums: W.drums.map((d) => [r2(d.x), r2(d.z)]),
      enemies: [...g.enemies, ...g.reserves].map((e) => [e.type, r2(e.pos.x), r2(e.pos.z), e.maxHp, e.elite || '', JSON.stringify(e.def), JSON.stringify(e.elems)]),
    }));
  }
  return res;
}, areas);
console.log(JSON.stringify(out));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
