// A dungeon played through by script: the three kinds of seal (elite pack, hold the circle, cursed altar), the door
// opening at three, bonus gold for the fourth, a chamber paying its gold once cleared, the full-clear bonus, the
// mini boss fight behind the door, the stair down and the next dungeon, then the approach to Varek.
// node scripts/seals.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const g = game, o = {};
  g.loop = () => {}; g.audio.play = () => {};
  g.newLayout = () => 'dungeon';
  const realRandom = Math.random; let s = 12345; Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  g.start('knight');
  const p = g.player; p.hp = p.maxHp = 1e6; p.iframe = () => true; // untouchable
  const step = (sec) => { for (let i = 0; i < sec * 60; i++) g.step(1 / 60, 1 / 60); };
  const goto = (x, z) => { p.pos.set(x, 0, z); g.lastGood = null; };
  const seal = (k) => g.seals.list.find((s) => s.def.kind === k && s.state !== 'broken');
  o.start = { act: g.act, area: g.areaName, sealed: g.world.dungeon.enc.sealed, doorShut: !g.world.gates[g.world.dungeon.enc.gateIn].open, enemies: g.enemies.length, reserves: g.reserves.length, mapOn: !g.minimap.el.classList.contains('hidden') };
  // 1. an elite pack: kill the guards, the seal breaks
  let S = seal('elite');
  goto(S.def.x, S.def.z + 4); step(0.3);
  for (const sp of S.def.guards) sp.enemy.die();
  step(0.3);
  o.elite = { state: S.state, broken: g.seals.broken, crystal: S.def.crystal.visible };
  // 2. hold the circle: waves come in while you stand in it; 30 s
  S = seal('circle');
  const e0 = g.enemies.length;
  goto(S.def.x + 1, S.def.z + 1); step(1);
  o.circleStart = { state: S.state, calledIn: g.enemies.length - e0, prompt: document.getElementById('prompt').textContent };
  goto(S.def.x + 12, S.def.z); step(4); const slipped = S.prog;
  goto(S.def.x + 1, S.def.z + 1);
  for (let t = 0; t < 40 && S.state !== 'broken'; t++) { step(1); goto(S.def.x + 1, S.def.z + 1); }
  o.circle = { state: S.state, calledIn: g.enemies.length - e0, progWhenOutside: +slipped.toFixed(1), broken: g.seals.broken, leftWaiting: g.reserves.filter((e) => e.mod === S.def.mod).length };
  // 3. the altar: come near, enemies pour out, break the effigies
  S = seal('altar');
  const e1 = g.enemies.length;
  goto(S.def.x, S.def.z + 7); step(6.5);
  o.altarStart = { state: S.state, calledIn: g.enemies.length - e1, prompt: document.getElementById('prompt').textContent };
  for (const sp of S.def.effigies) sp.enemy.receive({ dmg: 1e5, poise: 0, srcPos: p.pos, attacker: p });
  step(0.5);
  const gate = g.world.gates[g.world.dungeon.enc.gateIn];
  o.altar = { state: S.state, broken: g.seals.broken, doorOpen: gate.open, sealed: g.world.dungeon.enc.sealed, label: g.seals.label.s.visible };
  // 4. a fourth seal pays a bonus
  const bank0 = g.runBanked;
  S = seal('elite'); for (const sp of S.def.guards) sp.enemy.die(); step(0.3);
  o.fourth = { broken: g.seals.broken, bonus: g.runBanked - bank0 };
  // 5. a chamber pays when everything in it is dead
  const room = g.world.mods.find((m) => m.cell?.kind === 'room' && !m.cleared && g.enemies.some((e) => e.mod === m.i && e.alive));
  const bank1 = g.runBanked;
  for (const e of g.enemies) if (e.mod === room.i && e.alive) { e.lastHitBy = p; e.die(); }
  step(0.2);
  o.chamber = { cleared: !!room.cleared, gold: g.runBanked - bank1, pct: g.clearPct() };
  // 6. kill everything: the full clear bonus
  const bank2 = g.runBanked;
  for (const e of g.enemies) if (e.alive && !e.event) e.die();
  step(0.3);
  o.fullClear = { pct: g.clearPct(), paid: g.clearPaid, gold: g.runBanked - bank2 };
  // 7. through the door into the arena: the fight starts and the fog closes
  const enc = g.world.dungeon.enc;
  goto(enc.arena.x, enc.arena.z); step(0.5);
  o.fight = { active: enc.active, boss: enc.boss.name, doorClosed: !gate.open };
  enc.boss.hp = 1; enc.boss.receive({ dmg: 50, poise: 0, srcPos: p.pos, attacker: p }); step(5);
  o.won = { defeated: enc.defeated, portal: !!g.portal, mode: g.mode };
  if (g.mode === 'reward') g.claimReward('rest');
  goto(g.portal.x, g.portal.z); step(0.2);
  o.portalPrompt = document.getElementById('prompt').textContent;
  g.input.pressed.add('interact'); step(0.3);
  o.act2 = { act: g.act, area: g.areaName, at: [p.pos.x, p.pos.z], enemies: g.enemies.length, seals: g.seals.list.length, broken: g.seals.broken, tier: g.enemies[0].tier, boss: g.world.dungeon.bossId };
  // 8. on to the third and then Varek
  g.enterAct(2); o.act3 = { area: g.areaName, boss: g.world.dungeon.bossId, tier: g.enemies[0].tier };
  g.enterAct(3);
  o.varek = { area: g.areaName, dungeon: !!g.world.dungeon, boss: g.boss?.name, tier: g.enemies[0]?.tier, mapHidden: g.minimap.el.classList.contains('hidden'), start: [p.pos.x, p.pos.z] };
  step(1);
  Math.random = realRandom;
  return o;
});
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(12), typeof v === 'string' ? v : JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
