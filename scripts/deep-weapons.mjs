// The Sunless Deep's weapons (weapons.js, weaponmoves.js, deepweapons.js): each fights with its own light chain,
// heavy and combos; the specials (Piston Slam, Shard Orbit, Blinding Flare) and evolutions (Overpressure, Prism Split,
// Wildfire) work; the thrown chakram cuts three and comes back; the Censer's floors burn; the models build (both
// skins) and their glow is the chest glow's colour. Screenshots of each in hand and mid-swing.
// node scripts/deep-weapons.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5180/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1000, height: 600 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
await page.goto(url); await page.waitForTimeout(800);

const mech = await page.evaluate(() => {
  const g = game, res = {}; g.loop = () => {}; g.audio.play = () => {};
  const run = (n, fn) => { for (let i = 0; i < n; i++) { fn && fn(); g.step(1 / 60, 1 / 60); } };
  const begin = (kind, weapon, evo) => { g.loadoutFor = () => ({ weapon, evo }); g.start(kind); const p = g.player; p.hp = p.maxHp = 1e7; p.st = p.maxSt = 500; p.mana = p.maxMana = 500; for (const e of g.enemies) e.update = () => {}; return p; };
  const place = (p) => { const s = g.world.dungeon.startAt; p.pos.set(s.x, 0, s.z - 6); g.lastGood = null; p.yaw = 0; p.lock = null; };
  const used = new Set();
  const foe = (p, dx, dz, o = {}) => { const e = g.enemies.find((x) => x.alive && !used.has(x) && x.type === 'grunt' && !x.elite) || g.enemies.find((x) => x.alive && !used.has(x) && !x.heavy && !x.elite); used.add(e); e.update = () => {}; e.pos.set(p.pos.x + dx, 0, p.pos.z + dz); e.gy = p.gy || 0; e.hp = e.maxHp = 1e6; e.kb.set(0, 0, 0); e.yaw = Math.PI; return e; };
  const hurt = (e) => Math.round(1e6 - e.hp);

  // each weapon: its light chain and heavy play their own moves; its three combos' finishers land
  for (const [kind, w] of [['knight', 'pitbreaker'], ['rogue', 'chakrams'], ['mage', 'censer']]) {
    used.clear(); const p = begin(kind, w, null); place(p);
    const seen = new Set();
    for (let i = 0; i < 3; i++) { g.input.pressed.add('attack'); run(i ? 40 : 30, () => { p.st = 500; if (p.atkKey) seen.add(p.atkKey); }); }
    run(60); g.input.pressed.add('heavy'); run(20, () => { if (p.atkKey) seen.add(p.atkKey); }); run(60);
    const fins = {};
    for (const c of p.c.comboList) {
      const last = c.steps[c.steps.length - 1][1], e = foe(p, 0, 1.8);
      p.mana = 500; p.doAttack(last, p.fwd(), 0); run(80); fins[c.name] = hurt(e); e.hp = e.maxHp; run(60);
      used.delete(e); e.pos.set(p.pos.x + 30, 0, p.pos.z);
    }
    res[w] = { style: p.c.style, special: p.c.special, moves: [...seen], combos: fins, model: !!p.rig.wpnR, offhand: !!p.rig.wpnL, chestGlow: p.rig.chestGlow?.toString(16), emitters: p.rig.emitters?.length || 0 };
  }

  // the Pit-Breaker: Piston Slam splits the floor ahead (a grunt 5 m ahead on the line is hit and thrown on, one 3 m
  // off to the side isn't); the cooldown; Overpressure: three swings that land vent, and the next slam reaches 8.5 m
  { used.clear(); const p = begin('knight', 'pitbreaker', null); place(p);
    const on = foe(p, 0, 5), off = foe(p, 3, 3);
    g.input.pressed.add('special'); run(4); const inMove = p.atkKey === 'piston'; run(50);
    res.piston = { inMove, onLine: hurt(on), thrown: +on.kb.length().toFixed(1), offLine: hurt(off), cd: +p.pistonCd.toFixed(1) };
    g.input.pressed.add('special'); run(4); res.piston.blockedByCd = p.atkKey !== 'piston' || p.atk?.t > 0.1;
  }
  { used.clear(); const p = begin('knight', 'pitbreaker', 'overpressure'); place(p);
    const near = foe(p, 0, 2), far = foe(p, 0, 8.5);
    for (let i = 0; i < 3; i++) { p.doAttack('p1', p.fwd(), 0); run(55); }
    const vented = p.vented, pressure = p.pressure;
    run(60); g.input.pressed.add('special'); run(60);
    res.overpressure = { vented, pressure, far: hurt(far), afterSlam: p.vented };
  }

  // the Glass Chakrams: the throw cuts three in a row and comes back to his hand; Prism Split's shards; Shard Orbit
  { used.clear(); const p = begin('rogue', 'chakrams', null); place(p);
    const a = foe(p, 0, 5), b2 = foe(p, 2.5, 7), c = foe(p, -1.5, 9);
    g.input.pressed.add('heavy'); run(16); const out = p.chakramOut, hidden = !p.rig.wpnR.visible;
    run(200); res.throw = { out, hidden, cuts: [hurt(a), hurt(b2), hurt(c)], back: !p.chakramOut, shown: p.rig.wpnR.visible, inFlight: g.deepw.rings.length };
  }
  { used.clear(); const p = begin('rogue', 'chakrams', 'prismSplit'); place(p);
    const side = foe(p, 2.4, 6.5); // (off to the side, where a shard flies: the ring has nothing ahead to go to)
    g.input.pressed.add('heavy'); run(16); const flying = g.deepw.rings.length; run(120);
    res.prism = { flying, sideCut: hurt(side) };
  }
  { used.clear(); const p = begin('rogue', 'chakrams', null); place(p);
    const e = foe(p, 0, 1.7), far = foe(p, 0, 5);
    g.input.pressed.add('special'); run(3); const orbiting = g.deepw.orbits.length, hands = !p.rig.wpnR.visible && !p.rig.wpnL.visible;
    run(240); res.orbit = { orbiting, hands, cut: hurt(e), far: hurt(far), done: !g.deepw.orbits.length, back: p.rig.wpnR.visible && p.rig.wpnL.visible, cd: +p.orbitCd.toFixed(1) };
  }

  // the Lantern Censer: the fall leaves a burning floor that burns what stands in it; Blinding Flare staggers a grunt
  // and slows a boss; Wildfire carries a burn to the next enemy
  { used.clear(); const p = begin('mage', 'censer', null); place(p);
    const e = foe(p, 0, 2.2);
    p.doAttack('e3', p.fwd(), 0); run(30); const floors = g.deepw.floors.length; const h0 = e.hp; const f0 = e.status.meter.fire;
    run(120); res.floor = { floors, burnt: Math.round(h0 - e.hp), fireBuilt: Math.round(e.status.meter.fire - f0) > 0 || !!e.status.dots.fire };
    run(200);
    const grunt = foe(p, 1, 3); grunt.update = undefined; delete grunt.update; grunt.setState('chase');
    const boss = g.bosses.find((x) => x.alive); if (boss) { boss.update = () => {}; boss.pos.set(p.pos.x - 2, 0, p.pos.z + 3); boss.gy = p.gy || 0; boss.state = 'neutral'; const n = g.encounters.find((x) => x.boss === boss); if (n) n.active = true; }
    const m0 = p.mana; g.input.pressed.add('special'); run(4); const casting = p.state === 'cast'; const states = new Set(); run(40, () => states.add(grunt.state));
    res.flare = { casting, mana: Math.round(m0 - p.mana), grunt: [...states].join(','), gruntHurt: grunt.hp < 1e6, bossSlowed: boss ? boss.chillUntil > g.time : null, cd: +p.flareCd.toFixed(1) };
  }
  { used.clear(); const p = begin('mage', 'censer', 'wildfire'); place(p);
    const a = foe(p, 6, 6), b2 = foe(p, 8, 7);
    a.status.proc('fire', g); run(70);
    res.wildfire = { first: !!a.status.dots.fire, caught: !!b2.status.dots.fire };
  }
  // the second skins build too
  { const kits = []; for (const [kind, w, slot, piece] of [['knight', 'pitbreaker', 'pitbreaker', 'glass'], ['rogue', 'chakrams', 'chakrams', 'mirror'], ['mage', 'censer', 'censer', 'thurible']]) {
    g.equippedOutfit = () => ({ [slot]: { piece } }); used.clear(); const p = begin(kind, w, null); kits.push(!!p.rig.wpnR && p.rig.tip.parent != null); }
    res.skins = kits; delete g.equippedOutfit; }
  return res;
});
console.log(JSON.stringify(mech, null, 1));

