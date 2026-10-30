// Deterministic mechanics checks + bot fights, stepping the game manually at 60 Hz.
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(URL); await page.waitForTimeout(500);

// install harness
await page.evaluate(() => {
  game.loop = () => {};
  window.H = {
    stick: { x: 0, y: 0 },
    setup(kind) {
      game.start(kind);
      game.input.move = () => H.stick;
      game.input.sprintHeld = () => false;
      game.audio.play = () => {};
    },
    press(a) { game.input.pressed.add(a); },
    run(sec, bot) {
      const n = Math.round(sec * 60);
      for (let i = 0; i < n; i++) {
        if (bot) { const r = bot(i / 60); if (r === 'stop') return i / 60; }
        let dt = 1 / 60;
        if (game.freeze > 0) { game.freeze -= dt; dt = 0; } else if (game.slow > 0) { game.slow -= dt; dt *= 0.35; }
        game.step(dt, 1 / 60);
      }
      return sec;
    },
    toward(p, x, z) { const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz) || 1; return { x: dx / d, y: -dz / d }; },
    enterArena() {
      const enc = game.encounters.find((e) => e.kind === (H.encKind || 'boss'));
      game.boss = enc.boss;
      const p = game.player; for (const e of game.enemies) e.die();
      p.pos.set(enc.arena.x, 0, enc.arena.z + enc.arena.r - 3); game.step(1 / 60, 1 / 60);
      H.run(2.6); // boss rises
    },
  };
});

const R = async (fn, arg) => page.evaluate(fn, arg);
const log = (...a) => console.log(...a);

// --- A: rogue parry + riposte on the boss ---
log('A parry/riposte:', JSON.stringify(await R(() => {
  H.setup('rogue'); H.enterArena();
  const p = game.player, b = game.boss;
  p.pos.set(0, 0, b.pos.z + 3.2); p.yaw = Math.PI; b.yaw = 0; b.gap = 99;
  b.startAttack(game.bossMoves.sweep);
  const hitT = game.bossMoves.sweep.hits[0].t0;
  let pressed = false;
  H.run(2.5, () => { if (!pressed && b.atk && b.atk.t >= hitT - 0.08) { H.press('special'); pressed = true; } if (b.state === 'parried') return 'stop'; });
  const st = b.state; const hp0 = b.hp;
  H.press('attack'); H.run(1.4);
  return { bossState: st, riposteDmg: hp0 - b.hp, playerHp: p.hp, playerState: p.state };
})));

// --- B: roll i-frames vs the overhead slam ---
log('B roll:', JSON.stringify(await R(() => {
  H.setup('knight'); H.enterArena();
  const p = game.player, b = game.boss;
  p.pos.set(0, 0, b.pos.z + 3.5); p.yaw = Math.PI; b.yaw = 0; b.gap = 99;
  b.startAttack(game.bossMoves.overhead);
  const hitT = game.bossMoves.overhead.hits[0].t0;
  let done = false;
  const hp0 = p.hp;
  H.run(2.4, () => { if (!done && b.atk && b.atk.t * 1 >= hitT - 0.1) { H.stick = { x: 1, y: 0 }; H.press('roll'); done = true; } });
  H.stick = { x: 0, y: 0 };
  const dodged = p.hp === hp0;
  // now without rolling: should get hit
  b.atk = null; b.setState('neutral'); b.gap = 99; p.pos.set(0, 0, b.pos.z + 3.5); p.setState('move');
  b.yaw = b.yawTo(p.pos);
  b.startAttack(game.bossMoves.overhead); H.run(2.4);
  return { dodged, hpAfterTakingHit: p.hp, maxHp: p.maxHp, state: p.state };
})));

// --- C: knight block vs grunt ---
log('C block:', JSON.stringify(await R(() => {
  H.setup('knight');
  const p = game.player, g = game.enemies[0];
  p.pos.set(g.pos.x, 0, g.pos.z + 1.8); p.yaw = Math.PI; g.yaw = 0;
  game.input.held.special = true;
  g.alert(); H.run(0.6); g.cd = 0; g.lastMove = null;
  const hp0 = p.hp, st0 = p.st;
  H.run(3.0);
  game.input.held.special = false;
  return { hpLost: +(hp0 - p.hp).toFixed(1), stLost: +(st0 - p.st).toFixed(1), gruntState: g.state };
})));

