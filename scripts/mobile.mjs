// The phone layout (html.phone) against the desktop one: home tiles, skill tree zoom + tap card, the lock-on foe panel.
// Screenshots /tmp/look/<tag>-<mode>-*.png and a JSON of element boxes (/tmp/look/<tag>-<mode>.json) to diff desktop
// before/after. node scripts/mobile.mjs [tag] [desktop|phone|both] [url]
import { chromium, devices } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
const tag = process.argv[2] || 'mob', which = process.argv[3] || 'both', url = process.argv[4] || 'http://localhost:5180/';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const phone = devices['iPhone 13 landscape'];
const modes = which === 'both' ? ['desktop', 'phone'] : [which];
for (const mode of modes) {
  const ctx = await b.newContext(mode === 'phone' ? phone : { viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url); await page.waitForTimeout(1200);
  const box = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.display, c.fontSize]; }, sel);
  const out = { phoneClass: await page.evaluate(() => document.documentElement.classList.contains('phone')) };
  await page.evaluate(() => game.toTitle?.()); await page.waitForTimeout(400);
  for (const s of ['#btn-herm', '#btn-settings', '#btn-fs', '#controls-help', '#acct-bar']) out[s] = await box(s);
  await page.screenshot({ path: `/tmp/look/${tag}-${mode}-home.png` });
  // skill tree: a fake signed-in account with gold so the card can offer an upgrade
  await page.evaluate(() => {
    const a = game.accounts; a.user = a.user || 'tester';
    a.data = a.data || { gold: 0, upgrades: {}, tree: {}, stats: { runs: 0 } }; a.data.gold = 99999; a.save = () => {};
    game.treeUI.open('knight');
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => { for (let i = 0; i < 30; i++) document.querySelector('[data-tz="in"]').click(); });
  out.maxZoom = await page.evaluate(() => game.treeUI.view.z);
  await page.evaluate(() => { game.treeUI.view.z = 1.7; game.treeUI.applyView(); });
  // tap a node next to the start that can be bought
  const target = await page.evaluate(() => {
    const t = game.treeUI, el = [...document.querySelectorAll('#tree-svg [data-node]')].find((g) => g.dataset.node !== 'start' && g.classList.contains('can'))
      || [...document.querySelectorAll('#tree-svg [data-node]')].find((g) => g.dataset.node !== 'start');
    const r = el.getBoundingClientRect(); return { id: el.dataset.node, x: r.x + r.width / 2, y: r.y + r.height / 2, owned: game.accounts.data.tree.knight?.length || 0, t: !!t };
  });
  out.tapNode = target.id;
  if (mode === 'phone') await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(300);
  out.ownedAfterTap = await page.evaluate(() => game.accounts.data.tree.knight?.length || 0);
  out.tip = await box('#tree-tip');
  out.tipBtn = await page.evaluate(() => { const b = document.querySelector('#tree-tip .tt-buy'); return b ? { text: b.textContent, disabled: b.disabled } : null; });
  await page.screenshot({ path: `/tmp/look/${tag}-${mode}-tree-card.png` });
  if (out.tipBtn && !out.tipBtn.disabled) {
    const r = await page.evaluate(() => { const r = document.querySelector('#tree-tip .tt-buy').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.touchscreen.tap(r.x, r.y); await page.waitForTimeout(300);
    out.ownedAfterUpgrade = await page.evaluate(() => game.accounts.data.tree.knight?.length || 0);
    out.tipAfterUpgrade = await page.evaluate(() => document.querySelector('#tree-tip .tt-status')?.textContent);
    await page.screenshot({ path: `/tmp/look/${tag}-${mode}-tree-bought.png` });
  }
  await page.evaluate(() => game.treeUI.close());
  // a run, locked on to the nearest enemy
  await page.evaluate(() => game.start('knight')); await page.waitForTimeout(1500);
  await page.evaluate(() => { const p = game.player, e = [...game.enemies].filter((e) => e.alive).sort((a, b) => p.distTo(a) - p.distTo(b))[0]; e.pos.set(p.pos.x + 4, e.pos.y, p.pos.z); p.lock = e; });
  await page.waitForTimeout(500);
  out['#minimap canvas'] = await box('#minimap canvas'); out['#foe-panel'] = await box('#foe-panel');
  out.foeFont = await page.evaluate(() => { const r = document.querySelector('.fp-row'); return r ? getComputedStyle(r).fontSize : 'no panel: mode=' + game.mode + ' enemies=' + game.enemies.length + ' lock=' + !!game.player?.lock; });
  await page.screenshot({ path: `/tmp/look/${tag}-${mode}-foe.png` });
  writeFileSync(`/tmp/look/${tag}-${mode}.json`, JSON.stringify(out, null, 1));
  console.log(`== ${mode}`); for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), JSON.stringify(v));
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
  await ctx.close();
}
await b.close();
