// Retheme guard: a fingerprint of everything gameplay can touch in the generated levels (walkable shapes, solids,
// obstacles, slow zones, gates, enemy spawns and positions, seals, encounters) for several dungeons and the chain
// to Varek. Run before and after a visual change: the hashes must match. node scripts/layout-fingerprint.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 320, height: 200 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
const out = await page.evaluate(() => {
  const g = game, res = {};
  const h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16); };
  const r2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
  const snap = () => {
    const W = g.world;
    const shapes = W.mods.flatMap((m) => []).concat(Object.values(W.buckets || {}).length ? [] : []);
    return JSON.stringify({
      solids: W.solids.map((s) => [s.x0, s.x1, s.z0, s.z1].map(r2)),
      obs: W.obstacles.map((o) => [o.x, o.z, o.r].map(r2)),
      slows: W.slows.map((s) => [s.x, s.z, s.r, s.f].map(r2)),
      gates: Object.values(W.gates).map((q) => [q.id, r2(q.x), r2(q.z), q.open]),
      spawns: W.spawns.map((s) => [s.type, r2(s.x), r2(s.z), r2(s.yaw), s.mod]),
      enemies: [...g.enemies, ...g.reserves].map((e) => [e.type, r2(e.pos.x), r2(e.pos.z), e.maxHp, e.elite || '', JSON.stringify(e.def)]),
      seals: (W.seals || []).map((s) => [s.kind, r2(s.x), r2(s.z)]),
      encs: W.encounters.map((e) => [e.id, r2(e.arena.x), r2(e.arena.z), e.arena.r]),
      walk: (() => { let c = 0, t = 0; for (let x = -160; x <= 160; x += 2.5) for (let z = -200; z <= 160; z += 2.5) { t++; if (W.walkable(x, z, 0.42, null, true)) c += x * 7 + z * 13 + 1; } return c; })(),
    });
  };
  for (const seed of [11, 222, 3333]) for (const act of [0, 1, 2]) {
    g.start('knight'); g.buildRun('dungeon', seed, 1); if (act) g.buildAct(act);
    res[`dungeon s${seed} a${act}`] = h(snap());
  }
  g.start('knight'); g.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
  res.chain = h(snap());
  return res;
});
await b.close();
console.log(JSON.stringify(out));
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