// --- D: boss poise break -> crit, and phase 2 ---
log('D poise/phase2:', JSON.stringify(await R(() => {
  H.setup('knight'); H.enterArena();
  const p = game.player, b = game.boss;
  b.gap = 99;
  p.pos.set(0, 0, b.pos.z + 2.6); p.yaw = Math.PI; b.yaw = 0;
  const seen = new Set();
  let n = 0;
  H.run(12, (t) => { seen.add(b.state); p.st = p.maxSt; p.hp = p.maxHp; b.gap = 99; if (b.state === 'broken') return 'stop'; if (p.state === 'move' && n++ % 10 === 0) H.press('heavy'); });
  const brokeAt = [...seen];
  const hp0 = b.hp;
  p.yaw = p.yawTo(b.pos); H.press('attack'); H.run(1.6);
  const crit = hp0 - b.hp;
  b.hp = b.maxHp * 0.5; b.setState('neutral'); b.gap = 0;
  H.run(3.5, () => { p.hp = p.maxHp; });
  return { states: brokeAt, critDmg: crit, phase2: b.phase2, ignited: b.ignited };
})));

// --- E: every boss move runs to completion vs a standing player; report damage ---
log('E boss moves:', JSON.stringify(await R(() => {
  H.setup('knight'); H.enterArena();
  const p = game.player, b = game.boss;
  const out = {};
  for (const m of ['sweep', 'combo2', 'combo3', 'overhead', 'thrust', 'leap', 'spin', 'ember', 'roar']) {
    const A = game.encounters.find((e) => e.kind === 'boss').arena;
    p.respawn(A.x, A.z); p.pos.set(A.x, 0, m === 'leap' ? A.z + 10 : m === 'thrust' ? A.z + 4 : b.pos.z + 3); b.atk = null; b.y = 0; b.setState('neutral');
    if (m === 'spin') { p.pos.set(b.pos.x, 0, b.pos.z - 2.5); b.yaw = 0; }
    else b.yaw = b.yawTo(p.pos);
    b.gap = 99; b.phase2 = m === 'combo3' || m === 'roar';
    b.startAttack(game.bossMoves[m]);
    const hp0 = p.hp;
    H.run(game.bossMoves[m].dur + 0.2, () => { b.gap = 99; });
    out[m] = Math.round(hp0 - p.hp);
  }
  return out;
})));

// --- F: bot fights the boss (both characters) ---
for (const [kind, enc] of [['knight', 'mini'], ['rogue', 'mini'], ['knight', 'boss'], ['rogue', 'boss']]) {
  log(`F bot vs ${enc} (${kind}):`, JSON.stringify(await R(([kind, enc]) => {
    H.encKind = enc;
    H.setup(kind); H.enterArena(); H.encKind = null;
    const p = game.player, b = game.boss;
    let rolls = 0, heals = 0, hitsTaken = 0, lastHp = p.hp, deaths = 0;
    const t = H.run(400, (t) => {
      if (!p.alive) { deaths++; return 'stop'; }
      if (p.hp < lastHp) hitsTaken++; lastHp = p.hp;
      if (!b.alive) return 'stop';
      if (!p.lock) H.press('lock');
      const d = p.distTo(b) - b.radius - p.radius;
      const a = b.atk;
      // threat: a hit window starting within ~0.15s
      let threat = false;
      if (b.state === 'attack' && a) for (const h of a.def.hits || []) { const dtm = (h.t0 - a.t) / b.atkSpeed; if (dtm > 0 && dtm < 0.16) threat = true; }
      if (threat && p.state !== 'roll' && p.st > 10 && Math.random() < 0.85) {
        // roll sideways relative to boss
        const yaw = p.yawTo(b.pos) + Math.PI / 2;
        H.stick = { x: Math.sin(yaw), y: -Math.cos(yaw) }; H.press('roll'); rolls++; return;
      }
      if (p.hp < p.maxHp * 0.4 && p.flasks > 0 && d > 5 && p.state === 'move') { H.press('heal'); heals++; return; }
      if (b.critable() && p.state === 'move') { H.stick = H.toward(p, b.pos.x, b.pos.z); H.press('attack'); return; }
      const opening = b.state !== 'attack' || (a && a.t > Math.max(...(a.def.hits || [{ t1: 0 }]).map((h) => h.t1)) + 0.15);
      if (d < 1.6 && opening && p.st > 25 && p.fatigue < 0.5 && p.state === 'move') { H.stick = { x: 0, y: 0 }; H.press('attack'); return; }
      if (!opening && d < 6) { H.stick = { x: -H.toward(p, b.pos.x, b.pos.z).x, y: -H.toward(p, b.pos.x, b.pos.z).y }; return; }
      H.stick = d > 1.2 ? H.toward(p, b.pos.x, b.pos.z) : { x: 0, y: 0 };
    });
    return { kind, boss: b.cfg.id, time: Math.round(t), bossHp: Math.round(b.hp), phase2: b.phase2, playerHp: Math.round(p.hp), deaths, rolls, heals, hitsTaken };
  }, [kind, enc])));
}

