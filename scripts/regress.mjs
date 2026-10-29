// Regression checks for: arena door lock trapping the player; stun-lock prevention.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(process.argv[2] || 'http://localhost:4173/'); await page.waitForTimeout(500);
const out = await page.evaluate(() => {
  game.loop = () => {};
  const stick = { x: 0, y: 0 };
  const run = (sec, fn) => { for (let i = 0; i < sec * 60; i++) { fn && fn(); let dt = 1 / 60; if (game.freeze > 0) { game.freeze -= dt; dt = 0; } game.step(dt, 1 / 60); } };
  const res = {};
  for (const kind of ['knight', 'rogue']) {
    game.start(kind); game.audio.play = () => {}; game.input.move = () => stick;
    const p = game.player;
    for (const e of game.enemies) e.die();
    // --- door: walk straight north from the gate bonfire through the fog ---
    p.pos.set(0, 0, -84); stick.x = 0; stick.y = 1;
    run(4);
    const atFight = { active: game.bossActive, z: +p.pos.z.toFixed(2) };
    // try moving around inside the arena
    const z0 = p.pos.z; stick.y = 1; run(1); const north = z0 - p.pos.z;
    const x0 = p.pos.x; stick.x = 1; stick.y = 0; run(1); const east = p.pos.x - x0;
    stick.x = 0; stick.y = -1; run(3); // walk back into the fog wall: must be blocked, not stuck
    const zBack = p.pos.z; stick.y = 1; run(0.5); const canLeaveWall = zBack - p.pos.z;
    res[kind + '_door'] = { ...atFight, movedNorth: +north.toFixed(2), movedEast: +east.toFixed(2), blockedAtZ: +zBack.toFixed(2), canMoveOffWall: +canLeaveWall.toFixed(2) };
    // --- stun lock: mash light attack on a grunt for 6s ---
    game.start(kind); game.audio.play = () => {}; game.input.move = () => stick; stick.x = 0; stick.y = 0;
    const p2 = game.player;
    const g = game.enemies[0];
    for (const e of game.enemies) if (e !== g) e.die();
    g.maxHp = g.hp = 99999;
    p2.pos.set(g.pos.x, 0, g.pos.z + 1.6); p2.yaw = Math.PI; g.alert(); run(0.7);
    let flinches = 0, gruntAttacks = 0, lastState = g.state, armorUps = 0, playerHit = 0, lastHp = p2.hp, minSt = 999, maxFat = 0, swings = 0, lastAtk = null;
    const st0 = p2.st;
    run(6, () => {
      game.input.pressed.add('attack');
      if (g.state !== lastState) { if (g.state === 'hurt') flinches++; if (g.state === 'attack') gruntAttacks++; lastState = g.state; }
      if (g.armorT > 1.55) armorUps++;
      if (p2.hp < lastHp) playerHit++; lastHp = p2.hp; p2.hp = p2.maxHp; lastHp = p2.hp;
      if (p2.atk !== lastAtk && p2.state === 'attack') { swings++; lastAtk = p2.atk; }
      minSt = Math.min(minSt, p2.st); maxFat = Math.max(maxFat, p2.fatigue);
    });
    res[kind + '_mash6s'] = { swings, gruntFlinches: flinches, gruntArmorUps: armorUps, gruntAttacks, playerGotHit: playerHit, maxFatigue: +maxFat.toFixed(2), minStamina: Math.round(minSt) };
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
if (errs.length) { console.log('ERRORS', errs); process.exitCode = 1; }
await b.close();
