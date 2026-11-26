// A Sunless Deep boss fought for a while (the player can't die and swings now and then): which moves he used, his
// states, his own mechanics firing, no errors; then he's killed and his gem (or the victory) comes.
// node scripts/deep-boss.mjs <area> [seconds] [url]     area: r2a1 | r2a2 | r2a3 | r2f
import { chromium } from 'playwright';
const area = process.argv[2] || 'r2a1', secs = +(process.argv[3] || 40);
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await page.goto(process.argv[4] || 'http://localhost:5180/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 });
const out = await page.evaluate(({ area, secs }) => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.accounts.data = g.accounts.data || { gems: {}, raids: {}, stats: { wins: 0 }, items: {} }; g.accounts.data.stats ||= { wins: 0 };
  g.start('knight'); g.buildRun({ raid: area }, 777, 1);
  const p = g.player; p.hp = p.maxHp = 1e9;
  const enc = g.encounters.find((e) => e.kind === 'mini' || e.kind === 'boss');
  if (enc.sealed) { enc.sealed = false; g.world.setGate(enc.gateIn, true, false); }
  for (const e of g.enemies) if (!e.T.still && e.alive && Math.hypot(e.pos.x - enc.arena.x, e.pos.z - enc.arena.z) > enc.arena.r + 4) e.die(true);
  p.pos.set(enc.arena.x, 0, enc.arena.z + enc.arena.r - 3); p.gy = g.world.floorAt(p.pos.x, p.pos.z); p.setState('move'); g.lastGood = null;
  const B = enc.boss, moves = {}, states = {}, flags = {};
  let last = null;
  for (let i = 0; i < 60 * secs; i++) {
    // the player keeps near him and swings now and then
    const dx = B.pos.x - p.pos.x, dz = B.pos.z - p.pos.z, d = Math.hypot(dx, dz);
    g.input.move = () => (d > 3 ? { x: dx / d, y: -dz / d } : { x: 0, y: 0 });
    if (i % 50 === 0 && d < 4 && p.state === 'move') p.yaw = Math.atan2(dx, dz), g.input.pressed?.add?.('light');
    if (i % 90 === 0 && d < 4) B.receive({ dmg: B.maxHp * 0.012, poise: 10, srcPos: p.pos.clone(), attacker: p });
    g.step(1 / 60, 1 / 60);
    if (B.state === 'attack' && B.atk && B.lastMove !== last) { last = B.lastMove; moves[last] = (moves[last] || 0) + 1; }
    if (B.state !== 'attack') last = null;
    states[B.state] = (states[B.state] || 0) + 1;
    for (const k of ['snuffT', 'lanternBroke', 'under', 'exposed', 'inMirror', 'echoes', 'lava', 'shell', 'phase2']) if (B[k]) flags[k] = true;
    if (i === 60 * secs * 0.5) B.hp = B.maxHp * 0.45; // (into his second phase)
    if (i === Math.floor(60 * secs * 0.8)) B.hp = B.maxHp * 0.2;
    p.hp = p.maxHp;
  }
  const active = enc.active, gems0 = { ...(g.accounts.data.gems || {}) };
  B.hp = 1; B.receive({ dmg: 1e7, poise: 999, srcPos: p.pos.clone(), attacker: p }); if (B.alive) { B.hp = 0; B.die(); }
  for (let i = 0; i < 240; i++) g.step(1 / 60, 1 / 60);
  return { boss: B.cfg.id, hp: Math.round(B.maxHp), active, moves, states: Object.fromEntries(Object.entries(states).map(([k, v]) => [k, +(v / 60).toFixed(1)])), flags, defeated: enc.defeated, gems: Object.keys(g.accounts.data.gems || {}).filter((k) => (g.accounts.data.gems[k] || 0) > (gems0[k] || 0)) };
}, { area, secs });
console.log(JSON.stringify(out, null, 1));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
await b.close();
