// Parry timing checks: window is the 0.25s before a parryable hit, cue visibility,
// unparryable attacks, and the whiff stamina penalty.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(process.argv[2] || 'http://localhost:4173/'); await page.waitForTimeout(500);
const res = await page.evaluate(() => {
  game.loop = () => {};
  const step = () => { let dt = 1 / 60; if (game.freeze > 0) { game.freeze -= dt; dt = 0; } else if (game.slow > 0) { game.slow -= dt; dt *= 0.35; } game.step(dt, 1 / 60); };
  const out = {};
  // try a parry `lead` seconds before the first hit of `move` from a grunt or Hask
  const trial = (who, move, lead) => {
    game.start('rogue'); game.audio.play = () => {}; game.input.move = () => ({ x: 0, y: 0 });
    const p = game.player;
    let e, def;
    if (who === 'grunt') {
      e = game.enemies.find((x) => x.type === 'grunt');
      for (const o of game.enemies) if (o !== e) o.die();
      e.maxHp = e.hp = 9999;
      p.pos.set(e.pos.x, 0, e.pos.z + 1.7); p.yaw = Math.PI; e.yaw = 0;
      e.alert(); for (let i = 0; i < 40; i++) step();
      e.cd = 99; e.setState('chase'); e.atk = null; e.yaw = e.yawTo(p.pos);
      def = e.T.moves[move]; e.atkSpeed = 1; e.startAttack(def);
    } else {
      const enc = game.encounters.find((x) => x.kind === 'mini');
      for (const o of game.enemies) o.die();
      p.pos.set(enc.arena.x, 0, enc.arena.z + enc.arena.r - 3); step();
      for (let i = 0; i < 160; i++) step();
      e = enc.boss; e.gap = 99; e.atk = null; e.setState('neutral');
      p.pos.set(e.pos.x, 0, e.pos.z + e.radius + 1.6); p.yaw = Math.PI; e.yaw = 0;
      def = e.moves[move]; e.counterAtk = false; e.startAttack(def);
    }
    p.setState('move'); p.st = p.maxSt; p.hp = p.maxHp;
    let pressed = false, cueSeen = false, stAfterPress = null, cueDuring = [];
    for (let i = 0; i < 180; i++) {
      const np = e.nextParry();
      const t0 = def.hits[0].t0 / e.attackRate();
      const tth = def.hits[0].t0 / e.attackRate() - (e.atk ? e.atk.t / e.attackRate() : 99);
      if (game.parryCues[0].visible) { cueSeen = true; cueDuring.push(+tth.toFixed(3)); }
      if (!pressed && e.atk && tth <= lead + 1e-6) { game.input.pressed.add('special'); pressed = true; step(); stAfterPress = p.st; continue; }
      if (e.state === 'parried') break;
      step();
      if (pressed && e.state !== 'attack') break;
    }
    return { result: e.state === 'parried' ? 'PARRIED' : 'no', playerHpLost: Math.round(p.maxHp - p.hp), staminaLeftAfterPress: Math.round(stAfterPress), cueSeen, cueTth: cueDuring.length ? [Math.min(...cueDuring), Math.max(...cueDuring)] : null };
  };
  out.grunt_slash_0_35_early = trial('grunt', 'slash', 0.35);
  out.grunt_slash_0_24_inWindow = trial('grunt', 'slash', 0.24);
  out.grunt_slash_0_12_inWindow = trial('grunt', 'slash', 0.12);
  out.grunt_slash_0_03_inWindow = trial('grunt', 'slash', 0.03);
  out.grunt_leap_0_25_unparryable = trial('grunt', 'leap', 0.25);
  out.hask_chop_0_15 = trial('hask', 'chop', 0.15);
  out.hask_charge_0_25_unparryable = trial('hask', 'charge', 0.25);
  out.hask_overhead_0_25_unparryable = trial('hask', 'overhead', 0.25);
  return out;
});
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(32), JSON.stringify(v));
if (errs.length) { console.log('ERRORS', errs.slice(0, 3)); process.exitCode = 1; }
await b.close();
