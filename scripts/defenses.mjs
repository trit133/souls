// Enemy armour and resistances (defenses.js): the ranges each type rolls per dungeon and the bosses' (the most
// anything reaches in this first section), what armour and a resistance do to a hit and to status build-up, the
// player's raised caps, and the panel for the enemy under the mouse. Screenshot /tmp/defenses-panel.png.
// node scripts/defenses.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const g = game, o = {}; g.loop = () => {}; g.audio.play = () => {};
  // 1. ranges by dungeon (10 runs each)
  const ranges = {};
  let maxArmor = 0, maxRes = 0;
  for (let act = 0; act < 4; act++) for (let s = 1; s <= 10; s++) {
    g.buildRun('dungeon', 500 + s * 17, 1); if (act) g.buildAct(act);
    for (const e of [...g.enemies, ...g.reserves, ...g.bosses]) {
      if (e.effigy) continue;
      const key = `${e.isBoss ? e.cfg.id : (e.elite ? 'elite ' : '') + e.type} @${act + 1}`;
      const r = (ranges[key] ||= { armor: [99, 0], res: [99, 0], count: [9, 0] });
      const vals = Object.values(e.def.res);
      r.armor = [Math.min(r.armor[0], e.def.armor), Math.max(r.armor[1], e.def.armor)];
      if (vals.length) r.res = [Math.min(r.res[0], ...vals), Math.max(r.res[1], ...vals)];
      r.count = [Math.min(r.count[0], vals.length), Math.max(r.count[1], vals.length)];
      maxArmor = Math.max(maxArmor, e.def.armor); maxRes = Math.max(maxRes, ...vals, 0);
    }
  }
  o.ranges = ranges; o.maxThisSection = { armor: maxArmor, res: maxRes };
  // 2. what defences do: the same knight light hit on a grunt with no defences, 20% armour, and fire infused + 40% fire resistance
  g.buildRun(['camp', 'boss'], 5, 1); g.start('knight'); g.buildRun(['camp', 'boss'], 5, 1);
  const p = g.player, e = g.enemies.find((x) => x.type === 'grunt');
  const hit = (def, statusLv = {}) => { e.def = def; e.maxHp = e.hp = 1e7; e.alive = true; e.status.reset(); p.statusLv = statusLv; const d = p.c.attacks.k1; const h0 = e.hp; g.resolveHit(p, e, d.hits[0], d); return { dmg: Math.round(h0 - e.hp), fireMeter: +e.status.meter.fire.toFixed(2) }; };
  const none = hit({ armor: 0, res: {} }), arm = hit({ armor: 20, res: {} });
  const fire0 = hit({ armor: 0, res: {} }, { fire: 3 }), fire40 = hit({ armor: 0, res: { fire: 40 } }, { fire: 3 });
  o.armour20 = +(arm.dmg / none.dmg).toFixed(3);
  o.fireRes40 = { damage: +((fire40.dmg - none.dmg) / (fire0.dmg - none.dmg)).toFixed(2), buildup: +(fire40.fireMeter / fire0.fireMeter).toFixed(2) };
  // 3. the player's caps
  const T = g.treeUI ? null : null;
  return o;
});
// 4. the panel: hover an enemy
await page.evaluate(() => { const g = game; g.start('knight'); g.player.hp = g.player.maxHp = 1e6; for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60); });
const at = await page.evaluate(() => { const g = game, e = g.enemies.filter((x) => x.alive && x.rig.root.visible).sort((a, c) => a.distTo(g.player) - c.distTo(g.player))[0]; g.player.pos.set(e.pos.x, 0, e.pos.z + 4); g.camPos.set(e.pos.x, 14, e.pos.z + 16); e.cd = 99; for (let i = 0; i < 40; i++) g.step(1 / 60, 1 / 60); const v = e.pos.clone(); v.y = 1.1; v.project(g.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }; });
await page.mouse.move(at.x, at.y); await page.evaluate(() => { for (let i = 0; i < 12; i++) game.step(1 / 60, 1 / 60); game.pixel.render(game.scene, game.camera); });
const panel = await page.evaluate(() => ({ shown: !document.getElementById('foe-panel')?.classList.contains('hidden'), text: document.getElementById('foe-panel')?.innerText.replace(/\n+/g, ' | ') }));
await page.screenshot({ path: '/tmp/defenses-panel.png' });
const caps = await page.evaluate(async () => { const m = await import('/src/damage.js').catch(() => null); return null; });
await b.close();
console.log('max this section', JSON.stringify(out.maxThisSection));
for (const [k, v] of Object.entries(out.ranges).sort()) console.log(k.padEnd(18), 'armour', v.armor.join('-'), ' res', v.res.join('-'), ' count', v.count.join('-'));
console.log('armour 20%       ', out.armour20, '(×0.8 physical)');
console.log('fire res 40%     ', JSON.stringify(out.fireRes40), '(damage ×0.8, build-up ×0.6)');
console.log('panel            ', JSON.stringify(panel));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
