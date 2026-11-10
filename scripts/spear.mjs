// Spearmen's jabs: a red glint up the spear at 0.3 s, a deep pull-back, and the jab landing at about 0.76 s
// (the double's first at 0.77, its second at 1.13). Screenshot of the wind-up: /tmp/spear-windup.png.
// node scripts/spear.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
const out = {};
for (const move of ['thrust', 'double']) {
  out[move] = await page.evaluate(async (move) => {
    const g = game; g.audio.play = () => {}; g.start('knight');
    const p = g.player; p.hp = p.maxHp = 1e6;
    const e = g.enemies.find((x) => x.type === 'spear');
    for (const x of g.enemies) if (x !== e) x.die(true);
    p.pos.set(e.pos.x, 0, e.pos.z + 2.6); e.yaw = 0; e.target = p; e.alert?.();
    for (let i = 0; i < 20; i++) g.step(1 / 60, 1 / 60);
    e.cd = 99; e.startAttack(e.T.moves[move]); e.atkKey = move;
    const hits = []; let glintAt = null, hp = p.hp, n0 = g.fx.add.count ?? null;
    for (let i = 0; i < 130; i++) {
      p.setState('move');
      g.step(1 / 60, 1 / 60);
      if (glintAt == null && e.flashTimeSeen !== 1 && e.rig.flashT > 0) glintAt = +(e.t ?? (i / 60)).toFixed(2);
      if (p.hp < hp) { hits.push(+((i + 1) / 60).toFixed(2)); hp = p.hp; }
      if (move === 'thrust' && i === 30) { g.pixel.render(g.scene, g.camera); window.__shot = true; }
    }
    return { glintAt, hits };
  }, move);
  if (move === 'thrust') {
    await page.evaluate(() => { const g = game, e = g.enemies.find((x) => x.type === 'spear' && x.alive); e.startAttack(e.T.moves.thrust); for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera); });
    await page.screenshot({ path: '/tmp/spear-windup.png' });
  }
}
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(8), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
