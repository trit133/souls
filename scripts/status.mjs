// Damage types and status: typed player hits, build-up from elemental damage only, 2x after the first proc,
// per-type damage numbers, enemy elements by part of the run, armour / resistances / status on players, boss
// elements, the riposte on each enemy type, weapon effects and the tree stats panel (screenshots).
// node scripts/status.mjs [tag] [url] -> /tmp/look/<tag>-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const tag = process.argv[2] || 's', url = process.argv[3] || 'http://localhost:4173/';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const LAYOUT = ['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
const out = await page.evaluate((LAYOUT) => {
  game.loop = () => {}; const o = {};
  const fresh = (k, tree) => { game.start(k); game.audio.play = () => {}; game.buildRun(LAYOUT, 12345); game.input.move = () => ({ x: 0, y: 0 }); const p = game.player; if (tree) p.tree = tree; return p; };
  const grunt = () => { const g = game.enemies.find((e) => e.type === 'grunt' && e.alive); g.hp = g.maxHp = 1e6; g.status.reset(); return g; };
  const swing = (p, g) => { const def = p.c.attacks[p.c.light]; game.resolveHit(p, g, def.hits[0], def); };
  // 1) plain rogue: physical only, no build-up
  let p = fresh('rogue'), g = grunt();
  const hp0 = g.hp; swing(p, g);
  o.plainHit = { dealt: hp0 - g.hp, meters: { ...g.status.meter } };
  // 2) one bleed Infusion: 15% of the hit as bleed; hits to proc, then 2x after
  p.statusLv = { bleed: 1 }; g = grunt();
  let n1 = 0, n2 = 0; const h1 = g.hp; swing(p, g); const infHit = h1 - g.hp; g.status.reset();
  while (!g.status.procd.bleed && n1 < 300) { swing(p, g); n1++; }
  const at = g.status.procAt.bleed; g.status.meter.bleed = 0;
  while (g.status.procAt.bleed === at && n2 < 600) { swing(p, g); n2++; }
  o.infusion = { hit: +infHit.toFixed(2), hitsFirst: n1, hitsSecond: n2, resistAfter: g.status.resist.bleed };
  // 3) rogue with a full bleed line from the tree (9 flat, +45%)
  p = fresh('rogue', { bleedDmg: 9, bleedPct: 45 }); g = grunt();
  let n3 = 0; while (!g.status.procd.bleed && n3 < 300) { swing(p, g); n3++; }
  o.treeBleed = { hitsToProc: n3 };
  // 4) damage numbers: one per type, in its colour
  const before = document.querySelectorAll('.dmgnum').length;
  p = fresh('knight', { physDmg: 3, fireDmg: 2, frostDmg: 2 }); g = grunt(); swing(p, g);
  o.numbers = [...document.querySelectorAll('.dmgnum')].slice(before).map((d) => `${d.textContent}:${d.style.color || 'white'}`);
  // 5) enemy elements by part of the run, over many seeds
  const by = {}, two = {};
  for (let s = 1; s <= 60; s++) { game.buildRun(LAYOUT, s * 7919); for (const e of game.enemies) { const t = e.tier; by[t] = by[t] || [0, 0]; by[t][1]++; if (e.elems) { by[t][0]++; if (Object.keys(e.elems).length > 1) two[t] = (two[t] || 0) + 1; } } }
  o.enemyElems = Object.fromEntries(Object.entries(by).map(([t, [a, n]]) => [t, `${(a / n * 100).toFixed(0)}% (expect ${[12.5, 16.7, 33.3, 50][t]}%), ${two[t] || 0} with 2+`]));
  // 6) a fire grunt hitting players: total unchanged, build-up, resistances and armour
  const hitBy = (kind, tree, elems) => {
    const p = fresh(kind, tree), e = game.enemies.find((x) => x.type === 'grunt');
    e.setElems(elems); e.dmgScale = 1;
    const def = e.moves.slash || Object.values(e.moves).find((m) => m.hits?.[0]?.dmg === 18);
    p.hp = p.maxHp = 1e4; p.setState('move'); p.blocking = false;
    const h = p.hp; game.resolveHit(e, p, def.hits[0], def);
    return { taken: +(h - p.hp).toFixed(2), fireMeter: +p.status.meter.fire.toFixed(1) };
  };
  o.playerHits = {
    physOnly: hitBy('rogue', {}, null),
    fireGrunt: hitBy('rogue', {}, { fire: 0.25 }),
    fireRes50: hitBy('rogue', { fireRes: 50 }, { fire: 0.25 }),
    knightArmor20: hitBy('knight', { armor: 20 }, null),
  };
  // the player's own proc: fill the fire meter
  p = fresh('rogue'); p.hp = p.maxHp = 100;
  p.status.add('fire', 101, game); for (let i = 0; i < 240; i++) game.step(1 / 60, 1 / 60);
  o.playerFireProc = { hpAfter4s: +p.hp.toFixed(1), resistNow: p.status.resist.fire, hudIcons: document.querySelectorAll('#pstatus .psicon').length };
  // 7) bosses
  fresh('knight');
  const boss = (id) => game.bosses.find((x) => x.cfg.id === id);
  const v = boss('varek'), e0 = v.elems; v.ignite();
  o.bosses = { hask: boss('hask').elems, vael: [boss('vael').elems, boss('vael').elemBuild], gorrath: boss('gorrath').elems, varek: [e0, v.elems] };
  // 8) riposte (Parry Stab) on each type at tier 0
  o.riposte = {};
  for (const t of ['archer', 'spear', 'grunt']) {
    p = fresh('rogue'); const e = game.enemies.find((x) => x.type === t && x.alive && x.tier === 0);
    for (const x of game.enemies) if (x !== e) x.die(true);
    const h = e.hp; e.setState('parried'); p.pos.set(e.pos.x, 0, e.pos.z + e.radius + 1.2); p.yaw = Math.PI; p.setState('move'); p.startRiposte(e);
    for (let i = 0; i < 120 && p.state === 'riposte'; i++) game.step(1 / 60, 1 / 60);
    o.riposte[t] = { hp0: h, dealt: +(h - Math.max(0, e.hp)).toFixed(1), dead: !e.alive };
  }
  return o;
}, LAYOUT);
// weapon effects from the tree
for (const [k, tree] of [['bleed', { bleedDmg: 4 }], ['bloodfire', { bleedDmg: 3, fireDmg: 3 }], ['gold', { bleedDmg: 2, fireDmg: 2, frostDmg: 2, poisonDmg: 2 }]]) {
  await page.evaluate(({ LAYOUT, tree }) => {
    document.getElementById('hud').style.display = 'none';
    game.start('knight'); game.audio.play = () => {}; game.buildRun(LAYOUT, 99); game.input.move = () => ({ x: 0, y: 0 });
    for (const e of game.enemies) { e.die(true); e.rig.root.visible = false; }
    const p = game.player; p.tree = tree; p.pos.set(0, 0, 0); p.yaw = 0;
    for (let i = 0; i < 50; i++) { game.step(1 / 60, 1 / 60); game.weaponFx.update(1 / 60); game.fx.update(1 / 60); }
    const c = game.camera; c.position.set(Math.sin(0.6) * 2.6, 1.6, Math.cos(0.6) * 2.6); c.lookAt(0, 0.9, 0);
    game.pixel.render(game.scene, game.camera);
  }, { LAYOUT, tree });
  await page.screenshot({ path: `/tmp/look/${tag}-wfx-${k}.png`, clip: { x: 340, y: 60, width: 600, height: 600 } });
}
// tree screen with the stats panel, hovering an unowned node
await page.evaluate(() => { document.getElementById('hud').style.display = ''; game.mode = 'title'; game.treeUI.open('knight'); });
await page.waitForTimeout(300);
const pos = await page.evaluate(() => { const el = document.querySelector('[data-node="s1-1"]'); const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await page.mouse.move(pos[0], pos[1]); await page.waitForTimeout(200);
await page.screenshot({ path: `/tmp/look/${tag}-tree-stats.png` });
const panel = await page.evaluate(() => document.getElementById('tree-stats').innerText.split('\n').slice(0, 40).join(' | '));
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(14), JSON.stringify(v));
console.log('panel'.padEnd(14), panel.slice(0, 900));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
