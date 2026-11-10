// Three players in a dungeon: the host breaks three seals; on every screen the door opens and you can walk through
// it into the boss arena. node scripts/party3-door.mjs [url with ?server=]
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const errs = [];
const device = async (n) => { const page = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage(); page.on('pageerror', (e) => errs.push(n + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1])); await page.goto(URL); await page.waitForTimeout(500); return page; };
const auth = async (p, u) => { await p.click('#btn-herm'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const A = await device('A'), B = await device('B'), C = await device('C'), all = [A, B, C];
const u = 'p3' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b'); await auth(C, u + 'c');
await A.click('#hm-party'); await A.click('#lobby-create'); await A.waitForTimeout(400);
const code = await A.textContent('#lobby-code');
for (const p of [B, C]) { await p.click('#hm-party'); await p.fill('#lobby-input', code); await p.click('#lobby-joinbtn'); await p.waitForTimeout(500); }
await A.click('#lobby-start'); await A.waitForTimeout(2000);
const every = (fn) => Promise.all(all.map((p) => p.evaluate(fn)));
for (const p of all) await p.evaluate(() => { game.player.hp = game.player.maxHp = 1e6; game.player.iframe = () => true; });
console.log('party', JSON.stringify(await every(() => [game.mp.members?.length ?? game.runPlayers, game.runPlayers, game.isGuest])));
// the host breaks the elite seal by killing its pack, holds the circle, breaks the altar's effigies
await A.evaluate(() => {
  const S = game.seals;
  const el = S.list.find((x) => x.def.kind === 'elite'); for (const sp of el.def.guards) sp.enemy.die();
});
await A.waitForTimeout(700);
await A.evaluate(() => { const S = game.seals, c = S.list.find((x) => x.def.kind === 'circle'); game.player.pos.set(c.def.x, 0, c.def.z); game.lastGood = null; S.start(c); c.prog = 29.9; });
await A.waitForTimeout(1500);
await A.evaluate(() => { const S = game.seals, a = S.list.find((x) => x.def.kind === 'altar'); for (const sp of a.def.effigies) sp.enemy.die(); });
await A.waitForTimeout(2500);
console.log('seals', JSON.stringify(await every(() => { const S = game.seals, g = game.world.gates[S.enc.gateIn]; return { broken: S.broken, states: S.list.map((x) => x.state[0]).join(''), sealed: S.enc.sealed, open: g.open, walk: game.world.walkable(g.x, g.z, 0.4) }; })));
// each player walks through the door toward the arena
const walked = await every(async () => {
  const g = game, enc = g.seals.enc, gate = g.world.gates[enc.gateIn], A = enc.arena, p = g.player;
  const dx = A.x - gate.x, dz = A.z - gate.z, L = Math.hypot(dx, dz);
  p.pos.set(gate.x - dx / L * 3, 0, gate.z - dz / L * 3); g.lastGood = null; p.setState('move');
  g.input.move = () => ({ x: dx / L, y: dz / L });
  const d0 = Math.hypot(p.pos.x - A.x, p.pos.z - A.z);
  for (let i = 0; i < 90; i++) { p.yaw = Math.atan2(dx, dz); p.vel?.set(dx / L * 4, 0, dz / L * 4); p.move(dx / L * 4 / 60, dz / L * 4 / 60); }
  return { before: +d0.toFixed(1), after: +Math.hypot(p.pos.x - A.x, p.pos.z - A.z).toFixed(1) };
});
console.log('walk through', JSON.stringify(walked));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
