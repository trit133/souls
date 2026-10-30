// Module system checks: connectivity across random layouts, encounter/gate flow,
// bonfire + respawn, and a screenshot of every module.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('.shots', { recursive: true });
const URL = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(URL); await page.waitForTimeout(600);

await page.evaluate(() => {
  game.loop = () => {};
  window.run = (sec, fn) => { for (let i = 0; i < sec * 60; i++) { fn && fn(); let dt = 1 / 60; if (game.freeze > 0) { game.freeze -= dt; dt = 0; } else if (game.slow > 0) { game.slow -= dt; dt *= 0.35; } game.step(dt, 1 / 60); } };
  // flood fill over walkable cells (gates opened) from start to the final arena centre
  window.connected = () => {
    const w = game.world;
    const saved = Object.values(w.gates).map((g) => [g.id, g.open]);
    for (const g of Object.values(w.gates)) g.open = true;
    const r = 0.45, step = 0.5;
    const zEnd = w.mods[w.mods.length - 1].z1;
    const key = (x, z) => x + ',' + z;
    const seen = new Set();
    const q = [[0, Math.round(game.respawnAt.z / step) * step]];
    seen.add(key(...q[0]));
    let reached = false, maxDepth = 0;
    const target = game.encounters.find((e) => e.kind === 'boss').arena;
    while (q.length) {
      const [x, z] = q.pop();
      maxDepth = Math.min(maxDepth, z);
      if (Math.hypot(x - target.x, z - target.z) < 3) { reached = true; break; }
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (seen.has(k) || nz < zEnd - 2 || nz > 4 || Math.abs(nx) > 30) continue;
        seen.add(k);
        if (w.walkable(nx, nz, r) && !w.obstacles.some((o) => Math.hypot(nx - o.x, nz - o.z) < o.r + r * 0.6)) q.push([nx, nz]);
      }
    }
    for (const [id, o] of saved) w.gates[id].open = o;
    return { reached, deepest: +maxDepth.toFixed(1) };
  };
});

// 1) connectivity over many random layouts
const conn = await page.evaluate(() => {
  game.start('knight'); game.audio.play = () => {};
  const fails = [], layouts = new Set();
  for (let i = 0; i < 40; i++) {
    game.buildRun();
    layouts.add(game.layout.join('>'));
    const c = connected();
    if (!c.reached) fails.push({ layout: game.layout, deepest: c.deepest });
  }
  return { tried: 40, distinctLayouts: layouts.size, fails };
});
console.log('1 connectivity:', JSON.stringify(conn));

// 2) every module type appears and has enemies; spawns are on walkable ground
const all = ['ruins', 'camp', 'bridge', 'village', 'crypt', 'bog', 'gate'];
const layoutsToShoot = [['ruins', 'camp', 'mini', 'bridge', 'village', 'crypt', 'boss'], ['bog', 'gate', 'mini', 'ruins', 'camp', 'bridge', 'boss']];
const spawnCheck = await page.evaluate((L) => {
  const out = {};
  for (const layout of L) {
    game.buildRun(layout);
    for (const m of game.world.mods) {
      const es = game.enemies.filter((e) => e.mod === m.i);
      const bad = es.filter((e) => !game.world.walkable(e.pos.x, e.pos.z, e.radius, e.mod)).map((e) => e.type + '@' + e.pos.x.toFixed(1) + ',' + e.pos.z.toFixed(1));
      out[m.key] = { name: m.name, len: m.len, enemies: es.map((e) => e.type).join(','), badSpawns: bad };
    }
  }
  return out;
}, layoutsToShoot);
console.log('2 modules:', JSON.stringify(spawnCheck, null, 1));

// 3) screenshots of every module (enemies left in place)
for (const layout of layoutsToShoot) {
  await page.evaluate((layout) => { game.buildRun(layout); }, layout);
  const mods = await page.evaluate(() => game.world.mods.map((m) => ({ key: m.key, z: m.z0 - m.len * 0.45 })));
  for (const m of mods) {
    await page.evaluate((z) => {
      const p = game.player; p.respawn(0, z);
      // find a walkable spot near the middle
      for (let x = 0; x < 12; x += 0.5) for (const s of [1, -1]) if (game.world.walkable(s * x, z, 0.5)) { p.pos.set(s * x, 0, z); x = 99; break; }
      game.camPos.set(p.pos.x, 14, p.pos.z + 12); game.camLook.set(p.pos.x, 0.8, p.pos.z);
      for (const e of game.enemies) e.hpShow = 0;
      run(0.6, () => { game.player.hp = game.player.maxHp; });
      game.renderer.render(game.scene, game.camera);
    }, m.z);
    await page.screenshot({ path: `.shots/mod-${m.key}.png` });
  }
}

