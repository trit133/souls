// Each character's critical hit: damage, timing, where the player ends up, plus mid-animation screenshots.
// node scripts/crits.mjs [tag]  -> /tmp/look/<tag>-crit-<name>-<n>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const tag = process.argv[2] || 'c';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('http://localhost:4173/?chain'); await page.waitForTimeout(800);
const LAYOUT = ['mini:hask', 'camp', 'ruins', 'bridge', 'mini:vael', 'village', 'crypt', 'mini:gorrath', 'bog', 'gate', 'boss'];
const cases = [['knight', 'broken', false], ['rogue', 'parried', false], ['rogue', 'parried', true], ['rogue', 'broken', false], ['mage', 'broken', false]];
const out = {};
for (const [kind, st, evo] of cases) {
  const name = `${kind}-${st}${evo ? '-evo' : ''}`;
  // set up: a grunt for parried, Hask for broken; player in front
  await page.evaluate(({ kind, st, evo, LAYOUT }) => {
    document.getElementById('hud').style.display = 'none';
    game.loop = () => {}; game.start(kind); game.audio.play = () => {}; game.buildRun(LAYOUT); game.input.move = () => ({ x: 0, y: 0 });
    const p = game.player; p.hp = p.maxHp = 1e9; p.evolved = evo;
    let tg;
    if (st === 'broken') { const enc = game.encounters[0]; enc.active = true; tg = enc.boss; tg.setState('broken'); for (const e of game.enemies) e.die(true); }
    else { tg = game.enemies.find((e) => e.type === 'grunt'); for (const e of game.enemies) if (e !== tg) e.die(true); tg.setState('parried'); }
    tg.hp = tg.maxHp = 5000; tg.yaw = 0;
    p.pos.set(tg.pos.x, 0, tg.pos.z + tg.radius + 1.2); p.yaw = Math.PI; p.setState('move');
    window.__tg = tg; window.__hp0 = tg.hp; window.__t = 0; window.__hit = null;
    if (evo) p.instantRiposte(tg); else p.startRiposte(tg);
  }, { kind, st, evo, LAYOUT });
  const n = 3;
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate(({ i, evo }) => {
      const p = game.player, tg = window.__tg, C = p.crit;
      const until = C.hitAt * [0.5, 1.05, 1.6][i] / p.ripRate;
      while (window.__t < until && p.state === 'riposte') { game.step(1 / 60, 1 / 60); window.__t += 1 / 60; if (window.__hit === null && tg.hp < window.__hp0) window.__hit = +window.__t.toFixed(2); }
      const a = p.yaw + 0.9, d = 4.5;
      game.camera.position.set(p.pos.x + Math.sin(a) * d, 2.2, p.pos.z + Math.cos(a) * d); game.camera.lookAt((p.pos.x + tg.pos.x) / 2, 0.9, (p.pos.z + tg.pos.z) / 2);
      game.pixel.render(game.scene, game.camera);
      return { crit: C.name, rate: p.ripRate };
    }, { i, evo });
    out[name] = r;
    await page.screenshot({ path: `/tmp/look/${tag}-crit-${name}-${i}.png`, clip: { x: 240, y: 60, width: 800, height: 600 } });
  }
  out[name] = { ...out[name], ...(await page.evaluate(() => {
    const p = game.player, tg = window.__tg;
    let guard = 0; while (p.state === 'riposte' && guard++ < 400) { game.step(1 / 60, 1 / 60); window.__t += 1 / 60; if (window.__hit === null && tg.hp < window.__hp0) window.__hit = +window.__t.toFixed(2); }
    const behind = Math.cos(tg.yawTo(p.pos) - tg.yaw) < 0;
    return { dmg: +(window.__hp0 - tg.hp).toFixed(1), hitAtSec: window.__hit, endState: p.state, behindVictim: behind, visible: p.rig.root.visible, y: p.y, reverse: p.rig.reverse };
  })) };
}
await b.close();
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(22), JSON.stringify(v));
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
