// The training arena: a ring with one training dummy, no other enemies. The dummy never attacks, never breaks (a
// blow that would finish it fills it again) and heals in full 3 s after the last hit; no gold, no run counted.
// The pause menu's button reads "Back to the Sanctum". Screenshots: /tmp/training-*.png
// node scripts/training.mjs [url with ?server=]
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [];
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(URL); await page.waitForTimeout(500);

const res = await page.evaluate(() => {
  const g = game, out = {}; g.audio.play = () => {};
  const run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(1 / 60, 1 / 60); };
  g.training = true; g.start('knight');
  const p = g.player;
  out.area = g.areaName;
  out.enemies = g.enemies.map((e) => e.type);
  const d = g.enemies[0];
  out.dist = +Math.hypot(p.pos.x - d.pos.x, p.pos.z - d.pos.z).toFixed(1);
  out.walkable = g.world.walkable(p.pos.x, p.pos.z, 0.4);
  out.progressHidden = document.getElementById('progress').classList.contains('hidden');
  out.quitLabel = document.getElementById('restart').textContent;
  // hit it hard, over and over: it never dies
  const atk = p.c.attacks.t1 || Object.values(p.c.attacks)[0];
  let low = d.maxHp;
  for (let i = 0; i < 40; i++) { g.resolveHit(p, d, { ...atk.hits[0], dmg: d.maxHp / 7 }, atk); run(0.05); low = Math.min(low, d.hp); }
  out.alive = d.alive; out.dropped = low < d.maxHp; out.gold = g.runGold;
  run(3.3); out.healed = d.hp === d.maxHp;
  // it never attacks: stand next to it for a while
  const hp0 = p.hp; p.pos.set(d.pos.x, 0, d.pos.z + 1.2); run(4); out.untouched = p.hp >= hp0;
  p.pos.set(d.pos.x + 1.5, 0, d.pos.z + 4.5); p.yaw = Math.PI;
  return out;
});
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/training-arena.png' });
await page.evaluate(() => { const g = game, p = g.player, d = g.enemies[0]; const a = p.c.attacks.t1 || Object.values(p.c.attacks)[0]; g.resolveHit(p, d, { ...a.hits[0] }, a); });
await page.waitForTimeout(120);
await page.screenshot({ path: '/tmp/training-hit.png' });
await page.evaluate(() => game.toTitle());
res.after = await page.evaluate(() => ({ training: game.training, layout: game.newLayout() }));

for (const [k, v] of Object.entries(res)) console.log(k.padEnd(15), JSON.stringify(v));
const ok = res.area === 'The Proving Ring' && res.enemies.join() === 'dummy' && res.walkable && res.progressHidden && res.quitLabel === 'Back to the Sanctum'
  && res.alive && res.dropped && res.gold === 0 && res.healed && res.untouched && !res.after.training && !Array.isArray(res.after.layout);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(ok && !errs.length ? 'PASS' : 'FAIL');
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
