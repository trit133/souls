// Enemy elements by dungeon: about half carry one in the first, most in the second (a third of those two), all of
// them in the third (often two, sometimes three) with bigger shares; regular enemies' elements are extra damage on
// top of the hit (a boss's are part of it). The status icons over the health bar: big, flashing on each hit that
// builds them. Screenshot /tmp/elements-hud.png. node scripts/elements.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(url); await page.waitForTimeout(700);
const out = await page.evaluate(() => {
  const g = game, o = {}; g.loop = () => {}; g.audio.play = () => {};
  // the mix over several runs, per act
  for (let act = 0; act < 4; act++) {
    let n = 0, one = 0, two = 0, three = 0, share = 0;
    for (const seed of [11, 22, 33, 44, 55]) {
      g.buildRun('dungeon', seed, 1); if (act) g.buildAct(act);
      for (const e of g.enemies) {
        if (e.effigy) continue;
        n++;
        const k = Object.keys(e.elems || {}).filter((x) => x !== 'fire' || e.elite !== 'blazing');
        const c = Object.keys(e.elems || {}).length;
        if (c === 1) one++; else if (c === 2) two++; else if (c >= 3) three++;
        if (c) share += Object.values(e.elems).reduce((a, v) => a + v, 0) / c;
      }
    }
    o['act' + act] = { enemies: n, withElement: Math.round((one + two + three) / n * 100) + '%', one, two, three, avgSharePerElement: +(share / Math.max(1, one + two + three)).toFixed(2) };
  }
  // the same slash with and without an element: the element is added on top
  g.start('knight'); g.buildRun(['camp', 'boss'], 5, 1);
  const p = g.player, e = g.enemies.find((x) => x.type === 'grunt'), def = e.T.moves.slash;
  p.pos.set(e.pos.x, 0, e.pos.z + 1.6); e.yaw = 0;
  const hit = (elems) => { e.setElems(elems); p.hp = p.maxHp; p.setState('move'); p.cmb = null; p.status.reset(); g.resolveHit(e, p, def.hits[0], def); return Math.round(p.maxHp - p.hp); };
  o.slash = { plain: hit(null), withFire20: hit((() => { const x = { fire: 0.2 }; Object.defineProperty(x, 'add', { value: true }); return x; })()) };
  // a boss keeps its element inside the hit
  const hask = g.boss; hask.elems = { fire: 0.3 };
  // icons: a fire hit flashes the fire icon; frost builds next to it
  p.hp = p.maxHp; p.status.reset();
  p.status.add('fire', 40, g); p.status.add('frost', 25, g);
  g.ui.update(0.016, p);
  const el = document.querySelector('#pstatus .psicon');
  o.icons = { count: document.querySelectorAll('#pstatus .psicon').length, width: el?.getBoundingClientRect().width, flashing: el?.classList.contains('hit') };
  return o;
});
await page.evaluate(() => { game.mode = 'play'; game.ui.show('hud'); game.ui.show('menu', false); for (let i = 0; i < 4; i++) game.step(1 / 60, 1 / 60); game.player.status.add('fire', 30, game); game.ui.update(0.016, game.player); game.pixel.render(game.scene, game.camera); });
await page.waitForTimeout(60);
await page.screenshot({ path: '/tmp/elements-hud.png', clip: { x: 0, y: 0, width: 520, height: 160 } });
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(6), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
