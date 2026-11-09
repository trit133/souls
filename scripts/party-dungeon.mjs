// A two-player party in a dungeon: both get the same map; a seal broken by the host shows broken for the guest; an
// event's called-in enemies appear for the guest in the same places; the clear count follows; the guest stepping
// on the stair down takes both into the next dungeon. Needs the dev server on :5180 and the room server on :4111.
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:5180/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [];
const device = async (n) => {
  const page = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  await page.goto(URL); await page.waitForTimeout(500);
  return page;
};
const auth = async (p, u) => { await p.click('#btn-herm'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const log = (k, v) => console.log(k.padEnd(13), JSON.stringify(v));
const A = await device('A'), B = await device('B');
const wait = (ms) => A.waitForTimeout(ms);
const u = 'd' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');
await A.click('#hm-party'); await A.click('#lobby-create'); await wait(400);
const code = await A.textContent('#lobby-code');
await B.click('#hm-party'); await B.fill('#lobby-input', code); await B.click('#lobby-joinbtn'); await wait(400);
await A.click('#lobby-start'); await wait(1500);
const both = (fn, arg) => Promise.all([A, B].map((p) => p.evaluate(fn, arg)));
for (const p of [A, B]) await p.evaluate(() => { game.player.hp = game.player.maxHp = 1e6; game.player.iframe = () => true; });
log('same map', await both(() => [game.act, game.areaName, game.world.dungeon.cells.length, game.enemies.length, game.reserves.length, game.world.seals.map((s) => s.kind[0]).join(''), game.world.dungeon.arena.x, game.world.dungeon.arena.z]));
// the host kills an elite pack: the guest sees the seal break
await A.evaluate(() => { const s = game.seals.list.find((x) => x.def.kind === 'elite'); window.__s = s.def.i; game.player.pos.set(s.def.x, 0, s.def.z + 4); for (const sp of s.def.guards) sp.enemy.die(); });
await wait(900);
log('seal broken', await both(() => [game.seals.broken, game.seals.list.find((x) => x.def.i === window.__s || x.def.broken)?.def.crystal.visible]));
// the guest walks into the circle: the host starts it, the called-in enemies show up on the guest's screen too
await B.evaluate(() => { const s = game.seals.list.find((x) => x.def.kind === 'circle'); game.player.pos.set(s.def.x + 1, 0, s.def.z + 1); game.lastGood = null; });
await wait(2500);
log('circle', await both(() => { const s = game.seals.list.find((x) => x.def.kind === 'circle'); const called = s.def.reserves.filter((r) => !r.enemy.reserve).map((r) => r.enemy); return [s.state, +s.prog.toFixed(0), called.length, called.map((e) => e.pos.x.toFixed(0) + ',' + e.pos.z.toFixed(0)).join(' ')]; }));
// kills count toward the clear on both screens, and every kill pays both players a share (2 players: 77%)
const g0 = await both(() => game.accounts.data.gold);
const paid = await A.evaluate(() => { let n = 0, sum = 0; for (const e of game.enemies) if (e.alive && !e.event && !e.effigy && n++ < 6) { sum += e.elite ? 45 : e.type === 'brute' ? 30 : 15; e.lastHitBy = game.player; e.die(); } return sum; });
await wait(2200);
const g1 = await both(() => game.accounts.data.gold);
log('kill gold', { killsWorth: paid, host: g1[0] - g0[0], guest: g1[1] - g0[1] });
log('clear %', await both(() => game.clearPct()));
// the host breaks the rest, beats the mini boss; the guest takes the stair down
await A.evaluate(() => { for (const s of game.seals.list) if (s.state !== 'broken') game.seals.breakSeal(s); });
await wait(600);
log('door', await both(() => [game.seals.broken, game.world.gates[game.world.dungeon.enc.gateIn].open, game.world.dungeon.enc.sealed]));
await A.evaluate(() => { const e = game.world.dungeon.enc; game.player.pos.set(e.arena.x, 0, e.arena.z); game.lastGood = null; });
await wait(800);
await A.evaluate(() => { const e = game.world.dungeon.enc; e.boss.hp = 1; e.boss.receive({ dmg: 99, poise: 0, srcPos: game.player.pos, attacker: game.player }); });
await wait(5000);
for (const p of [A, B]) await p.evaluate(() => { if (game.mode === 'reward') game.claimReward('rest'); });
await wait(800);
log('portal', await both(() => [!!game.portal, game.mode]));
await B.evaluate(() => { game.player.pos.set(game.portal.x, 0, game.portal.z); game.lastGood = null; });
await wait(300);
await B.evaluate(() => game.input.pressed.add('interact'));
await wait(1500);
log('next act', await both(() => [game.act, game.areaName, game.enemies.length, game.seals.broken, Math.round(game.player.pos.x), Math.round(game.player.pos.z), game.mp.peers.size]));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
