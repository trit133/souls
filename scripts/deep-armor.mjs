// The Sunless Deep's armour sets (deeparmory.js) worn: each class in each of its two sets, built into the training
// ring, a moment for the particles (embers, smoke, steam, sparkle, spores) to come off them; close-up shots.
// /tmp/look/armor-<kind>-<set>.png   node scripts/deep-armor.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const SETS = {
  knight: { foreman: { helmet: 'foreman', pauldronL: 'boiler', pauldronR: 'boiler', chest: 'foreman', legs: 'foreman' }, glass: { helmet: 'glasshelm', pauldronL: 'shardguard', pauldronR: 'shardguard', chest: 'vein', legs: 'shard' } },
  rogue: { creeper: { mask: 'creeper', cloak: 'smoke', shirt: 'creeper', bandL: 'spike', bandR: 'spike' }, mirror: { mask: 'mirror', cloak: 'mirror', shirt: 'mirror', bandL: 'shard', bandR: 'shard' } },
  mage: { kiln: { shoulder: 'kiln', shirt: 'kiln', pants: 'kiln' }, spore: { shoulder: 'spore', shirt: 'spore', pants: 'spore' } },
};
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await page.goto(process.argv[2] || 'http://localhost:5180/'); await page.waitForFunction(() => window.game?.audio && window.game?.world, null, { timeout: 30000 });
for (const [kind, sets] of Object.entries(SETS)) for (const [name, pieces] of Object.entries(sets)) {
  const r = await page.evaluate(({ kind, pieces }) => {
    const g = game; g.loop = () => {}; g.audio.play = () => {};
    const fit = Object.fromEntries(Object.entries(pieces).map(([s, id]) => [s, { piece: id }]));
    g.equippedOutfit = () => fit; g.training = true;
    g.start(kind); g.buildRun(['training'], 1, 1);
    for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none';
    const p = g.player; p.pos.set(0, 0, -6); p.gy = g.world.floorAt(0, -6); p.yaw = 0.4; p.setState('move');
    for (let i = 0; i < 90; i++) g.step(1 / 60, 1 / 60);
    const cam = g.camera; cam.position.set(p.pos.x + 1.6, p.pos.y + 2.2, p.pos.z + 3.2); cam.lookAt(p.pos.x, p.pos.y + 1.2, p.pos.z); g.pixel.render(g.scene, cam);
    return { emitters: (p.rig.emitters || []).map((e) => e.kind).join(','), particles: (g.fx.add.p?.length || 0) + (g.fx.norm.p?.length || 0) };
  }, { kind, pieces });
  console.log(kind, name, JSON.stringify(r));
  await page.screenshot({ path: `/tmp/look/armor-${kind}-${name}.png` });
}
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].join('\n') : 'OK no errors');
await b.close();
