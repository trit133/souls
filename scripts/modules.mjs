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
const layoutsToShoot = [['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss']];
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

// 4) layout shape: 11 modules, minis at 3/6/9 (all different), boss at 11, all 7 regulars used, no bonfires
const shape = await page.evaluate(() => {
  const bad = [];
  for (let i = 0; i < 30; i++) {
    game.buildRun();
    const L = game.layout;
    const minis = [L[2], L[5], L[8]];
    const regs = L.filter((k) => !k.startsWith('mini:') && k !== 'boss');
    if (L.length !== 11 || L[10] !== 'boss' || !minis.every((k) => k.startsWith('mini:')) || new Set(minis).size !== 3 || new Set(regs).size !== 7 || game.world.bonfires.length) bad.push(L.join(','));
  }
  return { checked: 30, bad, example: game.layout.join(' > ') };
});
console.log('4 layout shape:', JSON.stringify(shape));

// 5) every mini boss: all moves run vs a standing player; then kill -> reward screen -> pick
const minis = await page.evaluate(() => {
  const out = {};
  game.start('knight'); game.audio.play = () => {};
  game.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss']);
  for (const e of game.enemies) e.die();
  const p = game.player;
  for (const enc of game.encounters.filter((e) => e.kind === 'mini')) {
    const A = enc.arena, B = enc.boss, r = { name: B.name, moveDamage: {} };
    p.respawn(A.x, A.z + A.r - 3); p.maxHp = p.hp = 99999;
    run(2.8);
    r.started = enc.active;
    for (const [m, def] of Object.entries(B.moves)) {
      p.setState('move'); p.hp = p.maxHp;
      p.pos.set(B.pos.x, 0, B.pos.z + B.radius + 2); B.atk = null; B.y = 0; B.setState('neutral'); B.yaw = B.yawTo(p.pos); B.gap = 99;
      if (m === 'stomp' || m === 'spin') { p.pos.set(B.pos.x, 0, B.pos.z - B.radius - 1.5); B.yaw = 0; }
      if (m === 'hurl' || m === 'leap') p.pos.set(B.pos.x, 0, B.pos.z + 8);
      B.startAttack(def);
      const h0 = p.hp;
      run(def.dur / B.attackRate() + 1.2, () => { B.gap = 99; });
      r.moveDamage[m] = Math.round(h0 - p.hp);
    }
    // kill it and check the reward screen
    B.gap = 0; B.hp = 1; p.setState('move'); p.pos.set(B.pos.x, 0, B.pos.z + B.radius + 1.3); p.lock = B;
    B.atk = null; B.setState('neutral'); B.gap = 99; B.evadeCd = 99;
    game.input.pressed.add('attack'); run(1.2);
    r.dead = !B.alive; r.gatesOpen = game.world.gates[enc.gateOut].open && game.world.gates[enc.gateIn].open;
    out[B.cfg.id] = r;
  }
  return out;
});
console.log('5 minis:', JSON.stringify(minis, null, 1));
await page.waitForTimeout(4000); // fanfare + reward use real-time timers
const reward = await page.evaluate(() => {
  const vis = !document.getElementById('reward').classList.contains('hidden');
  const cards = [...document.querySelectorAll('#reward-cards .rcard')].map((c) => c.querySelector('.rname').textContent);
  const p = game.player; p.maxHp = 150; p.hp = 40; p.flasks = 0;
  const before = { mode: game.mode, maxHp: p.maxHp, maxSt: p.maxSt };
  // pick the Rest card
  document.querySelectorAll('#reward-cards .rcard')[3].click();
  return { visible: vis, cards, before, afterRest: { mode: game.mode, hp: p.hp, flasks: p.flasks, hidden: document.getElementById('reward').classList.contains('hidden') } };
});
console.log('5b reward:', JSON.stringify(reward));

// 6) boons apply; status effects proc
const boons = await page.evaluate(() => {
  const p = game.player, out = {};
  const B = game.claimReward.bind(game);
  const m0 = { hp: p.maxHp, st: p.maxSt, dmg: p.dmgMul, roll: p.rollMul, aspd: p.aspdMul };
  for (const k of ['vigor', 'endurance', 'might', 'evasion', 'haste', 'bleed', 'poison', 'frost', 'fire']) B(k);
  out.after = { hp: p.maxHp - m0.hp, st: p.maxSt - m0.st, dmg: +(p.dmgMul - m0.dmg).toFixed(2), roll: +(p.rollMul - m0.roll).toFixed(2), aspd: +(p.aspdMul - m0.aspd).toFixed(2), status: p.statusLv };
  out.hudTags = document.querySelectorAll('#boon-tags .boon-tag').length;
  // each status on a fresh grunt
  for (const k of ['bleed', 'poison', 'frost', 'fire']) {
    game.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss']);
    p.statusLv = { [k]: 1 };
    const g = game.enemies.find((e) => e.type === 'grunt');
    for (const e of game.enemies) if (e !== g) e.die();
    g.maxHp = g.hp = 1000; g.alert();
    p.respawn(g.pos.x, g.pos.z + 1.6); p.yaw = Math.PI; p.lock = g; p.maxHp = p.hp = 99999;
    let hits = 0, procAt = null, hp0 = g.hp;
    for (let i = 0; i < 12 && procAt === null; i++) {
      const before = g.status.meter[k];
      game.applyStatus(p, g, 1); hits++;
      if (g.status.meter[k] < before || g.status.dots[k] || g.status.frostT > 0) procAt = hits;
    }
    const hpAfterProc = g.hp;
    const slowMid = g.status.slow();
    run(k === 'poison' ? 10.5 : 4);
    out[k] = { hitsToProc: procAt, burst: Math.round(hp0 - hpAfterProc), totalDmg: Math.round(hp0 - g.hp), slowWhileFrozen: slowMid };
  }
  return out;
});
console.log('6 boons/status:', JSON.stringify(boons, null, 1));

// 7) death ends the run -> game over screen -> Try Again rebuilds a fresh run
await page.evaluate(() => { const p = game.player; p.setState('move'); p.receive({ dmg: 1e9, srcPos: p.pos.clone().add({ x: 0, y: 0, z: 1 }), knock: 'light' }); });
await page.waitForTimeout(3800);
const over = await page.evaluate(() => {
  const o = { mode: game.mode, shown: !document.getElementById('gameover').classList.contains('hidden'), stats: document.getElementById('gameover-stats').innerText.split('\n') };
  const layout = game.layout.join(',');
  document.getElementById('retry').click();
  o.afterRetry = { mode: game.mode, newLayout: game.layout.join(',') !== layout, boons: game.player.boonList.length, hp: game.player.hp, maxHp: game.player.maxHp };
  return o;
});
console.log('7 run over:', JSON.stringify(over));

if (errs.length) { console.log('ERRORS\n' + [...new Set(errs)].slice(0, 6).join('\n')); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
