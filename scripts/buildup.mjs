// Status build-up on enemies: Rogue light hits into a swordsman until bleed procs, for an early, mid and full bleed
// tree, with no bleed resistance and with 8% and 25%; then the hits to the second proc. A hit fills at most 15% of
// the meter, and each 1% of resistance cuts build-up by 3%. node scripts/buildup.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
const out = await page.evaluate(() => {
  const g = game, o = {}; g.loop = () => {}; g.audio.play = () => {};
  g.start('rogue'); g.buildRun(['camp', 'boss'], 5, 1);
  const p = g.player, e = g.enemies.find((x) => x.type === 'grunt');
  const R = Math.random; Math.random = () => 0.99; // (no crits)
  for (const [name, tree] of [['early', { bleedDmg: 20, bleedPct: 25 }], ['mid', { bleedDmg: 100, bleedPct: 60 }], ['full', { bleedDmg: 230, bleedPct: 125 }]]) {
    for (const res of [0, 8, 25]) {
      p.tree = tree; e.def = { armor: 0, res: { bleed: res } }; e.status.reset(); e.maxHp = e.hp = 1e9; e.alive = true;
      const d = p.c.attacks.r1, procs = [];
      for (let i = 1; i <= 200 && procs.length < 2; i++) { e.state = 'chase'; const was = e.status.procd.bleed, m0 = e.status.meter.bleed; g.resolveHit(p, e, d.hits[0], d); if (e.status.meter.bleed < m0 || (!was && e.status.procd.bleed)) procs.push(i); }
      o[`${name} res ${res}%`] = { firstProc: procs[0] ?? '>200', secondProc: procs[1] ? procs[1] - procs[0] : '>200' };
    }
  }
  Math.random = R;
  return o;
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(16), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
