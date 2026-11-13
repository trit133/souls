// Pings and the wheel (pings.js) in a party of two: tap G pings the ground under the cursor (an enemy there
// gets a red marker that follows it), the teammate sees it; hold G opens the wheel, release on a slice to
// emote (your character plays it, the teammate sees it and a bubble) or send an alert (party chat + bubble).
// Screenshots /tmp/look/ping-*.png.
// node scripts/pings.mjs [url with ?server=]  (a build served on :4173 and a room server, e.g. PORT=4199 DB_PATH=:memory:)
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
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && e.checkVisibility(); }, sel);

const A = await device('A'), B = await device('B');
const u = 'g' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');
for (const p of [A, B]) await p.evaluate(() => game.hermitage.setGuide(false));
await A.click('#hm-party'); await A.click('#lobby-create'); await A.waitForTimeout(400);
const code = await A.textContent('#lobby-code');
await B.click('#hm-party'); await B.fill('#lobby-input', code); await B.click('#lobby-joinbtn'); await A.waitForTimeout(400);
await A.click('#lobby-start'); await A.waitForTimeout(2500);
check(await A.evaluate(() => game.mode) === 'play' && await B.evaluate(() => game.mode) === 'play', 'party raid running');
// keep enemies out of it, and stand the two together
for (const p of [A, B]) await p.evaluate(() => { for (const e of game.enemiesAll()) e.update = () => {}; const s = game.world.start; game.player.pos.set(s.x, 0, s.z); game.player.hp = game.player.maxHp = 1e7; });
await A.waitForTimeout(800);

// tap G: the ground under the cursor
await A.mouse.move(600, 300);
await A.keyboard.down('g'); await A.keyboard.up('g'); await A.waitForTimeout(900);
const pa = await A.evaluate(() => game.pings.list.map((p) => ({ x: p.x, z: p.z, c: p.color, t: !!p.target })));
const pb = await B.evaluate(() => game.pings.list.map((p) => ({ x: p.x, z: p.z, c: p.color, t: !!p.target })));
console.log('pings', JSON.stringify(pa), JSON.stringify(pb));
check(pa.length === 1 && !pa[0].t, 'tap G: a ground ping here');
check(pb.length === 1 && Math.abs(pb[0].x - pa[0].x) < 0.05 && Math.abs(pb[0].z - pa[0].z) < 0.05 && pb[0].c === pa[0].c, 'teammate sees it in the same place and colour');
const side = await A.evaluate(() => { const p = game.pings.list[0], pl = game.player; return Math.sign(p.x - pl.pos.x); });
check(side > 0, 'ping lands right of the player (cursor right of centre)');
await A.screenshot({ path: '/tmp/look/ping-ground.png' });

// on an enemy: a red marker that follows it
const enemyScreen = await A.evaluate(() => {
  const pl = game.player, e = game.enemiesAll().filter((x) => x.alive).sort((a, b) => a.distTo(pl) - b.distTo(pl))[0];
  e.pos.set(pl.pos.x - 3, 0, pl.pos.z + 1);
  const v = e.pos.clone(); v.y = 0; v.project(game.camera);
  return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, id: e.netId };
});
await A.waitForTimeout(400);
await A.mouse.move(enemyScreen.x, enemyScreen.y);
await A.keyboard.down('g'); await A.keyboard.up('g'); await A.waitForTimeout(900);
const foe = await B.evaluate((id) => { const p = game.pings.list.at(-1); return { target: p.target?.netId, red: p.color === 0xff3a2a }; }, enemyScreen.id);
check(foe.target === enemyScreen.id && foe.red, 'enemy ping: red, on that enemy, for the teammate too');

// rate limit: 3 in 2 seconds
await A.waitForTimeout(2100);
const n0 = await A.evaluate(() => game.pings.list.length);
for (let i = 0; i < 5; i++) { await A.keyboard.down('g'); await A.keyboard.up('g'); await A.waitForTimeout(60); }
await A.waitForTimeout(300);
check(await A.evaluate(() => game.pings.list.length) - n0 === 3, 'no more than 3 pings in 2 seconds');

// hold G: the wheel; release on Wave
await A.waitForTimeout(2100);
await A.mouse.move(480, 300);
await A.keyboard.down('g'); await A.waitForTimeout(900);
check(await vis(A, '#pwheel'), 'hold G: the wheel opens');
const c = await A.evaluate(() => [game.pings.cx, game.pings.cy]);
const at = (i) => { const a = (i + 0.5) / 8 * Math.PI * 2; return [c[0] + Math.sin(a) * 100, c[1] - Math.cos(a) * 100]; };
await A.mouse.move(...at(7)); await A.waitForTimeout(700);
check((await A.textContent('#pwheel .pw-opt.on')) === 'Wave', 'pointing up-left picks Wave');
await A.screenshot({ path: '/tmp/look/ping-wheel.png' });
await A.keyboard.up('g'); await A.waitForTimeout(500);
check(!(await vis(A, '#pwheel')), 'release: wheel closes');
check(await A.evaluate(() => game.player.state) === 'emote', 'my character waves');
await B.waitForTimeout(300);
const seen = await B.evaluate(() => { const r = [...game.mp.peers.values()][0]; return { play: r.play?.def.label, bubble: [...document.querySelectorAll('.ping-bubble')].map((e) => e.textContent) }; });
check(seen.play === 'Wave' && seen.bubble.includes('o/'), 'teammate sees the wave and its bubble');
await B.screenshot({ path: '/tmp/look/ping-emote.png' });
// moving ends it
await A.keyboard.down('d'); await A.waitForTimeout(800); await A.keyboard.up('d');
check(await A.evaluate(() => game.player.state) !== 'emote', 'moving ends the emote');

// hold G and release in the middle: nothing
await A.mouse.move(480, 300);
await A.keyboard.down('g'); await A.waitForTimeout(900); await A.keyboard.up('g'); await A.waitForTimeout(400);
check(!(await vis(A, '#pwheel')) && await A.evaluate(() => game.player.state) === 'move', 'release in the middle cancels');

// an alert: I'm down! (slice 3, lower right) goes to chat with a bubble
await A.keyboard.down('g'); await A.waitForTimeout(900);
const c2 = await A.evaluate(() => [game.pings.cx, game.pings.cy]);
{ const a = 3.5 / 8 * Math.PI * 2; await A.mouse.move(c2[0] + Math.sin(a) * 100, c2[1] - Math.cos(a) * 100); }
await A.waitForTimeout(700); await A.keyboard.up('g'); await A.waitForTimeout(800);
check((await B.textContent('#pt-log')).includes("I'm down!"), "I'm down! reaches the party chat");
check(await B.evaluate(() => [...document.querySelectorAll('.ping-bubble')].some((e) => e.textContent === "I'm down!")), 'and shows over my head for them');
await B.screenshot({ path: '/tmp/look/ping-alert.png' });

// the keys typed into chat don't ping
await A.keyboard.press('Enter'); await A.waitForTimeout(400);
await A.evaluate(() => { window.__adds = 0; const f = game.pings.add.bind(game.pings); game.pings.add = (...a) => { window.__adds++; return f(...a); }; });
check(await A.evaluate(() => document.activeElement?.id) === 'pt-input', 'Enter opens chat');
await A.keyboard.type('gg'); await A.waitForTimeout(500);
check(await A.evaluate(() => window.__adds) === 0 && !(await vis(A, '#pwheel')), 'typing g in chat does not ping');
await A.keyboard.press('Escape');

console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
console.log(fails.length ? `${fails.length} FAILED` : 'ALL OK');
await b.close();
process.exit(fails.length || errs.length ? 1 : 0);
