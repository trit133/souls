// The baked gait (clips.js) on a character, as the game draws it: walking, jogging, sprinting, and locked on to an
// enemy strafing left and right and backing away, six frames each, from a camera on the character's right side
// (side steps from in front). /tmp/look/gait-<kind>.png (one row a movement)
// node scripts/look-gait.mjs [kind] [url]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const kind = process.argv[2] || 'knight', url = process.argv[3] || 'http://localhost:5180/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const MOVES = [['walk', 0, -0.25, false, false], ['jog', 0, -1, false, false], ['sprint', 0, -1, true, false], ['strafe R', 1, 0, false, true], ['strafe L', -1, 0, false, true], ['back', 0, 1, false, true], ['diag', 0.7, -0.7, false, true]];
const rows = [];
for (const [name, mx, mz, sprint, lock] of MOVES) {
  const frames = await page.evaluate(async ({ kind, mx, mz, sprint, lock }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    g.start(kind); for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
    const p = g.player; p.hp = p.maxHp = 1e9; p.st = 1e9;
    const foe = g.enemies[0];
    for (const e of g.enemies) { e.update = () => {}; e.rig.root.visible = e === foe && lock; }
    const X = p.pos.x, Z = p.pos.z;
    foe.pos.set(X, 0, Z - 9); foe.alive = true; foe.rig.root.position.set(X, 0, Z - 9);
    p.lock = lock ? foe : null; p.yaw = Math.PI; p.setState('move');
    g.input.move = () => ({ x: mx, y: mz }); g.input.sprintHeld = () => sprint;
    const out = [];
    for (let f = 0; f < 90; f++) {
      g.step(1 / 60, 1 / 60);
      if (lock) foe.pos.set(p.pos.x, 0, p.pos.z - 9), foe.rig.root.position.copy(foe.pos);
      if (f >= 42 && (f - 42) % 8 === 0) {
        const c = g.camera; g.camLock = true; if (lock && mz === 0) c.position.set(p.pos.x + 0.6, 1.6, p.pos.z - 4.2); else c.position.set(p.pos.x + 4.2, 1.5, p.pos.z + 0.4); c.lookAt(p.pos.x, 0.95, p.pos.z); // (side steps from the front)
        g.pixel.render(g.scene, c);
        out.push(g.pixel.renderer?.domElement?.toDataURL?.() || document.querySelector('canvas').toDataURL());
        g.camLock = false;
      }
    }
    return out;
  }, { kind, mx, mz, sprint, lock });
  rows.push([name, frames]);
}
// the sheet
const sheet = await page.evaluate(async (rows) => {
  const W = 160, H = 200, cv = document.createElement('canvas'); cv.width = W * 6 + 90; cv.height = H * rows.length; const c = cv.getContext('2d');
  c.fillStyle = '#111'; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
  for (let r = 0; r < rows.length; r++) {
    const [name, frames] = rows[r];
    c.fillStyle = '#ddd'; c.font = '14px monospace'; c.fillText(name, 6, r * H + 20);
    for (let k = 0; k < Math.min(6, frames.length); k++) {
      const im = new Image(); im.src = frames[k]; await im.decode();
      const sw = im.width * 0.4, sh = im.height * 0.62;
      c.drawImage(im, (im.width - sw) / 2, im.height * 0.2, sw, sh, 90 + k * W, r * H, W, H);
    }
  }
  return cv.toDataURL('image/png');
}, rows);
writeFileSync(`/tmp/look/gait-${kind}.png`, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`/tmp/look/gait-${kind}.png`);
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
