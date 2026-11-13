// A raid's basements (city.js): only the boss's, the underground shrines' and one hoard vault (3-4 a raid, never an
// empty one); the hoard's large chest and two small ones are sealed until its War Servitor and two big elites die,
// and the large one pays 4-6x their gold, 10-20 emeralds and an injector; going down a stair marks the building on
// the surface for the whole party (basements.js), and the mark follows what's below (looted, broken).
// Screenshots /tmp/look/hoard.png and /tmp/look/marker.png.
// node scripts/basements.mjs [url with ?server=]  (a build served on :4173 and a room server, e.g. PORT=4199 DB_PATH=:memory:)
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
const u = 'b' + Date.now() % 100000;

// ---------- solo ----------
const A = await device('A');
await auth(A, u + 'a');
const solo = await A.evaluate(() => {
  const g = game, res = { raids: [] };
  g.loop = () => {}; g.audio.play = () => {};
  const run = (n) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
  for (let k = 0; k < 8; k++) {
    g.start('knight');
    const D = g.world.dungeon;
    res.raids.push({ unders: D.unders.map((x) => x.kind).join(','), shrinesUnder: D.sites.filter((S) => S.under).length, stairsDown: D.stairs.filter((s) => s.down).length,
      empty: D.unders.filter((x) => x.kind === 'vault' && !g.seals.list.some((s) => s.def.mod === x.mod.i)).length, marks: g.basements.list.length });
  }
  const D = g.world.dungeon, p = g.player; p.hp = p.maxHp = 1e7; p.iframe = () => true;
  for (const e of g.enemies) e.update = () => {};
  const hoard = g.chests.list.filter((c) => c.def.hoard), guards = hoard[0].def.guards.map((sp) => sp.enemy);
  res.hoard = { chests: hoard.length, big: hoard.filter((c) => c.def.big).length, guards: guards.map((e) => `${e.type}${e.elite ? '/' + e.elite : ''}${e.big ? '/big' : ''}:${Math.round(e.maxHp)}`), scale: guards.map((e) => +e.rig.root.scale.x.toFixed(2)) };
  // down the hoard's stair: the building gets its mark
  const mark = g.basements.list.find((e) => e.what === 'cache'), stair = D.stairs.find((s) => s.u === mark.u);
  res.markBefore = mark.sprite.visible;
  p.pos.set(stair.x, 0, stair.z); p.setState('move'); g.lastGood = null; run(2);
  g.input.pressed.add('interact'); run(3);
  res.markAfter = { visible: mark.sprite.visible, icon: mark.look === g.basements.icon('chest', '#5a3a12', '#e8b040') ? 'chest' : '?', under: D.isUnder(p.pos.x) };
  // the large chest sealed, then its guards die and it opens
  const big = hoard.find((c) => c.def.big);
  p.pos.set(big.def.x, 0, big.def.z + 1.9); g.lastGood = null; run(2);
  res.sealed = g.chests.promptFor(p, 'F')?.line;
  const worth = guards.reduce((s, e) => s + (e.elite ? 45 : e.type === 'brute' ? 30 : 15), 0);
  for (const e of guards) e.die();
  run(2);
  res.prompt = g.chests.promptFor(p, 'F')?.line;
  window.__em = () => g.accounts.data.emeralds ?? g.accounts.data.cosmetics?.emeralds;
  const gold0 = g.accounts.data.gold, em0 = window.__em(); p.flasks = p.maxFlasks - 1;
  g.input.pressed.add('interact'); run(30);
  res.big = { opened: big.opened, gold: g.accounts.data.gold - gold0, worth, em: window.__em() - em0, flasks: `${p.flasks}/${p.maxFlasks}` };
  res.markWhileLeft = mark.look.c === g.basements.icon('chestOpen', '#3a3026', '#6a5a44').c ? 'open' : 'shut';
  for (const c of hoard) if (!c.opened) g.chests.open(c);
  run(2);
  res.markLooted = mark.look === g.basements.icon('chestOpen', '#3a3026', '#6a5a44') ? 'open' : 'shut';
  // a shrine's basement: marked when you go down, crossed once broken
  const sm = g.basements.list.find((e) => e.what === 'shrine');
  if (sm) {
    g.basements.found(sm.k); run(2);
    const before = sm.look;
    sm.shrine.def.broken = true; sm.shrine.state = 'broken'; run(2);
    res.shrineMark = { found: sm.sprite.visible, changed: before !== sm.look };
  }
  // a look at the hoard: back in the hall, chests open
  p.pos.set(big.def.x + 3, 0, big.def.z + 5); g.lastGood = null; run(40);
  document.querySelectorAll('#toast,.toast').forEach((t) => t.style.display = 'none'); g.pixel.render(g.scene, g.camera);
  return res;
});
log('solo', solo);
await A.screenshot({ path: '/tmp/look/hoard.png' });
// the surface: next to the marked building
await A.evaluate(() => { const g = game, e = g.basements.list.find((x) => x.what === 'cache'), p = g.player; p.pos.set(e.b.cx, 0, e.b.z1 + 6); g.lastGood = null; for (let i = 0; i < 60; i++) g.step(1 / 60, 1 / 60); document.querySelectorAll('#toast,.toast').forEach((t) => t.style.display = 'none'); g.pixel.render(g.scene, g.camera); });
await A.screenshot({ path: '/tmp/look/marker.png' });
for (const r of solo.raids) {
  const n = 2 + r.shrinesUnder;
  check(r.unders.split(',').length === n && r.stairsDown === n && r.empty === 0 && r.marks === n, `basements: only what's needed (${JSON.stringify(r)})`);
  check(r.unders.includes('boss') && r.unders.includes('cache'), 'basements: a boss and a hoard each raid');
}
check(solo.hoard.chests === 3 && solo.hoard.big === 1, 'hoard: one large chest and two small');
check(solo.hoard.guards.length === 3 && solo.hoard.guards.filter((x) => x.startsWith('brute')).length === 1 && solo.hoard.guards.filter((x) => x.includes('/big')).length === 2, 'hoard: a War Servitor and two big elites');
check(!solo.markBefore && solo.markAfter.visible && solo.markAfter.under, 'mark: shows once down the stair');
check(/sealed/.test(solo.sealed || ''), 'hoard: sealed while guards live');
check(/hoard/.test(solo.prompt || ''), 'hoard: open prompt');
check(solo.big.opened && solo.big.gold >= 4 * solo.big.worth && solo.big.gold <= 6 * solo.big.worth, 'hoard: 4-6x gold');
check(solo.big.em >= 10 && solo.big.em <= 20, 'hoard: 10-20 emeralds');
check(solo.big.flasks.split('/')[0] === solo.big.flasks.split('/')[1], 'hoard: +1 injector');
check(solo.markWhileLeft === 'shut' && solo.markLooted === 'open', 'mark: open chest once all three are looted');
check(!solo.shrineMark || (solo.shrineMark.found && solo.shrineMark.changed), 'mark: shrine crossed once broken');
await A.close();

