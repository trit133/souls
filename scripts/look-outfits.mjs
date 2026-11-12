// Every outfit piece, for review: each character dressed in its 1st, 2nd, 3rd and 4th piece of every slot, shot
// from the front and the back. /tmp/look/outfit-<kind>-<n>-<front|back>.png. node scripts/look-outfits.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4173/?chain';
const SLOTS = { knight: { helmet: ['great', 'barbute', 'winged', 'crowned'], pauldronL: ['segmented', 'spiked', 'lion', 'sunburst'], pauldronR: ['segmented', 'spiked', 'lion', 'sunburst'], chest: ['plate', 'mail', 'radiant', 'dragonscale'], legs: ['greaves', 'mailskirt', 'kingsguard', 'ember'], sword: ['longsword', 'falchion', 'dawn', 'frostbrand'], shield: ['heater', 'round', 'kite', 'dragon'] },
  rogue: { mask: ['wrap', 'iron', 'bone', 'kitsune'], cloak: ['tattered', 'mantle', 'wraith', 'raven'], shirt: ['jerkin', 'brigandine', 'assassin', 'shadowweave'], bandL: ['cloth', 'bracer', 'serpent', 'blade'], bandR: ['cloth', 'bracer', 'serpent', 'blade'], knives: ['curved', 'stiletto', 'spectral', 'fang'] },
  mage: { shoulder: ['mantle', 'pauldron', 'crystal', 'phoenix'], shirt: ['runecoat', 'robe', 'starcape', 'archmage'], pants: ['trousers', 'greaves', 'runed', 'astral'], wand: ['rune', 'bone', 'starfall', 'ember'], sword: ['runeblade', 'steel', 'moonblade', 'voidedge'] } };
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 560 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
for (const [kind, slots] of Object.entries(SLOTS).filter(([k]) => !process.argv[3] || k === process.argv[3])) for (let n = 0; n < 4; n++) for (const side of ['front', 'back']) {
  const fit = Object.fromEntries(Object.entries(slots).map(([s, ids]) => [s, { piece: ids[n] }]));
  await page.evaluate(({ kind, fit, side }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    g.equippedOutfit = () => fit;
    g.start(kind); for (const e of g.enemies) { e.rig.root.visible = false; e.update = () => {}; }
    const p = g.player; p.hp = p.maxHp = 1e9;
    for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60);
    const c = g.camera, X = p.pos.x, Z = p.pos.z, a = (side === 'front' ? 0 : Math.PI) + p.yaw + 0.5;
    c.position.set(X + Math.sin(a) * 3.0, 1.9, Z + Math.cos(a) * 3.0); c.lookAt(X, 1.1, Z);
    g.pixel.render(g.scene, c);
  }, { kind, fit, side });
  await page.screenshot({ path: `/tmp/look/outfit-${kind}-${n}-${side}.png` });
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
