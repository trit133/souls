// Skins: kill counting per character, unlock at 100/250/500, the Skins screen, equipping, the skin in a run,
// the skin in the multiplayer roster; screenshots of every skin's preview.
// node scripts/skins.mjs "<url with ?server=>"  -> /tmp/look/skin-<kind>-<id>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
const user = 'sk' + Date.now().toString().slice(-6);
await page.click('#btn-acct'); await page.fill('#acct-user', user); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(600);
const out = {};
// kills: 99 -> the 100th unlocks Ember Guard
out.unlock = await page.evaluate(() => {
  game.start('knight'); game.audio.play = () => {};
  game.accounts.data.kills = { knight: 99 };
  let toast = ''; const t0 = game.ui.toast.bind(game.ui); game.ui.toast = (m, d) => { toast = m; t0(m, d); };
  const g = game.enemies.find((e) => e.type === 'grunt'); g.lastHitBy = game.player; g.die();
  return { kills: game.accounts.data.kills.knight, toast };
});
await page.evaluate(() => game.toTitle()); await page.waitForTimeout(300);
// the screen: progress text, equip, and locked ones refuse
await page.click('#btn-skins'); await page.waitForTimeout(500);
out.screen = await page.evaluate(() => [...document.querySelectorAll('#skin-list .skin')].map((el) => el.querySelector('.sprog').textContent + ' | ' + el.querySelector('button').textContent));
await page.click('#skin-list .skin:nth-child(2) button'); await page.waitForTimeout(200);
out.afterEquip = await page.evaluate(() => ({ saved: game.accounts.data.skins.knight, btn: document.querySelector('#skin-list .skin:nth-child(2) button').textContent, lockedDisabled: document.querySelector('#skin-list .skin:nth-child(4) button').disabled }));
// previews of every skin (unlock all for the pictures)
await page.evaluate(() => { game.accounts.data.kills = { knight: 500, rogue: 500, mage: 500 }; });
for (const kind of ['knight', 'rogue', 'mage']) {
  await page.click(`[data-skin-kind="${kind}"]`); await page.waitForTimeout(150);
  for (let i = 1; i <= 4; i++) {
    await page.click(`#skin-list .skin:nth-child(${i})`); await page.waitForTimeout(700);
    await page.locator('#skin-view').screenshot({ path: `/tmp/look/skin-${kind}-${i}.png` });
  }
}
await page.click('#skins-back'); await page.waitForTimeout(200);
// a run wears the equipped skin; a locked equip falls back to default
out.inRun = await page.evaluate(() => {
  game.start('knight'); const a = game.player.skin;
  game.accounts.data.skins.rogue = 'wraith'; game.accounts.data.kills.rogue = 10;
  game.start('rogue'); const b = game.player.skin;
  return { knight: a, rogueLockedWraith: b, wire: game.mp.wire('knight') };
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(11), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
