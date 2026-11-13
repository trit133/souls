// Materials (items.js) in a raid: chests roll a rarity with more and tougher guards the rarer they are; supply drums
// smash for materials; what you carry goes to the stash when you leave by a door (all of it) or die (a third per
// shrine broken); the boss drops its head gem once (then gold) and opens a way out; the stash shows Items / Gems /
// Runes. A party's chests give each about half. node scripts/loot.mjs [url with ?server=]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/?server=' + encodeURIComponent('http://127.0.0.1:4111');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1100, height: 620 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(url); await page.waitForTimeout(800);
await page.click('#btn-herm'); await page.fill('#acct-user', 'loot' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123');
await page.click('#acct-signup'); await page.waitForTimeout(1200);
const out = await page.evaluate(async () => {
  const g = game, res = {}, I = g.itemsLib;
  g.loop = () => {}; g.audio.play = () => {};
  const run = (n, fn) => { for (let i = 0; i < n; i++) { fn && fn(); g.step(1 / 60, 1 / 60); } };
  const begin = () => { g.hermitage.close(false); g.start('knight'); const p = g.player; p.hp = p.maxHp = 1e7; return p; };

  // 1. chests: a rarity each, guards by rarity (rare and up with an elite)
  let p = begin();
  res.chests = g.chests.list.map((c) => ({ rarity: c.def.rarity, big: !!c.def.big, guards: c.def.guards.length, elites: c.def.guards.filter((sp) => sp.enemy?.elite).length }));
  res.drums = g.chests.drums.length;
  // 2. smash a drum with a swing
  const dr = g.chests.drums.find((x) => !x.def.plain), obs0 = g.world.obstacles.length;
  p.pos.set(dr.def.x, 0, dr.def.z + 1.3); p.yaw = Math.PI; g.lastGood = null; p.st = p.maxSt;
  g.input.pressed.add('attack'); run(40);
  res.drum = { broken: dr.broken, loot: { ...g.raidLoot }, obstacleGone: g.world.obstacles.length === obs0 - 1, pieces: g.chests.debris.length,
    feed: [...document.querySelectorAll('#loot-feed .lf-line')].map((l) => [l.textContent, getComputedStyle(l).color, parseInt(getComputedStyle(l).fontSize)]) };
  run(120); res.drum.piecesSettled = g.chests.debris.every((d) => d.rest);
  res.drum.plain = g.chests.drums.filter((d) => d.def.plain).length;
  g.togglePouch(true);
  res.pouch = { rows: document.querySelectorAll('#pc-list .pc-row').length, safe: document.getElementById('pc-safe').textContent, btn: document.getElementById('pouch-btn').textContent };
  g.togglePouch(false);
  // 3. a chest: sealed while its guards live, then its materials (top one at its rarity)
  const c = g.chests.list.find((x) => !x.def.big);
  for (const sp of c.def.guards) sp.enemy?.die(true);
  const before = I.countItems(g.raidLoot);
  g.chests.open(c);
  const got = I.countItems(g.raidLoot) - before;
  const tiers = Object.keys(g.raidLoot).map((id) => I.TIERS.indexOf(I.ITEMS[id].rarity));
  res.chest = { rarity: c.def.rarity, got, topTierFound: Math.max(...tiers) >= I.TIERS.indexOf(c.def.rarity) };
  // 4. fall with one shrine broken: a third kept
  const carried = { ...g.raidLoot }, n = I.countItems(carried);
  g.seals.breakSeal(g.seals.list[0]);
  p.hp = 0; p.die?.(); g.gameOver(); await new Promise((r) => setTimeout(r, 3600));
  const st1 = I.countItems(g.accounts.data.items);
  res.death = { carried: n, expected: Math.round(n / 3), kept: st1, share: Math.round(g.securedShare * 100), stats: document.getElementById('gameover-stats').innerText.split('\n').find((l) => l.startsWith('Kept')) };
  g.toTitle();

  // 5. out through the camp gate: everything kept
  p = begin();
  g.addLoot({ scrap_iron: 3, servo_motor: 1 });
  const gate = g.world.dungeon.exits.find((e) => e.label.includes('camp'));
  const hatch = g.world.dungeon.exits.find((e) => e.label.includes('hatch'));
  res.exits = { count: g.world.dungeon.exits.length, gateReach: g.world.dungeon.reach(gate.x, gate.z), hatchReach: g.world.dungeon.reach(hatch.x, hatch.z), hatchAt: [Math.round(hatch.x), Math.round(hatch.z)] };
  p.pos.set(gate.x, 0, gate.z); g.lastGood = null; run(2); g.input.pressed.add('interact'); run(2);
  res.extract = { mode: g.mode, victory: !document.getElementById('victory').classList.contains('hidden'), banner: document.querySelector('#victory .banner').textContent, stash: I.countItems(g.accounts.data.items) - st1 };
  g.toTitle();

  // 6. the boss: its gem the first time (then gold), a way out in the pit
  p = begin();
  for (const S of g.seals.list) g.seals.breakSeal(S);
  const enc = g.world.dungeon.enc; for (const e of g.enemies) e.die(true);
  p.pos.set(enc.arena.x, 0, enc.arena.z + 4); g.lastGood = null; run(5);
  g.onBossDeath(enc.boss); run(2);
  res.boss = { gem: !!g.accounts.data.gems?.gem_hask, exits: g.world.dungeon.exits.length, pitExit: g.world.dungeon.exits.some((e) => e.label.includes('pit')) };
  const pit = g.world.dungeon.exits.find((e) => e.label.includes('pit'));
  p.pos.set(pit.x, 0, pit.z); run(2); g.input.pressed.add('interact'); run(2);
  res.boss.banner = document.querySelector('#victory .banner').textContent;
  g.toTitle();
  p = begin(); const banked0 = g.runBanked;
  for (const S of g.seals.list) g.seals.breakSeal(S);
  const enc2 = g.world.dungeon.enc; g.onBossDeath(enc2.boss); run(2);
  res.boss.againGold = g.runBanked - banked0;
  g.toTitle();

  // 7. a party gets about half of a chest each
  const r = Math.random; let solo = 0, party = 0;
  for (let k = 0; k < 400; k++) { solo += I.countItems(I.rollChest(r, 'r1', 'rare')); party += I.countItems(I.rollChest(r, 'r1', 'rare', { party: true })); }
  res.partyShare = +(party / solo).toFixed(2);
  return res;
});
// 8. the stash's tabs
await page.evaluate(() => { game.hermitage.open('knight'); game.hermitage.setStash(true); });
await page.waitForTimeout(400);
out.stash = await page.evaluate(() => ({ items: document.querySelectorAll('#hm-slots .hm-slot .item-ic').length, worth: document.getElementById('hm-worth').textContent }));
await page.hover('#hm-slots .hm-slot:first-child'); await page.waitForTimeout(150);
out.stash.tip = await page.evaluate(() => document.getElementById('hm-tip').innerText.replace(/\n/g, ' | '));
await page.screenshot({ path: '/tmp/loot-stash-items.png' });
await page.click('.hm-tabs [data-tab=gems]'); await page.waitForTimeout(150);
out.stash.gems = await page.evaluate(() => ({ shown: document.querySelectorAll('#hm-slots .hm-slot').length, owned: document.querySelectorAll('#hm-slots .hm-slot:not(.empty)').length }));
await page.screenshot({ path: '/tmp/loot-stash-gems.png' });
await page.click('.hm-tabs [data-tab=runes]'); await page.waitForTimeout(100);
out.stash.runes = await page.evaluate(() => document.getElementById('hm-stash-note').textContent);
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(12), JSON.stringify(v));
const ok = out.chests.every((c) => c.rarity) && out.drums >= 8 && out.drum.broken && Object.keys(out.drum.loot).length && out.drum.obstacleGone && out.drum.pieces >= 10 && out.drum.piecesSettled && out.drum.feed.length && out.drum.feed[0][2] >= 20 && out.drum.plain > 0 && out.pouch.rows > 0
  && out.chest.got >= 2 && out.chest.topTierFound && out.death.kept === out.death.expected && out.extract.victory && out.extract.stash === 4
  && out.exits.count === 2 && out.exits.gateReach && out.exits.hatchReach && out.boss.gem && out.boss.pitExit && out.boss.againGold >= 250
  && out.partyShare > 0.35 && out.partyShare < 0.65 && out.stash.items > 0 && out.stash.gems.shown === 3 && out.stash.gems.owned === 1;
console.log(ok ? 'loot works' : 'LOOT PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
