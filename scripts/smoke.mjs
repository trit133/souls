// Headless smoke test: loads the built game, plays scripted inputs, screenshots, reports errors.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const URL = process.argv[2] || 'http://localhost:4173/';
const OUT = '.shots';
mkdirSync(OUT, { recursive: true });
const errors = [];

async function run(name, ctxOpts, fn) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}\n${e.stack}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`); });
  await page.goto(URL);
  await page.waitForTimeout(800);
  await fn(page);
  await browser.close();
}

const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });
const hold = async (page, key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

await run('desktop', { viewport: { width: 1280, height: 720 } }, async (page) => {
  await shot(page, '00-title');
  await page.click('.char[data-char="knight"]');
  await page.waitForTimeout(1500);
  await shot(page, '01-start');
  await hold(page, 'KeyW', 1500);
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(180);
  await shot(page, '02-attack');
  await page.waitForTimeout(150); await page.keyboard.press('KeyJ'); await page.waitForTimeout(600);
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(250);
  await shot(page, '03-overhead');
  await page.waitForTimeout(500);
  await page.keyboard.down('KeyW'); await page.keyboard.press('Space'); await page.waitForTimeout(200);
  await shot(page, '04-roll');
  await page.keyboard.up('KeyW');
  // walk into the first grunt and fight a bit
  await hold(page, 'KeyW', 2200);
  await page.keyboard.press('Tab');
  for (let i = 0; i < 8; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(350); }
  await shot(page, '05-fight');
  const st = await page.evaluate(() => ({ p: [game.player.pos.x, game.player.pos.z, game.player.hp, game.player.state], e: game.enemies.map((e) => [e.type, e.state, Math.round(e.hp)]) }));
  console.log('desktop state', JSON.stringify(st));
  // teleport to camp and arena for screenshots
  await page.evaluate(() => { game.player.pos.set(0, 0, -30); });
  await page.waitForTimeout(1500);
  await shot(page, '06-camp');
  await page.evaluate(() => { for (const e of game.enemies) e.die(); game.player.pos.set(0, 0, -80); });
  await page.waitForTimeout(1200);
  await shot(page, '07-bonfire2');
  await hold(page, 'KeyF', 100);
  await page.waitForTimeout(500);
  await hold(page, 'KeyW', 2600);
  await page.waitForTimeout(2600);
  await shot(page, '08-boss-start');
  // let boss attack the player for a while; dodge occasionally
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(i % 3 ? 'KeyJ' : 'Space');
    await page.waitForTimeout(400);
    if (i === 6) await shot(page, '09-boss-fight');
  }
  const bs = await page.evaluate(() => ({ boss: [game.boss.state, Math.round(game.boss.hp), game.boss.atk?.def ? Object.keys(game.boss).length : 0], p: [game.player.hp, game.player.state] }));
  console.log('boss state', JSON.stringify(bs));
  // force phase 2
  await page.evaluate(() => { game.boss.hp = game.boss.maxHp * 0.5; game.player.hp = 9999; game.player.maxHp = 9999; });
  await page.waitForTimeout(4000);
  await shot(page, '10-phase2');
  // cycle through every boss move to make sure none throw
  for (const m of ['sweep', 'combo2', 'combo3', 'overhead', 'thrust', 'leap', 'spin', 'ember']) {
    await page.evaluate((m) => { const B = game.boss; B.atk = null; B.y = 0; B.lastMove = m; if (m === 'leap') game.player.pos.set(0, 0, -104); B.startAttack(game.bossMoves[m]); }, m);
    await page.waitForTimeout(m === 'leap' ? 1100 : 900);
    await shot(page, '12-move-' + m);
    await page.waitForTimeout(1800);
  }
  await page.waitForTimeout(2000);
  await page.evaluate(() => { game.boss.hp = 1; });
  for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(300); }
  await page.waitForTimeout(3500);
  await shot(page, '11-end');
  console.log('final', JSON.stringify(await page.evaluate(() => ({ boss: [game.boss.state, game.boss.hp], def: game.bossDefeated }))));
});

await run('iphone', { ...devices['iPhone 13 landscape'] }, async (page) => {
  await page.tap('.char[data-char="rogue"]');
  await page.waitForTimeout(1200);
  // drag the stick
  const cdp = await page.context().newCDPSession(page);
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await t('touchStart', [{ x: 120, y: 300, id: 1 }]);
  for (let i = 0; i < 10; i++) { await t('touchMove', [{ x: 120, y: 300 - i * 6, id: 1 }]); await page.waitForTimeout(30); }
  await page.waitForTimeout(800);
  await shot(page, '20-iphone-move');
  const box = await page.locator('#b-attack').boundingBox();
  await t('touchStart', [{ x: 120, y: 240, id: 1 }, { x: box.x + 30, y: box.y + 30, id: 2 }]);
  await page.waitForTimeout(100);
  await t('touchEnd', [{ x: 120, y: 240, id: 1 }]);
  await page.waitForTimeout(150);
  await shot(page, '21-iphone-attack');
  console.log('iphone', JSON.stringify(await page.evaluate(() => [game.player.pos.z.toFixed(2), game.player.state, game.input.isTouch])));
});

if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK no errors');
