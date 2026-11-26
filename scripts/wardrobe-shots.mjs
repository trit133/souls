// Wardrobe pictures: the customization preview of a class with a weapon and an outfit, at a turn. /tmp/arm/<name>.png
// node scripts/wardrobe-shots.mjs '[["name", "knight", "sword", { "helmet": { "piece": "foreman" } }, 0.4], ...]'
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/arm', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 900, height: 700 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5180/'); await page.waitForTimeout(800);
const shots = JSON.parse(process.argv[2]);
for (const [name, kind, weapon, fit, rot] of shots) {
  await page.evaluate(([kind, weapon, fit, rot]) => { const g = game, S = g.skins || g.skinMenu; g.loadoutFor = () => ({ weapon, evo: null }); S.shown = () => fit; S.open(kind); S.rig.root.rotation.y = rot; S.held = 99; }, [kind, weapon, fit, rot]);
  await page.waitForTimeout(700); await page.locator('#skin-view').screenshot({ path: `/tmp/arm/${name}.png` });
}
console.log(errs.length ? errs : 'ok'); await b.close();
