// The training ring stays as it is whatever was played before: built fresh, and built straight after an Ashfall Ward
// raid (whose terrain, basements and portal must go with it: world.extras). Shots /tmp/look/tr-*.png; the scene's
// and the world root's pieces must match. node scripts/training-clean.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4199/'); await page.waitForTimeout(900);
const shot = async (name) => { await page.evaluate(() => { const g = game, c = g.camera; g.camLock = true; c.position.set(0, 20, 8); c.lookAt(0, 0, -13); g.pixel.render(g.scene, c); g.camLock = false; }); await page.screenshot({ path: `/tmp/look/tr-${name}.png` }); };
await page.evaluate(() => { const g = game; g.loop = () => {}; g.audio.play = () => {}; for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.display = 'none'; g.training = true; g.start('knight'); for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60); });
await shot('fresh');
const k0 = await page.evaluate(() => ({ scene: game.scene.children.length, root: game.world.root.children.length }));
console.log('fresh', JSON.stringify(k0));
const info = await page.evaluate(() => { const g = game; g.training = false; g.start('knight'); g.buildRun({ raid: 'r1a1' }, 4242, 1); for (let i = 0; i < 10; i++) g.step(1 / 60, 1 / 60); g.training = true; g.start('knight'); for (let i = 0; i < 30; i++) g.step(1 / 60, 1 / 60); return { scene: g.scene.children.length, extras: g.world.extras.length, rootKids: g.world.root.children.length, mods: g.world.mods.length, tiles: g.world.tiles.length, dungeon: !!g.world.dungeon, parts: g.world.terrain.parts.length }; });
await shot('after-raid');
console.log(JSON.stringify(info), errs);
console.log(info.scene === k0.scene && info.rootKids === k0.root && !info.extras ? 'OK same as fresh' : 'LEAK: pieces left over from the raid');
await b.close();
