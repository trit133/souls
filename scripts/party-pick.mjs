// A party's host picks where to raid: Start in the lobby opens the world map over it (the guest is told the host is
// choosing); Back returns to the lobby; picking the region and an area the host has the gems for and Deploy puts the
// whole party in that area. After the raid, once everyone's ready, the map opens for the host again.
// node scripts/party-pick.mjs [url with ?server=]  (a dev server on :5181 and a room server:
// cd server && PORT=4196 DB_PATH=:memory: node index.js)
import { chromium } from 'playwright';
const URL = process.argv[2] || `http://localhost:5181/?server=${encodeURIComponent('http://127.0.0.1:4196')}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [], fails = [];
const device = async (n) => {
  const page = await (await b.newContext({ viewport: { width: 1100, height: 640 } })).newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  await page.goto(URL); await page.waitForTimeout(600);
  return page;
};
const auth = async (p, u) => { await p.click('#btn-herm'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
const A = await device('A'), B = await device('B');
const u = 'p' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');
for (const p of [A, B]) await p.evaluate(() => game.hermitage.setGuide(false));
await A.evaluate(() => { game.accounts.data.gems = { gem_hask: 1 }; }); // (the host can take the Sump Lines)
await A.click('#hm-party'); await A.click('#lobby-create'); await A.waitForTimeout(400);
const code = await A.textContent('#lobby-code');
await B.click('#hm-party'); await B.fill('#lobby-input', code); await B.click('#lobby-joinbtn'); await A.waitForTimeout(500);

await A.click('#lobby-start'); await A.waitForTimeout(600);
const map = await A.evaluate(() => ({ shown: !document.getElementById('worldmap').classList.contains('hidden'), mode: game.mode, top: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#worldmap') != null }));
check(map.shown && map.top && map.mode !== 'play', 'Start: the host gets the world map, on top of the lobby, no raid yet');
check(/choosing where to raid/.test(await B.textContent('#lobby-wait')), 'the guest is told the host is choosing');
await A.click('#wm-back'); await A.waitForTimeout(300);
check(await A.evaluate(() => document.getElementById('worldmap').classList.contains('hidden') && game.mode !== 'play'), 'Back: the map closes, still in the lobby');
check(/Waiting for the host/.test(await B.textContent('#lobby-wait')), 'the guest sees the host stopped choosing');

await A.click('#lobby-start'); await A.waitForTimeout(500);
await A.evaluate(() => [...document.querySelectorAll('.wm-pin')].find((p) => p.textContent.includes('Shattered March')).click()); await A.waitForTimeout(400);
await A.evaluate(() => [...document.querySelectorAll('.wm-pin')].find((p) => p.textContent.includes('Sump Lines')).click()); await A.waitForTimeout(200);
await A.click('#wm-go'); await A.waitForTimeout(3500);
const where = [await A.evaluate(() => [game.mode, game.world.dungeon?.def.name]), await B.evaluate(() => [game.mode, game.world.dungeon?.def.name])];
console.log(JSON.stringify(where));
check(where.every(([m, n]) => m === 'play' && n === 'The Sump Lines'), 'Deploy: the whole party is in the area the host picked');

// after the raid: everyone ready, the host gets the map again
// (both click Ready Up on the end screen)
await A.evaluate(() => game.mp.setReady()); await B.evaluate(() => game.mp.setReady()); await A.waitForTimeout(800);
check(await A.evaluate(() => !document.getElementById('worldmap').classList.contains('hidden')), 'everyone ready again: the host picks the next area');
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
console.log(fails.length ? `${fails.length} FAILED` : 'all passed');
