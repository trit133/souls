// The phone's CHARGE button: hidden for the plain Knight, shown once he has Aegis Ram; one press does the whole Shield
// Charge and the leaping overhead after it, with no block held and no second press; then it greys out while it cools.
// node scripts/chargebutton.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
const pre = await page.evaluate(() => {
  const g = game; g.audio.play = () => {}; g.start('knight'); g.player.hp = g.player.maxHp = 1e6;
  g.step(1 / 60, 1 / 60);
  const hidden = document.getElementById('b-charge').classList.contains('hidden');
  g.player.evo = 'aegisRam'; g.player.evolved = true; g.player.chargeCd = 0; g.step(1 / 60, 1 / 60);
  return { plainKnightHidden: hidden, evolvedShown: !document.getElementById('b-charge').classList.contains('hidden') };
});
await page.tap('#b-charge');
const out = await page.evaluate(() => {
  const g = game, p = g.player, seen = [];
  for (let i = 0; i < 120; i++) { g.step(1 / 60, 1 / 60); const s = p.state === 'attack' ? p.atkKey : p.state; if (seen.at(-1) !== s) seen.push(s); }
  return { states: seen.join(' > '), greyedAfter: document.getElementById('b-charge').classList.contains('cd'), cd: Math.round(p.chargeCd) };
});
await b.close();
const o = { ...pre, ...out };
for (const [k, v] of Object.entries(o)) console.log(k.padEnd(18), JSON.stringify(v));
const ok = o.plainKnightHidden && o.evolvedShown && /charge > chargeSlam/.test(o.states) && o.greyedAfter;
console.log(ok ? 'all passed' : 'FAILED');
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
