// Armour close-ups: a character in each of its four sets (every armour slot on piece 0, 1, 2 or 3; optionally with
// colours), front and three-quarter, lit plainly against a dark backdrop, and the same at the game's own pixel size.
// /tmp/look/armor-<kind>.png (a row a set)
// node scripts/look-armor.mjs [kind] [url] [colours json: { slot: [main, trim, detail, glow, texA, texB] }]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const kind = process.argv[2] || 'knight', url = process.argv[3] || 'http://localhost:4193/?training', colors = JSON.parse(process.argv[4] || '{}');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 900, height: 900 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(900);
const rows = [];
for (let set = 0; set < 4; set++) {
  const shots = await page.evaluate(async ({ kind, set, colors }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    const O = await import('/src/outfits.js').catch(() => null);
    const slots = { knight: ['helmet', 'pauldronL', 'pauldronR', 'chest', 'legs'], rogue: ['mask', 'cloak', 'shirt', 'bandL', 'bandR'], mage: ['shoulder', 'shirt', 'pants'] }[kind];
    const ids = { knight: { helmet: ['great', 'barbute', 'winged', 'crowned'], pauldron: ['segmented', 'spiked', 'lion', 'sunburst'], chest: ['plate', 'mail', 'radiant', 'dragonscale'], legs: ['greaves', 'mailskirt', 'kingsguard', 'ember'] },
      rogue: { mask: ['wrap', 'iron', 'bone', 'kitsune'], cloak: ['tattered', 'mantle', 'wraith', 'raven'], shirt: ['jerkin', 'brigandine', 'assassin', 'shadowweave'], band: ['cloth', 'bracer', 'serpent', 'blade'] },
      mage: { shoulder: ['mantle', 'pauldron', 'crystal', 'phoenix'], shirt: ['runecoat', 'robe', 'starcape', 'archmage'], pants: ['trousers', 'greaves', 'runed', 'astral'] } }[kind];
    const fit = {};
    for (const s of slots) { const list = ids[s] || ids[s.replace(/[LR]$/, '')]; const c = colors[s] || []; fit[s] = { piece: list[set], main: c[0] || 'default', trim: c[1] || 'default', detail: c[2] || 'default', glow: c[3] || 'default', texA: c[4] || 'default', texB: c[5] || 'default' }; }
    g.equippedOutfit = () => fit;
    g.training = true; g.start(kind);
    for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
    for (const e of g.enemies) e.rig.root.visible = false;
    const p = g.player; p.yaw = 0; p.pos.set(0, 0, -20);
    for (let i = 0; i < 20; i++) g.step(1 / 60, 1 / 60);
    const c = g.camera, out = [], R = g.renderer || g.pixel.renderer;
    g.camLock = true;
    for (const [dx, dz] of [[0, 2.6], [1.9, 1.9], [0, -2.6]]) {
      c.position.set(p.pos.x + dx, 1.25, p.pos.z + dz); c.lookAt(p.pos.x, 1.05, p.pos.z);
      g.pixel.render(g.scene, c); out.push(document.querySelector('canvas').toDataURL());
    }
    g.camLock = false;
    return out;
  }, { kind, set, colors });
  rows.push(shots);
}
const sheet = await page.evaluate(async (rows) => {
  const W = 300, H = 300, cv = document.createElement('canvas'); cv.width = W * 3; cv.height = H * rows.length; const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  for (let r = 0; r < rows.length; r++) for (let k = 0; k < 3; k++) { const im = new Image(); im.src = rows[r][k]; await im.decode(); const s = Math.min(im.width, im.height); c.drawImage(im, (im.width - s * 0.62) / 2, (im.height - s * 0.92) / 2, s * 0.62, s * 0.92, k * W, r * H, W, H); }
  return cv.toDataURL('image/png');
}, rows);
writeFileSync(`/tmp/look/armor-${kind}.png`, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`/tmp/look/armor-${kind}.png`, errs.length ? errs : 'no page errors');
await b.close();
