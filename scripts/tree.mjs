// Skill trees: old-upgrade refund, buy rules and prices, stats in a run, evolution, tooltip; screenshots.
// node scripts/tree.mjs "<url with ?server=>"  -> /tmp/look/tree-<kind>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4173/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
await page.click('#btn-herm'); await page.fill('#acct-user', 'tr' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(600);
const out = {};
// 1) an account from the old shop: dmg 3, hp 2, flask 1, evo_knight, Spellsword unlocked -> refund once
out.refund = await page.evaluate(() => {
  const d = game.accounts.data;
  d.gold = 5; d.upgrades = { dmg: 3, hp: 2, flask: 1, evo_knight: 1, mage: 1 }; delete d.treeMigrated;
  game.refreshTitle(); const g1 = d.gold; game.refreshTitle();
  return { gold: g1, again: d.gold, mageKept: !!d.upgrades.mage, oldGone: !d.upgrades.dmg, expected: 5 + (10 + 15 + 23) + (10 + 15) + 10 + 75 };
});
// 1b) trees bought on the old 80-node layout come back at what they cost: s0-1..s0-6 (8+10+12+15+18+75) + knight socket s1-10 (44*1.5)
// 1g) trees bought on the 180-node, 20-ring layout (v6): exact recorded prices (s0-7 80, s0-15 250, a ring-10 socket)
out.refundV6 = await page.evaluate(() => {
  const d = game.accounts.data; d.gold = 0; d.tree = { knight: ['s0-1', 's0-2', 's0-6', 's0-7', 's0-15'] }; d.treeV = 6;
  game.refreshTitle(); const g = d.gold; game.refreshTitle();
  return { gold: g, again: d.gold, expected: 10 + 14 + 150 + 80 + 250, cleared: JSON.stringify(d.tree) };
});
// 1f) trees bought on the first 20-ring layout (v5): exact recorded prices
out.refundV5 = await page.evaluate(async () => {
  const { COST_V5 } = await import('/src/treecost-v5.js').catch(() => ({ COST_V5: null }));
  const d = game.accounts.data; d.gold = 0; d.tree = { rogue: ['s0-1', 's0-2', 's0-6'] }; d.treeV = 5;
  game.refreshTitle(); const g = d.gold; game.refreshTitle();
  return { gold: g, again: d.gold, expected: 10 + 14 + 150, cleared: JSON.stringify(d.tree) };
});
// 1e) trees bought on the 15-ring 180-node layout (v4): 10..350 by ring, evolution 150, sockets 300, ring-10 links 200
out.refundV4 = await page.evaluate(() => {
  const d = game.accounts.data; d.gold = 0; d.tree = { knight: ['s0-1', 's0-2', 's0-6', 'r1', 'ra2', 'f0-12-0-1'] }; d.treeV = 4;
  game.refreshTitle(); const g = d.gold; game.refreshTitle();
  return { gold: g, again: d.gold, expected: 10 + 15 + 150 + 300 + 200 + 300, cleared: JSON.stringify(d.tree) };
});
// 1d) trees bought on the 120-node socket-triangle layout (v3): old prices, sockets 120, ring-10 links 80
out.refundV3 = await page.evaluate(() => {
  const d = game.accounts.data; d.gold = 0; d.tree = { mage: ['s0-1', 's0-2', 's0-6', 'r0', 'ra1'] }; d.treeV = 3;
  game.refreshTitle(); const g = d.gold; game.refreshTitle();
  return { gold: g, again: d.gold, expected: 10 + 13 + 75 + 120 + 80, cleared: JSON.stringify(d.tree) };
});
// 1c) trees bought on the 120-node layout (v2): rings priced 10..250, sockets on spokes at 1.5x
out.refundV2 = await page.evaluate(() => {
  const d = game.accounts.data; d.gold = 0; d.tree = { rogue: ['s0-1', 's0-2', 's0-6', 's2-10'] }; d.treeV = 2;
  game.refreshTitle(); const g = d.gold; game.refreshTitle();
  return { gold: g, again: d.gold, expected: 10 + 13 + 75 + 120, cleared: JSON.stringify(d.tree) };
});
out.refundV1 = await page.evaluate(() => {
  const d = game.accounts.data; d.gold = 0; d.tree = { knight: ['s0-1', 's0-2', 's0-3', 's0-4', 's0-5', 's0-6', 's1-10'] }; delete d.treeV;
  game.refreshTitle(); const g = d.gold; game.refreshTitle();
  return { gold: g, again: d.gold, expected: 8 + 10 + 12 + 15 + 18 + 75 + 66, cleared: JSON.stringify(d.tree) };
});
// 2) buy rules
await page.evaluate(() => game.treeUI.open()); await page.waitForTimeout(400);
out.rules = await page.evaluate(() => {
  const ui = game.treeUI, d = game.accounts.data; d.gold = 100;
  ui.kind = 'knight'; ui.render();
  d.gold = 200; ui.click('s0-3'); const far = (d.tree?.knight || []).length;
  ui.click('s0-1'); const near = d.tree.knight.slice(); const gold1 = d.gold;
  ui.click('s0-2'); ui.click('s0-3'); ui.click('s0-4');
  const owned4 = d.tree.knight.slice(), g4 = d.gold;
  // reset: marking s0-2 also takes s0-3 and s0-4, which it cuts off
  document.getElementById('tree-reset').click();
  ui.click('s0-2');
  const info = document.getElementById('tree-reset-info').textContent;
  document.getElementById('tree-reset-ok').click();
  return { farRefused: far === 0, oneClickBought: near, cost1: 200 - gold1, owned4, resetInfo: info, afterReset: d.tree.knight, refunded: d.gold - g4, expectRefund: 14 + 20 + 28 };
});
// tooltip follows the hover: node A, node B, empty space; clicking does not pin it
const center = async (id) => { const b = await page.locator(`[data-node="${id}"]`).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const tipNow = () => page.evaluate(() => { const t = document.getElementById('tree-tip'); return t.classList.contains('hidden') ? '(hidden)' : t.innerText.split('\n')[0]; });
const hov = {};
await page.mouse.move(...(await center('s0-3'))); await page.waitForTimeout(100); hov.overA = await tipNow();
await page.mouse.move(...(await center('s1-2'))); await page.waitForTimeout(100); hov.overB = await tipNow();
await page.mouse.move(5, 300); await page.waitForTimeout(100); hov.empty = await tipNow();
await page.mouse.click(...(await center('s1-1'))); await page.waitForTimeout(100); hov.afterClick = await tipNow();
await page.mouse.move(...(await center('s0-3'))); await page.waitForTimeout(100); hov.nextHover = await tipNow();
await page.mouse.move(5, 300); await page.waitForTimeout(100); hov.leftAgain = await tipNow();
out.tip = hov;
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
// 3) node limit: 70, then 100 once this character beats Varek (other trees stay at 70), 130 after section 2
out.cap = await page.evaluate(() => {
  const ui = game.treeUI, d = game.accounts.data; d.gold = 9999999; ui.kind = 'knight'; d.tree = {}; d.stats.winsBy = {};
  const fill = () => { for (let pass = 0; pass < 30; pass++) for (const id of ui.tree.nodes.keys()) ui.buy(id); return d.tree.knight.length; };
  const first = fill(), count = document.getElementById('tree-count').textContent;
  // Varek with the knight
  game.treeUI.close(); game.start('knight'); const enc = game.encounters.find((x) => x.kind === 'boss'); enc.active = true; enc.boss.setState('neutral'); enc.boss.die();
  ui.kind = 'knight'; ui.render(); const afterWin = fill();
  ui.kind = 'rogue'; d.tree.rogue = []; for (let pass = 0; pass < 30; pass++) for (const id of ui.tree.nodes.keys()) ui.buy(id);
  const rogue = d.tree.rogue.length;
  d.stats.section2WinsBy = { knight: 1 }; ui.kind = 'knight'; const late = fill();
  game.start('knight'); const p = game.player;
  return { first, count, winsBy: d.stats.winsBy, afterWin, rogueStill: rogue, afterSection2: late, maxHp: p.maxHp, maxSt: p.maxSt, dmgMul: +p.dmgMul.toFixed(2), flat: p.flatDmg, evolved: p.evolved };
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(7), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
