// Skill trees: old-upgrade refund, buy rules and prices, stats in a run, evolution, tooltip; screenshots.
// node scripts/tree.mjs "<url with ?server=>"  -> /tmp/look/tree-<kind>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
await page.click('#btn-acct'); await page.fill('#acct-user', 'tr' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(600);
const out = {};
// 1) an account from the old shop: dmg 3, hp 2, flask 1, evo_knight, Spellsword unlocked -> refund once
out.refund = await page.evaluate(() => {
  const d = game.accounts.data;
  d.gold = 5; d.upgrades = { dmg: 3, hp: 2, flask: 1, evo_knight: 1, mage: 1 }; delete d.treeMigrated;
  game.refreshTitle(); const g1 = d.gold; game.refreshTitle();
  return { gold: g1, again: d.gold, mageKept: !!d.upgrades.mage, oldGone: !d.upgrades.dmg, expected: 5 + (10 + 15 + 23) + (10 + 15) + 10 + 75 };
});
// 2) buy rules
await page.click('#btn-shop'); await page.waitForTimeout(400);
out.rules = await page.evaluate(() => {
  const ui = game.treeUI, d = game.accounts.data; d.gold = 100;
  ui.kind = 'knight'; ui.render();
  ui.buy('s0-3'); const far = (d.tree?.knight || []).length;
  ui.buy('s0-1'); const near = d.tree.knight.slice(); const gold1 = d.gold;
  ui.buy('s0-2');
  return { farRefused: far === 0, bought: near, cost1: 100 - gold1, after2: d.tree.knight, gold: d.gold };
});
// tooltip on hover
const box = await page.locator('[data-node="s0-3"]').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(150);
out.tip = await page.evaluate(() => document.getElementById('tree-tip').innerText.replace(/\n/g, ' | '));
// screenshots, with part of each tree owned so the paths show
for (const kind of ['knight', 'rogue', 'mage']) {
  await page.evaluate((kind) => {
    const ui = game.treeUI, d = game.accounts.data; d.gold = 99999; ui.kind = kind; ui.sel = null; ui.fit();
    const T = ui.tree; let n = 0;
    for (let pass = 0; pass < 8 && n < 18; pass++) for (const id of T.nodes.keys()) if (n < 18 && /^s[01]-|^l0-|^b0-/.test(id)) { const before = (d.tree?.[kind] || []).length; ui.buy(id); if ((d.tree?.[kind] || []).length > before) n++; }
    ui.render(); ui.hideTip();
  }, kind);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `/tmp/look/tree-${kind}.png` });
}
// 3) a whole knight tree, in a run
out.run = await page.evaluate(() => {
  const ui = game.treeUI, d = game.accounts.data; d.gold = 999999; ui.kind = 'knight';
  for (let pass = 0; pass < 20; pass++) for (const id of ui.tree.nodes.keys()) ui.buy(id);
  game.treeUI.close();
  game.start('knight'); const p = game.player;
  return { owned: d.tree.knight.length, of: ui.tree.nodes.size - 1, maxHp: p.maxHp, maxSt: p.maxSt, flasks: p.maxFlasks, dmgMul: +p.dmgMul.toFixed(2), flat: p.flatDmg, evolved: p.evolved, dr: p.tree.dr, chargeCd: 20 - (p.tree.chargeCd || 0) };
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(7), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
