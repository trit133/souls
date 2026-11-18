// The Templar's 3D effects (fx3d.js) as the game draws them: a light and a heavy swing into an enemy with the Power
// Sword and with the Penitent Slab (the arc, the impact), the shield bash and the ground slam; frames across each.
// /tmp/look/knightfx.png
// node scripts/look-knightfx.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:5180/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const SHOTS = [['sword light', 'base', 'attack'], ['sword heavy', 'base', 'heavy'], ['slab light', 'greatsword', 'attack'], ['slab heavy', 'greatsword', 'heavy'], ['bash', 'base', 'bash'], ['slam', 'base', 'slam']];
const rows = [];
for (const [name, weapon, act] of SHOTS) {
  const frames = await page.evaluate(async ({ weapon, act }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    const lo = g.loadoutFor.bind(g);
    g.loadoutFor = (k) => (weapon === 'base' ? lo(k) : { weapon, evo: null });
    g.start('knight'); g.loadoutFor = lo;
    for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
    const p = g.player; p.hp = p.maxHp = 1e9; p.st = 1e9;
    const foe = g.enemies[0]; for (const e of g.enemies) { e.update = () => {}; e.rig.root.visible = e === foe; }
    foe.maxHp = foe.hp = 1e9;
    foe.pos.set(p.pos.x, 0, p.pos.z - 1.6); foe.rig.root.position.copy(foe.pos); foe.yaw = 0; foe.rig.root.rotation.y = 0;
    p.yaw = Math.PI; p.setState('move'); g.input.move = () => ({ x: 0, y: 0 });
    for (let i = 0; i < 10; i++) g.step(1 / 60, 1 / 60);
    if (act === 'bash') g.vfx('bash', foe.pos.clone().setY(1.1), new THREE_DIR());
    if (act === 'slam') g.vfx('groundPound', p.pos.clone().setY(0).add({ x: 0, y: 0, z: -1 }));
    if (act === 'attack' || act === 'heavy') g.input.pressed.add(act);
    const out = [];
    for (let f = 0; f < 44; f++) {
      g.step(1 / 60, 1 / 60);
      if (f % 6 === 2) {
        const c = g.camera; g.camLock = true; c.position.set(p.pos.x + 3.2, 2.6, p.pos.z + 1.2); c.lookAt(p.pos.x, 1.0, p.pos.z - 0.9);
        g.pixel.render(g.scene, c); out.push(document.querySelector('canvas').toDataURL()); g.camLock = false;
      }
    }
    return out;
    function THREE_DIR() { return { x: 0, y: 0, z: -1 }; }
  }, { weapon, act });
  rows.push([name, frames]);
}
const sheet = await page.evaluate(async (rows) => {
  const W = 150, H = 150, cv = document.createElement('canvas'); cv.width = W * 7 + 110; cv.height = H * rows.length; const c = cv.getContext('2d');
  c.fillStyle = '#111'; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
  for (let r = 0; r < rows.length; r++) {
    const [name, frames] = rows[r]; c.fillStyle = '#ddd'; c.font = '13px monospace'; c.fillText(name, 6, r * H + 18);
    for (let k = 0; k < Math.min(7, frames.length); k++) { const im = new Image(); im.src = frames[k]; await im.decode(); const s = im.height * 0.7; c.drawImage(im, (im.width - s) / 2, im.height * 0.08, s, s, 110 + k * W, r * H, W, H); }
  }
  return cv.toDataURL('image/png');
}, rows);
writeFileSync('/tmp/look/knightfx.png', Buffer.from(sheet.split(',')[1], 'base64'));
console.log('/tmp/look/knightfx.png');
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
