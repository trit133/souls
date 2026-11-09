// Screenshots of the menus in the title style (skins, settings, lobby before and in a room, sign in): node scripts/menus.mjs [tag] -> /tmp/look/<tag>-*.png
import { chromium } from 'playwright';
const tag = process.argv[2] || 'm0';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5180/?server=http%3A%2F%2F127.0.0.1%3A4111'); await page.waitForTimeout(800);
await page.click('#btn-herm'); await page.fill('#acct-user', 'menu' + (Date.now() % 100000)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(800);
await page.evaluate(() => game.skinMenu.open('knight')); await page.waitForTimeout(800); await page.screenshot({ path: `/tmp/look/${tag}-skins.png` }); await page.click('#skins-back');
await page.evaluate(() => game.hermitage.active && game.hermitage.close()).then(() => page.click('#btn-settings')); await page.waitForTimeout(400); await page.screenshot({ path: `/tmp/look/${tag}-settings.png` }); await page.click('#set-back');
await page.evaluate(() => game.hermitage.open()); await page.click('#hm-party'); await page.waitForTimeout(500); await page.hover('#lobby-create'); await page.waitForTimeout(300); await page.screenshot({ path: `/tmp/look/${tag}-lobby.png` });
await page.click('#lobby-create'); await page.waitForTimeout(900); await page.screenshot({ path: `/tmp/look/${tag}-lobby-room.png` });
await page.click('#lobby-back'); await page.waitForTimeout(300); await page.evaluate(() => { game.ui.show('lobby', false); game.accounts.signOut(); game.refreshTitle(); }); await page.click('#btn-herm'); await page.waitForTimeout(400); await page.screenshot({ path: `/tmp/look/${tag}-account.png` });
await b.close(); console.log(errs.length ? errs.join('\n') : 'OK');
