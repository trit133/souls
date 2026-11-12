// Screenshots of the rethemed effects: a plasma charge in flight and its burst, a cryo lance, a parry discharge, the
// injector heal and the Aegis Ram barrier. /tmp/look/fx-*.png. node scripts/look-fx.mjs [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/look', { recursive: true });
const url = process.argv[2] || 'http://localhost:4173/?chain';
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 900, height: 540 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(700);
await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
const shot = async (name, setup, frames) => {
  await page.evaluate(({ setup, frames }) => {
    const g = game; g.audio.play = () => {};
    // eslint-disable-next-line no-eval
    (0, eval)(setup);
    for (let i = 0; i < frames; i++) g.step(1 / 60, 1 / 60);
    g.pixel.render(g.scene, g.camera);
  }, { setup, frames });
  await page.screenshot({ path: `/tmp/look/fx-${name}.png` });
};
const base = (kind) => `game.start('${kind}'); game.player.hp = game.player.maxHp = 1e9; game.player.mana = 999; for (const e of game.enemies) { e.cd = 99; e.update = () => {}; }`;
await shot('plasma', base('mage') + "; game.spawnSpell(game.player, 'fire');", 12);
await shot('cryo', base('mage') + "; game.spawnSpell(game.player, 'bolt');", 10);
await shot('heal', base('knight') + "; game.player.hp = 10; game.input.pressed.add('heal');", 34);
await shot('parry', base('rogue') + "; game.pfx.play('parry', game.player.pos.clone().setY(1.2));", 8);
await shot('aegis', base('knight') + "; game.player.evolved = true; game.player.chargeCd = 0; game.player.startCharge(game.player.fwd(), 1);", 6);
await b.close();
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'OK no errors');
