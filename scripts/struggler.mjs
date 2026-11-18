// The Penitent Slab's Struggler played through on a dummy, locked on: sweep, a roll (in, then away), the closing thrust (it dashes
// back in and stops short of the target), the plunge. Prints the moves, the damage of each, and the distance to the
// dummy after the roll and after the dash. node scripts/struggler.mjs [url]
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(process.argv[2] || 'http://localhost:5180/?chain'); await page.waitForTimeout(800);
const out = []; for (const ROLL of [1, -1]) { const r = await page.evaluate((ROLL) => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.loadoutFor = () => ({ weapon: 'greatsword', evo: null }); g.start('knight');
  g.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
  const p = g.player, e = g.enemies.find((x) => x.type === 'grunt');
  for (const x of g.enemies) if (x !== e) { x.die(true); x.rig.root.visible = false; }
  e.hp = e.maxHp = 1e5; e.update = () => {}; e.yaw = 0; p.st = p.maxSt = 1e4;
  p.pos.set(e.pos.x, 0, e.pos.z + 1.7); p.yaw = Math.PI; p.setState('move'); p.lock = e;
  let stick = { x: 0, y: 0 }; g.input.move = () => stick;
  const C = p.c.comboList.find((c) => c.id === 'struggler');
  const step = (n = 1) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
  const moves = [], dist = {}, dmg = {};
  let last = null, hp = e.hp;
  const record = () => { const k = p.state === 'attack' ? p.atkKey : p.state; if (e.hp < hp) { dmg[k] = +((dmg[k] || 0) + hp - e.hp).toFixed(1); hp = e.hp; } if (k !== last) { if (last === 'roll') dist.afterRoll = +p.distTo(e).toFixed(2); if (last === 'gLunge') dist.afterDash = +p.distTo(e).toFixed(2); if (k !== 'move') moves.push(k); last = k; } };
  const press = (a) => { if (a === 'roll') stick = { x: 0, y: ROLL }; g.input.pressed.add(a); };
  press(C.steps[0][0]); step(); record();
  for (let i = 1; i < C.steps.length; i++) {
    let guard = 0; while (!(p.cmb && p.cmb.openAt != null) && guard++ < 120) { step(); record(); }
    step(2); record(); press(C.steps[i][0]); step(); record(); stick = { x: 0, y: 0 };
  }
  let guard = 0; while (p.state !== 'move' && guard++ < 200) { step(); record(); }
  return { roll: ROLL > 0 ? 'in' : 'away', moves, dmg, dist, end: +p.distTo(e).toFixed(2) };
}, ROLL); console.log(JSON.stringify(r)); }
await b.close(); console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
