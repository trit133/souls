// A fall never kills (player.js landFrom): it can take you down to 5% of your health and no further; at 5% or below it
// only knocks you flat. node scripts/falls.mjs [url]
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext()).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(process.argv[2] || 'http://localhost:4173/?training'); await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const g = game; g.loop = () => {}; g.audio.play = () => {}; g.training = true; g.start('knight');
  const p = g.player, M = p.maxHp, out = {};
  for (const [name, frac, h] of [['full, huge fall', 1, 30], ['at 7%', 0.07, 30], ['at 5%', 0.05, 30], ['at 3%', 0.03, 30], ['full, short', 1, 1]]) {
    p.hp = Math.round(M * frac); p.setState('move'); p.landFrom(h);
    out[name] = { pct: +(p.hp / M * 100).toFixed(1), alive: p.alive, state: p.state };
  }
  return out;
});
for (const [k, v] of Object.entries(r)) console.log(k.padEnd(16), JSON.stringify(v));
const ok = r['full, huge fall'].pct === 30 && r['at 7%'].pct === 5 && r['at 5%'].pct === 5 && r['at 3%'].pct === 3 && Object.values(r).every((v) => v.alive) && r['at 5%'].state === 'prone' && r['full, short'].pct === 100;
console.log(errs.length ? errs : 'no page errors'); console.log(ok && !errs.length ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok && !errs.length ? 0 : 1);
