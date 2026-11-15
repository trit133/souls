// The Shrike's Wrist Blade (one reverse-grip knife): his stance, each attack, and the Ghost Veil backstab into the
// neck of a Zealot and up onto the back of a War Servitor (and the dummy's eye), filmed in the training ring.
// /tmp/look/knife-*.png. Checks the backstab lands as a held critical that kills a weak foe and ends with him down.
// node scripts/look-knife.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4191/?training';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);

const film = (job) => page.evaluate(async (job) => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.loadoutFor = () => ({ weapon: 'wristblade', evo: 'ghostVeil' });
  g.start('rogue'); for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const p = g.player; p.hp = p.maxHp = 1e9; p.st = p.maxSt = 1e5;
  const dummy = g.enemies[0], Ctor = dummy.constructor, info = {};
  let tg = null;
  if (job.foe === 'dummy') tg = dummy;
  else { dummy.rig.root.visible = false; dummy.pos.set(50, 0, 50); if (job.foe) { tg = new Ctor(g, job.foe, 0, -14, Math.PI, { players: 1, tier: 0 }); g.enemies.push(tg); if (!job.weak) tg.update = () => {}; } }
  p.pos.set(0, 0, -10); p.yaw = Math.PI; p.setState('move');
  if (tg) { tg.pos.set(0.4, 0, -12.6); tg.yaw = 0.3; tg.rig.root.position.copy(tg.pos); tg.rig.root.rotation.y = tg.yaw; tg.state = 'chase'; if (job.weak) tg.hp = 20; }
  const run = (n, each) => { for (let i = 0; i < n; i++) { g.step(1 / 60, 1 / 60); each?.(i); } };
  run(20);
  const shots = [], cam = job.cam || [3.2, 1.7, 1.2];
  const shoot = () => { const c = g.camera, at = tg && job.foe !== 'dummy' ? tg.pos : p.pos; g.camLock = true; c.position.set(at.x + cam[0], cam[1] + (job.up || 0), at.z + cam[2]); c.lookAt(at.x, 1.0 + (job.up || 0) * 0.6, at.z); g.pixel.render(g.scene, c); shots.push(document.querySelector('canvas').toDataURL()); g.camLock = false; };
  if (job.stance) { shoot(); return { shots, info }; }
  if (job.attack) { p.doAttack(job.attack, p.fwd().clone(), 0); run(job.every * job.n, (i) => { if (i % job.every === job.every - 1) shoot(); }); return { shots, info }; }
  // the backstab out of the veil
  p.startVeil(); run(5);
  p.doAttack('w1', p.fwd().clone(), 0);
  info.crit = p.crit?.name; info.state = p.state;
  let maxY = 0;
  run(job.every * job.n, (i) => { maxY = Math.max(maxY, p.y || 0); if (i % job.every === job.every - 1) shoot(); });
  info.maxY = +maxY.toFixed(2); info.foeState = tg.state; info.foeAlive = tg.alive; info.back = p.state;
  run(60); info.after = { me: p.state, y: +(p.y || 0).toFixed(2), foe: tg.state, ragdoll: !!tg.ragdoll };
  return { shots, info };
}, job);

const sheet = async (name, rows) => {
  const data = await page.evaluate(async (rows) => {
    const W = 180, H = 200, n = Math.max(...rows.map((r) => r[1].length)), cv = document.createElement('canvas'); cv.width = W * n + 90; cv.height = H * rows.length; const c = cv.getContext('2d');
    c.fillStyle = '#111'; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
    for (let r = 0; r < rows.length; r++) {
      c.fillStyle = '#ddd'; c.font = '13px monospace'; c.fillText(rows[r][0], 6, r * H + 20);
      for (let k = 0; k < rows[r][1].length; k++) { const im = new Image(); im.src = rows[r][1][k]; await im.decode(); c.drawImage(im, im.width * 0.22, im.height * 0.1, im.width * 0.56, im.height * 0.8, 90 + k * W, r * H, W, H); }
    }
    return cv.toDataURL('image/png');
  }, rows);
  writeFileSync(`/tmp/look/knife-${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  console.log(`/tmp/look/knife-${name}.png`);
};
const rows = [['stance', (await film({ stance: true, cam: [1.6, 1.5, 2.4] })).shots]];
for (const a of ['w1', 'w2', 'w3', 'heavy']) rows.push([a, (await film({ attack: a, every: 5, n: 6, cam: [2.4, 1.6, 2.2] })).shots]);
await sheet('moves', rows);
const res = {};
const r1 = await film({ foe: 'grunt', weak: true, every: 13, n: 6 }); res.zealot = r1.info;
const r2 = await film({ foe: 'brute', weak: true, every: 20, n: 6, up: 0.8, cam: [3.6, 2.2, 1.6] }); res.servitor = r2.info;
const r3 = await film({ foe: 'dummy', every: 13, n: 6, cam: [2.6, 1.6, -1.2] }); res.dummy = r3.info;
await sheet('backstab', [['zealot', r1.shots], ['servitor', r2.shots], ['dummy', r3.shots]]);
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(9), JSON.stringify(v));
const ok = res.zealot.crit === 'neck' && res.servitor.crit === 'neckLeap' && res.servitor.maxY > 0.5 && res.zealot.after.ragdoll && res.servitor.after.ragdoll && res.zealot.after.me === 'move' && res.servitor.after.y === 0 && res.dummy.crit === 'neck';
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'no page errors');
console.log(ok && !errs.length ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok && !errs.length ? 0 : 1);
