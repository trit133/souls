// Enemies on the baked gait (clips.js gaitFor): each type walking, running, strafing round and backing off, driven by
// hand in the training ring and filmed from the side, six frames a row. /tmp/look/foegait-<n>.png
// node scripts/look-foegait.mjs [types,comma,separated] [url]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const types = (process.argv[2] || 'grunt,spear,brute,wretch').split(','), url = process.argv[3] || 'http://localhost:4191/?training';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const MOVES = [['walk', 0, 1, 'walk'], ['run', 0, 1, 'run'], ['strafe', 1, 0, 'walk'], ['back', 0, -1, 'walk']];
for (const type of types) {
  const rows = [];
  for (const [name, sx, fz, pace] of MOVES) {
    const frames = await page.evaluate(async ({ type, sx, fz, pace }) => {
      const g = game; g.loop = () => {}; g.audio.play = () => {};
      g.start('knight'); for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
      const p = g.player; p.rig.root.visible = false;
      const Ctor = g.enemies[0].constructor; g.enemies[0].rig.root.visible = false;
      const e = new Ctor(g, type, 0, -10, 0, { players: 1, tier: 0 });
      e.yaw = 0; // facing +z (the camera's side is +x)
      const v = (pace === 'run' ? e.T.run : e.T.walk) * (e.spdScale || 1), out = [];
      for (let f = 0; f < 90; f++) {
        const dt = 1 / 60; g.time += dt;
        e.pos.x += sx * v * dt; e.pos.z += fz * v * dt;
        e.syncRig(dt, e.gait(dt), 12);
        if (f >= 42 && (f - 42) % 8 === 0) {
          const c = g.camera, s = e.T.scale || 1; g.camLock = true;
          if (sx) c.position.set(e.pos.x, 1.5 * s, e.pos.z + 4.2 * s); else c.position.set(e.pos.x + 4.2 * s, 1.5 * s, e.pos.z + 0.3);
          c.lookAt(e.pos.x, 0.95 * s, e.pos.z);
          g.pixel.render(g.scene, c);
          out.push(document.querySelector('canvas').toDataURL());
          g.camLock = false;
        }
      }
      e.remove();
      return out;
    }, { type, sx, fz, pace });
    rows.push([`${type} ${name}`, frames]);
  }
  const sheet = await page.evaluate(async (rows) => {
    const W = 160, H = 200, cv = document.createElement('canvas'); cv.width = W * 6 + 120; cv.height = H * rows.length; const c = cv.getContext('2d');
    c.fillStyle = '#111'; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
    for (let r = 0; r < rows.length; r++) {
      const [name, frames] = rows[r];
      c.fillStyle = '#ddd'; c.font = '13px monospace'; c.fillText(name, 6, r * H + 20);
      for (let k = 0; k < Math.min(6, frames.length); k++) {
        const im = new Image(); im.src = frames[k]; await im.decode();
        const sw = im.width * 0.4, sh = im.height * 0.62;
        c.drawImage(im, (im.width - sw) / 2, im.height * 0.2, sw, sh, 120 + k * W, r * H, W, H);
      }
    }
    return cv.toDataURL('image/png');
  }, rows);
  writeFileSync(`/tmp/look/foegait-${type}.png`, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(`/tmp/look/foegait-${type}.png`);
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
