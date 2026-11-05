// Empty stamina blocks attacks/rolls/combo chains; fatigue barely slows walking;
// Spellsword flat mana (bolt 8, fireball 75, +16 per knife hit); grunt leap reach.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(process.argv[2] || 'http://localhost:4173/'); await page.waitForTimeout(600);
const res = await page.evaluate(() => {
  game.loop = () => {};
  const out = {};
  const step = (sec, fn) => { for (let i = 0; i < sec * 60; i++) { fn && fn(); game.step(1 / 60, 1 / 60); } };
  const LAYOUT = ['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
  let mv = { x: 0, y: 0 };
  const fresh = (k) => { game.start(k); game.audio.play = () => {}; game.buildRun(LAYOUT); game.input.move = () => mv; for (const e of game.enemies) e.die(); return game.player; };
  const press = (a) => game.input.pressed.add(a);

  // 1) zero stamina: attack and roll refused
  let p = fresh('knight');
  p.setState('move'); p.st = 0; p.stDelay = 5; press('attack'); step(0.05);
  out.attackAtZero = p.state;
  p.st = 0; p.stDelay = 5; mv = { x: 0, y: 1 }; press('roll'); step(0.05);
  out.rollAtZero = p.state; mv = { x: 0, y: 0 };
  // 2) combo chain can't continue on an empty bar
  p.setState('move'); p.st = p.c.attacks[p.c.light].cost + 0.5; p.stDelay = 0; press('attack'); step(0.05);
  const first = p.atk?.def; p.stDelay = 9; let chained = false;
  step(1.2, () => { if (p.state === 'attack' && p.atk?.def !== first) chained = true; press('attack'); });
  out.comboAtZero = { started: !!first, chained, st: p.st };
  // 3) fatigue walk slowdown
  p = fresh('knight'); p.setState('move'); p.st = p.maxSt; p.fatigue = 1; p.fatigueT = 9; mv = { x: 0, y: 1 }; step(1);
  out.walkAtFullFatigue = +(p.speed / p.c.walk).toFixed(2); mv = { x: 0, y: 0 };

  // 4) spellsword mana
  p = fresh('mage');
  const g = game.enemies[0]; g.alive = true; g.dead = false; g.hp = g.maxHp = 5000; g.state = 'idle'; g.cd = 99;
  p.mana = 50; p.setState('move'); p.st = p.maxSt; press('heavy'); step(0.05);
  out.boltCost = 50 - p.mana;
  p.setState('move'); p.mana = 74; press('special'); step(0.05);
  out.fireAt74 = p.state;
  p.setState('move'); p.mana = 80; press('special'); step(0.05);
  out.fireCost = 80 - p.mana;
  out.manaText = document.querySelector('.bar.mn .num').textContent;
  return out;
});
// 5) grunt leap: distance travelled during the move
const leap = await page.evaluate(() => {
  const step = (sec, fn) => { for (let i = 0; i < sec * 60; i++) { fn && fn(); game.step(1 / 60, 1 / 60); } };
  const e = game.enemies.find((x) => x.type === 'grunt' && x.alive) || game.enemies.find((x) => x.type === 'grunt');
  const p = game.player; p.pos.set(e.pos.x, 0, e.pos.z + 3.6); p.hp = 1e6; p.maxHp = 1e6;
  e.alive = true; e.alert?.(); e.target = p; e.yaw = e.yawTo(p.pos);
  const x0 = e.pos.clone(); e.startAttack(e.moves.leap); step(1.6);
  return { moved: +e.pos.distanceTo(x0).toFixed(2), range: e.moves.leap.range };
});
await b.close();
for (const [k, v] of Object.entries({ ...res, leap })) console.log(k.padEnd(20), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
