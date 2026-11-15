// The terrain (terrain.js) in the training arena's trial patch, played for real: a terrace face blocks, stairs and a
// ramp climb, a short drop lands on the feet, a tall one hurts and lands on the stomach, a pulled-up ladder is lowered
// from the top and climbed, a ladder climbed down. Shots: /tmp/look/terrain-*.png
// node scripts/terrain.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(process.argv[2] || 'http://localhost:4199/'); await page.waitForTimeout(900);
await page.evaluate(() => { const g = game; g.loop = () => {}; g.audio.play = () => {}; g.training = true; g.start('knight'); for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none'; window.__shots = {}; });
const shot = async (name, cam) => { await page.evaluate(([name, cam]) => { const g = game, p = g.player, c = g.camera; g.camLock = true; if (cam) { c.position.set(p.pos.x + cam[0], p.gy + cam[1], p.pos.z + cam[2]); c.lookAt(p.pos.x, p.gy + 0.9, p.pos.z); } else { g.updateCamera(1); } g.pixel.render(g.scene, c); }, [name, cam]); await page.screenshot({ path: `/tmp/look/terrain-${name}.png` }); };
const run = (fn, arg) => page.evaluate(fn, arg);
const r = {};
// heights
r.floors = await run(() => { const w = game.world; return { low: w.floorAt(0, -5), west: w.floorAt(-8, -15), stairMid: +w.floorAt(-4, -12.7).toFixed(2), east: w.floorAt(8, -15), rampMid: +w.floorAt(7, -6.25).toFixed(2), hill: +w.floorAt(-6.5, -3.5).toFixed(2) }; });
// helper: put him somewhere and push the stick for n frames (stick: screen x right, y up = north)
const walk = (o) => run(({ x, z, sx, sy, n, roll }) => { const g = game, p = g.player; if (x != null) { p.pos.set(x, 0, z); p.gy = g.world.floorAt(x, z); p.setState('move'); p.st = p.maxSt; p.hp = p.maxHp; } g.input.move = () => ({ x: sx, y: sy }); if (roll) g.input.pressed.add('roll'); const states = []; let maxGy = -9, minGy = 9; for (let i = 0; i < n; i++) { g.step(1 / 60, 1 / 60); if (states[states.length - 1] !== p.state) states.push(p.state); maxGy = Math.max(maxGy, p.gy); minGy = Math.min(minGy, p.gy); } g.input.move = () => ({ x: 0, y: 0 }); return { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), gy: +p.gy.toFixed(2), state: p.state, states, hpLost: Math.round(p.maxHp - p.hp), maxGy: +maxGy.toFixed(2) }; }, o);
r.faceBlocks = await walk({ x: -2, z: -18, sx: -1, sy: 0, n: 90 });
r.upStairs = await walk({ x: -1.5, z: -12.7, sx: -1, sy: 0, n: 100 });
await shot('top-west', [5, 5, 7]);
r.offLow = await walk({ x: -9.5, z: -8.7, sx: 0, sy: -1, n: 14 });
await shot('fall', [4, 2, 5]);
r.offLowAir = await walk({ sx: 0, sy: 0, n: 7 });
await shot('falling', [3.5, 1.5, 3.5]);
r.offLowLand = await run(() => { const g = game, p = g.player; let i = 0; while (p.state !== 'land' && i++ < 60) g.step(1 / 60, 1 / 60); g.step(1 / 60, 1 / 60); g.step(1 / 60, 1 / 60); g.step(1 / 60, 1 / 60); g.step(1 / 60, 1 / 60); return p.state; });
await shot('land', [3.5, 1.5, 3.5]);
r.offLowEnd = await walk({ sx: 0, sy: 0, n: 60 });
r.upRamp = await walk({ x: 7, z: -4, sx: 0, sy: 1, n: 160 });
// the pulled-up ladder: stand at its top, lower it
r.ladderTop = await run(() => { const g = game, p = g.player, w = g.world, L = w.terrain.ladders[1]; p.pos.set(L.top.x + 0.3, 0, L.top.z); p.gy = w.floorAt(p.pos.x, p.pos.z); const raised = !!w.terrain.raisedAt(p.pos.x, p.pos.z, p.gy); g.input.pressed.add('interact'); g.step(1 / 60, 1 / 60); for (let i = 0; i < 60; i++) g.step(1 / 60, 1 / 60); return { raisedSeen: raised, nowRaised: L.raised, pivot: +L.pivot.rotation.x.toFixed(2) }; });
await shot('ladder-lowered', [-4, 3, 5]);
// off the high edge (west face of the east terrace)
r.offHigh = await walk({ x: 6, z: -19, sx: -1, sy: 0, n: 30 });
r.offHighLand = await walk({ sx: 0, sy: 0, n: 40 });
await shot('prone', [-1.5, 2.2, 3.2]);
r.offHighEnd = await walk({ sx: 0, sy: 0, n: 80 });
// climb the lowered ladder from its foot
r.climbUp = await run(() => { const g = game, p = g.player, L = g.world.terrain.ladders[1]; p.pos.set(L.foot.x - 0.3, 0, L.foot.z); p.gy = 0; p.setState('move'); g.input.move = () => ({ x: 1, y: 0 }); const states = []; let mid = null; for (let i = 0; i < 200; i++) { g.step(1 / 60, 1 / 60); if (states[states.length - 1] !== p.state) states.push(p.state); if (p.state === 'climb' && !mid && p.gy > 1.6) { mid = 1; window.__mid = true; } if (p.state === 'climb' && p.gy > 1.6 && p.gy < 2) break; } return { states, gy: +p.gy.toFixed(2) }; });
await shot('climb', [-3.5, 1.2, 3.5]);
r.climbUpEnd = await walk({ sx: 1, sy: 0, n: 120 });
// down the west ladder from its top
r.climbDown = await run(() => { const g = game, p = g.player, L = g.world.terrain.ladders[0]; p.pos.set(L.top.x, 0, L.top.z - 0.3); p.gy = g.world.floorAt(p.pos.x, p.pos.z); p.setState('move'); g.input.move = () => ({ x: 0, y: -1 }); const states = []; for (let i = 0; i < 160; i++) { g.step(1 / 60, 1 / 60); if (states[states.length - 1] !== p.state) states.push(p.state); } g.input.move = () => ({ x: 0, y: 0 }); return { states, gy: +p.gy.toFixed(2), z: +p.pos.z.toFixed(2) }; });
// the whole patch from above
await run(() => { const g = game, c = g.camera; g.camLock = true; c.position.set(0, 20, 8); c.lookAt(0, 0, -13); g.pixel.render(g.scene, c); });
await page.screenshot({ path: '/tmp/look/terrain-overview.png' });
for (const [k, v] of Object.entries(r)) console.log(k.padEnd(12), JSON.stringify(v));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