// ---------- a party: the guest goes down, the host sees the mark; the hoard's injector comes after the first chest's ----------
const C = await device('C'), Dv = await device('D');
await auth(C, u + 'c'); await auth(Dv, u + 'd');
await C.click('#hm-party'); await C.click('#lobby-create'); await C.waitForTimeout(400);
const code = await C.textContent('#lobby-code');
await Dv.click('#hm-party'); await Dv.fill('#lobby-input', code); await Dv.click('#lobby-joinbtn'); await C.waitForTimeout(400);
await C.click('#lobby-start'); await C.waitForTimeout(1800);
const both = (fn, arg) => Promise.all([C, Dv].map((p) => p.evaluate(fn, arg)));
await both(() => { const p = game.player; p.hp = p.maxHp = 1e6; p.iframe = () => true; window.__em = () => game.accounts.data.emeralds ?? game.accounts.data.cosmetics?.emeralds; });
log('same', await both(() => game.world.dungeon.unders.map((x) => x.kind).join(',')));
await Dv.evaluate(() => { const g = game, e = g.basements.list.find((x) => x.what === 'cache'), s = g.world.dungeon.stairs.find((x) => x.u === e.u), p = g.player; p.pos.set(s.x, 0, s.z); p.setState('move'); g.lastGood = null; });
await Dv.waitForTimeout(300);
await Dv.evaluate(() => game.input.pressed.add('interact'));
await C.waitForTimeout(1000);
const seen = await both(() => game.basements.list.find((x) => x.what === 'cache').sprite.visible);
log('party mark', seen);
check(seen[0] && seen[1], 'party: a teammate going down marks it for everyone');
// a surface chest first (uses up the party's injector), then the hoard's large chest still gives one
await C.evaluate(() => { const c = game.chests.list.find((x) => !x.def.hoard); for (const sp of c.def.guards) sp.enemy.die(); window.__c = c; });
await C.waitForTimeout(1500);
await C.evaluate(() => game.chests.open(window.__c));
await C.waitForTimeout(800);
await C.evaluate(() => { const c = game.chests.list.find((x) => x.def.big); for (const sp of c.def.guards) sp.enemy.die(); });
await C.waitForTimeout(2500);
const before = await both(() => { game.player.flasks = game.player.maxFlasks - 1; return { em: window.__em() }; });
await C.evaluate(() => game.chests.open(game.chests.list.find((x) => x.def.big)));
await C.waitForTimeout(1200);
const after = await both((bf) => ({ opened: game.chests.list.find((x) => x.def.big).opened, em: window.__em() - bf[game.mp.isHost ? 0 : 1].em, flasks: `${game.player.flasks}/${game.player.maxFlasks}` }), before);
log('party hoard', after);
check(after.every((x) => x.opened && x.em >= 5 && x.em <= 10 && x.flasks.split('/')[0] === x.flasks.split('/')[1]), 'party: the hoard gives 5-10 emeralds and an injector each');

console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
console.log(fails.length ? 'FAILED: ' + fails.join('; ') : 'OK all checks');
await b.close();
process.exit(errs.length || fails.length ? 1 : 0);
