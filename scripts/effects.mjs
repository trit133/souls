// Screenshots of the pixelfx effects in the game: hits, crit, parry, heal, bolt, fireball, explosion, Varek's ring.
// node scripts/effects.mjs <tag>  -> /tmp/look/<tag>-fx-<name>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const tag = process.argv[2] || 'e';
mkdirSync('/tmp/look', { recursive: true });
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await page.goto('http://localhost:4173/'); await page.waitForTimeout(800);
const shoot = async (name, fn, secs) => {
  await page.evaluate(({ fn, secs }) => {
    game.loop = () => {};
    // eslint-disable-next-line no-new-func
    new Function('game', fn)(game);
    for (let i = 0; i < secs * 60; i++) game.step(1 / 60, 1 / 60);
    game.pixel.render(game.scene, game.camera);
  }, { fn, secs });
  await page.screenshot({ path: `/tmp/look/${tag}-fx-${name}.png`, clip: { x: 240, y: 60, width: 800, height: 600 } });
};
const setup = (kind) => `document.getElementById('hud').style.display='none'; game.start('${kind}'); game.audio.play=()=>{}; game.input.move=()=>({x:0,y:0});
  for (const e of game.enemies) { e.die(true); e.rig.root.visible=false; }
  { const p=game.player; p.hp=p.maxHp=1e9; p.mana=p.maxMana; p.st=p.maxSt; } for(let i=0;i<30;i++) game.step(1/60,1/60);`;
const at = `const p=game.player; const V=p.pos.clone(); const f=p.fwd(); const hit=V.clone().addScaledVector(f,1.2).setY(1.1);`;
await shoot('hit', setup('knight') + at + `game.pfx.play('hit', hit, {dir:f}); game.pfx.play('heavyHit', hit.clone().add({x:1.5,y:0,z:0}), {dir:f}); game.pfx.play('hurt', hit.clone().add({x:-1.5,y:0,z:0}), {dir:f.clone().negate()});`, 0.12);
await shoot('crit', at + `game.pfx.play('crit', hit); game.pfx.play('parry', hit.clone().add({x:2,y:0,z:0})); game.pfx.play('block', hit.clone().add({x:-2,y:0,z:0}), {dir:f});`, 0.25);
await shoot('heal', at + `game.pfx.play('heal', p.pos, {follow:{pos:p.pos}}); game.pfx.play('poof', V.clone().add({x:2,y:0.2,z:0}));`, 0.7);
await shoot('bolt', setup('mage') + `game.input.pressed.add('heavy');`, 0.3);
await shoot('fire', `const p=game.player; p.setState('move'); p.mana=p.maxMana; game.input.pressed.add('special');`, 0.35);
await shoot('fire2', ``, 0.4);
await shoot('explode', `const p=game.player; game.pfx.play('explosion', p.pos.clone().addScaledVector(p.fwd(),4).setY(0));`, 0.45);
await shoot('ring', setup('knight') + `const p=game.player; game.pfx.play('blast', p.pos.clone().add({x:3,y:0,z:-4}));`, 0.9);
await b.close();
console.log(errs.length ? 'ERRORS\n' + [...new Set(errs)].slice(0, 8).join('\n') : 'OK');
