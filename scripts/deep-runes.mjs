// The Sunless Deep's runes (runes.js, region 2) at work in the training ring, each loadout socketed straight onto the
// player (loadoutOf): the shard trail cutting and the lantern step healing, the spore and glass halos, the wisp, the
// grub and the Kilnfather's golem fighting the dummy, the buffs (kiln, quickening, molten heart) changing your numbers
// and coming off again, and the utilities adding health and stamina. node scripts/deep-runes.mjs [url]
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await page.goto(process.argv[2] || 'http://localhost:5180/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 });
const out = await page.evaluate(async () => {
  const g = game, R = await import('/src/runes.js'), o = {};
  g.loop = () => {}; g.audio.play = () => {}; g.training = true;
  const run = (ids, fn, frames = 360) => {
    g.start('knight'); g.buildRun(['training'], 1, 1);
    const p = g.player, d = g.enemiesAll().find((e) => e.type === 'dummy'); p.hp = p.maxHp;
    p.pos.set(d.pos.x + 1.5, 0, d.pos.z + 1.5); p.gy = g.world.floorAt(p.pos.x, p.pos.z); p.setState('move');
    const L = R.loadoutOf(ids); g.runes.attach(p, L);
    const dHp = d.hp, res = fn?.(g, p, d, L) || {};
    for (let i = 0; i < frames; i++) { g.step(1 / 60, 1 / 60); res.tick?.(i); }
    delete res.tick;
    return { ...res, dummyHurt: Math.round(dHp - d.hp + (d.restT !== undefined && d.hp === d.maxHp ? 0 : 0)), pets: g.runes.pets.map((P) => P.pet).join(',') };
  };
  // (the dummy heals in full 3 s after its last hit: watch its health over time instead)
  const hurt = (g, d) => { let worst = d.hp; return { tick: () => { worst = Math.min(worst, d.hp); }, get worst() { return worst; } }; };
  o.shard = run(['shard_step'], (g, p, d) => { const h = hurt(g, d); return { tick: (i) => { if (i % 40 === 0) { p.pos.set(d.pos.x - 1.5, 0, d.pos.z); p.setState('roll'); g.runes.onRoll(p, 0.05); p.pos.set(d.pos.x, 0, d.pos.z + 0.4); g.runes.onRoll(p, 0.1); } h.tick(); o.shardHit = d.maxHp - h.worst; } }; });
  o.lantern = run(['lantern_step'], (g, p) => { p.hp = p.maxHp * 0.5; const before = p.hp; g.runes.lastRoll = false; g.runes.onRoll(p, 0.016); return { healed: Math.round(p.hp - before) }; }, 10);
  o.spore = run(['spore_halo', 'caustic'], (g, p, d) => { p.pos.set(d.pos.x + 1, 0, d.pos.z); const h = hurt(g, d); return { tick: () => { h.tick(); o.sporeHit = d.maxHp - h.worst; } }; });
  o.glass = run(['glass_halo'], (g, p, d) => { p.pos.set(d.pos.x + 1, 0, d.pos.z); const h = hurt(g, d); return { tick: () => { h.tick(); o.glassHit = d.maxHp - h.worst; } }; });
  for (const [k, id] of [['wisp', 'lantern_wisp'], ['grub', 'burrow_grub'], ['golem', 'glass_golem']]) o[k] = run([id, 'brood'], (g, p, d) => { g.runes.use('summon'); const h = hurt(g, d); return { tick: () => { h.tick(); o[k + 'Hit'] = d.maxHp - h.worst; } }; }, 400);
  for (const [k, id] of [['kiln', 'kiln_litany'], ['swift', 'quickening'], ['molten', 'molten_heart']]) o[k] = run([id, 'spare_litany'], (g, p) => { const a = [p.dmgMul, p.aspdMul, p.moveMul]; g.runes.use('runebuff'); const b = [p.dmgMul, p.aspdMul, p.moveMul, g.runes.hitMul()]; return { on: b.map((x) => +x.toFixed(2)), was: a.map((x) => +x.toFixed(2)), uses: p.buffUses }; }, 60 * 14);
  o.util = run(['ore_heart', 'seer_blood', 'iron_lungs'], (g) => ({}), 1);
  o.utilL = R.loadoutOf(['ore_heart', 'seer_blood', 'iron_lungs', 'first_glass']).util;
  o.buffsAfter = [g.player.dmgMul, g.player.aspdMul].map((x) => +x.toFixed(2));
  o.count = Object.values(R.RUNES).filter((x) => x.region === 'r2').length;
  return o;
});
console.log(JSON.stringify(out));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
await b.close();
