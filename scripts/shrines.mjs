// The deeper areas' own shrines (seals.js). Flood Valves (the Sump Lines): coming near starts it; standing at a
// valve turns it (5 s), walking off lets it slip back; the drowned come in every 7 s; three open break it. Choir
// Bells (Saint Orsk's Spire): coming near starts the hymn; a wrong bell starts it over and calls guards in; striking
// the four notes in order breaks it; the bells take no damage and never die. Both maps: every enemy and stair can be
// reached, nothing's stuck in a wall. node scripts/shrines.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4199/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(900);
const res = await page.evaluate(() => {
  const g = game, out = {}; g.loop = () => {}; g.audio.play = () => {};
  const run = (n) => { for (let i = 0; i < n; i++) g.step(1 / 60, 1 / 60); };
  const calm = () => { for (const e of [...g.enemies, ...g.reserves]) if (!e.T.still) e.update = () => {}; };
  g.start('knight');
  // ---- the valves: draw raids until one has the valve shrine (it always does in the Sump Lines)
  for (let seed = 1; seed < 9; seed++) {
    g.buildRun({ raid: 'r1a2' }, seed * 777, 1);
    const D = g.world.dungeon, p = g.player; p.hp = p.maxHp = 1e9; calm();
    out.sumpReach = { enemies: g.enemies.every((e) => D.reach(e.pos.x, e.pos.z)), stairs: D.stairs.every((s) => D.reach(s.to.x, s.to.z)), kinds: D.shrineKinds.join(',') };
    const s = g.seals.list.find((x) => x.def.kind === 'valve'); if (!s) continue;
    const d = s.def, r0 = g.reserves.length;
    p.pos.set(d.x, 0, d.z + 3); p.setState('move'); run(10);
    out.valveStarted = s.state;
    const v = d.valves[0];
    p.pos.set(v.x, 0, v.z); run(60 * 2); const half = v.prog;
    p.pos.set(d.x, 0, d.z + 3); run(60 * 2); const slipped = v.prog;
    out.valveSlip = { after2s: +half.toFixed(2), after2sAway: +slipped.toFixed(2) };
    for (const vv of d.valves) { p.pos.set(vv.x, 0, vv.z); run(60 * 6); }
    out.valves = { done: d.valves.map((x) => x.done), broken: s.state, calledIn: r0 - g.reserves.length, prompt: g.seals.promptFor(p) };
    break;
  }
  // ---- the bells
  for (let seed = 1; seed < 9; seed++) {
    g.buildRun({ raid: 'r1a3' }, seed * 777, 1);
    const D = g.world.dungeon, p = g.player; p.hp = p.maxHp = 1e9; calm();
    out.spireReach = { enemies: g.enemies.every((e) => D.reach(e.pos.x, e.pos.z)), stairs: D.stairs.every((s) => D.reach(s.to.x, s.to.z)), kinds: D.shrineKinds.join(',') };
    const s = g.seals.list.find((x) => x.def.kind === 'bells'); if (!s) continue;
    const d = s.def, bells = d.chimes.map((sp) => sp.enemy);
    p.pos.set(d.x, 0, d.z + 3); p.setState('move'); run(10);
    out.bellStarted = s.state; out.song = d.song.join('');
    const strike = (k) => { bells[k].receive({ dmg: 500, poise: 30, srcPos: p.pos.clone(), attacker: p }); run(30); };
    const r0 = g.reserves.length;
    const wrong = [0, 1, 2].find((k) => k !== d.song[0]);
    strike(d.song[0]); const step1 = s.step;
    strike(wrong === d.song[1] ? [0, 1, 2].find((k) => k !== d.song[1]) : wrong); const afterWrong = s.step;
    const called = r0 - g.reserves.length;
    for (const n of d.song) strike(n);
    out.bells = { step1, afterWrong, calledOnWrong: called, broken: s.state, bellHp: bells.map((e) => e.alive && e.hp === e.maxHp), prompt: g.seals.promptFor(p) };
    // the hymn plays on its own (each bell lights in turn)
    break;
  }
  return out;
});
console.log(JSON.stringify(res, null, 1));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
