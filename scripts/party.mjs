// Online accounts + 3-player party, using separate browser contexts ("devices").
// Needs: vite preview on :4173 and `DB_PATH=/tmp/x.db PORT=4111 node server/index.js`.
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [];
const device = async (n) => {
  const ctx = await b.newContext({ viewport: { width: 640, height: 360 } }), page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  await page.goto(URL); await page.waitForTimeout(500);
  return page;
};
const auth = async (p, u, btn) => { await p.click('#btn-acct'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click(btn); await p.waitForTimeout(600); };
const log = (k, v) => console.log(k.padEnd(13), JSON.stringify(v));
const A = await device('A'), B = await device('B'), C = await device('C');
const wait = (ms) => A.waitForTimeout(ms);
const u = 'p' + Date.now() % 100000;

// 1) accounts across devices
await auth(A, u + 'a', '#acct-signup'); await auth(B, u + 'b', '#acct-signup'); await auth(C, u + 'c', '#acct-signup');
await A.evaluate(() => { game.accounts.data.gold = 77; game.accounts.data.upgrades.dmg = 2; game.accounts.save(); }); await wait(400);
const D = await device('D'); await auth(D, u + 'a', '#acct-signin');
log('1 other device', await D.evaluate(() => [game.accounts.user, game.accounts.data.gold, game.accounts.data.upgrades]));
await D.reload(); await D.waitForTimeout(800);
log('1 after reload', await D.evaluate(() => [game.accounts.user, game.accounts.data.gold]));
await D.context().close();

// 2) lobby
await A.click('#btn-mp'); await A.click('[data-pick=rogue]'); await A.click('#lobby-create'); await wait(400);
const code = await A.textContent('#lobby-code');
for (const [p, k] of [[B, 'knight'], [C, 'knight']]) { await p.click('#btn-mp'); await p.click(`[data-pick=${k}]`); await p.fill('#lobby-input', code); await p.click('#lobby-joinbtn'); await p.waitForTimeout(300); }
log('2 lobby', await A.evaluate(() => document.getElementById('lobby-members').innerText.split('\n')));
const E = await device('E'); await auth(E, u + 'e', '#acct-signup'); await E.click('#btn-mp'); await E.fill('#lobby-input', code); await E.click('#lobby-joinbtn'); await E.waitForTimeout(300);
log('2 4th player', await E.textContent('#lobby-err')); await E.context().close();
await A.click('#lobby-start'); await wait(1200);
const state = (p) => p.evaluate(() => ({ mode: game.mode, host: game.mp.isHost, layout: game.layout.join(), enemies: game.enemies.length, gruntHp: game.enemies.find((e) => e.type === 'grunt').maxHp, tier0dmg: +game.enemies[0].dmgScale.toFixed(2), bossHp: game.encounters.map((e) => e.boss.maxHp), puppet: game.enemies[0].puppet, peers: game.mp.peers.size }));
const [sa, sb] = [await state(A), await state(B)];
log('2 host', sa); log('2 guest', sb); log('2 same world', sa.layout === sb.layout && sa.enemies === sb.enemies);

// 3) a guest's hit reaches the host; kills pay the shared pot
await B.evaluate(() => { const p = game.player, e = game.enemies[0]; p.pos.set(e.pos.x, 0, e.pos.z + 1.4); });
await wait(500);
log('3 B seen by A', await A.evaluate(() => { const r = [...game.mp.peers.values()].find((x) => x.kind === 'knight'); return [r.name, +r.pos.x.toFixed(1)]; }));
const hp0 = await A.evaluate(() => game.enemies[0].hp);
await B.evaluate(() => { game.enemies[0].receive({ dmg: 40, poise: 0, srcPos: game.player.pos }); });
await wait(300);
log('3 guest hit', { before: hp0, hostHp: await A.evaluate(() => game.enemies[0].hp) });
await A.evaluate(() => { game.enemies[0].die(); }); await wait(500);
log('3 pot', await Promise.all([A, B, C].map((p) => p.evaluate(() => game.runGold))));
log('3 puppet dead', await B.evaluate(() => [game.enemies[0].state, game.enemies[0].alive]));

// 4) enemies chase whoever's closest and hit guests
await B.evaluate(() => { game.player.maxHp = game.player.hp = 500; });
await A.evaluate(() => { const g = game.enemies.find((e) => e.alive && e.type === 'grunt'), r = [...game.mp.peers.values()][0]; r.pos.set(g.pos.x, 0, g.pos.z + 1.4); r.net.x = r.pos.x; r.net.z = r.pos.z; window.__t = game.targetOf(g).name; const def = g.T.moves.slash; g.atkKey = 'slash'; g.yaw = g.yawTo(r.pos); game.resolveHit(g, r, def.hits[0], def); });
await wait(400);
log('4 target', await A.evaluate(() => window.__t)); log('4 guest hp', await B.evaluate(() => game.player.hp));

// 5) mini boss: everyone pulled in, reward barrier
await A.evaluate(() => { const e = game.encounters[0]; game.player.pos.set(e.arena.x, 0, e.arena.z + e.arena.r - 3); }); await wait(700);
log('5 enc', await Promise.all([A, B, C].map((p) => p.evaluate(() => { const e = game.encounters[0]; return [e.active, Math.hypot(game.player.pos.x - e.arena.x, game.player.pos.z - e.arena.z) < e.arena.r, document.getElementById('boss-name').textContent.slice(0, 8)]; }))));
await A.evaluate(() => { game.encounters[0].boss.die(); }); await wait(4400);
log('5 reward', await Promise.all([A, B, C].map((p) => p.evaluate(() => [game.mode, !document.getElementById('cashout').classList.contains('hidden'), game.runGold]))));
await A.evaluate(() => document.querySelectorAll('.rcard')[3].click()); await wait(300);
await B.evaluate(() => document.querySelectorAll('.rcard')[3].click()); await wait(300);
log('5 two picked', await A.evaluate(() => game.mode));
await C.evaluate(() => document.querySelectorAll('.rcard')[0].click()); await wait(500);
log('5 all picked', await Promise.all([A, B, C].map((p) => p.evaluate(() => game.mode))));

// 6) down + revive
await B.evaluate(() => { const p = game.player; p.setState('move'); p.hp = 1; p.receive({ dmg: 9999, srcPos: p.pos.clone().add({ x: 0, y: 0, z: 1 }), knock: 'light' }); }); await wait(400);
log('6 down', { mode: await B.evaluate(() => [game.mode, game.player.alive]), seenByC: await C.evaluate(() => [...game.mp.peers.values()].map((p) => p.alive)) });
const mh = () => Promise.all([A, B, C].map((p) => p.evaluate(() => game.player.maxHp)));
const before = await mh();
await C.evaluate(() => { const down = [...game.mp.peers.values()].find((x) => !x.alive); game.player.pos.copy(down.pos); game.player.pos.x += 1; game.player.setState('move'); game.startRevive(down); }); await wait(2200);
log('6 revive', { before, after: await mh(), bAlive: await B.evaluate(() => [game.player.alive, game.player.hp]) });

// 7) host cash-out pays the pot ×1 to everyone
await A.evaluate(() => { game.minisFelled = 1; game.mp.sendAll({ t: 'gold', n: 20 }); game.runGold = 20; }); await wait(300);
await B.evaluate(() => { game.minisFelled = 1; }); await C.evaluate(() => { game.minisFelled = 1; });
const g0 = await Promise.all([A, B, C].map((p) => p.evaluate(() => game.accounts.data.gold)));
await A.evaluate(() => game.cashOut()); await wait(500);
log('7 cashout', { g0, g1: await Promise.all([A, B, C].map((p) => p.evaluate(() => [game.accounts.data.gold, game.mode]))) });

// 8) host leaving closes the party for guests
await A.evaluate(() => game.toTitle()); await wait(500);
log('8 host left', await B.evaluate(() => [game.mode, document.getElementById('lobby-err').textContent]));

if (errs.length) { console.log('ERRORS\n' + [...new Set(errs)].slice(0, 6).join('\n')); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
