// Night Raid: locked until the account has beaten a run's second mini boss, then a toggle on the character select;
// a night run is dark with a light cone per player, enemies and bosses are tougher (health, damage, speed, shorter
// gaps, watchers every 5 s), half of all gold drops are doubled and boss drops double. Screenshots in /tmp/night-*.png.
// node scripts/night.mjs [url with ?server=]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/?server=' + encodeURIComponent('http://127.0.0.1:4111');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
const user = 'nr' + Date.now().toString().slice(-6);
await page.click('#btn-herm'); await page.fill('#acct-user', user); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(600);
const out = {};
out.locked = await page.evaluate(() => ({ unlocked: game.nightUnlocked, toggleHidden: document.getElementById('hm-night').classList.contains('hidden') }));
// beat two mini bosses in a run: unlocked
out.unlock = await page.evaluate(() => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.start('knight');
  for (const enc of g.encounters.slice(0, 1)) { g.onBossDeath(enc.boss); }
  const after1 = !!g.accounts.data.nightRaid;
  g.enterAct(1); g.onBossDeath(g.encounters[0].boss);
  g.toTitle();
  return { after1, after2: !!g.accounts.data.nightRaid, toggleHidden: document.getElementById('hm-night').classList.contains('hidden') };
});
await page.click('#hm-solo'); await page.waitForTimeout(150); await page.click('#hm-night'); await page.waitForTimeout(100);
out.toggle = await page.evaluate(() => ({ on: game.nightRaid, layout: game.newLayout(), cls: document.getElementById('hm-night').classList.contains('on') }));
// a night run against a day run with the same seed
out.compare = await page.evaluate(() => {
  const g = game, stat = () => { const e = g.enemies.find((x) => x.type === 'grunt' && !x.elite); const B = g.world.dungeon.enc.boss; return { gruntHp: e.maxHp, dmg: +e.dmgScale.toFixed(2), spd: +e.spdScale.toFixed(2), gap: +e.gapScale.toFixed(2), watch: e.watchGap().toFixed(1), aggro: e.aggroMul, bossHp: B.maxHp, bossDmg: +B.dmgScale.toFixed(2), hemi: g.hemi.intensity, lights: g.nightLights ? g.nightLights.length : 0 }; };
  g.buildRun('dungeon', 99, 1); const day = stat();
  g.buildRun('night', 99, 1); const night = stat();
  return { day, night };
});
// gold: about half the drops doubled; boss drop doubled
out.gold = await page.evaluate(() => {
  const g = game; g.start('knight');
  const p = g.player; const drops = [];
  for (const e of g.enemies.filter((x) => x.type === 'brute' || x.elite).slice(0, 0)) e.die();
  // count what kills put in the pots over many grunts
  const base = { ...g.roomGold }; let sum = 0, n = 0;
  for (let k = 0; k < 400; k++) { const e = g.enemies[k % g.enemies.length]; const before = g.accounts.data.gold; e.alive = true; e.die(); const got = g.accounts.data.gold - before; if (!e.elite && e.type !== 'brute' && !e.effigy) { sum += got; n++; drops.push(got); } }
  const enc = g.world.dungeon.enc; const pay = g.bossPayout(enc);
  return { night: g.night, avgGoldPerRegular: +(sum / n).toFixed(2), doubled: drops.filter((d) => d === 30).length, plain: drops.filter((d) => d === 15).length, bossDrop: pay.drop };
});
// screenshots: the start, and a room with enemies in it (after the test's boss kills have finished their fanfare)
await page.waitForTimeout(4000);
await page.evaluate(() => { const g = game; g.start('knight'); g.player.hp = g.player.maxHp = 1e6; for (let i = 0; i < 60; i++) g.step(1 / 60, 1 / 60); g.ui.toast('', 0); g.pixel.render(g.scene, g.camera); });
await page.screenshot({ path: '/tmp/night-start.png' });
await page.evaluate(() => {
  const g = game, c = g.world.dungeon.cells.find((c) => c.kind === 'room' && g.enemies.some((e) => e.alive && e.mod === c.mod.i));
  for (const e of g.enemies) e.cd = 99;
  g.player.pos.set(c.cx, 0, c.cz + 6); g.player.yaw = Math.PI; g.lastGood = null; g.camPos.set(c.cx, 14, c.cz + 18);
  for (let i = 0; i < 50; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera);
});
await page.screenshot({ path: '/tmp/night-room.png' });
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(8), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
