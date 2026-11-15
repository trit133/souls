// Blood and maiming (gore.js). Every blade hit sprays; the last blow of a slashing combo can take a piece off, at a
// chance from that hit's damage against the enemy's whole health (more on one already hurt, more with Butcher's Mark),
// never a stab, never a boss. A leg off: it crawls on its belly, slow, and grabs; the weapon arm off (the weapon goes
// with it): it punches and shoves; the other arm: it flails; the head: dead. The piece flies, lands and stays; the
// stump pours and pools. Pictures: /tmp/look/maim-*.png
// node scripts/maim.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4191/?training';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 800, height: 500 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);

const res = await page.evaluate(() => {
  const g = game, out = {}; g.loop = () => {}; g.audio.play = () => {};
  const run = (s) => { for (let i = 0; i < Math.round(s * 60); i++) g.step(1 / 60, 1 / 60); };
  const begin = (weapon = 'wristblade') => {
    g.loadoutFor = () => ({ weapon, evo: null }); g.start(weapon === 'wristblade' || weapon === 'daggers' ? 'rogue' : 'knight');
    const p = g.player; p.hp = p.maxHp = 1e9; p.st = p.maxSt = 1e5; p.pos.set(0, 0, -6); p.yaw = Math.PI;
    const d = g.enemies[0]; d.rig.root.visible = false; d.pos.set(60, 0, 60);
    return p;
  };
  const foe = (type, x = 0, z = -9) => { const d = g.enemies.find((e) => e.type === 'dummy'); const e = new d.constructor(g, type, x, z, 0, { players: 1, tier: 0, mod: 0 }); e.def = { armor: 0, res: {}, crit: 0, critDmg: 0 }; g.enemies.push(e); return e; };
  const G = g.gore;
  // 1. the chance: a hit's damage against the whole health, more when hurt, more with the rune, capped
  const mk = (maxHp, hp) => ({ maxHp, hp });
  out.chance = {
    smallFoeBigHit: +G.chance(40, mk(100, 60)).toFixed(3), bigFoeSameHit: +G.chance(40, mk(500, 460)).toFixed(3),
    hurt: +G.chance(40, mk(500, 60)).toFixed(3), withRune: +G.chance(40, mk(500, 460), 1, 0.4).toFixed(3), cap: +G.chance(400, mk(100, 1), 1.2, 1).toFixed(3),
  };
  // 2. the roll itself: a slashing finisher maims at a low roll, never at a high one; a stab never; a boss never
  let p = begin();
  const atk = p.c.attacks, e1 = foe('grunt');
  const rnd = Math.random;
  Math.random = () => 0.001; out.slashLow = G.tryMaim(p, e1, atk.wThroat, atk.wThroat.hits[0], 30, { x: 0, z: -1 });
  const e2 = foe('grunt', 2);
  Math.random = () => 0.999; out.slashHigh = G.tryMaim(p, e2, atk.wThroat, atk.wThroat.hits[0], 30, { x: 0, z: -1 });
  Math.random = () => 0.001; out.stab = G.tryMaim(p, e2, atk.wPin, atk.wPin.hits[0], 999, { x: 0, z: -1 });
  out.boss = g.bosses[0] ? G.tryMaim(p, g.bosses[0], atk.wThroat, atk.wThroat.hits[0], 999, { x: 0, z: -1 }) : null;
  Math.random = rnd;
  out.beheaded = { part: out.slashLow, dead: !e1.alive };
  run(1.5);
  out.ragdollHeadless = !!e1.ragdoll && !e1.rig.j.head.visible;
  // 3. each limb and what it does to them
  const watch = (part) => {
    p = begin(); const e = foe('grunt', 0, -19); e.hp = e.maxHp = 1e5;
    run(0.2); G.maim(e, part, { x: 0, z: -1 });
    const z0 = e.pos.z; e.setState('chase'); e.alert?.(); run(2.0);
    const moved = +Math.abs(e.pos.z - z0).toFixed(2);
    return { legless: !!e.legless, unarmed: !!e.unarmed, wild: !!e.wild, moves: Object.keys(e.T.weights), moved, hips: +e.rig.j.hips.rotation.x.toFixed(2), hidden: !e.rig.j[part].visible, pieces: g.ragdolls.pieces.length, pools: G.pools.length };
  };
  out.leg = watch('shinL'); out.whole = watch('legR'); out.armR = watch('armR'); out.foreL = watch('foreL');
  // an untouched grunt over the same time, to compare the crawl
  p = begin(); { const e = foe('grunt', 0, -19); e.hp = e.maxHp = 1e5; run(0.2); const z0 = e.pos.z; e.setState('chase'); run(2.0); out.walker = +Math.abs(e.pos.z - z0).toFixed(2); }
  // 4. a piece lands and stays; the pool is under it
  p = begin(); { const e = foe('grunt'); e.hp = e.maxHp = 1e5; run(0.2); G.maim(e, 'armR', { x: 1, z: 0 }); run(4); const P = g.ragdolls.pieces.at(-1); out.piece = { y: +P.obj.position.y.toFixed(2), frozen: !P.live, inScene: !!P.obj.parent, weaponWent: P.obj.getObjectByProperty('isMesh', true) ? true : false }; }
  // 5. a War Servitor bleeds oil, the dummy straw, a zealot blood
  out.fluids = { brute: G.fluidOf({ type: 'brute' }), dummy: G.fluidOf(g.enemies.find((e) => e.type === 'dummy')), grunt: G.fluidOf({ type: 'grunt' }) };
  return out;
});
// pictures: a crawler, a one-armed one, the pieces and pools
const shots = await page.evaluate(() => {
  const g = game, G = g.gore; g.loop = () => {}; g.audio.play = () => {};
  g.loadoutFor = () => ({ weapon: 'wristblade', evo: null }); g.start('rogue');
  for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const p = g.player; p.hp = p.maxHp = 1e9; p.pos.set(0, 0, -4); p.yaw = Math.PI; p.rig.root.visible = false;
  const d = g.enemies[0]; d.rig.root.visible = false; d.pos.set(60, 0, 60);
  const mk = (x, z) => { const e = new d.constructor(g, 'grunt', x, z, 0, { players: 1, tier: 0 }); e.hp = e.maxHp = 1e5; g.enemies.push(e); return e; };
  const a = mk(-1.6, -9), c = mk(1.6, -9), h = mk(0, -12);
  for (let i = 0; i < 12; i++) g.step(1 / 60, 1 / 60);
  G.maim(a, 'legL', { x: -1, z: 0 }); G.maim(c, 'armR', { x: 1, z: 0 }); G.maim(h, 'head', { x: 0, z: -1 });
  for (const e of [a, c]) e.setState('chase');
  const out = [], cam = g.camera;
  for (const t of [0.25, 1.6]) {
    for (let i = 0; i < Math.round(t * 60); i++) g.step(1 / 60, 1 / 60);
    g.camLock = true; cam.position.set(0, 4.2, -3.2); cam.lookAt(0, 0.4, -9.5); g.pixel.render(g.scene, cam); out.push(document.querySelector('canvas').toDataURL()); g.camLock = false;
  }
  return out;
});
shots.forEach((s, i) => writeFileSync(`/tmp/look/maim-${i}.png`, Buffer.from(s.split(',')[1], 'base64')));
console.log('/tmp/look/maim-0.png /tmp/look/maim-1.png');
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(15), JSON.stringify(v));
const C = res.chance;
const ok = C.smallFoeBigHit > C.bigFoeSameHit && C.hurt > C.bigFoeSameHit && C.withRune > C.bigFoeSameHit && C.cap <= 0.85
  && res.slashLow === 'head' && res.beheaded.dead && res.slashHigh === null && res.stab === null && res.boss === null && res.ragdollHeadless
  && res.leg.legless && res.leg.moves.join() === 'grab' && res.leg.moved < res.walker * 0.6 && res.leg.hips > 1 && res.whole.legless
  && res.armR.unarmed && res.armR.moves.join() === 'punch,shove' && res.foreL.wild && !res.foreL.unarmed
  && res.piece.y < 0.4 && res.piece.frozen && res.piece.inScene && res.fluids.brute === 'oil' && res.fluids.dummy === 'straw' && res.fluids.grunt === 'blood';
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'no page errors');
console.log(ok && !errs.length ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok && !errs.length ? 0 : 1);
