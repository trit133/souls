// The Sump Lines' heavies, toned down: the Bilge Hulk's charge (surge) has an 8 s cooldown; the Promethium Torcher's
// flame does less (4 a tick) and only flinches you briefly (0.15 s, not restarted by each tick), so you can act
// through it. node scripts/sumpnerf.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 900, height: 560 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(900);
const out = await page.evaluate(() => {
  const g = game, o = {}; g.audio.play = () => {};
  g.accounts.data = g.accounts.data || { gems: {}, raids: {}, stats: { wins: 0, runs: 0 } }; g.accounts.data.stats ||= { wins: 0, runs: 0 };
  g.start('knight'); g.buildRun({ raid: 'r1a2' }, 7, 1);
  const p = g.player; p.hp = p.maxHp = 1e6;
  const all = [...g.enemies, ...g.reserves];
  const hulk = all.find((e) => e.T.name === 'Bilge Hulk'), torch = all.find((e) => e.T.name === 'Promethium Torcher');
  // the Hulk, 6 m off (the charge's range): how often does it pick the charge, right after one and once 8 s are past?
  const picks = (n) => { let c = 0; for (let i = 0; i < n; i++) if (hulk.chooseMove(6, false) === 'surge') c++; return c; };
  hulk.usedAt = { surge: g.time }; o.surgeRightAfter = picks(200);
  hulk.usedAt = { surge: g.time - 8.1 }; o.surgeAfter8s = picks(200);
  // the Torcher's flame on you: how long you're held, the longest flinch, and the damage
  const step = (n) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
  for (const e of all) if (e !== torch) { e.alive = false; e.pos.set(999, 0, 999); }
  torch.pos.set(p.pos.x, 0, p.pos.z + 3); torch.yaw = torch.yawTo(p.pos); torch.setState('chase'); torch.cd = 99;
  p.setState('move'); const hp0 = p.hp; let hurtFrames = 0, run = 0, longest = 0;
  torch.startAttack(torch.T.moves.gout);
  for (let i = 0; i < 150; i++) { torch.yaw = torch.yawTo(p.pos); step(1); if (p.state === 'hurt') { hurtFrames++; run++; longest = Math.max(longest, run); } else run = 0; }
  o.flame = { dmg: Math.round(hp0 - p.hp), heldFor: +(hurtFrames / 60).toFixed(2), longestFlinch: +(longest / 60).toFixed(2) };
  return o;
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(16), JSON.stringify(v));
const ok = out.surgeRightAfter === 0 && out.surgeAfter8s > 0 && out.flame.longestFlinch <= 0.2;
console.log(ok ? 'all passed' : 'FAILED');
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
