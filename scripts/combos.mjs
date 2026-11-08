// Combos: every combo of every class played with exact timing (inside the 180 ms window), then pressed early and
// late (normal attacks instead; the window is 180 ms), with damage, stamina, staggers per enemy and an interruption check.
// node scripts/combos.mjs [shotsTag]  (shots of each finisher -> /tmp/look/<tag>-combo-<id>.png)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { COMBOS } from '../src/combos.js';
const tag = process.argv[2] || '';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('http://localhost:4173/'); await page.waitForTimeout(800);
const out = [];
const kinds = { knight: ['crown', 'bulwark', 'tempest', 'vanguard'], rogue: ['cuts', 'viper', 'hemorrhage', 'reel'], mage: ['rime', 'arc', 'lance', 'shatter'] };
for (const [kind, ids] of Object.entries(kinds)) for (const id of ids) for (const mode of ['combo', 'early', 'late']) {
  const C = COMBOS[kind].find((c) => c.id === id);
  const r = await page.evaluate(async ({ kind, id, mode, shot, C }) => {
    document.getElementById('hud').style.display = 'none';
    game.loop = () => {}; game.start(kind); game.audio.play = () => {};
    game.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
    const p = game.player; p.mana = p.maxMana = 200;
    // a dummy: a grunt that stands still and takes the hits
    const e = game.enemies.find((x) => x.type === 'grunt');
    for (const x of game.enemies) if (x !== e) { x.die(true); x.rig.root.visible = false; }
    e.hp = e.maxHp = 1e5; e.update = () => {}; e.yaw = 0;
    p.pos.set(e.pos.x, 0, e.pos.z + 1.7); p.yaw = Math.PI; p.setState('move');
    let stick = { x: 0, y: 0 }; game.input.move = () => stick;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.step(1 / 60, 1 / 60); } };
    const hp0 = e.hp, st0 = p.st, moves = [], stag = [];
    const origReceive = e.receive.bind(e);
    e.receive = (info) => { const res = origReceive(info); if (res === 'stagger') stag.push(p.atkKey); return res; };
    const press = (a) => { if (a === 'roll') stick = id === 'reel' ? { x: 0, y: 0 } : { x: 0, y: 1 }; game.input.pressed.add(a); };
    const record = () => { const k = p.state === 'attack' ? p.atkKey : p.state; if (moves[moves.length - 1] !== k) moves.push(k); };
    press(C.steps[0][0]); step(); record();
    for (let i = 1; i < C.steps.length; i++) {
      const [input] = C.steps[i];
      // wait for this move's window to open (or the move to end)
      let guard = 0;
      while (!(p.cmb && p.cmb.openAt != null) && guard++ < 120) { step(); record(); if (mode === 'early' && p.cmb && p.comboTime() >= p.cmb.node.at - 0.07) break; }
      if (mode === 'early') { press(input); step(); record(); }
      else if (mode === 'late') { const t0 = game.time; while (game.time - t0 < 0.25) { step(); record(); } press(input); step(); record(); }
      else { step(2); press(input); step(); record(); }
      stick = { x: 0, y: 0 };
      if (mode !== 'combo') break; // after a miss the combo is over: one normal move is enough to check
    }
    let guard = 0;
    while (p.state !== 'move' && guard++ < 200) { step(); record(); if (shot && mode === 'combo' && p.atk?.def.finisher && p.atk.t > p.atk.def.hits?.[0]?.t0 && !window.__shot) { window.__shot = 1; const c = game.camera, a = p.yaw + 1.1; c.position.set(p.pos.x + Math.sin(a) * 4.6, 2.4, p.pos.z + Math.cos(a) * 4.6); c.lookAt(p.pos.x, 0.9, p.pos.z); game.pixel.render(game.scene, game.camera); window.__ready = true; return { pause: true }; } }
    return { id, mode, moves: moves.filter((m) => m !== 'move'), dmg: +(hp0 - e.hp).toFixed(1), stamina: +(st0 - p.st).toFixed(1), staggers: stag.length, cmbLeft: !!p.cmb };
  }, { kind, id, mode, shot: !!tag, C: { steps: C.steps } });
  if (r.pause) {
    await page.screenshot({ path: `/tmp/look/${tag}-combo-${id}.png`, clip: { x: 240, y: 60, width: 800, height: 600 } });
    await page.evaluate(() => { window.__shot = 0; });
    continue;
  }
  out.push([kind, r]);
}
// a hit during a combo's first move breaks it; from the second move on the player is armoured: hurt, but the combo
// goes on to its finisher
const interrupt = await page.evaluate(() => {
  const setup = () => {
    game.start('knight'); game.audio.play = () => {};
    game.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
    const p = game.player, e = game.enemies.find((x) => x.type === 'grunt');
    p.pos.set(e.pos.x, 0, e.pos.z + 1.7); p.yaw = Math.PI; p.setState('move'); game.input.move = () => ({ x: 0, y: 0 });
    game.input.pressed.add('attack'); game.step(1 / 60, 1 / 60);
    return [p, e];
  };
  const out = {};
  let [p, e] = setup();
  e.resolve = () => game.resolveHit(e, p, e.moves.slash.hits[0], e.moves.slash);
  e.resolve();
  out.firstMove = { state: p.state, combo: !!p.cmb };
  [p, e] = setup();
  while (!(p.cmb && p.cmb.openAt != null)) game.step(1 / 60, 1 / 60);
  game.input.pressed.add('attack'); game.step(1 / 60, 1 / 60);
  const hp0 = p.hp;
  game.resolveHit(e, p, e.moves.leap.hits[0], e.moves.leap); // a heavy hit too
  out.secondMove = { move: p.atkKey, state: p.state, hpLost: Math.round(hp0 - p.hp), combo: !!p.cmb };
  while (!(p.cmb && p.cmb.openAt != null) && p.state === 'attack') game.step(1 / 60, 1 / 60);
  game.input.pressed.add('attack'); game.step(1 / 60, 1 / 60);
  out.finisher = p.atkKey;
  return out;
});
await b.close();
for (const [k, r] of out) console.log(k.padEnd(7), r.id.padEnd(11), r.mode.padEnd(6), `dmg ${String(r.dmg).padStart(5)}  st ${String(r.stamina).padStart(5)}  stag ${r.staggers}  `, r.moves.join(' > '));
console.log('interrupt', JSON.stringify(interrupt));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
