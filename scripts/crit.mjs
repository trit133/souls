// Critical hits (defenses.js critRoll): the crit nodes in each tree (75% chance and +100% damage in all, no overlaps:
// see treecheck.mjs), a crit's size for the player (weapon and spell) and for an enemy (melee and arrow), how often
// they land, the enemies' rolled crit ranges per dungeon, and the lock-on panel. Screenshots /tmp/crit-tree-*.png
// and /tmp/crit-panel.png. node scripts/crit.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const out = await page.evaluate(async () => {
  const g = game, o = {}; g.loop = () => {}; g.audio.play = () => {};
  const { TREES } = await import('/src/skilltree.js').catch(() => ({}));
  o.trees = TREES ? Object.fromEntries(Object.entries(TREES).map(([k, t]) => { const c = [...t.nodes.values()].filter((n) => n.crit); return [k, { nodes: t.nodes.size, crit: c.length, chance: c.reduce((a, n) => a + (n.give.critChance || 0), 0), power: c.reduce((a, n) => a + (n.give.critPower || 0), 0), rings: c.map((n) => n.ring).join(',') }]; })) : 'n/a (built)';
  const R = Math.random, forced = (v, fn) => { Math.random = () => v; try { return fn(); } finally { Math.random = R; } };
  g.start('knight'); g.buildRun(['camp', 'boss'], 5, 1);
  const p = g.player, e = g.enemies.find((x) => x.type === 'grunt');
  // the player's light hit on a grunt with no defences: no crit, a crit at 75% / +100% (×2.5), and the rate
  const hit = (tree) => { p.tree = tree; e.def = { armor: 0, res: {} }; e.maxHp = e.hp = 1e7; e.alive = true; e.status.reset(); const d = p.c.attacks.k1; const h0 = e.hp; g.resolveHit(p, e, d.hits[0], d); return h0 - e.hp; };
  const base = forced(0.99, () => hit({})), crit = forced(0, () => hit({ critChance: 75, critPower: 100 })), noPower = forced(0, () => hit({ critChance: 10 }));
  o.playerCrit = { full: +(crit / base).toFixed(2), basic: +(noPower / base).toFixed(2) };
  let n = 0; for (let i = 0; i < 400; i++) if (hit({ critChance: 75, critPower: 100 }) > base * 1.2) n++;
  o.playerRate75 = n / 400;
  // a spell
  g.start('mage'); g.buildRun(['camp', 'boss'], 5, 1);
  { const m = g.player, t = g.enemies.find((x) => x.type === 'grunt'); t.def = { armor: 0, res: {} }; t.status.add = () => {};
    const sp = (tree) => { m.tree = tree; t.maxHp = t.hp = 1e7; t.alive = true; const h0 = t.hp; g.spellDamage({ dmg: 100, poise: 0, pos: m.pos.clone(), kind: 'bolt' }, t); return h0 - t.hp; };
    o.spellCrit = +(forced(0, () => sp({ critChance: 75, critPower: 100 })) / forced(0.99, () => sp({}))).toFixed(2); }
  // an enemy's crit on the player (no armour or resistances)
  g.start('rogue'); g.buildRun(['camp', 'boss'], 5, 1);
  { const pl = g.player, f = g.enemies.find((x) => x.type === 'grunt'); f.elems = null; const def = f.T.moves.slash;
    const take = (c) => { f.def = { armor: 0, res: {}, ...c }; pl.hp = pl.maxHp = 1e6; pl.setState('move'); pl.tree = {}; f.yaw = f.yawTo(pl.pos); g.resolveHit(f, pl, def.hits[0], def); return pl.maxHp - pl.hp; };
    o.enemyCrit = { full: +(forced(0, () => take({ crit: 75, critDmg: 100 })) / forced(0.99, () => take({ crit: 75, critDmg: 100 }))).toFixed(2), noCritChance: +(forced(0, () => take({ crit: 0, critDmg: 100 })) / forced(0.99, () => take({}))).toFixed(2) };
    const a = g.enemies.find((x) => x.type === 'archer') || f; a.def = { crit: 75, critDmg: 20 };
    const q = forced(0, () => g.foeCrit(a, { dmg: 100 })); o.arrowCrit = { dmg: q.dmg, crit: !!q.crit }; }
  // enemy crit ranges by dungeon
  const ranges = {}; let maxC = 0, maxD = 0;
  for (let act = 0; act < 4; act++) for (let s = 1; s <= 10; s++) {
    g.buildRun('dungeon', 900 + s * 13, 1); if (act) g.buildAct(act);
    for (const x of [...g.enemies, ...g.reserves, ...g.bosses]) {
      if (x.effigy) continue;
      const key = `${x.isBoss ? x.cfg.id : (x.elite ? 'elite ' : '') + x.type} @${act + 1}`;
      const r = (ranges[key] ||= { crit: [99, 0], dmg: [999, 0] });
      r.crit = [Math.min(r.crit[0], x.def.crit), Math.max(r.crit[1], x.def.crit)];
      r.dmg = [Math.min(r.dmg[0], x.def.critDmg), Math.max(r.dmg[1], x.def.critDmg)];
      maxC = Math.max(maxC, x.def.crit); maxD = Math.max(maxD, x.def.critDmg);
    }
  }
  o.ranges = ranges; o.maxThisSection = { crit: maxC, critDmg: maxD };
  return o;
});
// the lock-on panel
await page.evaluate(() => { const g = game; g.start('knight'); g.player.hp = g.player.maxHp = 1e6; for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60);
  const e = g.enemies.filter((x) => x.alive && x.rig.root.visible).sort((a, c) => a.distTo(g.player) - c.distTo(g.player))[0];
  g.player.pos.set(e.pos.x, 0, e.pos.z + 4); e.cd = 99; g.player.lock = e; for (let i = 0; i < 20; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera); });
const panel = await page.evaluate(() => document.getElementById('foe-panel')?.innerText.replace(/\n+/g, ' | '));
await page.screenshot({ path: '/tmp/crit-panel.png' });
for (const k of ['knight', 'rogue', 'mage']) {
  await page.evaluate((k) => { game.toTitle(); game.treeUI.open(k); }, k);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/tmp/crit-tree-${k}.png` });
}
await b.close();
console.log('trees            ', JSON.stringify(out.trees));
console.log('player crit      ', JSON.stringify(out.playerCrit), '(want full 2.5, basic 1.5)');
console.log('player rate @75% ', out.playerRate75);
console.log('spell crit       ', out.spellCrit, '(want 2.5)');
console.log('enemy crit       ', JSON.stringify(out.enemyCrit), '(want full 2.5, no chance 1)');
console.log('arrow crit       ', JSON.stringify(out.arrowCrit), '(want 170, true)');
console.log('max this section ', JSON.stringify(out.maxThisSection));
for (const [k, v] of Object.entries(out.ranges).sort()) console.log(k.padEnd(18), 'crit', v.crit.join('-'), ' critDmg', v.dmg.join('-'));
console.log('panel            ', JSON.stringify(panel));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
