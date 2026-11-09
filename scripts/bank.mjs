// Gold banked per cleared room (+ section bonus on boss kills) and ultrawide rendering.
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = `http://localhost:4173/?chain&server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
const dev = async (vp = { width: 900, height: 500 }) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(500); return p; };
const log = (k, v) => console.log(k.padEnd(16), JSON.stringify(v));
const A = await dev(), u = 'bk' + Date.now() % 100000;
await A.click('#btn-herm'); await A.fill('#acct-user', u); await A.fill('#acct-pass', 'secret123'); await A.click('#acct-signup'); await A.waitForTimeout(700);
log('run', await A.evaluate(async () => {
  game.loop = () => {}; game.audio.play = () => {}; game.audio.remote = () => {};
  const out = {}, acc = game.accounts.data, step = (n) => { for (let i = 0; i < n; i++) game.step(1 / 60, 1 / 60); };
  game.start('knight'); game.audio.play = () => {};
  game.buildRun(['camp', 'ruins', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss']);
  const g0 = acc.gold;
  const room0 = game.enemies.filter((e) => e.mod === 0), worth = room0.reduce((s, e) => s + (e.type === 'brute' ? 3 : 1), 0);
  room0.slice(0, -1).forEach((e) => e.die()); step(2);
  out.beforeLastKill = acc.gold - g0;
  room0.at(-1).die(); step(2);
  out.room1Banked = [acc.gold - g0, worth];
  out.hud = document.getElementById('run-gold').textContent;
  game.enemies.filter((e) => e.mod === 1).forEach((e) => e.die()); step(2);
  const afterRooms = acc.gold - g0;
  const mini = (i) => { const e = game.encounters.filter((x) => x.kind === 'mini')[i]; e.active = true; e.boss.setState('neutral'); e.boss.die(); };
  mini(0); step(2);
  out.mini1 = acc.gold - g0 - afterRooms;           // 15, no bonus (×1)
  const before2 = acc.gold;
  game.enemies.filter((e) => e.mod === 3).forEach((e) => e.die()); step(2);
  const room3 = acc.gold - before2;
  mini(1); step(2);
  out.mini2 = { roomCoins: room3, paid: acc.gold - before2 - room3, expected: 20 + Math.ceil((room3 + 20) * 0.5) };
  await new Promise((r) => setTimeout(r, 4000));
  out.rewardHasCashout = !document.getElementById('cashout').classList.contains('hidden');
  const kept = acc.gold;
  const p = game.player; p.setState('move'); p.receive({ dmg: 1e9, srcPos: p.pos.clone().add({ x: 0, y: 0, z: 1 }), knock: 'light' });
  out.afterDeathSame = acc.gold === kept;
  out.runBanked = game.runBanked;
  return out;
}));
await A.waitForTimeout(4200);
log('death screen', (await A.textContent('#gameover-stats')).slice(0, 60));
const gNow = await A.evaluate(() => game.accounts.data.gold);
await A.reload(); await A.waitForTimeout(900);
log('after reload', [await A.evaluate(() => game.accounts.data.gold), gNow]);

// ultrawide: the scene renders at ~270 game pixels tall (whole-number upscale); 32:9 keeps a 2.4:1 view
for (const [w, h] of [[1920, 1080], [2560, 1080], [3440, 1440], [5120, 1440]]) {
  const P = await dev({ width: w, height: h });
  const r = await P.evaluate(() => { const s = game.pixel.size; return { game: s.x + 'x' + s.y, scale: game.pixel.scale, pr: +game.renderer.getPixelRatio().toFixed(2), fov: +game.camera.fov.toFixed(1), hfov: +(2 * Math.atan(Math.tan(game.camera.fov * Math.PI / 360) * game.camera.aspect) * 180 / Math.PI).toFixed(1), aa: game.renderer.getContext().getContextAttributes().antialias }; });
  log(`${w}x${h}`, r);
  if (w === 3440) {
    for (const q of ['chunky', 'fine']) {
      await P.evaluate(() => game.hermitage.active && game.hermitage.close()).then(() => P.click('#btn-settings')); await P.selectOption('#set-quality', q); await P.waitForTimeout(100); await P.click('#set-back');
      log(' ' + q, await P.evaluate(() => game.pixel.size.x + 'x' + game.pixel.size.y));
    }
    await P.evaluate(() => game.hermitage.active && game.hermitage.close()).then(() => P.click('#btn-settings')); await P.selectOption('#set-quality', 'medium');
    await P.click('#set-back'); await P.evaluate(() => game.start('knight')); await P.waitForTimeout(700);
    await P.screenshot({ path: '.shots/ultrawide.png' });
  }
  await P.context().close();
}
if (errs.length) { console.log('ERRORS', errs.slice(0, 4)); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
