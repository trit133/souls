// Ragdolls (ragdoll.js): a killed enemy goes limp, falls the way it was hit, ends up lying on the floor inside the
// walls and stays there (still drawn long after the old 4.5 s vanish), its bones never stretching; a boss after its
// kneel; a dead player too, given back on respawn. Frames of a fall: /tmp/look/ragdoll.png
// node scripts/ragdoll.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4191/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const res = await page.evaluate(async () => {
  const g = game, out = {}; g.loop = () => {}; g.audio.play = () => {};
  const run = (s, each) => { for (let i = 0; i < Math.round(s * 60); i++) { g.step(1 / 60, 1 / 60); each?.(i); } };
  g.start('knight'); for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const p = g.player; p.hp = p.maxHp = 1e9;
  const e = g.enemies.find((x) => x.type === 'grunt' && !x.reserve);
  for (const x of g.enemies) if (x !== e) x.update = () => {};
  e.update = Object.getPrototypeOf(e).update;
  e.pos.set(p.pos.x, 0, p.pos.z - 2.2); e.yaw = 0; p.yaw = Math.PI;
  // its bones' lengths, standing
  const W = (j) => e.rig.j[j].getWorldPosition(new e.pos.constructor());
  const bones = () => { e.rig.root.updateMatrixWorld(true); return [['hips', 'torso'], ['torso', 'head'], ['legL', 'shinL'], ['armR', 'foreR'], ['foreR', 'handR']].map(([a, c]) => +W(a).distanceTo(W(c)).toFixed(3)); };
  run(0.1); out.bonesUp = bones();
  // the killing blow, a shove away from you
  e.kb.set(0, 0, -6); e.hp = 1; e.receive({ dmg: 50, poise: 0, srcPos: p.pos, attacker: p });
  const frames = [];
  run(2.2, (i) => {
    if (i % 12 === 0 && frames.length < 6) {
      const c = g.camera; g.camLock = true; c.position.set(e.pos.x + 4, 1.6, e.pos.z - 1); c.lookAt(e.pos.x, 0.4, e.pos.z - 1);
      g.pixel.render(g.scene, c); frames.push(document.querySelector('canvas').toDataURL()); g.camLock = false;
    }
  });
  out.ragdoll = !!e.ragdoll;
  run(4);
  const B = e.ragdoll?.bodies;
  out.lying = B ? { chestY: +B.chest.position.y.toFixed(2), headY: +B.head.position.y.toFixed(2), moved: +Math.hypot(B.pelvis.position.x - e.pos.x, B.pelvis.position.z - e.pos.z).toFixed(2) } : null;
  out.frozen = e.ragdoll ? !e.ragdoll.live : null;
  out.inside = B ? Object.values(B).every((b) => g.world.walkable(b.position.x, b.position.z, 0, null, true)) : null;
  out.bonesDown = bones();
  run(2); out.stillDrawn = e.rig.root.visible && e.t > 5;
  // a dead player goes limp, and is given back on respawn
  p.hp = 1; p.maxHp = 100; p.die(); run(1.5);
  out.playerLimp = !!p.ragdoll;
  p.respawn(p.pos.x, p.pos.z); run(0.3);
  out.playerBack = !p.ragdoll && Math.abs(p.rig.body.position.x) < 1e-6 && p.rig.root.position.distanceTo(p.pos) < 0.01;
  // a boss: kneels, then goes limp
  const boss = g.bosses[0];
  if (boss) { boss.die = Object.getPrototypeOf(boss).die; boss.pos.set(p.pos.x + 3, 0, p.pos.z); boss.alive = true; boss.hp = 0; boss.die(); run(2); out.bossLimp = !!boss.ragdoll; }
  out.frames = frames;
  return out;
});
const frames = res.frames; delete res.frames;
const sheet = await page.evaluate(async (frames) => {
  const W = 200, H = 160, cv = document.createElement('canvas'); cv.width = W * frames.length; cv.height = H; const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  for (let k = 0; k < frames.length; k++) { const im = new Image(); im.src = frames[k]; await im.decode(); c.drawImage(im, im.width * 0.25, im.height * 0.2, im.width * 0.5, im.height * 0.6, k * W, 0, W, H); }
  return cv.toDataURL('image/png');
}, frames);
writeFileSync('/tmp/look/ragdoll.png', Buffer.from(sheet.split(',')[1], 'base64'));
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(11), JSON.stringify(v));
const same = res.bonesUp.every((v, i) => Math.abs(v - res.bonesDown[i]) < 0.01);
const ok = res.ragdoll && res.lying && res.lying.chestY < 0.45 && res.lying.headY < 0.5 && res.inside && same && res.stillDrawn && res.playerLimp && res.playerBack && res.bossLimp !== false;
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'no page errors');
console.log(ok && !errs.length ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok && !errs.length ? 0 : 1);
