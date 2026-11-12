// Travel nodes and the tree's prices on a signed-in account: buy a path, pick stats, change a pick, the centre
// getting dearer, refunds, the stats panel. Screenshots /tmp/look/tree-<kind>.png (whole tree) and tree-pick.png.
// node scripts/tree-travel.mjs [url with ?server=]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2];
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(async () => { const A = game.accounts; await A.signUp('tt' + Date.now().toString(36).slice(-6), 'pw123456').catch((e) => console.log(e.message)); });
await page.waitForTimeout(400);
const out = await page.evaluate(() => ({ user: !!game.accounts.user }));
for (const kind of ['knight', 'rogue', 'mage']) {
  await page.evaluate((k) => { game.toTitle(); const d = game.accounts.data; if (d) { d.upgrades = { ...(d.upgrades || {}), mage: 1 }; d.gold = 0; } game.treeUI.open(k); game.treeUI.fit(); game.treeUI.render(); }, kind);
  await page.waitForTimeout(400); await page.screenshot({ path: `/tmp/look/tree-${kind}.png` });
}
// buy along the knight's first spoke and into the centre; watch prices
out.buy = await page.evaluate(() => {
  const ui = game.treeUI, d = game.accounts.data; ui.kind = 'knight'; d.gold = 1e7; d.tree = { knight: [] }; d.treePick = {};
  const costs = [];
  for (const id of ['s1-1', 's1-2', 's1-3', 's1-4', 'l1-1', 'l1-2', 's1-5', 's1-6']) { const g = d.gold; ui.click(id); costs.push([id, g - d.gold, d.treePick.knight?.[id], !!ui.picking]); ui.picking = null; }
  return costs;
});
out.pick = await page.evaluate(() => {
  const ui = game.treeUI, d = game.accounts.data, { treeStats } = game.__tree || {};
  ui.click('s1-2'); const open = ui.picking; ui.pick('s1-2', 'dex'); ui.click('s1-3'); ui.pick('s1-3', 'int');
  return { open, picks: d.treePick.knight };
});
await page.evaluate(() => { const ui = game.treeUI; ui.view = { x: 30, y: 0, z: 3.2 }; ui.click('s1-4'); ui.applyView(); ui.showTip('s1-4'); });
await page.waitForTimeout(300); await page.screenshot({ path: '/tmp/look/tree-pick.png' });
out.stats = await page.evaluate(() => { game.treeUI.picking = null; game.start('knight'); const p = game.player; return { hp: p.maxHp, st: p.maxSt ?? p.maxStamina }; });
out.refund = await page.evaluate(() => {
  game.toTitle(); const ui = game.treeUI; ui.open('knight'); const d = game.accounts.data, g = d.gold;
  ui.resetting = true; ui.marked = new Set(['s1-1']); ui.confirmReset();
  return { back: d.gold - g, left: d.tree.knight.length, picksLeft: Object.keys(d.treePick.knight).length };
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(8), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
