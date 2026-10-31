// Potion upgrades, Spellsword (unlock, mana, spells) and the three evolutions.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(process.argv[2] || 'http://localhost:4173/'); await page.waitForTimeout(600);
await page.click('#btn-acct'); await page.fill('#acct-user', 'spell_test'); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(500);
const res = await page.evaluate(() => {
  game.loop = () => {};
  const out = {};
  const A = game.accounts;
  const step = (sec, fn) => { for (let i = 0; i < sec * 60; i++) { fn && fn(); let dt = 1 / 60; if (game.freeze > 0) { game.freeze -= dt; dt = 0; } else if (game.slow > 0) { game.slow -= dt; dt *= 0.35; } game.step(dt, 1 / 60); } };
  const LAYOUT = ['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
  const fresh = (k) => { game.start(k); game.audio.play = () => {}; game.buildRun(LAYOUT); game.input.move = () => ({ x: 0, y: 0 }); return game.player; };
  const btn = (k) => document.querySelector(`[data-key=${k}] button`);
  const buyAll = (k, n) => { const c = []; for (let i = 0; i < n; i++) { c.push(btn(k).textContent); btn(k).click(); } return c; };

  // 1) locks and shop prices
  A.data.gold = 1000; A.save(); game.refreshTitle();
  document.querySelector('.char[data-char="mage"]').click();
  out.lockedClick = { mode: game.mode, shopOpen: !document.getElementById('shop').classList.contains('hidden') };
  game.renderShop();
  out.manaBeforeUnlock = btn('mana').textContent; out.evoMageBefore = btn('evo_mage').textContent;
  out.flaskPrices = buyAll('flask', 3); out.flaskAfter = [btn('flask').textContent, btn('flask').disabled];
  out.potionPrices = buyAll('potion', 3); out.potionAfter = btn('potion').textContent;
  out.unlock = buyAll('mage', 1); out.manaAfterUnlock = btn('mana').textContent;
  out.manaPrices = buyAll('mana', 4);
  out.evoPrices = [buyAll('evo_knight', 1), buyAll('evo_rogue', 1), buyAll('evo_mage', 1)].flat();
  out.goldLeft = A.data.gold;
  out.icons = document.querySelectorAll('.sicon svg path').length > 12;
  document.getElementById('shop-back').click();
  out.mageCardLocked = document.querySelector('.char[data-char="mage"]').classList.contains('locked');

  // 2) potions: 7 flasks (4+3); heal = 48% x 1.45
  let p = fresh('knight');
  p.hp = 1; p.setState('move'); game.input.pressed.add('heal');
  const f0 = p.flasks; step(1.3);
  out.potions = { flasks: f0, healed: Math.round(p.hp - 1), of: p.maxHp };

  // 3) spellsword
  p = fresh('mage');
  const g = game.enemies.find((e) => e.type === 'grunt');
  for (const e of game.enemies) if (e !== g) e.die();
  g.maxHp = g.hp = 5000; g.cd = 99;
  p.pos.set(g.pos.x, 0, g.pos.z + 6); p.yaw = Math.PI; p.lock = g; g.alert();
  out.mana0 = [p.mana, p.maxMana];  // 100 + 10+10+10+15 = 145
  game.input.pressed.add('heavy'); step(0.05);
  const afterBolt = p.mana; step(1.5, () => { g.cd = 99; });
  out.bolt = { manaSpent: out.mana0[0] - afterBolt, dmg: 5000 - g.hp };
  // no mana gain from spells
  out.manaGainFromSpell = p.mana - afterBolt;
  let hp = g.hp;
  p.mana = 74; game.input.pressed.add('special'); step(0.1);
  out.fireTooLittleMana = { state: p.state, mana: p.mana };
  p.setState('move'); p.mana = 145; p.pos.set(g.pos.x, 0, g.pos.z + 6); p.yaw = Math.PI;
  game.input.pressed.add('special'); step(2.2, () => { g.cd = 99; });
  out.twinFire = { manaSpent: 145 - p.mana, dmg: hp - g.hp };  // two fireballs (evolved)
  // knife hit gives mana
  p.setState('move'); p.st = p.maxSt; p.mana = 0; p.pos.set(g.pos.x, 0, g.pos.z + 1.4); p.yaw = Math.PI;
  game.input.pressed.add('attack'); step(0.6, () => { g.cd = 99; });
  out.knifeMana = p.mana; out.knifeState = p.state;
  // mana does not come back on Rest
  p.mana = 5; game.claimReward('rest'); out.manaAfterRest = p.mana;

  // 4) evolved rogue: wider window and instant critical
  p = fresh('rogue');
  const g2 = game.enemies.find((e) => e.type === 'grunt');
  for (const e of game.enemies) if (e !== g2) e.die();
  g2.maxHp = g2.hp = 5000; p.pos.set(g2.pos.x, 0, g2.pos.z + 1.7); p.yaw = Math.PI; g2.yaw = 0;
  g2.setState('chase'); g2.cd = 99; g2.startAttack(g2.T.moves.slash); p.setState('move');
  const hitT = g2.T.moves.slash.hits[0].t0;
  while (g2.atk && hitT - g2.atk.t > 0.29) game.step(1 / 60, 1 / 60);
  game.input.pressed.add('special');
  let frames = 0, hit = false;
  for (; frames < 120 && !hit; frames++) { step(1 / 60); hit = g2.hp < 5000; }
  out.rogue = { parriedAt029: g2.state === 'riposted', framesToCrit: frames, crit: 5000 - g2.hp, flash: document.getElementById('redflash').classList.contains('on') };

  // 5) evolved knight: spectral wall stops bodies, width 1.2x torso
  p = fresh('knight');
  const g3 = game.enemies.find((e) => e.type === 'grunt');
  for (const e of game.enemies) if (e !== g3) e.die();
  p.pos.set(g3.pos.x, 0, g3.pos.z + 4); p.yaw = Math.PI;
  game.input.held.special = true; g3.alert();
  let minD = 99;
  step(4, () => { g3.cd = 99; g3.yaw = g3.yawTo(p.pos); minD = Math.min(minD, p.distTo(g3)); });
  out.knight = { visible: p.spectral.visible, width: +p.spectralWidth.toFixed(3), torso: +(0.46 * p.c.model.bulk).toFixed(3), closest: +minD.toFixed(2) };
  game.input.held.special = false;
  return out;
});
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(20), JSON.stringify(v));
if (errs.length) { console.log('ERRORS\n' + [...new Set(errs)].slice(0, 4).join('\n')); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
