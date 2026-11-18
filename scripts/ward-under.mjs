// Ashfall Ward's basements and the way to the boss (ward.js, main.js bossPortal): the vaults' floors and heights
// (the corridor's steps down, the sunken hall, the dais, the raised chamber), the boss's basement flat; and breaking
// the last shrine opens a portal by it that takes you to the boss's corridor, the blast door open ahead.
// Shots /tmp/look/under-*.png. node scripts/ward-under.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(process.argv[2] || 'http://localhost:5180/'); await page.waitForTimeout(900);
const info = await page.evaluate(() => {
  const g = game; g.loop = () => {}; g.audio.play = () => {};
  g.start('knight'); g.buildRun({ raid: 'r1a1' }, 4242, 1);
  for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
  const p = g.player; p.hp = p.maxHp = 1e9;
  for (const e of [...g.enemies, ...g.reserves]) { if (e.alive) e.die(true); e.rig.root.visible = false; }
  const D = g.world.dungeon, w = g.world, f = (x, z) => +w.floorAt(x, z).toFixed(2);
  const vault = D.unders.find((u) => u.kind === 'vault' || u.kind === 'cache'), boss = D.unders.find((u) => u.kind === 'boss');
  window.__u = { vault: vault && { ox: vault.ox, oz: vault.oz, kind: vault.kind }, boss: { ox: boss.ox, oz: boss.oz } };
  return { unders: D.unders.map((u) => u.kind), vault: vault && { arrive: f(vault.ox, vault.oz), corridor: f(vault.ox, vault.oz - 10.5), hall: f(vault.ox, vault.oz - 28), dais: f(vault.ox, vault.oz - 40), chamber: f(vault.ox + 22, vault.oz - 28) },
    boss: { arrive: f(boss.ox, boss.oz), corridor: f(boss.ox, boss.oz - 12), arena: f(boss.ox, boss.oz - 47) }, style: w.styleAt(vault?.ox ?? 0, (vault?.oz ?? 0) - 28), arenaStyle: w.styleAt(boss.ox, boss.oz - 47) };
});
console.log(JSON.stringify(info));
const shot = async (name, x, z) => {
  await page.evaluate(([x, z]) => { const g = game, p = g.player; p.pos.set(x, 0, z); p.gy = g.world.floorAt(x, z); p.setState('move'); p.yaw = Math.PI; g.lastGood = null; g.camPos?.set(x, 14, z + 12); for (let i = 0; i < 60; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera); }, [x, z]);
  await page.screenshot({ path: `/tmp/look/under-${name}.png` });
};
const U = await page.evaluate(() => window.__u);
if (U.vault) { await shot('arrive', U.vault.ox, U.vault.oz - 2); await shot('steps', U.vault.ox, U.vault.oz - 9); await shot('hall', U.vault.ox - 4, U.vault.oz - 26); await shot('dais', U.vault.ox, U.vault.oz - 34); await shot('chamber', U.vault.ox + 17, U.vault.oz - 27); }
await shot('boss', U.boss.ox, U.boss.oz - 6);
// walk the vault: down the corridor's steps into the hall, up onto the dais and into the raised chamber
const walk = U.vault ? await page.evaluate(({ ox, oz }) => {
  const g = game, p = g.player; p.pos.set(ox, 0, oz - 2); p.gy = 0; p.setState('move'); g.lastGood = null; const seen = [];
  for (const [tx, tz] of [[ox, oz - 20], [ox + 3.5, oz - 26], [ox + 3.5, oz - 33], [ox, oz - 39], [ox + 3.5, oz - 33], [ox + 13, oz - 28], [ox + 22, oz - 28]]) {
    for (let i = 0; i < 700; i++) { const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.6) break; g.input.move = () => ({ x: dx / d, y: -dz / d }); g.step(1 / 60, 1 / 60); if (p.state !== 'move') seen.push(p.state); }
    seen.push(`${Math.round(tx - ox)},${Math.round(tz - oz)}:${(p.pos.x - ox).toFixed(0)},${(p.pos.z - oz).toFixed(0)}@${p.gy.toFixed(1)}`);
  }
  g.input.move = () => ({ x: 0, y: 0 }); return seen;
}, U.vault) : null;
console.log('vault walk', walk?.join(' '));
// the shrines: break them all; the last opens the door and a portal by it
const portal = await page.evaluate(() => {
  const g = game, p = g.player, S = g.seals, D = g.world.dungeon, out = {};
  out.before = D.stairs.length;
  for (const s of S.list) S.breakSeal(s);
  out.after = D.stairs.length; out.portal = !!D.bossPortal;
  const st = D.stairs[D.stairs.length - 1]; out.label = st.label;
  p.pos.set(st.x, 0, st.z); p.setState('move'); g.lastGood = null; for (let i = 0; i < 3; i++) g.step(1 / 60, 1 / 60);
  out.prompt = document.getElementById('prompt')?.textContent;
  g.input.pressed.add('interact'); for (let i = 0; i < 3; i++) g.step(1 / 60, 1 / 60);
  const u = D.unders.find((x) => x.kind === 'boss'); out.at = [+(p.pos.x - u.ox).toFixed(1), +(p.pos.z - u.oz).toFixed(1), +p.gy.toFixed(1)];
  for (let i = 0; i < 50; i++) g.step(1 / 60, 1 / 60); g.pixel.render(g.scene, g.camera); window.__shotReady = true;
  return out;
});
await page.screenshot({ path: '/tmp/look/under-portal-arrive.png' });
const portal2 = await page.evaluate(() => {
  const g = game, p = g.player, D = g.world.dungeon, out = {}, u = D.unders.find((x) => x.kind === 'boss');
  // walk north through the open door to the arena's edge
  for (let i = 0; i < 600 && p.pos.z > u.oz - 36; i++) { g.input.move = () => ({ x: (u.ox - p.pos.x) * 0.3, y: 1 }); g.step(1 / 60, 1 / 60); }
  g.input.move = () => ({ x: 0, y: 0 });
  out.reached = +(p.pos.z - u.oz).toFixed(1); out.bossActive = !!g.bossActive || !!g.activeEnc;
  return out;
});
console.log('portal', JSON.stringify(portal), JSON.stringify(portal2));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
