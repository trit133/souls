// Combo holds (hold.js): a combo catching a weak enemy holds it until the combo ends; unparryable attacks and a
// boss on its knees aren't weak; past 4 s locked a grunt shrugs free and a boss bursts (push + 8% health), then
// can't be held for a while. node scripts/hold.mjs
import { chromium } from 'playwright';
import { COMBOS } from '../src/combos.js';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('http://localhost:5180/?chain'); await page.waitForTimeout(800);
const crown = COMBOS.knight.find((c) => c.id === 'crown').steps;
const out = await page.evaluate((crown) => {
  const LAYOUT = ['mini:hask', 'camp', 'ruins', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
  const o = {};
  const step = (n = 1) => { for (let i = 0; i < n; i++) game.step(1 / 60, 1 / 60); };
  const setup = (freeze = true) => {
    game.loop = () => {}; game.start('knight'); game.audio.play = () => {}; game.buildRun(LAYOUT, 5); game.input.move = () => ({ x: 0, y: 0 });
    const p = game.player; p.hp = p.maxHp = 1e4; p.st = p.maxSt = 500;
    const g = game.enemies.find((e) => e.type === 'grunt');
    for (const e of game.enemies) if (e !== g) { e.die(true); e.rig.root.visible = false; }
    g.hp = g.maxHp = 1e5;
    p.pos.set(g.pos.x, 0, g.pos.z + 1.7); p.yaw = Math.PI;
    return [p, g];
  };
  // play the Crown Cleave combo, recording the grunt's state at each step
  const combo = (p, g, onStart) => {
    const states = [];
    game.input.pressed.add('attack'); step(); onStart?.();
    for (let i = 1; i < crown.length; i++) {
      let guard = 0;
      while (!(p.cmb && p.cmb.openAt != null) && guard++ < 120) { step(); states.push(g.state); }
      step(2); game.input.pressed.add('attack'); step(); states.push(g.state);
    }
    let guard = 0;
    while (p.state === 'attack' && guard++ < 200) { step(); states.push(g.state); }
    return states;
  };
  // a) an idle grunt (not attacking yet): held from the second combo hit, freed after the combo
  let [p, g] = setup();
  g.alert(); g.cd = 99; // it won't attack
  let st = combo(p, g);
  let t = 0; while (g.state === 'held' && t < 3) { step(); t += 1 / 60; }
  o.idle = { heldDuring: st.includes('held'), firstHeldAt: st.indexOf('held'), freedAfterSec: +t.toFixed(2), now: g.state };
  // b) a grunt mid-slash (parryable): the slash is cut off and it's held
  [p, g] = setup();
  st = combo(p, g, () => { g.startAttack(g.moves.slash); });
  o.slash = { heldDuring: st.includes('held'), attackCut: !st.slice(st.indexOf('held')).includes('attack') };
  // c) during an unparryable leap's wind-up: not held
  [p, g] = setup();
  g.startAttack(g.moves.leap); g.atk.t = 0.1;
  const hit = { dmg: 10, poise: 5, srcPos: p.pos, attacker: p, combo: true };
  const r = g.receive(hit);
  o.leapWindup = { result: r, state: g.state };
  // d) a boss on his knees: never held
  const hask = game.encounters.find((e) => e.boss?.cfg.id === 'hask').boss;
  game.startEncounter(game.encounters.find((e) => e.boss === hask)); for (let i = 0; i < 200; i++) step();
  hask.setState('broken'); hask.hp = hask.maxHp = 1e5;
  o.broken = { result: hask.receive({ ...hit, srcPos: hask.pos.clone().add({ x: 0, y: 0, z: 1 }) }), state: hask.state };
  // e) a boss locked over 4 s: it bursts, players near it are pushed and hurt 8%, then it can't be held for 8 s
  hask.setState('neutral'); p.pos.set(hask.pos.x, 0, hask.pos.z + 2.5); p.hp = p.maxHp = 200; p.setState('move');
  let held = 0; o.log = []; let lastHp = p.hp;
  for (let i = 0; i < 60 * 6; i++) { if (i % 30 === 0 && hask.state !== 'attack') hask.receive({ ...hit, srcPos: p.pos }); if (hask.state === 'held') held += 1 / 60; step(); if (hask.atkKey === 'holdBurst' && hask.state === 'attack' && !o.burstAt) { o.burstAt = +held.toFixed(2); o.hpAtBurst = p.hp; o.posAtBurst = p.pos.clone(); } if (o.burstAt && o.pushed == null && hask.atkKey !== 'holdBurst') o.pushed = +p.pos.distanceTo(o.posAtBurst).toFixed(2); if (p.hp !== lastHp) { o.log.push([i, hask.atkKey, hask.state, +(lastHp - p.hp).toFixed(1), hask.atk?.t?.toFixed(2)]); lastHp = p.hp; } }
  o.burst = { burstAfterHeld: o.burstAt, burstDamage: o.log.filter((l) => l[1] === 'holdBurst').reduce((a, l) => a + l[3], 0), pushedBefore2ndAttack: o.pushed, immuneNow: hask.receive({ ...hit, srcPos: p.pos }) !== 'held' };
  // f) a grunt locked over 4 s shrugs free, no burst
  [p, g] = setup(); g.alert(); g.cd = 99;
  for (let i = 0; i < 60 * 5; i++) { if (i % 30 === 0) g.receive({ ...hit, srcPos: p.pos }); step(); }
  o.gruntLock = { state: g.state, immune: g.receive({ ...hit, srcPos: p.pos }) !== 'held', burst: g.atkKey === 'holdBurst' };
  return o;
}, crown);
await b.close();
for (const [k, v] of Object.entries(out)) if (!['burstAt', 'hpAtBurst', 'posAtBurst', 'log', 'pushed'].includes(k)) console.log(k.padEnd(11), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
