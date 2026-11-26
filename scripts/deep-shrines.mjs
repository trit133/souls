// The Sunless Deep's three new shrines worked through solo: the Ore Cart (stand by it and it rolls home), the Lantern
// Run (fetch it, get struck and drop it, pick it up again, carry it home), the Prism (turn each mirror to its mark).
// Each raid's draw is found that has the shrine. node scripts/deep-shrines.mjs [url]
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await page.goto(process.argv[2] || 'http://localhost:5180/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 });
const res = {};
for (const [area, kind] of [['r2a1', 'cart'], ['r2a2', 'lantern'], ['r2a3', 'prism']]) {
  res[kind] = await page.evaluate(({ area, kind }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    const A = (window.__AREAS ||= null);
    try { g.start('knight'); g.buildRun({ raid: area }, 4242, 1); } catch (err) { return 'build failed: ' + err.message; }
    const p = g.player; p.hp = p.maxHp = 1e9;
    const s = g.seals.list.find((x) => x.def.kind === kind); if (!s) return 'no ' + kind + ' this draw';
    const d = s.def, out = { at: [Math.round(d.x), Math.round(d.z)] };
    const go = (x, z) => { p.pos.set(x, 0, z); p.gy = g.world.floorAt(x, z); p.setState('move'); g.lastGood = null; };
    const run = (n, fn) => { for (let i = 0; i < n; i++) { fn?.(i); g.step(1 / 60, 1 / 60); p.hp = p.maxHp; if (s.state === 'broken') return i; } return -1; };
    if (kind === 'cart') {
      out.len = +d.cart.len.toFixed(1);
      out.frames = run(60 * 40, () => { const c = g.seals.cartPos(d); go(c.x + 1.2, c.z + 0.6); for (const e of g.enemies) if (e.alive && !e.T.still && e.distTo(p) < 6) e.die(true); });
    } else if (kind === 'lantern') {
      const L = d.lantern; go(L.hook.x, L.hook.z); run(30); out.picked = L.state;
      p.hp -= 10; run(5); out.dropped = L.state; run(90, () => go(L.x, L.z)); out.again = L.state;
      out.frames = run(60 * 40, () => { const dx = d.x - p.pos.x, dz = d.z - p.pos.z, dd = Math.hypot(dx, dz); g.input.move = () => ({ x: dx / dd, y: -dz / dd }); for (const e of g.enemies) if (e.alive && !e.T.still && e.distTo(p) < 8) e.die(true); });
      g.input.move = () => ({ x: 0, y: 0 });
    } else {
      out.frames = 0;
      for (const m of d.prism.mirrors) { go(m.x + 1, m.z); const n = run(60 * 12, () => { for (const e of g.enemies) if (e.alive && !e.T.still && e.distTo(p) < 8) e.die(true); if (m.notch === m.want) p.pos.x += 50; }); if (n >= 0) out.frames = n; }
      out.right = d.prism.mirrors.map((m) => m.notch === m.want);
    }
    out.broken = s.state === 'broken';
    return out;
  }, { area, kind });
}
console.log(JSON.stringify(res, null, 1));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
await b.close();
