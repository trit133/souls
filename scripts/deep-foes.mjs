// The Sunless Deep's enemies, one of each type in an area, each fought alone for a while: the moves it used, its trick
// (a Creeper unseen in the dark, a Burrower under the floor, a Shade's copies, a Shardback's plates), no errors.
// node scripts/deep-foes.mjs <area> [url]
import { chromium } from 'playwright';
const area = process.argv[2] || 'r2a1';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await page.goto(process.argv[3] || 'http://localhost:5180/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 });
const types = await page.evaluate((area) => { const g = game; g.loop = () => {}; g.audio.play = () => {}; g.start('knight'); g.buildRun({ raid: area }, 4242, 1); return [...new Set(g.enemies.filter((e) => !e.T.still && e.pos.x < 300).map((e) => e.type))]; }, area);
const out = {};
for (const type of types) out[type] = await page.evaluate(({ area, type }) => {
  // a fresh draw each time, everything else dead: just this one (and a Shade's copies) and you
  const g = game; g.buildRun({ raid: area }, 4242, 1);
  const p = g.player; p.hp = p.maxHp = 1e9;
  const e = g.enemies.find((x) => x.type === type && x.pos.x < 300);
  for (const o of g.enemies) if (o !== e && !o.T.still) o.die(true);
  p.pos.set(e.pos.x + 4, 0, e.pos.z); p.gy = g.world.floorAt(p.pos.x, p.pos.z); p.setState('move'); g.lastGood = null;
  const moves = {}, flags = {}; let last = null; const hp0 = e.hp;
  for (let i = 0; i < 60 * 14; i++) {
    g.input.move = () => ({ x: 0, y: 0 });
    if (i % 120 === 60 && e.alive) e.receive({ dmg: e.maxHp * 0.08, poise: 5, srcPos: p.pos.clone(), attacker: p });
    g.step(1 / 60, 1 / 60); p.hp = p.maxHp;
    if (e.state === 'attack' && e.lastMove !== last) { last = e.lastMove; moves[last] = (moves[last] || 0) + 1; }
    if (e.state !== 'attack') last = null;
    if (e.rig.body.visible === false) flags.hidden = true;
    if (e.under) flags.under = true;
    if (e.split) flags.split = g.enemies.filter((o) => o.opts?.copyOf === e.opts?.shadeId).length;
    if (e.plates && (e.plates.front < 3 || e.plates.back < 3)) flags.plates = { ...e.plates };
    if (e.fleeT > 0) flags.fled = true;
  }
  const r = { moves, flags, dmgTaken: Math.round(hp0 - e.hp) };
  if (e.T.onDie && e.alive) { e.hp = 1; e.receive({ dmg: 99, srcPos: p.pos.clone(), attacker: p }); r.died = !e.alive; for (let i = 0; i < 90; i++) g.step(1 / 60, 1 / 60); }
  return r;
}, { area, type });
console.log(JSON.stringify(out, null, 1));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
await b.close();
