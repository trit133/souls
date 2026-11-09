// The skill tree search box: typed words light up every node whose name or description has them all.
// Screenshot /tmp/tree-search.png. node scripts/treesearch.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(() => { game.toTitle(); game.treeUI.open('knight'); }); await page.waitForTimeout(600);
const count = async (q) => { await page.fill('#tree-search-input', q); return page.evaluate(() => ({ found: document.querySelectorAll('#tree-svg .tn.found').length, label: document.getElementById('tree-search-count').textContent })); };
const out = { crit: await count('critical'), fireRes: await count('fire resistance'), notable: await count('notable'), none: await count('zzz') };
out.critChance = await count('crit chance');
await page.fill('#tree-search-input', 'critical');
const keysBefore = await page.evaluate(() => game.input.keys?.size ?? 0);
await page.keyboard.type(' hit');
out.typedKeysReachGame = (await page.evaluate(() => game.input.keys?.size ?? 0)) !== keysBefore;
out.afterTyping = await page.evaluate(() => document.querySelectorAll('#tree-svg .tn.found').length);
await page.screenshot({ path: '/tmp/tree-search.png' });
await page.keyboard.press('Escape');
out.afterEsc = await page.evaluate(() => ({ value: document.getElementById('tree-search-input').value, found: document.querySelectorAll('#tree-svg .tn.found').length }));
// switching tabs keeps the search
await page.fill('#tree-search-input', 'frost'); await page.click('[data-tree-kind="mage"]').catch(() => {}); await page.waitForTimeout(300);
out.mageFrost = await page.evaluate(() => document.querySelectorAll('#tree-svg .tn.found').length);
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
