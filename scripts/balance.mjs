// Stun (poise) balance, rogue parry cooldown, evolved knight shield charge, party stage scaling,
// getting back up for the reward after a boss kill, and the after-run Upgrades button.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(process.argv[2] || 'http://localhost:5180/?chain'); await page.waitForTimeout(800);
const res = await page.evaluate(() => {
  game.loop = () => {};
  const out = {};
  const step = (s, fn) => { for (let i = 0; i < s * 60; i++) { fn && fn(); game.step(1 / 60, 1 / 60); } };
  const LAYOUT = ['mini:vael', 'camp', 'ruins', 'mini:hask', 'bridge', 'village', 'mini:gorrath', 'crypt', 'bog', 'gate', 'boss'];
  const fresh = (k, evo = false) => { game.start(k); game.audio.play = () => {}; game.buildRun(LAYOUT); game.input.move = () => ({ x: 0, y: 0 }); game.player.evolved = evo; return game.player; };
  // 1) hits to knock Vael down, then again (needs twice the stun)
  const hitsToBreak = (kind, atk) => {
    const p = fresh(kind), boss = game.encounters[0].boss; game.encounters[0].active = true;
    const poise = p.c.attacks[atk].hits[0].poise, counts = [];
    for (let round = 0; round < 2; round++) {
      boss.setState('neutral'); boss.hp = 1e6; let n = 0, r;
      do { r = boss.receive({ dmg: 1, poise, srcPos: p.pos, attacker: p }); n++; } while (r !== 'break' && n < 99);
      counts.push(n);
    }
    return { poise, counts };
  };
  out.vaelPoise = game.encounters?.[0]?.boss?.cfg?.poise;
  out.knightLight = hitsToBreak('knight', 'k1');
  out.knightHeavy = hitsToBreak('knight', 'heavy');
  out.knightCounter = hitsToBreak('knight', 'guardCounter');
  out.rogueLight = hitsToBreak('rogue', 'r1');
  out.mageLight = hitsToBreak('mage', 's1');
  // 2) rogue parry: one attempt, then locked for 18 s
  let p = fresh('rogue');
  p.setState('move'); p.st = p.maxSt; game.input.pressed.add('special'); step(0.05);
  const first = p.state; step(0.8); p.setState('move'); p.st = p.maxSt;
  game.input.pressed.add('special'); step(0.05);
  out.parry = { first, second: p.state, cdLeft: +p.parryCd.toFixed(1), hud: document.getElementById('ability').textContent };
  step(17.5); p.st = p.maxSt; p.setState('move'); game.input.pressed.add('special'); step(0.05);
  out.parry.after18s = p.state;
  // 3) evolved knight shield charge into a grunt, then the leaping overhead
  p = fresh('knight', true); p.buildSpectralShield?.();
  const g = game.enemies.find((e) => e.type === 'grunt'); for (const e of game.enemies) if (e !== g) e.die(true);
  g.hp = g.maxHp = 1000; g.cd = 99; g.state = 'idle';
  p.pos.set(g.pos.x, 0, g.pos.z + 3); p.yaw = Math.PI; p.setState('move'); p.st = p.maxSt;
  p.blocking = true; game.input.held.special = true;
  const g0 = g.pos.clone(); game.input.pressed.add('heavy'); step(0.05);
  const chargeState = p.state; game.input.held.special = false;
  let seen = false; step(0.5, () => { if (p.spectral?.visible) seen = true; });
  const bash = { dmg: 1000 - g.hp, pushed: +g.pos.distanceTo(g0).toFixed(2), shieldShown: seen, cd: +p.chargeCd.toFixed(1) };
  game.input.pressed.add('attack'); step(0.05);
  bash.followUp = p.atk?.def === p.c.attacks.chargeSlam ? 'chargeSlam' : p.state; step(1.2);
  bash.totalDmg = 1000 - g.hp;
  p.setState('move'); p.blocking = true; game.input.held.special = true; game.input.pressed.add('heavy'); step(0.05);
  bash.againWhileCd = p.state === 'charge' ? 'charge' : 'refused';
  game.input.held.special = false;
  out.shieldCharge = bash;
  // 4) party stage scaling of a grunt's health and damage
  const stages = [];
  for (const players of [1, 2]) for (const tier of [0, 1, 2, 3]) {
    const E = game.enemies[0].constructor;
    const e = new E(game, 'grunt', 0, 0, 0, { tier, players });
    stages.push(`${players}p t${tier}: hp ${e.maxHp} dmg x${e.dmgScale.toFixed(2)}`); e.remove?.();
  }
  out.stages = stages;
  // 5) downed in a party when a mini boss dies: back up and offered the reward
  p = fresh('knight');
  game.mp.active = true; const send = game.mp.sendAll; game.mp.sendAll = () => {};
  p.alive = false; p.setState('dead');
  const enc = game.encounters[0]; enc.active = true; enc.boss.setState('neutral'); enc.boss.die();
  const up = { aliveAfterKill: p.alive, hp: p.hp, maxHp: p.maxHp };
  window.__up = up; window.__send = send;
  return out;
});
// the fanfare and reward screen run on real-time timers
await page.waitForTimeout(3800);
res.downedReward = await page.evaluate(() => {
  const up = window.__up; up.mode = game.mode; up.rewardShown = !document.getElementById('reward').classList.contains('hidden');
  game.mp.active = false; game.mp.sendAll = window.__send;
  return up;
});
// 6) solo run over: Upgrades button opens the shop (signed-in only; guests see Title/Try Again)
await page.evaluate(() => { game.ui.show('reward', false); game.mode = 'play'; game.overShown = false; game.accounts.user = game.accounts.user || 'x'; game.accounts.data = game.accounts.data || { gold: 0, upgrades: {}, stats: { bestArea: 0, goldEarned: 0, wins: 0 } }; game.gameOver(); });
await page.waitForTimeout(3700);
const btn = await page.evaluate(() => ({ text: document.getElementById('go-lobby').textContent, hidden: document.getElementById('go-lobby').classList.contains('hidden') }));
await page.click('#go-lobby').catch((e) => errs.push('click: ' + e.message.split('\n')[0])); await page.waitForTimeout(200);
btn.shopOpen = await page.evaluate(() => !document.getElementById('shop').classList.contains('hidden'));
res.afterRunButton = btn;
await b.close();
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(15), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
