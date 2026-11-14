// Party sync in a raid: the host's enemies on the guest's screen move smoothly even when the snapshots arrive in
// bunches (held back and let through every 300 ms here), and keep up with where the host has them; a host's hit on
// the guest counts only when the guest really is in the enemy's reach. node scripts/netsync.mjs [url with ?server=]
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [];
const device = async (n) => {
  const page = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + '\n' + e.stack));
  await page.goto(URL); await page.waitForTimeout(500);
  return page;
};
const auth = async (p, u) => { await p.click('#btn-herm'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const log = (k, v) => console.log(k.padEnd(13), JSON.stringify(v));
const A = await device('A'), B = await device('B');
const wait = (ms) => A.waitForTimeout(ms);
const u = 'n' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');
await A.click('#hm-party'); await A.click('#lobby-create'); await wait(400);
const code = await A.textContent('#lobby-code');
await B.click('#hm-party'); await B.fill('#lobby-input', code); await B.click('#lobby-joinbtn'); await wait(400);
await A.click('#lobby-start'); await wait(2500);
const res = {};

// 1. the host walks one grunt back and forth by hand (everything else asleep); both players stand by it
const setup = await A.evaluate(() => {
  const g = game, e = g.enemies.find((x) => x.alive && !x.reserve && x.type === 'grunt');
  g.player.hp = g.player.maxHp = 1e7;
  for (const x of g.enemies) if (x !== e) x.update = () => {};
  const x0 = e.pos.x, z0 = e.pos.z;
  e.update = function (dt) { this.walkT = (this.walkT || 0) + dt; this.pos.x = x0 + Math.sin(this.walkT * 1.2) * 3; this.pos.z = z0; this.state = 'chase'; };
  g.player.pos.set(x0, 0, z0 + 8); g.lastGood = null;
  window.__e = e.netId;
  return { id: e.netId, x0, z0 };
});
await B.evaluate((s) => { game.player.hp = game.player.maxHp = 1e7; game.player.pos.set(s.x0 + 2, 0, s.z0 + 8); game.lastGood = null; }, setup);
await wait(1200);

// 2. the guest's link bunches the snapshots: held, then let through together every 300 ms; sample the puppet each frame
const track = await B.evaluate(async (id) => {
  const g = game, mp = g.mp, real = mp.handle.bind(mp), held = [];
  mp.handle = (from, d) => (d.t === 'snap' ? held.push([from, d]) : real(from, d));
  const flush = setInterval(() => { for (const [f, d] of held.splice(0)) real(f, d); }, 300);
  const e = g.netMap[id], xs = [];
  await new Promise((ok) => { const f = () => { xs.push([performance.now(), e.pos.x]); if (xs.length < 240) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
  clearInterval(flush); mp.handle = real;
  // a pause: a run of frames where it doesn't move while it should be walking (the host walks it ~3.6 m/s at most)
  let still = 0, worst = 0, jump = 0;
  for (let i = 1; i < xs.length; i++) {
    const d = Math.abs(xs[i][1] - xs[i - 1][1]), dt = (xs[i][0] - xs[i - 1][0]) / 1000;
    jump = Math.max(jump, d / Math.max(dt, 1e-3));
    still = d < 1e-3 ? still + dt : 0; worst = Math.max(worst, still);
  }
  return { frames: xs.length, longestPause: +worst.toFixed(3), fastest: +jump.toFixed(1) };
}, setup.id);
res.bunched = track;

// 3. how far behind the host the guest draws it (sampled together)
const gaps = [];
for (let i = 0; i < 6; i++) {
  const [h, gx] = await Promise.all([A.evaluate(() => game.netMap[window.__e].pos.x), B.evaluate((id) => game.netMap[id].pos.x, setup.id)]);
  gaps.push(+Math.abs(h - gx).toFixed(2)); await wait(150);
}
res.gapToHost = gaps;

// 4. hits: the host's grunt swings at the guest. In reach on the guest's screen: it lands; out of reach: it doesn't
const hit = async (near) => {
  await A.evaluate(() => { const e = game.netMap[window.__e]; e.update = () => {}; });
  const at = await A.evaluate(() => { const e = game.netMap[window.__e]; return [e.pos.x, e.pos.z]; });
  await B.evaluate(([x, z, near]) => { const p = game.player; p.pos.set(x, 0, z + (near ? 1.2 : 6)); p.iframe = () => false; p.status?.reset?.(p.resist); p.hp = p.maxHp; game.lastGood = null; }, [...at, near]);
  await wait(300);
  const hp0 = await B.evaluate(() => game.player.hp);
  // the host still has the guest standing right in front of it (its view is a moment old)
  await A.evaluate(() => { const e = game.netMap[window.__e], r = [...game.mp.peers.values()][0], def = e.T.moves.slash; r.pos.set(e.pos.x, 0, e.pos.z + 1.2); e.yaw = e.yawTo(r.pos); e.atkKey = 'slash'; game.resolveHit(e, r, def.hits[0], def); });
  await wait(500);
  return hp0 - await B.evaluate(() => game.player.hp);
};
res.hitNear = await hit(true);
res.hitFar = await hit(false);

// 5. the host's frame rate drops to ~8 fps: its world still runs at real speed
res.hostSlow = await A.evaluate(async () => {
  const g = game, t0 = g.time, w0 = performance.now(), raf = window.requestAnimationFrame;
  const end = w0 + 1500; while (performance.now() < end) { const s = performance.now(); while (performance.now() - s < 120); await new Promise((r) => setTimeout(r, 0)); }
  return { wall: +((performance.now() - w0) / 1000).toFixed(2), game: +(g.time - t0).toFixed(2), raf: !!raf };
});
// 6. hit-stop on the host doesn't stop its world
res.hostHitstop = await A.evaluate(async () => { const g = game, t0 = g.time; g.hitstop(0.4); await new Promise((r) => setTimeout(r, 400)); return +(g.time - t0).toFixed(2); });

await b.close();
for (const [k, v] of Object.entries(res)) log(k, v);
const ok = res.bunched.longestPause < 0.12 && res.bunched.fastest < 12 && Math.max(...res.gapToHost) < 1.2
  && res.hitNear > 0 && res.hitFar === 0 && res.hostSlow.game > res.hostSlow.wall * 0.85 && res.hostHitstop > 0.25;
console.log(ok ? 'net sync works' : 'NET SYNC PROBLEM');
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
