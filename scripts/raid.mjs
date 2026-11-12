// A raid end to end (city.js): the map is the same every raid while shrines, the boss's stair and enemies move;
// everything can be reached; stairs go down and back up; an enemy finds its way round walls to you; three broken
// shrines open the boss door; the boss's death ends the raid; the world map opens from the Sanctum's Solo Raid; the
// map is small and walled; houses are dark (your cone comes on) and lift their roof only when you're in them; your
// outline shows through a building between you and the camera; archers can't shoot through walls; the dead come back.
// node scripts/raid.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(url); await page.waitForTimeout(700);
const out = await page.evaluate(() => {
  const g = game, res = {};
  g.loop = () => {}; g.audio.play = () => {};
  const run = (n, fn) => { for (let i = 0; i < n; i++) { fn && fn(); g.step(1 / 60, 1 / 60); } };
  const press = (a) => g.input.pressed.add(a);
  const stick = { x: 0, y: 0 }; g.input.move = () => stick;

  // 1. two raids: same buildings, different draws
  const fp = () => { const D = g.world.dungeon; return { walls: g.world.solids.length, bld: D.buildings.map((b) => b.x0.toFixed(1) + b.z0.toFixed(1)).join('|').length, boss: D.bossSite, shrines: D.shrineSites.join(' '), e0: g.enemies.slice(0, 5).map((e) => e.pos.x.toFixed(1)).join(',') }; };
  g.runSeed = 0; g.start('knight'); const a = fp();
  g.start('knight'); const c = fp();
  res.sameMap = a.walls === c.walls && a.bld === c.bld;
  res.draws = [a.boss + ' / ' + a.shrines, c.boss + ' / ' + c.shrines];
  res.enemiesMoved = a.e0 !== c.e0;
  const D = g.world.dungeon, p = g.player;
  p.hp = p.maxHp = 1e7;
  res.enemies = g.enemies.length;
  res.allReach = { shrines: D.sites.every((S) => S.rec.spawnPts.length >= 3), stairs: D.stairs.every((s) => D.reach(s.to.x, s.to.z)), enemies: g.enemies.every((e) => D.reach(e.pos.x, e.pos.z)) };

  // 2. a stair down and back up
  for (const e of g.enemies) { e.update = () => {}; }
  const s = D.stairs.find((x) => x.down);
  p.pos.set(s.x, 0, s.z); p.setState('move'); g.lastGood = null;
  run(2); press('interact'); run(2);
  res.down = { under: D.isUnder(p.pos.x), layer: D.layerAt(p.pos.x, p.pos.z).id, light: +g.hemi.intensity.toFixed(2) };
  run(60);
  res.down.lightAfter = +g.hemi.intensity.toFixed(2);
  const up = D.stairs.find((x) => !x.down && Math.hypot(x.x - p.pos.x, x.z - p.pos.z) < 4);
  p.pos.set(up.x, 0, up.z); run(2); press('interact'); run(2);
  res.backUp = { under: D.isUnder(p.pos.x), nearStair: Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < 4 };

  // 3. an enemy outside a building finds its way in to you round the walls
  const bld = D.buildings.find((x) => x.kind === 'house' && !x.basement && x.doors.length && (x.x1 - x.x0) > 8 && (x.z1 - x.z0) > 8);
  const door = bld.doors[0], dside = door.s, along = dside === 'n' || dside === 's';
  // you just inside the wall, 5 m along it from the doorway; the enemy just outside, across the wall from you
  const dc = along ? bld.x0 + (bld.x1 - bld.x0) * door.t : bld.z0 + (bld.z1 - bld.z0) * door.t;
  const sh = dc - 5 > (along ? bld.x0 : bld.z0) + 1.5 ? dc - 5 : dc + 5;
  const line = dside === 'n' ? bld.z0 : dside === 's' ? bld.z1 : dside === 'w' ? bld.x0 : bld.x1, sgn = dside === 'n' || dside === 'w' ? -1 : 1;
  const ix = along ? sh : line - sgn * 1.4, iz = along ? line - sgn * 1.4 : sh;
  const ox = along ? sh : line + sgn * 1.6, oz = along ? line + sgn * 1.6 : sh;
  g.start('knight'); const D2 = g.world.dungeon, b2 = D2.buildings.find((x) => x.x0 === bld.x0 && x.z0 === bld.z0);
  const p2 = g.player; p2.hp = p2.maxHp = 1e7; p2.pos.set(ix, 0, iz); g.lastGood = null;
  const e = g.enemies.find((x) => x.type === 'grunt');
  for (const o of g.enemies) if (o !== e) { o.die(); }
  e.pos.set(ox, 0, oz); e.home = { x: ox, z: oz, yaw: 0 }; e.mod = D2.modAt(ox, oz).i; e.roam = D2.roam(e.mod); e.cd = 99; e.engaged = true;
  const d0 = Math.hypot(e.pos.x - ix, e.pos.z - iz);
  e.setState('chase');
  let best = d0; run(600, () => { e.cd = 99; best = Math.min(best, Math.hypot(e.pos.x - p2.pos.x, e.pos.z - p2.pos.z)); });
  res.pathing = { door: dside, start: +d0.toFixed(1), closest: +best.toFixed(1), inside: b2.x0 < e.pos.x && e.pos.x < b2.x1 && b2.z0 < e.pos.z && e.pos.z < b2.z1 };

  // 3b. small and walled: the city's size, how many lanes are walls
  { const D = g.world.dungeon, L = D.layers[0]; res.size = { w: L.W, h: L.H, walls: D.walls.length, lanes: D.open.size, enemies: g.enemies.length }; }

  // 3c. a roofed house is dark inside and your cone comes on; a building between you and the camera shows your outline
  { g.start('knight'); const D = g.world.dungeon, p = g.player; p.hp = p.maxHp = 1e7; for (const e of g.enemies) e.update = () => {};
    const h = D.buildings.find((b) => !b.ruin && !b.yard && b.doors.length);
    p.pos.set(h.cx, 0, h.cz); g.lastGood = null; run(90);
    res.dark = { inside: g.world.dungeon.darkAt(p.pos.x, p.pos.z), hemi: +g.hemi.intensity.toFixed(2), cone: +(g.nightLights?.[0].cone.intensity || 0).toFixed(1), roofOff: h.cut };
    const o = D.occluders.find((q) => q.b && !q.b.ruin && D.reach((q.x0 + q.x1) / 2, q.z0 - 1.2));
    p.pos.set((o.x0 + o.x1) / 2, 0, o.z0 - 1.2); g.lastGood = null; run(60);
    res.outline = { hidden: D.hides(p.pos.x, p.pos.z), shown: !!p.ghostOn, darkHere: D.darkAt(p.pos.x, p.pos.z), roofOn: !o.b.cut };
    // 3d. an archer can't shoot you through a lane wall
    const W = D.walls.find((R) => R.alongX && D.reach((R.x0 + R.x1) / 2, R.z0 - 2.5) && D.reach((R.x0 + R.x1) / 2, R.z1 + 2.5));
    const arch = g.enemies.find((e) => e.type === 'archer' && !e.guard && !e.elite);
    for (const e of g.enemies) if (e !== arch) e.die(true);
    delete arch.update; // (back to its own update)
    const mx = (W.x0 + W.x1) / 2;
    arch.pos.set(mx, 0, W.z0 - 2.5); arch.home = { x: mx, z: W.z0 - 2.5, yaw: 0 }; arch.mod = D.modAt(mx, W.z0 - 2.5).i; arch.roam = D.roam(arch.mod);
    p.pos.set(mx, 0, W.z1 + 2.5); g.lastGood = null; p.hp = p.maxHp;
    const hp0 = p.hp; let shots = 0; const n0 = g.projectiles.length;
    arch.setState('chase');
    run(600, () => { arch.pos.z = Math.min(arch.pos.z, W.z0 - 1.5); if (g.projectiles.length > n0) shots++; });
    res.wallShot = { wall: +(W.z1 - W.z0).toFixed(1), hpLost: Math.round(hp0 - p.hp), shotFrames: shots, archerState: arch.state };
    // 3e. a dead enemy comes back after a while, once nobody is near; a shrine's guard never does
    const e = arch; e.die(true); e.diedAt = g.time - 200; p.pos.set(e.home.x > 0 ? -44 : 44, 0, e.home.z > 0 ? -44 : 44); g.lastGood = null; run(80);
    const guard = g.enemies.find((x) => x.guard); if (guard) { guard.die(true); guard.diedAt = g.time - 200; } run(80);
    res.respawn = { back: e.alive && e.state !== 'dead', atHome: Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z) < 1, guardStaysDead: !guard || !guard.alive };
  }

  // 4. three shrines open the boss door; the boss's death ends the raid
  g.start('knight'); const D3 = g.world.dungeon, p3 = g.player; p3.hp = p3.maxHp = 1e7;
  const enc = D3.enc, gate = g.world.gates[enc.gateIn];
  res.doorShut = { sealed: enc.sealed, open: gate.open };
  for (const S of g.seals.list) g.seals.breakSeal(S);
  run(2);
  res.doorAfter = { sealed: enc.sealed, open: gate.open, broken: g.seals.broken };
  for (const o of g.enemies) o.die();
  p3.pos.set(enc.arena.x, 0, enc.arena.z + 4); g.lastGood = null; run(5);
  res.fight = { active: enc.active, music: !!g.bossActive };
  enc.boss.hp = 1; enc.boss.die ? enc.boss.die() : (enc.boss.hp = 0); run(5);
  if (!enc.defeated) g.onBossDeath(enc.boss);
  res.defeated = enc.defeated;
  return res;
});
// the raid's end screen comes after a pause
await page.evaluate(() => new Promise((r) => { const t = performance.now(); const f = () => { game.step(1 / 60, 1 / 60); if (performance.now() - t < 3200) setTimeout(f, 16); else r(); }; f(); }));
out.victory = await page.evaluate(() => ({ shown: !document.getElementById('victory').classList.contains('hidden'), banner: document.querySelector('#victory .banner').textContent, again: document.getElementById('again').textContent }));
// the world map from the Sanctum (a signed-in account would see it; open it directly here)
out.map = await page.evaluate(() => { game.worldMap.open(() => {}); const pins = [...document.querySelectorAll('.wm-pin')].map((p) => p.className.includes('open')); document.querySelector('.wm-pin.open').click(); const region = document.getElementById('wm-title').textContent; const go = !document.getElementById('wm-go').classList.contains('hidden'); return { regions: pins.length, open: pins.filter(Boolean).length, region, areas: document.querySelectorAll('.wm-pin').length, deploy: go, name: document.getElementById('wm-name').textContent }; });
await page.screenshot({ path: '/tmp/cityshots/worldmap-region.png' });
await page.evaluate(() => { document.getElementById('wm-back').click(); });
await page.screenshot({ path: '/tmp/cityshots/worldmap-world.png' });
await b.close();
console.log(JSON.stringify(out, null, 1));
const ok = out.size.w < 130 && out.size.walls >= 20 && out.dark.inside && out.dark.hemi < 0.6 && out.dark.cone > 10 && out.dark.roofOff
  && out.outline.hidden && out.outline.shown && out.wallShot.hpLost === 0 && out.respawn.back && out.respawn.atHome && out.respawn.guardStaysDead
  && out.sameMap && out.enemiesMoved && Object.values(out.allReach).every(Boolean) && out.down.under && out.down.lightAfter < 1 && !out.backUp.under && out.backUp.nearStair
  && out.pathing.closest < 3 && out.doorShut.sealed && !out.doorShut.open && !out.doorAfter.sealed && out.doorAfter.open && out.fight.active && out.defeated && out.victory.shown && out.map.deploy;
console.log(ok ? 'raid works' : 'RAID PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
