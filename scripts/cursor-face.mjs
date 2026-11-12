// Mouse facing: the player turns to the cursor on the floor, walks (and backpedals) facing it, sprints and rolls the
// way WASD points, attacks where the cursor is; on touch the old stick facing stays. node scripts/cursor-face.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);

// set up: a knight standing alone, camera settled; returns the screen point 3 m east of the player
const east = await page.evaluate(() => {
  const g = (window.g = game); g.loop = () => {}; g.audio.play = () => {};
  g.start('knight');
  for (const e of g.enemies) e.die();
  window.mv = { x: 0, y: 0 }; g.input.move = () => window.mv;
  window.run = (n) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
  // the client position of a floor point
  window.toScreen = (x, z) => {
    g.renderer.render(g.scene, g.camera); // (refreshes the camera matrices)
    const v = new THREE_V(x, 0, z).project(g.camera), r = g.canvas.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  };
  return null;
}).catch(() => null);
// (THREE isn't global: borrow the Vector3 class from the player)
await page.evaluate(() => { window.THREE_V = g.player.pos.constructor; window.run(90); });
const at = await page.evaluate(() => { const p = g.player.pos; return toScreen(p.x + 3, p.z); });

const yawDeg = () => page.evaluate(() => +(g.player.yaw * 180 / Math.PI % 360).toFixed(1));
const near = (a, b, tol = 8) => { const d = ((a - b) % 360 + 540) % 360 - 180; return Math.abs(d) <= tol; };
const res = {};

// 1. a real mouse move over the canvas: the player turns east (yaw 90)
await page.mouse.move(at.x, at.y);
await page.evaluate(() => run(40));
res.facesCursor = await yawDeg();
res.aimPoint = await page.evaluate(() => { const a = g.input.aim, p = g.player.pos; return a && { dx: +(a.x - p.x).toFixed(2), dz: +(a.z - p.z).toFixed(2) }; });

// the rest drives the cursor from inside the page: aim at a floor point relative to the player each frame
const aimRel = (dx, dz) => page.evaluate(([dx, dz]) => { window.rel = { dx, dz }; }, [dx, dz]);
await page.evaluate(() => {
  const step = g.step.bind(g);
  g.step = (a, b) => { if (window.rel) { const p = g.player.pos; g.input.mouse = toScreen(p.x + rel.dx, p.z + rel.dz); } step(a, b); };
});

// 2. walking west (A) with the cursor east: still faces east, the walk cycle runs backwards
await aimRel(3, 0);
await page.evaluate(() => { mv.x = -1; mv.y = 0; window.ph0 = g.player.phase; run(40); window.ph1 = g.player.phase; });
res.backpedalYaw = await yawDeg();
res.backpedalPhase = await page.evaluate(() => +(ph1 - ph0).toFixed(2));
res.backpedalMovedWest = await page.evaluate(() => g.player.vel.x < -1);

// 3. walking north (W) with the cursor east: faces east, strafes
await page.evaluate(() => { mv.x = 0; mv.y = 1; run(30); });
res.strafeYaw = await yawDeg();

// 4. sprinting west: turns to the run direction (yaw -90)
await page.evaluate(() => { mv.x = -1; mv.y = 0; g.input.sprintHeld = () => true; g.player.st = g.player.maxSt; run(40); });
res.sprintYaw = await yawDeg();
await page.evaluate(() => { g.input.sprintHeld = () => false; mv.x = 0; mv.y = 0; run(30); });

// 5. light attack with the cursor north (-z, yaw 180) while standing: swings north
await aimRel(0, -3);
await page.evaluate(() => { g.player.st = g.player.maxSt; g.player.setState('move'); g.input.pressed.add('attack'); run(2); });
res.attackYaw = await yawDeg();
res.attackState = await page.evaluate(() => g.player.state);
await page.evaluate(() => run(80));

// 6. roll with D held (east) and the cursor north: rolls east
await page.evaluate(() => { g.player.st = g.player.maxSt; g.player.setState('move'); mv.x = 1; mv.y = 0; g.input.pressed.add('roll'); run(2); });
res.rollDir = await page.evaluate(() => ({ state: g.player.state, x: +g.player.rollDir.x.toFixed(2), z: +g.player.rollDir.z.toFixed(2) }));
await page.evaluate(() => { mv.x = 0; run(60); });

// 7. on touch there's no cursor aim: walking south faces south (yaw 0)
await page.evaluate(() => { window.rel = null; g.input.lastDevice = 'touch'; mv.x = 0; mv.y = -1; run(40); });
res.touchAim = await page.evaluate(() => g.input.aim);
res.touchYaw = await yawDeg();

await b.close();
console.log(JSON.stringify(res, null, 1));
const ok = {
  facesCursor: near(res.facesCursor, 90) && res.aimPoint && Math.abs(res.aimPoint.dx - 3) < 0.3 && Math.abs(res.aimPoint.dz) < 0.3,
  backpedal: near(res.backpedalYaw, 90) && res.backpedalPhase < 0 && res.backpedalMovedWest,
  strafe: near(res.strafeYaw, 90),
  sprint: near(res.sprintYaw, -90),
  attack: near(res.attackYaw, 180) && res.attackState === 'attack',
  roll: res.rollDir.state === 'roll' && res.rollDir.x > 0.95,
  touch: res.touchAim === null && near(res.touchYaw, 0),
};
console.log(ok);
console.log(Object.values(ok).every(Boolean) ? 'cursor facing works' : 'CURSOR FACING PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
