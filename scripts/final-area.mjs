// Gems open the way (regions.js needs): the Sump Lines want Hask's gem, the Spire Vael's, the Sentinel's Bastion all
// three; the world map shows what's sealed and why, and a raid can't be started into an area you lack the gems for.
// The Bastion (modules.js FINAL_MODULES.bastion, then Varek's throne): a few of the March's hardest, the door on fogged
// until they're dead, Varek at the end; his death ends it (victory, Back to Map) and ticks the area on the map.
// node scripts/final-area.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4199/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = [], fails = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
await page.goto(url); await page.waitForTimeout(900);
const res = await page.evaluate(() => {
  const g = game, out = {}; g.loop = () => {}; g.audio.play = () => {};
  const run = (n, fn) => { for (let i = 0; i < n; i++) { fn && fn(); g.step(1 / 60, 1 / 60); } };
  // a signed-in account with no gems, then one with each
  g.accounts.data = g.accounts.data || { gems: {}, raids: {}, stats: { wins: 0 } }; g.accounts.data.stats ||= { wins: 0 };
  const d = g.accounts.data; d.gems = {};
  const pins = () => { g.worldMap.open(() => {}, () => {}); g.worldMap.showRegion('r1'); const r = [...document.querySelectorAll('.wm-pin')].map((p) => p.querySelector('.wm-lab').textContent.replace(' ✓', '') + ':' + (p.classList.contains('open') ? 'open' : 'sealed')); return r; };
  out.none = pins();
  [...document.querySelectorAll('.wm-pin')].find((p) => p.textContent.includes('Bastion')).click();
  out.sealedText = document.getElementById('wm-blurb').textContent; out.deployShown = !document.getElementById('wm-go').classList.contains('hidden');
  g.raidArea = 'r1a3'; out.fallback = g.newLayout().raid;
  d.gems.gem_hask = 1; out.hask = pins();
  d.gems.gem_vael = 1; out.vael = pins();
  d.gems.gem_gorrath = 1; out.all = pins();
  g.raidArea = 'r1f'; out.finalLayout = g.newLayout().raid;
  g.worldMap.close(false);
  // the Bastion
  g.start('knight');
  g.buildRun({ raid: 'r1f' }, 99, 1);
  const p = g.player; p.hp = p.maxHp = 1e9;
  out.bastion = { name: g.areaName, mods: g.world.mods.map((m) => m.name), enemies: g.enemies.map((e) => e.type + (e.elite ? '*' : '')), act: g.act, boss: g.boss?.cfg?.id, bossHp: g.boss?.maxHp };
  const gate = Object.values(g.world.gates).find((q) => q.id.startsWith('exit'));
  out.gateBefore = gate?.open;
  // the way through is one walk from the beacon to the throne
  let walk = true; for (let z = -2; z > -64 - 40; z -= 0.5) if (!g.world.walkable(0, z, 0.45, null, true)) { walk = false; out.blockedAt = z; break; }
  out.walkThrough = walk;
  for (const e of g.enemies) e.die();
  run(60);
  out.gateAfter = gate?.open;
  // Varek: walk in, the fight starts; kill him
  const enc = g.encounters.find((e) => e.kind === 'boss');
  p.pos.set(enc.arena.x, 0, enc.arena.z + enc.arena.r - 3); p.setState('move'); g.lastGood = null;
  run(120);
  out.fight = enc.active;
  enc.boss.hp = 1; enc.boss.receive?.({ dmg: 1e6, poise: 999, srcPos: p.pos.clone(), attacker: p }); if (enc.boss.alive) { enc.boss.hp = 0; enc.boss.die?.(); }
  run(60 * 4);
  out.defeated = enc.defeated; out.tick = d.raids?.r1f;
  return out;
});
await page.waitForTimeout(3500); // (the victory screen comes up on a timer)
Object.assign(res, await page.evaluate(() => ({ victory: !document.getElementById('victory')?.classList.contains('hidden'), again: document.getElementById('again')?.textContent })));
console.log(JSON.stringify(res, null, 1));
check(res.none.join() === 'Ashfall Ward:open,The Sump Lines:sealed,Saint Orsk\'s Spire:sealed,The Sentinel\'s Bastion:sealed', 'no gems: only Ashfall Ward');
check(/Sealed: you need the Penitent's Gem \(Executor Hask\), the Cryo Choir Gem \(Sister Vael\), the Slag Engine Gem/.test(res.sealedText) && !res.deployShown, 'a sealed area says which gems and whose, and has no Deploy');
check(res.fallback === 'r1a1', 'a raid into a sealed area starts Ashfall Ward instead');
check(res.hask.join().includes('The Sump Lines:open') && res.hask.join().includes('Spire:sealed'), "Hask's gem opens the Sump Lines");
check(res.vael.join().includes('Spire:open') && res.vael.join().includes('Bastion:sealed'), "Vael's gem opens the Spire");
check(res.all.every((x) => x.endsWith('open')) && res.finalLayout === 'r1f', 'all three gems open the Bastion');
check(res.bastion.boss === 'varek' && res.bastion.enemies.length >= 6 && res.bastion.enemies.length <= 10, 'the Bastion: a few enemies and Varek');
check(res.walkThrough, 'one walk from the beacon to the throne');
check(res.gateBefore === false && res.gateAfter === true, 'the way on fogged until the court is clear');
check(res.fight && res.defeated && res.victory && res.again === 'Back to Map' && res.tick >= 1, "Varek's death: victory, Back to Map, the area ticked");
await page.screenshot({ path: '/tmp/look/final-victory.png' });
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
console.log(fails.length ? `${fails.length} FAILED` : 'all passed');
