// Screenshots of the customizer (wardrobe): desktop and phone, trying on a piece and a colour. /tmp/cz-*.png
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/?server=' + encodeURIComponent('http://127.0.0.1:4111');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [];
for (const [name, vp] of [['desktop', { width: 1280, height: 720 }], ['wide', { width: 1920, height: 1080 }], ['phone', { width: 844, height: 390 }]]) {
  const page = await (await b.newContext({ viewport: vp })).newPage();
  page.on('pageerror', (e) => errs.push(name + ' ' + e.message));
  await page.goto(url); await page.waitForTimeout(700);
  await page.click('#btn-herm'); await page.fill('#acct-user', 'cz' + Date.now().toString().slice(-6)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(800);
  await page.evaluate(() => { game.accounts.data.emeralds = 300; game.skinMenu.open('knight'); }); await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/cz-${name}.png` });
  await page.click('.cz-piece:nth-child(2)'); await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/cz-${name}-try.png` });
  await page.context().close();
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
