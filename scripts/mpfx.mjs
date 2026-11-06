// Multiplayer effects: one device performs abilities, the other must show the same effects and body motion.
// Needs vite preview on :4173 and a test server: DB_PATH=/tmp/x.db PORT=4111 node server/index.js
import { chromium } from 'playwright';
const SRV = 'http://127.0.0.1:4111', URL = process.argv[2] || `http://localhost:4173/?server=${encodeURIComponent(SRV)}`;
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
const errs = [];
const device = async (n) => {
  const page = await (await b.newContext({ viewport: { width: 800, height: 450 } })).newPage();
  page.on('pageerror', (e) => errs.push(n + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto(URL); await page.waitForTimeout(500); return page;
};
const auth = async (p, u) => { await p.click('#btn-acct'); await p.fill('#acct-user', u); await p.fill('#acct-pass', 'secret123'); await p.click('#acct-signup'); await p.waitForTimeout(600); };
const A = await device('A'), B = await device('B'), u = 'fx' + Date.now() % 100000;
await auth(A, u + 'a'); await auth(B, u + 'b');
await A.click('#btn-mp'); await A.click('[data-pick=knight]'); await A.click('#lobby-create'); await A.waitForTimeout(400);
const code = await A.textContent('#lobby-code');
await B.click('#btn-mp'); await B.click('[data-pick=rogue]'); await B.fill('#lobby-input', code); await B.click('#lobby-joinbtn'); await B.waitForTimeout(400);
await A.click('#lobby-start'); await A.waitForTimeout(1500);
// B records every shared effect it plays, and what A's body does on B's screen
await B.evaluate(() => {
  window.got = []; const pv = game.playVfx.bind(game); game.playVfx = (n, a) => { window.got.push(n); pv(n, a); };
  window.seen = { spectral: false, maxY: 0, hidden: false, reverse: false };
  setInterval(() => { const r = [...game.mp.peers.values()][0]; if (!r) return; const s = window.seen;
    s.spectral ||= !!r.spectral?.visible; s.maxY = Math.max(s.maxY, r.y || 0); s.hidden ||= !r.rig.root.visible; s.reverse ||= !!r.rig.reverse; }, 16);
});
// A, host knight (evolved): shield charge, leaping slam, a knee crit on a knocked-down grunt, a heal, a block
await A.evaluate(() => {
  const p = game.player; p.evolved = true; p.buildSpectralShield(); p.hp = p.maxHp = 1e6; p.st = p.maxSt = 999;
  window.press = (a, held) => { game.input.pressed.add(a); };
});
const act = async (fn, ms) => { await A.evaluate(fn); await A.waitForTimeout(ms); };
await act(() => { const p = game.player; p.setState('move'); p.blocking = true; game.input.held.special = true; game.input.pressed.add('heavy'); setTimeout(() => { game.input.held.special = false; }, 120); }, 520);
await act(() => { game.input.pressed.add('attack'); }, 420);
await B.screenshot({ path: '/tmp/look/mpfx-slam-B.png' });
await A.waitForTimeout(600);
await act(() => {
  const p = game.player, g = game.enemies.find((e) => e.alive && e.type === 'grunt');
  g.hp = g.maxHp = 9999; p.pos.set(g.pos.x, 0, g.pos.z + 1.6); p.yaw = Math.PI; g.setState('parried'); p.setState('move'); p.startRiposte(g);
}, 1300);
await act(() => { const p = game.player; p.setState('move'); p.flasks = 3; game.input.pressed.add('heal'); }, 900);
// B, the rogue: shroud slash on a knocked-down grunt, seen from A
await A.evaluate(() => { window.got = []; const pv = game.playVfx.bind(game); game.playVfx = (n, a) => { window.got.push(n); pv(n, a); };
  window.seenB = { hidden: false }; setInterval(() => { const r = [...game.mp.peers.values()][0]; if (r) window.seenB.hidden ||= !r.rig.root.visible; }, 16); });
await B.evaluate(() => {
  const p = game.player; p.hp = p.maxHp = 1e6;
  const g = game.enemies.find((e) => e.alive && e.type === 'grunt');
  p.pos.set(g.pos.x, 0, g.pos.z + 1.6); p.yaw = Math.PI; p.setState('move');
  p.startRiposte(g, 1, (window.CRITS_SHROUD = p.constructor && null) || undefined);
});
await B.waitForTimeout(1500);
// A kills a grunt (normal hit) and another with a crit: B must see each one's dust poof
await B.evaluate(() => { window.poofs = 0; const pl = game.pfx.play.bind(game.pfx); game.pfx.play = (n, ...r) => { if (n === 'poof') window.poofs++; return pl(n, ...r); }; });
await A.evaluate(() => {
  const p = game.player, gs = game.enemies.filter((e) => e.alive && e.type === 'grunt');
  gs[0].receive({ dmg: 1e6, poise: 0, srcPos: p.pos, attacker: p });
  const g = gs[1]; g.hp = 1; p.pos.set(g.pos.x, 0, g.pos.z + 1.6); p.yaw = Math.PI; g.setState('parried'); p.setState('move'); p.startRiposte(g);
});
await A.waitForTimeout(1800);
console.log('B saw death poofs:', await B.evaluate(() => window.poofs), '(expect 2)');
const onB = await B.evaluate(() => ({ effects: [...new Set(window.got)], seen: window.seen }));
const onA = await A.evaluate(() => ({ effects: [...new Set(window.got)], seenB: window.seenB }));
console.log('B saw knight:', JSON.stringify(onB));
console.log('A saw rogue: ', JSON.stringify(onA));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].slice(0, 6).join('\n') : 'OK no errors');
