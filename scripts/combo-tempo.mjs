// Combo tempo: every combo played with each press made as soon as its window opens; prints when each move first
// hits the dummy (s from the start) and the gaps. The first two moves keep their pace; the rest follow quickly.
// node scripts/combo-tempo.mjs [url]
import { chromium } from 'playwright';
import { COMBOS } from '../src/combos.js';
const url = process.argv[2] || 'http://localhost:4173/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 480, height: 270 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
for (const [kind, list] of Object.entries(COMBOS)) for (const C of list) {
  const r = await page.evaluate(({ kind, steps, id }) => {
    const g = game; g.loop = () => {}; g.start(kind); g.audio.play = () => {};
    g.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
    const p = g.player; p.mana = p.maxMana = 200; p.st = p.maxSt = 999;
    const e = g.enemies.find((x) => x.type === 'grunt');
    for (const x of g.enemies) if (x !== e) { x.die(true); x.rig.root.visible = false; }
    e.hp = e.maxHp = 1e6; e.update = () => {}; e.yaw = 0;
    p.pos.set(e.pos.x, 0, e.pos.z + 1.7); p.yaw = Math.PI; p.setState('move');
    let stick = { x: 0, y: 0 }; g.input.move = () => stick;
    let t = 0; const first = {}; let depth = 1, hp = e.hp;
    const step = () => { g.step(1 / 60, 1 / 60); t += 1 / 60; if (e.hp < hp) { if (first[depth] == null) first[depth] = +t.toFixed(2); hp = e.hp; } };
    const press = (a) => { if (a === 'roll') stick = id === 'reel' ? { x: 0, y: 0 } : { x: 0, y: 1 }; g.input.pressed.add(a); };
    press(steps[0][0]); step();
    for (let i = 1; i < steps.length; i++) {
      let guard = 0; while (!(p.cmb && p.cmb.openAt != null) && guard++ < 120) step();
      press(steps[i][0]); step(); stick = { x: 0, y: 0 }; depth = i + 1;
    }
    for (let i = 0; i < 90; i++) step();
    return first;
  }, { kind, steps: C.steps, id: C.id });
  const ts = C.steps.map((_, i) => r[i + 1]);
  const gaps = ts.slice(1).map((x, i) => (x != null && ts[i] != null ? +(x - ts[i]).toFixed(2) : '-'));
  console.log(kind.padEnd(7), C.id.padEnd(11), 'hits at', JSON.stringify(ts), ' gaps', JSON.stringify(gaps));
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