// --- G: bot plays modules 1-2 from the start to the mini boss arena (BFS pathing) ---
for (const [kind, layout] of [['knight', ['camp', 'ruins']], ['rogue', ['camp', 'ruins']], ['knight', ['village', 'bog']], ['rogue', ['crypt', 'gate']], ['knight', ['bridge', 'crypt']]]) {
  log(`G run ${layout.join('+')} (${kind}):`, JSON.stringify(await R(([kind, layout]) => {
    H.setup(kind);
    game.buildRun([...layout, 'mini', 'ruins', 'camp', 'bog', 'boss']);
    const p = game.player; p.respawn(0, -2.5);
    const w = game.world, A = game.encounters.find((e) => e.kind === 'mini').arena;
    const goal = { x: 0, z: A.z + A.r + 3 };
    const path = () => {
      const st = 0.5, k = (x, z) => x + ',' + z, sx = Math.round(p.pos.x / st) * st, sz = Math.round(p.pos.z / st) * st;
      const prev = new Map([[k(sx, sz), null]]); const q = [[sx, sz]]; let end = null;
      for (let qi = 0; qi < q.length && qi < 60000; qi++) {
        const [x, z] = q[qi];
        if (Math.hypot(x - goal.x, z - goal.z) < 1) { end = [x, z]; break; }
        for (const [dx, dz] of [[st, 0], [-st, 0], [0, st], [0, -st]]) {
          const nx = x + dx, nz = z + dz, kk = k(nx, nz);
          if (prev.has(kk)) continue;
          if (!w.walkable(nx, nz, 0.5) || w.obstacles.some((o) => Math.abs(nz - o.z) < 2 && Math.hypot(nx - o.x, nz - o.z) < o.r + 0.5)) { prev.set(kk, 'x'); continue; }
          prev.set(kk, [x, z]); q.push([nx, nz]);
        }
      }
      const out = []; let c = end;
      while (c && c !== 'x') { out.unshift(c); c = prev.get(k(...c)); }
      return out;
    };
    let route = path(), ri = 0, hitsTaken = 0, lastHp = p.hp, rolls = 0, repath = 0;
    const t = H.run(360, () => {
      if (!p.alive) return 'stop';
      if (p.hp < lastHp) hitsTaken++; lastHp = p.hp;
      if (Math.hypot(p.pos.x - goal.x, p.pos.z - goal.z) < 1.5) return 'stop';
      const foes = game.enemies.filter((e) => e.alive && e.state !== 'idle' && e.state !== 'sit' && e.state !== 'return');
      let tg = null, bd = 99;
      for (const e of foes) { const d = p.distTo(e); if (d < bd) { bd = d; tg = e; } }
      for (const e of game.enemies) {
        if (e.state !== 'attack' || !e.atk) continue;
        for (const h of e.atk.def.hits || []) { const dtm = (h.t0 - e.atk.t) / (e.atkSpeed || 1); if (dtm > 0 && dtm < 0.12 && p.distTo(e) < 4 && p.state !== 'roll' && p.st > 15) { const y = p.yawTo(e.pos) + Math.PI / 2; H.stick = { x: Math.sin(y), y: -Math.cos(y) }; H.press('roll'); rolls++; return; } }
      }
      if (p.hp < p.maxHp * 0.45 && p.flasks > 0 && p.state === 'move') { if (bd > 4.5) { H.press('heal'); return; } if (tg) { H.stick = { x: -H.toward(p, tg.pos.x, tg.pos.z).x, y: -H.toward(p, tg.pos.x, tg.pos.z).y }; return; } }
      if (tg && bd < 12) {
        if (p.fatigue > 0.5 || p.st < p.maxSt * 0.4) { H.stick = { x: -H.toward(p, tg.pos.x, tg.pos.z).x, y: -H.toward(p, tg.pos.x, tg.pos.z).y }; return; }
        if (bd > 1.8) { H.stick = H.toward(p, tg.pos.x, tg.pos.z); return; }
        H.stick = { x: 0, y: 0 }; if (p.state === 'move' && p.st > 20) H.press('attack'); return;
      }
      if (++repath % 120 === 0 || ri >= route.length) { route = path(); ri = 0; }
      while (ri < route.length - 1 && Math.hypot(p.pos.x - route[ri][0], p.pos.z - route[ri][1]) < 0.9) ri++;
      const wp = route[Math.min(ri + 2, route.length - 1)];
      if (wp) H.stick = H.toward(p, wp[0], wp[1]);
    });
    const left = game.enemies.filter((e) => e.alive && e.mod <= 1).map((e) => e.type);
    return { kind, time: Math.round(t), reachedMini: Math.hypot(p.pos.x - goal.x, p.pos.z - goal.z) < 2, alive: p.alive, hp: Math.round(p.hp), flasks: p.flasks, hitsTaken, rolls, enemiesLeft: left };
  }, [kind, layout])));
}

if (errs.length) { console.log('ERRORS\n' + [...new Set(errs)].slice(0, 5).join('\n')); process.exitCode = 1; }
await browser.close();
