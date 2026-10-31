// Accounts, gold, cash-out multipliers, enemy tiers, upgrade shop, persistence.
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(URL); await page.waitForTimeout(600);
const log = (k, v) => console.log(k.padEnd(14), JSON.stringify(v));

// 1) accounts through the real form
const form = async (u, p, btn) => {
  await page.click('#btn-acct'); await page.fill('#acct-user', u); await page.fill('#acct-pass', p);
  await page.click(btn); await page.waitForTimeout(500);
  const err = await page.textContent('#acct-err');
  if (await page.isVisible('#account')) await page.click('#acct-back');
  return err;
};
const R = {};
R.badName = await form('a', 'secret1', '#acct-signup');
R.shortPass = await form('tester', '123', '#acct-signup');
R.signup = await form('Tester_1', 'secret123', '#acct-signup');
R.name = await page.textContent('#acct-name');
await page.click('#btn-acct'); // sign out
R.afterOut = await page.textContent('#acct-name');
R.duplicate = await form('tester_1', 'other123', '#acct-signup');
R.wrongPass = await form('Tester_1', 'nope1234', '#acct-submit' === 0 ? '' : '#acct-signin');
R.login = await form('tester_1', 'secret123', '#acct-signin');
R.storedPlainPassword = await page.evaluate(() => localStorage.getItem('ashenVigil.accounts.v1').includes('secret123'));
log('1 accounts', R);

const res = await page.evaluate(async () => {
  game.loop = () => {};
  const out = {};
  const LAYOUT = ['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
  const fresh = () => { game.start('knight'); game.audio.play = () => {}; game.buildRun(LAYOUT); game.accounts.data.gold = 0; };
  const killMini = (i) => { const e = game.encounters.filter((x) => x.kind === 'mini')[i]; e.active = true; e.boss.setState('neutral'); e.boss.die(); };

  // 2) tiers: health / damage / speed / eyes by module
  fresh();
  out.tiers = game.world.mods.map((m) => {
    const e = game.enemies.find((x) => x.mod === m.i) || game.encounters.find((x) => x.mod === m.i)?.boss;
    return `${m.i + 1}:${m.key}=t${e.tier} hp${e.maxHp} dmg${e.dmgScale.toFixed(1)} spd${e.spdScale.toFixed(1)}`;
  });
  const g0 = game.enemies.find((x) => x.type === 'grunt' && x.tier === 0), g3 = game.enemies.find((x) => x.type === 'grunt' && x.tier === 3);
  out.gruntHp = [g0.maxHp, g3?.maxHp];
  // real damage dealt scales
  const p = game.player;
  const spear = game.enemies.find((x) => x.tier === 2);
  p.pos.set(spear.pos.x, 0, spear.pos.z + 1); p.hp = p.maxHp; p.setState('move');
  const hit = { dmg: 20, poise: 10, range: 3, arc: 3 };
  game.resolveHit(spear, p, hit, {}); out.tier2HitOf20 = +(p.maxHp - p.hp).toFixed(1);

  // 3) gold values
  fresh();
  const gold = [];
  game.enemies[0].die(); gold.push(game.runGold);
  game.enemies[1].die(); gold.push(game.runGold);
  killMini(0); gold.push(game.runGold);
  killMini(1); gold.push(game.runGold);
  killMini(2); gold.push(game.runGold);
  out.goldSteps = gold; // expect 1,2,4,7,11
  out.finalBoss = (() => { const e = game.encounters.find((x) => x.kind === 'boss'); e.active = true; e.boss.setState('neutral'); e.boss.die(); return { runGold: game.runGold, banked: game.accounts.data.gold, wins: game.accounts.data.stats.wins }; })(); // 18 x 3 = 54

  // 4) cash-out multipliers
  const cash = {};
  for (const [n, name] of [[1, 'after1'], [2, 'after2'], [3, 'after3']]) {
    fresh();
    for (let i = 0; i < 9; i++) game.enemies[i].die();
    for (let i = 0; i < n; i++) killMini(i);
    const held = game.runGold;
    game.mode = 'play'; game.cashOut();
    cash[name] = { held, banked: game.accounts.data.gold, mode: game.mode, title: document.getElementById('gameover-title').textContent };
  }
  out.cash = cash;

  // 5) death loses unbanked gold
  fresh();
  game.enemies[0].die(); killMini(0);
  const held = game.runGold;
  game.player.receive({ dmg: 1e9, srcPos: game.player.pos.clone().add({ x: 0, y: 0, z: 1 }), knock: 'light' });
  out.death = { held, banked: game.accounts.data.gold };
  return out;
});
log('2 tiers', res.tiers); log('2 grunt hp', res.gruntHp); log('2 dmg', res.tier2HitOf20);
log('3 gold', res.goldSteps); log('3 win', res.finalBoss); log('4 cashout', res.cash); log('5 death', res.death);
await page.waitForTimeout(3700);

// 6) shop through the real UI
const shop = await page.evaluate(() => {
  const out = {};
  game.toTitle();
  game.accounts.data.gold = 100; game.accounts.data.upgrades = {}; game.accounts.save(); game.refreshTitle();
  document.getElementById('btn-shop').click();
  const row = (i) => document.querySelectorAll('.shop-row')[i];
  const costs = [];
  for (let i = 0; i < 4; i++) { costs.push(row(0).querySelector('button').textContent); row(0).querySelector('button').click(); }
  out.dmgCostsPaid = costs; out.goldLeft = game.accounts.data.gold; out.dmgInfo = row(0).querySelector('.sinfo').textContent;
  out.nextDmgButton = row(0).querySelector('button').textContent; out.nextDisabled = row(0).querySelector('button').disabled;
  const mr = document.querySelector('[data-key=mana] button'); out.mana = { text: mr.textContent, disabled: mr.disabled };
  document.getElementById('shop-back').click();
  // applied in a run? +3+3+3+4 = 13% damage
  game.accounts.data.upgrades = { dmg: 4, hp: 4, move: 4, aspd: 4, st: 4 }; game.accounts.save();
  game.start('knight');
  const p = game.player;
  out.applied = { dmgMul: +p.dmgMul.toFixed(2), maxHp: p.maxHp, moveMul: +p.moveMul.toFixed(2), aspdMul: +p.aspdMul.toFixed(2), maxSt: p.maxSt };
  return out;
});
log('6 shop', shop);

// 7) persistence across a reload
await page.reload(); await page.waitForTimeout(700);
log('7 reload', await page.evaluate(() => ({ user: game.accounts.user, name: document.getElementById('acct-name').textContent, gold: document.getElementById('acct-gold').textContent, up: game.accounts.data.upgrades })));

if (errs.length) { console.log('ERRORS\n' + [...new Set(errs)].slice(0, 5).join('\n')); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
