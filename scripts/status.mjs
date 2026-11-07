// Status build-up (% per character, 30% cap, 2.5x after the first proc), damage numbers, the riposte on each
// enemy type, and weapon status effects (screenshots). node scripts/status.mjs [tag] -> /tmp/look/<tag>-wfx-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const tag = process.argv[2] || 's';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('http://localhost:4173/'); await page.waitForTimeout(800);
const LAYOUT = ['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
const out = await page.evaluate((LAYOUT) => {
  game.loop = () => {}; const o = {};
  const fresh = (k) => { game.start(k); game.audio.play = () => {}; game.buildRun(LAYOUT); game.input.move = () => ({ x: 0, y: 0 }); return game.player; };
  // build-up: one bleed Infusion (10%) on a fresh grunt, then again after its first proc
  let p = fresh('rogue');
  const g = game.enemies.find((e) => e.type === 'grunt' && e.alive);
  p.statusLv = { bleed: 1 }; g.hp = g.maxHp = 1e6; g.status.reset();
  const r0 = g.status.resist.bleed; let hits1 = 0, hits2 = 0;
  while (!g.status.procd.bleed && hits1 < 200) { game.applyStatus(p, g); hits1++; }
  const r1 = g.status.resist.bleed; g.status.meter.bleed = 0;
  const before = g.status.procAt.bleed;
  while (g.status.procAt.bleed === before && hits2 < 400) { game.applyStatus(p, g); hits2++; }
  o.buildup = { resist0: r0, resistAfter: r1, ratio: +(r1 / r0).toFixed(2), hitsFirst: hits1, hitsSecond: hits2, perHit10pct: 26 };
  o.icons = g.status.bars().map((x) => x.k);
  // damage numbers in the DOM
  const n0 = document.querySelectorAll('.dmgnum').length;
  game.dmgPop(g, 17, 'me'); game.dmgPop(g, 40, 'heavy'); game.dmgPop(g, 48, 'crit'); game.dmgPop(g, 12, 'team');
  for (let i = 0; i < 40; i++) game.dmgPop(g, 1.5, 'dot:bleed');
  o.dmgNums = [...document.querySelectorAll('.dmgnum')].slice(n0).map((d) => d.className.replace('dmgnum ', '') + ':' + d.textContent);
  // riposte (Parry Stab) on each type at tier 0
  o.riposte = {};
  for (const t of ['archer', 'spear', 'grunt', 'brute']) {
    p = fresh('rogue'); const e = game.enemies.find((x) => x.type === t && x.alive);
    if (!e) { o.riposte[t] = 'none'; continue; }
    for (const x of game.enemies) if (x !== e) x.die(true);
    const hp0 = e.hp; e.setState('parried'); p.pos.set(e.pos.x, 0, e.pos.z + e.radius + 1.2); p.yaw = Math.PI; p.setState('move'); p.startRiposte(e);
    for (let i = 0; i < 120 && p.state === 'riposte'; i++) game.step(1 / 60, 1 / 60);
    o.riposte[t] = { hp0, dealt: +(hp0 - Math.max(0, e.hp)).toFixed(1), dead: !e.alive };
  }
  o.wfxKeys = {};
  for (const [k, lv] of [['bleed', { bleed: 1 }], ['fire+bleed', { bleed: 1, fire: 1 }], ['all', { bleed: 1, fire: 1, frost: 1, poison: 1 }], ['none', {}]]) { p.statusLv = lv; game.step(1 / 60, 1 / 60); o.wfxKeys[k] = p.wfxKey; }
  return o;
}, LAYOUT);
for (const [k, lv] of [['bleed', { bleed: 1 }], ['fire', { fire: 1 }], ['frost', { frost: 1 }], ['poison', { poison: 1 }], ['bloodfire', { bleed: 1, fire: 1 }], ['trio', { fire: 1, frost: 1, poison: 1 }], ['gold', { bleed: 1, fire: 1, frost: 1, poison: 1 }]]) {
  await page.evaluate(({ LAYOUT, lv }) => {
    document.getElementById('hud').style.display = 'none';
    game.start('knight'); game.audio.play = () => {}; game.buildRun(LAYOUT); game.input.move = () => ({ x: 0, y: 0 });
    for (const e of game.enemies) { e.die(true); e.rig.root.visible = false; }
    const p = game.player; p.statusLv = lv; p.pos.set(0, 0, 0); p.yaw = 0;
    for (let i = 0; i < 50; i++) { game.step(1 / 60, 1 / 60); game.weaponFx.update(1 / 60); game.fx.update(1 / 60); }
    const c = game.camera; c.position.set(Math.sin(0.6) * 2.6, 1.6, Math.cos(0.6) * 2.6); c.lookAt(0, 0.9, 0);
    game.pixel.render(game.scene, game.camera);
  }, { LAYOUT, lv });
  await page.screenshot({ path: `/tmp/look/${tag}-wfx-${k}.png`, clip: { x: 340, y: 60, width: 600, height: 600 } });
}
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(10), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
