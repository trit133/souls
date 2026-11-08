// Close-ups of each character in the customizer preview: default, every second piece, the second special of every
// slot, and the first specials with effect colours. node scripts/outfits-look.mjs -> /tmp/look/fit-<kind>-<look>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { PIECES, COLORS } from '../src/outfits.js';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('http://localhost:4173/?server=http%3A%2F%2F127.0.0.1%3A4111'); await page.waitForTimeout(800);
await page.click('#btn-acct'); await page.fill('#acct-user', 'fit' + (Date.now() % 100000)); await page.fill('#acct-pass', 'secret123'); await page.click('#acct-signup'); await page.waitForTimeout(800);
const LOOKS = {
  default: () => ({}),
  second: (kind, P) => ({ pieces: Object.fromEntries(Object.entries(P[kind]).map(([s, l]) => [s, l[1]?.id])), colors: {} }),
  special2: (kind, P) => ({ pieces: Object.fromEntries(Object.entries(P[kind]).map(([s, l]) => [s, l.filter((p) => p.special)[1].id])), colors: {} }),
  special: (kind, P, fx) => ({ pieces: Object.fromEntries(Object.entries(P[kind]).map(([s, l]) => [s, (l.find((p) => p.special) || l[1]).id])), colors: Object.fromEntries(Object.keys(P[kind]).map((s, i) => [s, [fx[i % fx.length], 'gold']])) }),
};
for (const kind of ['knight', 'rogue', 'mage']) for (const look of Object.keys(LOOKS)) {
  await page.evaluate(({ kind, look, src, PIECES, COLORS }) => {
    const LOOK = eval('(' + src + ')');
    const d = game.accounts.data;
    d.cosmetics = { pieces: Object.entries(PIECES[kind]).flatMap(([s, l]) => l.map((p) => `${kind}.${s}.${p.id}`)), colors: COLORS.map((c) => c.id) };
    d.outfits[kind].slots[0] = { pieces: {}, colors: {}, ...LOOK(kind, PIECES, ['molten', 'frostbound', 'voidcloth', 'gilded', 'crimson', 'royal']) };
    d.outfits[kind].active = 0;
    game.skinMenu.open(kind);
  }, { kind, look, src: LOOKS[look].toString(), PIECES, COLORS: COLORS.map((c) => ({ id: c.id })) });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/look/fit-${kind}-${look}.png`, clip: { x: 140, y: 180, width: 265, height: 325 } });
  await page.evaluate(() => game.skinMenu.close());
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
