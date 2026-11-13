import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome' });
const page = await (await b.newContext({ viewport: { width: 900, height: 300 } })).newPage();
await page.goto('http://localhost:5180/'); await page.waitForTimeout(1500);
await page.evaluate(async () => {
  const M = await import('/src/items.js');
  const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99;background:#1a120c;display:flex;flex-wrap:wrap;gap:14px;padding:14px;font:11px monospace;color:#ddd';
  for (const id of Object.keys(M.ITEMS)) { const c = document.createElement('div'); c.style.cssText = 'width:100px;text-align:center'; const ic = M.iconEl(id, 5); ic.style.imageRendering = 'pixelated'; ic.style.border = '3px solid ' + M.RARITY[M.ITEMS[id].rarity].color; c.append(ic, document.createElement('br'), M.ITEMS[id].name); d.append(c); }
  document.body.append(d);
});
await page.screenshot({ path: '/tmp/cityshots/icons.png' });
await b.close();
