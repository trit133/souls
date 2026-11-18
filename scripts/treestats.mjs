// The skill tree's stats panel is a toggle on every screen (closed at first, its Stats button opens and closes it, the
// choice remembered), and nowhere in the game does a right click, a long press, a text selection or a drag bring up the
// browser's own menus or side panels, except in text boxes. Pictures: /tmp/look/treestats-*.png
// node scripts/treestats.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = {};
for (const [w, h, tag] of [[1280, 720, 'desk'], [844, 390, 'phone']]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto(process.argv[2] || 'http://localhost:5180/'); await page.waitForTimeout(800);
  await page.evaluate(() => game.treeUI.open('knight')); await page.waitForTimeout(500);
  const shown = () => page.evaluate(() => getComputedStyle(document.getElementById('tree-stats')).display !== 'none');
  const r = { atFirst: await shown(), button: await page.isVisible('#tree-stats-btn') };
  await page.screenshot({ path: `/tmp/look/treestats-${tag}-closed.png` });
  await page.click('#tree-stats-btn'); r.afterClick = await shown();
  await page.screenshot({ path: `/tmp/look/treestats-${tag}-open.png` });
  await page.reload(); await page.waitForTimeout(800); await page.evaluate(() => game.treeUI.open('knight')); await page.waitForTimeout(300);
  r.remembered = await shown();
  await page.click('#tree-stats-btn'); r.closedAgain = await shown();
  r.blocked = await page.evaluate(() => {
    const fire = (el, type) => { const e = new MouseEvent(type, { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; };
    const sv = document.getElementById('tree-svg'), inp = document.getElementById('tree-search-input');
    return { treeMenu: fire(sv, 'contextmenu'), treeSelect: fire(sv, 'selectstart'), treeDrag: fire(sv, 'dragstart'), searchMenu: fire(inp, 'contextmenu'), bodyMenu: fire(document.body, 'contextmenu') };
  });
  out[tag] = r; await page.close();
}
for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v));
const ok = Object.values(out).every((r) => !r.atFirst && r.button && r.afterClick && r.remembered && !r.closedAgain && r.blocked.treeMenu && r.blocked.treeSelect && r.blocked.treeDrag && !r.blocked.searchMenu && r.blocked.bodyMenu);
console.log(ok ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok ? 0 : 1);
