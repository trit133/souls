// Ashfall Ward (ward.js) seen whole and from the game's camera at its landmarks: the market, a causeway bridge, the
// canal, the terrace street, the Sunken Garden, the grand stair, the chapel plaza, the cemetery, the east ramp.
// Also checks the tiers' heights and that the player can walk from the gate to the Crest. /tmp/look/ward-*.png
// node scripts/look-ward.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(process.argv[2] || 'http://localhost:5180/'); await page.waitForTimeout(900);
const info = await page.evaluate(() => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  const t0 = performance.now();
  g.start('knight'); g.buildRun({ raid: 'r1a1' }, 4242, 1);
  const built = Math.round(performance.now() - t0);
  for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const p = g.player; p.hp = p.maxHp = 1e9;
  for (const e of [...g.enemies, ...g.reserves]) { if (e.T.still) continue; e.update = () => {}; }
  const w = g.world, f = (x, z) => +w.floorAt(x, z).toFixed(2);
  return { built, floors: { gate: f(0, 44), market: f(1, 22), canal: f(0, 9), bridge: f(-22, 9), terrace: f(-5, 0), garden: f(6, -15), bank: f(6, -7.5), crest: f(3, -27), cemetery: f(-30, -34), ramp: f(42, -24) },
    reach: (() => { const D = w.dungeon, bad = []; const chk = (what, x, z) => { if (x > 300) return; if (!D.reach(x, z) || !w.walkable(x, z, 0.3)) bad.push(what + '@' + Math.round(x) + ',' + Math.round(z)); };
      for (const e of g.enemies) if (!e.reserve && !e.T?.still) chk(e.type, e.pos.x, e.pos.z);
      for (const st of D.stairs) chk('stair', st.x, st.z + (st.down ? 1.2 : 0));
      for (const c of w.chests) { const ok = [[0, 1.2], [0, -1.2], [1.2, 0], [-1.2, 0]].some(([a, b2]) => D.reach(c.x + a, c.z + b2) && w.walkable(c.x + a, c.z + b2, 0.3)); if (!ok && c.x < 300) bad.push('chest@' + Math.round(c.x) + ',' + Math.round(c.z)); } for (const d of w.drums) { const ok = [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]].some(([a, b]) => D.reach(d.x + a, d.z + b) && w.walkable(d.x + a, d.z + b, 0.3)); if (!ok) bad.push('drum@' + Math.round(d.x) + ',' + Math.round(d.z)); }
      for (const sl of w.seals) if (sl.x < 300) chk('shrine', sl.x, sl.z + 2.5);
      return bad; })(),
    enemies: g.enemies.length, chests: w.chests.length, drums: w.drums.length, seals: w.seals.map((s) => s.kind + '@' + Math.round(s.x) + ',' + Math.round(s.z)), ladders: w.terrain.ladders.length };
});
console.log(JSON.stringify(info));
// the whole ward, from high to the south
await page.evaluate(() => { const g = game, c = g.camera; g.camLock = true; g.player.pos.set(0, 0, 0); window.__lit = []; g.scene.traverse((o) => { if (o.isLight && !o.isPointLight) { window.__lit.push([o, o.intensity]); o.intensity *= 4; } }); c.position.set(0, 62, 66); c.lookAt(0, 0, -6); g.world.update(1 / 60, 1, g.fx, { x: 0, z: 0 }); g.world.dungeon.update(1 / 60, 1, { x: 0, z: 60 }); g.pixel.render(g.scene, c); });
await page.screenshot({ path: '/tmp/look/ward-overview.png' });
await page.evaluate(() => { for (const [o, i] of window.__lit) o.intensity = i; });
const SPOTS = [['houses-west', -30, 33], ['houses-east', 25, 27], ['house-in', -22, 24], ['h8', 21, 6], ['crest-houses', 30, -31], ['market', 1, 30], ['bridge', -22, 12.5], ['canal', -8, 9.5], ['terrace', -6, 1], ['garden', 6, -9], ['stair', -11, -18.5], ['plaza', 3, -21.5], ['cemetery', -30, -30], ['ramp', 42, -16]];
for (const [name, x, z] of SPOTS) {
  await page.evaluate(([x, z]) => {
    const g = game, p = g.player; g.camLock = false;
    p.pos.set(x, 0, z); p.gy = g.world.floorAt(x, z); p.setState('move'); p.yaw = Math.PI; g.lastGood = null; g.camPos?.set(x, 14, z + 12);
    for (let i = 0; i < 50; i++) g.step(1 / 60, 1 / 60);
    g.pixel.render(g.scene, g.camera);
  }, [x, z]);
  await page.screenshot({ path: `/tmp/look/ward-${name}.png` });
}
// walk it: gate north to the Crest by the west bridge and the grand stair (steering at waypoints)
const walk = await page.evaluate(() => {
  const g = game, p = g.player; p.pos.set(0, 0, 44); p.gy = 0; p.setState('move'); g.lastGood = null;
  for (const e of [...g.enemies, ...g.reserves]) { e.alive = false; e.rig.root.visible = false; }
  const way = [[0, 34], [-14, 30], [-14, 16], [-22, 13], [-22, 5], [-11, 0], [-11, -18], [-11, -27], [3, -28]], seen = [];
  for (const [tx, tz] of way) {
    for (let i = 0; i < 600; i++) {
      const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.6) break;
      // screen stick: x right (+x), y up (-z)
      g.input.move = () => ({ x: dx / d, y: -dz / d }); g.step(1 / 60, 1 / 60);
      if (p.state !== 'move') seen.push(p.state);
    }
    seen.push(`${tx},${tz}:${Math.round(p.pos.x)},${Math.round(p.pos.z)}@${p.gy.toFixed(1)}`);
  }
  g.input.move = () => ({ x: 0, y: 0 });
  return seen;
});
console.log('walk', walk.join(' '));
// the canal's shortcut: lowered from the Terraces, then climbed from the canal bed; and the 4 m drop into the garden
const lad = await page.evaluate(() => {
  const g = game, p = g.player, w = g.world, L = w.terrain.ladders[0], out = {};
  p.pos.set(L.top.x, 0, L.top.z - 0.4); p.gy = w.floorAt(p.pos.x, p.pos.z); p.setState('move'); for (let i = 0; i < 3; i++) g.step(1 / 60, 1 / 60);
  out.prompt = !!w.terrain.raisedAt(p.pos.x, p.pos.z, p.gy); g.input.pressed.add('interact'); g.step(1 / 60, 1 / 60); out.lowered = !L.raised;
  p.pos.set(L.foot.x, 0, L.foot.z + 0.5); for (let i = 0; i < 3; i++) g.step(1 / 60, 1 / 60); out.inCanal = +p.gy.toFixed(1);
  g.input.move = () => ({ x: 0, y: 1 }); const st = []; for (let i = 0; i < 260; i++) { g.step(1 / 60, 1 / 60); if (st[st.length - 1] !== p.state) st.push(p.state); }
  out.climb = st.join('>'); out.top = +p.gy.toFixed(1);
  p.pos.set(6, 0, -21.5); p.gy = w.floorAt(6, -21.5); p.setState('move'); p.hp = p.maxHp = 1000; g.input.move = () => ({ x: 0, y: -1 });
  const s2 = []; for (let i = 0; i < 120; i++) { g.step(1 / 60, 1 / 60); if (s2[s2.length - 1] !== p.state) s2.push(p.state); }
  g.input.move = () => ({ x: 0, y: 0 }); out.drop = s2.join('>'); out.dropHp = Math.round(1000 - p.hp); out.dropAt = +p.gy.toFixed(1);
  return out;
});
console.log('ladder', JSON.stringify(lad));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
