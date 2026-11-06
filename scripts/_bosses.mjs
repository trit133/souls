import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4173/'); await page.waitForTimeout(800);
await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; game.loop = () => {}; game.start('knight'); game.audio.play = () => {};
  game.buildRun(['camp', 'mini:hask', 'mini:vael', 'mini:gorrath', 'ruins', 'bridge', 'village', 'crypt', 'bog', 'gate', 'boss']); game.input.move = () => ({ x: 0, y: 0 }); });
const shots = [['grunt'], ['spear'], ['archer'], ['brute'], ['hask'], ['vael'], ['gorrath'], ['varek']];
for (const [k] of shots) {
  await page.evaluate((k) => {
    const isBoss = ['hask', 'vael', 'gorrath', 'varek'].includes(k);
    const e = isBoss ? game.encounters.find((x) => x.boss?.cfg.id === k).boss : game.enemies.find((x) => x.type === k && x.alive);
    if (!e) return;
    if (k === 'varek') e.ignite?.();
    const p = game.player; p.hp = 1e9;
    for (let i = 0; i < 40; i++) { e.rig.root.position.set(e.pos.x, e.y, e.pos.z); e.syncRig(1 / 60, { ...e.basePose?.() }, 18); game.fx.update(1 / 60); }
    const s = e.rig.root.scale.y, d = 3.2 * s, a = e.yaw + 0.6;
    game.camera.position.set(e.pos.x + Math.sin(a) * d, 1.8 * s, e.pos.z + Math.cos(a) * d); game.camera.lookAt(e.pos.x, 0.95 * s, e.pos.z);
    game.pixel.render(game.scene, game.camera);
  }, k);
  await page.screenshot({ path: `/tmp/look/s4-${k}.png`, clip: { x: 340, y: 40, width: 600, height: 640 } });
}
await b.close();
console.log(errs.length ? errs.join('\n') : 'OK');
