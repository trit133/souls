// Phone shots of the menus: the title (signed in), settings, the pause menu, the death screen, the HUD (with the
// Combos button tapped through the move stick's half of the screen). /tmp/look/ph-*.png
// node scripts/look-phone-ui.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(1200);
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `/tmp/look/ph-${n}.png` }); };
await page.evaluate(() => { for (const v of document.querySelectorAll('#menu .home-view')) v.classList.toggle('hidden', v.id !== 'home-in'); document.getElementById('menu').dataset.view = 'in'; });
await shot('home');
await page.evaluate(() => { document.getElementById('menu').classList.add('hidden'); document.getElementById('settings').classList.remove('hidden'); document.getElementById('set-signout').classList.remove('hidden'); });
await shot('settings');
await page.evaluate(() => { document.getElementById('settings').scrollTop = 1e5; }); await shot('settings-end');
await page.evaluate(() => { document.getElementById('settings').classList.add('hidden'); const g = game; g.audio.play = () => {}; g.start('knight'); });
await page.waitForTimeout(1500);
const r = await page.evaluate(() => { const b = document.getElementById('combo-btn').getBoundingClientRect(); const x = b.x + b.width / 2, y = b.y + b.height / 2; return { x, y, top: document.elementFromPoint(x, y)?.id || document.elementFromPoint(x, y)?.className }; });
await page.touchscreen.tap(r.x, r.y);
const open = await page.evaluate(() => !document.getElementById('combo-list').classList.contains('hidden'));
await shot('hud');
await page.evaluate(() => { game.ui.show('pause'); }); await shot('pause');
await page.evaluate(() => { game.ui.show('pause', false); game.ui.show('death'); }); await shot('death');
await b.close();
console.log('combo button: top element there =', r.top, '; tapping it toggled the list:', open);
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
