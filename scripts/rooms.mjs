// Engagement (one fighter per player, watchers every 10-15s), room-clear gates and
// payouts, no cross-room aggro, and per-section gold multipliers.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(process.argv[2] || 'http://localhost:4173/'); await page.waitForTimeout(500);
const res = await page.evaluate(() => {
  game.loop = () => {};
  const out = {};
  const LAYOUT = ['camp', 'ruins', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
  const step = (sec, fn) => { for (let i = 0; i < sec * 60; i++) { fn && fn(); let dt = 1 / 60; if (game.freeze > 0) { game.freeze -= dt; dt = 0; } else if (game.slow > 0) { game.slow -= dt; dt *= 0.35; } game.step(dt, 1 / 60); } };
  const fresh = () => { game.start('knight'); game.audio.play = () => {}; game.audio.remote = () => {}; game.buildRun(LAYOUT); game.input.move = () => ({ x: 0, y: 0 }); return game.player; };

  // 1) engagement: 4 grunts on one player for 45s
  let p = fresh();
  const m0 = game.world.mods[0];
  const crew = game.enemies.filter((e) => e.mod === 0 && e.type !== 'archer').slice(0, 4);
  for (const e of game.enemies) if (!crew.includes(e)) e.die();
  p.pos.set(0, 0, m0.z0 - 22); p.maxHp = p.hp = 1e6;
  crew.forEach((e, i) => { e.maxHp = e.hp = 1e6; e.pos.set(Math.cos(i * 1.6) * 3, 0, p.pos.z + Math.sin(i * 1.6) * 3); e.alert(); });
  const starts = new Map(crew.map((e) => [e, 0])); const last = new Map(); const dists = [];
  step(45, () => {
    p.hp = p.maxHp;
    for (const e of crew) {
      if (e.state === 'attack' && last.get(e) !== e.atk) { starts.set(e, starts.get(e) + 1); last.set(e, e.atk); }
      if (!e.engaged && e.state === 'chase' && e.watchCd > 0) dists.push(e.distTo(p));
    }
  });
  out.attacksPerEnemyIn45s = crew.map((e) => `${e.engaged ? 'FIGHTER' : 'watcher'}:${starts.get(e)}`);
  out.watcherDistance = dists.length ? [Math.min(...dists).toFixed(1), (dists.reduce((a, c) => a + c, 0) / dists.length).toFixed(1), Math.max(...dists).toFixed(1)] : null;
  out.engagedCount = crew.filter((e) => e.engaged).length;
  // hitting a watcher makes it the fighter
  const w = crew.find((e) => !e.engaged);
  w.receive({ dmg: 1, poise: 0, srcPos: p.pos, attacker: p }); step(0.2);
  out.hitWatcherBecomesFighter = w.engaged && crew.filter((e) => e.engaged).length === 1;

  // 2) rooms: exit locked until clear; gold paid on clear; next room can't aggro
  p = fresh();
  const g0 = game.world.gates.exit0;
  out.gateClosedAtStart = !g0.open;
  p.pos.set(0, 0, game.world.mods[0].z1 + 3); // right at room 1's exit
  game.input.move = () => ({ x: 0, y: 1 }); step(2, () => { p.hp = p.maxHp; }); game.input.move = () => ({ x: 0, y: 0 });
  out.blockedAtExit = p.pos.z > game.world.mods[0].z1;
  const next = game.enemies.filter((e) => e.mod === 1);
  out.nextRoomIgnoresYou = next.every((e) => e.state === 'idle' || e.state === 'sit');
  const room0 = game.enemies.filter((e) => e.mod === 0);
  const expect = room0.reduce((s, e) => s + (e.type === 'brute' ? 3 : 1), 0);
  room0.forEach((e) => e.die());
  out.potBeforeClearStep = game.runGold;
  step(0.1);
  out.clear = { gateOpen: g0.open, paid: game.runGold, expected: expect, toast: document.getElementById('toast').textContent };
  game.input.move = () => ({ x: 0, y: 1 }); step(2.5); game.input.move = () => ({ x: 0, y: 0 });
  out.walkedThrough = p.pos.z < game.world.mods[0].z1;

  // 3) brute = 3, section multipliers
  p = fresh();
  const brute = game.enemies.find((e) => e.type === 'brute'), grunt = game.enemies.find((e) => e.type === 'grunt' && e.mod === 0);
  game.onEnemyKilled(brute); game.onEnemyKilled(grunt);
  out.bruteAndGruntPot = [game.roomGold[brute.mod], game.roomGold[grunt.mod]];
  game.runGold = 0; game.secGold = [0, 0, 0, 0];
  const killMini = (i) => { const e = game.encounters.filter((x) => x.kind === 'mini')[i]; e.active = true; e.boss.setState('neutral'); e.boss.die(); };
  game.addRunGold(10); killMini(0);          // section 1: 10 + 15
  game.addRunGold(8); killMini(1);           // section 2: 8 + 20
  out.sections = [...game.secGold];
  game.accounts.data = game.accounts.data || { gold: 0, stats: { extracts: 0, goldEarned: 0, bestArea: 0 }, upgrades: {} };
  // win: Varek's 30 drop + section 4 bonus (×3 → +200%) banked straight away
  p = fresh(); game.runGold = 0; game.secGold = [0, 0, 0, 0]; game.minisFelled = 3;
  game.addRunGold(5);
  const enc = game.encounters.find((x) => x.kind === 'boss'); enc.active = true; enc.boss.setState('neutral'); enc.boss.die();
  out.win = { runBanked: game.runBanked, expected: 30 + Math.ceil(35 * 2) };
  return out;
});
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(26), JSON.stringify(v));
if (errs.length) { console.log('ERRORS\n' + [...new Set(errs)].slice(0, 4).join('\n')); process.exitCode = 1; } else console.log('OK no errors');
await b.close();
