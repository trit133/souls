// Dungeons (dungeon.js): build several seeds and check each one: ~22-25 chambers, five seals spread out, the arena
// off the map's edge, everything reachable on foot from the start (the walkable grid flood-filled with the props'
// obstacles in the way), enemies standing on walkable ground, the boss door shut until 3 seals break. Screenshots
// of the start and from high above. node scripts/dungeon.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const seeds = (process.argv[3] || '1,2,3,777,4242,99991').split(',').map(Number);
for (const seed of seeds) {
  const out = await page.evaluate((seed) => {
    const g = game; g.loop = () => {};
    const t0 = performance.now();
    g.buildRun('dungeon', seed, 1);
    const ms = Math.round(performance.now() - t0);
    const w = g.world, D = w.dungeon;
    // flood fill the walkable area (0.5 m grid, actor radius 0.45, obstacles count) from the start
    const step = 0.5, r = 0.45;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const s of w.shapes) { const bb = s.t === 'r' ? [s.x0, s.x1, s.z0, s.z1] : [s.x - s.r, s.x + s.r, s.z - s.r, s.z + s.r]; x0 = Math.min(x0, bb[0]); x1 = Math.max(x1, bb[1]); z0 = Math.min(z0, bb[2]); z1 = Math.max(z1, bb[3]); }
    const W = Math.ceil((x1 - x0) / step), H = Math.ceil((z1 - z0) / step);
    const ok = (i, j) => { const x = x0 + i * step, z = z0 + j * step; if (!w.walkable(x, z, r)) return false; for (const o of w.obstacles) if (Math.abs(o.x - x) < 3 && Math.abs(o.z - z) < 3 && Math.hypot(o.x - x, o.z - z) < o.r + r) return false; return true; };
    const seen = new Uint8Array(W * H), q = [];
    const si = Math.round((w.start.x - x0) / step), sj = Math.round((w.start.z - z0) / step);
    seen[sj * W + si] = 1; q.push(si, sj);
    while (q.length) { const j = q.pop(), i = q.pop(); for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + c; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const k = jj * W + ii; if (seen[k]) continue; if (!ok(ii, jj)) { seen[k] = 2; continue; } seen[k] = 1; q.push(ii, jj); } }
    const reach = (x, z, rad = 1.6) => { for (let dx = -rad; dx <= rad; dx += step) for (let dz = -rad; dz <= rad; dz += step) { const i = Math.round((x + dx - x0) / step), j = Math.round((z + dz - z0) / step); if (seen[j * W + i] === 1) return true; } return false; };
    const unreachedRooms = D.cells.filter((c) => !reach(c.cx + 0.01, c.cz + 0.01, 4)).map((c) => c.key + ':' + c.kind + ':' + c.theme);
    const unreachedSeals = w.seals.filter((s) => !reach(s.x, s.z, 3)).length;
    const enemiesOff = g.enemies.filter((e) => !w.walkable(e.pos.x, e.pos.z, 0.3)).map((e) => e.type + '@' + e.pos.x.toFixed(1) + ',' + e.pos.z.toFixed(1));
    const enemiesUnreached = g.enemies.filter((e) => !reach(e.pos.x, e.pos.z, 2.5)).map((e) => `${e.type}@${e.pos.x.toFixed(1)},${e.pos.z.toFixed(1)} in ${w.moduleAt(e.pos.x, e.pos.z).key}`);
    const gate = w.gates[D.enc.gateIn];
    const doorReach = reach(gate.x - D.arenaDir[0] * 3.5, gate.z - D.arenaDir[1] * 3.5, 1.5);
    // with the door open, the arena too
    w.setGate(D.enc.gateIn, true, true);
    const arenaWalk = w.walkable(D.arena.x, D.arena.z, 0.5);
    const doorPass = [-2, 0, 2].every((k) => w.walkable(gate.x + D.arenaDir[0] * k, gate.z + D.arenaDir[1] * k, 0.45));
    w.setGate(D.enc.gateIn, false, true);
    const doorShut = !w.walkable(gate.x, gate.z, 0.45);
    const kinds = D.cells.reduce((m, c) => ((m[c.kind] = (m[c.kind] || 0) + 1), m), {});
    const sealD = w.seals.map((s) => Math.round(Math.hypot(s.x, s.z)));
    return { ms, cells: D.cells.length, kinds, boss: D.bossId, arenaAt: [D.arena.x, D.arena.z], seals: w.seals.map((s) => s.kind).join(','), sealDist: sealD.join(','),
      enemies: g.enemies.length, reserves: g.reserves.length, elites: g.enemies.filter((e) => e.elite).map((e) => e.elite + ':' + e.type).join(','), effigies: g.enemies.filter((e) => e.effigy).length,
      unreachedRooms, unreachedSeals, enemiesOff, enemiesUnreached, doorReach, doorShut, doorPass, arenaWalk, tiles: w.tiles.length, mods: w.mods.length };
  }, seed);
  console.log('seed', String(seed).padEnd(6), JSON.stringify(out));
}
// screenshots: the start, and a high view
await page.evaluate(() => { game.loop = (t) => {}; game.start('knight'); game.audio.play = () => {}; });
await page.evaluate(() => { for (let i = 0; i < 60; i++) game.step(1 / 60, 1 / 60); game.pixel.render(game.scene, game.camera); });
await page.screenshot({ path: '/tmp/dg-start.png' });
await page.evaluate(() => {
  const g = game, D = g.world.dungeon, c = D.cells.find((c) => c.kind === 'seal');
  g.player.pos.set(c.cx, 0, c.cz + 4);
  for (let i = 0; i < 90; i++) g.step(1 / 60, 1 / 60);
  g.pixel.render(g.scene, g.camera);
});
await page.screenshot({ path: '/tmp/dg-seal.png' });
await page.evaluate(() => {
  const g = game, p = g.player;
  g.debugCam = { follow: null, off: [0, 150, 60], lookY: 0 };
  for (const m of g.world.mods) m.group.visible = true; for (const t of g.world.tiles) t.group.visible = true;
  g.scene.fog.far = 1000; g.scene.fog.near = 900; g.camera.far = 1000; g.camera.updateProjectionMatrix();
  g.updateCamera(0.016); g.world.update = () => {}; g.pixel.render(g.scene, g.camera);
});
await page.screenshot({ path: '/tmp/dg-high.png' });
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