// 4) encounter flow: mini boss fight, gates, kill, bonfire, death -> respawn at bonfire
const flow = await page.evaluate(() => {
  game.start('knight'); game.audio.play = () => {};
  const w = game.world, p = game.player;
  const mini = game.encounters.find((e) => e.kind === 'mini');
  const A = mini.arena;
  const r = {};
  r.beforeOutGateOpen = w.gates.mini_out.open;
  // enter: start at entry corridor and walk in
  for (const e of game.enemies) e.die();
  p.pos.set(0, 0, A.z + A.r + 4); game.input.move = () => ({ x: 0, y: 1 });
  run(2.5);
  game.input.move = () => ({ x: 0, y: 0 });
  r.fightStarted = mini.active; r.inGateClosed = !w.gates.mini_in.open; r.bossName = document.getElementById('boss-name').textContent;
  // can the player walk around inside?
  const z0 = p.pos.z; game.input.move = () => ({ x: 1, y: 0 }); run(0.6); game.input.move = () => ({ x: 0, y: 0 });
  r.movedInArena = +Math.abs(p.pos.x).toFixed(2);
  // can't leave through the out gate
  p.pos.set(0, 0, A.z - A.r + 1.5); game.input.move = () => ({ x: 0, y: 1 * -1 }); run(1.5, () => { p.hp = p.maxHp; }); game.input.move = () => ({ x: 0, y: 0 });
  r.blockedByOutGate = p.pos.z > A.z - A.r - 0.5;
  // kill the mini boss
  const hask = mini.boss; hask.hp = 1;
  p.pos.set(hask.pos.x, 0, hask.pos.z + hask.radius + 1.2); p.yaw = Math.PI; p.lock = hask;
  run(0.2); game.input.pressed.add('attack'); run(3, () => { p.hp = p.maxHp; });
  r.haskDead = !hask.alive; r.defeated = mini.defeated;
  run(3);
  r.outGateOpenAfter = w.gates.mini_out.open; r.inGateOpenAfter = w.gates.mini_in.open;
  // walk to bonfire and rest
  const bf = w.bonfires[0];
  p.pos.set(bf.x, 0, bf.z + 1.8); p.setState('move'); run(0.3);
  game.input.pressed.add('interact'); run(0.5);
  r.bonfireLit = bf.lit; r.respawnIsBonfire = game.respawnAt === bf;
  r.bonfireCount = w.bonfires.length;
  // die somewhere later and respawn at the bonfire, with the mini boss staying dead
  p.setState('move'); p.hp = 1; p.pos.set(0, 0, bf.z - 20);
  p.receive({ dmg: 999, srcPos: p.pos.clone().add({ x: 0, y: 0, z: 1 }), knock: 'light' });
  return r;
});
console.log('4 flow:', JSON.stringify(flow));
await page.waitForTimeout(4300);
const after = await page.evaluate(() => {
  run(0.1);
  const bf = game.world.bonfires[0], p = game.player, mini = game.encounters.find((e) => e.kind === 'mini');
  return { alive: p.alive, nearBonfire: Math.hypot(p.pos.x - bf.x, p.pos.z - bf.z) < 3, miniStillDefeated: mini.defeated, outGateOpen: game.world.gates.mini_out.open };
});
console.log('4b respawn:', JSON.stringify(after));

// 5) final boss trigger still works in the new arena
const fin = await page.evaluate(() => {
  const enc = game.encounters.find((e) => e.kind === 'boss'), A = enc.arena, p = game.player;
  p.setState('move'); p.pos.set(0, 0, A.z + A.r + 3); game.input.move = () => ({ x: 0, y: 1 });
  run(3); game.input.move = () => ({ x: 1, y: 0 }); const x0 = p.pos.x; run(0.5); game.input.move = () => ({ x: 0, y: 0 });
  return { active: enc.active, boss: enc.boss.state, moved: +(p.pos.x - x0).toFixed(2), gateClosed: !game.world.gates.boss_in.open };
});
console.log('5 final boss:', JSON.stringify(fin));

if (errs.length) { console.log('ERRORS\n' + [...new Set(errs)].slice(0, 6).join('\n')); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
