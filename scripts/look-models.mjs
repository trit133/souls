// Close-ups of every model for the retheme review: the enemy types, the bosses and the three player characters,
// each placed in the open and shot from the front-left at idle and mid-attack. /tmp/look/model-<name>-<pose>.png
// node scripts/look-models.mjs [names] [url]   names: comma list (grunt,spear,archer,brute,hask,vael,gorrath,varek,knight,rogue,mage)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const names = (process.argv[2] || 'grunt,spear,archer,brute,hask,vael,gorrath,varek,knight,rogue,mage').split(',');
const url = process.argv[3] || 'http://localhost:4173/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
for (const name of names) for (const pose of ['idle', 'attack']) {
  await page.evaluate(({ name, pose }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    const players = ['knight', 'rogue', 'mage'];
    g.start(players.includes(name) ? name : 'knight');
    g.buildRun(['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'], 7);
    const p = g.player; p.hp = p.maxHp = 1e9;
    let who;
    if (players.includes(name)) who = p;
    else who = g.bosses.find((x) => x.cfg.id === name) || g.enemies.find((x) => x.type === name);
    for (const e of [...g.enemies, ...g.bosses]) if (e !== who) { e.rig.root.visible = false; e.update = () => {}; }
    const X = p.pos.x, Z = p.pos.z - 5; // (open ground near the start, lit)
    who.pos.set(X, 0, Z); who.yaw = 0;
    if (who !== p) { p.pos.set(X, 0, Z + 8); p.rig.root.visible = false; who.update = () => {}; }
    who.rig.root.position.set(X, 0, Z);
    if (who !== p) { who.sitting = false; who.setState('chase'); who.target = p; }
    if (pose === 'attack') {
      if (who === p) { p.setState('move'); g.input.pressed.add('attack'); for (let i = 0; i < 12; i++) g.step(1 / 60, 1 / 60); }
      else { const mv = Object.keys(who.moves).find((k) => who.moves[k].hits?.length) ; who.startAttack(who.moves[mv]); for (let i = 0; i < 40; i++) { who.atk && (who.atk.t += 1 / 60); who.rig.update?.(1 / 60); } }
    }
    for (let i = 0; i < 20; i++) g.step(1 / 60, 1 / 60);
    if (who !== p) { if (pose === 'idle') for (let i = 0; i < 30; i++) { who.rig.apply({ armR: [-0.3, 0, -0.15], foreR: [-0.5, 0, 0], armL: [0.1, 0, 0.15], legL: [-0.1, 0, 0], legR: [0.1, 0, 0] }, 1 / 60, 30); } who.rig.root.position.set(X, 0, Z); who.rig.root.rotation.y = 0; }
    const s = who.rig.root.scale.y || 1, c = g.camera;
    g.camLock = true;
    c.position.set(X + 1.9 * s, 1.6 * s, Z + 3.0 * s); c.lookAt(X, 0.95 * s, Z);
    g.pixel.render(g.scene, c);
  }, { name, pose });
  await page.screenshot({ path: `/tmp/look/model-${name}-${pose}.png` });
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
