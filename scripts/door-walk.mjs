// The mini boss door: shut, you can't walk through it; once three seals break you walk straight through into the
// arena (several dungeons, all three acts' first maps). node scripts/door-walk.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
const out = await page.evaluate(() => {
  const g = game, res = []; g.audio.play = () => {};
  for (let k = 0; k < 6; k++) {
    g.start('knight'); if (k % 3) g.buildAct(k % 3);
    const p = g.player; p.hp = p.maxHp = 1e6; for (const e of g.enemies) { e.cd = 99; e.update = () => {}; } // (killing them would break the elite and altar seals)
    const S = g.seals, enc = S.enc, gate = g.world.gates[enc.gateIn], A = enc.arena;
    const dx = A.x - gate.x, dz = A.z - gate.z, L = Math.hypot(dx, dz);
    const walk = () => { p.pos.set(gate.x - dx / L * 4, 0, gate.z - dz / L * 4); g.lastGood = null; p.setState('move'); g.input.move = () => ({ x: dx / L, y: -dz / L }); for (let i = 0; i < 150; i++) g.step(1 / 60, 1 / 60); return +Math.hypot(p.pos.x - A.x, p.pos.z - A.z).toFixed(1); };
    const wasOpen = gate.open, sealedAtStart = enc.sealed;
    const shut = walk();
    enc.active = false; g.resetEncounters();
    for (const s of S.list.slice(0, 3)) s.state = 'broken'; g.step(1 / 60, 1 / 60);
    const open = walk();
    res.push({ wasOpen, sealedAtStart, act: g.act, gateToArena: +L.toFixed(1), shutStopsAt: shut, openReaches: open, passedDoor: open < L - 1, blockedShut: shut > L });
  }
  return res;
});
await b.close();
for (const r of out) console.log(JSON.stringify(r));
console.log(out.every((r) => r.passedDoor && r.blockedShut) ? 'all doors pass when open and block when shut' : 'DOOR PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
