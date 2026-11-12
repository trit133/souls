// Supply chests (chests.js) in a raid: 2-4 a map, each in a building with guards round it; sealed until the guards
// are dead; solo it pays 2-3x the guards' gold, 1-10 emeralds and an injector (none past the maximum); in a party
// both players get the gold (each a party share) and 1-5 emeralds, only the first chest gives injectors and the rest
// heal 30% of max health; a guest opening one gets the host to decide. Screenshot /tmp/look/chest.png.
// node scripts/chests.mjs [url with ?server=]  (a build served on :4173 and a room server, e.g. PORT=4199 DB_PATH=:memory:)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const URL = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent('http://127.0.0.1:4199')}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [], fails = [];
const device = async (n) => {
  const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  await page.goto(URL); await page.waitForTimeout(600);
  return page;
};
const auth = async (p, u) => { await p.click('#btn-herm'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const log = (k, v) => console.log(k.padEnd(14), JSON.stringify(v));
const check = (ok, what) => { if (!ok) fails.push(what); };
const A = await device('A'), B = await device('B');
const u = 'c' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');

// ---------- solo ----------
const solo = await A.evaluate(() => {
  const g = game, res = { counts: [] };
  g.loop = () => {}; g.audio.play = () => {};
  const run = (n) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
  for (let k = 0; k < 6; k++) { g.start('knight'); res.counts.push(g.chests.list.length); }
  res.guards = g.chests.list.map((c) => c.def.guards.length);
  res.inBuildings = g.chests.list.every((c) => !!g.world.dungeon.buildingAt(c.def.x, c.def.z));
  const p = g.player; p.hp = p.maxHp = 1e7; p.iframe = () => true;
  const c = g.chests.list[0], d = c.def;
  p.pos.set(d.x, 0, d.z + 1.3); p.setState('move'); g.lastGood = null;
  for (const e of g.enemies) e.update = () => {};
  run(2);
  res.lockedPrompt = g.chests.promptFor(p, 'F')?.line;
  g.input.pressed.add('interact'); run(2);
  res.stillShut = !c.opened;
  const worth = d.guards.reduce((s, sp) => s + (sp.enemy.elite ? 45 : sp.enemy.type === 'brute' ? 30 : 15), 0);
  for (const sp of d.guards) sp.enemy.die();
  run(2);
  res.openPrompt = g.chests.promptFor(p, 'F')?.line;
  p.flasks = p.maxFlasks - 1;
  const gold0 = g.accounts.data.gold, em0 = g.accounts.data.emeralds ?? g.accounts.data.cosmetics?.emeralds;
  window.__em = () => g.accounts.data.emeralds ?? g.accounts.data.cosmetics?.emeralds;
  g.input.pressed.add('interact'); run(30);
  res.open = { opened: c.opened, gold: g.accounts.data.gold - gold0, worth, emeralds: window.__em() - em0, flasks: `${p.flasks}/${p.maxFlasks}`, lid: +d.lid.rotation.x.toFixed(2) };
  // a second chest with injectors already full: no extra one
  const c2 = g.chests.list[1];
  for (const sp of c2.def.guards) sp.enemy.die();
  p.flasks = p.maxFlasks; p.pos.set(c2.def.x, 0, c2.def.z + 1.3); g.lastGood = null; run(2);
  g.input.pressed.add('interact'); run(2);
  res.full = { opened: c2.opened, flasks: `${p.flasks}/${p.maxFlasks}` };
  // somewhere to look at one: stand by a shut chest with its guards gone
  const c3 = g.chests.list.find((x) => !x.opened) || c;
  for (const sp of c3.def.guards) sp.enemy.die();
  p.pos.set(c3.def.x + 1.6, 0, c3.def.z + 1.6); g.lastGood = null; run(20);
  return res;
});
log('solo', solo);
await A.screenshot({ path: '/tmp/look/chest.png' });
check(solo.counts.every((n) => n >= 2 && n <= 4), 'solo: 2-4 chests a map');
check(solo.guards.every((n) => n >= 2), 'solo: guards round each chest');
check(solo.inBuildings, 'solo: chests in buildings');
check(solo.stillShut && /sealed/.test(solo.lockedPrompt), 'solo: sealed while guards live');
check(solo.open.opened && solo.open.gold >= 2 * solo.open.worth && solo.open.gold <= 3 * solo.open.worth, 'solo: gold 2-3x');
check(solo.open.emeralds >= 1 && solo.open.emeralds <= 10, 'solo: 1-10 emeralds');
check(solo.open.flasks.split('/')[0] === solo.open.flasks.split('/')[1], 'solo: +1 injector');
check(solo.full.opened && solo.full.flasks.split('/')[0] === solo.full.flasks.split('/')[1], 'solo: not past max');

// ---------- a party of two ----------
await A.close(); await B.close();
const C = await device('C'), D = await device('D');
await auth(C, u + 'c'); await auth(D, u + 'd');
await C.click('#hm-party'); await C.click('#lobby-create'); await C.waitForTimeout(400);
const code = await C.textContent('#lobby-code');
await D.click('#hm-party'); await D.fill('#lobby-input', code); await D.click('#lobby-joinbtn'); await C.waitForTimeout(400);
await C.click('#lobby-start'); await C.waitForTimeout(1800);
const both = (fn, arg) => Promise.all([C, D].map((p) => p.evaluate(fn, arg)));
await both(() => { const p = game.player; p.hp = p.maxHp = 1e6; p.iframe = () => true; window.__em = () => game.accounts.data.emeralds ?? game.accounts.data.cosmetics?.emeralds; });
const same = await both(() => game.chests.list.map((c) => c.def.x.toFixed(1) + ',' + c.def.z.toFixed(1)).join(' '));
log('same chests', same);
check(same[0] === same[1] && same[0].length, 'party: same chests');
// the guest opens chest 0 once the host has killed its guards
await C.evaluate(() => { const c = game.chests.list[0]; game.player.pos.set(c.def.x + 6, 0, c.def.z); for (const sp of c.def.guards) sp.enemy.die(); });
await C.waitForTimeout(2500);
const before = await both(() => ({ gold: game.accounts.data.gold, em: window.__em() }));
await D.evaluate(() => { const c = game.chests.list[0], p = game.player; p.pos.set(c.def.x, 0, c.def.z + 1.3); p.setState('move'); game.lastGood = null; p.flasks = p.maxFlasks - 1; });
await C.evaluate(() => { game.player.flasks = game.player.maxFlasks - 1; });
await D.waitForTimeout(300);
await D.evaluate(() => game.input.pressed.add('interact'));
await C.waitForTimeout(1200);
const first = await both((b) => ({ opened: game.chests.list[0].opened, gold: game.accounts.data.gold - b[game.mp.isHost ? 0 : 1].gold, em: window.__em() - b[game.mp.isHost ? 0 : 1].em, flasks: `${game.player.flasks}/${game.player.maxFlasks}` }), before);
log('party first', first);
// the host opens chest 1: no injectors this time, 30% health instead
await both(() => { const p = game.player; p.hp = p.maxHp * 0.2; p.flasks = p.maxFlasks - 1; });
await C.evaluate(() => { const c = game.chests.list[1], p = game.player; for (const sp of c.def.guards) sp.enemy.die(); p.pos.set(c.def.x, 0, c.def.z + 1.3); p.setState('move'); game.lastGood = null; });
await C.waitForTimeout(400);
await C.evaluate(() => game.input.pressed.add('interact'));
await C.waitForTimeout(1200);
const second = await both(() => ({ opened: game.chests.list[1].opened, hp: +(game.player.hp / game.player.maxHp).toFixed(2), flasks: `${game.player.flasks}/${game.player.maxFlasks}` }));
log('party second', second);
const worth0 = await C.evaluate(() => game.chests.list[0].def.guards.reduce((s, sp) => s + (sp.enemy.elite ? 45 : sp.enemy.type === 'brute' ? 30 : 15), 0));
const share = 1 / 1.15; // partyShare(2)
check(first.every((x) => x.opened), 'party: opened for both');
check(first[0].gold === first[1].gold && first[0].gold >= Math.floor(2 * worth0 * share) && first[0].gold <= Math.ceil(3 * worth0 * share), 'party: same gold, a party share of 2-3x');
check(first.every((x) => x.em >= 1 && x.em <= 5 && x.em === first[0].em), 'party: 1-5 emeralds each');
check(first.every((x) => x.flasks.split('/')[0] === x.flasks.split('/')[1]), 'party: first chest +1 injector each');
check(second.every((x) => x.opened && Math.abs(x.hp - 0.5) < 0.02 && x.flasks.split('/')[0] !== x.flasks.split('/')[1]), 'party: later chests heal 30%, no injector');

console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
console.log(fails.length ? 'FAILED: ' + fails.join('; ') : 'OK all checks');
await b.close();
process.exit(errs.length || fails.length ? 1 : 0);
