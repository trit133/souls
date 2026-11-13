// The party tab (partytab.js): in a room, the lobby's Sanctum button goes back to the hideout and the tab shows
// top right under the gold (party, chat, Lobby button back); chat crosses between players; in a party raid the
// chat shows bottom left and Enter opens the box (typing doesn't move you). Screenshots /tmp/look/ptab-*.png.
// node scripts/partychat.mjs [url with ?server=]  (a build served on :4173 and a room server, e.g. PORT=4199 DB_PATH=:memory:)
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
const box = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }, sel);
const overlap = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;

const A = await device('A'), B = await device('B');
const u = 'p' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');
check(!(await vis(A, '#ptab')), 'no tab outside a room');
await A.click('#hm-party'); await A.click('#lobby-create'); await A.waitForTimeout(400);
const code = await A.textContent('#lobby-code');
await B.click('#hm-party'); await B.fill('#lobby-input', code); await B.click('#lobby-joinbtn'); await A.waitForTimeout(400);
check(await vis(A, '#lobby-home'), 'lobby has a Sanctum button in a room');

// back to the Sanctum, still in the room
await A.click('#lobby-home'); await A.waitForTimeout(300);
await A.evaluate(() => game.hermitage.setGuide(false)); // (open by itself the first time)
const fps = await A.evaluate(() => new Promise((ok) => { let n = 0; const t0 = performance.now(); const f = () => (++n < 10 ? requestAnimationFrame(f) : ok(Math.round(10000 / (performance.now() - t0)))); requestAnimationFrame(f); }));
console.log('fps', fps); await A.waitForTimeout(300);
check(!(await vis(A, '#lobby')) && await vis(A, '#hermitage'), 'Sanctum shows, lobby closed');
check(await vis(A, '#ptab'), 'party tab shows in the Sanctum');
check(await A.evaluate(() => game.mp.code) === code, 'still in the room');
check(!overlap(await box(A, '#ptab'), await box(A, '#hm-gold')), "tab doesn't cover the gold");
check((await A.textContent('#pt-members')).split('Templar').length - 1 === 2, 'tab lists both players');
await A.screenshot({ path: '/tmp/look/ptab-sanctum.png' });

// chat both ways: the tab (A) and the lobby (B)
await A.fill('#pt-input', 'hello from the sanctum'); await A.press('#pt-input', 'Enter'); await A.waitForTimeout(300);
check((await B.textContent('#chat-log')).includes('hello from the sanctum'), 'tab message reaches the lobby');
await B.fill('#chat-input', 'hi back'); await B.press('#chat-input', 'Enter'); await A.waitForTimeout(300);
check((await A.textContent('#pt-log')).includes('hi back'), 'lobby message reaches the tab');

// a side panel folds the tab; a message while folded counts as new
await A.evaluate(() => game.hermitage.setStash(true)); await A.waitForTimeout(700);
check(await vis(A, '#ptab') && !(await vis(A, '#pt-log')), 'stash open: tab folds to its header');
check(!overlap(await box(A, '#ptab'), await box(A, '#hm-stash')), "stash sits below the tab");
await B.fill('#chat-input', 'psst'); await B.press('#chat-input', 'Enter'); await A.waitForTimeout(300);
check((await A.textContent('#pt-unread')).includes('1 new'), 'unread count while folded');
await A.screenshot({ path: '/tmp/look/ptab-folded.png' });
await A.evaluate(() => game.hermitage.setStash(false)); await A.waitForTimeout(700);

// switching character in the Sanctum tells the room
await A.evaluate(() => game.hermitage.setKind('rogue')); await A.waitForTimeout(400);
check((await B.evaluate(() => game.mp.members.find((m) => m.id !== game.mp.id).kind)) === 'rogue', 'character change reaches the party');
await A.evaluate(() => game.hermitage.setKind('knight')); await A.waitForTimeout(300);

// Solo Raid in a room doesn't start one
await A.click('#hm-solo'); await A.waitForTimeout(200);
check(await A.evaluate(() => game.mode) === 'title' && (await A.textContent('#pt-log')).includes('Leave the party'), 'Solo Raid blocked in a room');
await A.keyboard.press('Escape');

// the Lobby button goes back
await A.click('#pt-lobby'); await A.waitForTimeout(200);
check(await vis(A, '#lobby') && !(await vis(A, '#ptab')), 'Lobby button reopens the lobby, tab hides');

// B goes to the Sanctum, then the host starts: B is pulled into the raid
await B.click('#lobby-home'); await B.waitForTimeout(200);
await A.click('#lobby-start'); await A.waitForTimeout(2000);
check(await B.evaluate(() => game.mode) === 'play' && !(await B.evaluate(() => game.hermitage.active)), 'guest in the Sanctum joins the raid');

// raid chat: Enter opens, typing doesn't move, Enter sends and closes
check(await vis(A, '#ptab') && !(await vis(A, '#pt-form')), 'raid: chat lines show, box closed');
await A.evaluate(() => { game.player.pos.set(game.world.start.x, 0, game.world.start.z); });
const p0 = await A.evaluate(() => [game.player.pos.x, game.player.pos.z]);
await A.keyboard.press('Enter'); await A.waitForTimeout(150);
check(await A.evaluate(() => document.activeElement?.id) === 'pt-input', 'raid: Enter opens the box');
await A.keyboard.down('w'); await A.waitForTimeout(400); await A.keyboard.up('w');
await A.keyboard.type('sdwasd go'); await A.waitForTimeout(100);
const p1 = await A.evaluate(() => [game.player.pos.x, game.player.pos.z]);
check(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.05, "raid: typing doesn't move you");
await A.screenshot({ path: '/tmp/look/ptab-raid-typing.png' });
await A.keyboard.press('Enter'); await A.waitForTimeout(300);
check(await A.evaluate(() => document.activeElement?.id) !== 'pt-input' && !(await vis(A, '#pt-form')), 'raid: Enter sends and closes');
check((await B.textContent('#pt-log')).includes('wsdwasd go'), 'raid: message reaches the teammate');
check(await vis(B, '#pt-log .chat-line:last-child'), 'raid: new line visible to the teammate');
await B.screenshot({ path: '/tmp/look/ptab-raid.png' });
await A.keyboard.press('Escape'); await A.waitForTimeout(900);
check(!(await vis(A, '#ptab')), 'raid: chat hides under the pause menu');

console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
console.log(fails.length ? `${fails.length} FAILED` : 'ALL OK');
await b.close();
process.exit(fails.length || errs.length ? 1 : 0);
