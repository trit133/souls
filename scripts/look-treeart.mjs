// The skill trees over their painted sides (treebg.js art mode, treeart.js): each character at a normal screen, an
// ultra-wide and a phone, the fires burning and lights glowing. /tmp/look/treeart-<who>-<size>.png
// node scripts/look-treeart.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
for (const [w, h, tag] of [[1280, 720, 'wide'], [2560, 720, 'ultra'], [844, 390, 'phone']]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(process.argv[2] || 'http://localhost:4173/'); await page.waitForTimeout(800);
  for (const kind of ['knight', 'rogue', 'mage']) {
    await page.evaluate((k) => { game.treeUI.open(k); }, kind);
    await page.waitForFunction((k) => game.treeUI.bg.mode === 'art' && game.treeUI.bg.kind === k, kind, { timeout: 15000 }).catch(() => errs.push(`${kind} ${tag}: art never showed`));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/look/treeart-${kind}-${tag}.png` });
    if (kind === 'knight' && tag === 'wide') { // (dragged and zoomed: the paintings stay put)
      const box = await page.locator('#tree-svg').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 250, box.y + box.height / 2 + 200, { steps: 8 }); await page.mouse.up();
      await page.mouse.wheel(0, -500); await page.waitForTimeout(600);
      await page.screenshot({ path: `/tmp/look/treeart-${kind}-${tag}-dragged.png` });
    }
  }
  await page.close();
}
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
await b.close();
