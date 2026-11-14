// The Shattered March's deeper enemies (foes.js): under ?preview the Sump Lines and Saint Orsk's Spire open on
// Ashfall Ward's streets with their own mix. Checks each raid spawns its area's types (heavy and melee in the right
// places); each new type, set on a player alone, uses every move, hurts, and its trick works (the Hook Warden drags
// you in, the Castellan's shield guards its front, the Augur blinks away and marks ahead of you, the Bell-Warden's
// ring reaches out); then shots of every type idle and in each move. /tmp/look/foe-<type>-<move>.png
// node scripts/foes.mjs [url] [types]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4199/?preview';
const only = process.argv[3]?.split(',');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + e.stack));
await page.goto(url); await page.waitForTimeout(800);
const TYPES = ['wretch', 'hook', 'torcher', 'hulk', 'flagellant', 'castellan', 'augur', 'bellwarden'].filter((t) => !only || only.includes(t));

const res = await page.evaluate((TYPES) => {
  const g = game, out = {};
  g.loop = () => {}; g.audio.play = () => {};
  const run = (n, fn) => { for (let i = 0; i < n; i++) { fn && fn(); g.step(1 / 60, 1 / 60); } };
  // 1. each area's raid: its own enemies
  for (const area of ['r1a2', 'r1a3']) {
    g.raidArea = area; g.runSeed = 0; g.start('knight');
    const n = {}; for (const e of [...g.enemies, ...g.reserves]) n[e.type] = (n[e.type] || 0) + 1;
    out[area] = { name: g.world.dungeon.def.name, boss: g.world.dungeon.bossId, types: n, total: g.enemies.length };
  }
  // 2. each type alone against a player who can't die: its moves, its damage, its trick
  out.solo = {};
  for (const type of TYPES) {
    g.raidArea = ['wretch', 'hook', 'torcher', 'hulk'].includes(type) ? 'r1a2' : 'r1a3'; g.start('knight');
    const D = g.world.dungeon, p = g.player;
    const e = g.enemies.find((x) => x.type === type && !x.elite && !x.big) || g.reserves.find((x) => x.type === type);
    if (!e) { out.solo[type] = 'none spawned'; continue; }
    for (const o of [...g.enemies, ...g.reserves]) if (o !== e) o.rig.root.visible = false;
    e.reserve = false; g.enemies = [e]; g.reserves = [];
    e.alive = true; e.rig.root.visible = true; e.hp = e.maxHp;
    // somewhere open: a square
    const sq = D.blocks.find((B) => B.type === 'plaza' && !D.sites.some((S) => S.key === B.key));
    e.pos.set(sq.cx, 0, sq.cz); e.home = { x: sq.cx, z: sq.cz, yaw: 0 }; e.mod = D.chunkAt(sq.cx, sq.cz).i; e.roam = D.roam(e.mod);
    p.pos.set(sq.cx, 0, sq.cz + 4); p.hp = p.maxHp = 1e9; p.setState('move');
    e.sitting = false; e.setState('chase'); e.engaged = true; e.watchCd = 0;
    const used = {}, info = { hpLost: 0, pulled: false, blinks: 0, marks: 0, guard: null, hp: e.maxHp };
    let hp0 = p.hp, last = p.pos.clone();
    // the player stands still, then walks a slow circle (for the Augur's marks and blinks)
    for (let f = 0; f < 60 * 40; f++) {
      if (type === 'augur' && f % 240 < 120) { p.pos.x = sq.cx + Math.sin(f / 90) * 3; p.pos.z = sq.cz + Math.cos(f / 90) * 3; }
      if (e.mark) info.marks += e.markSeen === e.mark ? 0 : 1, e.markSeen = e.mark;
      const before = e.pos.clone(), was = e.state === 'attack' ? e.atk?.def : null;
      run(1);
      if (e.state === 'attack' && e.atk?.def !== was && e.atk) { const k = e.atkKey; used[k] = (used[k] || 0) + 1; }
      if (before.distanceTo(e.pos) > 3) info.blinks++;
      // the Hook Warden's gaff: you move toward him on its hit
      if (type === 'hook' && e.atkKey === 'gaff' && e.atk?.t > 0.8 && e.atk?.t < 1.0 && p.pos.distanceTo(e.pos) < last.distanceTo(e.pos) - 0.1) info.pulled = true;
      last = p.pos.clone();
      if (!p.alive) { p.alive = true; p.hp = p.maxHp; p.setState('move'); }
      if (p.state !== 'move' && p.state !== 'hurt' && p.state !== 'stagger' && p.state !== 'knockdown') p.setState('move');
      if (type === 'augur') e.pos.distanceTo(p.pos) < 2.4 && (p.pos.x = e.pos.x + 1.5);
    }
    info.dmgTaken = Math.round(hp0 - p.hp);
    if (type === 'castellan') {
      // the guard: a hit from the front while it stands, then one from behind
      e.setState('chase'); e.yaw = e.yawTo(p.pos); const h0 = e.hp;
      e.receive({ dmg: 1000, poise: 10, srcPos: p.pos.clone(), attacker: p });
      const front = h0 - e.hp; e.hp = h0;
      e.yaw += Math.PI; e.setState('chase');
      e.receive({ dmg: 1000, poise: 10, srcPos: p.pos.clone(), attacker: p });
      info.guard = { front: Math.round(front), back: Math.round(h0 - e.hp) };
    }
    out.solo[type] = { used, ...info };
    e.alive = false; e.rig.root.visible = false;
  }
  return out;
}, TYPES);
console.log(JSON.stringify(res, null, 1));

