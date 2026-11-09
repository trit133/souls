// Gorrath: his speed against the other mini bosses, the leaping maul drop (landing, slag ring, follow-up sweep),
// and screenshots of the leap. node scripts/gorrath.mjs -> /tmp/look/gorrath-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('http://localhost:5180/?chain'); await page.waitForTimeout(800);
const LAYOUT = ['ruins', 'camp', 'mini:hask', 'bridge', 'village', 'mini:vael', 'crypt', 'bog', 'mini:gorrath', 'gate', 'boss'];
const speeds = await page.evaluate((LAYOUT) => {
  game.loop = () => {}; game.start('knight'); game.audio.play = () => {}; game.buildRun(LAYOUT, 3);
  return Object.fromEntries(game.bosses.filter((x) => x.cfg.id !== 'varek').map((x) => [x.cfg.id, { walk: x.cfg.walk, atk: x.atkSpeed, gap: x.cfg.gap }]));
}, LAYOUT);
console.log('speeds', JSON.stringify(speeds));
// a leap: the player stands 9 m off; step until Gorrath leaps, and shoot it in the air and at the landing
const r = await page.evaluate((LAYOUT) => {
  document.getElementById('hud').style.display = 'none';
  game.loop = () => {}; game.start('knight'); game.audio.play = () => {}; game.buildRun(LAYOUT, 3);
  game.input.move = () => ({ x: 0, y: 0 });
  const enc = game.encounters.find((x) => x.boss?.cfg.id === 'gorrath'), g = enc.boss, p = game.player;
  for (const e of game.enemies) e.die(true);
  p.hp = p.maxHp = 1e4; p.tree = { ...p.tree, fireRes: 50 }; p.status.add = () => {}; // (no burn ticks: they'd swamp the log)
  p.pos.set(enc.arena.x, 0, enc.arena.z + 4); g.pos.set(enc.arena.x, 0, enc.arena.z - 5); g.yaw = 0;
  game.startEncounter(enc); game.activeEnc = enc;
  p.pos.set(enc.arena.x, 0, enc.arena.z + 4); g.pos.set(enc.arena.x, 0, enc.arena.z - 5); g.leapCd = 0;
  const out = { moves: [], hits: [] };
  let t = 0, hp0 = p.hp;
  while (t < 25) {
    // keep the player 8 m away (where he leaps) until he does
    if (g.atkKey !== 'leap') { const dx = p.pos.x - g.pos.x, dz = p.pos.z - g.pos.z, d = Math.hypot(dx, dz) || 1; if (d < 8) p.pos.set(g.pos.x + dx / d * 8, 0, g.pos.z + dz / d * 8); }
    game.step(1 / 60, 1 / 60); t += 1 / 60;
    if (g.state === 'attack' && g.atkKey && out.moves[out.moves.length - 1] !== g.atkKey) out.moves.push(g.atkKey);
    if (p.hp < hp0) { out.hits.push([g.atkKey, Math.round(hp0 - p.hp), +t.toFixed(2)]); hp0 = p.hp; }
    if (g.atkKey === 'leap' && g.y > 2.5) break;
  }
  return out;
}, LAYOUT);
const shoot = async (name) => {
  await page.evaluate(() => { const g = game.encounters.find((x) => x.boss?.cfg.id === 'gorrath').boss, c = game.camera; c.position.set(g.pos.x + 9, 6, g.pos.z + 9); c.lookAt(g.pos.x, 2, g.pos.z); game.pixel.render(game.scene, game.camera); });
  await page.screenshot({ path: `/tmp/look/gorrath-${name}.png` });
};
if (r.moves.includes('leap')) {
  await shoot('air');
  const landing = await page.evaluate(() => {
    const g = game.encounters.find((x) => x.boss?.cfg.id === 'gorrath').boss, p = game.player; let hp0 = p.hp; const hits = [];
    for (let i = 0; i < 34; i++) { game.step(1 / 60, 1 / 60); if (p.hp < hp0) { hits.push([g.atkKey, Math.round(hp0 - p.hp)]); hp0 = p.hp; } }
    return hits;
  });
  await shoot('land');
  const rest = await page.evaluate(() => {
    const g = game.encounters.find((x) => x.boss?.cfg.id === 'gorrath').boss, p = game.player; let hp0 = p.hp; const hits = [];
    for (let i = 0; i < 120; i++) { game.step(1 / 60, 1 / 60); if (p.hp < hp0) { hits.push([g.atkKey, Math.round(hp0 - p.hp)]); hp0 = p.hp; } }
    return { hits, rings: game.rings.length };
  });
  console.log('leap', JSON.stringify({ before: r, landing, after: rest }));
} else console.log('no leap seen', JSON.stringify(r));
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