// ---- pictures: each in hand, standing and mid-swing ----
for (const [kind, w, mv, t] of [['knight', 'pitbreaker', 'p2', 0.42], ['rogue', 'chakrams', 'heavy', 0.2], ['mage', 'censer', 'e2', 0.26]]) {
  await page.evaluate(([kind, w]) => { const g = game; g.loadoutFor = () => ({ weapon: w, evo: null }); g.start(kind); for (const e of g.enemies) e.update = () => {}; const p = g.player; const s = g.world.dungeon.startAt; p.pos.set(s.x, 0, s.z - 6); p.yaw = 0.6; }, [kind, w]);
  await page.evaluate(() => { for (let i = 0; i < 40; i++) game.step(1 / 60, 1 / 60); game.render?.(); });
  await page.waitForTimeout(300); await page.screenshot({ path: `/tmp/dw-${w}-stand.png` });
  await page.evaluate(([mv, t]) => { const g = game, p = g.player; p.doAttack(mv, p.fwd(), 0); for (let i = 0; i < Math.round(t * 60); i++) g.step(1 / 60, 1 / 60); g.render?.(); }, [mv, t]);
  await page.waitForTimeout(200); await page.screenshot({ path: `/tmp/dw-${w}-swing.png` });
}
console.log('errors:', errs.length ? errs : 'none');
await b.close();
