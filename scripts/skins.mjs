// The customizer: emeralds from kills (2 for a boss), the one-time move from the old skins (kills -> emeralds,
// unlocked skins -> pieces and colours, the equipped skin -> outfit 1), buying and wearing pieces and colours,
// the 3 outfits, the outfit in a run and in the multiplayer roster.
// node scripts/skins.mjs "<url with ?server=>"
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
const user = 'sk' + Date.now().toString().slice(-6);
await page.click('#btn-acct'); await page.fill('#acct-user', user); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(600);
const out = {};
// an old account: 520 knight kills with the Paladin equipped, 120 rogue kills -> emeralds and pieces once
out.migrate = await page.evaluate(() => {
  const d = game.accounts.data;
  Object.assign(d, { kills: { knight: 520, rogue: 120 }, skins: { knight: 'paladin' }, emeralds: undefined, cosmetics: undefined, outfits: undefined, cosmeticsV1: undefined });
  game.refreshTitle(); const e1 = d.emeralds; game.refreshTitle();
  return { emeralds: e1, again: d.emeralds, colors: d.cosmetics.colors, pieces: d.cosmetics.pieces, outfit1: d.outfits.knight.slots[0].pieces };
});
// kills: a grunt is 1 emerald, a boss 2
out.kills = await page.evaluate(() => {
  game.start('knight'); game.audio.play = () => {};
  const d = game.accounts.data, e0 = d.emeralds;
  const g = game.enemies.find((e) => e.type === 'grunt'); g.lastHitBy = game.player; g.die();
  const e1 = d.emeralds;
  const boss = game.bosses[0]; boss.lastHitBy = game.player; game.onBossDeath(boss);
  return { grunt: e1 - e0, boss: d.emeralds - e1 };
});
await page.evaluate(() => game.toTitle()); await page.waitForTimeout(300);
// the screen: try on a piece you don't own, buy it, it is worn; colours the same; outfits switch
await page.evaluate(() => { game.accounts.data.emeralds = 500; game.accounts.data.outfits.knight.slots[0] = { pieces: {}, colors: {} }; });
await page.click('#btn-skins'); await page.waitForTimeout(500);
await page.click('[data-skin-kind="knight"]'); await page.click('#cz-slots button:nth-child(1)'); await page.click('.cz-piece:nth-child(2)'); await page.waitForTimeout(150);
out.trying = await page.evaluate(() => ({ buy: document.getElementById('cz-buy').textContent, hidden: document.getElementById('cz-buy').classList.contains('hidden'), worn: game.equippedOutfit('knight').helmet.piece }));
await page.click('#cz-buy'); await page.waitForTimeout(150);
out.bought = await page.evaluate(() => ({ emeralds: game.accounts.data.emeralds, worn: game.equippedOutfit('knight').helmet.piece }));
await page.click('#cz-colors .cz-crow:nth-child(1) .cz-swatch:nth-child(11)'); await page.click('#cz-buy'); await page.waitForTimeout(150); // teal main (not owned yet)
out.color = await page.evaluate(() => ({ emeralds: game.accounts.data.emeralds, helmet: game.equippedOutfit('knight').helmet }));
await page.click('[data-outfit="1"]'); await page.waitForTimeout(150);
out.outfit2 = await page.evaluate(() => ({ active: game.accounts.data.outfits.knight.active, helmet: game.equippedOutfit('knight').helmet }));
await page.click('[data-outfit="0"]'); await page.waitForTimeout(150);
// can't buy what you can't afford
await page.evaluate(() => { game.accounts.data.emeralds = 10; }); await page.click('#cz-colors .cz-crow:nth-child(1) .cz-swatch:nth-child(12)'); await page.waitForTimeout(150); // royal blue, not owned
out.poor = await page.evaluate(() => ({ disabled: document.getElementById('cz-buy').disabled }));
await page.click('#skins-back'); await page.waitForTimeout(200);
// a run wears it; the roster carries it; a teammate's model is built from it
out.inRun = await page.evaluate(async () => {
  game.start('knight');
  const wire = game.mp.wire('knight');
  return { helmet: game.player.outfit.helmet, wire };
});
out.reload = await page.evaluate(async () => { await game.accounts.save?.(); return game.accounts.data.cosmetics.pieces.includes('knight.helmet.barbute'); });
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(9), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
