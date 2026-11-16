// The weapon's elements by strength (weaponfx.js): the Templar's sword with 20, 80, 150 and 250 of an element a hit,
// standing, mid-swing and just after the swing (the trail it leaves). /tmp/look/elemfx-<element>.png
// node scripts/look-elemfx.mjs [element] [url]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const el = process.argv[2] || 'fire', url = process.argv[3] || 'http://localhost:4173/?training';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 700, height: 700 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(900);
const rows = [];
for (const amt of [20, 80, 150, 250]) {
  rows.push([String(amt), await page.evaluate(({ el, amt }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    g.training = true; g.start('knight');
    for (const e2 of document.body.children) if (e2.tagName !== 'CANVAS') e2.style.display = 'none';
    for (const e of g.enemies) e.rig.root.visible = false;
    const p = g.player; p.hp = p.maxHp = 1e9; p.st = p.maxSt = 1e5; p.yaw = 0; p.pos.set(0, 0, -20);
    Object.defineProperty(p, 'wfxKey', { get: () => el, set() {}, configurable: true });
    Object.defineProperty(p, 'wfxPow', { get: () => ({ [el]: amt }), set() {}, configurable: true });
    g.fx.add.clear?.(); g.fx.norm.clear?.();
    const run = (n) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
    const shot = () => { const c = g.camera; g.camLock = true; c.position.set(3.2, 3.2, -15.2); c.lookAt(0, 1.0, -20.4); g.pixel.render(g.scene, c); g.camLock = false; return document.querySelector('canvas').toDataURL(); };
    run(90); const out = [shot()];
    p.doAttack(p.c.light || 'a1', p.fwd().clone(), 0); run(9); out.push(shot()); run(14); out.push(shot());
    return out;
  }, { el, amt })]);
}
const sheet = await page.evaluate(async (rows) => {
  const W = 260, H = 260, cv = document.createElement('canvas'); cv.width = W * 3 + 50; cv.height = H * rows.length; const c = cv.getContext('2d');
  c.fillStyle = '#111'; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
  for (let r = 0; r < rows.length; r++) { c.fillStyle = '#ddd'; c.font = '14px monospace'; c.fillText(rows[r][0], 4, r * H + 20);
    for (let k = 0; k < 3; k++) { const im = new Image(); im.src = rows[r][1][k]; await im.decode(); c.drawImage(im, im.width * 0.15, im.height * 0.05, im.width * 0.7, im.height * 0.75, 50 + k * W, r * H, W, H); } }
  return cv.toDataURL('image/png');
}, rows);
writeFileSync(`/tmp/look/elemfx-${el}.png`, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`/tmp/look/elemfx-${el}.png`, errs.length ? errs : 'no page errors');
await b.close();