// 3. shots: each type idle and in each of its moves, the frame its first hit lands (or the middle of a move with none)
for (const type of TYPES) {
  const moves = await page.evaluate(({ type }) => {
    const g = game; g.raidArea = type === 'wretch' || type === 'hook' || type === 'torcher' || type === 'hulk' ? 'r1a2' : 'r1a3'; g.start('knight');
    const e = [...g.enemies, ...g.reserves].find((x) => x.type === type);
    return Object.keys(e.moves).filter((k) => k !== 'holdBurst');
  }, { type });
  for (const pose of ['idle', ...moves]) {
    await page.evaluate(({ type, pose }) => {
      const g = game; g.loop = () => {}; g.audio.play = () => {};
      const p = g.player, D = g.world.dungeon, sq = D.blocks.find((B) => B.type === 'plaza' && !D.sites.some((S) => S.key === B.key));
      const who = [...g.enemies, ...g.reserves].find((x) => x.type === type && !x.elite && !x.big) || [...g.enemies, ...g.reserves].find((x) => x.type === type);
      for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
      for (const o of [...g.enemies, ...g.reserves]) if (o !== who) { o.rig.root.visible = false; o.update = () => {}; }
      const X = sq.cx, Z = sq.cz;
      who.rig.root.visible = true; who.pos.set(X, 0, Z); who.yaw = 0; who.update = () => {};
      p.pos.set(X, 0, Z + 8); p.rig.root.visible = false; p.hp = p.maxHp = 1e9;
      who.sitting = false; who.setState('chase');
      for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60);
      if (pose !== 'idle') {
        const d = who.moves[pose], t = d.hits?.[0] ? (d.hits[0].t0 + d.hits[0].t1) / 2 : d.dur * 0.55;
        who.startAttack(d); who.state = 'attack';
        for (let tt = 0; tt < t; tt += 1 / 60) { who.atk.t = tt; who.rig.root.position.set(X, 0, Z); who.rig.root.rotation.y = 0; who.rig.apply(who.attackPose({}, 22), 1 / 60, 22); }
      } else for (let i = 0; i < 30; i++) { who.rig.root.position.set(X, 0, Z); who.rig.apply({ armR: [-0.3, 0, -0.15], foreR: [-0.5, 0, 0], armL: [0.1, 0, 0.15] }, 1 / 60, 30); }
      who.rig.root.position.set(X, 0, Z); who.rig.root.rotation.y = 0;
      const s = who.rig.root.scale.y || 1, c = g.camera;
      g.camLock = true; c.position.set(X + 2.4 * s, 1.9 * s, Z + 3.6 * s); c.lookAt(X, 0.95 * s, Z);
      g.dark = 0; g.pixel.render(g.scene, c);
    }, { type, pose });
    await page.screenshot({ path: `/tmp/look/foe-${type}-${pose}.png` });
  }
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
